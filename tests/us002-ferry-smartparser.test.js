/**
 * US-002: Smart Parser Backend — FERRY_SCHEMA e rilevamento automatico
 * Tests per smartParser.js: getSchema('ferry'), detectDocType(), BETA_DOC_TYPES
 */

const {
  getSchema,
  detectDocType,
} = require('../netlify/functions/utils/smartParser');

// ===========================
// Tests: getSchema('ferry')
// ===========================

describe("getSchema('ferry')", () => {
  test("ritorna un oggetto con chiave 'ferries'", () => {
    const schema = getSchema('ferry');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    expect(schema).toHaveProperty('ferries');
  });

  test("ferries è un array", () => {
    const schema = getSchema('ferry');
    expect(Array.isArray(schema.ferries)).toBe(true);
  });

  test("il primo elemento ha i campi richiesti", () => {
    const schema = getSchema('ferry');
    const ferry = schema.ferries[0];
    expect(ferry).toHaveProperty('operator');
    expect(ferry).toHaveProperty('departure');
    expect(ferry).toHaveProperty('arrival');
    expect(ferry).toHaveProperty('bookingReference');
    expect(ferry).toHaveProperty('passengers');
  });

  test("departure ha port, city, time", () => {
    const schema = getSchema('ferry');
    const dep = schema.ferries[0].departure;
    expect(dep).toHaveProperty('port');
    expect(dep).toHaveProperty('city');
    expect(dep).toHaveProperty('time');
  });

  test("arrival ha port, city, time", () => {
    const schema = getSchema('ferry');
    const arr = schema.ferries[0].arrival;
    expect(arr).toHaveProperty('port');
    expect(arr).toHaveProperty('city');
    expect(arr).toHaveProperty('time');
  });

  test("ha campo passenger", () => {
    const schema = getSchema('ferry');
    expect(schema).toHaveProperty('passenger');
    expect(schema.passenger).toHaveProperty('name');
  });

  test("il primo ferry ha campo vehicles", () => {
    const schema = getSchema('ferry');
    const ferry = schema.ferries[0];
    expect(ferry).toHaveProperty('vehicles');
    expect(Array.isArray(ferry.vehicles)).toBe(true);
  });

  test("getSchema('flight') non ha chiave ferries", () => {
    const schema = getSchema('flight');
    expect(schema).not.toHaveProperty('ferries');
    expect(schema).toHaveProperty('flights');
  });
});

// ===========================
// Tests: detectDocType()
// ===========================

describe('detectDocType — keyword ferry', () => {
  test("testo con 'traghetto porto imbarco' → 'ferry'", () => {
    const result = detectDocType('Prenotazione traghetto porto imbarco ore 14:00');
    expect(result).toBe('ferry');
  });

  test("testo con 'ANEK Lines' → 'ferry'", () => {
    const result = detectDocType('ANEK Lines booking confirmation');
    expect(result).toBe('ferry');
  });

  test("testo con 'Grimaldi' → 'ferry'", () => {
    const result = detectDocType('Grimaldi Lines — Prenotazione traversata');
    expect(result).toBe('ferry');
  });

  test("testo con 'GNV' → 'ferry'", () => {
    const result = detectDocType('GNV Grandi Navi Veloci ticket');
    expect(result).toBe('ferry');
  });

  test("testo con 'Tirrenia' → 'ferry'", () => {
    const result = detectDocType('Tirrenia prenotazione nave');
    expect(result).toBe('ferry');
  });

  test("testo con 'Blue Star' → 'ferry'", () => {
    const result = detectDocType('Blue Star Ferries booking reference');
    expect(result).toBe('ferry');
  });

  test("testo con 'Corsica Ferries' → 'ferry'", () => {
    const result = detectDocType('Corsica Ferries confirmation');
    expect(result).toBe('ferry');
  });

  test("testo con 'Brittany Ferries' → 'ferry'", () => {
    const result = detectDocType('Brittany Ferries booking');
    expect(result).toBe('ferry');
  });

  test("testo con 'Stena Line' → 'ferry'", () => {
    const result = detectDocType('Stena Line ticket confirmation');
    expect(result).toBe('ferry');
  });

  test("testo con 'motonave' → 'ferry'", () => {
    const result = detectDocType('Biglietto motonave rotta Napoli-Palermo');
    expect(result).toBe('ferry');
  });

  test("testo con 'traversata' → 'ferry'", () => {
    const result = detectDocType('Prenotazione traversata marittima');
    expect(result).toBe('ferry');
  });

  test("testo con 'imbarcazione' → 'ferry'", () => {
    const result = detectDocType('imbarcazione partenza ore 09:30');
    expect(result).toBe('ferry');
  });

  test("testo non ferry → null", () => {
    const result = detectDocType('Flight AZ628 Roma Fiumicino departure 10:30');
    expect(result).toBeNull();
  });

  test("testo hotel → null", () => {
    const result = detectDocType('Hotel check-in booking confirmation Marriott');
    expect(result).toBeNull();
  });

  test("testo vuoto → null", () => {
    const result = detectDocType('');
    expect(result).toBeNull();
  });

  test("null → null", () => {
    const result = detectDocType(null);
    expect(result).toBeNull();
  });

  test("case insensitive: 'TRAGHETTO' → 'ferry'", () => {
    const result = detectDocType('TRAGHETTO GENOVA PALERMO');
    expect(result).toBe('ferry');
  });
});

// ===========================
// Tests: BETA_DOC_TYPES contiene 'ferry'
// ===========================

describe('BETA_DOC_TYPES', () => {
  test("il file smartParser.js contiene ferry in BETA_DOC_TYPES", () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.resolve(__dirname, '..', 'netlify/functions/utils/smartParser.js'), 'utf8'
    );
    // BETA_DOC_TYPES deve contenere 'ferry'
    expect(code).toMatch(/BETA_DOC_TYPES\s*=\s*\[.*'ferry'.*\]/s);
  });

  test("FERRY_SCHEMA è definito nel file", () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.resolve(__dirname, '..', 'netlify/functions/utils/smartParser.js'), 'utf8'
    );
    expect(code).toContain('FERRY_SCHEMA');
    expect(code).toContain('"ferries"');
  });
});
