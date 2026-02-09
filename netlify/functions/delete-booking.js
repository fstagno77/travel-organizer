/**
 * Netlify Function: Delete Booking
 * Deletes a single flight or hotel from a trip in Supabase for the authenticated user
 * Also deletes the associated PDF from storage
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { deletePdf } = require('./utils/storage');
const { updateTripDates } = require('./utils/tripDates');

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

    // Get trip data
    const tripData = tripRecord.data;

    // Find the item and delete its PDF, then remove from array
    if (type === 'flight') {
      const flightToDelete = (tripData.flights || []).find(f => f.id === itemId);
      if (!flightToDelete) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Flight not found' })
        };
      }

      // Delete associated PDF from storage
      if (flightToDelete.pdfPath) {
        console.log(`Deleting PDF: ${flightToDelete.pdfPath}`);
        await deletePdf(flightToDelete.pdfPath);
      }

      tripData.flights = tripData.flights.filter(f => f.id !== itemId);
    } else if (type === 'hotel') {
      const hotelToDelete = (tripData.hotels || []).find(h => h.id === itemId);
      if (!hotelToDelete) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Hotel not found' })
        };
      }

      // Delete associated PDF from storage
      if (hotelToDelete.pdfPath) {
        console.log(`Deleting PDF: ${hotelToDelete.pdfPath}`);
        await deletePdf(hotelToDelete.pdfPath);
      }

      tripData.hotels = tripData.hotels.filter(h => h.id !== itemId);
    }

    // Update trip dates based on remaining flights and hotels
    updateTripDates(tripData);

    // Save updated trip (RLS ensures user can only update own trips)
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
