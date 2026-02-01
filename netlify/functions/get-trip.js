/**
 * Netlify Function: Get Single Trip
 * Retrieves a single trip from Supabase by ID for the authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET') {
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
    // Get trip ID from query parameters
    const tripId = event.queryStringParameters?.id;

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    // RLS will automatically filter to user's trips
    const { data, error } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, tripData: data.data })
    };

  } catch (error) {
    console.error('Error fetching trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
