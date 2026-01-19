/**
 * Netlify Function: Process PDF
 * Extracts travel data from PDF documents using Claude API
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

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

    // Process all PDFs
    const allFlights = [];
    const allHotels = [];
    let metadata = {};

    for (const pdf of pdfs) {
      try {
        const result = await processPdfWithClaude(pdf.content, pdf.filename);

        if (result.flights) {
          allFlights.push(...result.flights);
        }
        if (result.hotels) {
          allHotels.push(...result.hotels);
        }
        if (result.passenger) {
          metadata.passenger = result.passenger;
        }
        if (result.booking) {
          metadata.booking = result.booking;
        }
      } catch (error) {
        console.error(`Error processing ${pdf.filename}:`, error.message);
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

    // Generate trip data
    const tripData = createTripFromExtractedData({
      flights: allFlights,
      hotels: allHotels,
      metadata
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData,
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
        error: error.message || 'Failed to process PDF documents'
      })
    };
  }
};

/**
 * Process PDF with Claude API using vision
 */
async function processPdfWithClaude(base64Content, filename) {
  const docType = detectDocumentType(filename);

  const systemPrompt = `You are a travel document parser. Extract structured data from travel documents and return ONLY valid JSON. Do not include any explanations or markdown formatting.`;

  let userPrompt = getPromptForDocType(docType);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
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
}

/**
 * Detect document type from filename
 */
function detectDocumentType(filename) {
  const filenameLower = filename.toLowerCase();

  const flightIndicators = ['flight', 'volo', 'boarding', 'itinerary', 'ticket', 'eticket'];
  const hotelIndicators = ['hotel', 'booking', 'reservation', 'accommodation'];

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
    return `Extract flight information from this document. Return a JSON object with this exact structure:

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
    return `Extract hotel booking information from this document. Return a JSON object with this exact structure:

{
  "hotels": [
    {
      "name": "Hotel Name",
      "address": {
        "street": "123 Street Name",
        "city": "City",
        "state": "State/Province or null",
        "postalCode": "12345",
        "country": "Country",
        "fullAddress": "Full formatted address"
      },
      "coordinates": {
        "lat": 12.3456,
        "lng": -12.3456
      },
      "phone": "+1 234 567 8900 or null",
      "checkIn": {
        "date": "YYYY-MM-DD",
        "time": "HH:MM"
      },
      "checkOut": {
        "date": "YYYY-MM-DD",
        "time": "HH:MM"
      },
      "nights": 3,
      "rooms": 1,
      "roomType": {
        "it": "Tipo camera in italiano",
        "en": "Room type in English"
      },
      "guests": 2,
      "guestName": "Guest Name",
      "confirmationNumber": "123456789",
      "pinCode": "1234 or null",
      "price": {
        "room": { "value": 100, "currency": "EUR" },
        "tax": { "value": 20, "currency": "EUR" },
        "total": { "value": 120, "currency": "EUR" }
      },
      "payment": {
        "method": "Pay at property or Prepaid",
        "prepayment": false
      },
      "cancellation": {
        "freeCancellationUntil": "YYYY-MM-DDTHH:MM:SS or null",
        "penaltyAfter": { "value": 50, "currency": "EUR" }
      },
      "amenities": ["WiFi", "Air conditioning"],
      "notes": {
        "it": "Note in italiano",
        "en": "Notes in English"
      },
      "source": "Booking.com or Expedia"
    }
  ]
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

    const departureCode = flights[0].departure.code;
    const arrivalFlight = flights.find(f => f.arrival.code !== departureCode);
    if (arrivalFlight) {
      destination = arrivalFlight.arrival.city;
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
  const tripId = `${year}-${month}-${destSlug}`;

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
