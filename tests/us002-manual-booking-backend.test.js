/**
 * US-002: Backend — endpoint salvataggio prenotazione manuale
 * Tests per il branch action='manual-booking' in add-booking.js
 */

// Mock dipendenze esterne
const mockAuthenticateRequest = jest.fn();
const mockGetServiceClient = jest.fn();
const mockNotifyCollaborators = jest.fn();
const mockUpdateTripDates = jest.fn();

jest.mock('../netlify/functions/utils/auth', () => ({
  authenticateRequest: (...args) => mockAuthenticateRequest(...args),
  unauthorizedResponse: () => ({
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Unauthorized' })
  }),
  getCorsHeaders: () => ({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }),
  handleOptions: () => ({ statusCode: 200, headers: {}, body: '' }),
  getServiceClient: (...args) => mockGetServiceClient(...args)
}));

jest.mock('../netlify/functions/utils/storage', () => ({
  uploadPdf: jest.fn(),
  deletePdf: jest.fn(),
  downloadPdfAsBase64: jest.fn(),
  moveTmpPdfToTrip: jest.fn(),
  cleanupTmpPdfs: jest.fn()
}));

jest.mock('../netlify/functions/utils/pdfProcessor', () => ({
  processPdfsWithClaude: jest.fn(),
  extractPassengerFromFilename: jest.fn()
}));

jest.mock('../netlify/functions/utils/tripDates', () => ({
  updateTripDates: (...args) => mockUpdateTripDates(...args)
}));

jest.mock('../netlify/functions/utils/deduplication', () => ({
  deduplicateFlights: jest.fn().mockReturnValue({ deduplicatedFlights: [], skippedFlights: 0, updatedFlights: [] }),
  deduplicateHotels: jest.fn().mockReturnValue({ deduplicatedHotels: [], skippedHotels: 0, updatedHotels: [] }),
  deduplicateTrains: jest.fn().mockReturnValue({ deduplicatedTrains: [], skippedTrains: 0, updatedTrains: [] }),
  deduplicateBuses: jest.fn().mockReturnValue({ deduplicatedBuses: [], skippedBuses: 0, updatedBuses: [] }),
  deduplicateRentals: jest.fn().mockReturnValue({ deduplicatedRentals: [], skippedRentals: 0, updatedRentals: [] }),
  deduplicateFerries: jest.fn().mockReturnValue({ deduplicatedFerries: [], skippedFerries: 0, updatedFerries: [] })
}));

jest.mock('../netlify/functions/utils/notificationHelper', () => ({
  notifyCollaborators: (...args) => mockNotifyCollaborators(...args)
}));

const { handler } = require('../netlify/functions/add-booking');

// ─── Helpers ───────────────────────────────────────────────────

function makeEvent(body, method = 'POST') {
  return {
    httpMethod: method,
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body)
  };
}

function setupMocks(tripData = {}) {
  const mockFrom = jest.fn();
  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null })
  });
  const mockSelect = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'trip-1', data: tripData },
        error: null
      })
    })
  });

  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate
  });

  const mockSupabase = { from: mockFrom };
  const mockServiceClient = { from: mockFrom };

  mockAuthenticateRequest.mockResolvedValue({
    user: { id: 'user-1' },
    supabase: mockSupabase
  });

  mockGetServiceClient.mockReturnValue(mockServiceClient);
  mockNotifyCollaborators.mockResolvedValue();
  mockUpdateTripDates.mockImplementation(() => {});

  return { mockFrom, mockSupabase };
}

// ─── Dati di test ──────────────────────────────────────────────

const validFlightData = {
  flightNumber: 'AZ1234',
  airline: 'ITA Airways',
  date: '2026-06-15',
  departureTime: '10:00',
  departureCity: 'Roma',
  arrivalCity: 'Milano'
};

const validHotelData = {
  name: 'Hotel Roma',
  city: 'Roma',
  checkIn: { date: '2026-06-15' },
  checkOut: { date: '2026-06-18' }
};

// ─── Test: volo valido → 200 ───────────────────────────────────

