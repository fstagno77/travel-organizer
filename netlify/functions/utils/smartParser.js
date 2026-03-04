/**
 * SmartParse v2.1 — L1 Cache + L2 Template Extraction + L4 Claude
 *
 * Three-level PDF parser:
 *   Level 1 — Exact cache (SHA-256 fingerprint)              → 0 AI calls
 *   Level 2 — Template extraction (brand-specific + anchors)  → 0 AI calls
 *   Level 4 — Claude API (with prompt caching)                → 1 AI call
 *
 * L2 learns from the first Claude extraction per provider (brand + docType).
 * Subsequent PDFs from the same provider are extracted locally without AI.
 */

'use strict';

const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { detectBrand, buildExtractionMap, tryL2Extraction } = require('./templateExtractor');

// ─── Config ────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CACHE_TABLE  = 'parsing_templates_beta';

// ─── Supabase (service role — table is RLS-locked) ─────────────────────────

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── Text extraction ────────────────────────────────────────────────────────

async function extractTextFromPdf(pdfBase64) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdfParse(buffer);
    const text = data.text || '';
    console.log(`[SmartParse] Text extracted: ${text.length} chars, ${data.numpages} pages`);
    return text;
  } catch (err) {
    console.warn('[SmartParse] PDF text extraction failed:', err.message);
    return '';
  }
}

// ─── Fingerprint ────────────────────────────────────────────────────────────

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function fingerprintText(text) {
  return crypto.createHash('sha256').update(normalizeText(text)).digest('hex');
}

// ─── JSON parsing ───────────────────────────────────────────────────────────

/**
 * Robust JSON parsing for Claude responses — handles common escape issues.
 */
function parseClaudeJson(rawText) {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  let jsonStr = jsonMatch[0];

  try { return JSON.parse(jsonStr); } catch (firstErr) {
    console.log(`[SmartParse] JSON parse failed (${firstErr.message}), attempting escape fix...`);
  }

  // Fix invalid JSON escape sequences (\s, \d, \w → \\s, \\d, \\w)
  let fixed = jsonStr.replace(/\\./g, (match) => {
    const ch = match[1];
    if ('"\\\/bfnrtu'.includes(ch)) return match;
    return '\\' + match;
  });

  try { return JSON.parse(fixed); } catch (_) { /* try more aggressive cleanup */ }

  // Remove control characters
  fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

  return JSON.parse(fixed);
}

// ─── Field normalization ────────────────────────────────────────────────────

/**
 * Normalize flat flight fields to nested format.
 * Claude sometimes returns flat (date, departureTime) instead of nested (departure.date).
 */
function normalizeFlightFields(result) {
  if (!result) return result;
  for (const fl of (result.flights || [])) {
    if (!fl.departure || typeof fl.departure !== 'object') fl.departure = {};
    if (!fl.arrival || typeof fl.arrival !== 'object') fl.arrival = {};
    if (fl.date && !fl.departure.date) fl.departure.date = fl.date;
    if (fl.departureTime && !fl.departure.time) fl.departure.time = fl.departureTime;
    if (fl.departureDate && !fl.departure.date) fl.departure.date = fl.departureDate;
    if (fl.arrivalTime && !fl.arrival.time) fl.arrival.time = fl.arrivalTime;
    if (fl.arrivalDate && !fl.arrival.date) fl.arrival.date = fl.arrivalDate;
  }
  return result;
}

// ─── DB operations (cache entries) ──────────────────────────────────────────

async function loadCacheEntries(docType) {
  const sb = getServiceClient();
  try {
    let q = sb.from(CACHE_TABLE).select('*');
    if (docType && docType !== 'auto') {
      q = q.or(`doc_type.eq.${docType},doc_type.eq.any`);
    }
    const { data, error } = await q;
    if (error) {
      console.warn('[SmartParse] DB load error:', error.message);
      return { entries: [], loadError: error.message };
    }
    return { entries: data || [], loadError: null };
  } catch (err) {
    console.warn('[SmartParse] DB load exception:', err.message);
    return { entries: [], loadError: err.message };
  }
}

