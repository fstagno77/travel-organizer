/**
 * Netlify Function: Get City Photos
 * Returns Unsplash options for a city, plus last used photo if available
 * Filtered by authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { normalizeCityName, getCachedCityPhotoForUser } = require('./utils/cityPhotos');
const { searchDestinationPhotos } = require('./utils/unsplash');

/**
 * Find last used photo for a destination for a specific user
 * First checks city_photos table (permanent storage), then falls back to user's trips
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} destination - Destination city name
 * @returns {Promise<Object|null>} Last used photo or null
 */
async function getLastUsedPhotoForUser(supabase, userId, destination) {
  if (!destination) return null;

  const normalizedDestination = normalizeCityName(destination);

  try {
    // First check the city_photos table (permanent "last used" storage)
    const cachedPhoto = await getCachedCityPhotoForUser(userId, destination);
    if (cachedPhoto && cachedPhoto.url) {
      return {
        url: cachedPhoto.url,
        attribution: cachedPhoto.attribution || null,
        isCustom: false,
        fromCityCache: true
      };
    }

    // Fall back to checking user's trips (RLS filters automatically)
    // Filter by destination in DB using PostgREST JSON operator to avoid loading all trips
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, data')
      .ilike('data->>destination', destination)
      .order('updated_at', { ascending: false });

    if (error || !trips) {
      console.error('Error fetching trips for last used photo:', error);
      return null;
    }

    // Find first trip with matching destination (normalized) and coverPhoto
    for (const trip of trips) {
      const tripData = trip.data;
      if (!tripData || !tripData.coverPhoto || !tripData.coverPhoto.url) continue;

      const tripDestination = tripData.destination;
      if (tripDestination && normalizeCityName(tripDestination) === normalizedDestination) {
        return {
          url: tripData.coverPhoto.url,
          attribution: tripData.coverPhoto.attribution || null,
          isCustom: tripData.coverPhoto.isCustom || false,
          fromTripId: trip.id
        };
      }
    }

    return null;

  } catch (error) {
    console.error('Error in getLastUsedPhotoForUser:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
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

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;

  try {
    const body = JSON.parse(event.body || '{}');
    const { city, page = 1, currentTripId } = body;

    if (!city) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'City is required' })
      };
    }

    // Get last used photo for this destination for this user (only on first page)
    let lastUsedPhoto = null;
    if (page === 1) {
      lastUsedPhoto = await getLastUsedPhotoForUser(supabase, user.id, city);
    }

    // Calculate how many Unsplash photos to fetch (6 total, minus 1 if last used exists)
    const unsplashCount = (lastUsedPhoto && page === 1) ? 5 : 6;

    // Always search Unsplash for options
    const unsplashPhotos = await searchDestinationPhotos(city, unsplashCount, page);

    // Build options array
    const options = [];

    // Add last used photo as first option (only on page 1)
    if (lastUsedPhoto && page === 1) {
      const photoId = lastUsedPhoto.fromCityCache
        ? `lastused-city-${normalizeCityName(city)}`
        : `lastused-${lastUsedPhoto.fromTripId}`;

      options.push({
        id: photoId,
        previewUrl: lastUsedPhoto.url,
        fullUrl: lastUsedPhoto.url,
        attribution: lastUsedPhoto.attribution,
        isLastUsed: true,
        isCustom: lastUsedPhoto.isCustom
      });
    }

    // Add Unsplash options
    if (unsplashPhotos && unsplashPhotos.length > 0) {
      options.push(...unsplashPhotos.map(photo => ({
        ...photo,
        isLastUsed: false
      })));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        options,
        normalizedCity: normalizeCityName(city),
        page,
        hasMore: unsplashPhotos && unsplashPhotos.length === unsplashCount
      })
    };

  } catch (error) {
    console.error('Error in get-city-photos:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
