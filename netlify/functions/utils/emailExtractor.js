/**
 * Email Extractor
 * Extracts booking data from email content using Claude API
 */

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

const MODEL = 'claude-3-5-haiku-20241022';

/**
 * Extract booking data from email HTML body
 * @param {string} htmlBody - HTML content of the email
 * @param {string} subject - Email subject
 * @returns {Promise<Object|null>} Extracted data or null
 */
async function extractFromEmailHtml(htmlBody, subject) {
  if (!htmlBody || htmlBody.length < 50) return null;

  const systemPrompt = `You are a travel booking email parser. Extract structured booking data from HTML email content.
The email might be a forwarded message, so look for the original booking confirmation content, not the forwarding metadata.
Common email sources: airlines (Ryanair, EasyJet, ITA Airways, Lufthansa), hotels (Booking.com, Expedia, Hotels.com, Airbnb), car rentals.
Return ONLY valid JSON, no explanations or markdown.`;

  const userPrompt = `Extract flight or hotel booking information from this email.

Subject: ${subject || 'No subject'}

Email HTML content (may be truncated):
${htmlBody.substring(0, 20000)}

Return a JSON object with this structure:
{
  "type": "flight" or "hotel" or "unknown",
  "flights": [/* array of flight objects if type is flight */],
  "hotels": [/* array of hotel objects if type is hotel */]
}

For flights, extract:
- date (YYYY-MM-DD)
- flightNumber
- airline
- departure: { code, city, airport, terminal }
- arrival: { code, city, airport, terminal }
- departureTime (HH:MM)
- arrivalTime (HH:MM)
- arrivalNextDay (boolean)
- duration (HH:MM, calculate if not provided)
- bookingReference
- class
- seat (if available)
- baggage
- passenger name

For hotels, extract:
- name
- address: { street, city, country, fullAddress }
- checkIn: { date (YYYY-MM-DD), time (HH:MM) }
- checkOut: { date (YYYY-MM-DD), time (HH:MM) }
- nights (number)
- confirmationNumber
- guestName
- roomTypes (array of {it, en} if possible)
- price: { total: { value, currency } }
- source (e.g., "Booking.com")

Return ONLY the JSON.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content[0].text;
    return parseJsonResponse(text);
  } catch (error) {
    console.error('Error extracting from email HTML:', error);
    return null;
  }
}

/**
 * Extract booking data from plain text email body
 * @param {string} textBody - Plain text content of the email
 * @param {string} subject - Email subject
 * @returns {Promise<Object|null>} Extracted data or null
 */
async function extractFromEmailText(textBody, subject) {
  if (!textBody || textBody.length < 50) return null;

  const systemPrompt = `You are a travel booking email parser. Extract structured booking data from plain text email content.
Return ONLY valid JSON, no explanations.`;

  const userPrompt = `Extract flight or hotel booking information from this plain text email.

Subject: ${subject || 'No subject'}

Email content:
${textBody.substring(0, 15000)}

Return a JSON object with "type" ("flight", "hotel", or "unknown") and either "flights" array or "hotels" array containing the extracted data.
For flights: date, flightNumber, airline, departure/arrival info, times, bookingReference.
For hotels: name, address, checkIn/checkOut dates, confirmationNumber.

Return ONLY the JSON.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content[0].text;
    return parseJsonResponse(text);
  } catch (error) {
    console.error('Error extracting from email text:', error);
    return null;
  }
}

/**
 * Extract booking data from PDF attachment using Claude vision
 * @param {string} base64Content - Base64 encoded PDF
 * @param {string} filename - PDF filename
 * @returns {Promise<Object|null>} Extracted data or null
 */
async function extractFromPdf(base64Content, filename) {
  if (!base64Content) return null;

  // Validate and clean base64 content
  console.log(`extractFromPdf: filename=${filename}, content length=${base64Content.length}`);
  console.log(`extractFromPdf: first 100 chars: ${base64Content.substring(0, 100)}`);
  console.log(`extractFromPdf: last 100 chars: ${base64Content.substring(base64Content.length - 100)}`);

  // Clean the base64 - remove any non-base64 characters
  let cleanedBase64 = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');

  // Ensure proper padding
  const paddingNeeded = cleanedBase64.length % 4;
  if (paddingNeeded > 0) {
    cleanedBase64 += '='.repeat(4 - paddingNeeded);
  }

  console.log(`extractFromPdf: cleaned length=${cleanedBase64.length}`);

  // Validate it looks like a PDF (should start with JVBERi which is %PDF- in base64)
  if (!cleanedBase64.startsWith('JVBERi')) {
    console.error('extractFromPdf: Content does not appear to be a PDF (should start with JVBERi)');
    console.log('extractFromPdf: actual start:', cleanedBase64.substring(0, 20));
    // Try to find the PDF start
    const pdfStartIndex = cleanedBase64.indexOf('JVBERi');
    if (pdfStartIndex > 0) {
      console.log(`extractFromPdf: Found PDF start at index ${pdfStartIndex}, trimming...`);
      cleanedBase64 = cleanedBase64.substring(pdfStartIndex);
    }
  }

  const docType = detectDocumentTypeFromFilename(filename);
  const systemPrompt = `You are a travel document parser. Extract structured data from travel documents and return ONLY valid JSON.`;
  const userPrompt = getPromptForDocType(docType);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: cleanedBase64
              }
            },
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }
      ]
    });

    const text = response.content[0].text;
    const parsed = parseJsonResponse(text);

    // Add type field based on what was extracted
    if (parsed) {
      if (parsed.flights && parsed.flights.length > 0) {
        parsed.type = 'flight';
      } else if (parsed.hotels && parsed.hotels.length > 0) {
        parsed.type = 'hotel';
      } else {
        parsed.type = 'unknown';
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error extracting from PDF:', error);
    return null;
  }
}

