/**
 * Netlify Function: Add Booking to existing trip
 * Processes PDF and adds flight/hotel to existing trip in Supabase
 * Also stores original PDFs for download
 * Authenticated endpoint
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { uploadPdf, downloadPdfAsBase64, moveTmpPdfToTrip, cleanupTmpPdfs } = require('./utils/storage');
const { processPdfsWithClaude, extractPassengerFromFilename } = require('./utils/pdfProcessor');
const { updateTripDates } = require('./utils/tripDates');
const { deduplicateFlights, deduplicateHotels } = require('./utils/deduplication');

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

  const { supabase } = authResult;

  try {
    const { pdfs, tripId } = JSON.parse(event.body);

    if (!pdfs || pdfs.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No PDF files provided', errorCode: 'E100' })
      };
    }

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required', errorCode: 'E101' })
      };
    }

    console.log(`Adding booking to trip ${tripId}, processing ${pdfs.length} PDF file(s)...`);

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

    // Get existing trip from Supabase
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      // Clean up tmp files on error
      if (tmpPaths.length > 0) await cleanupTmpPdfs(tmpPaths);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found', errorCode: 'E102' })
      };
    }

    const tripData = tripRecord.data;

    // Process PDFs using batched Claude API calls to reduce rate limit hits
    const newFlights = [];
    const newHotels = [];

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
          newFlights.push(flight);
        });
      }
      if (result.hotels) {
        result.hotels.forEach(hotel => {
          hotel._pdfIndex = pdfIndex;
          newHotels.push(hotel);
        });
      }
    }

    if (!newFlights.length && !newHotels.length) {
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

    // Deduplicate hotels and flights
    const existingHotels = tripData.hotels || [];
    const existingFlights = tripData.flights || [];

    const { deduplicatedHotels, skippedHotels } = deduplicateHotels(newHotels, existingHotels);
    const { deduplicatedFlights, skippedFlights } = deduplicateFlights(newFlights, existingFlights);

    // Check if any existing flights need PDF upload (new passengers added)
    const existingFlightsWithNewPassengers = existingFlights.filter(f => f._needsPdfUpload);

    if (!deduplicatedFlights.length && !deduplicatedHotels.length && existingFlightsWithNewPassengers.length === 0) {
      // Build duplicate info for error message
      const duplicateInfo = [];
      if (skippedFlights > 0) {
        const flightInfo = newFlights[0]?.flightNumber || 'unknown';
        duplicateInfo.push(`flight ${flightInfo}`);
      }
      if (skippedHotels > 0) {
        const hotelInfo = newHotels[0]?.name || 'unknown';
        duplicateInfo.push(hotelInfo);
      }

      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'duplicate_booking',
          errorType: 'duplicate',
          errorCode: 'E104',
          duplicateInfo: duplicateInfo.join(', '),
          tripName: tripData.name || tripData.destination
        })
      };
    }

    // Add new bookings to trip
    const existingFlightCount = existingFlights.length;
    const existingHotelCount = existingHotels.length;

    const flightsWithIds = deduplicatedFlights.map((f, i) => ({
      ...f,
      id: `flight-${existingFlightCount + i + 1}`
    }));

    const hotelsWithIds = deduplicatedHotels.map((h, i) => ({
      ...h,
      id: `hotel-${existingHotelCount + i + 1}`
    }));

    // Upload/move PDFs and link to items (in parallel for speed)
    console.log('Uploading PDFs to storage...');
    const uploadPromises = [];
    const movedTmpPaths = new Set();

    for (let pdfIndex = 0; pdfIndex < resolvedPdfs.length; pdfIndex++) {
      const pdf = resolvedPdfs[pdfIndex];
      const isFromStorage = !!pdf.storagePath;
      let firstMoveForThisPdf = true;

      // Helper: move or upload a PDF for a given item
      const moveOrUpload = (itemId) => {
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          return moveTmpPdfToTrip(pdf.storagePath, tripId, itemId);
        }
        return uploadPdf(pdf.content, tripId, itemId);
      };

      // Find passengers that came from this PDF in new flights and upload PDF
      for (const flight of flightsWithIds) {
        if (flight.passengers) {
          const passengersFromPdf = flight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            uploadPromises.push(
              moveOrUpload(`${flight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => { p.pdfPath = pdfPath; });
                  console.log(`Stored PDF for ${flight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error storing PDF for ${flight.id}:`, err))
            );
          }
        }
      }

      // Handle passengers added to existing flights (marked with _needsPdfUpload)
      for (const existingFlight of existingFlights) {
        if (existingFlight._needsPdfUpload && existingFlight.passengers) {
          const passengersFromPdf = existingFlight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            uploadPromises.push(
              moveOrUpload(`${existingFlight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => { p.pdfPath = pdfPath; });
                  console.log(`Stored PDF for existing ${existingFlight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error storing PDF for ${existingFlight.id}:`, err))
            );
          }
        }
      }

      // Hotels remain linked at hotel level
      const hotelsFromPdf = hotelsWithIds.filter(h => h._pdfIndex === pdfIndex);
      for (const hotel of hotelsFromPdf) {
        uploadPromises.push(
          moveOrUpload(hotel.id)
            .then(pdfPath => {
              hotel.pdfPath = pdfPath;
              console.log(`Stored PDF for ${hotel.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error storing PDF for ${hotel.id}:`, err))
        );
      }
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Clean up any tmp paths that weren't moved
    const unmoved = tmpPaths.filter(p => !movedTmpPaths.has(p));
    if (unmoved.length > 0) {
      await cleanupTmpPdfs(unmoved);
    }

    // Clean up temporary markers
    flightsWithIds.forEach(f => {
      delete f._pdfIndex;
      if (f.passengers) {
        f.passengers.forEach(p => delete p._pdfIndex);
      }
    });
    hotelsWithIds.forEach(h => delete h._pdfIndex);
    // Clean up markers from existing flights that got new passengers
    existingFlights.forEach(f => {
      delete f._needsPdfUpload;
      if (f.passengers) {
        f.passengers.forEach(p => delete p._pdfIndex);
      }
    });

    tripData.flights = [...(tripData.flights || []), ...flightsWithIds];
    tripData.hotels = [...(tripData.hotels || []), ...hotelsWithIds];

    // Update dates if needed
    updateTripDates(tripData);

    // Save updated trip to Supabase
    const { error: dbError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (dbError) {
      console.error('Supabase error:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to update trip in database',
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
        added: {
          flights: deduplicatedFlights.length,
          hotels: deduplicatedHotels.length
        },
        skipped: {
          flights: skippedFlights,
          hotels: skippedHotels
        }
      })
    };

  } catch (error) {
    console.error('Error adding booking:', error);
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

