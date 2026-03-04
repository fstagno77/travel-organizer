/**
 * L2 Template Extractor — Anchor-based extraction + clone fallback
 *
 * After Claude processes the first PDF from a provider, this module:
 * 1. Builds an "extraction map" that ties each field value to its text anchor
 * 2. For subsequent PDFs of the same provider, applies the map to extract data
 * 3. Falls back to clone (copy from template) for fields that can't be anchor-extracted
 * 4. Validates 100% mandatory fields — if any missing, returns null (triggers L4 fallback)
 */

'use strict';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Collapse spaced-out PDF text: "Ta i t o   Wa r d ,   To k yo" → "Taito Ward, Tokyo"
 * Common in Booking.com PDFs where characters are individually positioned.
 */
function collapseSpacedText(text) {
  // Remove single spaces between single non-space chars (spaced-out PDF rendering)
  let result = '';
  for (let i = 0; i < text.length; i++) {
    if (i + 2 < text.length && text[i] !== ' ' && text[i + 1] === ' ' && text[i + 2] !== ' ' && text[i + 2] !== ',') {
      result += text[i];
      i++; // skip the space
    } else {
      result += text[i];
    }
  }
  return result.replace(/\s{2,}/g, ' ').replace(/\s,/g, ',').trim();
}

// ─── Brand Detection ────────────────────────────────────────────────────────

const BRAND_RULES = [
  // Order matters: more specific patterns first
  { brand: 'ita-airways', test: t => t.includes('itaairways') || t.includes('ita airways') ||
      (t.includes('ricevuta') && t.includes('biglietto') && t.includes('elettronico')) },
  { brand: 'ryanair', test: t => t.includes('ryanair') },
  { brand: 'easyjet', test: t => t.includes('easyjet') },
  { brand: 'vueling', test: t => t.includes('vueling') },
  { brand: 'wizz-air', test: t => t.includes('wizz') && t.includes('air') },
  { brand: 'trenitalia', test: t => t.includes('trenitalia') &&
      (t.includes('pnr') || t.includes('biglietto') || t.includes('stazione di partenza')) },
  { brand: 'italo', test: t => (t.includes('italo') || t.includes('ntv')) &&
      (t.includes('biglietto') || t.includes('stazione') || t.includes('treno')) },
  { brand: 'booking.com', test: t => t.includes('booking.com') &&
      (t.includes('numero di conferma') || t.includes('conferma della prenotazione') ||
       t.includes('confirmation number') || t.includes('booking confirmation')) },
  { brand: 'expedia', test: t => t.includes('expedia') },
  { brand: 'airbnb', test: t => t.includes('airbnb') },
  { brand: 'hotels.com', test: t => t.includes('hotels.com') },
];

function detectBrand(text) {
  const t = text.toLowerCase();
  for (const rule of BRAND_RULES) {
    if (rule.test(t)) return rule.brand;
  }
  return null;
}

// ─── Mandatory Fields ────────────────────────────────────────────────────────

const MANDATORY = {
  flight: [
    'flightNumber', 'date', 'departureTime', 'arrivalTime',
    'departure.code', 'departure.city', 'arrival.code', 'arrival.city',
    'passenger.name', 'bookingReference'
  ],
  hotel: [
    'name', 'checkIn.date', 'checkOut.date', 'confirmationNumber',
    'address.city', 'address.fullAddress'
  ],
  train: [
    'trainNumber', 'date', 'departure.station', 'departure.city',
    'departure.time', 'arrival.station', 'arrival.city', 'arrival.time',
    'bookingReference'
  ]
};

// ─── Utility: nested field access ───────────────────────────────────────────