/**
 * Save or update a template entry.
 * - For L4 results with a brand: ID = tpl-{brand}-{docType} (one per provider)
 * - For unknown brand: ID = cache-{fingerprint[:16]} (fingerprint-based)
 *
 * Known fingerprints are stored in match_rules._knownFingerprints (array).
 * On update, new fingerprints are appended (not replaced).
 */
async function saveCacheEntry(fingerprint, result, docType, extra = {}) {
  const sb = getServiceClient();
  const brand = extra.brand || null;
  // One template per brand+docType — reuses the same row
  const id = brand
    ? `tpl-${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${docType || 'any'}`
    : `cache-${fingerprint.substring(0, 16)}`;

  // Read existing entry to preserve known fingerprints
  let knownFingerprints = [fingerprint];
  let existingResults = {};
  const { data: existing } = await sb.from(CACHE_TABLE).select('match_rules').eq('id', id).single();
  if (existing?.match_rules) {
    if (existing.match_rules._knownFingerprints) {
      const prev = existing.match_rules._knownFingerprints;
      if (!prev.includes(fingerprint)) prev.push(fingerprint);
      knownFingerprints = prev;
    }
    if (existing.match_rules._results) {
      existingResults = existing.match_rules._results;
    }
  }

  const matchRules = {
    _knownFingerprints: knownFingerprints,
    _results: { ...existingResults, [fingerprint]: result },
  };
  if (extra.sampleText) matchRules._sampleText = extra.sampleText;

  const entry = {
    id,
    name: brand ? `${brand}: ${docType}` : `Cache: ${docType} ${new Date().toISOString().slice(0, 10)}`,
    brand,
    source: brand ? 'template-l2' : 'fingerprint-cache',
    doc_type: docType || 'any',
    match_rules: matchRules,
    field_rules: extra.extractionMap || [],
    collections: [],
    min_confidence: 1.0,
    usage_count: knownFingerprints.length,
    last_sample_fingerprint: fingerprint,
    last_sample_result: result,
  };

  const { error } = await sb.from(CACHE_TABLE).upsert(entry, { onConflict: 'id' });
  if (error) {
    console.warn('[SmartParse] Cache save error:', error.message);
    return { saved: false, error: error.message };
  }
  console.log(`[SmartParse] Template saved: ${id} (${docType}${brand ? ', brand=' + brand : ''}, fingerprints: ${knownFingerprints.length})`);
  return { saved: true, cacheId: id };
}

async function incrementUsage(id) {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from(CACHE_TABLE)
      .select('usage_count')
      .eq('id', id)
      .single();
    if (error || !data) return;
    await sb.from(CACHE_TABLE)
      .update({ usage_count: (data.usage_count || 0) + 1 })
      .eq('id', id);
  } catch (err) {
    console.warn('[SmartParse] incrementUsage:', err.message);
  }
}

/**
 * After L2 success: register this fingerprint + result in the template.
 * This enables L1 cache hit on re-upload, and tracks usage_count.
 * We store per-fingerprint results in match_rules._results: { [fingerprint]: result }
 * and the fingerprint in _knownFingerprints.
 */
async function registerL2Result(templateId, fingerprint, result) {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from(CACHE_TABLE)
      .select('match_rules, usage_count')
      .eq('id', templateId)
      .single();
    if (error || !data) return;

    const matchRules = data.match_rules || {};
    const known = matchRules._knownFingerprints || [];
    if (!known.includes(fingerprint)) known.push(fingerprint);
    matchRules._knownFingerprints = known;

    // Store per-fingerprint results for L1 lookup
    if (!matchRules._results) matchRules._results = {};
    matchRules._results[fingerprint] = result;

    await sb.from(CACHE_TABLE)
      .update({
        match_rules: matchRules,
        usage_count: (data.usage_count || 0) + 1,
      })
      .eq('id', templateId);
  } catch (err) {
    console.warn('[SmartParse] registerL2Result:', err.message);
  }
}

