/**
 * Netlify Function: Get City Photos
 * Returns Unsplash options for a city, plus last used photo if available
 */

const { createClient } = require('@supabase/supabase-js');
const { normalizeCityName, getCachedCityPhoto } = require('./utils/cityPhotos');
const { searchDestinationPhotos } = require('./utils/unsplash');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Find last used photo for a destination
 * First checks city_photos table (permanent storage), then falls back to trips
 * @param {string} destination - Destination city name
 * @returns {Promise<Object|null>} Last used photo or null
 */
async function getLastUsedPhoto(destination) {
  if (!destination) return null;

  const normalizedDestination = normalizeCityName(destination);

  try {
    // First check the city_photos table (permanent "last used" storage)
    const cachedPhoto = await getCachedCityPhoto(destination);
    if (cachedPhoto && cachedPhoto.url) {
      return {
        url: cachedPhoto.url,
        attribution: cachedPhoto.attribution || null,
        isCustom: false,
        fromCityCache: true
      };
    }

    // Fall back to checking trips
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false });

    if (error || !trips) {
      console.error('Error fetching trips for last used photo:', error);
      return null;
    }

    // Find first trip with matching destination and coverPhoto
    for (const trip of trips) {
      const tripData = trip.data;
      if (!tripData || !tripData.coverPhoto || !tripData.coverPhoto.url) continue;

      // Check if destination matches
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
    console.error('Error in getLastUsedPhoto:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

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

    // Get last used photo for this destination (only on first page)
    let lastUsedPhoto = null;
    if (page === 1) {
      lastUsedPhoto = await getLastUsedPhoto(city);
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