function getNestedField(obj, dotPath) {
  return dotPath.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedField(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ─── Flatten a Claude result into {path, value} pairs ───────────────────────

function flattenResult(result, docType) {
  const pairs = [];

  if (docType === 'flight' || result.flights?.length) {
    const flights = result.flights || [];
    for (let fi = 0; fi < flights.length; fi++) {
      flattenObject(flights[fi], `flights.${fi}`, pairs);
    }
    // Top-level passenger and booking
    if (result.passenger) flattenObject(result.passenger, 'passenger', pairs);
    if (result.booking) flattenObject(result.booking, 'booking', pairs);
  }

  if (docType === 'hotel' || result.hotels?.length) {
    const hotels = result.hotels || [];
    for (let hi = 0; hi < hotels.length; hi++) {
      flattenObject(hotels[hi], `hotels.${hi}`, pairs);
    }
  }

  if (docType === 'train' || result.trains?.length) {
    const trains = result.trains || [];
    for (let ti = 0; ti < trains.length; ti++) {
      flattenObject(trains[ti], `trains.${ti}`, pairs);
    }
    if (result.passenger) flattenObject(result.passenger, 'passenger', pairs);
  }

  return pairs;
}

function flattenObject(obj, prefix, pairs) {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && val !== undefined && typeof val !== 'object') {
      pairs.push({ path, value: val });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      flattenObject(val, path, pairs);
    }
  }
}

// ─── Build Extraction Map ───────────────────────────────────────────────────

/**
 * After Claude extraction, locate each field value in the extracted text
 * and record the anchor (label) + extraction strategy.
 */
function buildExtractionMap(extractedText, claudeResult, docType) {
  const lines = extractedText.split('\n');
  const map = [];
  const fields = flattenResult(claudeResult, docType);

  for (const { path, value } of fields) {
    if (value == null) continue;
    const strVal = String(value).trim();
    if (strVal.length < 1) continue;

    const location = locateValueInText(lines, strVal, path);
    if (location) {
      map.push({ fieldPath: path, ...location, sampleValue: strVal });
    }
  }

  return map;
}

/**
 * Find where a value appears in the text and what label precedes it.
 */
function locateValueInText(lines, value, fieldPath) {
  // Strategy 1: Exact or partial match on a line with "Label: value"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if value appears on this line
    const valIdx = trimmed.indexOf(value);
    if (valIdx < 0) {
      // Try case-insensitive for names
      const valIdxI = trimmed.toLowerCase().indexOf(value.toLowerCase());
      if (valIdxI < 0) continue;
    }

    // Found the value — what's the anchor?
    const before = trimmed.substring(0, trimmed.indexOf(value)).trim();

    // Label:value pattern (most common)
    if (before.endsWith(':')) {
      return {
        anchor: before.slice(0, -1).trim(),
        strategy: 'label-colon',
        lineIndex: i
      };
    }

    // Label followed by spaces/tabs then value
    const labelMatch = before.match(/([a-zA-ZÀ-ú/()]+[\s]*?)$/);
    if (labelMatch && labelMatch[1].trim().length > 2) {
      return {
        anchor: labelMatch[1].trim(),
        strategy: 'label-space',
        lineIndex: i
      };
    }

    // No clear label — record position only
    return {
      anchor: null,
      strategy: 'position',
      lineIndex: i
    };
  }

  // Strategy 2: Value on next line after a label
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === value || trimmed.includes(value)) {
      const prevTrimmed = lines[i - 1].trim();
      if (prevTrimmed && /[a-zA-ZÀ-ú]/.test(prevTrimmed) && prevTrimmed.length < 60) {
        return {
          anchor: prevTrimmed.replace(/:?\s*$/, ''),
          strategy: 'label-next-line',
          lineIndex: i
        };
      }
    }
  }

  // Strategy 3: For dates in various formats (YYYY-MM-DD ↔ DDMmmYYYY)
  if (fieldPath && fieldPath.includes('date') && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Claude returned ISO format — look for the original date in text
    const [y, m, d] = value.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = months[parseInt(m, 10) - 1];
    const textDate = `${parseInt(d, 10)}${monthName}${y}`;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(textDate)) {
        return {
          anchor: null,
          strategy: 'date-pattern',
          lineIndex: i,
          dateFormat: 'DMmmYYYY'
        };
      }
    }
  }

  return null;
}

// ─── Apply Extraction Map ───────────────────────────────────────────────────

/**
 * Apply the extraction map to a new document's text.
 * Returns a partial result object with whatever fields could be extracted.
 */