async function listTemplates() {
  const sb = getServiceClient();
  const { data, error } = await sb.from(CACHE_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteTemplate(id) {
  const sb = getServiceClient();
  const { error } = await sb.from(CACHE_TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

// ─── Claude API schemas ─────────────────────────────────────────────────────

const FLIGHT_SCHEMA = `{
  "flights": [{"date":"YYYY-MM-DD","flightNumber":"XX123","airline":"Name","operatedBy":null,
    "departure":{"code":"XXX","city":"City","airport":"Name","terminal":null},
    "arrival":{"code":"XXX","city":"City","airport":"Name","terminal":null},
    "departureTime":"HH:MM","arrivalTime":"HH:MM","arrivalNextDay":false,"duration":null,
    "class":"Economy","bookingReference":"XXXXXX","ticketNumber":null,"seat":null,"baggage":null,"status":"OK"}],
  "passenger":{"name":"FULL NAME","type":"ADT","ticketNumber":null},
  "booking":{"reference":"XXXXXX","ticketNumber":null,"issueDate":null,"totalAmount":null}
}`;

const HOTEL_SCHEMA = `{
  "hotels": [{"name":"Hotel Name",
    "address":{"street":null,"city":"City","postalCode":null,"country":"Country","fullAddress":"Full address"},
    "checkIn":{"date":"YYYY-MM-DD","time":"HH:MM"},"checkOut":{"date":"YYYY-MM-DD","time":"HH:MM"},
    "nights":0,"rooms":1,"roomTypes":[{"it":"Tipo","en":"Type"}],
    "guests":{"adults":1,"children":[],"total":1},"guestName":"Name","confirmationNumber":"XXXXXX",
    "price":{"room":{"value":0,"currency":"EUR"},"tax":{"value":0,"currency":"EUR"},"total":{"value":0,"currency":"EUR"}},
    "breakfast":{"included":false,"type":null},
    "cancellation":{"freeCancellationUntil":null,"penaltyAfter":null},
    "source":"Provider"}]
}`;

// ─── System prompt (≥1024 tokens for prompt caching) ────────────────────────

const SYSTEM_PROMPT = `You are a specialized travel document parser. Your task is to extract structured data from travel documents (flight bookings, hotel reservations) and return ONLY valid JSON.

## CRITICAL RULES
1. Return ONLY valid JSON — no explanations, no markdown, no comments
2. Extract ALL visible information from the document
3. Use null for fields that are not present in the document
4. Dates must be in YYYY-MM-DD format
5. Times must be in HH:MM format (24-hour)
6. Airport codes must be 3-letter IATA codes (e.g., FCO, ORD, NRT)
7. Currency codes must be 3-letter ISO codes (e.g., EUR, USD, JPY)
8. Preserve original language for hotel names, addresses, room types
9. For room types, provide both Italian and English translations when possible

## MANDATORY FIELDS (extraction fails without these)

### For FLIGHTS:
- flightNumber: airline code + number (e.g., AZ628)
- date: flight date in YYYY-MM-DD
- departureTime: departure time in HH:MM
- arrivalTime: arrival time in HH:MM
- departure.code: IATA code of departure airport
- departure.city: departure city name
- arrival.code: IATA code of arrival airport
- arrival.city: arrival city name
- passenger.name: full passenger name
- bookingReference: booking/PNR reference code

### For HOTELS:
- name: hotel name
- checkIn.date: check-in date in YYYY-MM-DD
- checkOut.date: check-out date in YYYY-MM-DD
- confirmationNumber: booking confirmation number
- address.city: hotel city
- address.fullAddress: complete hotel address

## IMPORTANT OPTIONAL FIELDS (extract when available)
- departure.airport / arrival.airport: full airport name
- departure.terminal / arrival.terminal: terminal number
- arrivalNextDay: true if arrives next day
- duration: flight duration
- class: travel class (Economy, Business, etc.)
- ticketNumber: e-ticket number
- passenger.type: ADT (adult), CHD (child), INF (infant)
- checkIn.time / checkOut.time: check-in/out times
- nights: number of nights
- rooms: number of rooms
- roomTypes: room type descriptions [{it, en}]
- guests.adults / guests.children: guest counts
- guestName: primary guest name
- price.total.value / price.total.currency: total price
- breakfast.included: whether breakfast is included
- cancellation.freeCancellationUntil: free cancellation deadline

## MULTIPLE FLIGHTS
Many documents contain multiple flight segments (e.g., outbound + return, connections).
Extract ALL flight segments as separate entries in the flights array.
Each segment gets its own entry with its own flightNumber, times, airports, etc.
The passenger and booking information is shared across all segments.

## OUTPUT
Return ONLY the structured JSON with extracted data. Do NOT include "_rawText" or raw document text in the output.
Keep the response concise — only the fields specified in the schema below.

## DOCUMENT TYPE DETECTION
When docType is "auto", examine the document and determine if it's a flight or hotel booking.
Set "_docType" to "flight" or "hotel" accordingly.

## JSON SCHEMAS

### Flight document:
${FLIGHT_SCHEMA}

### Hotel document:
${HOTEL_SCHEMA}`;

// ─── Claude API call with prompt caching ────────────────────────────────────

async function parseWithClaude(pdfBase64, docType, extractedText = '') {
  const client = new Anthropic();
  const useTextMode = extractedText.length > 200;

  let userPrompt;
  if (docType === 'auto') {
    userPrompt = `Detect if this document is a FLIGHT or HOTEL booking.
Set "_docType" to "flight" or "hotel", then include only the fields for the detected type.

If FLIGHT, return: { "_docType": "flight", ${FLIGHT_SCHEMA.slice(1)}
If HOTEL, return: { "_docType": "hotel", ${HOTEL_SCHEMA.slice(1)}

Return ONLY valid JSON, no extra text.`;
  } else {
    const schema = docType === 'hotel' ? HOTEL_SCHEMA : FLIGHT_SCHEMA;
    userPrompt = `Extract travel data from this ${docType} document.
Return ONLY valid JSON matching this schema:
${schema}`;
  }

  // Build user message content: text mode (fast) or PDF binary (fallback for scanned PDFs)
  const userContent = useTextMode
    ? [{ type: 'text', text: `--- DOCUMENT TEXT ---\n${extractedText}\n--- END ---\n\n${userPrompt}` }]
    : [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: userPrompt }
      ];

  if (useTextMode) {
    console.log(`[SmartParse] Using text mode (${extractedText.length} chars) — faster than PDF binary`);
  } else {
    console.log('[SmartParse] Using PDF binary mode (text extraction insufficient)');
  }

  const claudeRequest = async (timeoutMs) => {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [{ role: 'user', content: userContent }]
      }, { signal: controller.signal });
      clearTimeout(abortTimer);
      return res;
    } catch (err) {
      clearTimeout(abortTimer);
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        throw new Error(`Claude API timeout (>${timeoutMs / 1000}s)`);
      }
      throw err;
    }
  };

  let response;
  try {
    response = await claudeRequest(28000);
  } catch (err) {
    // If text mode timed out (unlikely), retry with PDF as fallback
    if (useTextMode && err.message?.includes('timeout')) {
      console.warn('[SmartParse] Text mode timed out — should not happen, rethrowing');
    }
    throw err;
  }

  // Log cache usage
  const usage = response.usage || {};
  if (usage.cache_read_input_tokens) {
    console.log(`[SmartParse] Prompt cache HIT: ${usage.cache_read_input_tokens} tokens read from cache`);
  }
  if (usage.cache_creation_input_tokens) {
    console.log(`[SmartParse] Prompt cache WRITE: ${usage.cache_creation_input_tokens} tokens written to cache`);
  }

  const raw = response.content[0]?.text || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (docType === 'auto') {
      console.warn('[SmartParse] Auto prompt returned no JSON — retrying with explicit flight schema');
      return parseWithClaude(pdfBase64, 'flight');
    }
    throw new Error(`No JSON in Claude response. Raw: ${raw.substring(0, 300)}`);
  }

  let parsed;
  try {
    parsed = parseClaudeJson(raw);
  } catch (parseErr) {
    if (docType === 'auto') {
      console.warn('[SmartParse] Auto prompt JSON parse failed — retrying with explicit flight schema');
      return parseWithClaude(pdfBase64, 'flight');
    }
    throw new Error(`JSON parse failed: ${parseErr.message}. Raw snippet: ${jsonMatch[0].substring(0, 300)}`);
  }

  const { _rawText, _docType, ...result } = parsed;
  normalizeFlightFields(result);

  const detectedDocType = typeof _docType === 'string' && ['flight', 'hotel'].includes(_docType) ? _docType : null;
  console.log(`[SmartParse] Claude done, docType: ${detectedDocType}, flights: ${result.flights?.length || 0}, hotels: ${result.hotels?.length || 0}`);

  return { result, detectedDocType };
}

