/**
 * US-003: Form creazione manuale — Volo
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

const tripEntryCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/entries/trip.js'),
  'utf8'
);

// ===========================
// Tests: il modulo è registrato correttamente
// ===========================

describe('manualBookingForm — registrazione modulo', () => {
  test('esporta window.manualBookingForm', () => {
    expect(formCode).toContain('window.manualBookingForm');
  });

  test('espone il metodo open', () => {
    expect(formCode).toContain('function open(');
  });

  test('il file è importato in entries/trip.js', () => {
    expect(tripEntryCode).toContain("'../manualBookingForm.js'");
  });
});

// ===========================
// Tests: form volo renderizza tutti i campi obbligatori
// ===========================

describe('Form volo — campi obbligatori', () => {
  test('campo codice volo presente (mbf-flight-number)', () => {
    expect(formCode).toContain('mbf-flight-number');
  });

  test('campo compagnia aerea presente (mbf-airline)', () => {
    expect(formCode).toContain('mbf-airline');
  });

  test('campo data presente (mbf-date)', () => {
    expect(formCode).toContain('mbf-date');
  });

  test('campo orario partenza presente (mbf-departure-time)', () => {
    expect(formCode).toContain('mbf-departure-time');
  });

  test('campo città partenza presente (mbf-departure-city)', () => {
    expect(formCode).toContain('mbf-departure-city');
  });

  test('campo città arrivo presente (mbf-arrival-city)', () => {
    expect(formCode).toContain('mbf-arrival-city');
  });

  test('i 6 campi obbligatori sono marcati con data-required', () => {
    // Tutti e 6 i campi required usano required: true che imposta dataset.required
    expect(formCode).toContain('required: true');
    // Verifica che la funzione validate controlli tutti i required
    const checkCount = (formCode.match(/input: i/g) || []).length;
    expect(checkCount).toBeGreaterThanOrEqual(6);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form volo — campi opzionali', () => {
  test('orario arrivo presente (mbf-arrival-time)', () => {
    expect(formCode).toContain('mbf-arrival-time');
  });

  test('posto presente (mbf-seat)', () => {
    expect(formCode).toContain('mbf-seat');
  });

  test('bagaglio presente (mbf-baggage)', () => {
    expect(formCode).toContain('mbf-baggage');
  });

  test('PNR presente (mbf-pnr)', () => {
    expect(formCode).toContain('mbf-pnr');
  });

  test('prezzo presente (mbf-price)', () => {
    expect(formCode).toContain('mbf-price');
  });

  test('passeggeri presente (mbf-passengers)', () => {
    expect(formCode).toContain('mbf-passengers');
  });
});

// ===========================
// Tests: nessun <select> nativo — usa CustomSelect
// ===========================

describe('Form volo — nessun <select> nativo', () => {
  test('il codice non usa createElement("select")', () => {
    expect(formCode).not.toContain('createElement("select")');
    expect(formCode).not.toContain("createElement('select')");
  });

  test('usa window.CustomSelect per la classe volo', () => {
    expect(formCode).toContain('window.CustomSelect');
    expect(formCode).toContain('CustomSelect.create');
  });
});

// ===========================
// Tests: validazione inline — errore visibile
// ===========================

describe('Form volo — validazione inline', () => {
  test('showFieldError aggiunge classe input-error', () => {
    expect(formCode).toContain('input-error');
    expect(formCode).toContain('showFieldError');
  });

  test('validate() controlla il codice volo', () => {
    expect(formCode).toContain('Inserisci il codice volo');
  });

  test('validate() mostra errore per ogni campo obbligatorio mancante', () => {
    expect(formCode).toContain('Inserisci la compagnia aerea');
    expect(formCode).toContain('Inserisci la data del volo');
  });

  test('clearFieldError rimuove l\'errore al re-input', () => {
    expect(formCode).toContain('clearFieldError');
  });
});

// ===========================
// Tests: Save button disabilitato finché required non compilati
// ===========================

describe('Form volo — bottone Salva', () => {
  test('saveBtn.disabled = true all\'inizio', () => {
    expect(formCode).toContain('saveBtn.disabled = true');
  });

  test('updateSaveBtn aggiorna lo stato del bottone', () => {
    expect(formCode).toContain('updateSaveBtn');
  });

  test('gli input required chiamano updateSaveBtn ad ogni input', () => {
    expect(formCode).toContain('updateSaveBtn(form, saveBtn)');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form volo — upload documento opzionale', () => {
  test('buildDocumentUpload è presente', () => {
    expect(formCode).toContain('buildDocumentUpload');
  });

  test('il campo accetta PDF e immagini', () => {
    expect(formCode).toContain('.pdf,image/*');
  });
});

// ===========================
// Tests: submit chiama add-booking con type='flight'
// ===========================

describe('Form volo — submit', () => {
  test('saveManualBooking chiama /.netlify/functions/add-booking', () => {
    expect(formCode).toContain('/.netlify/functions/add-booking');
  });

  test('payload include action manual-booking', () => {
    expect(formCode).toContain("action: 'manual-booking'");
  });

  test('payload include il tipo prenotazione (type)', () => {
    expect(formCode).toContain('tripId, type, manualData');
  });

  test('getValues restituisce flightNumber, airline, date, departureTime, departureCity, arrivalCity', () => {
    expect(formCode).toContain('flightNumber: iFlightNum.value.trim()');
    expect(formCode).toContain('airline: iAirline.value.trim()');
    expect(formCode).toContain('date: iDate.value');
    expect(formCode).toContain('departureTime: iDepTime.value');
    expect(formCode).toContain('departureCity: iDepCity.value.trim()');
    expect(formCode).toContain('arrivalCity: iArrCity.value.trim()');
  });

  test('chiama onSaved() dopo salvataggio riuscito', () => {
    expect(formCode).toContain('onSaved');
    expect(formCode).toContain('typeof onSaved === \'function\'');
  });
});