function applyExtractionMap(map, newText) {
  const lines = newText.split('\n');
  const result = {};
  let extractedCount = 0;

  for (const rule of map) {
    const value = extractByRule(lines, rule);
    if (value != null && String(value).trim() !== '') {
      setNestedFieldForResult(result, rule.fieldPath, value);
      extractedCount++;
    }
  }

  return { result, extractedCount, totalRules: map.length };
}

function extractByRule(lines, rule) {
  if (!rule.anchor && rule.strategy === 'position') {
    // Position-based: take from same line index (fragile, lowest priority)
    const line = lines[rule.lineIndex]?.trim();
    return line || null;
  }

  if (rule.strategy === 'date-pattern') {
    // Find a date pattern near the expected line
    const searchStart = Math.max(0, rule.lineIndex - 5);
    const searchEnd = Math.min(lines.length, rule.lineIndex + 5);
    for (let i = searchStart; i < searchEnd; i++) {
      const match = lines[i].match(/(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{4})/i);
      if (match) {
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                         jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const d = match[1].padStart(2, '0');
        const m = months[match[2].toLowerCase()];
        const y = match[3];
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  }

  if (!rule.anchor) return null;

  const anchorLower = rule.anchor.toLowerCase();

  // Find the anchor in the text
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if (!lineLower.includes(anchorLower)) continue;

    if (rule.strategy === 'label-colon') {
      // Take everything after the colon on this line
      const colonIdx = lines[i].indexOf(':');
      if (colonIdx >= 0) {
        const val = lines[i].substring(colonIdx + 1).trim();
        if (val.length > 0) return val;
      }
    }

    if (rule.strategy === 'label-space') {
      // Take everything after the anchor text
      const anchorIdx = lineLower.indexOf(anchorLower);
      if (anchorIdx >= 0) {
        const val = lines[i].substring(anchorIdx + rule.anchor.length).trim();
        if (val.length > 0) return val;
      }
    }

    if (rule.strategy === 'label-next-line') {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && nextLine.length > 0) return nextLine;
    }
  }

  return null;
}

/**
 * Set a field in the result, handling flights.0.xxx → flights[0].xxx structure
 */
function setNestedFieldForResult(result, fieldPath, value) {
  const parts = fieldPath.split('.');
  let cur = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Check if next part is a number (array index)
    const nextPart = parts[i + 1];
    if (/^\d+$/.test(nextPart)) {
      if (!Array.isArray(cur[part])) cur[part] = [];
      const idx = parseInt(nextPart, 10);
      while (cur[part].length <= idx) cur[part].push({});
      cur = cur[part][idx];
      i++; // skip the index part
    } else {
      if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {};
      cur = cur[part];
    }
  }

  cur[parts[parts.length - 1]] = value;
}

// ─── Clone Fallback ─────────────────────────────────────────────────────────

/**
 * For fields that extraction couldn't find, try to clone from the template's result
 * IF the surrounding text is unchanged (= same structural content).
 *
 * This handles the ITA Airways case: same itinerary, different passengers.
 * Flight data (airports, times, numbers) is identical — just clone it.
 */
function cloneMissingFields(partialResult, templateResult, docType, newText, sampleText) {
  const result = JSON.parse(JSON.stringify(partialResult));

  if (docType === 'flight' || templateResult.flights?.length) {
    // Clone entire flights array if text similarity is high
    if (!result.flights?.length && templateResult.flights?.length) {
      const similarity = computeTextSimilarity(sampleText, newText);
      if (similarity > 0.90) {
        result.flights = JSON.parse(JSON.stringify(templateResult.flights));
      }
    }

    // Clone booking reference if missing
    if (!result.booking?.reference && templateResult.booking?.reference) {
      // PNR/booking ref might be different — only clone if found in new text
      const ref = templateResult.booking.reference;
      if (newText.includes(ref)) {
        if (!result.booking) result.booking = {};
        result.booking.reference = ref;
      }
    }

    // Clone flight-level fields from template for each existing flight
    if (result.flights?.length && templateResult.flights?.length) {
      for (let fi = 0; fi < result.flights.length && fi < templateResult.flights.length; fi++) {
        const flight = result.flights[fi];
        const tplFlight = templateResult.flights[fi];

        // Copy missing flight fields if text is similar
        for (const key of Object.keys(tplFlight)) {
          if (key === 'passenger' || key === 'bookingReference') continue; // personal fields — don't clone
          if (flight[key] == null || (typeof flight[key] === 'object' && Object.keys(flight[key]).length === 0)) {
            flight[key] = JSON.parse(JSON.stringify(tplFlight[key]));
          }
        }
      }
    }
  }

  if (docType === 'hotel' || templateResult.hotels?.length) {
    // Hotels: DON'T clone content fields (each hotel is different)
    // But clone structural fields like roomTypes structure if applicable
    // Generally, for hotels each value is unique — extraction map should handle it
  }

  return result;
}

