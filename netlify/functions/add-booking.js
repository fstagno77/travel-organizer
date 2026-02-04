/**
 * Netlify Function: Add Booking to existing trip
 * Processes PDF and adds flight/hotel to existing trip in Supabase
 * Also stores original PDFs for download
 * Authenticated endpoint
 */

const Anthropic = require('@anthropic-ai/sdk');
const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { uploadPdf } = require('./utils/storage');

const client = new Anthropic();

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
        body: JSON.stringify({ success: false, error: 'No PDF files provided' })
      };
    }

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
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
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = tripRecord.data;

    // Process PDFs in parallel for speed (local dev has 30s timeout)
    const newFlights = [];
    const newHotels = [];

    console.log(`Processing ${pdfs.length} PDFs in parallel...`);

    const processingPromises = pdfs.map((pdf, pdfIndex) => {
      console.log(`Starting processing of file ${pdfIndex + 1}/${pdfs.length}: ${pdf.filename}`);
      return processPdfWithClaude(pdf.content, pdf.filename)
        .then(result => {
          console.log(`Claude result for ${pdf.filename}:`, JSON.stringify(result, null, 2));
          return { result, pdfIndex, filename: pdf.filename };
        })
        .catch(error => {
          console.error(`Error processing ${pdf.filename}:`, error.message);
          return { result: null, pdfIndex, filename: pdf.filename, error };
        });
    });

    const results = await Promise.all(processingPromises);

    // Check for rate limit errors
    const rateLimitError = results.find(r => r.error?.isRateLimit);
    if (rateLimitError) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Rate limit reached. Please wait a minute before uploading another file.',
          errorType: 'rate_limit'
        })
      };
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Could not extract any travel data from the uploaded PDFs'
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
            existingFlight.passengers = existingFlight.passenger ? [existingFlight.passenger] : [];
          }
          const alreadyHasPassenger = existingFlight.passengers.some(p =>
            (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
            (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
          );
          if (!alreadyHasPassenger) {
            existingFlight.passengers.push({ ...newFlight.passenger, _pdfIndex: newFlight._pdfIndex });
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
          newFlight.passengers = newFlight.passenger ? [{ ...newFlight.passenger, _pdfIndex: newFlight._pdfIndex }] : [];
          deduplicatedFlights.push(newFlight);
        } else {
          // Aggregate passenger to flight in batch
          if (newFlight.passenger) {
            if (!alreadyAdded.passengers) {
              alreadyAdded.passengers = alreadyAdded.passenger ? [{ ...alreadyAdded.passenger, _pdfIndex: alreadyAdded._pdfIndex }] : [];
            }
            const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
              (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
              (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
            );
            if (!alreadyHasPassenger) {
              alreadyAdded.passengers.push({ ...newFlight.passenger, _pdfIndex: newFlight._pdfIndex });
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
          error: 'Failed to update trip in database'
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process PDF documents'
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

/**
 * Extract passenger name from filename as fallback
 * Handles patterns like "Le ricevute elettroniche di viaggio per AGATA BRIGNONE del 15JUN.pdf"
 */
function extractPassengerFromFilename(filename) {
  if (!filename) return null;

  // Pattern: "per NAME SURNAME del" or "for NAME SURNAME"
  const patterns = [
    /per\s+([A-Z][A-Z\s]+)\s+del/i,
    /for\s+([A-Z][A-Z\s]+)\s+/i,
    /viaggio\s+([A-Z][A-Z\s]+)\s+/i
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      // Clean up and format the name (Title Case)
      const name = match[1].trim()
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return name;
    }
  }

  return null;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process PDF with Claude API using vision (with retry on rate limit)
 */
async function processPdfWithClaude(base64Content, filename, retries = 3) {
  const docType = detectDocumentType(filename);

  const systemPrompt = `You are a travel document parser. Extract structured data from travel documents and return ONLY valid JSON. Do not include any explanations or markdown formatting.`;

  let userPrompt = getPromptForDocType(docType);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Content
                }
              },
              {
                type: 'text',
                text: userPrompt
              }
            ]
          }
        ],
        system: systemPrompt
      });

      const responseText = response.content[0].text;

      try {
        return JSON.parse(responseText);
      } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Could not parse Claude response as JSON');
      }
    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');

      if (isRateLimit && attempt < retries) {
        // Use longer fixed delays for rate limits: 5s, then 15s
        const delays = [5000, 15000];
        const delay = delays[attempt - 1] || 15000;
        console.log(`Rate limit hit for ${filename}, retrying in ${delay/1000}s (attempt ${attempt}/${retries})...`);
        await sleep(delay);
        continue;
      }

      // Mark rate limit errors for better error messages
      if (isRateLimit) {
        error.isRateLimit = true;
      }
      throw error;
    }
  }
}

/**
 * Detect document type from filename
 */
function detectDocumentType(filename) {
  const filenameLower = filename.toLowerCase();

  const flightIndicators = ['flight', 'volo', 'boarding', 'itinerary', 'ticket', 'eticket'];
  const hotelIndicators = ['hotel', 'booking', 'reservation', 'accommodation', 'conferma', 'prenotazione'];

  for (const indicator of flightIndicators) {
    if (filenameLower.includes(indicator)) return 'flight';
  }
  for (const indicator of hotelIndicators) {
    if (filenameLower.includes(indicator)) return 'hotel';
  }

  return 'unknown';
}

