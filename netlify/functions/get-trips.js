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

    // Allow testDate override for frontend testing (read-only, no DB writes)
    const params = event.queryStringParameters || {};
    const testDateParam = params.testDate;
    let today = new Date().toISOString().split('T')[0];
    if (testDateParam && /^\d{4}-\d{2}-\d{2}$/.test(testDateParam)) {
      today = testDateParam;
    }

    // Extract summary-only trip data for frontend
    const trips = data.map(row => ({
      id: row.data.id,
      folder: row.data.id,
      title: row.data.title,
      destination: row.data.destination,
      startDate: row.data.startDate,
      endDate: row.data.endDate,
      route: row.data.route,
      color: '#0066cc',
      coverPhoto: row.data.coverPhoto || null
    }));

    // Filter today's trips server-side: today between startDate and endDate+1 day
    const todayTrips = data
      .filter(row => {
        const start = row.data.startDate;
        const end = row.data.endDate;
        if (!start || !end) return false;
        // Include +1 day after endDate for hotel checkout
        const endPlusOne = new Date(end);
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        const endPlusOneStr = endPlusOne.toISOString().split('T')[0];
        return today >= start && today <= endPlusOneStr;
      })
      .map(row => ({
        id: row.data.id,
        title: row.data.title,
        color: '#0066cc',
        flights: row.data.flights || [],
        hotels: row.data.hotels || [],
        activities: row.data.activities || []
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, trips, todayTrips })
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
