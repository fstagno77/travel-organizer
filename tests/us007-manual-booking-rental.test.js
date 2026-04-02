/**
 * US-007: Form creazione manuale — Noleggio auto
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// Sezione del codice relativa a buildRentalForm
const rentalFormSection = formCode.slice(
  formCode.indexOf('function buildRentalForm'),
  formCode.indexOf('function restoreModal')
);

// ===========================
// Tests: form noleggio renderizza 6 campi obbligatori
// ===========================

describe('Form noleggio — campi obbligatori', () => {
  test('campo fornitore presente (mbf-rental-provider)', () => {
    expect(formCode).toContain('mbf-rental-provider');
  });

  test('campo città ritiro presente (mbf-rental-pickup-city)', () => {
    expect(formCode).toContain('mbf-rental-pickup-city');
  });

  test('campo data ritiro presente (mbf-rental-date)', () => {
    expect(formCode).toContain('mbf-rental-date');
  });

  test('campo ora ritiro presente (mbf-rental-pickup-time)', () => {
    expect(formCode).toContain('mbf-rental-pickup-time');
  });

  test('campo data restituzione presente (mbf-rental-end-date)', () => {
    expect(formCode).toContain('mbf-rental-end-date');
  });

  test('campo ora restituzione presente (mbf-rental-dropoff-time)', () => {
    expect(formCode).toContain('mbf-rental-dropoff-time');
  });

  test('i 6 campi obbligatori usano required: true', () => {
    const requiredCount = (rentalFormSection.match(/required: true/g) || []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(6);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form noleggio — campi opzionali', () => {
  test('campo indirizzo ritiro presente (mbf-rental-pickup-address)', () => {
    expect(formCode).toContain('mbf-rental-pickup-address');
  });

  test('campo aeroporto ritiro presente (mbf-rental-pickup-airport)', () => {
    expect(formCode).toContain('mbf-rental-pickup-airport');
  });

  test('campo città restituzione presente (mbf-rental-dropoff-city)', () => {
    expect(formCode).toContain('mbf-rental-dropoff-city');
  });

  test('campo categoria veicolo presente (mbf-rental-category)', () => {
    expect(formCode).toContain('mbf-rental-category');
  });

  test('campo marca presente (mbf-rental-make)', () => {
    expect(formCode).toContain('mbf-rental-make');
  });

  test('campo modello presente (mbf-rental-model)', () => {
    expect(formCode).toContain('mbf-rental-model');
  });

  test('campo numero conferma presente (mbf-rental-confirmation)', () => {
    expect(formCode).toContain('mbf-rental-confirmation');
  });

  test('campo assicurazione presente (mbf-rental-insurance)', () => {
    expect(formCode).toContain('mbf-rental-insurance');
  });

  test('campo prezzo presente (mbf-rental-price)', () => {
    expect(formCode).toContain('mbf-rental-price');
  });
});

// ===========================
// Tests: giorni noleggio calcolati automaticamente
// ===========================

describe('Form noleggio — calcolo giorni automatico', () => {
  test('campo giorni noleggio in read-only presente (mbf-rental-days)', () => {
    expect(rentalFormSection).toContain('mbf-rental-days');
  });

  test('campo giorni è readOnly', () => {
    expect(rentalFormSection).toContain('readOnly = true');
  });

  test('funzione calcDays è presente nel file', () => {
    expect(formCode).toContain('function calcDays');
  });

  test('listener change su data ritiro per aggiornare giorni', () => {
    expect(rentalFormSection).toContain('updateDays');
  });
});

// ===========================
// Tests: validazione
// ===========================

describe('Form noleggio — validazione', () => {
  test('errore fornitore mancante', () => {
    expect(rentalFormSection).toContain('Inserisci il fornitore');
  });

  test('errore città ritiro mancante', () => {
    expect(rentalFormSection).toContain('Inserisci la città di ritiro');
  });

  test('errore data ritiro mancante', () => {
    expect(rentalFormSection).toContain('Inserisci la data di ritiro');
  });

  test('errore ora ritiro mancante', () => {
    expect(rentalFormSection).toContain('Inserisci l');
    expect(rentalFormSection).toContain('ora di ritiro');
  });

  test('errore data restituzione mancante', () => {
    expect(rentalFormSection).toContain('Inserisci la data di restituzione');
  });

  test('errore ora restituzione mancante', () => {
    expect(rentalFormSection).toContain('Inserisci l');
    expect(rentalFormSection).toContain('ora di restituzione');
  });

  test('errore data restituzione antecedente a data ritiro', () => {
    expect(rentalFormSection).toContain('successiva alla data di ritiro');
  });
});

// ===========================
// Tests: pulsante Salva
// ===========================

describe('Form noleggio — pulsante Salva', () => {
  test('pulsante "Salva noleggio" presente', () => {
    expect(rentalFormSection).toContain('Salva noleggio');
  });

  test('pulsante Salva disabilitato di default', () => {
    expect(rentalFormSection).toContain('saveBtn.disabled = true');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form noleggio — upload documento', () => {
  test('buildDocumentUpload è richiamato nel form noleggio', () => {
    expect(rentalFormSection).toContain('buildDocumentUpload()');
  });
});

// ===========================
// Tests: nessun <select> nativo
// ===========================

describe('Form noleggio — no <select> nativo', () => {
  test('nessun createElement select nel form noleggio', () => {
    expect(rentalFormSection).not.toContain("createElement('select')");
  });
});

// ===========================
// Tests: open() gestisce il tipo rental
// ===========================

describe('Form noleggio — integrazione con open()', () => {
  test("open() ha branch per type === 'rental'", () => {
    expect(formCode).toContain("type === 'rental'");
  });

  test("open() chiama buildRentalForm per tipo rental", () => {
    expect(formCode).toContain('buildRentalForm(prefill)');
  });
});

// ===========================
// Tests: getValues() struttura dati corretta
// ===========================

describe('Form noleggio — struttura dati getValues()', () => {
  test('getValues restituisce provider', () => {
    expect(rentalFormSection).toContain('provider:');
  });

  test('getValues restituisce pickupLocation con city e time', () => {
    expect(rentalFormSection).toContain('pickupLocation:');
    expect(rentalFormSection).toContain('city:');
    expect(rentalFormSection).toContain('time:');
  });

  test('getValues restituisce date e endDate', () => {
    expect(rentalFormSection).toContain('date:');
    expect(rentalFormSection).toContain('endDate:');
  });

  test('getValues restituisce dropoffLocation', () => {
    expect(rentalFormSection).toContain('dropoffLocation:');
  });

  test('form noleggio usa bookingType = rental', () => {
    expect(rentalFormSection).toContain("bookingType = 'rental'");
  });
});
