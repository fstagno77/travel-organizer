/**
 * Passenger Builder - Shared logic for building passengers arrays from flight data
 * Handles the dual model: flight.passenger (singular) and flight.passengers (array)
 * with ticketNumber fallback from flight level.
 */

/**
 * Build a single passenger entry with ticketNumber fallback from flight level.
 * Conditionally includes _pdfIndex if present on the flight.
 *
 * @param {Object} passenger - The passenger object (name, type, ticketNumber, etc.)
 * @param {Object} flight - The flight object (used for ticketNumber and _pdfIndex fallback)
 * @returns {Object} Passenger entry with ticketNumber resolved
 */
function buildPassengerEntry(passenger, flight) {
  const entry = {
    ...passenger,
    ticketNumber: passenger.ticketNumber || flight.ticketNumber || null
  };
  if (flight._pdfIndex !== undefined) {
    entry._pdfIndex = flight._pdfIndex;
  }
  return entry;
}

/**
 * Ensure a flight has a proper passengers array.
 * - If flight already has passengers array: backfill ticketNumber from flight level
 * - If flight has singular passenger: create array with that passenger
 * - Otherwise: return empty array
 *
 * @param {Object} flight - The flight object
 * @returns {Array} The passengers array (also set on flight.passengers if created)
 */
function buildPassengersArray(flight) {
  if (flight.passengers && Array.isArray(flight.passengers)) {
    // Backfill ticketNumber from flight level into existing passengers that lack it
    flight.passengers.forEach(p => {
      if (!p.ticketNumber && flight.ticketNumber) {
        p.ticketNumber = flight.ticketNumber;
      }
    });
    return flight.passengers;
  }

  if (flight.passenger) {
    return [buildPassengerEntry(flight.passenger, flight)];
  }

  return [];
}

module.exports = { buildPassengersArray, buildPassengerEntry };
