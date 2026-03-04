/**
 * SmartParse v2 — Comprehensive Test Script
 *
 * Tests ALL available PDF files, each processed TWICE:
 *   Pass 1: First upload → expected L4 (1 Claude call), mandatory fields validated
 *   Pass 2: Re-upload → expected L1 cache hit (0 Claude calls), identical result
 *
 * Run: node scripts/test-smartparse-v2.js
 */

'use strict';

require('dotenv').config({ path: '.env' });

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

const { parseDocumentSmart } = require('../netlify/functions/utils/smartParser');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Test files ─────────────────────────────────────────────────────────────

const BASE = path.join(__dirname, '../filebooking');

const TEST_FILES = [
  // america/ — 5 ITA Airways flights + 1 Booking.com hotel
  { dir: 'america', file: 'Le ricevute elettroniche di viaggio per ALESSANDRO STAGNO D ALCONTRES del 31AUG.pdf', type: 'flight', label: 'ITA-Alessandro' },
  { dir: 'america', file: 'Le ricevute elettroniche di viaggio per FERDINANDO STAGNO D ALCONTRES del 31AUG.pdf', type: 'flight', label: 'ITA-Ferdinando' },
  { dir: 'america', file: 'Le ricevute elettroniche di viaggio per FRANCESCO STAGNO D ALCONTRES del 31AUG.pdf', type: 'flight', label: 'ITA-Francesco' },
  { dir: 'america', file: 'Le ricevute elettroniche di viaggio per GIOVANNI STAGNO D ALCONTRES del 31AUG.pdf', type: 'flight', label: 'ITA-Giovanni' },
  { dir: 'america', file: 'Le ricevute elettroniche di viaggio per MARIA LAURA VERSACI del 31AUG.pdf', type: 'flight', label: 'ITA-MariaLaura' },
  { dir: 'america', file: 'Chicago Booking.com_ Conferma.pdf', type: 'hotel', label: 'Hotel-Chicago' },
  // giappone/ — 5 Booking.com hotels + 2 ITA Airways flights
  { dir: 'giappone', file: '1.pdf', type: 'hotel', label: 'Hotel-JP-1' },
  { dir: 'giappone', file: '2.pdf', type: 'hotel', label: 'Hotel-JP-2' },
  { dir: 'giappone', file: '3.pdf', type: 'hotel', label: 'Hotel-JP-3' },
  { dir: 'giappone', file: '4.pdf', type: 'auto', label: 'JP-4-auto' },
  { dir: 'giappone', file: '5.pdf', type: 'hotel', label: 'Hotel-JP-5' },
  { dir: 'giappone', file: 'Le ricevute elettroniche di viaggio per AGATA BRIGNONE del 15JUN.pdf', type: 'flight', label: 'ITA-Agata' },
  { dir: 'giappone', file: 'Le ricevute elettroniche di viaggio per GINEVRA GIORDANO del 15JUN.pdf', type: 'flight', label: 'ITA-Ginevra' },
];

// ─── Mandatory fields (from spec) ──────────────────────────────────────────

const MANDATORY_FLIGHT = [
  'flightNumber', 'date', 'departureTime', 'arrivalTime',
  'departure.code', 'departure.city', 'arrival.code', 'arrival.city',
  'passenger.name', 'bookingReference'
];

const MANDATORY_HOTEL = [
  'name', 'checkIn.date', 'checkOut.date', 'confirmationNumber',
  'address.city', 'address.fullAddress'
];

function getNestedValue(obj, dotPath) {
  return dotPath.split('.').reduce((o, k) => o?.[k], obj);
}

