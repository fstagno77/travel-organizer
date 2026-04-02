/**
 * US-006: Form creazione manuale — Bus
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// Sezione del codice relativa a buildBusForm
const busFormSection = formCode.slice(
  formCode.indexOf('function buildBusForm'),
  formCode.indexOf('function restoreModal')
);

// ===========================
// Tests: form bus renderizza 5 campi obbligatori
// ===========================

describe('Form bus — campi obbligatori', () => {
  test('campo città partenza presente (mbf-bus-departure-city)', () => {
    expect(formCode).toContain('mbf-bus-departure-city');
  });

  test('campo città arrivo presente (mbf-bus-arrival-city)', () => {
    expect(formCode).toContain('mbf-bus-arrival-city');
  });

  test('campo data presente (mbf-bus-date)', () => {
    expect(formCode).toContain('mbf-bus-date');
  });

  test('campo orario partenza presente (mbf-bus-departure-time)', () => {
    expect(formCode).toContain('mbf-bus-departure-time');
  });

  test('campo operatore presente (mbf-bus-operator)', () => {
    expect(formCode).toContain('mbf-bus-operator');
  });

  test('i 5 campi obbligatori usano required: true', () => {
    const requiredCount = (busFormSection.match(/required: true/g) || []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(5);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form bus — campi opzionali', () => {
  test('campo stazione/terminal partenza presente (mbf-bus-departure-station)', () => {
    expect(formCode).toContain('mbf-bus-departure-station');
  });

  test('campo stazione/terminal arrivo presente (mbf-bus-arrival-station)', () => {
    expect(formCode).toContain('mbf-bus-arrival-station');
  });

  test('campo numero rotta presente (mbf-bus-route)', () => {
    expect(formCode).toContain('mbf-bus-route');
  });

  test('campo posto presente (mbf-bus-seat)', () => {
    expect(formCode).toContain('mbf-bus-seat');
  });

  test('campo prezzo presente (mbf-bus-price)', () => {
    expect(formCode).toContain('mbf-bus-price');
  });
});

// ===========================
// Tests: validazione
// ===========================

describe('Form bus — validazione', () => {
  test('errore città partenza mancante', () => {
    expect(busFormSection).toContain('Inserisci la città di partenza');
  });

  test('errore città arrivo mancante', () => {
    expect(busFormSection).toContain('Inserisci la città di arrivo');
  });

  test('errore data mancante', () => {
    expect(busFormSection).toContain('Inserisci la data del bus');
  });

  test('errore orario partenza mancante', () => {
    expect(busFormSection).toContain('Inserisci l');
    expect(busFormSection).toContain('orario di partenza');
  });

  test('errore operatore mancante', () => {
    expect(busFormSection).toContain('Inserisci l');
    expect(busFormSection).toContain('operatore');
  });
});

// ===========================
// Tests: pulsante Salva
// ===========================

describe('Form bus — pulsante Salva', () => {
  test('pulsante "Salva bus" presente', () => {
    expect(busFormSection).toContain('Salva bus');
  });

  test('pulsante Salva disabilitato di default', () => {
    expect(busFormSection).toContain('saveBtn.disabled = true');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form bus — upload documento', () => {
  test('buildDocumentUpload è richiamato nel form bus', () => {
    expect(busFormSection).toContain('buildDocumentUpload()');
  });
});

// ===========================
// Tests: nessun <select> nativo
// ===========================

describe('Form bus — no <select> nativo', () => {
  test('nessun createElement select nel form bus', () => {
    expect(busFormSection).not.toContain("createElement('select')");
  });
});

// ===========================
// Tests: open() gestisce il tipo bus
// ===========================

describe('Form bus — integrazione con open()', () => {
  test("open() ha branch per type === 'bus'", () => {
    expect(formCode).toContain("type === 'bus'");
  });

  test("open() chiama buildBusForm per tipo bus", () => {
    expect(formCode).toContain('buildBusForm(prefill)');
  });
});

// ===========================
// Tests: getValues() struttura dati corretta
// ===========================

describe('Form bus — struttura dati getValues()', () => {
  test('getValues restituisce departureCity e arrivalCity', () => {
    expect(busFormSection).toContain('departureCity:');
    expect(busFormSection).toContain('arrivalCity:');
  });

  test('getValues restituisce operator', () => {
    expect(busFormSection).toContain('operator:');
  });

  test('getValues restituisce date e departureTime', () => {
    expect(busFormSection).toContain('date:');
    expect(busFormSection).toContain('departureTime:');
  });

  test('add-booking type bus — submit valido chiama con type bus', () => {
    expect(busFormSection).toContain("bookingType = 'bus'");
  });
});
