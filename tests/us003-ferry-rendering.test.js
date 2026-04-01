/**
 * US-003: Rendering tab Traghetti nella pagina viaggio
 * Tests per js/tripFerries.js
 */

const fs = require('fs');
const path = require('path');

// Carica e valuta un file IIFE frontend in un contesto window simulato
function loadIIFE(filePath, windowObj) {
  const code = fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf8');
  const fn = new Function('window', 'document', 'performance', 'i18n', 'utils', 'auth', 'sessionStorage', 'navigator', code);
  const mockDoc = {
    readyState: 'complete',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: { style: {} },
  };
  const mockPerf = { now: () => 0 };
  const mockI18n = { apply: () => {}, t: (k) => k, getLang: () => 'it' };
  const mockUtils = {
    escapeHtml: (s) => String(s == null ? '' : s),
    formatFlightDate: (d) => d || '',
    formatDuration: (d) => d || ''
  };
  const mockAuth = { requireAuth: () => false };
  const mockStorage = { getItem: () => null, setItem: () => {} };
  const mockNav = {};
  fn(windowObj, mockDoc, mockPerf, mockI18n, mockUtils, mockAuth, mockStorage, mockNav);
}

// Mock container DOM
function makeContainer() {
  let html = '';
  return {
    set innerHTML(val) { html = val; },
    get innerHTML() { return html; },
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

// Mock ferry data
const mockFerry = {
  id: 'ferry-1',
  date: '2025-07-15',
  operator: 'Grimaldi Lines',
  ferryName: 'Athena',
  routeNumber: 'GR001',
  departure: { port: 'Ancona', city: 'Ancona', time: '19:00' },
  arrival: { port: 'Igoumenitsa', city: 'Igoumenitsa', time: '09:00' },
  duration: '14:00',
  bookingReference: 'GR26019076838',
  ticketNumber: 'TK001',
  cabin: '215',
  deck: 'A',
  passengers: [{ name: 'Mario Rossi', type: 'adult' }],
  vehicles: [{ type: 'car', plate: 'ME000XX' }],
  price: { value: 250, currency: '€' }
};

// ===========================
// Setup: carica tripFerries.js
// ===========================

let win;

beforeAll(() => {
  win = {
    tripPage: {
      escAttr: (v) => String(v == null ? '' : v),
      currentTripData: null,
      showAddBookingModal: () => {},
      showManageBookingPanel: () => {}
    }
  };
  loadIIFE('js/tripFerries.js', win);
});

// ===========================
// Tests: renderFerries
// ===========================

describe('window.tripFerries', () => {
  test('window.tripFerries esiste dopo il caricamento', () => {
    expect(win.tripFerries).toBeDefined();
  });

  test('renderFerries è una funzione esportata', () => {
    expect(typeof win.tripFerries.renderFerries).toBe('function');
  });

  test('render è un alias di renderFerries', () => {
    expect(typeof win.tripFerries.render).toBe('function');
  });
});

describe('renderFerries con array vuoto', () => {
  test('nessun errore con array vuoto', () => {
    const container = makeContainer();
    expect(() => win.tripFerries.renderFerries(container, [])).not.toThrow();
  });

  test('container mostra stato vuoto con array vuoto', () => {
    const container = makeContainer();
    win.tripFerries.renderFerries(container, []);
    expect(container.innerHTML).toContain('empty-state');
  });

  test('nessun errore con null', () => {
    const container = makeContainer();
    expect(() => win.tripFerries.renderFerries(container, null)).not.toThrow();
  });

  test('nessun errore se container è null', () => {
    expect(() => win.tripFerries.renderFerries(null, [mockFerry])).not.toThrow();
  });
});

describe('renderFerries con mockFerry', () => {
  let html;

  beforeAll(() => {
    const container = makeContainer();
    win.tripFerries.renderFerries(container, [mockFerry]);
    html = container.innerHTML;
  });

  test('HTML contiene porto di partenza', () => {
    expect(html).toContain('Ancona');
  });

  test('HTML contiene porto di arrivo', () => {
    expect(html).toContain('Igoumenitsa');
  });

  test('HTML contiene operatore', () => {
    expect(html).toContain('Grimaldi Lines');
  });

  test('HTML contiene nome nave', () => {
    expect(html).toContain('Athena');
  });

  test('HTML contiene data-id della card', () => {
    // Il bookingReference è nei dettagli (lazy loaded); la card ha data-id
    expect(html).toContain('data-id="ferry-1"');
  });

  test('_ferries viene popolato dopo render', () => {
    expect(win.tripFerries._ferries).toBeDefined();
    expect(win.tripFerries._ferries.length).toBe(1);
  });
});

describe('ferry con vehicles', () => {
  test('targa veicolo visibile in renderFerryDetails', () => {
    const detailHtml = win.tripFerries.renderDetails(mockFerry, 0);
    expect(detailHtml).toContain('ME000XX');
  });
});

describe('ferry senza cabin', () => {
  test("la parola 'undefined' non appare con cabin:null", () => {
    const ferryNoCabin = { ...mockFerry, cabin: null, deck: null };
    const container = makeContainer();
    win.tripFerries.renderFerries(container, [ferryNoCabin]);
    expect(container.innerHTML).not.toContain('undefined');
  });

  test("la parola 'undefined' non appare nei dettagli con cabin:null", () => {
    const ferryNoCabin = { ...mockFerry, cabin: null, deck: null };
    const detailHtml = win.tripFerries.renderDetails(ferryNoCabin, 0);
    expect(detailHtml).not.toContain('undefined');
  });
});

describe('ferry senza vehicles', () => {
  test('nessun errore se vehicles è assente', () => {
    const ferryNoVehicles = { ...mockFerry, vehicles: undefined };
    const container = makeContainer();
    expect(() => win.tripFerries.renderFerries(container, [ferryNoVehicles])).not.toThrow();
  });

  test('campo veicolo non appare nei dettagli se vehicles è vuoto', () => {
    const ferryNoVehicles = { ...mockFerry, vehicles: [] };
    const detailHtml = win.tripFerries.renderDetails(ferryNoVehicles, 0);
    expect(detailHtml).not.toContain('ME000XX');
  });
});

describe('renderDetails', () => {
  test('renderDetails è una funzione', () => {
    expect(typeof win.tripFerries.renderDetails).toBe('function');
  });

  test('renderDetails contiene riferimento prenotazione', () => {
    const html = win.tripFerries.renderDetails(mockFerry, 0);
    expect(html).toContain('GR26019076838');
  });

  test('renderDetails contiene prezzo', () => {
    const html = win.tripFerries.renderDetails(mockFerry, 0);
    expect(html).toContain('250');
  });
});
