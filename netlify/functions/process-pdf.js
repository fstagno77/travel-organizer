/**
 * Netlify Function: Process PDF
 * Extracts travel data from PDF documents using Claude API
 * Saves to Supabase database and stores original PDFs
 * Authenticated endpoint - associates trips with user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { uploadPdf, downloadPdfAsBase64, moveTmpPdfToTrip, cleanupTmpPdfs } = require('./utils/storage');
const { processPdfsWithClaude, extractPassengerFromFilename } = require('./utils/pdfProcessor');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;

  try {
    const { pdfs } = JSON.parse(event.body);

    if (!pdfs || pdfs.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No PDF files provided', errorCode: 'E100' })
      };
    }

    console.log(`Processing ${pdfs.length} PDF file(s)...`);

    // Resolve PDFs: download from Storage if storagePath provided, otherwise use inline content
    const tmpPaths = []; // Track tmp paths for cleanup
    const resolvedPdfs = [];
    for (const pdf of pdfs) {
      if (pdf.storagePath) {
        // New flow: PDF was uploaded directly to Storage
        tmpPaths.push(pdf.storagePath);
        const content = await downloadPdfAsBase64(pdf.storagePath);
        resolvedPdfs.push({ filename: pdf.filename, content, storagePath: pdf.storagePath });
      } else if (pdf.content) {
        // Legacy flow: base64 inline
        resolvedPdfs.push({ filename: pdf.filename, content: pdf.content });
      }
    }

    // Process PDFs using batched Claude API calls to reduce rate limit hits
    const allFlights = [];
    const allHotels = [];
    let metadata = {};

    console.log(`Processing ${resolvedPdfs.length} PDFs with batching...`);

    const results = await processPdfsWithClaude(resolvedPdfs);

    // Check for rate limit errors
    const rateLimitError = results.find(r => r.error?.isRateLimit);
    if (rateLimitError) {
      const retryAfter = rateLimitError.error.retryAfter || 30;
      return {
        statusCode: 429,
        headers: { ...headers, 'Retry-After': String(retryAfter) },
        body: JSON.stringify({
          success: false,
          error: 'Rate limit reached. Please wait a minute before uploading another file.',
          errorType: 'rate_limit',
          errorCode: 'E200'
        })
      };
    }

    // Check for other API errors (not rate limit)
    const apiError = results.find(r => r.error && !r.error.isRateLimit);
    if (apiError) {
      console.error('Claude API error:', apiError.error.message, apiError.error.status);
    }

    // Collect results from all PDFs
    for (const { result, pdfIndex, filename } of results) {
      if (!result) continue;

      if (result.flights) {
        result.flights.forEach(flight => {
          flight._pdfIndex = pdfIndex;
          // If flight doesn't have its own passenger, use top-level passenger from result
          if (!flight.passenger && result.passenger) {
            flight.passenger = { ...result.passenger };
          }
          // Fallback: extract passenger name from filename if still missing
          if (!flight.passenger) {
            const extractedName = extractPassengerFromFilename(filename);
            if (extractedName) {
              flight.passenger = { name: extractedName, type: 'ADT' };
              console.log(`Extracted passenger "${extractedName}" from filename: ${filename}`);
            }
          }
          allFlights.push(flight);
        });
      }
      if (result.hotels) {
        result.hotels.forEach(hotel => {
          hotel._pdfIndex = pdfIndex;
          allHotels.push(hotel);
        });
      }
      if (result.passenger) {
        metadata.passenger = result.passenger;
      }
      if (result.booking) {
        metadata.booking = result.booking;
      }
    }

    if (!allFlights.length && !allHotels.length) {
      const errorCode = apiError ? 'E201' : 'E103';
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: apiError
            ? `Processing error: ${apiError.error.message || 'API unavailable'}`
            : 'Could not extract any travel data from the uploaded PDFs',
          errorCode
        })
      };
    }

    // Deduplicate hotels by confirmation number or by name + dates (within same upload batch)
    const deduplicatedHotels = [];
    for (const hotel of allHotels) {
      const confirmNum = hotel.confirmationNumber?.toLowerCase()?.trim();
      const hotelName = hotel.name?.toLowerCase()?.trim();
      const checkIn = hotel.checkIn?.date;
      const checkOut = hotel.checkOut?.date;

      let alreadyAdded = false;

      if (confirmNum) {
        // Primary deduplication: by confirmation number
        alreadyAdded = deduplicatedHotels.some(h =>
          h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
        );
      } else if (hotelName && checkIn && checkOut) {
        // Fallback deduplication: by hotel name + check-in date + check-out date
        alreadyAdded = deduplicatedHotels.some(h =>
          h.name?.toLowerCase()?.trim() === hotelName &&
          h.checkIn?.date === checkIn &&
          h.checkOut?.date === checkOut
        );
      }

      if (!alreadyAdded) {
        deduplicatedHotels.push(hotel);
      } else {
        console.log(`Skipping duplicate hotel in batch: ${confirmNum || hotelName}`);
      }
    }

    // Deduplicate flights by booking reference + flight number + date
    // When duplicates are found (same flight for different passengers), aggregate passengers
    const deduplicatedFlights = [];
    for (const flight of allFlights) {
      const bookingRef = flight.bookingReference?.toLowerCase()?.trim();
      const flightNum = flight.flightNumber?.toLowerCase()?.trim();
      const flightDate = flight.date;

      const existingFlight = deduplicatedFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
        f.flightNumber?.toLowerCase()?.trim() === flightNum &&
        f.date === flightDate
      );

      if (!existingFlight) {
        // First occurrence of this flight - initialize passengers array with _pdfIndex
        flight.passengers = flight.passenger
          ? [{ ...flight.passenger, ticketNumber: flight.passenger.ticketNumber || flight.ticketNumber || null, _pdfIndex: flight._pdfIndex }]
          : [];
        deduplicatedFlights.push(flight);
      } else {
        // Duplicate flight found - aggregate passenger info
        if (flight.passenger) {
          if (!existingFlight.passengers) {
            existingFlight.passengers = existingFlight.passenger
              ? [{ ...existingFlight.passenger, ticketNumber: existingFlight.passenger.ticketNumber || existingFlight.ticketNumber || null, _pdfIndex: existingFlight._pdfIndex }]
              : [];
          }
          // Only add if this passenger isn't already in the list (check by ticketNumber or name)
          const alreadyHasPassenger = existingFlight.passengers.some(p =>
            (p.ticketNumber && flight.passenger.ticketNumber && p.ticketNumber === flight.passenger.ticketNumber) ||
            (p.name && flight.passenger.name && p.name === flight.passenger.name)
          );
          if (!alreadyHasPassenger) {
            existingFlight.passengers.push({ ...flight.passenger, ticketNumber: flight.passenger.ticketNumber || flight.ticketNumber || null, _pdfIndex: flight._pdfIndex });
            console.log(`Added passenger ${flight.passenger.name} to flight ${flightNum} on ${flightDate}`);
          }
        }
      }
    }

    // Generate trip data
    const tripData = createTripFromExtractedData({
      flights: deduplicatedFlights,
      hotels: deduplicatedHotels,
      metadata
    });

    // Upload/move PDFs and link to items (in parallel for speed)
    console.log('Uploading PDFs to storage...');
    const uploadPromises = [];
    const movedTmpPaths = new Set(); // Track which tmp paths were moved (not to clean up later)

    for (let pdfIndex = 0; pdfIndex < resolvedPdfs.length; pdfIndex++) {
      const pdf = resolvedPdfs[pdfIndex];
      const isFromStorage = !!pdf.storagePath;

      // Find passengers that came from this PDF and upload PDF for each flight they're on
      const flightsWithPassengersFromPdf = new Map(); // flight.id -> passengers from this PDF
      for (const flight of tripData.flights) {
        if (flight.passengers) {
          const passengersFromPdf = flight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            flightsWithPassengersFromPdf.set(flight.id, { flight, passengers: passengersFromPdf });
          }
        }
      }

      // Upload/move PDF once per flight and assign pdfPath to passengers from this PDF
      let firstMoveForThisPdf = true;
      for (const { flight, passengers } of flightsWithPassengersFromPdf.values()) {
        const itemId = `${flight.id}-p${pdfIndex}`;
        if (isFromStorage && firstMoveForThisPdf) {
          // First usage: move from tmp to final location
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          uploadPromises.push(
            moveTmpPdfToTrip(pdf.storagePath, tripData.id, itemId)
              .then(pdfPath => {
                passengers.forEach(p => { p.pdfPath = pdfPath; });
                console.log(`Moved PDF for ${flight.id}, passengers: ${passengers.map(p => p.name).join(', ')}`);
              })
              .catch(err => console.error(`Error moving PDF for ${flight.id}:`, err))
          );
        } else {
          // Subsequent usages or legacy: upload from base64
          uploadPromises.push(
            uploadPdf(pdf.content, tripData.id, itemId)
              .then(pdfPath => {
                passengers.forEach(p => { p.pdfPath = pdfPath; });
                console.log(`Uploaded PDF for ${flight.id}, passengers: ${passengers.map(p => p.name).join(', ')}`);
              })
              .catch(err => console.error(`Error uploading PDF for ${flight.id}:`, err))
          );
        }
      }

      // Hotels remain linked at hotel level
      const hotelsFromPdf = tripData.hotels.filter(h => h._pdfIndex === pdfIndex);
      for (const hotel of hotelsFromPdf) {
        const itemId = hotel.id;
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          uploadPromises.push(
            moveTmpPdfToTrip(pdf.storagePath, tripData.id, itemId)
              .then(pdfPath => {
                hotel.pdfPath = pdfPath;
                console.log(`Moved PDF for ${hotel.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error moving PDF for ${hotel.id}:`, err))
          );
        } else {
          uploadPromises.push(
            uploadPdf(pdf.content, tripData.id, itemId)
              .then(pdfPath => {
                hotel.pdfPath = pdfPath;
                console.log(`Uploaded PDF for ${hotel.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error uploading PDF for ${hotel.id}:`, err))
          );
        }
      }
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Clean up any tmp paths that weren't moved (e.g., PDF had no items)
    const unmoved = tmpPaths.filter(p => !movedTmpPaths.has(p));
    if (unmoved.length > 0) {
      await cleanupTmpPdfs(unmoved);
    }

    // Clean up temporary markers
    tripData.flights.forEach(f => {
      delete f._pdfIndex;
      if (f.passengers) {
        f.passengers.forEach(p => delete p._pdfIndex);
      }
    });
    tripData.hotels.forEach(h => delete h._pdfIndex);

    // Always show photo selection when there's a destination
    // User can choose from cached, Unsplash, or upload custom photo
    const needsPhotoSelection = !!tripData.destination;

    // Save to Supabase with user_id
    const { error: dbError } = await supabase
      .from('trips')
      .upsert({
        id: tripData.id,
        data: tripData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Supabase error:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to save trip to database',
          errorCode: 'E300'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData,
        needsPhotoSelection,
        destination: tripData.destination,
        summary: {
          flights: allFlights.length,
          hotels: allHotels.length
        }
      })
    };

  } catch (error) {
    console.error('Error processing PDFs:', error);
    const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
    const retryAfter = error.retryAfter || 30;
    return {
      statusCode: isRateLimit ? 429 : 500,
      headers: isRateLimit ? { ...headers, 'Retry-After': String(retryAfter) } : headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process PDF documents',
        errorType: isRateLimit ? 'rate_limit' : undefined,
        errorCode: isRateLimit ? 'E200' : 'E999'
      })
    };
  }
};


/**
 * Create trip data structure from extracted data
 */
