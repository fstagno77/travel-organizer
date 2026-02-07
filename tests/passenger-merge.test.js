/**
 * Tests for passenger merging logic in add-booking.js and process-pdf.js
 *
 * Reproduces the bug: when uploading a second boarding pass for the same flight,
 * the first passenger's ticketNumber was lost because it lived at the flight level
 * but was never copied into the passengers array.
 */

// Extract the merging logic from add-booking.js into testable functions

/**
 * Simulates the "add passenger to existing flight" logic from add-booking.js lines 214-244
 */
function mergePassengerIntoExistingFlight(existingFlight, newFlight) {
  let skipped = false;

  if (newFlight.passenger) {
    if (!existingFlight.passengers) {
      existingFlight.passengers = existingFlight.passenger
        ? [{ ...existingFlight.passenger, ticketNumber: existingFlight.passenger.ticketNumber || existingFlight.ticketNumber || null }]
        : [];
    } else {
      // Backfill ticketNumber from flight level into existing passengers that lack it
      existingFlight.passengers.forEach(p => {
        if (!p.ticketNumber && existingFlight.ticketNumber) {
          p.ticketNumber = existingFlight.ticketNumber;
        }
      });
    }
    const alreadyHasPassenger = existingFlight.passengers.some(p =>
      (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
      (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
    );
    if (!alreadyHasPassenger) {
      existingFlight.passengers.push({ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex });
      existingFlight._needsPdfUpload = true;
    } else {
      skipped = true;
    }
  } else {
    skipped = true;
  }

  return { skipped };
}

/**
 * Simulates the "create passengers array for new flight" logic from process-pdf.js line 180
 */
function initializePassengersArray(flight) {
  flight.passengers = flight.passenger
    ? [{ ...flight.passenger, ticketNumber: flight.passenger.ticketNumber || flight.ticketNumber || null, _pdfIndex: flight._pdfIndex }]
    : [];
}

/**
 * Simulates batch dedup logic from add-booking.js lines 246-282
 */
function deduplicateFlightsBatch(flights) {
  const deduplicatedFlights = [];

  for (const newFlight of flights) {
    const bookingRef = newFlight.bookingReference?.toLowerCase()?.trim();
    const flightNum = newFlight.flightNumber?.toLowerCase()?.trim();
    const flightDate = newFlight.date;

    const alreadyAdded = deduplicatedFlights.find(f =>
      f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
      f.flightNumber?.toLowerCase()?.trim() === flightNum &&
      f.date === flightDate
    );

    if (!alreadyAdded) {
      newFlight.passengers = newFlight.passenger
        ? [{ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex }]
        : [];
      deduplicatedFlights.push(newFlight);
    } else {
      if (newFlight.passenger) {
        if (!alreadyAdded.passengers) {
          alreadyAdded.passengers = alreadyAdded.passenger
            ? [{ ...alreadyAdded.passenger, ticketNumber: alreadyAdded.passenger.ticketNumber || alreadyAdded.ticketNumber || null, _pdfIndex: alreadyAdded._pdfIndex }]
            : [];
        }
        const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
          (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
          (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
        );
        if (!alreadyHasPassenger) {
          alreadyAdded.passengers.push({ ...newFlight.passenger, ticketNumber: newFlight.passenger.ticketNumber || newFlight.ticketNumber || null, _pdfIndex: newFlight._pdfIndex });
        }
      }
    }
  }

  return deduplicatedFlights;
}


// ============ TESTS ============

describe('Passenger merge: ticketNumber preservation', () => {

  describe('Bug scenario: second boarding pass loses first passenger ticketNumber', () => {

    test('ticketNumber at flight level should be preserved when adding second passenger (main bug)', () => {
      // Simulate: first PDF uploaded, saved to DB with passengers array
      // but ticketNumber only at flight level, not in passenger object
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT' } // no ticketNumber in passenger!
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers).toHaveLength(2);
      // First passenger should have ticketNumber backfilled from flight level
      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
      // Second passenger has no ticket
      expect(existingFlight.passengers[1].name).toBe('Giordano Ginevra');
    });

    test('ticketNumber preserved when both passengers have ticket numbers', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 9998887776',
        passenger: { name: 'Giordano Ginevra', type: 'CHD', ticketNumber: '055 9998887776' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers).toHaveLength(2);
      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
      expect(existingFlight.passengers[1].ticketNumber).toBe('055 9998887776');
    });

    test('new passenger ticketNumber falls back to flight level', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }
        ]
      };

      // New flight has ticketNumber at flight level but not in passenger
      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 9998887776',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers).toHaveLength(2);
      expect(existingFlight.passengers[1].ticketNumber).toBe('055 9998887776');
    });
  });

  describe('Old data model: flight without passengers array (only passenger singular)', () => {

    test('converts single passenger to array with ticketNumber from flight level', () => {
      // Old data model: no passengers array, only passenger (singular)
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passenger: { name: 'Brignone Agata', type: 'ADT' } // no ticketNumber
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers).toHaveLength(2);
      expect(existingFlight.passengers[0].name).toBe('Brignone Agata');
      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
      expect(existingFlight.passengers[1].name).toBe('Giordano Ginevra');
    });

    test('old model: passenger already has ticketNumber, keep it', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passenger: { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
    });

    test('old model: no passenger and no passengers creates empty array', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829'
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers).toHaveLength(1);
      expect(existingFlight.passengers[0].name).toBe('Giordano Ginevra');
    });
  });

  describe('Duplicate passenger detection', () => {

    test('skips duplicate by name', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' },
        _pdfIndex: 0
      };

      const { skipped } = mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(skipped).toBe(true);
      expect(existingFlight.passengers).toHaveLength(1);
    });

    test('skips duplicate by ticketNumber', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [
          { name: 'Agata Brignone', type: 'ADT', ticketNumber: '055 2112363829' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'BRIGNONE AGATA', type: 'ADT', ticketNumber: '055 2112363829' },
        _pdfIndex: 0
      };

      const { skipped } = mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(skipped).toBe(true);
      expect(existingFlight.passengers).toHaveLength(1);
    });

    test('does not skip when names differ', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      const { skipped } = mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(skipped).toBe(false);
      expect(existingFlight.passengers).toHaveLength(2);
    });
  });

  describe('initializePassengersArray (process-pdf.js new flight path)', () => {

    test('copies ticketNumber from flight level when passenger lacks it', () => {
      const flight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        ticketNumber: '055 2112363829',
        passenger: { name: 'Brignone Agata', type: 'ADT' },
        _pdfIndex: 0
      };

      initializePassengersArray(flight);

      expect(flight.passengers).toHaveLength(1);
      expect(flight.passengers[0].ticketNumber).toBe('055 2112363829');
      expect(flight.passengers[0].name).toBe('Brignone Agata');
      expect(flight.passengers[0]._pdfIndex).toBe(0);
    });

    test('keeps passenger ticketNumber when present', () => {
      const flight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        ticketNumber: '055 2112363829',
        passenger: { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' },
        _pdfIndex: 0
      };

      initializePassengersArray(flight);

      expect(flight.passengers[0].ticketNumber).toBe('055 2112363829');
    });

    test('creates empty array when no passenger', () => {
      const flight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        ticketNumber: '055 2112363829',
        _pdfIndex: 0
      };

      initializePassengersArray(flight);

      expect(flight.passengers).toEqual([]);
    });

    test('handles null ticketNumber everywhere', () => {
      const flight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        ticketNumber: null,
        passenger: { name: 'Test', type: 'ADT', ticketNumber: null },
        _pdfIndex: 0
      };

      initializePassengersArray(flight);

      expect(flight.passengers[0].ticketNumber).toBeNull();
    });
  });

  describe('Batch deduplication with ticketNumber', () => {

    test('two PDFs same flight, different passengers - both get ticketNumbers', () => {
      const flights = [
        {
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          ticketNumber: '055 2112363829',
          passenger: { name: 'Brignone Agata', type: 'ADT' },
          _pdfIndex: 0
        },
        {
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          ticketNumber: '055 9998887776',
          passenger: { name: 'Giordano Ginevra', type: 'CHD' },
          _pdfIndex: 1
        }
      ];

      const result = deduplicateFlightsBatch(flights);

      expect(result).toHaveLength(1);
      expect(result[0].passengers).toHaveLength(2);
      expect(result[0].passengers[0].ticketNumber).toBe('055 2112363829');
      expect(result[0].passengers[0].name).toBe('Brignone Agata');
      expect(result[0].passengers[1].ticketNumber).toBe('055 9998887776');
      expect(result[0].passengers[1].name).toBe('Giordano Ginevra');
    });

    test('batch dedup: first flight has no ticket, second does', () => {
      const flights = [
        {
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          passenger: { name: 'Giordano Ginevra', type: 'CHD' },
          _pdfIndex: 0
        },
        {
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          ticketNumber: '055 2112363829',
          passenger: { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' },
          _pdfIndex: 1
        }
      ];

      const result = deduplicateFlightsBatch(flights);

      expect(result).toHaveLength(1);
      expect(result[0].passengers).toHaveLength(2);
      expect(result[0].passengers[1].ticketNumber).toBe('055 2112363829');
    });

    test('batch dedup: different flights are not merged', () => {
      const flights = [
        {
          flightNumber: 'AZ1782',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          ticketNumber: '055 2112363829',
          passenger: { name: 'Brignone Agata', type: 'ADT' },
          _pdfIndex: 0
        },
        {
          flightNumber: 'AZ1783',
          date: '2026-06-15',
          bookingReference: 'YPPN5D',
          ticketNumber: '055 9998887776',
          passenger: { name: 'Brignone Agata', type: 'ADT' },
          _pdfIndex: 0
        }
      ];

      const result = deduplicateFlightsBatch(flights);

      expect(result).toHaveLength(2);
      expect(result[0].passengers).toHaveLength(1);
      expect(result[1].passengers).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {

    test('newFlight with no passenger property is skipped', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [{ name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D'
      };

      const { skipped } = mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(skipped).toBe(true);
      expect(existingFlight.passengers).toHaveLength(1);
    });

    test('_needsPdfUpload is set when new passenger added', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight._needsPdfUpload).toBe(true);
    });

    test('_pdfIndex is set on pushed passenger', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passengers: [{ name: 'Brignone Agata', type: 'ADT' }]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 2
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      expect(existingFlight.passengers[1]._pdfIndex).toBe(2);
    });

    test('multiple passengers missing ticketNumber all get backfilled', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 2112363829',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT' },
          { name: 'Stagno Federico', type: 'ADT' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      // Both existing passengers should get flight-level ticketNumber backfilled
      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
      expect(existingFlight.passengers[1].ticketNumber).toBe('055 2112363829');
      expect(existingFlight.passengers).toHaveLength(3);
    });

    test('does not overwrite existing passenger ticketNumber during backfill', () => {
      const existingFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        ticketNumber: '055 0000000000',
        passengers: [
          { name: 'Brignone Agata', type: 'ADT', ticketNumber: '055 2112363829' }
        ]
      };

      const newFlight = {
        flightNumber: 'AZ1782',
        date: '2026-06-15',
        bookingReference: 'YPPN5D',
        passenger: { name: 'Giordano Ginevra', type: 'CHD' },
        _pdfIndex: 0
      };

      mergePassengerIntoExistingFlight(existingFlight, newFlight);

      // Existing passenger keeps their own ticketNumber, not overwritten by flight-level
      expect(existingFlight.passengers[0].ticketNumber).toBe('055 2112363829');
    });
  });
});