/**
 * Compute text similarity (0-1) by comparing non-empty lines.
 * High similarity = same itinerary (for flights).
 */
function computeTextSimilarity(textA, textB) {
  const linesA = textA.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const linesB = textB.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const setB = new Set(linesB);
  let matches = 0;
  for (const line of linesA) {
    if (setB.has(line)) matches++;
  }
  return matches / Math.max(linesA.length, 1);
}

// ─── Booking.com Specific Extraction ────────────────────────────────────────

/**
 * Specialized extractor for Booking.com hotel confirmations.
 * Uses known label patterns that are consistent across all Booking.com PDFs.
 */
function extractBookingComHotel(text) {
  const lines = text.split('\n');
  const hotel = {};

  // Hotel name: first substantial non-empty line
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 3 && !t.match(/^(booking|conferma|confirmation)/i)) {
      hotel.name = t.replace(/\s*\(.*$/, '').trim(); // Remove Japanese/parenthetical
      break;
    }
  }

  // Address: after "Indirizzo:"
  for (let i = 0; i < lines.length; i++) {
    if (/indirizzo\s*:/i.test(lines[i])) {
      let addr = lines[i].replace(/.*indirizzo\s*:\s*/i, '').trim();
      // Address may span multiple lines — stop at phone, GPS, Japanese, or section headers
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        let next = lines[j].trim();
        if (!next || /telefono|coordinate|gps|il tuo/i.test(next)) break;
        if (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(next)) break; // Japanese/Chinese chars
        // Always try to collapse spaced-out PDF text: "To k yo" → "Tokyo"
        next = collapseSpacedText(next);
        addr += ', ' + next;
      }
      hotel.address = { fullAddress: addr };
      // Extract city: find the part just BEFORE the postal code (digit-starting part)
      const parts = addr.split(',').map(p => p.trim()).filter(p => p.length > 0);
      for (let pi = 1; pi < parts.length; pi++) {
        if (/^\d/.test(parts[pi])) {
          // Found postal code — city is the previous non-Ward part
          for (let ci = pi - 1; ci >= 1; ci--) {
            const c = parts[ci];
            if (/ward/i.test(c)) continue;
            if (/^\d/.test(c) || c.length < 3) continue;
            hotel.address.city = c;
            break;
          }
          break;
        }
      }
      // Fallback: if no postal code found, look for known city patterns
      if (!hotel.address.city) {
        const COUNTRIES = /stati uniti|giappone|italia|japan|italy|united states|france|uk/i;
        for (let pi = parts.length - 2; pi >= 1; pi--) {
          const p = parts[pi];
          if (COUNTRIES.test(p) || /^\d/.test(p) || /ward/i.test(p)) continue;
          if (p.length >= 3 && /^[A-ZÀ-ú]/.test(p)) {
            hotel.address.city = p;
            break;
          }
        }
      }
      break;
    }
  }

  // Confirmation number: "NUMERO DI CONFERMA:" or "CONFIRMATION NUMBER:"
  for (const line of lines) {
    const m = line.match(/(?:numero di conferma|confirmation number)\s*:\s*(.+)/i);
    if (m) {
      hotel.confirmationNumber = m[1].trim();
      break;
    }
  }

  // Check-in date: "ARRIVO" section with day/month pattern
  const arrivo = findDateBlock(lines, /^ARRIVO$/i);
  if (arrivo) {
    hotel.checkIn = { date: arrivo.date };
    const timeMatch = findNearbyText(lines, arrivo.lineIndex, /dalle ore\s*(\d{1,2}:\d{2})/i);
    if (timeMatch) hotel.checkIn.time = timeMatch;
  }

  // Check-out date: "PARTENZA" section
  const partenza = findDateBlock(lines, /^PARTENZA$/i);
  if (partenza) {
    hotel.checkOut = { date: partenza.date };
    const timeMatch = findNearbyText(lines, partenza.lineIndex, /fino alle ore\s*(\d{1,2}:\d{2})/i);
    if (timeMatch) hotel.checkOut.time = timeMatch;
  }

  // Guest name
  for (const line of lines) {
    const m = line.match(/nome dell['']ospite\s*:\s*(.+)/i);
    if (m) {
      hotel.guestName = m[1].trim();
      break;
    }
  }

  // Room type
  for (const line of lines) {
    const t = line.trim();
    if (t.match(/^Camera\s/i) && t.length < 80) {
      hotel.roomTypes = [{ it: t, en: t }];
      break;
    }
  }

  // Nights: calculate from dates
  if (hotel.checkIn?.date && hotel.checkOut?.date) {
    const ci = new Date(hotel.checkIn.date);
    const co = new Date(hotel.checkOut.date);
    if (!isNaN(ci) && !isNaN(co)) {
      hotel.nights = Math.round((co - ci) / (1000 * 60 * 60 * 24));
    }
  }

  // Price: look for "Prezzo finale" or total amount
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(?:circa\s*)?[€]\s*([\d.,]+)/);
    if (m && lines.slice(Math.max(0, i - 3), i + 1).some(l => /prezzo|price|total/i.test(l))) {
      const val = parseFloat(m[1].replace('.', '').replace(',', '.'));
      if (!isNaN(val)) {
        hotel.price = { total: { value: val, currency: 'EUR' } };
      }
      break;
    }
  }

  return Object.keys(hotel).length > 0 ? hotel : null;
}

