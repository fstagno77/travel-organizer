/**
 * Netlify Function: Delete Trip
 * Deletes a trip from Supabase by ID for the authenticated user
 * Also deletes all associated PDFs from storage
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { deleteAllTripPdfs } = require('./utils/storage');
const { canDeleteTrip } = require('./utils/permissions');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'DELETE') {
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

  const { supabase, user } = authResult;

  try {
    const tripId = event.queryStringParameters?.id;

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    // Only trip owner can delete (collaborators cannot)
    const isOwner = await canDeleteTrip(user.id, tripId);
    if (!isOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Only the trip owner can delete this trip' })
      };
    }

    // Delete all PDFs for this trip from storage
    console.log(`Deleting all PDFs for trip: ${tripId}`);
    await deleteAllTripPdfs(tripId);

    // Delete trip from database (RLS ensures user can only delete own trips)
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to delete trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Trip deleted' })
    };

  } catch (error) {
    console.error('Error deleting trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
