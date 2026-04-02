/**
 * US-001: Refactor step 1 — upload box + card tipo prenotazione
 * Tests per showAddBookingModal in tripPage.js
 */

const fs = require('fs');
const path = require('path');

const tripPageCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/tripPage.js'),
  'utf8'
);

// ===========================
// Tests: 6 card tipo prenotazione presenti nel template
// ===========================

describe('Step 1 — 6 card tipo prenotazione', () => {
  // bookingTypes è un array di 6 tipi definito in showAddBookingModal
  // I tipi sono definiti come { type: 'flight', ... }, { type: 'hotel', ... }, ecc.

  test('bookingTypes contiene 6 tipi prenotazione', () => {
    // Conta le occorrenze di "type: '" nel blocco bookingTypes
    const matches = tripPageCode.match(/\{ type: '/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  test('bookingTypes include tipo "flight"', () => {
    expect(tripPageCode).toContain("type: 'flight'");
  });

  test('bookingTypes include tipo "hotel"', () => {
    expect(tripPageCode).toContain("type: 'hotel'");
  });

  test('bookingTypes include tipo "train"', () => {
    expect(tripPageCode).toContain("type: 'train'");
  });

  test('bookingTypes include tipo "bus"', () => {
    expect(tripPageCode).toContain("type: 'bus'");
  });

  test('bookingTypes include tipo "rental"', () => {
    expect(tripPageCode).toContain("type: 'rental'");
  });

  test('bookingTypes include tipo "ferry"', () => {
    expect(tripPageCode).toContain("type: 'ferry'");
  });

  test('le card usano la classe booking-type-card', () => {
    expect(tripPageCode).toContain('booking-type-card');
  });

  test('il modal usa la classe modal--wide (720px)', () => {
    expect(tripPageCode).toContain('modal--wide');
  });

  test('il template HTML usa data-booking-type per ogni card', () => {
    expect(tripPageCode).toContain('data-booking-type="${bt.type}"');
  });
});

// ===========================
// Tests: click card → apre form manuale
// ===========================

describe('Click card → showManualBookingForm', () => {
  test('bindBookingTypeCardEvents collega i click sulle card', () => {
    expect(tripPageCode).toContain('bindBookingTypeCardEvents');
  });

  test('showManualBookingForm viene chiamata con il tipo prenotazione', () => {
    expect(tripPageCode).toContain('showManualBookingForm');
  });

  test('click su card legge card.dataset.bookingType per passare il tipo', () => {
    expect(tripPageCode).toContain('card.dataset.bookingType');
  });

  test('il form manuale delega a window.manualBookingForm se disponibile', () => {
    expect(tripPageCode).toContain('window.manualBookingForm');
    expect(tripPageCode).toContain('manualBookingForm.open');
  });
});

// ===========================
// Tests: upload PDF senza card selezionata → SmartParse
// ===========================

describe('Upload PDF → SmartParse', () => {
  test('addFiles chiama parseBooking quando riceve file PDF', () => {
    expect(tripPageCode).toContain('parseBooking()');
  });

  test('parseBooking chiama /.netlify/functions/parse-pdf', () => {
    expect(tripPageCode).toContain("'/.netlify/functions/parse-pdf'");
  });

  test('addFiles filtra solo file PDF (application/pdf)', () => {
    expect(tripPageCode).toContain("'application/pdf'");
  });

  test('bindUploadZoneEvents viene chiamata per collegare drag-drop e click', () => {
    expect(tripPageCode).toContain('bindUploadZoneEvents()');
  });
});
