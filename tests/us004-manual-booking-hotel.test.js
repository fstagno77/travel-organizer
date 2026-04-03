/**
 * US-004: Form creazione manuale — Hotel
 * Tests per manualBookingForm.js (code analysis)
 */

const fs = require('fs');
const path = require('path');

const formCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/manualBookingForm.js'),
  'utf8'
);

// ===========================
// Tests: form hotel renderizza campi obbligatori
// ===========================

describe('Form hotel — campi obbligatori', () => {
  test('campo nome hotel presente (mbf-hotel-name)', () => {
    expect(formCode).toContain('mbf-hotel-name');
  });

  test('campo città presente (mbf-hotel-city)', () => {
    expect(formCode).toContain('mbf-hotel-city');
  });

  test('campo data check-in presente (mbf-hotel-checkin)', () => {
    expect(formCode).toContain('mbf-hotel-checkin');
  });

  test('campo data check-out presente (mbf-hotel-checkout)', () => {
    expect(formCode).toContain('mbf-hotel-checkout');
  });

  test('i 4 campi obbligatori hotel usano required: true', () => {
    // Conta le occorrenze di required: true nel buildHotelForm
    const hotelFormSection = formCode.slice(formCode.indexOf('buildHotelForm'));
    const requiredCount = (hotelFormSection.match(/required: true/g) || []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(4);
  });
});

// ===========================
// Tests: campi opzionali presenti
// ===========================

describe('Form hotel — campi opzionali', () => {
  test('campo notti calcolate automaticamente (mbf-hotel-nights)', () => {
    expect(formCode).toContain('mbf-hotel-nights');
  });

  test('campo notti è read-only', () => {
    expect(formCode).toContain('readOnly = true');
  });

  test('campo indirizzo presente (mbf-hotel-address)', () => {
    expect(formCode).toContain('mbf-hotel-address');
  });

  test('campo numero camere presente (mbf-hotel-rooms)', () => {
    expect(formCode).toContain('mbf-hotel-rooms');
  });

  test('campo tipo camera presente (mbf-hotel-room-type)', () => {
    expect(formCode).toContain('mbf-hotel-room-type');
  });

  test('campo nome ospite presente (mbf-hotel-guest)', () => {
    expect(formCode).toContain('mbf-hotel-guest');
  });

  test('campo numero conferma presente (mbf-hotel-confirmation)', () => {
    expect(formCode).toContain('mbf-hotel-confirmation');
  });

  test('campo colazione inclusa usa CustomSelect (no <select> nativo)', () => {
    // Deve usare window.CustomSelect e non creare un <select> element
    expect(formCode).toContain('CustomSelect');
    expect(formCode).not.toContain("createElement('select')");
  });

  test('campo prezzo presente (mbf-hotel-price)', () => {
    expect(formCode).toContain('mbf-hotel-price');
  });

  test('campo cancellation policy presente (mbf-hotel-cancellation)', () => {
    expect(formCode).toContain('mbf-hotel-cancellation');
  });
});

// ===========================
// Tests: notti calcolate automaticamente
// ===========================

describe('Form hotel — calcolo notti automatico', () => {
  test('funzione calcNights è definita', () => {
    expect(formCode).toContain('function calcNights(');
  });

  test('calcNights aggiorna il campo notti al cambio date', () => {
    expect(formCode).toContain('updateNights');
    expect(formCode).toContain("addEventListener('change', updateNights)");
  });
});

// ===========================
// Tests: validazione
// ===========================

describe('Form hotel — validazione', () => {
  test('errore se check-out antecedente check-in', () => {
    expect(formCode).toContain('La data di check-out deve essere successiva al check-in');
  });

  test('errore campo nome hotel mancante', () => {
    expect(formCode).toContain("Inserisci il nome dell");
    expect(formCode).toContain("hotel");
  });

  test('errore campo città mancante', () => {
    expect(formCode).toContain("Inserisci la città");
  });

  test('errore campo check-in mancante', () => {
    expect(formCode).toContain('Inserisci la data di check-in');
  });

  test('errore campo check-out mancante', () => {
    expect(formCode).toContain('Inserisci la data di check-out');
  });
});

// ===========================
// Tests: pulsante Salva
// ===========================

describe('Form hotel — pulsante Salva', () => {
  test('pulsante Salva hotel presente', () => {
    expect(formCode).toContain('Salva hotel');
  });

  test('pulsante Salva disabilitato di default', () => {
    // Il form hotel setta saveBtn.disabled = true alla creazione
    const hotelFormSection = formCode.slice(
      formCode.indexOf('buildHotelForm'),
      formCode.indexOf('function buildDocumentUpload') > 0
        ? formCode.indexOf('function restoreModal')
        : formCode.length
    );
    expect(hotelFormSection).toContain('saveBtn.disabled = true');
  });
});

// ===========================
// Tests: upload documento opzionale
// ===========================

describe('Form hotel — upload documento', () => {
  test('buildDocumentUpload è richiamato nel form hotel', () => {
    const hotelSection = formCode.slice(
      formCode.indexOf('function buildHotelForm'),
      formCode.indexOf('function calcNights') > formCode.indexOf('function buildHotelForm')
        ? formCode.indexOf('function restoreModal')
        : formCode.length
    );
    expect(hotelSection).toContain('buildDocumentUpload()');
  });
});

// ===========================
// Tests: open() gestisce il tipo hotel
// ===========================

describe('Form hotel — integrazione con open()', () => {
  test("open() ha branch per type === 'hotel'", () => {
    expect(formCode).toContain("type === 'hotel'");
  });

  test("open() chiama buildHotelForm per tipo hotel", () => {
    expect(formCode).toContain('buildHotelForm(prefill)');
  });
});

// ===========================
// Tests: getValues() restituisce struttura corretta
// ===========================

describe('Form hotel — struttura dati getValues()', () => {
  test('getValues restituisce checkIn.date e checkOut.date', () => {
    const hotelSection = formCode.slice(
      formCode.indexOf('function buildHotelForm'),
      formCode.indexOf('function restoreModal')
    );
    expect(hotelSection).toContain('checkIn: { date:');
    expect(hotelSection).toContain('checkOut: { date:');
  });

  test('getValues restituisce city e name', () => {
    const hotelSection = formCode.slice(
      formCode.indexOf('function buildHotelForm'),
      formCode.indexOf('function restoreModal')
    );
    expect(hotelSection).toContain('city:');
    expect(hotelSection).toContain('name:');
  });
});
