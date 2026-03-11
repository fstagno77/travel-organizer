/**
 * SmartParse Beta — Test Treni (Trenitalia)
 *
 * Testa i 5 PDF di treni in 2 passate:
 *   Passata 1: primo upload → atteso L2 (estrattore Trenitalia, 0 AI)
 *   Passata 2: re-upload → atteso L1 cache (0 AI)
 *
 * Run: node scripts/test-smartparse-treni.js
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
  { dir: 'treni', file: '1 Treno.pdf', type: 'auto', label: 'Treno-1-MiTo' },
  { dir: 'treni', file: '2 Treno.pdf', type: 'auto', label: 'Treno-2-VsNa' },
  { dir: 'treni', file: '3 Treno.pdf', type: 'auto', label: 'Treno-3-MiRo' },
  { dir: 'treni', file: '4 Treno.pdf', type: 'auto', label: 'Treno-4' },
  { dir: 'treni', file: '5 Treno.pdf', type: 'auto', label: 'Treno-5' },
];

// ─── Campi obbligatori treni ────────────────────────────────────────────────

const MANDATORY_TRAIN = [
  'trainNumber', 'date', 'departure.station', 'departure.city',
  'departure.time', 'arrival.station', 'arrival.city', 'arrival.time',
  'bookingReference'
];

function getNestedValue(obj, dotPath) {
  return dotPath.split('.').reduce((o, k) => o?.[k], obj);
}

function checkMandatoryFields(result) {
  const missing = [];
  const trains = result.trains || [];
  if (trains.length === 0) return { ok: false, missing: ['trains (empty)'], total: MANDATORY_TRAIN.length, present: 0 };

  const t = trains[0];
  for (const field of MANDATORY_TRAIN) {
    if (field === 'bookingReference') {
      if (!t.bookingReference && !result.booking?.reference) missing.push(field);
    } else {
      const val = getNestedValue(t, field);
      if (val == null || val === '') missing.push(field);
    }
  }
  return { ok: missing.length === 0, missing, total: MANDATORY_TRAIN.length, present: MANDATORY_TRAIN.length - missing.length };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function deleteBetaCacheEntries() {
  console.log('\n━━━ Cancello cache entries beta ━━━');
  const { data, error } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .like('id', 'beta:%')
    .select('id, name, source');

  (data || []).forEach(t => console.log(`  Eliminato: ${t.name} [${t.source}] (${t.id})`));
  if (error) console.warn('  Errore delete:', error.message);
  if (!data?.length) console.log('  (nessuna entry beta trovata)');
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
    // Mode 'beta' per supporto treni
    res = await parseDocumentSmart(pdfBase64, testFile.type, 'beta');
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`  ERRORE: ${err.message} (${elapsed}s)`);
    return { label: testFile.label, pass: passLabel, error: err.message, parseLevel: -1, claudeCalls: 0, elapsed };
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const trains = res.result?.trains?.length || 0;
  const passengers = res.result?.passengers?.length || (res.result?.passenger ? 1 : 0);
  // Determina il docType effettivo: se ha trains[] è un treno, indipendentemente da detectedDocType
  const docType = (res.result?.trains?.length > 0) ? 'train' : (res.detectedDocType || 'unknown');

  const fieldCheck = docType === 'train' ? checkMandatoryFields(res.result) : { ok: false, missing: ['wrong docType: ' + docType], total: 0, present: 0 };

  const brand = res.brand || '-';
  const method = res.l2Method || '-';
  console.log(`  L${res.parseLevel} | ${res.claudeCalls} AI | ${elapsed}s | ${trains}T ${passengers}P | brand=${brand} method=${method} | campi: ${fieldCheck.present}/${fieldCheck.total}${fieldCheck.ok ? '' : ' MANCANTI: ' + fieldCheck.missing.join(', ')}`);

  // Stampa dettagli primo treno
  if (res.result?.trains?.[0]) {
    const t = res.result.trains[0];
    console.log(`    → ${t.trainNumber} | ${t.date} | ${t.departure?.station} ${t.departure?.time} → ${t.arrival?.station} ${t.arrival?.time} | PNR: ${t.bookingReference || '-'}`);
  }

  return {
    label: testFile.label,
    pass: passLabel,
    parseLevel: res.parseLevel,
    claudeCalls: res.claudeCalls || 0,
    elapsed,
    trains,
    passengers,
    fieldCheck,
    brand,
    method,
    error: res.error || null
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    SmartParse Beta — Test Treni (Trenitalia)     ║');
  console.log('║  5 PDF × 2 passate = 10 test                    ║');
  console.log('║  Atteso: 0 L4 — tutti L2 (estrattore specifico) ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await deleteBetaCacheEntries();

  const results = [];

  // ── Passata 1 ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log('PASSATA 1 — Prima caricata (atteso: L2 Trenitalia, 0 AI)');
  console.log('════════════════════════════════════════════════════');

  for (let i = 0; i < TEST_FILES.length; i++) {
    const tf = TEST_FILES[i];
    console.log(`\n[${i + 1}/${TEST_FILES.length}] ${tf.label}`);
    const r = await processPdf(tf, 'pass1');
    results.push(r);
  }

  // ── Passata 2 ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log('PASSATA 2 — Ri-caricamento (atteso: L1, 0 AI)');
  console.log('════════════════════════════════════════════════════');

  for (let i = 0; i < TEST_FILES.length; i++) {
    const tf = TEST_FILES[i];
    console.log(`\n[${i + 1}/${TEST_FILES.length}] ${tf.label}`);
    const r = await processPdf(tf, 'pass2');
    results.push(r);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let allPass = true;
  let totalClaude = 0;

  console.log('\n── Passata 1 ──');
  for (const r of results.filter(r => r.pass === 'pass1')) {
    totalClaude += r.claudeCalls;
    const levelOk = r.parseLevel === 2;
    const callsOk = r.claudeCalls === 0;
    const fieldsOk = r.fieldCheck?.ok ?? false;
    const ok = levelOk && callsOk && fieldsOk && !r.error;
    if (!ok) allPass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${r.label.padEnd(18)} L${r.parseLevel} | ${r.claudeCalls} AI | ${r.trains}T ${r.passengers}P | ${r.fieldCheck?.present ?? '?'}/${r.fieldCheck?.total ?? '?'} campi | ${r.elapsed}s${r.fieldCheck?.missing?.length ? ` | MANCANTI: ${r.fieldCheck.missing.join(', ')}` : ''}`);
  }

  console.log('\n── Passata 2 ──');
  for (const r of results.filter(r => r.pass === 'pass2')) {
    totalClaude += r.claudeCalls;
    const levelOk = r.parseLevel === 1;
    const callsOk = r.claudeCalls === 0;
    const ok = levelOk && callsOk && !r.error;
    if (!ok) allPass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${r.label.padEnd(18)} L${r.parseLevel} | ${r.claudeCalls} AI | ${r.trains}T | ${r.elapsed}s${r.parseLevel !== 1 ? ' ATTESO L1!' : ''}`);
  }

  console.log('\n── Totali ──');
  console.log(`  Chiamate Claude totali: ${totalClaude} (atteso: 0)`);
  console.log(`  ${totalClaude === 0 ? '✅' : '❌'} Zero chiamate AI`);
  console.log(`  ${allPass ? '✅' : '❌'} Tutti i test superati`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