describe('Salvataggio manuale volo', () => {
  test('volo con campi obbligatori → 200', async () => {
    setupMocks({ flights: [], hotels: [] });

    const event = makeEvent({
      action: 'manual-booking',
      type: 'flight',
      tripId: 'trip-1',
      manualData: validFlightData
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.added).toEqual({ flights: 1 });
    expect(body.newBookingId).toBe('flight-1');
  });

  test('volo senza flightNumber → 400', async () => {
    setupMocks({});

    const { flightNumber, ...missingFlightNumber } = validFlightData;

    const event = makeEvent({
      action: 'manual-booking',
      type: 'flight',
      tripId: 'trip-1',
      manualData: missingFlightNumber
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.missingField).toBe('flightNumber');
  });

  test('volo senza airline → 400', async () => {
    setupMocks({});

    const { airline, ...missingAirline } = validFlightData;

    const event = makeEvent({
      action: 'manual-booking',
      type: 'flight',
      tripId: 'trip-1',
      manualData: missingAirline
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.missingField).toBe('airline');
  });

  test('il volo viene salvato in tripData.flights', async () => {
    const capturedUpdates = [];
    const mockFrom = jest.fn();

    mockFrom.mockImplementation((table) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'trip-1', data: { flights: [] } },
            error: null
          })
        })
      }),
      update: jest.fn().mockImplementation((payload) => {
        capturedUpdates.push(payload);
        return { eq: jest.fn().mockResolvedValue({ error: null }) };
      })
    }));

    mockAuthenticateRequest.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockFrom }
    });
    mockGetServiceClient.mockReturnValue({ from: mockFrom });
    mockNotifyCollaborators.mockResolvedValue();
    mockUpdateTripDates.mockImplementation(() => {});

    const event = makeEvent({
      action: 'manual-booking',
      type: 'flight',
      tripId: 'trip-1',
      manualData: validFlightData
    });

    await handler(event, {});

    expect(capturedUpdates.length).toBeGreaterThan(0);
    const savedData = capturedUpdates[0].data;
    expect(savedData.flights).toHaveLength(1);
    expect(savedData.flights[0].flightNumber).toBe('AZ1234');
    expect(savedData.flights[0].id).toBe('flight-1');
  });
});

// ─── Test: hotel → tripData.hotels ────────────────────────────

describe('Salvataggio manuale hotel', () => {
  test('hotel con campi obbligatori → 200', async () => {
    setupMocks({ hotels: [] });

    const event = makeEvent({
      action: 'manual-booking',
      type: 'hotel',
      tripId: 'trip-1',
      manualData: validHotelData
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.added).toEqual({ hotels: 1 });
  });

  test('hotel salvato in tripData.hotels', async () => {
    setupMocks({ hotels: [] });

    const event = makeEvent({
      action: 'manual-booking',
      type: 'hotel',
      tripId: 'trip-1',
      manualData: validHotelData
    });

    const response = await handler(event, {});
    const body = JSON.parse(response.body);

    expect(body.tripData.hotels).toHaveLength(1);
    expect(body.tripData.hotels[0].name).toBe('Hotel Roma');
    expect(body.tripData.hotels[0].id).toBe('hotel-1');
  });

  test('hotel senza checkIn.date → 400', async () => {
    setupMocks({});

    const event = makeEvent({
      action: 'manual-booking',
      type: 'hotel',
      tripId: 'trip-1',
      manualData: { name: 'Hotel Roma', city: 'Roma', checkOut: { date: '2026-06-18' } }
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.missingField).toBe('checkIn.date');
  });
});

// ─── Test: tipo non supportato → 400 ─────────────────────────

describe('Validazione tipo prenotazione', () => {
  test('tipo sconosciuto → 400', async () => {
    setupMocks({});

    const event = makeEvent({
      action: 'manual-booking',
      type: 'spaceship',
      tripId: 'trip-1',
      manualData: { foo: 'bar' }
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(400);
  });

  test('documentUrl opzionale → salvato in source', async () => {
    setupMocks({ flights: [] });

    const event = makeEvent({
      action: 'manual-booking',
      type: 'flight',
      tripId: 'trip-1',
      manualData: validFlightData,
      documentUrl: 'https://storage.example.com/doc.pdf'
    });

    const response = await handler(event, {});
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.tripData.flights[0].source).toBe('https://storage.example.com/doc.pdf');
  });
});
