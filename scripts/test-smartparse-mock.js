#!/usr/bin/env node
/**
 * SmartParse BETA — mock test (no real Claude API calls)
 * Simulates Claude responses to test the full cascade end-to-end.
 */
'use strict';

require('dotenv').config();

// Mock Anthropic SDK before anything else
const Module = require('module');
const origLoad = Module._load;
let claudeCallCount = 0;

Module._load = function(request, parent, isMain) {
  if (request !== '@anthropic-ai/sdk') return origLoad.apply(this, arguments);
  // Return the class directly (same as real SDK's require())
  return class MockAnthropic {
      get messages() {
        return {
          create: async (opts) => {
            claudeCallCount++;
            const prompt = opts.messages[0]?.content?.[1]?.text || '';
            const isAutoDetect = prompt.includes('_docType');
            const isTemplateGen = prompt.includes('generate a regex template');
            console.log(`  [Claude mock #${claudeCallCount}] ${isTemplateGen ? 'Template generation' : isAutoDetect ? 'Auto-detect extraction' : 'Explicit extraction'}`);

            if (isTemplateGen) {
              // Template generation response
              return { content: [{ text: JSON.stringify({
                name: 'ITA Airways Flight (mock)',
                match_rules: { all: ['ita', 'airways', 'mxp'], any: ['nrt', 'boarding', 'passenger', 'ticket'] },
                field_rules: [
                  { path: 'flights[0].flightNumber', regex: 'FLIGHT:\\s*(\\S+)', flags: 'im', group: 1, type: 'string' },
                  { path: 'passenger.name', regex: 'PASSENGER:\\s*([A-Z\\s]+)', flags: 'im', group: 1, type: 'string' }
                ],
                collections: []
              }) }] };
            }

            // Data extraction response (flight)
            return { content: [{ text: JSON.stringify({
              _rawText: 'PASSENGER: STAGNO FRANCESCO\nFLIGHT: AZ610 MXP-NRT\nDATE: 2024-06-15\nSEAT: 12A\nTICKET: 055-1234567890',
              _docType: 'flight',
              flights: [{
                date: '2024-06-15',
                flightNumber: 'AZ610',
                airline: 'ITA Airways',
                operatedBy: null,
                departure: { code: 'MXP', city: 'Milano', airport: 'Malpensa', terminal: null },
                arrival:   { code: 'NRT', city: 'Tokyo', airport: 'Narita', terminal: null },
                departureTime: '10:30',
                arrivalTime: '06:00',
                arrivalNextDay: true,
                duration: null,
                class: 'Economy',
                bookingReference: 'ABC123',
                ticketNumber: '055-1234567890',
                seat: '12A',
                baggage: null,
                status: 'OK'
              }],
              passenger: { name: 'STAGNO FRANCESCO', type: 'ADT', ticketNumber: '055-1234567890' },
              booking: { reference: 'ABC123', ticketNumber: null, issueDate: null, totalAmount: null }
            }) }] };
          }
        };
      }
    };
};
// End of mock

const fs = require('fs');
const { parseDocumentSmart, listTemplates } = require('../netlify/functions/utils/smartParser');

const OK  = '\x1b[32m✅\x1b[0m';
const FAIL = '\x1b[31m❌\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

