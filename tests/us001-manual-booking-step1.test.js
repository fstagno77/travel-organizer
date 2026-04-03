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
// Tests: bottone "Continua" disabilitato al render iniziale
// ===========================

describe('Bottone Continua — stato iniziale disabilitato', () => {
  test('il footer contiene un bottone con id add-booking-continue', () => {
    expect(tripPageCode).toContain('add-booking-continue');
  });

  test('il bottone Continua è disabled al render iniziale', () => {
    // Il bottone deve avere l'attributo disabled nel template HTML
    const modalHtmlMatch = tripPageCode.match(/id="add-booking-continue"[^>]*/);
    expect(modalHtmlMatch).not.toBeNull();
    expect(modalHtmlMatch[0]).toContain('disabled');
  });

  test('la variabile _selectedBookingType è inizializzata a null', () => {
    expect(tripPageCode).toContain('_selectedBookingType = null');
  });
});

// ===========================
// Tests: click card → selezione visiva + abilita Continua (no avanzamento auto)
// ===========================

describe('Click card → selezione visiva, niente avanzamento automatico', () => {
  test('bindBookingTypeCardEvents collega i click sulle card', () => {
    expect(tripPageCode).toContain('bindBookingTypeCardEvents');
  });

  test('click su card aggiunge classe booking-type-card--selected', () => {
    expect(tripPageCode).toContain('booking-type-card--selected');
  });

  test('click su card imposta _selectedBookingType', () => {
    expect(tripPageCode).toContain('_selectedBookingType = bookingType');
  });

  test('click su card abilita il bottone Continua', () => {
    // Il bottone deve essere abilitato dopo la selezione card
    expect(tripPageCode).toContain("continueBtn) continueBtn.disabled = false");
  });

  test('showManualBookingForm non viene chiamata direttamente al click card', () => {
    // showManualBookingForm è chiamata solo dal listener di Continua
    const bindCardFnStart = tripPageCode.indexOf('const bindBookingTypeCardEvents');
    const bindCardFnEnd = tripPageCode.indexOf('\n    // Upload zone events');
    const bindCardCode = bindCardFnStart > -1 && bindCardFnEnd > -1
      ? tripPageCode.slice(bindCardFnStart, bindCardFnEnd)
      : '';
    expect(bindCardCode).not.toContain('showManualBookingForm(');
  });

  test('click su card legge card.dataset.bookingType', () => {
    expect(tripPageCode).toContain('card.dataset.bookingType');
  });

  test('il form manuale delega a window.manualBookingForm se disponibile', () => {
    expect(tripPageCode).toContain('window.manualBookingForm');
    expect(tripPageCode).toContain('manualBookingForm.open');
  });
});

// ===========================
// Tests: upload PDF → abilita Continua (no avanzamento auto)
// ===========================

describe('Upload PDF → abilita Continua, niente avanzamento automatico', () => {
  test('addFiles NON chiama parseBooking() direttamente', () => {
    // Isola la funzione addFiles
    const addFilesFnStart = tripPageCode.indexOf('const addFiles = (fileListInput)');
    const addFilesFnEnd = tripPageCode.indexOf('\n    /** Step 1: Upload and parse with SmartParse */');
    const addFilesCode = addFilesFnStart > -1 && addFilesFnEnd > -1
      ? tripPageCode.slice(addFilesFnStart, addFilesFnEnd)
      : '';
    expect(addFilesCode).not.toContain('parseBooking()');
  });

  test('addFiles abilita il bottone Continua dopo selezione file', () => {
    const addFilesFnStart = tripPageCode.indexOf('const addFiles = (fileListInput)');
    const addFilesFnEnd = tripPageCode.indexOf('\n    /** Step 1: Upload and parse with SmartParse */');
    const addFilesCode = addFilesFnStart > -1 && addFilesFnEnd > -1
      ? tripPageCode.slice(addFilesFnStart, addFilesFnEnd)
      : '';
    expect(addFilesCode).toContain('add-booking-continue');
    expect(addFilesCode).toContain('disabled = false');
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

// ===========================
// Tests: bottone Continua → dispatcha azione corretta
// ===========================

describe('Bottone Continua — dispatcha azione corretta', () => {
  test('il listener di Continua chiama parseBooking se files.length > 0', () => {
    const continueBtnListenerStart = tripPageCode.indexOf("continueBtn?.addEventListener('click'");
    const continueBtnListenerEnd = tripPageCode.indexOf('\n    // Modal events');
    const continueBtnCode = continueBtnListenerStart > -1 && continueBtnListenerEnd > -1
      ? tripPageCode.slice(continueBtnListenerStart, continueBtnListenerEnd)
      : '';
    expect(continueBtnCode).toContain('files.length > 0');
    expect(continueBtnCode).toContain('parseBooking()');
  });

  test('il listener di Continua chiama showManualBookingForm se _selectedBookingType è impostato', () => {
    const continueBtnListenerStart = tripPageCode.indexOf("continueBtn?.addEventListener('click'");
    const continueBtnListenerEnd = tripPageCode.indexOf('\n    // Modal events');
    const continueBtnCode = continueBtnListenerStart > -1 && continueBtnListenerEnd > -1
      ? tripPageCode.slice(continueBtnListenerStart, continueBtnListenerEnd)
      : '';
    expect(continueBtnCode).toContain('_selectedBookingType');
    expect(continueBtnCode).toContain('showManualBookingForm(_selectedBookingType)');
  });
});