// ─── Main cascade: L1 → L2 → L4 ────────────────────────────────────────────

async function _parseDocumentSmartInternal(pdfBase64, docType, mode = 'auto', skipLearn = false) {
  const t0 = Date.now();

  // --- Extract text (pdf-parse) for fingerprinting ---
  const extractedText = await extractTextFromPdf(pdfBase64);
  const hasText = extractedText.length > 80;
  const fingerprint = hasText
    ? fingerprintText(extractedText)
    : fingerprintText(pdfBase64.slice(0, 1000));

  const meta = () => ({ durationMs: Date.now() - t0, textLength: extractedText.length });

  // ─ Level 1 — Exact fingerprint cache ────────────────────────────────────
  let dbLoadError = null;
  const { entries, loadError } = await loadCacheEntries(docType);
  dbLoadError = loadError;

  if (!loadError) {
    const cached = entries.find(e => {
      if (!e.last_sample_result) return false;
      // Check last_sample_fingerprint (legacy) OR known fingerprints array
      if (e.last_sample_fingerprint === fingerprint) return true;
      if (e.match_rules?._knownFingerprints?.includes(fingerprint)) return true;
      return false;
    });
    if (cached) {
      await incrementUsage(cached.id);
      // Use per-fingerprint result if available, fallback to last_sample_result
      const cachedResult = cached.match_rules?._results?.[fingerprint] || cached.last_sample_result;
      console.log(`[SmartParse] L1 cache hit: ${cached.id}`);
      return {
        result: cachedResult,
        parseLevel: 1,
        cacheId: cached.id,
        detectedDocType: cached.doc_type !== 'any' ? cached.doc_type : null,
        claudeCalls: 0,
        ...meta()
      };
    }
  }

  // ─ Level 2 — Template extraction (brand-specific) ──────────────────────
  if (hasText && !loadError) {
    const brand = detectBrand(extractedText);
    if (brand) {
      // Find a template for this brand + docType
      // L2 data stored in existing columns: extraction_map in field_rules, sampleText in match_rules._sampleText
      const template = entries.find(e =>
        e.brand === brand &&
        e.last_sample_result &&
        (e.match_rules?._sampleText || e.field_rules?.length)
      );
      // Map stored fields to what templateExtractor expects
      if (template) {
        template.extraction_map = template.field_rules || [];
        template.last_sample_text = template.match_rules?._sampleText || '';
      }

      if (template) {
        const effectiveDocType = (template.doc_type && template.doc_type !== 'any')
          ? template.doc_type : (docType !== 'auto' ? docType : null);

        try {
          const l2 = tryL2Extraction(template, extractedText, effectiveDocType || docType);
          if (l2) {
            // L2 success — register this fingerprint+result in the template for future L1
            sanitizeResult(l2.result);
            console.log(`[SmartParse] L2 template hit: brand=${brand}, method=${l2.method}, template=${template.id}`);

            // Add fingerprint to known list + store this result for L1 next time
            registerL2Result(template.id, fingerprint, l2.result).catch(() => {});

            return {
              result: l2.result,
              parseLevel: 2,
              templateId: template.id,
              brand,
              l2Method: l2.method,
              detectedDocType: l2.docType || effectiveDocType,
              claudeCalls: 0,
              ...meta()
            };
          }
          console.log(`[SmartParse] L2 extraction failed for brand=${brand} — falling back to L4`);
        } catch (err) {
          console.warn(`[SmartParse] L2 error: ${err.message} — falling back to L4`);
        }
      } else {
        console.log(`[SmartParse] No L2 template for brand=${brand} — will create after L4`);
      }
    }
  }

  // ─ Level 4 — Claude API ─────────────────────────────────────────────────
  let result, detectedDocType;

  try {
    const claude = await parseWithClaude(pdfBase64, docType, extractedText);
    result = claude.result;
    detectedDocType = claude.detectedDocType;
  } catch (err) {
    const timeout = err.message?.includes('timeout') || err.message?.includes('abort');
    if (timeout) {
      console.warn('[SmartParse] Claude timeout — returning error');
      return {
        result: {},
        parseLevel: 4,
        timedOut: true,
        claudeCalls: 1,
        detectedDocType: null,
        dbLoadError,
        error: err.message,
        ...meta()
      };
    }
    throw err;
  }

  const actualDocType = detectedDocType || (docType !== 'auto' ? docType : 'any');

  // Build L2 template data for future same-provider extractions
  const brand = hasText ? detectBrand(extractedText) : null;
  let extractionMap = [];
  if (brand && hasText) {
    try {
      extractionMap = buildExtractionMap(extractedText, result, actualDocType);
      console.log(`[SmartParse] Built extraction map: ${extractionMap.length} rules for brand=${brand}`);
    } catch (err) {
      console.warn(`[SmartParse] Extraction map build error: ${err.message}`);
    }
  }

  // Save to cache (with L2 template data)
  const cacheResult = await saveCacheEntry(fingerprint, result, actualDocType, {
    brand,
    extractionMap: extractionMap.length > 0 ? extractionMap : undefined,
    sampleText: hasText ? extractedText : undefined,
  }).catch(err => {
    console.warn('[SmartParse] Cache save failed:', err.message);
    return { saved: false, error: err.message };
  });

  return {
    result,
    parseLevel: 4,
    claudeCalls: 1,
    detectedDocType,
    brand,
    cacheSaved: cacheResult?.saved || false,
    cacheId: cacheResult?.cacheId || null,
    dbLoadError,
    ...meta()
  };
}

