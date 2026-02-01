/**
 * Netlify Function: Get Trips
 * Retrieves all trips from Supabase for the authenticated user
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
    // RLS will automatically filter to user's trips
    const { data, error } = await supabase
      .from('trips')
      .select('id, data, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to fetch trips' })
      };
    }

    // Extract trip data and format for frontend
    const trips = data.map(row => ({
      id: row.data.id,
      folder: row.data.id,
      title: row.data.title,
      destination: row.data.destination,
      startDate: row.data.startDate,
      endDate: row.data.endDate,
      route: row.data.route,
      color: '#0066cc',
      coverPhoto: row.data.coverPhoto || null,
      data: row.data // Include full data for today's flight feature
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, trips })
    };

  } catch (error) {
    console.error('Error fetching trips:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
