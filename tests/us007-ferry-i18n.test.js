/**
 * US-007: i18n — chiavi traduzione ferry
 * Tests per le chiavi ferry in it.json e en.json
 */

const fs = require('fs');
const path = require('path');

const itJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/i18n/it.json'), 'utf8'));
const enJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/i18n/en.json'), 'utf8'));

// Chiavi richieste dall'acceptance criteria
const REQUIRED_FERRY_KEYS = [
  'ferry.operator',
  'ferry.departure_port',
  'ferry.arrival_port',
  'ferry.cabin',
  'ferry.deck',
  'ferry.vehicle',
  'ferry.booking_reference',
  'ferry.ferry_name',
];

function getNestedValue(obj, dotPath) {
  return dotPath.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

// ── trip.ferries ──────────────────────────────────────────────────────────────

describe('i18n — chiave trip.ferries', () => {
  test('trip.ferries presente in it.json', () => {
    expect(itJson.trip).toBeDefined();
    expect(itJson.trip.ferries).toBeDefined();
  });

  test('trip.ferries in it.json === "Traghetti"', () => {
    expect(itJson.trip.ferries).toBe('Traghetti');
  });

  test('trip.ferries presente in en.json', () => {
    expect(enJson.trip).toBeDefined();
    expect(enJson.trip.ferries).toBeDefined();
  });

  test('trip.ferries in en.json === "Ferries"', () => {
    expect(enJson.trip.ferries).toBe('Ferries');
  });
});

// ── ferry.* in it.json ────────────────────────────────────────────────────────

describe('i18n — sezione ferry in it.json', () => {
  test('sezione "ferry" esiste in it.json', () => {
    expect(itJson.ferry).toBeDefined();
  });

  REQUIRED_FERRY_KEYS.forEach(dotKey => {
    test(`${dotKey} presente in it.json`, () => {
      const val = getNestedValue(itJson, dotKey);
      expect(val).toBeDefined();
    });

    test(`${dotKey} in it.json non è stringa vuota o null`, () => {
      const val = getNestedValue(itJson, dotKey);
      expect(val).not.toBeNull();
      expect(val).not.toBe('');
    });
  });
});

// ── ferry.* in en.json ────────────────────────────────────────────────────────

describe('i18n — sezione ferry in en.json', () => {
  test('sezione "ferry" esiste in en.json', () => {
    expect(enJson.ferry).toBeDefined();
  });

  REQUIRED_FERRY_KEYS.forEach(dotKey => {
    test(`${dotKey} presente in en.json`, () => {
      const val = getNestedValue(enJson, dotKey);
      expect(val).toBeDefined();
    });

    test(`${dotKey} in en.json non è stringa vuota o null`, () => {
      const val = getNestedValue(enJson, dotKey);
      expect(val).not.toBeNull();
      expect(val).not.toBe('');
    });
  });
});

// ── Parità chiavi tra it e en ─────────────────────────────────────────────────

describe('i18n — parità chiavi ferry tra it.json e en.json', () => {
  test('tutte le chiavi ferry in it.json esistono anche in en.json', () => {
    const itKeys = Object.keys(itJson.ferry || {});
    const enKeys = Object.keys(enJson.ferry || {});
    itKeys.forEach(k => {
      expect(enKeys).toContain(k);
    });
  });

  test('tutte le chiavi ferry in en.json esistono anche in it.json', () => {
    const itKeys = Object.keys(itJson.ferry || {});
    const enKeys = Object.keys(enJson.ferry || {});
    enKeys.forEach(k => {
      expect(itKeys).toContain(k);
    });
  });
});