// ─── Date sanitization ────────────────────────────────────────────────────────

const ITALIAN_MONTHS = {
  gennaio:1, febbraio:2, marzo:3, aprile:4, maggio:5, giugno:6,
  luglio:7, agosto:8, settembre:9, ottobre:10, novembre:11, dicembre:12,
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  january:1, february:2, march:3, april:4, june:6, july:7, august:8,
  september:9, october:10, november:11, december:12,
};

const DATE_PREFIX_RE = /^(arrivo|partenza|check[-\s]?in|check[-\s]?out|data|dall?[ae]?|al|di|de|from|to|dal|il|the|date|departure|arrival)\s+/gi;

function inferYear(month, day) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cand = new Date(now.getFullYear(), month - 1, day);
  return cand >= today ? now.getFullYear() : now.getFullYear() + 1;
}

function resolveDateValue(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.date || v.value || v.text || null;
  return null;
}

function sanitizeDateField(str) {
  if (!str || typeof str !== 'string') return str;

  let s = str.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  let prev;
  do { prev = s; s = s.replace(DATE_PREFIX_RE, '').trim(); } while (s !== prev);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let m = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;

  m = s.match(/^(\d{1,2})\s+([a-zA-Zàèéìòù]+)\s+(\d{4})$/i);
  if (m) {
    const month = ITALIAN_MONTHS[m[2].toLowerCase()];
    if (month) return `${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }

  m = s.match(/^([a-zA-Zàèéìòù]+)\s+(\d{1,2})\s+(\d{4})$/i);
  if (m) {
    const month = ITALIAN_MONTHS[m[1].toLowerCase()];
    if (month) return `${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  }

  m = s.match(/^(\d{1,2})\s+([a-zA-Zàèéìòù]+)$/i);
  if (m) {
    const month = ITALIAN_MONTHS[m[2].toLowerCase()];
    if (month) {
      const day = parseInt(m[1], 10);
      const year = inferYear(month, day);
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  m = s.match(/^([a-zA-Zàèéìòù]+)\s+(\d{1,2})$/i);
  if (m) {
    const month = ITALIAN_MONTHS[m[1].toLowerCase()];
    if (month) {
      const day = parseInt(m[2], 10);
      const year = inferYear(month, day);
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const day = parseInt(m[1], 10), month = parseInt(m[2], 10);
    if (month >= 1 && month <= 12) {
      const year = inferYear(month, day);
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  return s || str;
}

function sanitizeDateValue(v) {
  if (!v) return v;
  // If it's an object like { date: "...", time: "..." }, sanitize the inner date but preserve the object
  if (typeof v === 'object' && v.date) {
    return { ...v, date: sanitizeDateField(v.date) };
  }
  const raw = resolveDateValue(v);
  if (!raw) return v;
  return sanitizeDateField(raw);
}

function sanitizeResult(result) {
  if (!result || typeof result !== 'object') return result;

  const HOTEL_DATE_FIELDS = ['checkIn','checkOut','date','departureDate','arrivalDate','bookingDate'];
  const FLIGHT_DATE_FIELDS = ['date','departureDate','arrivalDate'];

  (result.hotels || []).forEach(h => {
    HOTEL_DATE_FIELDS.forEach(f => {
      if (h[f] != null) h[f] = sanitizeDateValue(h[f]);
    });
  });

  (result.flights || []).forEach(fl => {
    if (!fl.departure || typeof fl.departure !== 'object') fl.departure = fl.departure && typeof fl.departure === 'string' ? { date: fl.departure } : (fl.departure || {});
    if (!fl.arrival || typeof fl.arrival !== 'object') fl.arrival = fl.arrival && typeof fl.arrival === 'string' ? { date: fl.arrival } : (fl.arrival || {});

    if (fl.date && !fl.departure.date) fl.departure.date = fl.date;
    if (fl.departureTime && !fl.departure.time) fl.departure.time = fl.departureTime;
    if (fl.departureDate && !fl.departure.date) fl.departure.date = fl.departureDate;
    if (fl.arrivalTime && !fl.arrival.time) fl.arrival.time = fl.arrivalTime;
    if (fl.arrivalDate && !fl.arrival.date) fl.arrival.date = fl.arrivalDate;
    if (fl.arrivalNextDay != null && fl.arrival.nextDay == null) fl.arrival.nextDay = fl.arrivalNextDay;

    if (fl.departure.date != null) fl.departure.date = sanitizeDateValue(fl.departure.date);
    if (fl.arrival.date != null) fl.arrival.date = sanitizeDateValue(fl.arrival.date);
    FLIGHT_DATE_FIELDS.forEach(f => {
      if (fl[f] != null) fl[f] = sanitizeDateValue(fl[f]);
    });
  });

  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

async function parseDocumentSmart(pdfBase64, docType, mode = 'auto', skipLearn = false) {
  const res = await _parseDocumentSmartInternal(pdfBase64, docType, mode, skipLearn);
  if (res?.result) sanitizeResult(res.result);
  return res;
}

module.exports = {
  parseDocumentSmart,
  parseWithClaude,
  listTemplates,
  deleteTemplate,
};
