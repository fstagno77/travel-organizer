/**
 * Netlify Function: Manage Cities
 * Save cities list for a trip
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

  const { supabase } = authResult;

  try {
    const { action, tripId, cities } = JSON.parse(event.body);

    if (action !== 'set') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid action. Use "set"' })
      };
    }

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId is required' })
      };
    }

    if (!Array.isArray(cities)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'cities must be an array' })
      };
    }

    // Normalize city name to Title Case (e.g. "NEW YORK" → "New York")
    const toTitleCase = (str) =>
      str.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    // Sanitize: normalize to objects, trim, title-case, remove empties, deduplicate
    const seen = new Set();
    const cleanCities = [];
    for (const c of cities) {
      // Support both legacy strings and city objects
      const obj = typeof c === 'string' ? { name: c } : c;
      const name = (obj.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const city = { name: toTitleCase(name) };
        if (obj.country) city.country = obj.country;
        if (obj.lat != null) city.lat = obj.lat;
        if (obj.lng != null) city.lng = obj.lng;
        cleanCities.push(city);
      }
    }

    // Fetch trip
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = tripRecord.data;
    tripData.cities = cleanCities;

    // Save updated trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to save trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, cities: cleanCities })
    };

  } catch (error) {
    console.error('manage-cities error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
