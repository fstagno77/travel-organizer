/**
 * Netlify Function: Get Shared Trip
 * Public endpoint for viewing shared trips (bypasses RLS)
 * Validates share token and checks trip expiration
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

  const token = event.queryStringParameters?.token;

  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Share token is required' })
    };
  }

  try {
    // Use service client to bypass RLS for public share access
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('trips')
      .select('data')
      .eq('data->>shareToken', token)
      .single();

    if (error) {
      console.error('Supabase error:', error);

      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'shareNotFound' })
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
        body: JSON.stringify({ success: false, error: 'shareNotFound' })
      };
    }

    const tripData = data.data;

    // Check expiration: trip endDate must be >= today
    if (tripData.endDate) {
      const endDate = new Date(tripData.endDate + 'T23:59:59');
      const now = new Date();
      if (endDate < now) {
        return {
          statusCode: 410,
          headers,
          body: JSON.stringify({ success: false, error: 'shareExpired' })
        };
      }
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
    console.error('Error fetching shared trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
