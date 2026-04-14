/**
 * Netlify Function: Edit Booking
 * Updates fields of a flight or hotel within a trip
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { updateTripDates } = require('./utils/tripDates');
const { notifyCollaborators } = require('./utils/notificationHelper');

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

  const { supabase, user } = authResult;

  try {
    const { tripId, type, itemId, updates } = JSON.parse(event.body);

    if (!tripId || !type || !itemId || !updates) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId, type, itemId and updates are required' })
      };
    }

    if (!['flight', 'hotel', 'train', 'bus', 'rental', 'ferry'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'type must be flight, hotel, train, bus, rental or ferry' })
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
    const itemsMap = {
      flight: tripData.flights,
      hotel: tripData.hotels,
      train: tripData.trains,
      bus: tripData.buses,
      rental: tripData.rentals,
      ferry: tripData.ferries
    };
    const items = itemsMap[type];

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

    // Notify collaborators about the edit
    await notifyCollaborators(tripId, user.id, 'booking_edited',
      'Ha modificato una prenotazione',
      'Edited a booking');

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

// Whitelists of allowed top-level fields per booking type
const ALLOWED_FLIGHT_FIELDS = [
  'date', 'flightNumber', 'departureTime', 'arrivalTime', 'arrivalDate',
  'bookingReference', 'ticketNumber', 'seat', 'class', 'cabin', 'baggage', 'status',
  'airline', 'operatedBy', 'duration', 'arrivalNextDay',
  'departureAirport', 'arrivalAirport', 'departureDate',
  'departure', 'arrival', 'passenger', 'passengers',
  'pdfPath', 'price', 'currency'
];

const ALLOWED_HOTEL_FIELDS = [
  'name', 'guestName', 'phone', 'email', 'confirmationNumber', 'roomType',
  'bookingReference', 'rooms', 'guests', 'notes', 'nights', 'bedTypes', 'pinCode',
  'checkIn', 'checkOut', 'address', 'price', 'breakfast', 'payment', 'cancellation'
];

const ALLOWED_TRAIN_FIELDS = [
  'date', 'trainNumber', 'operator',
  'departure', 'arrival',
  'class', 'seat', 'coach', 'bookingReference', 'ticketNumber',
  'price', 'passenger'
];

const ALLOWED_BUS_FIELDS = [
  'date', 'operator', 'routeNumber',
  'departure', 'arrival',
  'seat', 'bookingReference',
  'price', 'passenger'
];

const ALLOWED_RENTAL_FIELDS = [
  'date', 'endDate', 'provider', 'bookingReference', 'confirmationNumber',
  'driverName', 'rentalDays',
  'pickupLocation', 'dropoffLocation',
  'vehicle', 'price', 'totalAmount', 'insurance'
];

const ALLOWED_FERRY_FIELDS = [
  'date', 'operator', 'ferryName', 'routeNumber', 'duration',
  'bookingReference', 'ticketNumber', 'cabin', 'deck',
  'departure', 'arrival',
  'price', 'passengers', 'vehicles', 'documentUrl', 'pdfPath',
  'returnFerryId', 'parentFerryId', '_isReturn'
];

function filterUpdates(updates, allowedFields) {
  const filtered = {};
  const blocked = [];
  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) {
      filtered[key] = updates[key];
    } else {
      blocked.push(key);
    }
  }
  if (blocked.length > 0) {
    console.warn('Blocked unauthorized field update:', blocked);
  }
  return filtered;
}

/**
 * Apply updates to an item, handling nested objects
 */
