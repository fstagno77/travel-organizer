/**
 * Netlify Function: Get Platform Stats
 * Public endpoint - returns cached platform statistics
 * Uses service role to calculate stats across all users
 */

const { getServiceClient, getCorsHeaders, handleOptions } = require('./utils/auth');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

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

  try {
    const supabase = getServiceClient();

    // 1. Check cached stats
    const { data: cached, error: cacheError } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (cached && !cacheError) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < CACHE_TTL_MS) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            stats: {
              totalTrips: cached.total_trips,
              totalTravelDays: cached.total_travel_days,
              totalActivities: cached.total_activities
            }
          })
        };
      }
    }

    // 2. Cache is stale or missing - recalculate
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('data');

    if (tripsError) {
      console.error('Error fetching trips for stats:', tripsError);
      // Return stale cache if available
      if (cached) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            stats: {
              totalTrips: cached.total_trips,
              totalTravelDays: cached.total_travel_days,
              totalActivities: cached.total_activities
            }
          })
        };
      }
      throw tripsError;
    }

    // 3. Calculate stats
    const totalTrips = trips.length;
    let totalTravelDays = 0;
    let totalActivities = 0;

    for (const row of trips) {
      const tripData = row.data;
      if (!tripData) continue;

      // Travel days: inclusive count from startDate to endDate
      if (tripData.startDate && tripData.endDate) {
        const start = new Date(tripData.startDate + 'T00:00:00');
        const end = new Date(tripData.endDate + 'T00:00:00');
        const diffMs = end.getTime() - start.getTime();
        const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
        totalTravelDays += days;
      }

      // Activities count: flights + hotels + custom activities
      const flights = tripData.flights || [];
      const hotels = tripData.hotels || [];
      const activities = tripData.activities || [];
      totalActivities += flights.length + hotels.length + activities.length;
    }

    // 4. Upsert stats
    const { error: upsertError } = await supabase
      .from('platform_stats')
      .upsert({
        id: 1,
        total_trips: totalTrips,
        total_travel_days: totalTravelDays,
        total_activities: totalActivities,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Error upserting stats:', upsertError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: {
          totalTrips,
          totalTravelDays,
          totalActivities
        }
      })
    };

  } catch (error) {
    console.error('Error getting platform stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
