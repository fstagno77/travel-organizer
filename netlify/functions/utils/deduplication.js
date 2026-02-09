/**
 * Deduplication - Shared logic for deduplicating flights and hotels
 * Used by both process-pdf.js (batch-only) and add-booking.js (existing + batch).
 */

const { buildPassengersArray, buildPassengerEntry } = require('./passengerBuilder');

/**
 * Deduplicate hotels against existing hotels and within the new batch.
 * When existingHotels is empty, only deduplicates within the batch.
 *
 * @param {Array} newHotels - New hotels to deduplicate
 * @param {Array} [existingHotels=[]] - Existing hotels in the trip (from DB)
 * @returns {{ deduplicatedHotels: Array, skippedHotels: number }}
 */
function deduplicateHotels(newHotels, existingHotels = []) {
  const deduplicatedHotels = [];
  let skippedHotels = 0;

  for (const newHotel of newHotels) {
    const confirmNum = newHotel.confirmationNumber?.toLowerCase()?.trim();
    const hotelName = newHotel.name?.toLowerCase()?.trim();
    const checkIn = newHotel.checkIn?.date;
    const checkOut = newHotel.checkOut?.date;

    let isDuplicate = false;

    if (confirmNum) {
      const existingHotel = existingHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
      );
      const alreadyInBatch = deduplicatedHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
      );
      isDuplicate = !!(existingHotel || alreadyInBatch);
    } else if (hotelName && checkIn && checkOut) {
      const existingHotel = existingHotels.find(h =>
        h.name?.toLowerCase()?.trim() === hotelName &&
        h.checkIn?.date === checkIn &&
        h.checkOut?.date === checkOut
      );
      const alreadyInBatch = deduplicatedHotels.find(h =>
        h.name?.toLowerCase()?.trim() === hotelName &&
        h.checkIn?.date === checkIn &&
        h.checkOut?.date === checkOut
      );
      isDuplicate = !!(existingHotel || alreadyInBatch);
    }

    if (isDuplicate) {
      console.log(`Skipping duplicate hotel: ${confirmNum || hotelName} (${newHotel.name})`);
      skippedHotels++;
    } else {
      deduplicatedHotels.push(newHotel);
    }
  }

  return { deduplicatedHotels, skippedHotels };
}

/**
 * Deduplicate flights against existing flights and within the new batch.
 * When existingFlights is empty, only deduplicates within the batch.
 * Aggregates passengers when the same flight appears multiple times (different passengers).
 * Mutates existingFlights in place when adding passengers to existing flights.
 *
 * @param {Array} newFlights - New flights to deduplicate
 * @param {Array} [existingFlights=[]] - Existing flights in the trip (from DB)
 * @returns {{ deduplicatedFlights: Array, skippedFlights: number }}
 */
function deduplicateFlights(newFlights, existingFlights = []) {
  const deduplicatedFlights = [];
  let skippedFlights = 0;

  for (const newFlight of newFlights) {
    const bookingRef = newFlight.bookingReference?.toLowerCase()?.trim();
    const flightNum = newFlight.flightNumber?.toLowerCase()?.trim();
    const flightDate = newFlight.date;

    // Check if flight with same booking ref, flight number and date exists in trip
    const existingFlight = existingFlights.find(f =>
      f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
      f.flightNumber?.toLowerCase()?.trim() === flightNum &&
      f.date === flightDate
    );

    if (existingFlight) {
      // Flight exists in trip - aggregate passenger if new
      if (newFlight.passenger) {
        existingFlight.passengers = buildPassengersArray(existingFlight);
        const alreadyHasPassenger = existingFlight.passengers.some(p =>
          (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
          (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
        );
        if (!alreadyHasPassenger) {
          existingFlight.passengers.push(buildPassengerEntry(newFlight.passenger, newFlight));
          existingFlight._needsPdfUpload = true;
          console.log(`Added passenger ${newFlight.passenger.name} to existing flight ${flightNum} on ${flightDate}`);
        } else {
          console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
          skippedFlights++;
        }
      } else {
        console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
        skippedFlights++;
      }
    } else {
      // Check if already in deduplicatedFlights (from same upload batch)
      const alreadyAdded = deduplicatedFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
        f.flightNumber?.toLowerCase()?.trim() === flightNum &&
        f.date === flightDate
      );
      if (!alreadyAdded) {
        // First occurrence - initialize passengers array
        newFlight.passengers = buildPassengersArray(newFlight);
        deduplicatedFlights.push(newFlight);
      } else {
        // Aggregate passenger to flight in batch
        if (newFlight.passenger) {
          alreadyAdded.passengers = buildPassengersArray(alreadyAdded);
          const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
            (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
            (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
          );
          if (!alreadyHasPassenger) {
            alreadyAdded.passengers.push(buildPassengerEntry(newFlight.passenger, newFlight));
            console.log(`Added passenger ${newFlight.passenger.name} to batch flight ${flightNum} on ${flightDate}`);
          } else {
            console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
            skippedFlights++;
          }
        } else {
          console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
          skippedFlights++;
        }
      }
    }
  }

  return { deduplicatedFlights, skippedFlights };
}

module.exports = { deduplicateFlights, deduplicateHotels };
