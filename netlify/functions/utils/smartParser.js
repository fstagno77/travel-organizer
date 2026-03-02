/**
 * SmartParse - 4-Level Cascade PDF Parser (BETA)
 *
 * Completely separate from the production pdfProcessor.js pipeline.
 * Do NOT import this from any production function until out of beta.
 *
 * Cascade order (cheapest first):
 *   Level 1 — Exact cache (SHA-256 fingerprint)   → 0 AI calls
 *   Level 2 — Learned template (regex matching)   → 0 AI calls
 *   Level 3 — Classic parser (hand-written regex) → 0 AI calls
 *   Level 4 — Claude API + template learning      → 1-2 AI calls
 */

'use strict';

const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ────────────────────────────────────────────────────────────────

const TEMPLATE_MIN_CONFIDENCE = 0.6;
const CLASSIC_MIN_CONFIDENCE  = 0.75;
const AI_MAX_TEXT_CHARS       = 18000;
const CLAUDE_MODEL            = 'claude-haiku-4-5-20251001';

// ─── Supabase (service role — beta table is RLS-locked) ────────────────────

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

// ─── Text utilities ─────────────────────────────────────────────────────────

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function fingerprintText(text) {
  return crypto.createHash('sha256').update(normalizeText(text)).digest('hex');
}

function tokenizeForMatch(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
  );
}

// ─── Template store (Supabase) ──────────────────────────────────────────────

async function loadTemplates(docType) {
  const client = getServiceClient();
  // For 'auto', load all templates so we can detect the doc type from them
  let query = client.from('parsing_templates_beta').select('*');
  if (docType !== 'auto') {
    query = query.in('doc_type', [docType, 'any']);
  }
  const { data, error } = await query.order('usage_count', { ascending: false });

  if (error) {
    console.warn('[SmartParse] Failed to load templates:', error.message);
    // Return empty + error so caller can surface it
    return { templates: [], loadError: error.message };
  }
  return { templates: data || [], loadError: null };
}

async function saveTemplate(template) {
  const client = getServiceClient();
  const { error } = await client
    .from('parsing_templates_beta')
    .upsert(template, { onConflict: 'id' });

  // Throw so learnTemplate knows the save actually failed
  if (error) throw new Error(`Supabase save failed: ${error.message}`);
}

async function incrementTemplateUsage(id) {
  const client = getServiceClient();
  await client.rpc('increment_template_usage_beta', { template_id: id });
}

async function listTemplates() {
  const client = getServiceClient();
  const { data } = await client
    .from('parsing_templates_beta')
    .select('id, name, source, doc_type, usage_count, min_confidence, created_at, updated_at')
    .order('usage_count', { ascending: false });
  return data || [];
}

async function deleteTemplate(id) {
  const client = getServiceClient();
  await client.from('parsing_templates_beta').delete().eq('id', id);
}

// ─── Level 2: Template matching ─────────────────────────────────────────────

function evaluateTemplateMatch(template, tokenSet) {
  const matchRules  = template.match_rules || {};
  const allRequired = matchRules.all || [];
  const anyBonus    = matchRules.any || [];

  // All required keywords must be present
  if (allRequired.length > 0 && !allRequired.every(t => tokenSet.has(t.toLowerCase()))) {
    return 0;
  }

  let score = allRequired.length > 0 ? 0.6 : 0.3;

  if (anyBonus.length > 0) {
    const bonusCount = anyBonus.filter(t => tokenSet.has(t.toLowerCase())).length;
    score += 0.4 * (bonusCount / anyBonus.length);
  } else {
    score += 0.4;
  }

  return score;
}

function setNestedPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current)) current[key] = {};
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

function applyRules(rules, text) {
  const result = {};
  let hits = 0;

  for (const rule of rules || []) {
    try {
      const regex = new RegExp(rule.regex, rule.flags || 'im');
      const match = text.match(regex);
      const groupIndex = rule.group ?? 1;
      if (match && match[groupIndex] !== undefined) {
        const raw = match[groupIndex].trim();
        const value = rule.type === 'number' ? parseFloat(raw) : raw;
        setNestedPath(result, rule.path, value);
        hits++;
      }
    } catch (_) { /* skip invalid regex */ }
  }

  return { result, confidence: rules?.length ? hits / rules.length : 0 };
}

