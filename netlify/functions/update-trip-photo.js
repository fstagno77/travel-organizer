/**
 * Netlify Function: Update Trip Photo
 * Updates a trip with the selected cover photo for the authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

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
    const body = JSON.parse(event.body || '{}');
    const { tripId, coverPhoto } = body;

    if (!tripId || !coverPhoto) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'tripId and coverPhoto are required'
        })
      };
    }

    // Get current trip data (RLS ensures user can only access own trips)
    const { data: tripRow, error: fetchError } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRow) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Trip not found'
        })
      };
    }

    // Update trip data with cover photo
    const updatedData = {
      ...tripRow.data,
      coverPhoto
    };

    // Save updated trip (RLS ensures user can only update own trips)
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Error updating trip:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to update trip'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData: updatedData
      })
    };

  } catch (error) {
    console.error('Error in update-trip-photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
