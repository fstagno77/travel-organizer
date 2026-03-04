/**
 * Test script: SmartParse with 5 ITA Airways receipts from filebooking/america/
 *
 * Run: node scripts/test-smartparse-ita.js
 *
 * Steps:
 *   1. Delete all existing ITA Airways templates
 *   2. Process 5 PDFs sequentially with full cascade + template learning enabled
 *   3. Report parseLevel, fields extracted, claudeCalls for each
 *   4. Validate essential fields and print summary
 *
 * Success criteria:
 *   - PDF #1: L4, 2 Claude calls, 4 flights with essential fields
 *   - PDFs #2-5: L2, 0 Claude calls, 4 flights with essential fields
 *   - Total Claude calls: 2 (down from 10)
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

const PDF_DIR  = path.join(__dirname, '../filebooking/america');
const PDF_FILES = [
  'Le ricevute elettroniche di viaggio per ALESSANDRO STAGNO D ALCONTRES del 31AUG.pdf',
  'Le ricevute elettroniche di viaggio per FERDINANDO STAGNO D ALCONTRES del 31AUG.pdf',
  'Le ricevute elettroniche di viaggio per FRANCESCO STAGNO D ALCONTRES del 31AUG.pdf',
  'Le ricevute elettroniche di viaggio per GIOVANNI STAGNO D ALCONTRES del 31AUG.pdf',
  'Le ricevute elettroniche di viaggio per MARIA LAURA VERSACI del 31AUG.pdf'
];

// Essential flight fields that MUST be extracted
const ESSENTIAL_FLIGHT_FIELDS = [
  'flightNumber', 'departure.airport', 'arrival.airport',
  'departure.date', 'departure.time', 'arrival.time'
];

const LEVEL_LABELS = {
  1: 'L1 cache (0 AI)',
  2: 'L2 template (0 AI)',
  3: 'L3 classic (0 AI)',
  4: 'L4 Claude',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o && o[k], obj);
}

function checkEssentialFields(flights) {
  const issues = [];
  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    for (const field of ESSENTIAL_FLIGHT_FIELDS) {
      const val = getNestedValue(f, field);
      if (!val || val === '') {
        issues.push(`  flight[${i}] missing ${field}`);
      }
    }
  }
  return issues;
}

function flatFields(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          Object.assign(out, flatFields(item, `${key}[${i}]`));
        } else if (item !== null && item !== '') {
          out[`${key}[${i}]`] = item;
        }
      });
    } else if (v !== null && v !== undefined && v !== '' && typeof v === 'object') {
      Object.assign(out, flatFields(v, key));
    } else if (v !== null && v !== undefined && v !== '') {
      out[key] = v;
    }
  }
  return out;
}

// ─── Step 1: Delete ITA Airways templates ────────────────────────────────────

async function deleteAllTemplates() {
  console.log('\n━━━ Step 1: Delete ALL existing templates (clean slate) ━━━');

  const { data, error } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .neq('id', '___none___')
    .select('id, name, brand');

  const deleted = data || [];
  if (deleted.length === 0) {
    console.log('  No templates found — starting fresh.');
  } else {
    deleted.forEach(t => console.log(`  ✓ Deleted: ${t.name} (brand: ${t.brand || 'null'}) [${t.id}]`));
  }
  if (error) console.warn('  Delete error:', error.message);
}

// ─── Step 2: Process each PDF ────────────────────────────────────────────────

async function processPdf(filename, index) {
  const filepath = path.join(PDF_DIR, filename);
  const pdfBase64 = fs.readFileSync(filepath).toString('base64');
  const shortName = filename.match(/per (.+?) del/)?.[1] || filename;

  console.log(`\n━━━ PDF ${index + 1}/5: ${shortName} ━━━`);
  const t0 = Date.now();

  let res;
  try {
    res = await parseDocumentSmart(pdfBase64, 'flight', 'auto', false);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return null;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const level   = LEVEL_LABELS[res.parseLevel] || `L${res.parseLevel}`;
  const flights = res.result?.flights || [];
  const fields  = flatFields(res.result || {});
  const nFields = Object.keys(fields).length;

  console.log(`  Parse level : ${level}`);
  console.log(`  Claude calls: ${res.claudeCalls ?? '?'}`);
  console.log(`  Duration    : ${elapsed}s`);
  console.log(`  Flights     : ${flights.length}`);
  console.log(`  Total fields: ${nFields}`);

  if (res.clonePersonalized) {
    console.log(`  Clone&Pers  : ✅ yes`);
  }
  if (res.matchScore !== undefined) {
    console.log(`  matchScore  : ${res.matchScore?.toFixed(2) ?? 'n/a'}`);
    if (!res.clonePersonalized) {
      console.log(`  applyConf   : ${res.applyConfidence?.toFixed(2) ?? 'n/a'}`);
      console.log(`  finalConf   : ${res.finalConfidence?.toFixed(2) ?? 'n/a'}`);
    }
  }
  if (res.templateName) {
    const improved = res.templateImproved ? ' [improved]' : '';
    console.log(`  Template    : ${res.templateName}${improved} (${res.templateId})`);
  }
  if (res.learnedTemplateName) {
    console.log(`  Learned     : ${res.learnedTemplateName} (${res.learnedTemplateId})`);
  }

  // Essential fields check
  if (flights.length > 0) {
    const issues = checkEssentialFields(flights);
    if (issues.length === 0) {
      console.log(`  Essential   : ✅ All present in ${flights.length} flights`);
    } else {
      console.log(`  Essential   : ⚠ ${issues.length} missing fields:`);
      issues.forEach(i => console.log(`    ${i}`));
    }
  }

  // Print first flight as sample
  if (flights.length > 0) {
    const f = flights[0];
    console.log(`  Sample flt  : ${f.flightNumber || '?'} ${f.departure?.airport || '?'}→${f.arrival?.airport || '?'} ${f.departure?.date || '?'} ${f.departure?.time || '?'}-${f.arrival?.time || '?'}`);
  }

  return { filename: shortName, parseLevel: res.parseLevel, claudeCalls: res.claudeCalls || 0, flights: flights.length, nFields, elapsed, res };
}

// ─── Step 3: Inspect template in DB ──────────────────────────────────────────

async function inspectTemplate() {
  console.log('\n━━━ Template Inspection ━━━');
  const { data: templates } = await supabase
    .from('parsing_templates_beta')
    .select('id, name, brand, match_rules, source, usage_count, field_rules, collections');

  if (!templates || templates.length === 0) {
    console.log('  No templates found in DB!');
    return;
  }

  for (const t of templates) {
    console.log(`  Template: ${t.name} (${t.id})`);
    console.log(`    Brand       : ${t.brand}`);
    console.log(`    Source      : ${t.source}`);
    console.log(`    Usage       : ${t.usage_count}`);
    console.log(`    match_all   : [${(t.match_rules?.all || []).join(', ')}]`);
    console.log(`    match_any   : [${(t.match_rules?.any || []).join(', ')}]`);
    console.log(`    field_rules : ${(t.field_rules || []).length} rules`);
    console.log(`    collections : ${(t.collections || []).length} (fields: ${(t.collections || []).flatMap(c => c.fields || []).length})`);
    if (t.collections?.length > 0) {
      t.collections.forEach(c => {
        console.log(`      ${c.path}: startRegex=${c.startRegex} | ${(c.fields||[]).length} fields`);
        (c.fields || []).slice(0, 8).forEach(f => console.log(`        ${f.path}: ${f.regex?.substring(0, 60)}`));
      });
    }
  }
}

// ─── Step 4: Summary ─────────────────────────────────────────────────────────

function printSummary(results) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalClaude = 0;
  let allPass = true;
  const valid = results.filter(Boolean);

  valid.forEach((r, i) => {
    const level = LEVEL_LABELS[r.parseLevel] || `L${r.parseLevel}`;
    totalClaude += r.claudeCalls;
    const flightsOk = r.flights >= 4 ? '✅' : '❌';
    const levelOk   = (i === 0 ? r.parseLevel === 4 : r.parseLevel <= 2) ? '✅' : '❌';
    if (r.flights < 4 || (i > 0 && r.parseLevel > 2)) allPass = false;
    console.log(`  PDF ${i+1} (${r.filename.padEnd(30)}): ${levelOk} ${level.padEnd(22)} | ${r.claudeCalls} AI | ${flightsOk} ${r.flights} flights | ${r.nFields} fields | ${r.elapsed}s`);
  });

  console.log(`\n  Total Claude calls: ${totalClaude} (target: 2)`);
  console.log(`  ${totalClaude <= 2 ? '✅' : '❌'} Claude call budget`);
  console.log(`  ${allPass ? '✅' : '❌'} All PDFs extracted 4+ flights at correct levels`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('SmartParse ITA Airways Test — filebooking/america/ (5 flight receipts)');
  console.log('=====================================================================');

  await deleteAllTemplates();

  const results = [];
  for (let i = 0; i < PDF_FILES.length; i++) {
    const r = await processPdf(PDF_FILES[i], i);
    results.push(r);
    if (i < PDF_FILES.length - 1) {
      process.stdout.write('  (waiting 2s before next PDF...)\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await inspectTemplate();
  printSummary(results);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
