/**
 * Netlify Function: Pending Bookings
 * CRUD operations for pending bookings from email forwarding
 *
 * GET /pending-bookings - List all pending bookings (status=pending)
 * GET /pending-bookings?id=xxx - Get single pending booking details
 * POST /pending-bookings/associate - Associate with existing trip
 * POST /pending-bookings/create-trip - Create new trip from pending booking
 * POST /pending-bookings/dismiss - Dismiss/ignore a pending booking
 * DELETE /pending-bookings?id=xxx - Hard delete a pending booking
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { movePdfToTrip, deletePendingPdf, uploadPdf } = require('./utils/storage');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;
  const path = event.path.replace('/.netlify/functions/pending-bookings', '');

  try {
    // GET - List or get single
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;

      if (id) {
        return await getSinglePendingBooking(supabase, id, headers);
      }

      return await listPendingBookings(supabase, headers);
    }

    // POST - Actions
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (path === '/associate') {
        return await handleAssociate(supabase, user, body, headers);
      }

      if (path === '/create-trip') {
        return await handleCreateTrip(supabase, user, body, headers);
      }

      if (path === '/dismiss') {
        return await handleDismiss(supabase, body, headers);
      }

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Unknown action' })
      };
    }

    // DELETE - Hard delete
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Missing id parameter' })
        };
      }
      return await handleDelete(supabase, id, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error in pending-bookings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

/**
 * List all pending bookings for the authenticated user
 */
async function listPendingBookings(supabase, headers) {
  const { data, error } = await supabase
    .from('pending_bookings')
    .select('id, booking_type, status, summary_title, summary_dates, email_subject, email_from, email_received_at, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing pending bookings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to fetch pending bookings' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      bookings: data || [],
      count: data?.length || 0
    })
  };
}

/**
 * Get single pending booking with full details
 */
async function getSinglePendingBooking(supabase, id, headers) {
  const { data, error } = await supabase
    .from('pending_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Pending booking not found' })
    };
  }

  // Also fetch user's trips for the association dropdown
  const { data: trips } = await supabase
    .from('trips')
    .select('id, data')
    .order('created_at', { ascending: false });

  // Format trips for dropdown with date matching hints
  const suggestedTrips = (trips || []).map(trip => {
    const tripData = trip.data;
    let dateMatch = false;
    let matchReason = null;

    // Check if dates overlap
    const bookingDates = getBookingDates(data.extracted_data, data.booking_type);
    if (bookingDates && tripData.startDate && tripData.endDate) {
      const bookingStart = new Date(bookingDates.start);
      const bookingEnd = new Date(bookingDates.end || bookingDates.start);
      const tripStart = new Date(tripData.startDate);
      const tripEnd = new Date(tripData.endDate);

      // Check if there's any overlap
      if (bookingStart <= tripEnd && bookingEnd >= tripStart) {
        dateMatch = true;
        matchReason = 'Le date corrispondono';
      }
    }

    return {
      id: trip.id,
      title: tripData.title?.it || tripData.title?.en || trip.id,
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      dateMatch,
      matchReason
    };
  });

  // Sort: matching trips first
  suggestedTrips.sort((a, b) => {
    if (a.dateMatch && !b.dateMatch) return -1;
    if (!a.dateMatch && b.dateMatch) return 1;
    return 0;
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      booking: data,
      suggestedTrips
    })
  };
}

/**
 * Associate pending booking with an existing trip
 */
