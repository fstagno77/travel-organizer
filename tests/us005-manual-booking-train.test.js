/**
 * US-005: Form creazione manuale — Treno
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// Sezione del codice relativa a buildTrainForm
const trainFormSection = formCode.slice(
  formCode.indexOf('function buildTrainForm'),
  formCode.indexOf('function restoreModal')
);

// ===========================
// Tests: form treno renderizza 8 campi obbligatori
// ===========================

describe('Form treno — campi obbligatori', () => {
  test('campo stazione partenza presente (mbf-train-departure-station)', () => {
    expect(formCode).toContain('mbf-train-departure-station');
  });

  test('campo città partenza presente (mbf-train-departure-city)', () => {
    expect(formCode).toContain('mbf-train-departure-city');
  });

  test('campo stazione arrivo presente (mbf-train-arrival-station)', () => {
    expect(formCode).toContain('mbf-train-arrival-station');
  });

  test('campo città arrivo presente (mbf-train-arrival-city)', () => {
    expect(formCode).toContain('mbf-train-arrival-city');
  });

  test('campo data presente (mbf-train-date)', () => {
    expect(formCode).toContain('mbf-train-date');
  });

  test('campo orario partenza presente (mbf-train-departure-time)', () => {
    expect(formCode).toContain('mbf-train-departure-time');
  });

  test('campo numero treno presente (mbf-train-number)', () => {
    expect(formCode).toContain('mbf-train-number');
  });

  test('campo operatore presente (mbf-train-operator)', () => {
    expect(formCode).toContain('mbf-train-operator');
  });

  test('gli 8 campi obbligatori usano required: true', () => {
    const requiredCount = (trainFormSection.match(/required: true/g) || []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(8);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form treno — campi opzionali', () => {
  test('campo orario arrivo presente (mbf-train-arrival-time)', () => {
    expect(formCode).toContain('mbf-train-arrival-time');
  });

  test('campo classe presente (mbf-train-class)', () => {
    expect(formCode).toContain('mbf-train-class');
  });

  test('campo posto presente (mbf-train-seat)', () => {
    expect(formCode).toContain('mbf-train-seat');
  });

  test('campo carrozza presente (mbf-train-coach)', () => {
    expect(formCode).toContain('mbf-train-coach');
  });

  test('campo PNR presente (mbf-train-pnr)', () => {
    expect(formCode).toContain('mbf-train-pnr');
  });

  test('campo prezzo presente (mbf-train-price)', () => {
    expect(formCode).toContain('mbf-train-price');
  });
});

// ===========================
// Tests: validazione
// ===========================

describe('Form treno — validazione', () => {
  test('errore stazione partenza mancante', () => {
    expect(trainFormSection).toContain('Inserisci la stazione di partenza');
  });

  test('errore città partenza mancante', () => {
    expect(trainFormSection).toContain('Inserisci la città di partenza');
  });

  test('errore stazione arrivo mancante', () => {
    expect(trainFormSection).toContain('Inserisci la stazione di arrivo');
  });

  test('errore città arrivo mancante', () => {
    expect(trainFormSection).toContain('Inserisci la città di arrivo');
  });

  test('errore data mancante', () => {
    expect(trainFormSection).toContain('Inserisci la data del treno');
  });

  test('errore orario partenza mancante', () => {
    expect(trainFormSection).toContain('Inserisci l');
    expect(trainFormSection).toContain('orario di partenza');
  });

  test('errore numero treno mancante', () => {
    expect(trainFormSection).toContain('Inserisci il numero del treno');
  });

  test('errore operatore mancante', () => {
    expect(trainFormSection).toContain('Inserisci l');
    expect(trainFormSection).toContain('operatore');
  });
});

// ===========================
// Tests: pulsante Salva
// ===========================

describe('Form treno — pulsante Salva', () => {
  test('pulsante "Salva treno" presente', () => {
    expect(trainFormSection).toContain('Salva treno');
  });

  test('pulsante Salva disabilitato di default', () => {
    expect(trainFormSection).toContain('saveBtn.disabled = true');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form treno — upload documento', () => {
  test('buildDocumentUpload è richiamato nel form treno', () => {
    expect(trainFormSection).toContain('buildDocumentUpload()');
  });
});

// ===========================
// Tests: nessun <select> nativo
// ===========================

describe('Form treno — no <select> nativo', () => {
  test('nessun createElement select nel form treno', () => {
    expect(trainFormSection).not.toContain("createElement('select')");
  });
});

// ===========================
// Tests: open() gestisce il tipo train
// ===========================

describe('Form treno — integrazione con open()', () => {
  test("open() ha branch per type === 'train'", () => {
    expect(formCode).toContain("type === 'train'");
  });

  test("open() chiama buildTrainForm per tipo train", () => {
    expect(formCode).toContain('buildTrainForm(prefill)');
  });
});

// ===========================
// Tests: getValues() struttura dati corretta
// ===========================

describe('Form treno — struttura dati getValues()', () => {
  test('getValues restituisce departure.station e departure.city', () => {
    expect(trainFormSection).toContain('departure:');
    expect(trainFormSection).toContain('station:');
  });

  test('getValues restituisce arrival.station e arrival.city', () => {
    expect(trainFormSection).toContain('arrival:');
  });

  test('getValues restituisce trainNumber e operator', () => {
    expect(trainFormSection).toContain('trainNumber:');
    expect(trainFormSection).toContain('operator:');
  });

  test('add-booking type train — submit valido chiama con type train', () => {
    // Verifica che il form esporta type 'train' come bookingType nel dataset
    expect(trainFormSection).toContain("bookingType = 'train'");
  });
});
