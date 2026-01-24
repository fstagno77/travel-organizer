/**
 * Netlify Function: Get Trips
 * Retrieves all trips from Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
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