/**
 * Find a date block after a header like ARRIVO/PARTENZA.
 * Booking.com format: ARRIVO\n16\nGIUGNO\nmartedì\ndalle ore 15:00
 */
function findDateBlock(lines, headerPattern) {
  const MONTHS_IT = {
    'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
    'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
    'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12'
  };

  for (let i = 0; i < lines.length; i++) {
    if (!headerPattern.test(lines[i].trim())) continue;

    // Look ahead for day number + month name
    let day = null, month = null, year = null;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const t = lines[j].trim().toLowerCase();
      if (!day && /^\d{1,2}$/.test(t)) {
        day = t.padStart(2, '0');
      }
      if (!month) {
        for (const [name, num] of Object.entries(MONTHS_IT)) {
          if (t === name || t.includes(name)) { month = num; break; }
        }
      }
    }

    if (day && month) {
      // Year: assume current year or next year based on month
      year = new Date().getFullYear().toString();
      return { date: `${year}-${month}-${day}`, lineIndex: i };
    }
  }
  return null;
}

function findNearbyText(lines, startIdx, pattern) {
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const m = lines[i].match(pattern);
    if (m) return m[1];
  }
  return null;
}

// ─── ITA Airways Specific Extraction ────────────────────────────────────────

/**
 * Extract passenger-specific fields from ITA Airways receipts.
 * Flight data is cloned from template (same itinerary).
 */
