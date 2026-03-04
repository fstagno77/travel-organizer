/**
 * Test script: SmartParse with 5 Booking.com receipts from filebooking/giappone/
 *
 * Run: node scripts/test-booking-smartparse.js
 *
 * Steps:
 *   1. Delete all existing Booking.com templates
 *   2. Process PDFs 1→5 with full cascade + template learning enabled
 *   3. Report parseLevel, fields extracted, claudeCalls for each
 */

'use strict';

require('dotenv').config({ path: '.env' });

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ─── Load smartParser ────────────────────────────────────────────────────────
// Set ANTHROPIC_API_KEY from env before requiring smartParser
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

const { parseDocumentSmart } = require('../netlify/functions/utils/smartParser');

// ─── Supabase service client ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PDF_DIR  = path.join(__dirname, '../filebooking/giappone');
const PDF_FILES = ['1.pdf', '2.pdf', '3.pdf', '4.pdf', '5.pdf'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countFields(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && v !== undefined && v !== '') {
      if (typeof v === 'object' && !Array.isArray(v)) {
        count += countFields(v, key);
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') count += countFields(item, `${key}[${i}]`);
          else if (item !== null && item !== '') count++;
        });
      } else {
        count++;
      }
    }
  }
  return count;
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

const LEVEL_LABELS = {
  1: 'L1 cache (0 AI)',
  2: 'L2 template (0 AI)',
  3: 'L3 classic (0 AI)',
  4: 'L4 Claude',
};

// ─── Step 1: Delete Booking.com templates ────────────────────────────────────

async function deleteBookingTemplates() {
  console.log('\n━━━ Step 1: Delete existing Booking.com templates ━━━');

  // Delete by brand name
  const { data: byBrand, error: e1 } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .ilike('brand', '%booking%')
    .select('id, name, brand');

  // Also delete by name containing "booking"
  const { data: byName, error: e2 } = await supabase
    .from('parsing_templates_beta')
    .delete()
    .ilike('name', '%booking%')
    .select('id, name, brand');

  const deleted = [...(byBrand || []), ...(byName || [])];
  if (deleted.length === 0) {
    console.log('  No Booking.com templates found — starting fresh.');
  } else {
    deleted.forEach(t => console.log(`  ✓ Deleted: ${t.name} (${t.id})`));
  }
  if (e1 && !e1.message?.includes('Results contain 0')) console.warn('  Brand delete warning:', e1.message);
  if (e2 && !e2.message?.includes('Results contain 0')) console.warn('  Name delete warning:', e2.message);
}

// ─── Step 2: Process each PDF ────────────────────────────────────────────────

async function processPdf(filename, index) {
  const filepath = path.join(PDF_DIR, filename);
  const pdfBase64 = fs.readFileSync(filepath).toString('base64');

  console.log(`\n━━━ PDF ${index + 1}/5: ${filename} ━━━`);
  const t0 = Date.now();

  let res;
  try {
    // skipLearn=false → full learning + improvement enabled
    res = await parseDocumentSmart(pdfBase64, 'hotel', 'auto', false);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return null;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const level   = LEVEL_LABELS[res.parseLevel] || `L${res.parseLevel}`;
  const fields  = flatFields(res.result || {});
  const nFields = Object.keys(fields).length;

  console.log(`  Parse level : ${level}`);
  console.log(`  Claude calls: ${res.claudeCalls ?? '?'}`);
  console.log(`  Duration    : ${elapsed}s`);
  console.log(`  Fields found: ${nFields}`);

  if (res.matchScore !== undefined) {
    console.log(`  matchScore  : ${res.matchScore.toFixed(2)}`);
    console.log(`  applyConf   : ${res.applyConfidence?.toFixed(2) ?? 'n/a'}`);
    console.log(`  finalConf   : ${res.finalConfidence?.toFixed(2) ?? 'n/a'}`);
  }
  if (res.templateName) {
    const improved = res.templateImproved ? ' [improved]' : '';
    console.log(`  Template    : ${res.templateName}${improved} (${res.templateId})`);
  }
  if (res.learnedTemplateName) {
    console.log(`  Learned     : ${res.learnedTemplateName} (${res.learnedTemplateId})`);
  }

  // Print extracted fields
  if (nFields > 0) {
    console.log('  Extracted fields:');
    Object.entries(fields).forEach(([k, v]) => {
      const val = typeof v === 'string' && v.length > 60 ? v.slice(0, 57) + '...' : v;
      console.log(`    ${k.padEnd(36)} = ${val}`);
    });
  } else {
    console.log('  ⚠ No fields extracted');
  }

  return { filename, parseLevel: res.parseLevel, claudeCalls: res.claudeCalls, nFields, elapsed, res };
}

// ─── Step 3: Summary ─────────────────────────────────────────────────────────

function printSummary(results) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalClaude = 0;
  results.filter(Boolean).forEach((r, i) => {
    const level = LEVEL_LABELS[r.parseLevel] || `L${r.parseLevel}`;
    const claude = r.claudeCalls ?? '?';
    totalClaude += (r.claudeCalls || 0);
    const improved = r.res?.templateImproved ? ' ✨improved' : '';
    console.log(`  PDF ${i+1}: ${level.padEnd(22)} | ${String(claude).padStart(1)} AI call(s) | ${r.nFields} fields | ${r.elapsed}s${improved}`);
  });

  const valid = results.filter(Boolean);
  const aiSaved = valid.filter(r => r.parseLevel < 4).length;
  console.log(`\n  Total AI calls : ${totalClaude}`);
  console.log(`  Saved AI calls : ${aiSaved} PDFs used template (no Claude)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('SmartParse Booking.com Test — filebooking/giappone/1-5.pdf');
  console.log('=============================================================');

  await deleteBookingTemplates();

  const results = [];
  for (let i = 0; i < PDF_FILES.length; i++) {
    const r = await processPdf(PDF_FILES[i], i);
    results.push(r);
    // Brief pause between calls to avoid rate limiting
    if (i < PDF_FILES.length - 1) {
      process.stdout.write('  (waiting 2s before next PDF...)\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  printSummary(results);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