/**
 * Get extraction prompt based on document type
 */
function getPromptForDocType(docType) {
  if (docType === 'flight') {
    return `Extract flight information from this document. Return a JSON object with this exact structure.

CRITICAL REQUIREMENTS:
1. The "passenger" field at the TOP LEVEL is MANDATORY - you MUST always include it with the passenger's full name and type (ADT/CHD/INF). This is the most important field.
2. Look for the passenger name in: "NOME/NAME", "PASSEGGERO", "PASSENGER", title like "MR/MRS/MS", or anywhere the traveler's name appears.
3. If the flight duration is not explicitly stated, calculate it from departure and arrival times.

{
  "flights": [
    {
      "date": "YYYY-MM-DD",
      "flightNumber": "XX123",
      "airline": "Airline Name",
      "operatedBy": "Airline Name or null",
      "departure": {
        "code": "XXX",
        "city": "City Name",
        "airport": "Airport Name",
        "terminal": "1 or null"
      },
      "arrival": {
        "code": "XXX",
        "city": "City Name",
        "airport": "Airport Name",
        "terminal": "1 or null"
      },
      "departureTime": "HH:MM",
      "arrivalTime": "HH:MM",
      "arrivalNextDay": false,
      "duration": "HH:MM",
      "class": "Economy/Business/etc",
      "bookingReference": "XXXXXX",
      "ticketNumber": "XXX XXXXXXXXXX or null",
      "seat": "12A or null",
      "baggage": "0PC or 1PC etc",
      "status": "OK"
    }
  ],
  "passenger": {
    "name": "PASSENGER FULL NAME (REQUIRED)",
    "type": "ADT or CHD or INF",
    "ticketNumber": "XXX XXXXXXXXXX or null"
  },
  "booking": {
    "reference": "XXXXXX",
    "ticketNumber": "XXX XXXXXXXXXX",
    "issueDate": "YYYY-MM-DD or null",
    "totalAmount": { "value": 123.45, "currency": "EUR" }
  }
}`;
  } else if (docType === 'hotel') {
    return `Extract ALL hotel booking information from this document. You MUST include EVERY field listed below - do not skip any fields.

MANDATORY EXTRACTION RULES:
- Extract ALL fields even if you need to infer them from context
- For "city": use the MAIN CITY (Tokyo, not Taito-ku). Japanese -ku/-ward are districts, not cities.
- For "district": extract the neighborhood/ward name (e.g., "Taito-ku", "Ueno")
- For "guests": count adults AND children separately, include children's ages if mentioned
- For "roomTypes": extract the room type name in both Italian and English
- For "breakfast": check if breakfast/colazione is included
- For "pinCode": look for PIN, codice PIN, or similar
- For "price": extract room price, tax, and total separately
- If multiple rooms with same confirmation, keep as ONE entry with rooms count

Return this EXACT JSON structure with ALL fields populated:

{
  "hotels": [{
    "name": "Hotel name",
    "address": {
      "street": "Street address",
      "district": "Ward/neighborhood or null",
      "city": "MAIN CITY NAME",
      "postalCode": "Postal code",
      "country": "Country",
      "fullAddress": "Complete address string"
    },
    "coordinates": { "lat": 0.0, "lng": 0.0 },
    "phone": "Phone number or null",
    "checkIn": { "date": "YYYY-MM-DD", "time": "HH:MM" },
    "checkOut": { "date": "YYYY-MM-DD", "time": "HH:MM" },
    "nights": 0,
    "rooms": 1,
    "roomTypes": [{ "it": "Tipo camera", "en": "Room type" }],
    "guests": { "adults": 0, "children": [{ "age": 0 }], "total": 0 },
    "guestName": "Guest name",
    "confirmationNumber": "Confirmation number",
    "pinCode": "PIN code or null",
    "price": {
      "room": { "value": 0, "currency": "EUR" },
      "tax": { "value": 0, "currency": "EUR" },
      "total": { "value": 0, "currency": "EUR" }
    },
    "breakfast": { "included": false, "type": null },
    "bedTypes": "Bed description",
    "payment": { "method": "Pay at property or Prepaid", "prepayment": false },
    "cancellation": {
      "freeCancellationUntil": "YYYY-MM-DDTHH:MM:SS or null",
      "penaltyAfter": { "value": 0, "currency": "EUR" }
    },
    "amenities": [],
    "source": "Booking.com"
  }]
}`;
  } else {
    return `This is a travel document. Extract any flight or hotel information you can find. Return a JSON object with "flights" array and/or "hotels" array.

For flights include: date, flightNumber, airline, departure (code, city, airport), arrival (code, city, airport), departureTime, arrivalTime, bookingReference, status.

For hotels include: name, address (street, city, country, fullAddress), checkIn (date, time), checkOut (date, time), nights, confirmationNumber, guestName.`;
  }
}