function extractITAPassengerFields(text) {
  const result = {};

  // Passenger name: "Passeggero/Passenger:BrignoneAgata(ADT)"
  const passengerMatch = text.match(/Passeggero\/Passenger\s*:\s*([^(]+)\s*\(/i) ||
                          text.match(/Passenger\s*:\s*([^(]+)\s*\(/i);
  if (passengerMatch) {
    let name = passengerMatch[1].trim();
    // Split CamelCase: "BrignoneAgata" → "Brignone Agata"
    name = name.replace(/([a-zà-ú])([A-ZÀ-Ú])/g, '$1 $2');
    // Also handle all-caps: "STAGNO D ALCONTRES FERDINANDO" → keep as-is
    result.passenger = { name };
  }

  // Booking reference: "Riferimentoprenotazione/Bookingref:YPPN5D"
  const pnrMatch = text.match(/Bookingref\s*:\s*([A-Z0-9]+)/i) ||
                   text.match(/Riferimentoprenotazione\s*[/:]\s*([A-Z0-9]+)/i);
  if (pnrMatch) {
    result.booking = { reference: pnrMatch[1].trim() };
  }

  // Ticket number: "NumeroBiglietto/Ticketnumber:0552112363829"
  const ticketMatch = text.match(/Ticketnumber\s*:\s*(\d+)/i) ||
                      text.match(/NumeroBiglietto\s*[/:]\s*(\d+)/i);
  if (ticketMatch) {
    if (!result.passenger) result.passenger = {};
    result.passenger.ticketNumber = ticketMatch[1].trim();
    if (!result.booking) result.booking = {};
    result.booking.ticketNumber = ticketMatch[1].trim();
  }

  // Passenger type: (ADT), (CHD), (INF)
  const typeMatch = text.match(/Passeggero\/Passenger\s*:[^(]*\((\w+)\)/i);
  if (typeMatch && result.passenger) {
    result.passenger.type = typeMatch[1].trim();
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ─── Trenitalia Specific Extraction ──────────────────────────────────────────

/**
 * Estrattore specifico per biglietti Trenitalia.
 * I PDF Trenitalia hanno pagine ripetute (una per passeggero),
 * quindi de-duplichiamo i treni basandoci su trainNumber+date.
 */
function extractTrenitaliaTrain(text) {
  const lines = text.split('\n');
  const trains = [];
  const passengers = [];
  let pnr = null;
  let ticketNumber = null;
  let totalPrice = null;

  // PNR: "PNR: ACQGSN"
  const pnrMatch = text.match(/PNR\s*:\s*([A-Z0-9]+)/i);
  if (pnrMatch) pnr = pnrMatch[1].trim();

  // Numero Titolo: "Numero Titolo: 2469297815"
  const ticketMatch = text.match(/Numero\s+Titolo\s*:\s*(\d+)/i);
  if (ticketMatch) ticketNumber = ticketMatch[1].trim();

  // Estrai blocchi treno: cerca "Stazione di Partenza" → stazione → orario+data → "Stazione di Arrivo" → ...
  for (let i = 0; i < lines.length; i++) {
    if (!/^Stazione di Partenza\s*$/i.test(lines[i].trim())) continue;

    const train = { operator: 'Trenitalia' };

    // Stazione di partenza: riga successiva non vuota
    let depStation = null;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const t = lines[j].trim();
      if (t.length > 2 && !/^Ore\s/i.test(t)) { depStation = t; break; }
    }
    if (depStation) {
      train.departure = { station: depStation, city: depStation.split(/\s+(Centrale|Termini|Porta|P\.)/)[0] || depStation };
    }

    // Orario partenza + data: "Ore 12:02 - 21/04/2025"
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const m = lines[j].match(/Ore\s+(\d{1,2}:\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/i);
      if (m) {
        if (train.departure) train.departure.time = m[1];
        train.date = `${m[4]}-${m[3]}-${m[2]}`;
        break;
      }
    }

    // Stazione di arrivo: cerca "Stazione di Arrivo" dopo la partenza
    for (let j = i + 3; j < Math.min(i + 12, lines.length); j++) {
      if (!/^Stazione di Arrivo\s*$/i.test(lines[j].trim())) continue;
      // Stazione arrivo: riga successiva non vuota
      for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
        const t = lines[k].trim();
        if (t.length > 2 && !/^Ore\s/i.test(t)) {
          train.arrival = { station: t, city: t.split(/\s+(Centrale|Termini|Porta|P\.)/)[0] || t };
          break;
        }
      }
      // Orario arrivo: "Ore 13:06 - 21/04/2025"
      for (let k = j + 1; k < Math.min(j + 6, lines.length); k++) {
        const m = lines[k].match(/Ore\s+(\d{1,2}:\d{2})\s*-\s*\d{2}\/\d{2}\/\d{4}/i);
        if (m) {
          if (train.arrival) train.arrival.time = m[1];
          break;
        }
      }
      break;
    }

    // Treno: "Treno: Frecciarossa 9516" o "Treno:  Frecciarossa 9519"
    for (let j = i + 6; j < Math.min(i + 18, lines.length); j++) {
      const m = lines[j].match(/Treno\s*:\s*(.+)/i);
      if (m) {
        const trainInfo = m[1].trim();
        train.trainNumber = trainInfo;
        // Estrai tipo servizio dalla riga successiva "Servizio: 2° Premium"
        for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
          const svc = lines[k].match(/Servizio\s*:\s*(.+)/i);
          if (svc) { train.class = svc[1].trim(); break; }
        }
        // Carrozza e Posti
        for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
          const carr = lines[k].match(/Carrozza\s*:\s*(.+)/i);
          if (carr) train.coach = carr[1].trim();
          const posti = lines[k].match(/Posti\s*:\s*(.+)/i);
          if (posti) train.seat = posti[1].trim();
        }
        break;
      }
    }

    // Importo: "Importo totale* 115.80 €" o "Importo totale*: 99.00 €"
    for (let j = i + 10; j < Math.min(i + 22, lines.length); j++) {
      const m = lines[j].match(/Importo\s+totale\*?\s*:?\s*([\d.,]+)\s*€/i);
      if (m) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(val)) train.price = { value: val, currency: 'EUR' };
        break;
      }
    }

    if (pnr) train.bookingReference = pnr;
    if (ticketNumber) train.ticketNumber = ticketNumber;

    // De-duplica: stesso treno se trainNumber + date coincidono
    if (train.trainNumber && train.date) {
      const key = `${train.trainNumber}|${train.date}`;
      if (!trains.some(t => `${t.trainNumber}|${t.date}` === key)) {
        trains.push(train);
      }
    }
  }

  // Passeggeri: "Nome Passeggero (Adulto)\nNOME COGNOME" — de-duplica per nome
  const seenPassengers = new Set();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^Nome\s+Passeggero\s*\(([^)]+)\)\s*$/i);
    if (!m) continue;
    const type = m[1].trim();
    // Nome: righe successive non vuote fino a "Dati di contatto"
    let name = '';
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const t = lines[j].trim();
      if (!t || /^Dati di contatto/i.test(t) || /^Offerta/i.test(t)) break;
      name += (name ? ' ' : '') + t;
    }
    name = name.trim();
    if (name && !seenPassengers.has(name.toLowerCase())) {
      seenPassengers.add(name.toLowerCase());
      passengers.push({ name, type: type === 'Adulto' ? 'ADT' : (type === 'Ragazzo' ? 'CHD' : type) });
    }
  }

  if (trains.length === 0) return null;

  const result = { trains };
  // Primo passeggero come passenger principale
  if (passengers.length > 0) {
    result.passenger = passengers[0];
  }
  // Tutti i passeggeri come array (utile per multi-passeggero)
  if (passengers.length > 1) {
    result.passengers = passengers;
  }

  return result;
}

