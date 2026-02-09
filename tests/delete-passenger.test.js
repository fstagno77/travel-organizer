/**
 * Tests for delete-passenger.js Netlify Function
 * Removes a passenger from all flights with the same booking reference
 */

const mockAuthenticateRequest = jest.fn();
const mockDeletePdf = jest.fn();
const mockSupabaseFrom = jest.fn();

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
  handleOptions: () => ({ statusCode: 200, headers: {}, body: '' })
}));

jest.mock('../netlify/functions/utils/storage', () => ({
  deletePdf: (...args) => mockDeletePdf(...args)
}));

const { handler } = require('../netlify/functions/delete-passenger');

function makeEvent(body, method = 'POST', authorized = true) {
  if (authorized) {
    mockAuthenticateRequest.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockSupabaseFrom }
    });
  } else {
    mockAuthenticateRequest.mockResolvedValue(null);
  }

  return {
    httpMethod: method,
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body)
  };
}

function mockSupabaseSelectAndUpdate(tripData, updateError = null) {
  const selectChain = {
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: tripData ? { id: 'trip-1', data: tripData } : null,
        error: tripData ? null : { message: 'not found' }
      })
    })
  };
  const updateChain = {
    eq: jest.fn().mockResolvedValue({ error: updateError })
  };

  mockSupabaseFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue(selectChain),
    update: jest.fn().mockReturnValue(updateChain)
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDeletePdf.mockResolvedValue();
});

// ============ TESTS ============