function createTripFromExtractedData(data) {
  const { flights, hotels, metadata } = data;

  let startDate = null;
  let endDate = null;
  let destination = '';

  if (flights.length > 0) {
    flights.sort((a, b) => new Date(a.date) - new Date(b.date));
    startDate = flights[0].date;
    endDate = flights[flights.length - 1].date;

    // Find the real destination (not just a connection)
    const originCode = flights[0].departure.code;
    const finalArrivalCode = flights[flights.length - 1].arrival.code;
    const isRoundTrip = originCode === finalArrivalCode;

    if (isRoundTrip && flights.length >= 2) {
      // For round trips (e.g., REG→FCO→JFK→FCO→REG), the destination is at the midpoint
      // With 4 flights, outbound is flights 0-1, return is flights 2-3
      // The destination is the arrival of the last outbound flight (index: n/2 - 1)
      const lastOutboundIndex = Math.floor(flights.length / 2) - 1;
      destination = flights[lastOutboundIndex >= 0 ? lastOutboundIndex : 0].arrival.city;
    } else {
      // One-way trip: destination is the final arrival
      destination = flights[flights.length - 1].arrival.city;
    }
  }

  if (hotels.length > 0) {
    if (!startDate) {
      startDate = hotels[0].checkIn.date;
    }
    if (!endDate) {
      endDate = hotels[hotels.length - 1].checkOut.date;
    }
    if (!destination) {
      destination = hotels[0].address.city;
    }
  }

  const date = new Date(startDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const destSlug = destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  const tripId = `${year}-${month}-${destSlug}-${uniqueSuffix}`;

  let route = '';
  if (flights.length > 0) {
    const codes = [flights[0].departure.code];
    flights.forEach(f => {
      if (codes[codes.length - 1] !== f.arrival.code) {
        codes.push(f.arrival.code);
      }
    });
    route = codes.join(' → ');
  }

  return {
    id: tripId,
    title: {
      it: `Viaggio a ${destination}`,
      en: `${destination} Trip`
    },
    destination,
    startDate,
    endDate,
    route,
    passenger: metadata.passenger || { name: '', type: 'ADT' },
    flights: flights.map((f, i) => ({ ...f, id: `flight-${i + 1}` })),
    hotels: hotels.map((h, i) => ({ ...h, id: `hotel-${i + 1}` })),
    booking: metadata.booking || null
  };
}