async function handleAssociate(supabase, user, body, headers) {
  const { pendingBookingId, tripId } = body;

  if (!pendingBookingId || !tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Missing pendingBookingId or tripId' })
    };
  }

  // Get pending booking
  const { data: pending, error: pendingError } = await supabase
    .from('pending_bookings')
    .select('*')
    .eq('id', pendingBookingId)
    .single();

  if (pendingError || !pending) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Pending booking not found' })
    };
  }

  // Get trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Trip not found' })
    };
  }

  // Add booking to trip data
  const tripData = trip.data;
  const extractedData = pending.extracted_data;

  let newItemId;
  let itemType;

  if (pending.booking_type === 'flight' && extractedData.flights?.length > 0) {
    itemType = 'flight';
    const flightCount = tripData.flights?.length || 0;
    newItemId = `flight-${flightCount + 1}`;

    const newFlight = { ...extractedData.flights[0], id: newItemId };
    tripData.flights = [...(tripData.flights || []), newFlight];

    // Update route
    if (tripData.flights.length > 0) {
      const codes = [tripData.flights[0].departure?.code];
      tripData.flights.forEach(f => {
        if (f.arrival?.code && codes[codes.length - 1] !== f.arrival.code) {
          codes.push(f.arrival.code);
        }
      });
      tripData.route = codes.filter(Boolean).join(' → ');
    }
  } else if (pending.booking_type === 'hotel' && extractedData.hotels?.length > 0) {
    itemType = 'hotel';
    const hotelCount = tripData.hotels?.length || 0;
    newItemId = `hotel-${hotelCount + 1}`;

    const newHotel = { ...extractedData.hotels[0], id: newItemId };
    tripData.hotels = [...(tripData.hotels || []), newHotel];
  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'No valid booking data to associate' })
    };
  }

  // Move PDF if exists
  if (pending.pdf_path && newItemId) {
    try {
      const newPdfPath = await movePdfToTrip(pending.pdf_path, tripId, newItemId);
      // Update item's pdfPath
      if (itemType === 'flight') {
        tripData.flights[tripData.flights.length - 1].pdfPath = newPdfPath;
      } else {
        tripData.hotels[tripData.hotels.length - 1].pdfPath = newPdfPath;
      }
    } catch (pdfError) {
      console.error('Failed to move PDF:', pdfError);
      // Continue without PDF
    }
  }

  // Update trip dates if needed
  updateTripDates(tripData);

  // Update trip
  const { error: updateTripError } = await supabase
    .from('trips')
    .update({
      data: tripData,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId);

  if (updateTripError) {
    console.error('Failed to update trip:', updateTripError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to update trip' })
    };
  }

  // Update pending booking status
  await supabase
    .from('pending_bookings')
    .update({
      status: 'associated',
      associated_trip_id: tripId,
      processed_at: new Date().toISOString()
    })
    .eq('id', pendingBookingId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      tripId,
      message: `${itemType === 'flight' ? 'Volo' : 'Hotel'} aggiunto al viaggio`
    })
  };
}

/**
 * Create a new trip from a pending booking
 */
