/**
 * Netlify Function: Get Trips
 * Retrieves all trips from Supabase for the authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const path = require('path');
const fs = require('fs');

// Load cities DB once (lazy)
let citiesDb = null;
let citiesIndex = null; // lowercase name → city object
function getCitiesIndex() {
  if (citiesIndex) return citiesIndex;
  try {
    const filePath = path.join(__dirname, '..', '..', 'data', 'cities.json');
    citiesDb = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    citiesIndex = new Map();
    for (const city of citiesDb) {
      citiesIndex.set(city.n.toLowerCase(), city);
    }
  } catch (e) {
    console.error('Failed to load cities.json:', e.message);
    citiesIndex = new Map();
  }
  return citiesIndex;
}

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

  const { supabase, user } = authResult;

  try {
    // RLS will automatically filter to user's trips + shared trips
    const { data, error } = await supabase
      .from('trips')
      .select('id, user_id, data, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to fetch trips' })
      };
    }

    // Get collaborator roles for the current user
    let collabMap = new Map();
    try {
      const serviceClient = getServiceClient();
      const { data: collabs } = await serviceClient
        .from('trip_collaborators')
        .select('trip_id, role')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      collabMap = new Map((collabs || []).map(c => [c.trip_id, c.role]));
    } catch (collabErr) {
      console.error('Error fetching collaborator roles:', collabErr);
    }

    // Allow testDate override for frontend testing (read-only, no DB writes)
    const params = event.queryStringParameters || {};
    const testDateParam = params.testDate;
    let today = new Date().toISOString().split('T')[0];
    if (testDateParam && /^\d{4}-\d{2}-\d{2}$/.test(testDateParam)) {
      today = testDateParam;
    }

    // Normalize city name to Title Case (e.g. "NEW YORK" → "New York")
    const toTitleCase = (str) =>
      str.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    // Enrich a city name with country from cities DB
    const index = getCitiesIndex();
    function enrichCity(name) {
      const obj = { name: toTitleCase(name) };
      const match = index.get(name.toLowerCase());
      if (match) {
        obj.country = match.c;
      }
      return obj;
    }

    // Extract summary-only trip data for frontend
    const trips = data.map(row => {
      // Use saved cities if present, otherwise auto-derive from bookings
      let cities = (row.data.cities || []).map(c => {
        const name = typeof c === 'string' ? c : (c.name || '');
        if (!name) return null;
        const obj = typeof c === 'object' && c !== null ? { ...c } : {};
        obj.name = toTitleCase(name);
        // Enrich with country if missing
        if (!obj.country) {
          const match = index.get(name.toLowerCase());
          if (match) obj.country = match.c;
        }
        return obj;
      }).filter(Boolean);


      return {
        id: row.data.id,
        folder: row.data.id,
        title: row.data.title,
        destination: row.data.destination,
        startDate: row.data.startDate,
        endDate: row.data.endDate,
        route: row.data.route,
        color: '#0066cc',
        coverPhoto: row.data.coverPhoto || null,
        cities,
        role: collabMap.get(row.id) || 'proprietario'
      };
    });

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
