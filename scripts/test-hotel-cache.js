/**
 * Test script: Hotel fingerprint caching across different hotels
 *
 * Run: node scripts/test-hotel-cache.js
 *
 * Tests the specific bug: uploading Hotel1 → Hotel2 → Hotel1 again
 * should NOT require Claude calls for the third upload (L1 cache hit).
 *
 * Steps:
 *   1. Delete all templates (clean slate)
 *   2. Upload 1.pdf → L4 (creates template, 2 Claude calls)
 *   3. Upload 2.pdf → L4 (updates template, creates cache entry for 1.pdf)
 *   4. Upload 2.pdf → L1 cache hit (0 Claude calls) ✓
 *   5. Upload 1.pdf → L1 cache hit (0 Claude calls) ← THIS WAS THE BUG
 *
 * Success criteria:
 *   - PDF 1 (first): L4, 2 Claude calls
 *   - PDF 2 (first): L4, 2 Claude calls (updates template)
 *   - PDF 2 (again): L1, 0 Claude calls
 *   - PDF 1 (again): L1, 0 Claude calls (was L4 before fix!)
 *   - Total Claude calls: 4 (not 5+)
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

// ─── Steps ───────────────────────────────────────────────────────────────────

async function deleteAllTemplates() {
  console.log('\n━━━ Step 0: Delete ALL existing templates (clean slate) ━━━');
  const { data, error } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .neq('id', '___none___')
    .select('id, name, brand, source');

  const deleted = data || [];
  if (deleted.length === 0) {
    console.log('  No templates found — starting fresh.');
  } else {
    deleted.forEach(t => console.log(`  ✓ Deleted: ${t.name} [${t.source}] (${t.id})`));
  }
  if (error) console.warn('  Delete error:', error.message);
}

async function processPdf(filename, label) {
  const filepath = path.join(PDF_DIR, filename);
  const pdfBase64 = fs.readFileSync(filepath).toString('base64');

  console.log(`\n━━━ ${label}: ${filename} ━━━`);
  const t0 = Date.now();

  let res;
  try {
    res = await parseDocumentSmart(pdfBase64, 'hotel', 'auto', false);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return null;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const level = LEVEL_LABELS[res.parseLevel] || `L${res.parseLevel}`;

  console.log(`  Parse level : ${level}`);
  console.log(`  Claude calls: ${res.claudeCalls ?? '?'}`);
  console.log(`  Duration    : ${elapsed}s`);
  if (res.clonePersonalized) console.log(`  Clone&Pers  : ✅ yes`);
  if (res.templateName) console.log(`  Template    : ${res.templateName} (${res.templateId})`);
  if (res.learnedTemplateName) console.log(`  Learned     : ${res.learnedTemplateName} (${res.learnedTemplateId})`);

  const hotels = res.result?.hotels || [];
  if (hotels.length > 0) {
    console.log(`  Hotel       : ${hotels[0].name || '?'}`);
    console.log(`  Guest       : ${hotels[0].guest?.name || res.result?.guest?.name || '?'}`);
    console.log(`  Confirm#    : ${hotels[0].confirmationNumber || res.result?.booking?.confirmationNumber || '?'}`);
  }

  return { label, filename, parseLevel: res.parseLevel, claudeCalls: res.claudeCalls || 0, elapsed };
}

async function inspectTemplates() {
  console.log('\n━━━ Template Inspection ━━━');
  const { data: templates } = await supabase
    .from('parsing_templates_beta')
    .select('id, name, brand, source, last_sample_fingerprint')
    .order('created_at', { ascending: true });

  if (!templates || templates.length === 0) {
    console.log('  No templates found!');
    return;
  }

  for (const t of templates) {
    const fpShort = t.last_sample_fingerprint ? t.last_sample_fingerprint.substring(0, 16) + '...' : 'null';
    console.log(`  ${t.source.padEnd(18)} | ${t.name.padEnd(50)} | fp: ${fpShort} | ${t.id}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Hotel Fingerprint Cache Test');
  console.log('===========================');
  console.log('Tests: 1.pdf → 2.pdf → 2.pdf (cache) → 1.pdf (cache)');

  await deleteAllTemplates();

  const results = [];

  // Step 1: Upload 1.pdf — should create template (L4)
  results.push(await processPdf('1.pdf', 'Step 1 (1.pdf first upload)'));
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Upload 2.pdf — should update template (L4), cache old fingerprint
  results.push(await processPdf('2.pdf', 'Step 2 (2.pdf first upload)'));
  await new Promise(r => setTimeout(r, 2000));

  // Inspect templates after both uploads
  await inspectTemplates();

  // Step 3: Upload 2.pdf again — should hit L1 cache
  results.push(await processPdf('2.pdf', 'Step 3 (2.pdf re-upload)'));

  // Step 4: Upload 1.pdf again — should hit L1 cache (THE BUG FIX!)
  results.push(await processPdf('1.pdf', 'Step 4 (1.pdf re-upload)'));

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalClaude = 0;
  const expectations = [
    { level: 4, maxCalls: 2 },  // 1.pdf first: L4
    { level: 4, maxCalls: 2 },  // 2.pdf first: L4
    { level: 1, maxCalls: 0 },  // 2.pdf again: L1
    { level: 1, maxCalls: 0 },  // 1.pdf again: L1 (was L4 before fix!)
  ];

  let allPass = true;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r) { allPass = false; continue; }
    totalClaude += r.claudeCalls;
    const exp = expectations[i];
    const levelOk = r.parseLevel <= exp.level;
    const callsOk = r.claudeCalls <= exp.maxCalls;
    const ok = levelOk && callsOk;
    if (!ok) allPass = false;
    const icon = ok ? '✅' : '❌';
    const level = LEVEL_LABELS[r.parseLevel] || `L${r.parseLevel}`;
    console.log(`  ${icon} ${r.label.padEnd(30)}: ${level.padEnd(22)} | ${r.claudeCalls} AI calls | ${r.elapsed}s`);
  }

  console.log(`\n  Total Claude calls: ${totalClaude} (target: ≤4)`);
  console.log(`  ${totalClaude <= 4 ? '✅' : '❌'} Claude call budget`);
  console.log(`  ${allPass ? '✅' : '❌'} All steps at expected levels`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