function applyCollections(collection, text) {
  try {
    const globalFlags = (collection.startFlags || 'gi').includes('g')
      ? collection.startFlags || 'gi'
      : (collection.startFlags || 'i') + 'g';
    const startRegex = new RegExp(collection.startRegex, globalFlags);

    const positions = [];
    let m;
    while ((m = startRegex.exec(text)) !== null) positions.push(m.index);

    const blocks = positions
      .map((pos, i) => text.slice(pos, positions[i + 1] ?? text.length))
      .map(block => applyRules(collection.fields, block).result)
      .filter(obj => Object.keys(obj).length > 0);

    if (collection.minItems && blocks.length < collection.minItems) return null;
    return blocks;
  } catch (_) {
    return null;
  }
}

function applyTemplate(template, text) {
  const { result, confidence } = applyRules(template.field_rules, text);

  for (const col of template.collections || []) {
    const items = applyCollections(col, text);
    if (items !== null) setNestedPath(result, col.path, items);
  }

  return { result, confidence };
}

// ─── Level 3: Classic parser ─────────────────────────────────────────────────

function parseClassicFlight(text) {
  let hits = 0;
  const fields = 5;
  const result = {};

  const ref = text.match(/(?:booking\s*ref(?:erence)?|pnr|record\s*locator|codice\s*prenot)[:\s]+([A-Z0-9]{5,8})/i);
  if (ref) { result.booking = { reference: ref[1] }; hits++; }

  const flight = text.match(/\b([A-Z]{2}\d{3,4})\b/);
  if (flight) { result.flights = [{ flightNumber: flight[1] }]; hits++; }

  const name = text.match(/(?:passenger|passeggero|nome)[:\s]+([A-Z][A-Z\s]{2,40}[A-Z])/i);
  if (name) { result.passenger = { name: name[1].trim() }; hits++; }

  const route = text.match(/\b([A-Z]{3})\s*(?:→|->|to|›)\s*([A-Z]{3})\b/i);
  if (route) {
    if (!result.flights) result.flights = [{}];
    result.flights[0].departure = { code: route[1] };
    result.flights[0].arrival   = { code: route[2] };
    hits++;
  }

  const date = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
  if (date) {
    if (!result.flights) result.flights = [{}];
    result.flights[0].date = date[1];
    hits++;
  }

  return { result, confidence: hits / fields };
}