async function run() {
  const pdfBase64 = fs.readFileSync('filebooking/giappone/1.pdf').toString('base64');

  console.log('\n\x1b[1m═══ SmartParse MOCK TEST ═══════════════════════════════\x1b[0m');
  console.log('  PDF: filebooking/giappone/1.pdf');
  console.log('  DocType: auto | Mode: auto (full cascade)');

  const failures = [];

  // ── PASS 1: First upload → Level 4, template learned ──────────────────────
  console.log('\n\x1b[36m── PASS 1: First upload (expect Level 4 + template save)\x1b[0m');
  claudeCallCount = 0;
  const r1 = await parseDocumentSmart(pdfBase64, 'auto', 'auto');
  console.log(`  Level: ${r1.parseLevel} | Claude calls: ${r1.claudeCalls} | Detected: ${r1.detectedDocType}`);
  console.log(`  Template saved: ${r1.templateSaved} "${r1.learnedTemplateName || ''}"`);
  if (r1.templateSaveError) console.log(`  Save error: ${r1.templateSaveError}`);

  const flights1 = r1.result?.flights || [];
  if (flights1.length > 0) {
    console.log(`  ${OK} Flights extracted: ${flights1.map(f => f.flightNumber).join(', ')}`);
  } else {
    console.log(`  ${FAIL} No flights extracted`);
    failures.push('PASS 1: no flights in result');
  }

  if (r1.parseLevel === 4) {
    console.log(`  ${OK} Level 4 as expected`);
  } else {
    console.log(`  ${FAIL} Expected Level 4, got Level ${r1.parseLevel}`);
    failures.push(`PASS 1: expected level 4, got ${r1.parseLevel}`);
  }

  if (r1.detectedDocType === 'flight') {
    console.log(`  ${OK} Detected as flight`);
  } else {
    console.log(`  ${FAIL} detectedDocType = ${r1.detectedDocType}`);
    failures.push(`PASS 1: wrong detectedDocType: ${r1.detectedDocType}`);
  }

  if (r1.templateSaved) {
    console.log(`  ${OK} Template saved`);
  } else {
    console.log(`  ${FAIL} Template NOT saved: ${r1.templateSaveError}`);
    failures.push(`PASS 1: template not saved: ${r1.templateSaveError}`);
    console.log('\nSkipping PASS 2 (no template to test).');
    summary(failures); return;
  }

  // Wait for Supabase to propagate
  await new Promise(r => setTimeout(r, 800));

  // ── PASS 2: Same doc → Level 1, 0 Claude calls ────────────────────────────
  console.log('\n\x1b[36m── PASS 2: Same doc (expect Level 1 cache hit, 0 Claude calls)\x1b[0m');
  claudeCallCount = 0;
  const r2 = await parseDocumentSmart(pdfBase64, 'auto', 'auto');
  console.log(`  Level: ${r2.parseLevel} | Claude calls: ${r2.claudeCalls} | Detected: ${r2.detectedDocType}`);

  if (r2.parseLevel === 1) {
    console.log(`  ${OK} Level 1 cache hit`);
  } else {
    console.log(`  ${FAIL} Expected Level 1, got Level ${r2.parseLevel}`);
    failures.push(`PASS 2: expected level 1, got ${r2.parseLevel}`);
  }

  if (r2.claudeCalls === 0) {
    console.log(`  ${OK} 0 Claude calls`);
  } else {
    console.log(`  ${FAIL} Expected 0 Claude calls, got ${r2.claudeCalls}`);
    failures.push(`PASS 2: expected 0 claude calls, got ${r2.claudeCalls}`);
  }

  const flights2 = r2.result?.flights || [];
  if (flights2.length > 0) {
    console.log(`  ${OK} Flights in cached result: ${flights2.map(f => f.flightNumber).join(', ')}`);
  } else {
    console.log(`  ${FAIL} No flights in cached result`);
    failures.push('PASS 2: no flights in cached result');
  }

  const dataMatch = JSON.stringify(r1.result) === JSON.stringify(r2.result);
  if (dataMatch) {
    console.log(`  ${OK} Identical data in both passes`);
  } else {
    console.log(`  ${WARN} Data differs between passes (OK if Level 1 stores full result)`);
  }

  summary(failures);
}

function summary(failures) {
  console.log('\n\x1b[1m═══ SUMMARY ═══════════════════════════════════════════\x1b[0m');
  if (failures.length === 0) {
    console.log('  \x1b[32m✅ ALL TESTS PASSED\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('  \x1b[31m❌ FAILURES:\x1b[0m');
    failures.forEach(f => console.log('    -', f));
    console.log('');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('\x1b[31m❌ Fatal:\x1b[0m', err.message);
  console.error(err.stack);
  process.exit(1);
});
