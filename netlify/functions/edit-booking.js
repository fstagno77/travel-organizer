/**
 * Netlify Function: Edit Booking
 * Updates fields of a flight or hotel within a trip
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { updateTripDates } = require('./utils/tripDates');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

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

  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { supabase } = authResult;

  try {
    const { tripId, type, itemId, updates } = JSON.parse(event.body);

    if (!tripId || !type || !itemId || !updates) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId, type, itemId and updates are required' })
      };
    }

    if (type !== 'flight' && type !== 'hotel') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'type must be flight or hotel' })
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

    const tripData = tripRecord.data;
    const items = type === 'flight' ? tripData.flights : tripData.hotels;

    if (!items) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'No items found' })
      };
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: `${type} not found` })
      };
    }

    // Apply updates with deep merge for nested objects
    applyUpdates(item, updates, type);

    // Recalculate nights for hotels if dates changed
    if (type === 'hotel' && (updates.checkIn || updates.checkOut)) {
      const checkInDate = item.checkIn?.date;
      const checkOutDate = item.checkOut?.date;
      if (checkInDate && checkOutDate) {
        const diffMs = new Date(checkOutDate) - new Date(checkInDate);
        item.nights = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
      }
    }

    // Recalculate trip dates and route
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
      body: JSON.stringify({ success: true, tripData })
    };

  } catch (error) {
    console.error('Error editing booking:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to edit booking' })
    };
  }
};

/**
 * Apply updates to an item, handling nested objects
 */
function applyUpdates(item, updates, type) {
  if (type === 'flight') {
    // Simple fields
    const simpleFields = ['date', 'flightNumber', 'departureTime', 'arrivalTime', 'bookingReference', 'ticketNumber', 'seat', 'class'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) {
        item[field] = updates[field];
      }
    }

    // Nested: departure
    if (updates.departure) {
      if (!item.departure) item.departure = {};
      Object.assign(item.departure, updates.departure);
    }

    // Nested: arrival
    if (updates.arrival) {
      if (!item.arrival) item.arrival = {};
      Object.assign(item.arrival, updates.arrival);
    }

    // Passengers array
    if (updates.passengers && Array.isArray(updates.passengers)) {
      if (item.passengers && Array.isArray(item.passengers)) {
        for (let i = 0; i < updates.passengers.length && i < item.passengers.length; i++) {
          Object.assign(item.passengers[i], updates.passengers[i]);
        }
      }
      // Also update singular passenger if it exists
      if (item.passenger && updates.passengers[0]) {
        Object.assign(item.passenger, updates.passengers[0]);
      }
    }
  } else if (type === 'hotel') {
    // Simple fields
    const simpleFields = ['name', 'guestName', 'phone', 'confirmationNumber', 'roomType'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) {
        item[field] = updates[field];
      }
    }

    // Nested: checkIn
    if (updates.checkIn) {
      if (!item.checkIn) item.checkIn = {};
      Object.assign(item.checkIn, updates.checkIn);
    }

    // Nested: checkOut
    if (updates.checkOut) {
      if (!item.checkOut) item.checkOut = {};
      Object.assign(item.checkOut, updates.checkOut);
    }

    // Nested: address
    if (updates.address) {
      if (!item.address) item.address = {};
      Object.assign(item.address, updates.address);
    }

    // Nested: price
    if (updates.price) {
      if (!item.price) item.price = {};
      if (updates.price.total) {
        if (!item.price.total) item.price.total = {};
        Object.assign(item.price.total, updates.price.total);
      }
    }
  }
}
