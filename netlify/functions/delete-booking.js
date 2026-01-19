/**
 * Netlify Function: Delete Booking
 * Deletes a single flight or hotel from a trip in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { tripId, type, itemId } = JSON.parse(event.body);

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    if (!type || !['flight', 'hotel'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Type must be "flight" or "hotel"' })
      };
    }

    if (!itemId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Item ID is required' })
      };
    }

    // Get existing trip
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

    // Get trip data
    const tripData = tripRecord.data;

    // Remove the item from the appropriate array
    if (type === 'flight') {
      const originalLength = tripData.flights?.length || 0;
      tripData.flights = (tripData.flights || []).filter(f => f.id !== itemId);

      if (tripData.flights.length === originalLength) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Flight not found' })
        };
      }
    } else if (type === 'hotel') {
      const originalLength = tripData.hotels?.length || 0;
      tripData.hotels = (tripData.hotels || []).filter(h => h.id !== itemId);

      if (tripData.hotels.length === originalLength) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Hotel not found' })
        };
      }
    }

    // Update trip dates based on remaining flights and hotels
    updateTripDates(tripData);

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
        tripData
      })
    };

  } catch (error) {
    console.error('Error deleting booking:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete booking'
      })
    };
  }
};

/**
 * Update trip dates based on all flights and hotels
 */
function updateTripDates(tripData) {
  const dates = [];

  // Collect dates from flights
  if (tripData.flights) {
    tripData.flights.forEach(f => {
      if (f.date) dates.push(new Date(f.date));
    });
  }

  // Collect dates from hotels
  if (tripData.hotels) {
    tripData.hotels.forEach(h => {
      if (h.checkIn?.date) dates.push(new Date(h.checkIn.date));
      if (h.checkOut?.date) dates.push(new Date(h.checkOut.date));
    });
  }

  // Update trip dates if we have any dates
  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    tripData.startDate = dates[0].toISOString().split('T')[0];
    tripData.endDate = dates[dates.length - 1].toISOString().split('T')[0];
  }

  // Update route based on flights
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
