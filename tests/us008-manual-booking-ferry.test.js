/**
 * US-008: Form creazione manuale — Traghetto
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// Sezione del codice relativa a buildFerryForm
const ferryFormSection = formCode.slice(
  formCode.indexOf('function buildFerryForm'),
  formCode.indexOf('function restoreModal')
);

// ===========================
// Tests: form traghetto renderizza 7 campi obbligatori
// ===========================

describe('Form traghetto — campi obbligatori', () => {
  test('campo operatore presente (mbf-ferry-operator)', () => {
    expect(formCode).toContain('mbf-ferry-operator');
  });

  test('campo porto partenza presente (mbf-ferry-dep-port)', () => {
    expect(formCode).toContain('mbf-ferry-dep-port');
  });

  test('campo città partenza presente (mbf-ferry-dep-city)', () => {
    expect(formCode).toContain('mbf-ferry-dep-city');
  });

  test('campo porto arrivo presente (mbf-ferry-arr-port)', () => {
    expect(formCode).toContain('mbf-ferry-arr-port');
  });

  test('campo città arrivo presente (mbf-ferry-arr-city)', () => {
    expect(formCode).toContain('mbf-ferry-arr-city');
  });

  test('campo data presente (mbf-ferry-date)', () => {
    expect(formCode).toContain('mbf-ferry-date');
  });

  test('campo orario partenza presente (mbf-ferry-dep-time)', () => {
    expect(formCode).toContain('mbf-ferry-dep-time');
  });

  test('i 7 campi obbligatori usano required: true', () => {
    const requiredCount = (ferryFormSection.match(/required: true/g) || []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(7);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form traghetto — campi opzionali', () => {
  test('campo orario arrivo presente (mbf-ferry-arr-time)', () => {
    expect(formCode).toContain('mbf-ferry-arr-time');
  });

  test('campo nome nave presente (mbf-ferry-ship-name)', () => {
    expect(formCode).toContain('mbf-ferry-ship-name');
  });

  test('campo numero rotta presente (mbf-ferry-route)', () => {
    expect(formCode).toContain('mbf-ferry-route');
  });

  test('campo cabina presente (mbf-ferry-cabin)', () => {
    expect(formCode).toContain('mbf-ferry-cabin');
  });

  test('campo ponte presente (mbf-ferry-deck)', () => {
    expect(formCode).toContain('mbf-ferry-deck');
  });

  test('campo passeggeri presente (mbf-ferry-passengers)', () => {
    expect(formCode).toContain('mbf-ferry-passengers');
  });

  test('campo PNR presente (mbf-ferry-pnr)', () => {
    expect(formCode).toContain('mbf-ferry-pnr');
  });

  test('campo prezzo presente (mbf-ferry-price)', () => {
    expect(formCode).toContain('mbf-ferry-price');
  });
});

// ===========================
// Tests: CustomSelect per tipo passeggero e tipo veicolo
// ===========================

describe('Form traghetto — CustomSelect', () => {
  test('CustomSelect usato per tipo passeggero', () => {
    expect(ferryFormSection).toContain('FERRY_PASSENGER_TYPE_OPTIONS');
  });

  test('CustomSelect usato per tipo veicolo', () => {
    expect(ferryFormSection).toContain('FERRY_VEHICLE_TYPE_OPTIONS');
  });

  test('nessun createElement select nel form traghetto', () => {
    expect(ferryFormSection).not.toContain("createElement('select')");
  });

  test('fallback input text per ambienti senza CustomSelect (tipo passeggero)', () => {
    expect(ferryFormSection).toContain('mbf-ferry-passenger-type');
  });

  test('fallback input text per ambienti senza CustomSelect (tipo veicolo)', () => {
    expect(ferryFormSection).toContain('mbf-ferry-vehicle-type');
  });
});

// ===========================
// Tests: validazione
// ===========================

describe('Form traghetto — validazione', () => {
  test('errore operatore mancante', () => {
    expect(ferryFormSection).toContain('Inserisci l');
    expect(ferryFormSection).toContain('operatore');
  });

  test('errore porto partenza mancante', () => {
    expect(ferryFormSection).toContain('porto di partenza');
  });

  test('errore città partenza mancante', () => {
    expect(ferryFormSection).toContain('città di partenza');
  });

  test('errore porto arrivo mancante', () => {
    expect(ferryFormSection).toContain('porto di arrivo');
  });

  test('errore città arrivo mancante', () => {
    expect(ferryFormSection).toContain('città di arrivo');
  });

  test('errore data mancante', () => {
    expect(ferryFormSection).toContain('Inserisci la data');
  });

  test('errore orario partenza mancante', () => {
    expect(ferryFormSection).toContain('orario di partenza');
  });
});

// ===========================
// Tests: pulsante Salva
// ===========================

describe('Form traghetto — pulsante Salva', () => {
  test('pulsante "Salva prenotazione" presente nel form traghetto', () => {
    expect(ferryFormSection).toContain('Salva prenotazione');
  });

  test('pulsante Salva disabilitato di default', () => {
    expect(ferryFormSection).toContain('saveBtn.disabled = true');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form traghetto — upload documento', () => {
  test('buildDocumentUpload è richiamato nel form traghetto', () => {
    expect(ferryFormSection).toContain('buildDocumentUpload()');
  });
});

// ===========================
// Tests: open() gestisce il tipo ferry
// ===========================

describe('Form traghetto — integrazione con open()', () => {
  test("open() ha branch per type === 'ferry'", () => {
    expect(formCode).toContain("type === 'ferry'");
  });

  test("open() chiama buildFerryForm per tipo ferry", () => {
    expect(formCode).toContain('buildFerryForm(prefill)');
  });
});

// ===========================
// Tests: getValues() struttura dati corretta
// ===========================

describe('Form traghetto — struttura dati getValues()', () => {
  test('getValues restituisce operator', () => {
    expect(ferryFormSection).toContain('operator:');
  });

  test('getValues restituisce departure con port, city e time', () => {
    expect(ferryFormSection).toContain('departure:');
    expect(ferryFormSection).toContain('port:');
    expect(ferryFormSection).toContain('city:');
    expect(ferryFormSection).toContain('time:');
  });

  test('getValues restituisce arrival con port, city e time', () => {
    expect(ferryFormSection).toContain('arrival:');
  });

  test('getValues restituisce date', () => {
    expect(ferryFormSection).toContain('date:');
  });

  test('getValues restituisce bookingReference', () => {
    expect(ferryFormSection).toContain('bookingReference:');
  });
});

// ===========================
// Tests: submit chiama add-booking type='ferry'
// ===========================

describe('Form traghetto — submit type ferry', () => {
  test("open() passa type='ferry' a saveManualBooking", () => {
    // La funzione open() riceve type e lo passa a saveManualBooking — verificabile nel codice
    expect(formCode).toContain("type === 'ferry'");
    // saveManualBooking usa la variabile type passata dal chiamante
    expect(formCode).toContain('saveManualBooking(tripId, type, manualData, docFile');
  });
});