/**
 * Detect document type from filename
 */
function detectDocumentTypeFromFilename(filename) {
  if (!filename) return 'unknown';
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
    return `Extract flight information from this document. Return a JSON object with this structure:
{
  "flights": [
    {
      "date": "YYYY-MM-DD",
      "flightNumber": "XX123",
      "airline": "Airline Name",
      "operatedBy": "Airline Name or null",
      "departure": { "code": "XXX", "city": "City", "airport": "Airport Name", "terminal": "1 or null" },
      "arrival": { "code": "XXX", "city": "City", "airport": "Airport Name", "terminal": "1 or null" },
      "departureTime": "HH:MM",
      "arrivalTime": "HH:MM",
      "arrivalNextDay": false,
      "duration": "HH:MM",
      "class": "Economy",
      "bookingReference": "XXXXXX",
      "seat": "12A or null",
      "baggage": "1PC"
    }
  ],
  "passenger": { "name": "Full Name", "type": "ADT" }
}`;
  } else if (docType === 'hotel') {
    return `Extract hotel booking information from this document. Return a JSON object with this structure:
{
  "hotels": [
    {
      "name": "Hotel Name",
      "address": { "street": "Street", "city": "City", "country": "Country", "fullAddress": "Full address" },
      "checkIn": { "date": "YYYY-MM-DD", "time": "HH:MM" },
      "checkOut": { "date": "YYYY-MM-DD", "time": "HH:MM" },
      "nights": 3,
      "rooms": 1,
      "roomTypes": [{ "it": "Tipo camera", "en": "Room type" }],
      "guests": 2,
      "guestName": "Guest Name",
      "confirmationNumber": "123456",
      "price": { "total": { "value": 100, "currency": "EUR" } },
      "source": "Booking.com"
    }
  ]
}`;
  } else {
    return `Extract any flight or hotel information from this document. Return JSON with "flights" array and/or "hotels" array.`;
  }
}

/**
 * Determine booking type from extracted data
 * @param {Object} extractedData - Data extracted from email/PDF
 * @returns {string} 'flight', 'hotel', or 'unknown'
 */
function determineBookingType(extractedData) {
  if (!extractedData) return 'unknown';

  if (extractedData.type) {
    return extractedData.type;
  }

  if (extractedData.flights && extractedData.flights.length > 0) {
    return 'flight';
  }
  if (extractedData.hotels && extractedData.hotels.length > 0) {
    return 'hotel';
  }

  return 'unknown';
}

/**
 * Generate summary fields for pending booking display
 * @param {string} bookingType - 'flight', 'hotel', or 'unknown'
 * @param {Object} extractedData - Extracted booking data
 * @returns {Object} { summaryTitle, summaryDates }
 */
function generateSummary(bookingType, extractedData) {
  let summaryTitle = '';
  let summaryDates = '';

  if (bookingType === 'flight' && extractedData.flights?.[0]) {
    const flight = extractedData.flights[0];
    const depCode = flight.departure?.code || '???';
    const arrCode = flight.arrival?.code || '???';
    summaryTitle = `${flight.airline || 'Volo'} ${flight.flightNumber || ''} ${depCode}→${arrCode}`.trim();
    summaryDates = flight.date || '';
  } else if (bookingType === 'hotel' && extractedData.hotels?.[0]) {
    const hotel = extractedData.hotels[0];
    summaryTitle = hotel.name || 'Hotel';
    if (hotel.checkIn?.date && hotel.checkOut?.date) {
      summaryDates = `${hotel.checkIn.date} - ${hotel.checkOut.date}`;
    } else if (hotel.checkIn?.date) {
      summaryDates = hotel.checkIn.date;
    }
  }

  return { summaryTitle, summaryDates };
}

/**
 * Parse JSON response from Claude, handling markdown code blocks
 * @param {string} text - Response text
 * @returns {Object|null} Parsed JSON or null
 */
function parseJsonResponse(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
        // Continue to next attempt
      }
    }

    // Try to find raw JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e3) {
        // Give up
      }
    }

    console.error('Could not parse JSON from response:', text.substring(0, 200));
    return null;
  }
}

module.exports = {
  extractFromEmailHtml,
  extractFromEmailText,
  extractFromPdf,
  determineBookingType,
  generateSummary,
  detectDocumentTypeFromFilename
};
