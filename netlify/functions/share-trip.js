/**
 * Netlify Function: Share Trip
 * Generates a share token for a trip (authenticated, POST)
 * Returns existing token if one already exists (idempotent)
 */

const crypto = require('crypto');
const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

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
  if (!authResult) return unauthorizedResponse();
  const { supabase } = authResult;

  try {
    const { tripId } = JSON.parse(event.body || '{}');

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId is required' })
      };
    }

    // Fetch trip (RLS enforces ownership)
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = { ...tripRecord.data };

    // Reuse existing token if present (idempotent)
    if (!tripData.shareToken) {
      tripData.shareToken = crypto.randomBytes(32).toString('hex');

      const { error: updateError } = await supabase
        .from('trips')
        .update({ data: tripData, updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (updateError) {
        console.error('Error saving share token:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to generate share link' })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, shareToken: tripData.shareToken })
    };

  } catch (error) {
    console.error('Error in share-trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
