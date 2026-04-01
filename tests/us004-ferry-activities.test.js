/**
 * US-004: Timeline attività — eventi ferry nel calendario giornaliero
 * Tests per tripActivities.js buildDayEvents() con eventi ferry
 */

const fs = require('fs');
const path = require('path');

// Mock window.activityCategories (necessario per il modulo tripActivities.js)
const mockActCat = {
  CATEGORY_ORDER: ['volo', 'hotel', 'treno', 'bus', 'traghetto', 'noleggio', 'attività'],
  getCategoryForEvent: (ev) => {
    if (ev.type === 'ferry') return { key: 'traghetto', color: '#0369a1' };
    return { key: 'altro', color: '#ccc' };
  },
  CATEGORIES: {}
};

function loadIIFE(filePath, windowObj) {
  const code = fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf8');
  const fn = new Function(
    'window', 'document', 'performance', 'i18n', 'utils', 'auth', 'sessionStorage', 'navigator',
    code
  );
  const mockDoc = {
    readyState: 'complete',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ appendChild: () => {}, style: {} }),
    body: { style: {} },
    head: { appendChild: () => {} },
  };
  const mockPerf = { now: () => 0 };
  const mockI18n = { apply: () => {}, t: (k) => k, getLang: () => 'it' };
  const mockUtils = {
    escapeHtml: (s) => String(s || ''),
    formatFlightDate: (d, lang) => d || '',
    formatDuration: (m) => `${m}min`,
  };
  const mockAuth = { requireAuth: () => false, getUser: () => null };
  const mockStorage = { getItem: () => null, setItem: () => {} };
  const mockNav = {};
  fn(windowObj, mockDoc, mockPerf, mockI18n, mockUtils, mockAuth, mockStorage, mockNav);
}

// ===========================
// Setup
// ===========================

let tripAct;

const mockFerry = {
  id: 'ferry-1',
  operator: 'Tirrenia',
  ferryName: 'M/N Palermo',
  date: '2025-07-15',
  departure: { port: 'Genova', city: 'Genova', time: '10:00' },
  arrival: { port: 'Palermo', city: 'Palermo', time: '20:00' },
  bookingReference: 'TIR-12345',
  passengers: [{ name: 'Mario Rossi', type: 'adulto' }],
};

beforeAll(() => {
  const win = { activityCategories: mockActCat, AirportAutocomplete: null };
  loadIIFE('js/tripActivities.js', win);
  tripAct = win.tripActivities;
});

// ===========================
// Tests: buildDayEvents con ferries
// ===========================

describe('buildDayEvents — ferry events', () => {
  test('buildDayEvents è esposta via window.tripActivities', () => {
    expect(typeof tripAct.buildDayEvents).toBe('function');
  });

  test('tripData.ferries:[mockFerry] → almeno un evento di tipo ferry', () => {
    const result = tripAct.buildDayEvents({ ferries: [mockFerry] });
    const ferryEvents = result.grouped['2025-07-15']?.filter(e => e.type === 'ferry') || [];
    expect(ferryEvents.length).toBeGreaterThanOrEqual(1);
  });

  test('evento ferry ha la data corretta (departure.date del mockFerry)', () => {
    const result = tripAct.buildDayEvents({ ferries: [mockFerry] });
    const ferryEvent = result.grouped['2025-07-15']?.find(e => e.type === 'ferry');
    expect(ferryEvent).toBeDefined();
    expect(ferryEvent.date).toBe('2025-07-15');
  });

  test('evento ferry ha data.operator corretto', () => {
    const result = tripAct.buildDayEvents({ ferries: [mockFerry] });
    const ferryEvent = result.grouped['2025-07-15']?.find(e => e.type === 'ferry');
    expect(ferryEvent.data.operator).toBe('Tirrenia');
  });

  test('evento ferry referenzia il dato originale in event.data', () => {
    const result = tripAct.buildDayEvents({ ferries: [mockFerry] });
    const ferryEvent = result.grouped['2025-07-15']?.find(e => e.type === 'ferry');
    expect(ferryEvent.data).toBe(mockFerry);
  });

  test('evento ferry ha time corretto (departure.time)', () => {
    const result = tripAct.buildDayEvents({ ferries: [mockFerry] });
    const ferryEvent = result.grouped['2025-07-15']?.find(e => e.type === 'ferry');
    expect(ferryEvent.time).toBe('10:00');
  });

  test('ferry senza departure.time → time è null', () => {
    const ferryNoTime = { ...mockFerry, departure: { port: 'Genova' } };
    const result = tripAct.buildDayEvents({ ferries: [ferryNoTime] });
    const ferryEvent = result.grouped['2025-07-15']?.find(e => e.type === 'ferry');
    expect(ferryEvent.time).toBeNull();
  });
});

// ===========================
// Tests: ferry senza data gestito gracefully
// ===========================

describe('buildDayEvents — ferry senza data', () => {
  test('ferry senza date → nessun errore thrown', () => {
    const ferryNoDate = { operator: 'GNV', departure: { port: 'Genova' } };
    expect(() => {
      tripAct.buildDayEvents({ ferries: [ferryNoDate] });
    }).not.toThrow();
  });

  test('ferry senza date → non aggiunge evento nel grouped', () => {
    const ferryNoDate = { operator: 'GNV', departure: { port: 'Genova' } };
    const result = tripAct.buildDayEvents({ ferries: [ferryNoDate] });
    // undefined date non deve comparire come chiave
    expect(result.grouped['undefined']).toBeUndefined();
  });

  test('tripData.ferries:[] → nessun evento ferry nel grouped', () => {
    const result = tripAct.buildDayEvents({ ferries: [] });
    const allEvents = Object.values(result.grouped).flat();
    const ferryEvents = allEvents.filter(e => e.type === 'ferry');
    expect(ferryEvents.length).toBe(0);
  });

  test('tripData senza ferries → nessun errore thrown', () => {
    expect(() => {
      tripAct.buildDayEvents({ flights: [], hotels: [] });
    }).not.toThrow();
  });
});

// ===========================
// Tests: source code verification
// ===========================

describe('tripActivities.js — codice sorgente ferry', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.resolve(__dirname, '..', 'js/tripActivities.js'), 'utf8'
    );
  });

  test('contiene loop su tripData.ferries', () => {
    expect(code).toContain("tripData.ferries");
  });

  test('ferry aggiunto a typePriority', () => {
    expect(code).toContain("'ferry':");
  });

  test('eventi ferry usano type: ferry', () => {
    expect(code).toContain("type: 'ferry'");
  });
});
