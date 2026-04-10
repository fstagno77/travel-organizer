/**
 * Draft Trips — Test suite
 * Copre: countBookings, formatCreatedAt, renderDraftItem, fetchDrafts (mock), deleteDraft (mock)
 */

const fs = require('fs');
const path = require('path');

// ===========================
// Helper: carica draftsPage.js in un window simulato
// ===========================

function loadDraftsPage(windowOverrides = {}) {
  const code = fs.readFileSync(
    path.resolve(__dirname, '..', 'js/draftsPage.js'),
    'utf8'
  );

  const win = {
    i18n: {
      t: (k) => k,
      getLang: () => 'it',
      apply: () => {},
    },
    utils: {
      escapeHtml: (s) => String(s || ''),
      showToast: () => {},
    },
    auth: {
      isAuthenticated: () => true,
    },
    supabase: null,
    navigation: null,
    tripCreator: null,
    ...windowOverrides,
  };

  // Esegui il modulo IIFE con window = win
  const fn = new Function('window', code);
  fn(win);

  return win;
}

// ===========================
// countBookings
// ===========================

describe('countBookings', () => {
  let win;

  beforeAll(() => {
    win = loadDraftsPage();
  });

  test('ritorna 0 se non ci sono prenotazioni', () => {
    const trip = {};
    expect(win.draftsPage.countBookings(trip)).toBe(0);
  });

  test('conta correttamente flights + hotels', () => {
    const trip = {
      flights: [1, 2],
      hotels: [1],
    };
    expect(win.draftsPage.countBookings(trip)).toBe(3);
  });

  test('conta tutti i tipi di prenotazione', () => {
    const trip = {
      flights: [1],
      hotels: [1],
      trains: [1],
      buses: [1],
      ferries: [1],
      rentals: [1],
    };
    expect(win.draftsPage.countBookings(trip)).toBe(6);
  });

  test('gestisce array null/undefined', () => {
    const trip = {
      flights: null,
      hotels: undefined,
      trains: [1, 2, 3],
    };
    expect(win.draftsPage.countBookings(trip)).toBe(3);
  });
});

// ===========================
// formatCreatedAt
// ===========================

describe('formatCreatedAt', () => {
  let win;

  beforeAll(() => {
    win = loadDraftsPage();
  });

  test('ritorna stringa vuota se isoDate è falsy', () => {
    expect(win.draftsPage.formatCreatedAt(null, 'it')).toBe('');
    expect(win.draftsPage.formatCreatedAt('', 'it')).toBe('');
    expect(win.draftsPage.formatCreatedAt(undefined, 'it')).toBe('');
  });

  test('formatta una data ISO valida senza errori', () => {
    const result = win.draftsPage.formatCreatedAt('2026-01-15T10:00:00Z', 'it');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Deve contenere "2026" o "gen" o "Jan"
    expect(result).toMatch(/2026|gen|Jan/i);
  });

  test('formatta in inglese con lang=en', () => {
    const result = win.draftsPage.formatCreatedAt('2026-06-01T00:00:00Z', 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ===========================
// renderDraftItem
// ===========================

describe('renderDraftItem', () => {
  let win;

  beforeAll(() => {
    win = loadDraftsPage();
  });

  const baseDraft = {
    id: 'trip-abc-123',
    title: { it: 'Viaggio in Giappone', en: 'Japan Trip' },
    created_at: '2026-03-01T12:00:00Z',
    flights: [1, 2],
    hotels: [],
  };

  test('contiene il titolo del viaggio', () => {
    const html = win.draftsPage.renderDraftItem(baseDraft, 'it');
    expect(html).toContain('Viaggio in Giappone');
  });

  test('contiene il link alla pagina viaggio', () => {
    const html = win.draftsPage.renderDraftItem(baseDraft, 'it');
    expect(html).toContain('/trip.html?id=trip-abc-123');
  });

  test('contiene il bottone elimina con data-draft-id', () => {
    const html = win.draftsPage.renderDraftItem(baseDraft, 'it');
    expect(html).toContain('data-draft-id="trip-abc-123"');
    expect(html).toContain('draft-list-item__delete');
  });

  test('contiene il badge "Bozza"', () => {
    const html = win.draftsPage.renderDraftItem(baseDraft, 'it');
    expect(html).toContain('draft.badge');
  });

  test('usa titolo default se il viaggio non ha titolo', () => {
    const noTitle = { ...baseDraft, title: null };
    const html = win.draftsPage.renderDraftItem(noTitle, 'it');
    expect(html).toContain('Nuovo viaggio');
  });

  test('usa titolo fallback inglese con lang=en', () => {
    const noTitle = { ...baseDraft, title: null };
    const html = win.draftsPage.renderDraftItem(noTitle, 'en');
    expect(html).toContain('New trip');
  });

  test('mostra il numero di prenotazioni quando presenti', () => {
    const html = win.draftsPage.renderDraftItem(baseDraft, 'it');
    // 2 flights + 0 hotels = 2 prenotazioni
    expect(html).toContain('2');
  });

  test('non mostra il count prenotazioni se è 0', () => {
    const noBookings = { ...baseDraft, flights: [], hotels: [] };
    const html = win.draftsPage.renderDraftItem(noBookings, 'it');
    // Il meta non deve contenere " · " (separatore count)
    expect(html).not.toContain(' · ');
  });
});

// ===========================
// fetchDrafts — mock supabase
// ===========================

describe('fetchDrafts', () => {
  test('ritorna array vuoto se non c\'è utente autenticato', async () => {
    const win = loadDraftsPage({
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: null } }),
        },
      },
    });
    const result = await win.draftsPage.fetchDrafts();
    expect(result).toEqual([]);
  });

  test('ritorna le bozze quando supabase risponde con successo', async () => {
    const mockDrafts = [
      { id: '1', title: { it: 'Bozza 1' }, status: 'draft' },
      { id: '2', title: { it: 'Bozza 2' }, status: 'draft' },
    ];

    const win = loadDraftsPage({
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: { id: 'user-123' } } }),
        },
        from: () => ({
          select: () => ({
            eq: function() { return this; },
            is: () => ({
              order: async () => ({ data: mockDrafts, error: null }),
            }),
          }),
        }),
      },
    });

    const result = await win.draftsPage.fetchDrafts();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
  });

  test('ritorna array vuoto in caso di errore supabase', async () => {
    const win = loadDraftsPage({
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: { id: 'user-123' } } }),
        },
        from: () => ({
          select: () => ({
            eq: function() { return this; },
            is: () => ({
              order: async () => ({ data: null, error: new Error('DB error') }),
            }),
          }),
        }),
      },
    });

    const result = await win.draftsPage.fetchDrafts();
    expect(result).toEqual([]);
  });
});

// ===========================
// deleteDraft — mock supabase
// ===========================

describe('deleteDraft', () => {
  test('ritorna true se il soft-delete ha successo', async () => {
    const win = loadDraftsPage({
      supabase: {
        from: () => ({
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      },
    });

    const result = await win.draftsPage.deleteDraft('trip-abc');
    expect(result).toBe(true);
  });

  test('ritorna false se supabase restituisce errore', async () => {
    const win = loadDraftsPage({
      supabase: {
        from: () => ({
          update: () => ({
            eq: async () => ({ error: new Error('Network error') }),
          }),
        }),
      },
    });

    const result = await win.draftsPage.deleteDraft('trip-abc');
    expect(result).toBe(false);
  });
});