function parseClassicHotel(text) {
  let hits = 0;
  const fields = 4;
  const result = {};

  const conf = text.match(/(?:confirm(?:ation)?|conferma|prenotazione)[^\n]*?#?\s*([A-Z0-9]{6,14})/i);
  if (conf) { result.hotels = [{ confirmationNumber: conf[1] }]; hits++; }

  const ci = text.match(/check[- ]?in[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (ci) {
    if (!result.hotels) result.hotels = [{}];
    result.hotels[0].checkIn = { date: ci[1] };
    hits++;
  }

  const co = text.match(/check[- ]?out[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (co) {
    if (!result.hotels) result.hotels = [{}];
    result.hotels[0].checkOut = { date: co[1] };
    hits++;
  }

  const hotelName = text.match(/(?:^|hotel[:\s]+)([A-Z][^\n]{3,50})/m);
  if (hotelName) {
    if (!result.hotels) result.hotels = [{}];
    result.hotels[0].name = hotelName[1].trim();
    hits++;
  }

  return { result, confidence: hits / fields };
}

function parseClassic(text, docType) {
  if (docType === 'flight') return parseClassicFlight(text);
  if (docType === 'hotel')  return parseClassicHotel(text);
  if (docType === 'auto') {
    const f = parseClassicFlight(text);
    const h = parseClassicHotel(text);
    if (f.confidence > 0 && f.confidence >= h.confidence) return { ...f, detectedDocType: 'flight' };
    if (h.confidence > 0) return { ...h, detectedDocType: 'hotel' };
    return { result: {}, confidence: 0, detectedDocType: null };
  }
  return { result: {}, confidence: 0 };
}

// ─── Prompt text optimizer ───────────────────────────────────────────────────

function buildPromptText(text, docType) {
  const FLIGHT_KW = ['passenger', 'booking', 'pnr', 'flight', 'departure', 'arrival',
    'seat', 'gate', 'terminal', 'airline', 'ticket', 'baggage', 'volo', 'passeggero',
    'partenza', 'arrivo', 'posto', 'compagnia', 'itinerary', 'boarding'];
  const HOTEL_KW  = ['hotel', 'check-in', 'check-out', 'room', 'guest', 'confirmation',
    'booking', 'reservation', 'nights', 'camera', 'ospite', 'conferma', 'prenotazione',
    'notti', 'property', 'accommodation'];

  const keywords = docType === 'hotel' ? HOTEL_KW : docType === 'flight' ? FLIGHT_KW : [...FLIGHT_KW, ...HOTEL_KW];

  const filtered = text.split('\n').filter(line => {
    const lower = line.toLowerCase();
    return keywords.some(kw => lower.includes(kw))
      || /\b[A-Z]{2}\d{3,4}\b/.test(line)
      || /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(line)
      || /\b\d{2}:\d{2}\b/.test(line);
  });

  return filtered.join('\n').substring(0, AI_MAX_TEXT_CHARS);
}

// ─── Level 4: Claude API ─────────────────────────────────────────────────────

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

/**
 * Call Claude to extract structured data from the PDF.
 * Also asks Claude to return the visible text (_rawText) so we can use it for template
 * generation — needed when pdf-parse can't decode the PDF fonts.
 * For docType='auto', also asks Claude to identify the document type (_docType).
 * Returns { result, claudeExtractedText, detectedDocType } — zero extra API calls.
 */
async function parseWithClaude(pdfBase64, docType) {
  const client = new Anthropic();

  let wrappedPrompt;
  if (docType === 'auto') {
    // Two clean examples — no mixed JSON structure that confuses Claude
    wrappedPrompt = `Detect if this document is a FLIGHT (boarding pass, e-ticket, itinerary) or HOTEL (accommodation booking, confirmation).

Set "_docType" to "flight" or "hotel". Include "_rawText" with ALL visible text. Then include only the fields for the detected type.

If FLIGHT, return this JSON structure:
{ "_rawText": "all visible text", "_docType": "flight", ${FLIGHT_SCHEMA.slice(1)}

If HOTEL, return this JSON structure:
{ "_rawText": "all visible text", "_docType": "hotel", ${HOTEL_SCHEMA.slice(1)}

Return ONLY valid JSON. No explanations or markdown.`;
  } else {
    const schema = docType === 'hotel' ? HOTEL_SCHEMA : FLIGHT_SCHEMA;
    // We wrap the schema in an outer object that includes _rawText.
    wrappedPrompt = `Extract travel data from this ${docType} document. Return ONLY valid JSON with this exact structure:
{
  "_rawText": "copy here ALL visible text from the document, preserving line breaks with \\n",
  ${schema.slice(1)}`; // replace leading '{' so fields merge into the wrapper
  }

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 6000,
    system: 'You are a travel document parser. Extract structured data and return ONLY valid JSON. No explanations or markdown.',
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: wrappedPrompt }
      ]
    }]
  });

  const raw = response.content[0]?.text || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Auto-mode fallback: if we can't find JSON, retry with explicit flight schema
    if (docType === 'auto') {
      console.warn('[SmartParse] Auto prompt returned no JSON — retrying with explicit flight schema');
      return parseWithClaude(pdfBase64, 'flight');
    }
    throw new Error(`No JSON in Claude response. Raw: ${raw.substring(0, 300)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    // Auto-mode fallback: retry with explicit flight schema
    if (docType === 'auto') {
      console.warn('[SmartParse] Auto prompt JSON parse failed — retrying with explicit flight schema');
      return parseWithClaude(pdfBase64, 'flight');
    }
    throw new Error(`JSON parse failed: ${parseErr.message}. Raw snippet: ${jsonMatch[0].substring(0, 300)}`);
  }
  const { _rawText, _docType, ...result } = parsed;

  const claudeExtractedText = typeof _rawText === 'string' ? _rawText : '';
  const detectedDocType = typeof _docType === 'string' && ['flight', 'hotel'].includes(_docType) ? _docType : null;
  console.log(`[SmartParse] Claude extracted text: ${claudeExtractedText.length} chars, detectedDocType: ${detectedDocType}`);

  return { result, claudeExtractedText, detectedDocType };
}

// ─── Template generation ─────────────────────────────────────────────────────

async function buildTemplateWithClaude(extractedText, result, docType) {
  const client = new Anthropic();

  const prompt = `Given this sample ${docType} document text and its correctly extracted JSON, generate a regex template so similar documents can be parsed without AI.

Sample text (first 3000 chars):
${extractedText.substring(0, 3000)}

Correctly extracted JSON:
${JSON.stringify(result, null, 2)}

Generate a JSON template with this exact structure:
{
  "name": "Provider Document Type (e.g., Ryanair boarding pass)",
  "match_rules": {
    "all": ["word1", "word2"],
    "any": ["word3", "word4", "word5", "word6"]
  },
  "field_rules": [
    {"path": "booking.reference", "regex": "pattern", "flags": "im", "group": 1, "type": "string"}
  ],
  "collections": [
    {"path": "flights", "startRegex": "pattern", "startFlags": "gi", "minItems": 1,
     "fields": [{"path": "flightNumber", "regex": "pattern", "flags": "im", "group": 1, "type": "string"}]}
  ]
}

Rules:
- match_rules.all: 2-4 unique words that MUST appear in every document of this type
- match_rules.any: 5-8 words likely present (bonus scoring)
- field_rules: regex for scalar values; use named groups via "group" index
- collections: for repeating elements (flights array); use empty array [] if none
- Make patterns robust, case-insensitive where useful

Return ONLY the JSON, no other text.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = response.content[0]?.text || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in template response');
  return JSON.parse(jsonMatch[0]);
}

