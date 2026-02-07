/**
 * Netlify Function: Delete Passenger
 * Removes a passenger from all flights with the same booking reference
 * Also deletes the passenger's associated PDF from storage
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { deletePdf } = require('./utils/storage');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { supabase } = authResult;

  try {
    const { tripId, passengerName, bookingReference } = JSON.parse(event.body);

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    if (!passengerName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Passenger name is required' })
      };
    }

    if (!bookingReference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Booking reference is required' })
      };
    }

    // Get existing trip (RLS ensures user can only access own trips)
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = tripRecord.data;
    const normalizedBookingRef = bookingReference.toLowerCase().trim();
    const normalizedPassengerName = passengerName.toLowerCase().trim();

    let removedCount = 0;
    const pdfsToDelete = [];

    // Find all flights with this booking reference and remove the passenger
    if (tripData.flights) {
      for (const flight of tripData.flights) {
        const flightBookingRef = flight.bookingReference?.toLowerCase()?.trim();

        if (flightBookingRef === normalizedBookingRef && flight.passengers) {
          const passengerIndex = flight.passengers.findIndex(p =>
            p.name?.toLowerCase()?.trim() === normalizedPassengerName
          );

          if (passengerIndex !== -1) {
            const passenger = flight.passengers[passengerIndex];

            // Collect PDF to delete
            if (passenger.pdfPath) {
              pdfsToDelete.push(passenger.pdfPath);
            }

            // Remove passenger from array
            flight.passengers.splice(passengerIndex, 1);
            removedCount++;

            console.log(`Removed passenger ${passengerName} from flight ${flight.flightNumber} on ${flight.date}`);
          }
        }
      }
    }

    if (removedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Passenger not found in any flight with this booking reference'
        })
      };
    }

    // Remove flights that now have empty passengers arrays (all passengers deleted)
    if (tripData.flights) {
      const emptyFlights = tripData.flights.filter(f =>
        f.bookingReference?.toLowerCase()?.trim() === normalizedBookingRef &&
        f.passengers && f.passengers.length === 0
      );
      for (const flight of emptyFlights) {
        if (flight.pdfPath) {
          pdfsToDelete.push(flight.pdfPath);
        }
        console.log(`Removing flight ${flight.flightNumber} on ${flight.date} (no passengers remaining)`);
      }
      if (emptyFlights.length > 0) {
        tripData.flights = tripData.flights.filter(f =>
          !(f.bookingReference?.toLowerCase()?.trim() === normalizedBookingRef &&
            f.passengers && f.passengers.length === 0)
        );
        updateTripDates(tripData);
      }
    }

    // Delete associated PDFs (unique paths only)
    const uniquePdfs = [...new Set(pdfsToDelete)];
    for (const pdfPath of uniquePdfs) {
      try {
        console.log(`Deleting PDF: ${pdfPath}`);
        await deletePdf(pdfPath);
      } catch (err) {
        console.error(`Error deleting PDF ${pdfPath}:`, err);
        // Continue even if PDF deletion fails
      }
    }

    // Save updated trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Supabase error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to update trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        removedFromFlights: removedCount,
        tripData
      })
    };

  } catch (error) {
    console.error('Error deleting passenger:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete passenger'
      })
    };
  }
};

/**
 * Update trip dates and route based on remaining flights and hotels
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
