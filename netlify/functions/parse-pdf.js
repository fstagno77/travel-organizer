/**
 * Netlify Function: Parse PDF (SmartParse v2.1)
 * Extracts travel data from PDFs using SmartParse cascade (L1→L2→L4)
 * Returns parsed results WITHOUT saving — caller confirms before save.
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { downloadPdfAsBase64 } = require('./utils/storage');
const { parseDocumentSmart } = require('./utils/smartParser');
const { extractPassengerFromFilename } = require('./utils/pdfProcessor');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const authResult = await authenticateRequest(event);
  if (!authResult) return unauthorizedResponse();

  try {
    const { pdfs } = JSON.parse(event.body);

    if (!pdfs || pdfs.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No PDF files provided' }) };
    }

    const parsedResults = [];

    for (let i = 0; i < pdfs.length; i++) {
      const pdf = pdfs[i];
      const t0 = Date.now();

      try {
        // Download PDF from storage
        let base64;
        if (pdf.storagePath) {
          base64 = await downloadPdfAsBase64(pdf.storagePath);
        } else if (pdf.content) {
          base64 = pdf.content;
        } else {
          parsedResults.push({ pdfIndex: i, filename: pdf.filename, error: 'No PDF content' });
          continue;
        }

        // Call SmartParse
        const sp = await parseDocumentSmart(base64, 'auto');

        // Enrich: passenger from filename fallback
        if (sp.result?.flights) {
          for (const flight of sp.result.flights) {
            if (!flight.passenger && sp.result.passenger) {
              flight.passenger = { ...sp.result.passenger };
            }
            if (!flight.passenger) {
              const name = extractPassengerFromFilename(pdf.filename);
              if (name) flight.passenger = { name, type: 'ADT' };
            }
          }
        }

        parsedResults.push({
          pdfIndex: i,
          filename: pdf.filename,
          result: sp.result,
          parseLevel: sp.parseLevel,
          brand: sp.brand || null,
          claudeCalls: sp.claudeCalls || 0,
          durationMs: Date.now() - t0,
          detectedDocType: sp.detectedDocType || null,
          cacheId: sp.cacheId || sp.templateId || null,
          textLength: sp.textLength || 0,
        });
      } catch (err) {
        console.error(`[parse-pdf] Error parsing ${pdf.filename}:`, err.message);

        // Rate limit — stop immediately
        if (err.status === 429 || err.message?.includes('rate_limit')) {
          return {
            statusCode: 429,
            headers: { ...headers, 'Retry-After': String(err.retryAfter || 30) },
            body: JSON.stringify({ success: false, error: 'Rate limit reached', errorType: 'rate_limit' })
          };
        }

        parsedResults.push({
          pdfIndex: i,
          filename: pdf.filename,
          error: err.message,
          durationMs: Date.now() - t0,
        });
      }
    }

    // Check if we got any usable results
    const hasResults = parsedResults.some(r => r.result);
    if (!hasResults) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Could not extract any travel data from the uploaded PDFs',
          parsedResults
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, parsedResults })
    };

  } catch (error) {
    console.error('[parse-pdf] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to parse PDFs' })
    };
  }
};
