#!/usr/bin/env node
/**
 * SmartParse BETA — hotel auto-detect mock test
 */
'use strict';

require('dotenv').config();

const Module = require('module');
const origLoad = Module._load;
let callCount = 0;

Module._load = function(request, parent, isMain) {
  if (request !== '@anthropic-ai/sdk') return origLoad.apply(this, arguments);
  return class MockAnthropic {
    get messages() {
      return {
        create: async (opts) => {
          callCount++;
          const content = opts.messages[0]?.content;
          const prompt = Array.isArray(content) ? (content[1]?.text || '') : (content || '');
          const isTemplateGen = prompt.includes('generate a regex template');
          console.log(`  [Claude mock #${callCount}] ${isTemplateGen ? 'Template generation' : 'Data extraction'}`);

          if (isTemplateGen) {
            return { content: [{ text: JSON.stringify({
              name: 'Booking.com Hotel (mock)',
              match_rules: { all: ['booking', 'hotel', 'confirmation'], any: ['check-in', 'check-out', 'nights', 'guest'] },
              field_rules: [
                { path: 'hotels[0].name', regex: 'Hotel:\\s*([^\\n]+)', flags: 'im', group: 1, type: 'string' },
                { path: 'hotels[0].confirmationNumber', regex: 'Confirmation:\\s*(\\S+)', flags: 'im', group: 1, type: 'string' }
              ],
              collections: []
            }) }] };
          }

          // Hotel document extraction (Claude correctly detects type)
          return { content: [{ text: JSON.stringify({
            _rawText: 'Booking Confirmation\nHotel: Chicago Marriott\nCheck-in: 2024-08-31\nCheck-out: 2024-09-07\nConfirmation: BK7654321\nGuest: STAGNO FERDINANDO\nNights: 7\nRoom: Deluxe King',
            _docType: 'hotel',
            hotels: [{
              name: 'Chicago Marriott Downtown',
              address: { street: 'Michigan Ave', city: 'Chicago', postalCode: '60601', country: 'USA', fullAddress: '540 N Michigan Ave, Chicago, IL 60601' },
              checkIn:  { date: '2024-08-31', time: '15:00' },
              checkOut: { date: '2024-09-07', time: '11:00' },
              nights: 7,
              rooms: 1,
              roomTypes: [{ it: 'Deluxe King', en: 'Deluxe King' }],
              guests: { adults: 2, children: [], total: 2 },
              guestName: 'STAGNO FERDINANDO',
              confirmationNumber: 'BK7654321',
              price: { room: { value: 1050, currency: 'USD' }, tax: { value: 105, currency: 'USD' }, total: { value: 1155, currency: 'USD' } },
              breakfast: { included: false, type: null },
              cancellation: { freeCancellationUntil: '2024-08-28', penaltyAfter: null },
              source: 'Booking.com'
            }]
          }) }] };
        }
      };
    }
  };
};

const fs = require('fs');
const { parseDocumentSmart, listTemplates } = require('../netlify/functions/utils/smartParser');

const OK   = '\x1b[32m✅\x1b[0m';
const FAIL  = '\x1b[31m❌\x1b[0m';

async function run() {
  const pdfPath  = 'filebooking/america/Chicago Booking.com_ Conferma.pdf';
  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');

  console.log('\n\x1b[1m═══ SmartParse HOTEL AUTO-DETECT TEST ══════════════════\x1b[0m');
  console.log(`  PDF: ${pdfPath}`);
  console.log('  DocType: auto | Mode: auto (full cascade)\n');

  const failures = [];

  // PASS 1
  console.log('\x1b[36m── PASS 1: Hotel upload (expect Level 4 + hotel detection)\x1b[0m');
  callCount = 0;
  const r1 = await parseDocumentSmart(pdfBase64, 'auto', 'auto');
  console.log(`  Level: ${r1.parseLevel} | Claude calls: ${r1.claudeCalls} | Detected: ${r1.detectedDocType}`);
  console.log(`  Template saved: ${r1.templateSaved} "${r1.learnedTemplateName || ''}"`);

  const hotels1 = r1.result?.hotels || [];
  if (hotels1.length > 0) {
    console.log(`  ${OK} Hotels extracted: ${hotels1.map(h => h.name).join(', ')}`);
  } else {
    console.log(`  ${FAIL} No hotels extracted`);
    failures.push('PASS 1: no hotels in result');
  }
  if (r1.parseLevel === 4) { console.log(`  ${OK} Level 4`); }
  else { console.log(`  ${FAIL} Expected Level 4, got ${r1.parseLevel}`); failures.push(`PASS 1: level ${r1.parseLevel}`); }

  if (r1.detectedDocType === 'hotel') { console.log(`  ${OK} Detected as hotel`); }
  else { console.log(`  ${FAIL} detectedDocType = ${r1.detectedDocType}`); failures.push(`PASS 1: wrong type ${r1.detectedDocType}`); }

  if (r1.templateSaved) { console.log(`  ${OK} Template saved`); }
  else { console.log(`  ${FAIL} Template NOT saved`); failures.push('PASS 1: template not saved'); return summary(failures); }

  await new Promise(r => setTimeout(r, 800));

  // PASS 2
  console.log('\n\x1b[36m── PASS 2: Same hotel doc (expect Level 1, 0 Claude calls)\x1b[0m');
  callCount = 0;
  const r2 = await parseDocumentSmart(pdfBase64, 'auto', 'auto');
  console.log(`  Level: ${r2.parseLevel} | Claude calls: ${r2.claudeCalls} | Detected: ${r2.detectedDocType}`);

  if (r2.parseLevel === 1) { console.log(`  ${OK} Level 1 cache hit`); }
  else { console.log(`  ${FAIL} Expected Level 1, got ${r2.parseLevel}`); failures.push(`PASS 2: level ${r2.parseLevel}`); }

  if (r2.claudeCalls === 0) { console.log(`  ${OK} 0 Claude calls`); }
  else { console.log(`  ${FAIL} Expected 0 calls, got ${r2.claudeCalls}`); failures.push(`PASS 2: ${r2.claudeCalls} calls`); }

  const hotels2 = r2.result?.hotels || [];
  if (hotels2.length > 0) { console.log(`  ${OK} Hotels in cached result: ${hotels2.map(h => h.name).join(', ')}`); }
  else { console.log(`  ${FAIL} No hotels in cached result`); failures.push('PASS 2: no hotels cached'); }

  if (r2.detectedDocType === 'hotel') { console.log(`  ${OK} Detected as hotel from cache`); }

  const templates = await listTemplates();
  console.log(`\n  Templates in DB: ${templates.length}`);
  templates.forEach(t => console.log(`    • [${t.doc_type}] ${t.name}`));

  summary(failures);
}

function summary(failures) {
  console.log('\n\x1b[1m═══ SUMMARY ════════════════════════════════════════════\x1b[0m');
  if (failures.length === 0) { console.log('  \x1b[32m✅ ALL TESTS PASSED\x1b[0m\n'); process.exit(0); }
  else { console.log('  \x1b[31m❌ FAILURES:\x1b[0m'); failures.forEach(f => console.log('    -', f)); console.log(''); process.exit(1); }
}

run().catch(err => { console.error('\x1b[31m❌ Fatal:\x1b[0m', err.message, '\n', err.stack); process.exit(1); });