// ─── Main L2 Functions ──────────────────────────────────────────────────────

/**
 * Try to extract data from a document using a matching template.
 * Returns { result, method } or null if extraction fails.
 */
function tryL2Extraction(template, newText, docType) {
  const brand = template.brand || detectBrand(newText);
  let effectiveDocType = (template.doc_type && template.doc_type !== 'any')
    ? template.doc_type : docType;

  let result = null;
  let method = 'generic';

  // Brand-specific extractors (most reliable)
  if (brand === 'booking.com' && effectiveDocType === 'hotel') {
    const hotel = extractBookingComHotel(newText);
    if (hotel) {
      result = { hotels: [hotel] };
      method = 'booking-specific';
    }
  } else if (brand === 'trenitalia' && (effectiveDocType === 'train' || effectiveDocType === 'auto' || !effectiveDocType || effectiveDocType === 'any')) {
    const trainResult = extractTrenitaliaTrain(newText);
    if (trainResult) {
      result = trainResult;
      method = 'trenitalia-specific';
      // Override docType per validazione (auto = tipo non ancora determinato)
      if (!effectiveDocType || effectiveDocType === 'any' || effectiveDocType === 'auto') effectiveDocType = 'train';
    }
  } else if (brand === 'ita-airways' && effectiveDocType === 'flight') {
    // ITA: extract passenger fields, clone flight data from template
    const personalFields = extractITAPassengerFields(newText);
    if (personalFields && template.last_sample_result?.flights?.length) {
      const similarity = computeTextSimilarity(template.last_sample_text || '', newText);
      if (similarity > 0.85) {
        // Clone flights from template, swap passenger data
        result = JSON.parse(JSON.stringify(template.last_sample_result));
        // Replace passenger info
        if (personalFields.passenger) {
          result.passenger = { ...result.passenger, ...personalFields.passenger };
          // Update passenger on each flight too
          if (result.flights) {
            for (const flight of result.flights) {
              flight.passenger = { ...flight.passenger, ...personalFields.passenger };
            }
          }
        }
        if (personalFields.booking) {
          result.booking = { ...result.booking, ...personalFields.booking };
          // Update bookingReference on flights
          if (personalFields.booking.reference && result.flights) {
            for (const flight of result.flights) {
              flight.bookingReference = personalFields.booking.reference;
            }
          }
        }
        method = 'ita-clone';
      }
    }
  }

  // Fallback: generic anchor extraction + clone
  if (!result && template.extraction_map?.length) {
    const { result: extracted } = applyExtractionMap(template.extraction_map, newText);
    // Try cloning missing fields
    result = cloneMissingFields(extracted, template.last_sample_result, effectiveDocType, newText, template.last_sample_text || '');
    method = 'generic-anchor';
  }

  if (!result) return null;

  // Validate mandatory fields
  const missing = validateMandatory(result, effectiveDocType);
  if (missing.length > 0) {
    console.log(`[L2] Validation failed: missing ${missing.join(', ')} (method: ${method})`);
    return null;
  }

  return { result, method, docType: effectiveDocType };
}

