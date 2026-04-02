/**
 * US-009: SmartParse fallback a creazione manuale
 * Tests per tripPage.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const tripPageCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/tripPage.js'),
  'utf8'
);

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// Isola la sezione showSmartParseFallback
const fallbackFnStart = tripPageCode.indexOf('const showSmartParseFallback');
const fallbackFnEnd = tripPageCode.indexOf('\n    /** Collega i click sulle card tipo prenotazione */');
const fallbackFnCode = fallbackFnStart > -1 && fallbackFnEnd > -1
  ? tripPageCode.slice(fallbackFnStart, fallbackFnEnd)
  : '';

// Isola la sezione parseBooking
const parseBookingStart = tripPageCode.indexOf('const parseBooking = async ()');
const parseBookingEnd = tripPageCode.indexOf('\n    /** Step 2: Confirm and save */');
const parseBookingCode = parseBookingStart > -1 && parseBookingEnd > -1
  ? tripPageCode.slice(parseBookingStart, parseBookingEnd)
  : '';

// ===========================
// Tests: showSmartParseFallback esiste
// ===========================

describe('US-009 — showSmartParseFallback', () => {
  test('la funzione showSmartParseFallback è definita in tripPage.js', () => {
    expect(tripPageCode).toContain('const showSmartParseFallback');
  });

  test('ripristina step 1 (originalBodyContent)', () => {
    expect(fallbackFnCode).toContain('originalBodyContent');
    expect(fallbackFnCode).toContain('modalBody.innerHTML = originalBodyContent');
  });

  test('mostra il messaggio fallback SmartParse', () => {
    expect(fallbackFnCode).toContain('smartparse-fallback-message');
    expect(fallbackFnCode).toContain('Documento non riconosciuto automaticamente');
    expect(fallbackFnCode).toContain('Seleziona il tipo di prenotazione per continuare');
  });

  test('inserisce il messaggio nella sezione booking-type-section', () => {
    expect(fallbackFnCode).toContain('booking-type-section');
    expect(fallbackFnCode).toContain('insertBefore');
  });

  test('gestisce il tipo parziale rilevato (partialResult.detectedDocType)', () => {
    expect(fallbackFnCode).toContain('partialResult?.detectedDocType');
  });

  test('mappa car_rental → rental', () => {
    expect(fallbackFnCode).toContain('car_rental');
    expect(fallbackFnCode).toContain('rental');
  });

  test('pre-seleziona la card visivamente con classe booking-type-card--selected', () => {
    expect(fallbackFnCode).toContain('booking-type-card--selected');
  });

  test('apre il form manuale con prefill e prefillDocStoragePath', () => {
    expect(fallbackFnCode).toContain('window.manualBookingForm.open');
    expect(fallbackFnCode).toContain('prefill: prefillData');
    expect(fallbackFnCode).toContain('prefillDocStoragePath');
  });
});

// ===========================
// Tests: parseBooking — rilevamento docType sconosciuto
// ===========================

describe('US-009 — parseBooking: fallback per docType sconosciuto', () => {
  test('controlla se tutti i risultati hanno docType sconosciuto (hasKnownType)', () => {
    expect(parseBookingCode).toContain('hasKnownType');
    expect(parseBookingCode).toContain('detectedDocType');
  });

  test('controlla se ci sono dati nei risultati (hasData)', () => {
    expect(parseBookingCode).toContain('hasData');
    expect(parseBookingCode).toContain('dataKeys');
  });

  test('chiama showSmartParseFallback quando non ci sono dati', () => {
    expect(parseBookingCode).toContain('showSmartParseFallback');
    expect(parseBookingCode).toContain('!hasData');
  });

  test('intercetta errore 400 "no travel data" e mostra fallback', () => {
    expect(parseBookingCode).toContain('travel data');
    expect(parseBookingCode).toContain('noTravelData');
  });
});

// ===========================
// Tests: parseBooking — docType='flight' con dati parziali
// ===========================

describe('US-009 — parseBooking: pre-popolamento form con dati parziali', () => {
  test('passa partialResult al fallback quando tipo è rilevato ma senza dati', () => {
    expect(parseBookingCode).toContain('partialResult');
    expect(parseBookingCode).toContain('hasKnownType');
  });

  test('estrae prefill dal parsedResult parziale', () => {
    expect(fallbackFnCode).toContain('collectionKey');
    expect(fallbackFnCode).toContain('prefillData');
  });

  test('usa la collection corretta per estrarre dati (flights, hotels, etc.)', () => {
    expect(fallbackFnCode).toContain('rentals');
    expect(fallbackFnCode).toContain('collectionKey');
  });
});

// ===========================
// Tests: manualBookingForm — supporto prefillDocStoragePath
// ===========================

describe('US-009 — manualBookingForm: supporto documento da storage', () => {
  test('open() accetta prefillDocStoragePath da opts', () => {
    expect(formCode).toContain('prefillDocStoragePath');
  });

  test('saveManualBooking accetta fallbackDocStoragePath come parametro', () => {
    expect(formCode).toContain('fallbackDocStoragePath');
  });

  test('usa il percorso storage come documentUrl se non c\'è file', () => {
    expect(formCode).toContain('fallbackDocStoragePath');
    expect(formCode).toContain('documentUrl = fallbackDocStoragePath');
  });

  test('passa prefillDocStoragePath a saveManualBooking', () => {
    const openFnStart = formCode.indexOf('function open(type');
    const openFnEnd = formCode.indexOf('\n  return { open };');
    const openCode = openFnStart > -1 && openFnEnd > -1
      ? formCode.slice(openFnStart, openFnEnd)
      : formCode;
    expect(openCode).toContain('prefillDocStoragePath');
    expect(openCode).toContain('saveManualBooking(tripId, type, manualData, docFile, prefillDocStoragePath)');
  });
});
