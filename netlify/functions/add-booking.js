/**
 * Netlify Function: Add Booking to existing trip
 * Processes PDF and adds flight/hotel to existing trip in Supabase
 * Also stores original PDFs for download
 * Authenticated endpoint
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { uploadPdf } = require('./utils/storage');
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

    // Get existing trip from Supabase
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
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

    console.log(`Processing ${pdfs.length} PDFs with batching...`);

    const results = await processPdfsWithClaude(pdfs);

    // Check for rate limit errors
    const rateLimitError = results.find(r => r.error?.isRateLimit);
    if (rateLimitError) {
      return {
        statusCode: 429,
        headers,
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

    // Deduplicate hotels by confirmation number
    const existingHotels = tripData.hotels || [];
    const existingFlights = tripData.flights || [];
    const deduplicatedHotels = [];
    const deduplicatedFlights = [];
    let skippedHotels = 0;
    let skippedFlights = 0;

    for (const newHotel of newHotels) {
      const confirmNum = newHotel.confirmationNumber?.toLowerCase()?.trim();
      const hotelName = newHotel.name?.toLowerCase()?.trim();
      const checkIn = newHotel.checkIn?.date;
      const checkOut = newHotel.checkOut?.date;

      let isDuplicate = false;

      if (confirmNum) {
        // Primary deduplication: by confirmation number
        const existingHotel = existingHotels.find(h =>
          h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
        );
        const alreadyInBatch = deduplicatedHotels.find(h =>
          h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
        );
        isDuplicate = !!(existingHotel || alreadyInBatch);
      } else if (hotelName && checkIn && checkOut) {
        // Fallback deduplication: by hotel name + check-in date + check-out date
        const existingHotel = existingHotels.find(h =>
          h.name?.toLowerCase()?.trim() === hotelName &&
          h.checkIn?.date === checkIn &&
          h.checkOut?.date === checkOut
        );
        const alreadyInBatch = deduplicatedHotels.find(h =>
          h.name?.toLowerCase()?.trim() === hotelName &&
          h.checkIn?.date === checkIn &&
          h.checkOut?.date === checkOut
        );
        isDuplicate = !!(existingHotel || alreadyInBatch);
      }

      if (isDuplicate) {
        console.log(`Skipping duplicate hotel: ${confirmNum || hotelName} (${newHotel.name})`);
        skippedHotels++;
      } else {
        deduplicatedHotels.push(newHotel);
      }
    }

    // Deduplicate flights by booking reference + flight number + date
    // When duplicates are found (same flight for different passengers), aggregate passengers
    for (const newFlight of newFlights) {
      const bookingRef = newFlight.bookingReference?.toLowerCase()?.trim();
      const flightNum = newFlight.flightNumber?.toLowerCase()?.trim();
      const flightDate = newFlight.date;

      // Check if flight with same booking ref, flight number and date exists in trip
      const existingFlight = existingFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
        f.flightNumber?.toLowerCase()?.trim() === flightNum &&
        f.date === flightDate
      );

      if (existingFlight) {
        // Flight exists - aggregate passenger if new
        if (newFlight.passenger) {
          if (!existingFlight.passengers) {
            existingFlight.passengers = existingFlight.passenger
              ? [{ ...existingFlight.passenger, ticketNumber: existingFlight.passenger.ticketNumber || existingFlight.ticketNumber || null }]
              : [];
          } else {
            // Backfill ticketNumber from flight level into existing passengers that lack it
            existingFlight.passengers.forEach(p => {
              if (!p.ticketNumber && existingFlight.ticketNumber) {
                p.ticketNumber = existingFlight.ticketNumber;
              }
            });
          }
          const alreadyHasPassenger = existingFlight.passengers.some(p =>
            (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
            (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
          );
          if (!alreadyHasPassenger) {
            existingFlight.passengers.push({ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex });
            existingFlight._needsPdfUpload = true; // Mark that we need to upload PDF for new passenger
            console.log(`Added passenger ${newFlight.passenger.name} to existing flight ${flightNum} on ${flightDate}`);
          } else {
            console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
            skippedFlights++;
          }
        } else {
          console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
          skippedFlights++;
        }
      } else {
        // Check if already in deduplicatedFlights (from same upload batch)
        const alreadyAdded = deduplicatedFlights.find(f =>
          f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
          f.flightNumber?.toLowerCase()?.trim() === flightNum &&
          f.date === flightDate
        );
        if (!alreadyAdded) {
          // First occurrence - initialize passengers array with _pdfIndex
          newFlight.passengers = newFlight.passenger
            ? [{ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex }]
            : [];
          deduplicatedFlights.push(newFlight);
        } else {
          // Aggregate passenger to flight in batch
          if (newFlight.passenger) {
            if (!alreadyAdded.passengers) {
              alreadyAdded.passengers = alreadyAdded.passenger
                ? [{ ...alreadyAdded.passenger, ticketNumber: alreadyAdded.passenger.ticketNumber || alreadyAdded.ticketNumber || null, _pdfIndex: alreadyAdded._pdfIndex }]
                : [];
            }
            const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
              (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
              (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
            );
            if (!alreadyHasPassenger) {
              alreadyAdded.passengers.push({ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex });
              console.log(`Added passenger ${newFlight.passenger.name} to batch flight ${flightNum} on ${flightDate}`);
            } else {
              console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
              skippedFlights++;
            }
          } else {
            console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
            skippedFlights++;
          }
        }
      }
    }

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

    // Upload PDFs and link to items (in parallel for speed)
    console.log('Uploading PDFs to storage...');
    const uploadPromises = [];

    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];

      // Find passengers that came from this PDF in new flights and upload PDF
      for (const flight of flightsWithIds) {
        if (flight.passengers) {
          const passengersFromPdf = flight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            uploadPromises.push(
              uploadPdf(pdf.content, tripId, `${flight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => {
                    p.pdfPath = pdfPath;
                  });
                  console.log(`Uploaded PDF for ${flight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error uploading PDF for ${flight.id}:`, err))
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
              uploadPdf(pdf.content, tripId, `${existingFlight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => {
                    p.pdfPath = pdfPath;
                  });
                  console.log(`Uploaded PDF for existing ${existingFlight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error uploading PDF for ${existingFlight.id}:`, err))
            );
          }
        }
      }

      // Hotels remain linked at hotel level
      const hotelsFromPdf = hotelsWithIds.filter(h => h._pdfIndex === pdfIndex);
      for (const hotel of hotelsFromPdf) {
        uploadPromises.push(
          uploadPdf(pdf.content, tripId, hotel.id)
            .then(pdfPath => {
              hotel.pdfPath = pdfPath;
              console.log(`Uploaded PDF for ${hotel.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error uploading PDF for ${hotel.id}:`, err))
        );
      }
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
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
    return {
      statusCode: isRateLimit ? 429 : 500,
      headers,
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
 * Update trip dates based on all flights and hotels
 */
function updateTripDates(tripData) {
  const dates = [];

  if (tripData.flights) {
    tripData.flights.forEach(f => {
      if (f.date) dates.push(new Date(f.date));
    });
  }

  if (tripData.hotels) {
    tripData.hotels.forEach(h => {
      if (h.checkIn?.date) dates.push(new Date(h.checkIn.date));
      if (h.checkOut?.date) dates.push(new Date(h.checkOut.date));
    });
  }

  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    tripData.startDate = dates[0].toISOString().split('T')[0];
    tripData.endDate = dates[dates.length - 1].toISOString().split('T')[0];
  }
}