/**
 * Validate that all mandatory fields are present.
 * Returns array of missing field names (empty = all OK).
 */
function validateMandatory(result, docType) {
  const missing = [];

  if (docType === 'flight') {
    const flights = result.flights || [];
    if (flights.length === 0) return ['flights (empty)'];

    for (const field of MANDATORY.flight) {
      if (field === 'bookingReference') {
        // Can be at flight level or booking level
        const atFlight = flights[0]?.bookingReference;
        const atBooking = result.booking?.reference;
        if (!atFlight && !atBooking) missing.push(field);
      } else if (field === 'passenger.name') {
        const atFlight = flights[0]?.passenger?.name;
        const atTop = result.passenger?.name;
        if (!atFlight && !atTop) missing.push(field);
      } else {
        const val = getNestedField(flights[0], field);
        if (val == null || val === '') missing.push(field);
      }
    }
  }

  if (docType === 'hotel') {
    const hotels = result.hotels || [];
    if (hotels.length === 0) return ['hotels (empty)'];

    for (const field of MANDATORY.hotel) {
      const val = getNestedField(hotels[0], field);
      if (val == null || val === '') missing.push(field);
    }
  }

  if (docType === 'train') {
    const trains = result.trains || [];
    if (trains.length === 0) return ['trains (empty)'];

    for (const field of MANDATORY.train) {
      if (field === 'bookingReference') {
        const atTrain = trains[0]?.bookingReference;
        const atTop = result.booking?.reference;
        if (!atTrain && !atTop) missing.push(field);
      } else {
        const val = getNestedField(trains[0], field);
        if (val == null || val === '') missing.push(field);
      }
    }
  }

  return missing;
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  detectBrand,
  buildExtractionMap,
  tryL2Extraction,
  validateMandatory,
  flattenResult,
  computeTextSimilarity,
  // For testing
  extractBookingComHotel,
  extractITAPassengerFields,
  extractTrenitaliaTrain,
  MANDATORY
};