async function handleCreateTrip(supabase, user, body, headers) {
  const { pendingBookingId, destination, title } = body;

  if (!pendingBookingId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Missing pendingBookingId' })
    };
  }

  // Get pending booking
  const { data: pending, error: pendingError } = await supabase
    .from('pending_bookings')
    .select('*')
    .eq('id', pendingBookingId)
    .single();

  if (pendingError || !pending) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Pending booking not found' })
    };
  }

  const extractedData = pending.extracted_data;

  // Determine destination
  let tripDestination = destination;
  if (!tripDestination) {
    if (pending.booking_type === 'flight' && extractedData.flights?.[0]) {
      tripDestination = extractedData.flights[0].arrival?.city || 'Unknown';
    } else if (pending.booking_type === 'hotel' && extractedData.hotels?.[0]) {
      tripDestination = extractedData.hotels[0].address?.city || 'Unknown';
    } else {
      tripDestination = 'Unknown';
    }
  }

  // Determine dates
  const bookingDates = getBookingDates(extractedData, pending.booking_type);
  const startDate = bookingDates?.start || new Date().toISOString().split('T')[0];
  const endDate = bookingDates?.end || startDate;

  // Generate trip ID
  const date = new Date(startDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const destSlug = tripDestination.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  const tripId = `${year}-${month}-${destSlug}`;

  // Build trip data
  const tripData = {
    id: tripId,
    title: title || {
      it: `Viaggio a ${tripDestination}`,
      en: `${tripDestination} Trip`
    },
    destination: tripDestination,
    startDate,
    endDate,
    route: '',
    flights: [],
    hotels: []
  };

  // Add the booking
  let newItemId;
  if (pending.booking_type === 'flight' && extractedData.flights?.[0]) {
    newItemId = 'flight-1';
    tripData.flights = [{ ...extractedData.flights[0], id: newItemId }];
    tripData.route = `${extractedData.flights[0].departure?.code || ''} → ${extractedData.flights[0].arrival?.code || ''}`;
  } else if (pending.booking_type === 'hotel' && extractedData.hotels?.[0]) {
    newItemId = 'hotel-1';
    tripData.hotels = [{ ...extractedData.hotels[0], id: newItemId }];
  }

  // Move PDF if exists
  if (pending.pdf_path && newItemId) {
    try {
      const newPdfPath = await movePdfToTrip(pending.pdf_path, tripId, newItemId);
      if (tripData.flights.length > 0) {
        tripData.flights[0].pdfPath = newPdfPath;
      } else if (tripData.hotels.length > 0) {
        tripData.hotels[0].pdfPath = newPdfPath;
      }
    } catch (pdfError) {
      console.error('Failed to move PDF:', pdfError);
    }
  }

  // Save trip
  const { error: insertError } = await supabase
    .from('trips')
    .insert({
      id: tripId,
      data: tripData,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (insertError) {
    // Trip ID might already exist - try with a unique suffix
    if (insertError.code === '23505') {
      tripData.id = `${tripId}-${Date.now()}`;
      const { error: retryError } = await supabase
        .from('trips')
        .insert({
          id: tripData.id,
          data: tripData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (retryError) {
        console.error('Failed to create trip:', retryError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to create trip' })
        };
      }
    } else {
      console.error('Failed to create trip:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to create trip' })
      };
    }
  }

  // Update pending booking status
  await supabase
    .from('pending_bookings')
    .update({
      status: 'associated',
      associated_trip_id: tripData.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', pendingBookingId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      tripId: tripData.id,
      message: `Nuovo viaggio creato: ${tripDestination}`
    })
  };
}

/**
 * Dismiss (soft delete) a pending booking
 */
async function handleDismiss(supabase, body, headers) {
  const { pendingBookingId } = body;

  if (!pendingBookingId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Missing pendingBookingId' })
    };
  }

  const { error } = await supabase
    .from('pending_bookings')
    .update({
      status: 'dismissed',
      processed_at: new Date().toISOString()
    })
    .eq('id', pendingBookingId);

  if (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to dismiss booking' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Hard delete a pending booking
 */
async function handleDelete(supabase, id, headers) {
  // Get the booking first to check for PDF
  const { data: pending } = await supabase
    .from('pending_bookings')
    .select('pdf_path')
    .eq('id', id)
    .single();

  // Delete PDF if exists
  if (pending?.pdf_path) {
    await deletePendingPdf(id);
  }

  // Delete the record
  const { error } = await supabase
    .from('pending_bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to delete booking' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Extract dates from booking data
 */
function getBookingDates(extractedData, bookingType) {
  if (bookingType === 'flight' && extractedData.flights?.[0]) {
    const flights = extractedData.flights;
    return {
      start: flights[0].date,
      end: flights[flights.length - 1].date
    };
  }

  if (bookingType === 'hotel' && extractedData.hotels?.[0]) {
    const hotel = extractedData.hotels[0];
    return {
      start: hotel.checkIn?.date,
      end: hotel.checkOut?.date
    };
  }

  return null;
}

/**
 * Update trip start/end dates based on all bookings
 */
function updateTripDates(tripData) {
  const dates = [];

  tripData.flights?.forEach(f => {
    if (f.date) dates.push(f.date);
  });

  tripData.hotels?.forEach(h => {
    if (h.checkIn?.date) dates.push(h.checkIn.date);
    if (h.checkOut?.date) dates.push(h.checkOut.date);
  });

  if (dates.length > 0) {
    dates.sort();
    tripData.startDate = dates[0];
    tripData.endDate = dates[dates.length - 1];
  }
}
