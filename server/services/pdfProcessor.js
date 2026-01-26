/**
 * PDF Processor Service
 * Extracts travel data from PDF documents using Claude API
 */

const Anthropic = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');

const client = new Anthropic();

/**
 * Process multiple PDF files and extract travel data
 * @param {Array} files - Array of multer file objects
 * @returns {Object} Extracted travel data
 */
async function processMultiplePdfs(files) {
  const allFlights = [];
  const allHotels = [];
  let metadata = {};

  for (const file of files) {
    try {
      console.log(`Processing: ${file.originalname}`);
      const result = await processSinglePdf(file.buffer, file.originalname);

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
      console.error(`Error processing ${file.originalname}:`, error.message);
    }
  }

  return {
    flights: allFlights,
    hotels: allHotels,
    metadata
  };
}

/**
 * Process a single PDF file
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Original filename
 * @returns {Object} Extracted data
 */
async function processSinglePdf(pdfBuffer, filename) {
  // Extract text from PDF
  const pdfData = await pdfParse(pdfBuffer);
  const pdfText = pdfData.text;

  if (!pdfText || pdfText.trim().length < 50) {
    throw new Error('Could not extract meaningful text from PDF');
  }

  // Detect document type
  const docType = detectDocumentType(pdfText, filename);
  console.log(`Detected document type: ${docType}`);

  // Process with Claude API
  const extractedData = await extractDataWithClaude(pdfText, docType);

  return extractedData;
}

/**
 * Detect the type of travel document
 * @param {string} text - PDF text content
 * @param {string} filename - Original filename
 * @returns {string} Document type
 */
function detectDocumentType(text, filename) {
  const textLower = text.toLowerCase();
  const filenameLower = filename.toLowerCase();

  // Check for flight indicators
  const flightIndicators = [
    'flight', 'volo', 'boarding', 'departure', 'arrival',
    'airline', 'e-ticket', 'itinerary', 'pnr', 'booking reference',
    'terminal', 'gate', 'seat', 'baggage'
  ];

  // Check for hotel indicators
  const hotelIndicators = [
    'hotel', 'booking.com', 'check-in', 'check-out', 'reservation',
    'room', 'accommodation', 'stay', 'nights', 'property'
  ];

  let flightScore = 0;
  let hotelScore = 0;

  flightIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) flightScore++;
    if (filenameLower.includes(indicator)) flightScore += 2;
  });

  hotelIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) hotelScore++;
    if (filenameLower.includes(indicator)) hotelScore += 2;
  });

  if (flightScore > hotelScore) return 'flight';
  if (hotelScore > flightScore) return 'hotel';
  return 'unknown';
}

/**
 * Extract structured data using Claude API
 * @param {string} pdfText - Extracted PDF text
 * @param {string} docType - Document type
 * @returns {Object} Structured travel data
 */
async function extractDataWithClaude(pdfText, docType) {
  const systemPrompt = `You are a travel document parser. Extract structured data from travel documents and return ONLY valid JSON. Do not include any explanations or markdown formatting.`;

  let userPrompt;

  if (docType === 'flight') {
    userPrompt = `Extract flight information from this document. Return a JSON object with this exact structure.

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
      "class": "Economy/Business/etc or booking class letter",
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
}

Document text:
${pdfText}`;

  } else if (docType === 'hotel') {
    userPrompt = `Extract hotel booking information from this document. Return a JSON object with this exact structure.

IMPORTANT: If the booking contains multiple rooms with the same confirmation number and dates, keep them as a SINGLE hotel entry with "rooms" set to the number of rooms and "roomTypes" as an array listing each room type. Do NOT create separate hotel entries for rooms in the same booking.

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
      "rooms": 2,
      "roomTypes": [
        {
          "it": "Tipo camera 1 in italiano",
          "en": "Room type 1 in English"
        },
        {
          "it": "Tipo camera 2 in italiano",
          "en": "Room type 2 in English"
        }
      ],
      "guests": 4,
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
      "amenities": ["WiFi", "Air conditioning", "etc"],
      "notes": {
        "it": "Note in italiano",
        "en": "Notes in English"
      },
      "source": "Booking.com or Expedia or etc"
    }
  ]
}

Document text:
${pdfText}`;

  } else {
    userPrompt = `This appears to be a travel document. Extract any flight or hotel information you can find. Return a JSON object with "flights" array and/or "hotels" array following these structures:

For flights:
{
  "flights": [{ "date": "YYYY-MM-DD", "flightNumber": "XX123", "airline": "Name", "departure": { "code": "XXX", "city": "City", "airport": "Airport", "terminal": null }, "arrival": { "code": "XXX", "city": "City", "airport": "Airport", "terminal": null }, "departureTime": "HH:MM", "arrivalTime": "HH:MM", "arrivalNextDay": false, "duration": "HH:MM", "bookingReference": "XXXXXX", "status": "OK" }]
}

For hotels:
{
  "hotels": [{ "name": "Hotel", "address": { "street": "Street", "city": "City", "country": "Country", "fullAddress": "Full address" }, "checkIn": { "date": "YYYY-MM-DD", "time": "HH:MM" }, "checkOut": { "date": "YYYY-MM-DD", "time": "HH:MM" }, "nights": 1, "confirmationNumber": "123", "guestName": "Name" }]
}

Document text:
${pdfText}`;
  }

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ],
    system: systemPrompt
  });

  // Extract JSON from response
  const responseText = response.content[0].text;

  try {
    // Try to parse directly
    return JSON.parse(responseText);
  } catch (e) {
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse Claude response as JSON');
  }
}

module.exports = {
  processMultiplePdfs,
  processSinglePdf
};
