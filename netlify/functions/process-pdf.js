/**
 * Netlify Function: Process PDF
 * Extracts travel data from PDF documents using Claude API
 * Saves to Supabase database and stores original PDFs
 * Authenticated endpoint - associates trips with user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { uploadPdf, downloadPdfAsBase64, moveTmpPdfToTrip, cleanupTmpPdfs } = require('./utils/storage');
const { processPdfsWithClaude, extractPassengerFromFilename } = require('./utils/pdfProcessor');
const { deduplicateFlights, deduplicateHotels, deduplicateTrains, deduplicateBuses, deduplicateRentals } = require('./utils/deduplication');
// Note: pdfProcessor is kept as fallback; primary flow now uses parsedData from parse-pdf endpoint

// Count non-empty fields in extracted data for quality assessment
function countFields(flights, hotels) {
  const FLIGHT_KEYS = ['flightNumber', 'airline', 'date', 'departureTime', 'arrivalTime', 'class', 'seat', 'bookingReference', 'ticketNumber', 'status'];
  const HOTEL_KEYS = ['name', 'checkIn', 'checkOut', 'nights', 'address', 'guestName', 'confirmationNumber', 'price'];
  let filled = 0, total = 0;
  for (const f of flights) {
    for (const k of FLIGHT_KEYS) { total++; if (f[k] != null && f[k] !== '') filled++; }
    if (f.departure?.code) filled++; total++;
    if (f.arrival?.code) filled++; total++;
    if (f.passenger?.name) filled++; total++;
  }
  for (const h of hotels) {
    for (const k of HOTEL_KEYS) { total++; if (h[k] != null && h[k] !== '') filled++; }
  }
  return { filled, total };
}

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
  const serviceClient = getServiceClient();

  // Logging state — updated as processing proceeds so catch block can also log
  let pdfCount = 0;
  let pdfFilenames = '';

  const logPdfUpload = async ({ status, tripId = null, extractedSummary = null, errorMessage = null, parseLevel = null, parseMeta = null }) => {
    try {
      const row = {
        source: 'upload',
        email_from: user.email,
        email_subject: pdfFilenames || 'PDF upload diretto',
        status,
        user_id: user.id,
        trip_id: tripId,
        attachment_count: pdfCount,
        extracted_summary: extractedSummary,
        error_message: errorMessage,
        parse_level: parseLevel,
        parse_meta: parseMeta,
      };
      const { error } = await serviceClient.from('email_processing_log').insert(row);
      // If SmartParse columns don't exist yet, retry without them
      if (error && (error.code === '42703' || error.message?.includes('parse_level') || error.message?.includes('parse_meta'))) {
        delete row.parse_level;
        delete row.parse_meta;
        await serviceClient.from('email_processing_log').insert(row);
      }
    } catch (logErr) {
      console.error('PDF upload log failed (non-fatal):', logErr);
    }
  };

  try {
    const body = JSON.parse(event.body);
    const { pdfs, parsedData, feedback, manualOverrides, editedFields } = body;

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
        tmpPaths.push(pdf.storagePath);
        const content = await downloadPdfAsBase64(pdf.storagePath);
        resolvedPdfs.push({ filename: pdf.filename, content, storagePath: pdf.storagePath });
      } else if (pdf.content) {
        resolvedPdfs.push({ filename: pdf.filename, content: pdf.content });
      }
    }

    const allFlights = [];
    const allHotels = [];
    const allTrains = [];
    const allBuses = [];
    const allRentals = [];
    let metadata = {};
    let smartParseMeta = null; // SmartParse metadata for logging

    pdfCount = resolvedPdfs.length;
    pdfFilenames = resolvedPdfs.map(p => p.filename).join(', ');

    let results;
    let apiError = null;

    if (parsedData && Array.isArray(parsedData)) {
      // ── Pre-parsed by SmartParse (from parse-pdf endpoint) ──
      console.log(`Using pre-parsed data for ${parsedData.length} PDFs (SmartParse)`);
      results = parsedData.map((pd, i) => ({
        result: pd.result,
        pdfIndex: pd.pdfIndex ?? i,
        filename: pd.filename || resolvedPdfs[i]?.filename || `pdf-${i}`
      }));
      // Aggregate SmartParse metadata
      smartParseMeta = {
        brand: parsedData.find(p => p.brand)?.brand || null,
        claudeCalls: parsedData.reduce((sum, p) => sum + (p.claudeCalls || 0), 0),
        durationMs: parsedData.reduce((sum, p) => sum + (p.durationMs || 0), 0),
        levels: parsedData.map(p => p.parseLevel),
        feedback: feedback || null,
        ...(editedFields?.length ? { editedFields } : {}),
      };
    } else {
      // ── Legacy flow: process with Claude directly ──
      console.log(`Processing ${resolvedPdfs.length} PDFs with Claude batching...`);
      results = await processPdfsWithClaude(resolvedPdfs);

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

      apiError = results.find(r => r.error && !r.error.isRateLimit) || null;
      if (apiError) {
        console.error('Claude API error:', apiError.error.message, apiError.error.status);
      }
    }

    // Collect results from all PDFs
    for (const { result, pdfIndex, filename } of results) {
      if (!result) continue;

      if (result.flights) {
        result.flights.forEach(flight => {
          flight._pdfIndex = pdfIndex;
          // Usa array top-level se ha più passeggeri (caso Ryanair multi-pax)
          if (result.passengers?.length > 1) {
            flight.passengers = result.passengers.map(p => ({ ...p, _pdfIndex: pdfIndex }));
          } else {
            if (!flight.passenger && result.passenger) {
              flight.passenger = { ...result.passenger };
            }
            if (!flight.passenger && !flight.passengers) {
              const extractedName = extractPassengerFromFilename(filename);
              if (extractedName) {
                flight.passenger = { name: extractedName, type: 'ADT' };
              }
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
      if (result.trains) {
        result.trains.forEach(train => {
          train._pdfIndex = pdfIndex;
          if (!train.passenger && result.passenger) {
            train.passenger = { ...result.passenger };
          }
          allTrains.push(train);
        });
      }
      if (result.buses) {
        result.buses.forEach(bus => {
          bus._pdfIndex = pdfIndex;
          if (!bus.passenger && result.passenger) {
            bus.passenger = { ...result.passenger };
          }
          allBuses.push(bus);
        });
      }
      if (result.rentals) {
        result.rentals.forEach(rental => {
          rental._pdfIndex = pdfIndex;
          if (!rental.driverName && result.passenger?.name) {
            rental.driverName = result.passenger.name;
          }
          allRentals.push(rental);
        });
      }
      if (result.passenger) {
        metadata.passenger = result.passenger;
      }
      if (result.booking) {
        metadata.booking = result.booking;
      }
    }

    if (!allFlights.length && !allHotels.length && !allTrains.length && !allBuses.length && !allRentals.length) {
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

    // Deduplicate within the batch
    const { deduplicatedHotels } = deduplicateHotels(allHotels);
    const { deduplicatedFlights } = deduplicateFlights(allFlights);
    const { deduplicatedTrains } = deduplicateTrains(allTrains);
    const { deduplicatedBuses } = deduplicateBuses(allBuses);
    const { deduplicatedRentals } = deduplicateRentals(allRentals);

    // Generate trip data
    const tripData = createTripFromExtractedData({
      flights: deduplicatedFlights,
      hotels: deduplicatedHotels,
      trains: deduplicatedTrains,
      buses: deduplicatedBuses,
      rentals: deduplicatedRentals,
      metadata
    });

    // Apply manual overrides if provided (user-entered fields take priority)
    if (manualOverrides) {
      if (manualOverrides.name && manualOverrides.name.trim()) {
        const n = manualOverrides.name.trim();
        tripData.title = { it: n, en: n };
      }
      if (manualOverrides.startDate) tripData.startDate = manualOverrides.startDate;
      if (manualOverrides.endDate) tripData.endDate = manualOverrides.endDate;
      if (manualOverrides.cities && manualOverrides.cities.length > 0) {
        tripData.cities = manualOverrides.cities;
        tripData.destination = manualOverrides.cities[0].name || tripData.destination;
      }
      // Regenerate trip ID if dates/destination changed
      if (manualOverrides.startDate || manualOverrides.cities) {
        const d = new Date(tripData.startDate + 'T00:00:00');
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const yr = d.getFullYear();
        const sl = (tripData.destination || tripData.title.en)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
        const sf = Math.random().toString(36).substring(2, 8);
        tripData.id = `${yr}-${mo}-${sl}-${sf}`;
      }
    }

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

      // Treni: upload PDF per ogni treno dal PDF corrente
      const trainsFromPdf = tripData.trains.filter(t => t._pdfIndex === pdfIndex);
      for (const train of trainsFromPdf) {
        const itemId = train.id;
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          uploadPromises.push(
            moveTmpPdfToTrip(pdf.storagePath, tripData.id, itemId)
              .then(pdfPath => {
                train.pdfPath = pdfPath;
                console.log(`Moved PDF for ${train.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error moving PDF for ${train.id}:`, err))
          );
        } else {
          uploadPromises.push(
            uploadPdf(pdf.content, tripData.id, itemId)
              .then(pdfPath => {
                train.pdfPath = pdfPath;
                console.log(`Uploaded PDF for ${train.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error uploading PDF for ${train.id}:`, err))
          );
        }
      }

      // Bus: upload PDF per ogni bus dal PDF corrente
      const busesFromPdf = tripData.buses.filter(b => b._pdfIndex === pdfIndex);
      for (const bus of busesFromPdf) {
        const itemId = bus.id;
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          uploadPromises.push(
            moveTmpPdfToTrip(pdf.storagePath, tripData.id, itemId)
              .then(pdfPath => {
                bus.pdfPath = pdfPath;
                console.log(`Moved PDF for ${bus.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error moving PDF for ${bus.id}:`, err))
          );
        } else {
          uploadPromises.push(
            uploadPdf(pdf.content, tripData.id, itemId)
              .then(pdfPath => {
                bus.pdfPath = pdfPath;
                console.log(`Uploaded PDF for ${bus.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error uploading PDF for ${bus.id}:`, err))
          );
        }
      }

      // Rentals remain linked at rental level
      const rentalsFromPdf = (tripData.rentals || []).filter(r => r._pdfIndex === pdfIndex);
      for (const rental of rentalsFromPdf) {
        const itemId = rental.id;
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          uploadPromises.push(
            moveTmpPdfToTrip(pdf.storagePath, tripData.id, itemId)
              .then(pdfPath => {
                rental.pdfPath = pdfPath;
                console.log(`Moved PDF for ${rental.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error moving PDF for ${rental.id}:`, err))
          );
        } else {
          uploadPromises.push(
            uploadPdf(pdf.content, tripData.id, itemId)
              .then(pdfPath => {
                rental.pdfPath = pdfPath;
                console.log(`Uploaded PDF for ${rental.id}: ${pdfPath}`);
              })
              .catch(err => console.error(`Error uploading PDF for ${rental.id}:`, err))
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
    tripData.trains.forEach(t => delete t._pdfIndex);
    tripData.buses.forEach(b => delete b._pdfIndex);
    (tripData.rentals || []).forEach(r => delete r._pdfIndex);

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
      await logPdfUpload({ status: 'error', errorMessage: `DB save failed: ${dbError.message}` });
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

    // Log successful upload (non-fatal)
    const primaryLevel = smartParseMeta?.levels?.[0] || null;
    const fc = countFields(tripData.flights, tripData.hotels);
    const textLen = parsedData ? parsedData.reduce((s, p) => s + (p.textLength || 0), 0) : 0;
    const detDocType = parsedData?.find(p => p.detectedDocType)?.detectedDocType || null;
    await logPdfUpload({
      status: 'success',
      tripId: tripData.id,
      extractedSummary: {
        destination: tripData.destination,
        flights: tripData.flights.length,
        hotels: tripData.hotels.length,
        passenger: tripData.passenger?.name
          || tripData.flights?.[0]?.passenger?.name
          || tripData.flights?.[0]?.passengers?.[0]?.name
          || tripData.hotels?.[0]?.guestName
          || null,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        fieldsFilled: fc.filled,
        fieldsTotal: fc.total,
        detectedDocType: detDocType,
        routes: tripData.flights.map(f => {
          const dep = f.departure?.code || f.departureAirport || '';
          const arr = f.arrival?.code || f.arrivalAirport || '';
          return dep && arr ? `${dep}→${arr}` : null;
        }).filter(Boolean).slice(0, 6),
        hotelNames: tripData.hotels.map(h => h.name).filter(Boolean).slice(0, 3),
      },
      parseLevel: primaryLevel,
      parseMeta: smartParseMeta,
    });

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
          hotels: allHotels.length,
          trains: allTrains.length,
          buses: allBuses.length
        }
      })
    };

  } catch (error) {
    // Cleanup temporary PDFs if any were uploaded
    if (tmpPaths && tmpPaths.length > 0) {
      try {
        await cleanupTmpPdfs(tmpPaths);
      } catch (cleanupErr) {
        console.error('Failed to cleanup tmp PDFs:', cleanupErr);
      }
    }
    console.error('Error processing PDFs:', error);

    // Log failure (non-fatal — best effort only)
    const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
    if (!isRateLimit && pdfCount > 0) {
      await logPdfUpload({ status: 'extraction_failed', errorMessage: error.message });
    }
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
  const { flights, hotels, trains = [], buses = [], rentals = [], metadata } = data;

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

  if (trains.length > 0) {
    trains.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!startDate) startDate = trains[0].date;
    if (!endDate) endDate = trains[trains.length - 1].date;
    if (!destination) destination = trains[trains.length - 1].arrival?.city || '';
  }

  if (buses.length > 0) {
    buses.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!startDate) startDate = buses[0].date;
    if (!endDate) endDate = buses[buses.length - 1].date;
    if (!destination) destination = buses[buses.length - 1].arrival?.city || '';
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
    trains: trains.map((t, i) => ({ ...t, id: `train-${i + 1}` })),
    buses: buses.map((b, i) => ({ ...b, id: `bus-${i + 1}` })),
    rentals: rentals.map((r, i) => ({ ...r, id: `rental-${i + 1}` })),
    booking: metadata.booking || null
  };
}
