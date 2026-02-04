/**
 * Netlify Function: Process PDF
 * Extracts travel data from PDF documents using Claude API
 * Saves to Supabase database and stores original PDFs
 * Authenticated endpoint - associates trips with user
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

  const { user, supabase } = authResult;

  try {
    const { pdfs } = JSON.parse(event.body);

    if (!pdfs || pdfs.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No PDF files provided' })
      };
    }

    console.log(`Processing ${pdfs.length} PDF file(s)...`);

    // Process PDFs sequentially to avoid rate limits and stay within timeout
    const allFlights = [];
    const allHotels = [];
    let metadata = {};
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Could not extract any travel data from the uploaded PDFs'
        })
      };
    }

    // Deduplicate hotels by confirmation number (within same upload batch)
    const deduplicatedHotels = [];
    for (const hotel of allHotels) {
      const confirmNum = hotel.confirmationNumber?.toLowerCase()?.trim();
      if (!confirmNum) {
        deduplicatedHotels.push(hotel);
        continue;
      }
      const alreadyAdded = deduplicatedHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
      );
      if (!alreadyAdded) {
        deduplicatedHotels.push(hotel);
      } else {
        console.log(`Skipping duplicate hotel in batch: ${confirmNum}`);
      }
    }

    // Deduplicate flights by booking reference + flight number + date
    const deduplicatedFlights = [];
    for (const flight of allFlights) {
      const bookingRef = flight.bookingReference?.toLowerCase()?.trim();
      const flightNum = flight.flightNumber?.toLowerCase()?.trim();
      const flightDate = flight.date;

      const alreadyAdded = deduplicatedFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
        f.flightNumber?.toLowerCase()?.trim() === flightNum &&
        f.date === flightDate
      );
      if (!alreadyAdded) {
        deduplicatedFlights.push(flight);
      } else {
        console.log(`Skipping duplicate flight in batch: ${flightNum} on ${flightDate}`);
      }
    }

    // Generate trip data
    const tripData = createTripFromExtractedData({
      flights: deduplicatedFlights,
      hotels: deduplicatedHotels,
      metadata
    });

    // Upload PDFs and link to items
    console.log('Uploading PDFs to storage...');
    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];

      // Find items that came from this PDF
      const flightsFromPdf = tripData.flights.filter(f => f._pdfIndex === pdfIndex);
      const hotelsFromPdf = tripData.hotels.filter(h => h._pdfIndex === pdfIndex);

      if (flightsFromPdf.length > 0 || hotelsFromPdf.length > 0) {
        try {
          // Upload PDF for each item (each item gets its own copy for clean deletion)
          for (const flight of flightsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripData.id, flight.id);
            flight.pdfPath = pdfPath;
            console.log(`Uploaded PDF for ${flight.id}: ${pdfPath}`);
          }
          for (const hotel of hotelsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripData.id, hotel.id);
            hotel.pdfPath = pdfPath;
            console.log(`Uploaded PDF for ${hotel.id}: ${pdfPath}`);
          }
        } catch (uploadError) {
          console.error(`Error uploading PDF ${pdf.filename}:`, uploadError);
          // Continue without PDF - not a critical failure
        }
      }
    }

    // Clean up temporary markers
    tripData.flights.forEach(f => delete f._pdfIndex);
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
          error: 'Failed to save trip to database'
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process PDF documents',
        details: error.stack
      })
    };
  }
};

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

  const flightIndicators = ['flight', 'volo', 'boarding', 'itinerary', 'ticket', 'eticket', 'ricevut', 'viaggio', 'biglietto', 'airways', 'airline'];
  const hotelIndicators = ['hotel', 'booking', 'reservation', 'accommodation', 'soggiorno', 'albergo'];

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
