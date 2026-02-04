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

    // Process PDFs sequentially to avoid rate limits and stay within timeout
    const newFlights = [];
    const newHotels = [];
    const results = [];

    console.log(`Processing ${pdfs.length} PDFs sequentially...`);

    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];
      try {
        console.log(`Processing file ${pdfIndex + 1}/${pdfs.length}: ${pdf.filename}`);
        const result = await processPdfWithClaude(pdf.content, pdf.filename);
        console.log(`Claude result for ${pdf.filename}:`, JSON.stringify(result, null, 2));
        results.push({ result, pdfIndex, filename: pdf.filename });
      } catch (error) {
        console.error(`Error processing ${pdf.filename}:`, error.message);
        results.push({ result: null, pdfIndex, filename: pdf.filename, error });
      }
    }

    // Collect results from all PDFs
    for (const { result, pdfIndex } of results) {
      if (!result) continue;

      if (result.flights) {
        result.flights.forEach(flight => {
          flight._pdfIndex = pdfIndex;
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
      if (!confirmNum) {
        // No confirmation number, add it
        deduplicatedHotels.push(newHotel);
        continue;
      }

      // Check if hotel with same confirmation number exists
      const existingHotel = existingHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
      );

      if (existingHotel) {
        console.log(`Skipping duplicate hotel: ${confirmNum} (${newHotel.name})`);
        skippedHotels++;
        // Optionally merge additional info into existing hotel
        // For now, we just skip duplicates
      } else {
        // Check if already in deduplicatedHotels (from same upload batch)
        const alreadyAdded = deduplicatedHotels.find(h =>
          h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
        );
        if (!alreadyAdded) {
          deduplicatedHotels.push(newHotel);
        } else {
          console.log(`Skipping duplicate hotel in same batch: ${confirmNum}`);
          skippedHotels++;
        }
      }
    }

    // Deduplicate flights by booking reference + flight number + date
    for (const newFlight of newFlights) {
      const bookingRef = newFlight.bookingReference?.toLowerCase()?.trim();
      const flightNum = newFlight.flightNumber?.toLowerCase()?.trim();
      const flightDate = newFlight.date;

      // Check if flight with same booking ref, flight number and date exists
      const existingFlight = existingFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
        f.flightNumber?.toLowerCase()?.trim() === flightNum &&
        f.date === flightDate
      );

      if (existingFlight) {
        console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
        skippedFlights++;
      } else {
        // Check if already in deduplicatedFlights
        const alreadyAdded = deduplicatedFlights.find(f =>
          f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
          f.flightNumber?.toLowerCase()?.trim() === flightNum &&
          f.date === flightDate
        );
        if (!alreadyAdded) {
          deduplicatedFlights.push(newFlight);
        } else {
          console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
          skippedFlights++;
        }
      }
    }

    if (!deduplicatedFlights.length && !deduplicatedHotels.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          tripData,
          added: { flights: 0, hotels: 0 },
          skipped: { flights: skippedFlights, hotels: skippedHotels },
          message: 'All bookings already exist in this trip'
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

      // Find items that came from this PDF
      const flightsFromPdf = flightsWithIds.filter(f => f._pdfIndex === pdfIndex);
      const hotelsFromPdf = hotelsWithIds.filter(h => h._pdfIndex === pdfIndex);

      for (const flight of flightsFromPdf) {
        uploadPromises.push(
          uploadPdf(pdf.content, tripId, flight.id)
            .then(pdfPath => {
              flight.pdfPath = pdfPath;
              console.log(`Uploaded PDF for ${flight.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error uploading PDF for ${flight.id}:`, err))
        );
      }
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
    flightsWithIds.forEach(f => delete f._pdfIndex);
    hotelsWithIds.forEach(h => delete h._pdfIndex);

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
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Rate limit hit for ${filename}, retrying in ${delay/1000}s (attempt ${attempt}/${retries})...`);
        await sleep(delay);
        continue;
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

IMPORTANT: If the flight duration is not explicitly stated in the document, calculate it from the departure and arrival times. Consider the arrivalNextDay flag if the arrival is on the next day. The duration should always be provided in HH:MM format.

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
    "name": "Full Name",
    "type": "ADT"
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
