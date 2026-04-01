/**
 * US-005 — Preview parsing ferry nel modale di upload
 * Verifica che parsePreview.js gestisca result.ferries nell'anteprima post-parsing
 */

const fs = require('fs');
const path = require('path');

// Mock document.createElement per _esc (che usa div.textContent → div.innerHTML per escaping)
// Per dati di test senza caratteri HTML speciali, textContent === innerHTML
function makeMockDocument() {
  return {
    createElement: () => {
      let _val = '';
      return {
        get textContent() { return _val; },
        // Simula HTML escaping: per i nostri dati di test non ci sono caratteri speciali
        set textContent(v) { _val = String(v == null ? '' : v); },
        get innerHTML() { return _val; },
        set innerHTML(v) { _val = v; },
      };
    }
  };
}

// Carichiamo parsePreview.js simulando l'ambiente browser
function loadParsePreview() {
  const code = fs.readFileSync(
    path.join(__dirname, '../js/parsePreview.js'),
    'utf8'
  );

  const mockDoc = makeMockDocument();
  const mockWindow = {};
  const fn = new Function('document', 'window', `
    ${code}
    return parsePreview;
  `);
  return fn(mockDoc, mockWindow);
}

// Container con innerHTML string (non usa document)
function makeContainerForRender() {
  let _html = '';
  return {
    get innerHTML() { return _html; },
    set innerHTML(v) { _html = v; },
    querySelector: () => ({ addEventListener: () => {}, textContent: '', classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
    querySelectorAll: () => [],
  };
}


// Ferry di test
const mockFerry = {
  date: '2024-07-15',
  operator: 'ANEK Lines',
  ferryName: 'Asterion I',
  routeNumber: 'AN-101',
  departure: { port: 'Venezia', city: 'Venezia', time: '19:00' },
  arrival: { port: 'Patrasso', city: 'Patrasso', time: '14:00' },
  duration: '19h',
  cabin: 'A12',
  deck: '5',
  passengers: [{ name: 'Mario Rossi', type: 'ADT' }],
  vehicles: [{ type: 'car', plate: 'ME000XX' }],
  bookingReference: 'ANK123456',
  ticketNumber: 'TK987',
  price: { value: 250, currency: 'EUR' }
};

const mockFerryNoCabin = {
  date: '2024-08-01',
  operator: 'GNV',
  ferryName: 'Rhapsody',
  departure: { port: 'Genova', city: 'Genova', time: '21:00' },
  arrival: { port: 'Palermo', city: 'Palermo', time: '07:00' },
  bookingReference: 'GNV789',
  cabin: null,
  deck: null,
};

function buildParsedResults(ferries) {
  return [{ result: { ferries } }];
}

describe('US-005 — parsePreview ferry rendering', () => {
  let parsePreview;

  beforeAll(() => {
    parsePreview = loadParsePreview();
  });

  test('render con ferries:[mockFerry] contiene porto di partenza e arrivo', () => {
    const container = makeContainerForRender();
    let confirmCalled = false;
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => { confirmCalled = true; },
      onCancel: () => {}
    });
    const html = container.innerHTML;
    expect(html).toContain('Venezia');
    expect(html).toContain('Patrasso');
  });

  test('render con ferries:[mockFerry] contiene operatore', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('ANEK Lines');
  });

  test('render con ferries:[mockFerry] con vehicles → targa ME000XX visibile', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('ME000XX');
  });

  test('render con ferries:[mockFerry] con vehicles → tipo veicolo visibile', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('car');
  });

  test('render ferry con cabin:null → undefined non appare nell\'HTML', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerryNoCabin]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).not.toContain('undefined');
  });

  test('render ferry con cabin:null → stringa "null" non appare nei campi', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerryNoCabin]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    // Il campo cabina non deve apparire se null
    expect(container.innerHTML).not.toMatch(/Cabina.*null/);
  });

  test('render con ferries:[] → nessun errore, container non vuoto (mostra footer)', () => {
    const container = makeContainerForRender();
    expect(() => {
      parsePreview.render(container, buildParsedResults([]), {
        onConfirm: () => {},
        onCancel: () => {}
      });
    }).not.toThrow();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  test('render ferry senza vehicles → sezione veicoli assente', () => {
    const ferryNoVehicles = { ...mockFerry, vehicles: [] };
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([ferryNoVehicles]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).not.toContain('Veicoli a bordo');
  });

  test('render ferry con passeggeri → nome passeggero visibile', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('Mario Rossi');
  });

  test('render ferry → usa classe CSS parse-ferry-card', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('parse-ferry-card');
  });

  test('segmento ferry aggiunto in _segments con icon directions_boat', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    const ferrySegment = parsePreview._segments.find(s => s.type === 'ferry');
    expect(ferrySegment).toBeDefined();
    expect(ferrySegment.icon).toBe('directions_boat');
  });

  test('segmento ferry label contiene porto partenza e arrivo', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    const ferrySegment = parsePreview._segments.find(s => s.type === 'ferry');
    expect(ferrySegment.label).toContain('→');
  });

  test('allFerries raccoglie ferries da più parsedResults', () => {
    const multiResults = [
      { result: { ferries: [mockFerry] } },
      { result: { ferries: [mockFerryNoCabin] } }
    ];
    const container = makeContainerForRender();
    parsePreview.render(container, multiResults, {
      onConfirm: () => {},
      onCancel: () => {}
    });
    // Entrambi i ferry devono essere presenti
    expect(container.innerHTML).toContain('ANEK Lines');
    expect(container.innerHTML).toContain('GNV');
  });

  test('render ferry con booking reference → PNR visibile', () => {
    const container = makeContainerForRender();
    parsePreview.render(container, buildParsedResults([mockFerry]), {
      onConfirm: () => {},
      onCancel: () => {}
    });
    expect(container.innerHTML).toContain('ANK123456');
  });
});
