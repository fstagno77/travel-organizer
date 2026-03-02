#!/usr/bin/env node
/**
 * SmartParse BETA — local test script
 *
 * Usage:
 *   node scripts/test-smartparse.js [flight|hotel|auto] [pdfPath]
 *
 * Example:
 *   node scripts/test-smartparse.js auto "filebooking/giappone/1.pdf"
 *   node scripts/test-smartparse.js auto "filebooking/america/Chicago Booking.com_ Conferma.pdf"
 *
 * Requires: .env file with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const [,, docType = 'auto', pdfPath] = process.argv;

if (!pdfPath) {
  console.error('Usage: node scripts/test-smartparse.js [flight|hotel|auto] <pdfPath>');
  process.exit(1);
}

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

function c(color, text) { return ANSI[color] + text + ANSI.reset; }

async function run() {
  const { parseDocumentSmart, listTemplates } = require('../netlify/functions/utils/smartParser');

  const absPath = path.resolve(pdfPath);
  if (!fs.existsSync(absPath)) {
    console.error(c('red', `❌ File not found: ${absPath}`));
    process.exit(1);
  }

  const pdfBase64 = fs.readFileSync(absPath).toString('base64');
  console.log(c('bold', `\n═══ SmartParse TEST ══════════════════════════════`));
  console.log(`  File:    ${path.basename(absPath)}`);
  console.log(`  DocType: ${docType}`);
  console.log(`  Mode:    auto (full cascade)\n`);

  // ── PASS 1: First upload (should hit Level 4 and learn a template) ──────────
  console.log(c('cyan', '── PASS 1: First upload (expect Level 4 + template save)'));
  const start1 = Date.now();
  let pass1;
  try {
    pass1 = await parseDocumentSmart(pdfBase64, docType, 'auto');
  } catch (err) {
    console.error(c('red', `❌ PASS 1 FAILED: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
  }
  const dur1 = Date.now() - start1;

  printResult('PASS 1', pass1, dur1);

  const pass1ok = pass1.parseLevel === 4;
  const templateSaved = pass1.templateSaved === true;
  console.log(pass1ok
    ? c('green', '  ✅ Level 4 as expected')
    : c('yellow', `  ⚠ Expected Level 4, got Level ${pass1.parseLevel}`));
  console.log(templateSaved
    ? c('green', `  ✅ Template saved: "${pass1.learnedTemplateName}"`)
    : c('red', `  ❌ Template NOT saved: ${pass1.templateSaveError || '(no error detail)'}`));

  if (!templateSaved) {
    console.log(c('yellow', '\n  Skipping PASS 2 since no template was saved.'));
    process.exit(0);
  }

  // Small pause to let Supabase propagate the write
  await new Promise(r => setTimeout(r, 1000));

  // ── PASS 2: Same doc again (should hit Level 1 or Level 2) ──────────────────
  console.log(c('cyan', '\n── PASS 2: Same doc again (expect Level 1 or 2, 0 Claude calls)'));
  const start2 = Date.now();
  let pass2;
  try {
    pass2 = await parseDocumentSmart(pdfBase64, docType, 'auto');
  } catch (err) {
    console.error(c('red', `❌ PASS 2 FAILED: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
  }
  const dur2 = Date.now() - start2;

  printResult('PASS 2', pass2, dur2);

  const pass2ok = [1, 2].includes(pass2.parseLevel) && pass2.claudeCalls === 0;
  console.log(pass2ok
    ? c('green', `  ✅ Level ${pass2.parseLevel} — 0 Claude calls`)
    : c('red', `  ❌ Expected Level 1 or 2, got Level ${pass2.parseLevel} with ${pass2.claudeCalls} Claude calls`));

  // ── Result comparison ────────────────────────────────────────────────────────
  console.log(c('bold', '\n── Data comparison ──'));
  const r1 = pass1.result;
  const r2 = pass2.result;
  const same = JSON.stringify(r1) === JSON.stringify(r2);
  console.log(same
    ? c('green', '  ✅ Same result in both passes')
    : c('yellow', '  ⚠ Results differ between passes:'));
  if (!same) {
    console.log('  PASS 1:', JSON.stringify(r1, null, 2).substring(0, 500));
    console.log('  PASS 2:', JSON.stringify(r2, null, 2).substring(0, 500));
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(c('bold', '\n═══ SUMMARY ══════════════════════════════════════'));
  const allOk = pass1ok && templateSaved && pass2ok && same;
  if (allOk) {
    console.log(c('green', '  ✅ ALL TESTS PASSED'));
  } else {
    console.log(c('red', '  ❌ SOME TESTS FAILED — see above for details'));
  }

  // List current templates in DB
  try {
    const templates = await listTemplates();
    console.log(c('bold', `\n── Templates in DB (${templates.length}): ──`));
    templates.forEach(t => {
      console.log(`  • [${t.doc_type.padEnd(6)}] ${t.name} — usage:${t.usage_count} src:${t.source}`);
    });
  } catch (e) {
    console.log(c('gray', `  (could not list templates: ${e.message})`));
  }

  console.log('');
  process.exit(allOk ? 0 : 1);
}

function printResult(label, r, durationMs) {
  const LEVEL_NAMES = { 1: 'Cache esatta', 2: 'Template regex', 3: 'Parser classico', 4: 'Claude API' };
  console.log(`  ${c('bold', `[${label}]`)} Level ${r.parseLevel} — ${LEVEL_NAMES[r.parseLevel] || '?'} | ${durationMs}ms | ${r.claudeCalls ?? 0} Claude call(s)`);
  if (r.detectedDocType) console.log(`  Detected type: ${r.detectedDocType}`);
  if (r.templateName) console.log(`  Template: "${r.templateName}"`);
  const data = r.result || {};
  const flights = data.flights || [];
  const hotels  = data.hotels  || [];
  if (flights.length) {
    console.log(`  Flights: ${flights.map(f => `${f.flightNumber || '?'} (${f.departure?.code || '?'}→${f.arrival?.code || '?'})`).join(', ')}`);
  }
  if (hotels.length) {
    console.log(`  Hotels: ${hotels.map(h => `${h.name || '?'} (${h.checkIn?.date || '?'} – ${h.checkOut?.date || '?'})`).join(', ')}`);
  }
  if (!flights.length && !hotels.length) {
    console.log(`  ${c('yellow', '⚠ No flights or hotels extracted')}`);
    console.log(`  ${c('gray', 'Raw result:')}`);
    console.log('  ' + JSON.stringify(data, null, 2).split('\n').slice(0, 20).join('\n  '));
  }
}

run().catch(err => {
  console.error(c('red', `\n❌ Unhandled error: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
