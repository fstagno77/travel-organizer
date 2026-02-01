/**
 * Netlify Function: Get Shared Trip
 * Public endpoint for viewing shared trips (bypasses RLS)
 */

const { getServiceClient, getCorsHeaders, handleOptions } = require('./utils/auth');

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

  const tripId = event.queryStringParameters?.id;

  if (!tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Trip ID is required' })
    };
  }

  try {
    // Use service client to bypass RLS for public share access
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Supabase error:', error);

      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Trip not found' })
        };
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to fetch trip' })
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData: data.data
      })
    };

  } catch (error) {
    console.error('Error fetching shared trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
