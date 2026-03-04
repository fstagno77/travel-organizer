/**
 * Netlify Function: Create Trip (Manual)
 * Creates a new trip from user-entered name, dates, and optional cities
 */

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
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;

  try {
    const { name, startDate, endDate, cities } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip name is required' })
      };
    }

    if (!startDate || !endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Start date and end date are required' })
      };
    }

    if (endDate < startDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'End date must be after start date' })
      };
    }

    // Generate trip ID (same pattern as process-pdf.js)
    const date = new Date(startDate + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const slug = (cities?.[0]?.name || name.trim())
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const tripId = `${year}-${month}-${slug}-${uniqueSuffix}`;

    const destination = cities?.[0]?.name || '';
    const trimmedName = name.trim();

    const tripData = {
      id: tripId,
      title: { it: trimmedName, en: trimmedName },
      destination,
      startDate,
      endDate,
      route: '',
      passenger: { name: '', type: 'ADT' },
      flights: [],
      hotels: [],
      booking: null,
      activities: [],
      cities: cities || []
    };

    // Save to Supabase (RLS ensures user can only insert own trips)
    const { error: dbError } = await supabase
      .from('trips')
      .upsert({
        id: tripId,
        data: tripData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Supabase error:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to save trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, tripData })
    };

  } catch (error) {
    console.error('Error creating trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create trip'
      })
    };
  }
};
