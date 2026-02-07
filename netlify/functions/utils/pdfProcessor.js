/**
 * PDF Processor - Shared Claude API interaction for PDF parsing
 * Supports batching multiple PDFs into a single API call to reduce rate limit hits.
 */

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_SINGLE = 4096;
const MAX_TOKENS_BATCH = 8192;
const MAX_BATCH_SIZE = 2;
const SYSTEM_PROMPT = 'You are a travel document parser. Extract structured data from travel documents and return ONLY valid JSON. Do not include any explanations or markdown formatting.';

/**
 * Process multiple PDFs with Claude API, using batching to reduce API calls.
 * - 1 PDF: single call (proven approach)
 * - 2+ PDFs: batches of 2, processed sequentially
 *
 * @param {Array<{content: string, filename: string}>} pdfs - Array of PDF objects
 * @returns {Promise<Array<{result: Object|null, pdfIndex: number, filename: string, error?: Error}>>}
 */
async function processPdfsWithClaude(pdfs) {
  if (pdfs.length === 1) {
    // Single PDF - use simple individual approach
    try {
      const result = await processSinglePdfWithClaude(pdfs[0].content, pdfs[0].filename);
      return [{ result, pdfIndex: 0, filename: pdfs[0].filename }];
    } catch (error) {
      return [{ result: null, pdfIndex: 0, filename: pdfs[0].filename, error }];
    }
  }

  // Multiple PDFs - batch in groups of MAX_BATCH_SIZE, sequentially
  const allResults = [];

  for (let i = 0; i < pdfs.length; i += MAX_BATCH_SIZE) {
    const batch = pdfs.slice(i, i + MAX_BATCH_SIZE);
    const batchStartIndex = i;

    try {
      const batchResults = await processBatch(batch, batchStartIndex);
      allResults.push(...batchResults);
    } catch (error) {
      console.warn(`Batch ${i}-${i + batch.length} failed, falling back to individual calls:`, error.message);
      // Fallback: process individually and sequentially
      for (let j = 0; j < batch.length; j++) {
        const pdfIndex = batchStartIndex + j;
        try {
          const result = await processSinglePdfWithClaude(batch[j].content, batch[j].filename);
          allResults.push({ result, pdfIndex, filename: batch[j].filename });
        } catch (err) {
          allResults.push({ result: null, pdfIndex, filename: batch[j].filename, error: err });
        }
      }
    }
  }

  return allResults;
}

/**
 * Process a batch of 1-2 PDFs in a single Claude API call.
 */
async function processBatch(pdfs, startIndex) {
  if (pdfs.length === 1) {
    // Single PDF in batch - use individual call
    try {
      const result = await processSinglePdfWithClaude(pdfs[0].content, pdfs[0].filename);
      return [{ result, pdfIndex: startIndex, filename: pdfs[0].filename }];
    } catch (error) {
      return [{ result: null, pdfIndex: startIndex, filename: pdfs[0].filename, error }];
    }
  }

  // Build batched content array
  const contentBlocks = [];
  const docDescriptions = [];

  pdfs.forEach((pdf, i) => {
    const docType = detectDocumentType(pdf.filename);
    contentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdf.content
      }
    });
    docDescriptions.push(`- Document ${i + 1} (index ${i}): "${pdf.filename}" - detected as ${docType}`);
  });

  const batchPrompt = buildBatchedPrompt(pdfs.length, docDescriptions);
  contentBlocks.push({ type: 'text', text: batchPrompt });

  try {
    console.log(`Batch API call: ${pdfs.length} documents`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_BATCH,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }]
    });

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.warn('Batch response was truncated (max_tokens reached), falling back to individual calls');
      throw new Error('Response truncated');
    }

    const responseText = response.content[0].text;
    const documents = parseBatchedResponse(responseText, pdfs.length);

    return documents.map((doc, i) => ({
      result: doc,
      pdfIndex: startIndex + (doc.index != null ? doc.index : i),
      filename: pdfs[doc.index != null ? doc.index : i].filename
    }));
  } catch (error) {
    const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
    if (isRateLimit) {
      error.isRateLimit = true;
      error.retryAfter = extractRetryAfter(error);
    }
    throw error;
  }
}

/**
 * Build the batched prompt that instructs Claude to return indexed results.
 */
