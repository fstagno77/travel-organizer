/**
 * Simulates frontend flow: delete templates, then 1.pdf → 2.pdf → 1.pdf → 2.pdf
 * Uses docType='auto' like the frontend does.
 *
 * Run: node scripts/test-hotel-frontend-sim.js
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

const PDF_DIR = path.join(__dirname, '../filebooking/giappone');

const LEVEL_LABELS = {
  1: 'L1 cache (0 AI)',
  2: 'L2 template (0 AI)',
  3: 'L3 classic (0 AI)',
  4: 'L4 Claude',
};

async function deleteAllTemplates() {
  console.log('\n━━━ Delete ALL existing templates ━━━');
  const { data, error } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .neq('id', '___none___')
    .select('id, name, source');

  (data || []).forEach(t => console.log(`  ✓ Deleted: ${t.name} [${t.source}] (${t.id})`));
  if (error) console.warn('  Delete error:', error.message);
  if (!data?.length) console.log('  (no templates found)');
}

async function processPdf(filename, step) {
  const filepath = path.join(PDF_DIR, filename);
  const pdfBase64 = fs.readFileSync(filepath).toString('base64');

  console.log(`\n━━━ Step ${step}: ${filename} (docType=auto) ━━━`);
  const t0 = Date.now();

  let res;
  try {
    // docType='auto', mode='auto', skipLearn=false — exactly like frontend
    res = await parseDocumentSmart(pdfBase64, 'auto', 'auto', false);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return { step, filename, parseLevel: -1, claudeCalls: 0, elapsed: '0', error: err.message };
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const level = LEVEL_LABELS[res.parseLevel] || `L${res.parseLevel}`;
  const hotels = res.result?.hotels || [];
  const flights = res.result?.flights || [];

  console.log(`  Parse level  : ${level}`);
  console.log(`  Claude calls : ${res.claudeCalls ?? '?'}`);
  console.log(`  Duration     : ${elapsed}s`);
  console.log(`  Hotels       : ${hotels.length}`);
  console.log(`  Flights      : ${flights.length}`);
  console.log(`  detectedType : ${res.detectedDocType || 'null'}`);
  if (res.clonePersonalized) console.log(`  Clone&Pers   : ✅ yes`);
  if (res.templateName) console.log(`  Template     : ${res.templateName} (${res.templateId})`);
  if (res.learnedTemplateName) console.log(`  Learned      : ${res.learnedTemplateName} (${res.learnedTemplateId})`);
  if (res.templateUpdated) console.log(`  Updated tpl  : ✅ yes`);

  if (hotels.length > 0) {
    const h = hotels[0];
    console.log(`  Hotel name   : ${h.name || '?'}`);
    console.log(`  Guest        : ${h.guest?.name || res.result?.guest?.name || '?'}`);
    console.log(`  Confirm#     : ${h.confirmationNumber || res.result?.booking?.confirmationNumber || '?'}`);
    console.log(`  Check-in     : ${h.checkIn || '?'}`);
    console.log(`  Check-out    : ${h.checkOut || '?'}`);
  }

  if (flights.length > 0) {
    const f = flights[0];
    console.log(`  Flight       : ${f.flightNumber || '?'} ${f.departure?.airport || '?'}→${f.arrival?.airport || '?'}`);
  }

  // Show result keys for debugging if no hotels/flights
  if (hotels.length === 0 && flights.length === 0) {
    console.log(`  Result keys  : ${Object.keys(res.result || {}).join(', ') || '(empty)'}`);
    const resultStr = JSON.stringify(res.result, null, 2);
    console.log(`  Result       : ${resultStr.substring(0, 500)}`);
  }

  return { step, filename, parseLevel: res.parseLevel, claudeCalls: res.claudeCalls || 0, elapsed, hotels: hotels.length, flights: flights.length };
}

async function inspectTemplates() {
  console.log('\n━━━ Template Inspection ━━━');
  const { data: templates } = await supabase
    .from('parsing_templates_beta')
    .select('id, name, brand, source, doc_type, last_sample_fingerprint')
    .order('created_at', { ascending: true });

  if (!templates?.length) { console.log('  (none)'); return; }
  for (const t of templates) {
    const fpShort = t.last_sample_fingerprint ? t.last_sample_fingerprint.substring(0, 12) + '...' : 'null';
    console.log(`  ${t.source.padEnd(18)} | ${t.doc_type.padEnd(6)} | ${t.name.padEnd(50)} | fp: ${fpShort} | ${t.id}`);
  }
}

async function main() {
  console.log('Hotel Frontend Simulation Test');
  console.log('==============================');
  console.log('Sequence: delete → 1.pdf → 2.pdf → 1.pdf → 2.pdf');

  await deleteAllTemplates();

  const results = [];

  // Step 1: 1.pdf
  results.push(await processPdf('1.pdf', '1 (1.pdf first)'));
  await inspectTemplates();
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: 2.pdf
  results.push(await processPdf('2.pdf', '2 (2.pdf first)'));
  await inspectTemplates();
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: 1.pdf again
  results.push(await processPdf('1.pdf', '3 (1.pdf again)'));

  // Step 4: 2.pdf again
  results.push(await processPdf('2.pdf', '4 (2.pdf again)'));

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalClaude = 0;
  // Expected: L4, L4, L1, L1
  const expected = [
    { maxLevel: 4, maxCalls: 2, desc: '1.pdf first → L4 (create template)' },
    { maxLevel: 4, maxCalls: 2, desc: '2.pdf first → L4 (update template)' },
    { maxLevel: 1, maxCalls: 0, desc: '1.pdf again → L1 cache' },
    { maxLevel: 1, maxCalls: 0, desc: '2.pdf again → L1 cache' },
  ];

  let allPass = true;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    totalClaude += r.claudeCalls;
    const exp = expected[i];
    const ok = r.parseLevel <= exp.maxLevel && r.claudeCalls <= exp.maxCalls && r.parseLevel > 0;
    if (!ok) allPass = false;
    const level = LEVEL_LABELS[r.parseLevel] || `L${r.parseLevel}`;
    console.log(`  ${ok ? '✅' : '❌'} Step ${r.step}: ${r.filename.padEnd(6)} → ${level.padEnd(22)} | ${r.claudeCalls} AI | ${(r.hotels||0)} hotels, ${(r.flights||0)} flights | ${r.elapsed}s`);
    if (!ok) console.log(`     Expected: ${exp.desc}`);
  }

  console.log(`\n  Total Claude calls: ${totalClaude}`);
  console.log(`  ${allPass ? '✅' : '❌'} All steps at expected levels`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
