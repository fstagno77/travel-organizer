/**
 * Trip Dates - Shared logic for updating trip dates and route
 * based on all flights and hotels in the trip data.
 */

/**
 * Update trip dates and route based on remaining flights and hotels.
 * Recalculates startDate, endDate, and route from the current data.
 *
 * @param {Object} tripData - The trip data object (mutated in place)
 */
function updateTripDates(tripData) {
  const dates = [];

  if (tripData.flights) {
    tripData.flights.forEach(f => {
      if (f.date) dates.push(new Date(f.date));
    });
  }

  if (tripData.hotels) {
    tripData.hotels.forEach(h => {
      if (h.checkIn?.date) dates.push(new Date(h.checkIn.date));
      if (h.checkOut?.date) dates.push(new Date(h.checkOut.date));
    });
  }

  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    tripData.startDate = dates[0].toISOString().split('T')[0];
    tripData.endDate = dates[dates.length - 1].toISOString().split('T')[0];
  }

  if (tripData.flights && tripData.flights.length > 0) {
    const sortedFlights = [...tripData.flights].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
    const departures = sortedFlights.map(f => f.departure?.code).filter(Boolean);
    const arrivals = sortedFlights.map(f => f.arrival?.code).filter(Boolean);
    const allCodes = [departures[0], ...arrivals];
    tripData.route = allCodes.join(' → ');
  }
}

module.exports = { updateTripDates };