describe('delete-passenger handler', () => {

  describe('HTTP method handling', () => {
    test('returns 200 for OPTIONS', async () => {
      const event = { httpMethod: 'OPTIONS', headers: {}, body: '{}' };
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
    });

    test('returns 405 for GET', async () => {
      const event = makeEvent({}, 'GET');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(405);
    });

    test('returns 401 for unauthenticated request', async () => {
      const event = makeEvent({}, 'POST', false);
      const res = await handler(event, {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('input validation', () => {
    test('returns 400 when tripId is missing', async () => {
      mockSupabaseSelectAndUpdate({});
      const event = makeEvent({ passengerName: 'Test', bookingReference: 'ABC123' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Trip ID is required');
    });

    test('returns 400 when passengerName is missing', async () => {
      mockSupabaseSelectAndUpdate({});
      const event = makeEvent({ tripId: 'trip-1', bookingReference: 'ABC123' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Passenger name is required');
    });

    test('returns 400 when bookingReference is missing', async () => {
      mockSupabaseSelectAndUpdate({});
      const event = makeEvent({ tripId: 'trip-1', passengerName: 'Test' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Booking reference is required');
    });
  });

  describe('trip lookup', () => {
    test('returns 404 when trip not found', async () => {
      mockSupabaseSelectAndUpdate(null);
      const event = makeEvent({
        tripId: 'nonexistent', passengerName: 'Test', bookingReference: 'ABC'
      });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe('Trip not found');
    });
  });

  describe('passenger removal', () => {
    test('removes passenger from single flight', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [
            { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' },
            { name: 'Giordano Ginevra', type: 'CHD', ticketNumber: '055 9998887776' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.removedFromFlights).toBe(1);
      expect(body.tripData.flights[0].passengers).toHaveLength(1);
      expect(body.tripData.flights[0].passengers[0].name).toBe('Giordano Ginevra');
    });

    test('removes passenger from multiple flights with same booking ref', async () => {
      const tripData = {
        flights: [
          {
            flightNumber: 'AZ1782',
            date: '2026-06-15',
            bookingReference: 'YPPN5D',
            passengers: [
              { name: 'Brignone Agata', type: 'ADT' },
              { name: 'Giordano Ginevra', type: 'CHD' }
            ]
          },
          {
            flightNumber: 'AZ1783',
            date: '2026-06-20',
            bookingReference: 'YPPN5D',
            passengers: [
              { name: 'Brignone Agata', type: 'ADT' },
              { name: 'Giordano Ginevra', type: 'CHD' }
            ]
          }
        ]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).removedFromFlights).toBe(2);
      expect(tripData.flights[0].passengers).toHaveLength(1);
      expect(tripData.flights[1].passengers).toHaveLength(1);
    });

    test('case-insensitive passenger name matching', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [
            { name: 'Brignone Agata', type: 'ADT' },
            { name: 'Giordano Ginevra', type: 'CHD' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'BRIGNONE AGATA',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).removedFromFlights).toBe(1);
    });

    test('case-insensitive booking reference matching', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'yppn5d'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).removedFromFlights).toBe(1);
    });

    test('returns 404 when passenger not found in any flight', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Unknown Person',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toContain('Passenger not found');
    });

    test('does not match different booking reference', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'OTHER',
          passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PDF cleanup', () => {
    test('deletes passenger PDF when removing passenger', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [
            { name: 'Brignone Agata', type: 'ADT', pdfPath: 'trips/trip-1/flight-1-p0.pdf' },
            { name: 'Giordano Ginevra', type: 'CHD' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(mockDeletePdf).toHaveBeenCalledWith('trips/trip-1/flight-1-p0.pdf');
    });

    test('does not call deletePdf when passenger has no pdfPath', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [
            { name: 'Brignone Agata', type: 'ADT' },
            { name: 'Giordano Ginevra', type: 'CHD' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      await handler(event, {});
      expect(mockDeletePdf).not.toHaveBeenCalled();
    });
  });

  describe('empty flight cleanup', () => {
    test('removes flight when all passengers are deleted', async () => {
      const tripData = {
        flights: [
          {
            flightNumber: 'AZ1782',
            date: '2026-06-15',
            bookingReference: 'YPPN5D',
            departure: { code: 'FCO' },
            arrival: { code: 'NRT' },
            passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
          },
          {
            flightNumber: 'AZ1783',
            date: '2026-06-20',
            bookingReference: 'OTHER',
            departure: { code: 'NRT' },
            arrival: { code: 'FCO' },
            passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
          }
        ]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      // The first flight (YPPN5D) should be removed, second (OTHER) remains
      expect(tripData.flights).toHaveLength(1);
      expect(tripData.flights[0].bookingReference).toBe('OTHER');
    });

    test('updates trip dates after removing flights', async () => {
      const tripData = {
        startDate: '2026-06-10',
        endDate: '2026-06-25',
        flights: [
          {
            flightNumber: 'AZ1782',
            date: '2026-06-10',
            bookingReference: 'DELETE',
            departure: { code: 'FCO' },
            arrival: { code: 'NRT' },
            passengers: [{ name: 'Test Person', type: 'ADT' }]
          },
          {
            flightNumber: 'AZ1783',
            date: '2026-06-20',
            bookingReference: 'KEEP',
            departure: { code: 'NRT' },
            arrival: { code: 'FCO' },
            passengers: [{ name: 'Other Person', type: 'ADT' }]
          }
        ],
        hotels: [{
          checkIn: { date: '2026-06-10' },
          checkOut: { date: '2026-06-20' }
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Test Person',
        bookingReference: 'DELETE'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      // After removing the June 10 flight, dates should recalculate from remaining data
      expect(tripData.startDate).toBe('2026-06-10'); // hotel check-in still June 10
      expect(tripData.endDate).toBe('2026-06-20');
    });

    test('deletes flight-level PDF when flight is removed', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          pdfPath: 'trips/trip-1/flight-1.pdf',
          departure: { code: 'FCO' },
          arrival: { code: 'NRT' },
          passengers: [{ name: 'Solo Traveler', type: 'ADT' }]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Solo Traveler',
        bookingReference: 'YPPN5D'
      });

      await handler(event, {});
      expect(mockDeletePdf).toHaveBeenCalledWith('trips/trip-1/flight-1.pdf');
    });
  });

  describe('Supabase update errors', () => {
    test('returns 500 when update fails', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passengers: [
            { name: 'Brignone Agata', type: 'ADT' },
            { name: 'Giordano Ginevra', type: 'CHD' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData, { message: 'DB error' });

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Brignone Agata',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error).toBe('Failed to update trip');
    });
  });

  describe('edge cases', () => {
    test('handles trip with no flights array', async () => {
      const tripData = { hotels: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Test',
        bookingReference: 'ABC'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toContain('Passenger not found');
    });

    test('handles flights without passengers array', async () => {
      const tripData = {
        flights: [{
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D'
          // no passengers array
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Test',
        bookingReference: 'YPPN5D'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
    });

    test('deduplicates PDF paths before deletion', async () => {
      const tripData = {
        flights: [
          {
            flightNumber: 'AZ1782',
            date: '2026-06-15',
            bookingReference: 'YPPN5D',
            passengers: [{ name: 'Test Person', type: 'ADT', pdfPath: 'trips/trip-1/shared.pdf' }]
          },
          {
            flightNumber: 'AZ1783',
            date: '2026-06-20',
            bookingReference: 'YPPN5D',
            passengers: [{ name: 'Test Person', type: 'ADT', pdfPath: 'trips/trip-1/shared.pdf' }]
          }
        ]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        tripId: 'trip-1',
        passengerName: 'Test Person',
        bookingReference: 'YPPN5D'
      });

      await handler(event, {});
      // Same PDF path should only be deleted once
      expect(mockDeletePdf).toHaveBeenCalledTimes(1);
    });
  });
});