function buildHeuristicTemplate(extractedText, docType) {
  const words = extractedText.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);

  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const top = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([w]) => w);

  return {
    name: `Auto-heuristic (${docType})`,
    match_rules: { all: top.slice(0, 3), any: top.slice(3, 9) },
    field_rules: [],
    collections: []
  };
}

async function learnTemplate(extractedText, result, docType, fingerprint, hasText) {
  let templateCallUsedClaude = false;
  let tplData;

  if (hasText) {
    // Full template with regex rules (enables Levels 1+2)
    try {
      tplData = await buildTemplateWithClaude(extractedText, result, docType);
      templateCallUsedClaude = true;
    } catch (err) {
      console.warn('[SmartParse] Template AI call failed, using heuristic:', err.message);
      tplData = buildHeuristicTemplate(extractedText, docType);
    }
  } else {
    // No text extracted — save a fingerprint-only entry (enables Level 1 cache only)
    console.warn('[SmartParse] No text extracted — saving fingerprint-only template (Level 1 cache only)');
    tplData = { name: `Fingerprint-only (${docType})`, match_rules: {}, field_rules: [], collections: [] };
  }

  const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

  try {
    await saveTemplate({
      id,
      name:                    tplData.name || `Auto (${docType})`,
      source:                  hasText ? (tplData.field_rules?.length ? 'ai' : 'heuristic') : 'fingerprint',
      doc_type:                docType,
      match_rules:             tplData.match_rules   || {},
      field_rules:             tplData.field_rules   || [],
      collections:             tplData.collections   || [],
      min_confidence:          TEMPLATE_MIN_CONFIDENCE,
      usage_count:             1,
      last_sample_fingerprint: fingerprint,
      last_sample_result:      result
    });

    console.log('[SmartParse] Template saved:', id, `(${hasText ? 'full' : 'fingerprint-only'})`);
    return { id, templateName: tplData.name, templateCallUsedClaude, templateSaved: true, templateSaveError: null };
  } catch (err) {
    console.warn('[SmartParse] Template save failed:', err.message);
    return { id: null, templateName: tplData.name, templateCallUsedClaude, templateSaved: false, templateSaveError: err.message };
  }
}

// ─── Main orchestrator ───────────────────────────────────────────────────────

/**
 * Parse a base64 PDF using the 4-level cascade.
 *
 * @param {string} pdfBase64 - base64-encoded PDF
 * @param {'flight'|'hotel'|'auto'} docType - 'auto' = detect from content
 * @param {'auto'|'ai'|'classic'} mode - 'auto' = full cascade; 'ai' = force Claude; 'classic' = levels 1-3 only
 * @returns {Promise<object>} { result, parseLevel, durationMs, textLength, detectedDocType, ... }
 */