function checkMandatoryFields(result, docType) {
  const missing = [];

  if (docType === 'flight' || result.flights?.length) {
    const flights = result.flights || [];
    if (flights.length === 0) return { ok: false, missing: ['flights (empty array)'], total: MANDATORY_FLIGHT.length, present: 0 };
    const f = flights[0]; // check first flight
    for (const field of MANDATORY_FLIGHT) {
      const val = getNestedValue(f, field);
      // bookingReference can also be at top level
      if ((val == null || val === '') && field === 'bookingReference') {
        if (result.booking?.reference) continue;
      }
      // passenger.name can be at result level
      if ((val == null || val === '') && field === 'passenger.name') {
        if (result.passenger?.name) continue;
      }
      if (val == null || val === '') missing.push(field);
    }
    return { ok: missing.length === 0, missing, total: MANDATORY_FLIGHT.length, present: MANDATORY_FLIGHT.length - missing.length };
  }

  if (docType === 'hotel' || result.hotels?.length) {
    const hotels = result.hotels || [];
    if (hotels.length === 0) return { ok: false, missing: ['hotels (empty array)'], total: MANDATORY_HOTEL.length, present: 0 };
    const h = hotels[0]; // check first hotel
    for (const field of MANDATORY_HOTEL) {
      const val = getNestedValue(h, field);
      if (val == null || val === '') missing.push(field);
    }
    return { ok: missing.length === 0, missing, total: MANDATORY_HOTEL.length, present: MANDATORY_HOTEL.length - missing.length };
  }

  return { ok: false, missing: ['no flights or hotels found'], total: 0, present: 0 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function deleteAllCacheEntries() {
  console.log('\n━━━ Cancello tutte le cache entries ━━━');
  const { data, error } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .neq('id', '___none___')
    .select('id, name, source');

  (data || []).forEach(t => console.log(`  Eliminato: ${t.name} [${t.source}] (${t.id})`));
  if (error) console.warn('  Errore delete:', error.message);
  if (!data?.length) console.log('  (nessuna entry trovata)');
}

async function processPdf(testFile, passLabel) {
  const filepath = path.join(BASE, testFile.dir, testFile.file);
  if (!fs.existsSync(filepath)) {
    console.error(`  File non trovato: ${filepath}`);
    return { label: testFile.label, pass: passLabel, error: 'File not found', parseLevel: -1, claudeCalls: 0, elapsed: '0' };
  }

  const pdfBase64 = fs.readFileSync(filepath).toString('base64');
  const t0 = Date.now();

  let res;
  try {
    res = await parseDocumentSmart(pdfBase64, testFile.type);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`  ERRORE: ${err.message} (${elapsed}s)`);
    return { label: testFile.label, pass: passLabel, error: err.message, parseLevel: -1, claudeCalls: 0, elapsed };
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const flights = res.result?.flights?.length || 0;
  const hotels  = res.result?.hotels?.length || 0;
  const docType = res.detectedDocType || testFile.type;

  const fieldCheck = checkMandatoryFields(res.result, docType);

  console.log(`  L${res.parseLevel} | ${res.claudeCalls} AI | ${elapsed}s | ${flights}F ${hotels}H | campi: ${fieldCheck.present}/${fieldCheck.total}${fieldCheck.ok ? '' : ' MANCANTI: ' + fieldCheck.missing.join(', ')}`);

  return {
    label: testFile.label,
    pass: passLabel,
    parseLevel: res.parseLevel,
    claudeCalls: res.claudeCalls || 0,
    elapsed,
    flights,
    hotels,
    fieldCheck,
    timedOut: res.timedOut || false,
    error: res.error || null
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     SmartParse v2.1 — Test L1 + L2 + L4        ║');
  console.log('║  13 PDF × 2 passate = 26 test                  ║');
  console.log('║  Atteso: ~3 L4 (Claude) + ~10 L2 (template)    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await deleteAllCacheEntries();

  const results = [];

  // ── Pass 1: First upload (expected L4) ────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log('PASSATA 1 — Prima caricata (atteso: L4 per primo provider, L2 per successivi)');
  console.log('════════════════════════════════════════════════════');

  for (let i = 0; i < TEST_FILES.length; i++) {
    const tf = TEST_FILES[i];
    console.log(`\n[${i + 1}/${TEST_FILES.length}] ${tf.label} (${tf.type})`);
    const r = await processPdf(tf, 'pass1');
    results.push(r);

    // Small delay to help prompt caching
    if (i < TEST_FILES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ── Pass 2: Re-upload (expected L1 cache) ─────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log('PASSATA 2 — Ri-caricamento (atteso: L1, 0 Claude calls)');
  console.log('════════════════════════════════════════════════════');

  for (let i = 0; i < TEST_FILES.length; i++) {
    const tf = TEST_FILES[i];
    console.log(`\n[${i + 1}/${TEST_FILES.length}] ${tf.label} (${tf.type})`);
    const r = await processPdf(tf, 'pass2');
    results.push(r);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let allPass = true;
  let totalClaude = 0;
  let pass1Claude = 0;
  let pass2Claude = 0;

  // Pass 1 results
  let pass1L2 = 0, pass1L4 = 0;
  console.log('\n── Passata 1 (Prima caricata) ──');
  for (const r of results.filter(r => r.pass === 'pass1')) {
    totalClaude += r.claudeCalls;
    pass1Claude += r.claudeCalls;
    if (r.parseLevel === 2) pass1L2++;
    if (r.parseLevel === 4) pass1L4++;
    const levelOk = [1, 2, 4].includes(r.parseLevel);
    const fieldsOk = r.fieldCheck?.ok ?? false;
    const ok = levelOk && fieldsOk && !r.error;
    if (!ok) allPass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${r.label.padEnd(20)} L${r.parseLevel} | ${r.claudeCalls} AI | ${r.flights}F ${r.hotels}H | ${r.fieldCheck?.present ?? '?'}/${r.fieldCheck?.total ?? '?'} campi | ${r.elapsed}s${r.fieldCheck?.missing?.length ? ` MANCANTI: ${r.fieldCheck.missing.join(', ')}` : ''}`);
  }

  // Pass 2 results
  console.log('\n── Passata 2 (Ri-caricamento) ──');
  for (const r of results.filter(r => r.pass === 'pass2')) {
    totalClaude += r.claudeCalls;
    pass2Claude += r.claudeCalls;
    const levelOk = r.parseLevel === 1 || r.parseLevel === 2;
    const callsOk = r.claudeCalls === 0;
    const ok = levelOk && callsOk && !r.error;
    if (!ok) allPass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${r.label.padEnd(20)} L${r.parseLevel} | ${r.claudeCalls} AI | ${r.flights}F ${r.hotels}H | ${r.elapsed}s${!levelOk ? ' ATTESO L1/L2!' : ''}${!callsOk ? ' ATTESO 0 AI!' : ''}`);
  }

  console.log('\n── Totali ──');
  console.log(`  Chiamate Claude passata 1: ${pass1Claude} (L4: ${pass1L4}, L2: ${pass1L2})`);
  console.log(`  Chiamate Claude passata 2: ${pass2Claude} (atteso: 0)`);
  console.log(`  Chiamate Claude totali:    ${totalClaude}`);
  console.log(`  ${pass1L2 > 0 ? '✅' : '⚠️'} L2 template hits in passata 1: ${pass1L2}`);
  console.log(`  ${pass2Claude === 0 ? '✅' : '❌'} Passata 2 interamente da cache`);
  console.log(`  ${allPass ? '✅' : '❌'} Tutti i test superati`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