function applyUpdates(item, updates, type) {
  const allowedMap = {
    flight: ALLOWED_FLIGHT_FIELDS,
    hotel: ALLOWED_HOTEL_FIELDS,
    train: ALLOWED_TRAIN_FIELDS,
    bus: ALLOWED_BUS_FIELDS,
    rental: ALLOWED_RENTAL_FIELDS,
    ferry: ALLOWED_FERRY_FIELDS
  };
  const allowedFields = allowedMap[type];
  updates = filterUpdates(updates, allowedFields);

  if (type === 'flight') {
    // Simple fields
    const simpleFields = ['date', 'flightNumber', 'departureTime', 'arrivalTime', 'bookingReference', 'ticketNumber', 'seat', 'class', 'airline', 'operatedBy', 'duration', 'arrivalNextDay', 'baggage', 'status', 'price', 'currency'];
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

    // Passengers array: replace entirely (same pattern as ferry)
    if (updates.passengers && Array.isArray(updates.passengers)) {
      item.passengers = updates.passengers;
      // Keep legacy singular passenger in sync with first entry
      if (updates.passengers.length > 0) {
        if (!item.passenger) item.passenger = {};
        Object.assign(item.passenger, updates.passengers[0]);
      }
    }

    // Document: update or remove (null = explicit removal)
    if ('pdfPath' in updates) {
      item.pdfPath = updates.pdfPath === null ? null : updates.pdfPath;
    }
  } else if (type === 'hotel') {
    // Simple fields
    const simpleFields = ['name', 'guestName', 'phone', 'confirmationNumber', 'roomType', 'rooms', 'nights', 'bedTypes', 'pinCode'];
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

    // Nested: price (total, room, tax)
    if (updates.price) {
      if (!item.price) item.price = {};
      if (updates.price.total) {
        if (!item.price.total) item.price.total = {};
        Object.assign(item.price.total, updates.price.total);
      }
      if (updates.price.room) {
        if (!item.price.room) item.price.room = {};
        Object.assign(item.price.room, updates.price.room);
      }
      if (updates.price.tax) {
        if (!item.price.tax) item.price.tax = {};
        Object.assign(item.price.tax, updates.price.tax);
      }
    }

    // Nested: breakfast
    if (updates.breakfast) {
      if (!item.breakfast) item.breakfast = {};
      Object.assign(item.breakfast, updates.breakfast);
    }

    // Nested: payment
    if (updates.payment) {
      if (!item.payment) item.payment = {};
      Object.assign(item.payment, updates.payment);
    }

    // Nested: cancellation
    if (updates.cancellation) {
      if (!item.cancellation) item.cancellation = {};
      Object.assign(item.cancellation, updates.cancellation);
    }

    // Nested: guests
    if (updates.guests) {
      if (!item.guests) item.guests = {};
      if (updates.guests.adults !== undefined) {
        item.guests.adults = parseInt(updates.guests.adults, 10) || 0;
      }
      if (updates.guests.childrenCount !== undefined) {
        const count = parseInt(updates.guests.childrenCount, 10) || 0;
        item.guests.children = item.guests.children || [];
        while (item.guests.children.length < count) item.guests.children.push({});
        if (item.guests.children.length > count) item.guests.children = item.guests.children.slice(0, count);
        item.guests.total = (item.guests.adults || 0) + count;
      }
    }
  } else if (type === 'train') {
    const simpleFields = ['date', 'trainNumber', 'operator', 'class', 'seat', 'coach', 'bookingReference', 'ticketNumber'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) item[field] = updates[field];
    }
    if (updates.departure) {
      if (!item.departure) item.departure = {};
      Object.assign(item.departure, updates.departure);
    }
    if (updates.arrival) {
      if (!item.arrival) item.arrival = {};
      Object.assign(item.arrival, updates.arrival);
    }
    if (updates.price) {
      if (!item.price) item.price = {};
      Object.assign(item.price, updates.price);
    }
    if (updates.passenger) {
      if (!item.passenger) item.passenger = {};
      Object.assign(item.passenger, updates.passenger);
    }
  } else if (type === 'bus') {
    const simpleFields = ['date', 'operator', 'routeNumber', 'seat', 'bookingReference'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) item[field] = updates[field];
    }
    if (updates.departure) {
      if (!item.departure) item.departure = {};
      Object.assign(item.departure, updates.departure);
    }
    if (updates.arrival) {
      if (!item.arrival) item.arrival = {};
      Object.assign(item.arrival, updates.arrival);
    }
    if (updates.price) {
      if (!item.price) item.price = {};
      Object.assign(item.price, updates.price);
    }
    if (updates.passenger) {
      if (!item.passenger) item.passenger = {};
      Object.assign(item.passenger, updates.passenger);
    }
  } else if (type === 'rental') {
    const simpleFields = ['date', 'endDate', 'provider', 'bookingReference', 'confirmationNumber', 'driverName', 'rentalDays'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) item[field] = updates[field];
    }
    if (updates.pickupLocation) {
      if (!item.pickupLocation) item.pickupLocation = {};
      Object.assign(item.pickupLocation, updates.pickupLocation);
    }
    if (updates.dropoffLocation) {
      if (!item.dropoffLocation) item.dropoffLocation = {};
      Object.assign(item.dropoffLocation, updates.dropoffLocation);
    }
    if (updates.vehicle) {
      if (!item.vehicle) item.vehicle = {};
      Object.assign(item.vehicle, updates.vehicle);
    }
    if (updates.price) {
      if (!item.price) item.price = {};
      Object.assign(item.price, updates.price);
    }
    if (updates.totalAmount) {
      if (!item.totalAmount) item.totalAmount = {};
      Object.assign(item.totalAmount, updates.totalAmount);
    }
  } else if (type === 'ferry') {
    const simpleFields = ['date', 'operator', 'ferryName', 'routeNumber', 'duration', 'bookingReference', 'ticketNumber', 'cabin', 'deck', 'returnFerryId', 'parentFerryId', '_isReturn'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) item[field] = updates[field];
    }
    if (updates.departure) {
      if (!item.departure) item.departure = {};
      Object.assign(item.departure, updates.departure);
    }
    if (updates.arrival) {
      if (!item.arrival) item.arrival = {};
      Object.assign(item.arrival, updates.arrival);
    }
    if (updates.price) {
      if (!item.price) item.price = {};
      Object.assign(item.price, updates.price);
    }
    // Replace passengers array entirely when provided
    if (updates.passengers && Array.isArray(updates.passengers)) {
      item.passengers = updates.passengers;
      // Keep legacy singular passenger in sync with first entry
      if (updates.passengers.length > 0) {
        if (!item.passenger) item.passenger = {};
        Object.assign(item.passenger, updates.passengers[0]);
      }
    }
    // Replace vehicles array entirely when provided
    if (updates.vehicles && Array.isArray(updates.vehicles)) {
      item.vehicles = updates.vehicles;
    }
    // Document URL: update or remove (null = explicit removal)
    if ('documentUrl' in updates) {
      item.documentUrl = updates.documentUrl === null ? null : updates.documentUrl;
    }
    if ('pdfPath' in updates) {
      item.pdfPath = updates.pdfPath === null ? null : updates.pdfPath;
    }
  }
}