async function parseDocumentSmart(pdfBase64, docType, mode = 'auto') {
  const t0 = Date.now();

  // --- Extract text (pdf-parse) ---
  const extractedText   = await extractTextFromPdf(pdfBase64);
  const hasText         = extractedText.length > 80;
  // Fingerprint from pdf-parse text (if available) or first 1000 chars of base64 as fallback.
  // Note: when pdf-parse fails we'll re-fingerprint after Claude returns its text.
  const fingerprint     = hasText ? fingerprintText(extractedText) : fingerprintText(pdfBase64.slice(0, 1000));

  const meta = () => ({ durationMs: Date.now() - t0, textLength: extractedText.length });

  // ─ Force AI mode ──────────────────────────────────────────────────────────
  if (mode === 'ai') {
    const { result, claudeExtractedText, detectedDocType } = await parseWithClaude(pdfBase64, docType);
    const actualDocType   = detectedDocType || (docType !== 'auto' ? docType : 'flight');
    const textForTemplate = extractedText.length > 80 ? extractedText : claudeExtractedText;
    // Use the stable base64 fingerprint so Level 1 lookup can find this template next time
    const learn = await learnTemplate(textForTemplate, result, actualDocType, fingerprint, textForTemplate.length > 80);
    const claudeCalls = 1 + (learn.templateCallUsedClaude ? 1 : 0);
    return { result, parseLevel: 4, learnedTemplateId: learn.id, learnedTemplateName: learn.templateName,
      templateSaved: learn.templateSaved, templateSaveError: learn.templateSaveError,
      claudeCalls, detectedDocType, ...meta() };
  }

  // ─ Template-based levels (1 + 2) ─────────────────────────────────────────
  let dbLoadError = null;
  if (mode !== 'classic') {
    const { templates, loadError } = await loadTemplates(docType);
    dbLoadError = loadError;

    if (!loadError) {
      // Level 1 — Exact cache (match by fingerprint)
      const cached = templates.find(t => t.last_sample_fingerprint === fingerprint && t.last_sample_result);
      if (cached) {
        await incrementTemplateUsage(cached.id).catch(() => {});
        return {
          result:          cached.last_sample_result,
          parseLevel:      1,
          templateId:      cached.id,
          templateName:    cached.name,
          detectedDocType: cached.doc_type !== 'any' ? cached.doc_type : null,
          claudeCalls:     0,
          ...meta()
        };
      }

      // Level 2 — Best template match
      if (hasText) {
        const tokenSet = tokenizeForMatch(extractedText);
        let bestTpl = null, bestScore = 0;
        for (const tpl of templates) {
          const score = evaluateTemplateMatch(tpl, tokenSet);
          if (score > bestScore) { bestScore = score; bestTpl = tpl; }
        }

        if (bestTpl && bestScore > 0.3) {
          const { result, confidence: appConf } = applyTemplate(bestTpl, extractedText);
          const finalConf = 0.5 * bestScore + 0.5 * appConf;

          if (finalConf >= (bestTpl.min_confidence ?? TEMPLATE_MIN_CONFIDENCE)) {
            await incrementTemplateUsage(bestTpl.id).catch(() => {});
            return {
              result,
              parseLevel:      2,
              templateId:      bestTpl.id,
              templateName:    bestTpl.name,
              detectedDocType: bestTpl.doc_type !== 'any' ? bestTpl.doc_type : null,
              matchScore:      bestScore,
              applyConfidence: appConf,
              finalConfidence: finalConf,
              claudeCalls:     0,
              ...meta()
            };
          }
        }
      }
    }
  }

  // ─ Level 3 — Classic parser ───────────────────────────────────────────────
  if (hasText) {
    const classicResult = parseClassic(extractedText, docType);
    const hasMain = classicResult.result.flights?.length > 0 || classicResult.result.hotels?.length > 0;

    if (classicResult.confidence >= CLASSIC_MIN_CONFIDENCE && hasMain) {
      return {
        result:          classicResult.result,
        parseLevel:      3,
        classicConfidence: classicResult.confidence,
        detectedDocType: classicResult.detectedDocType || null,
        claudeCalls:     0,
        ...meta()
      };
    }
  }

  // ─ Level 4 — Claude API ───────────────────────────────────────────────────
  if (mode === 'classic') {
    const classicResult = parseClassic(extractedText, docType);
    return {
      result:          classicResult.result,
      parseLevel:      3,
      classicConfidence: 0,
      detectedDocType: classicResult.detectedDocType || null,
      skippedAI:       true,
      claudeCalls:     0,
      ...meta()
    };
  }

  const { result, claudeExtractedText, detectedDocType } = await parseWithClaude(pdfBase64, docType);
  const actualDocType   = detectedDocType || (docType !== 'auto' ? docType : 'flight');
  // Prefer pdf-parse text; fall back to Claude's own text extraction
  const textForTemplate = extractedText.length > 80 ? extractedText : claudeExtractedText;
  const actualHasText   = textForTemplate.length > 80;
  // Always use the base64 fingerprint for Level 1 cache — it's the same at save and lookup time.
  // (Using Claude-text fingerprint would cause a mismatch since lookup can't recompute it.)
  const learn = await learnTemplate(textForTemplate, result, actualDocType, fingerprint, actualHasText);
  const claudeCalls = 1 + (learn.templateCallUsedClaude ? 1 : 0);
  return {
    result, parseLevel: 4,
    learnedTemplateId:   learn.id,
    learnedTemplateName: learn.templateName,
    templateSaved:       learn.templateSaved,
    templateSaveError:   learn.templateSaveError,
    dbLoadError,
    claudeCalls,
    detectedDocType,
    ...meta()
  };
}

module.exports = {
  parseDocumentSmart,
  listTemplates,
  deleteTemplate
};