function buildBatchedPrompt(docCount, docDescriptions) {
  const flightSchema = getPromptForDocType('flight');
  const hotelSchema = getPromptForDocType('hotel');

  return `You have been given ${docCount} travel documents. Extract data from EACH document SEPARATELY.

Document details:
${docDescriptions.join('\n')}

For FLIGHT documents, extract per document:
${flightSchema}

For HOTEL documents, extract per document:
${hotelSchema}

For UNKNOWN type documents, extract any flights or hotels you can find.

CRITICAL INSTRUCTIONS:
- Process each document independently. Do NOT merge data between documents.
- Return a JSON object with a "documents" array containing one entry per document.
- Each entry MUST include an "index" field (0-based) matching the document's position.
- The "passenger" field is MANDATORY for flight documents.

Return this EXACT structure:
{
  "documents": [
    {
      "index": 0,
      "flights": [...],
      "hotels": [...],
      "passenger": {...},
      "booking": {...}
    },
    {
      "index": 1,
      ...
    }
  ]
}`;
}

/**
 * Parse the batched response from Claude into an array of per-document results.
 */
function parseBatchedResponse(responseText, expectedCount) {
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse batched Claude response as JSON');
    }
  }

  // Expected format: { documents: [...] }
  if (parsed.documents && Array.isArray(parsed.documents)) {
    return parsed.documents;
  }

  // Fallback: if Claude returned a single-document result (no wrapper)
  if (parsed.flights || parsed.hotels) {
    return [{ index: 0, ...parsed }];
  }

  throw new Error('Unexpected response format from batched Claude call');
}

/**
 * Process a single PDF with Claude API.
 * No server-side retry on rate limit — returns 429 immediately to the client,
 * which already has retry UI. This prevents exceeding Netlify's ~26s proxy timeout.
 */
async function processSinglePdfWithClaude(base64Content, filename) {
  const docType = detectDocumentType(filename);
  const userPrompt = getPromptForDocType(docType);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_SINGLE,
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
      system: SYSTEM_PROMPT
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
    if (isRateLimit) {
      error.isRateLimit = true;
      error.retryAfter = extractRetryAfter(error);
    }
    throw error;
  }
}

/**
 * Extract retry-after seconds from Anthropic SDK error.
 */
function extractRetryAfter(error) {
  const raw = error.headers?.get?.('retry-after') || error.headers?.['retry-after'];
  if (raw) {
    const seconds = parseInt(raw, 10);
    if (!isNaN(seconds) && seconds > 0) return seconds;
  }
  return null;
}

/**
 * Detect document type from filename.
 * Merged keyword lists from all modules.
 */
function detectDocumentType(filename) {
  if (!filename) return 'unknown';
  const filenameLower = filename.toLowerCase();

  const flightIndicators = ['flight', 'volo', 'boarding', 'itinerary', 'ticket', 'eticket', 'ricevut', 'viaggio', 'biglietto', 'airways', 'airline'];
  const hotelIndicators = ['hotel', 'booking', 'reservation', 'accommodation', 'soggiorno', 'albergo', 'conferma', 'prenotazione'];

  for (const indicator of flightIndicators) {
    if (filenameLower.includes(indicator)) return 'flight';
  }
  for (const indicator of hotelIndicators) {
    if (filenameLower.includes(indicator)) return 'hotel';
  }

  return 'unknown';
}

/**
 * Get extraction prompt based on document type.
 * Uses the most complete version (from process-pdf.js).
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

For flights include: date, flightNumber, airline, departure (code, city, airport), arrival (code, city, airport), departureTime, arrivalTime, bookingReference, status, passenger (name, type).

For hotels include: name, address (street, city, country, fullAddress), checkIn (date, time), checkOut (date, time), nights, confirmationNumber, guestName.`;
  }
}

/**
 * Extract passenger name from filename as fallback.
 * Handles patterns like "Le ricevute elettroniche di viaggio per AGATA BRIGNONE del 15JUN.pdf"
 */
function extractPassengerFromFilename(filename) {
  if (!filename) return null;

  const patterns = [
    /per\s+([A-Z][A-Z\s]+)\s+del/i,
    /for\s+([A-Z][A-Z\s]+)\s+/i,
    /viaggio\s+([A-Z][A-Z\s]+)\s+/i
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
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

module.exports = {
  processPdfsWithClaude,
  processSinglePdfWithClaude,
  detectDocumentType,
  getPromptForDocType,
  extractPassengerFromFilename
};
