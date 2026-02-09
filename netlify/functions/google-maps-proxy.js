/**
 * Google Maps Proxy - Netlify Function
 *
 * Resolves Google Maps links to place data (name, address, rating, reviews, category)
 * using Google Places API (New) with a shared Supabase cache (180-day TTL).
 *
 * POST { url: "https://maps.app.goo.gl/..." }
 * Returns { success: true, data: { name, address, latitude, longitude, rating, reviewCount, category, source } }
 */

const { authenticateRequest, getServiceClient, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

const CACHE_TTL_DAYS = 180;

exports.handler = async (event) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  // Authenticate user
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  try {
    const { url } = JSON.parse(event.body);

    if (!url || typeof url !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'URL is required' }) };
    }

    if (!isGoogleMapsUrl(url)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Not a valid Google Maps URL' }) };
    }

    // Step 1: Resolve shortlink to full URL
    const resolvedUrl = await resolveShortlink(url);

    // Step 2: Check cache
    const serviceClient = getServiceClient();
    const cached = await getCachedPlace(serviceClient, resolvedUrl);

    if (cached) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: cached, source: 'cache' })
      };
    }

    // Step 3: Extract info from URL
    const urlInfo = parseGoogleMapsUrl(resolvedUrl);

    // Step 4: Call Google Places API
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Google API key not configured' }) };
    }

    let placeData = null;

    // Try Places API (New) first
    if (urlInfo.name && urlInfo.latitude && urlInfo.longitude) {
      placeData = await searchPlacesApi(apiKey, urlInfo.name, urlInfo.latitude, urlInfo.longitude);
    }

    // Fallback to Geocoding API
    if (!placeData && urlInfo.latitude && urlInfo.longitude) {
      placeData = await reverseGeocode(apiKey, urlInfo.latitude, urlInfo.longitude);
      if (placeData && urlInfo.name) {
        placeData.name = placeData.name || urlInfo.name;
      }
    }

    if (!placeData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            name: urlInfo.name || null,
            address: null,
            latitude: urlInfo.latitude || null,
            longitude: urlInfo.longitude || null,
            rating: null,
            reviewCount: null,
            category: null,
            source: 'url_parsing'
          },
          source: 'url_parsing'
        })
      };
    }

    // Merge URL-parsed coordinates if API didn't return them
    placeData.latitude = placeData.latitude || urlInfo.latitude;
    placeData.longitude = placeData.longitude || urlInfo.longitude;

    // Step 5: Save to cache
    await savePlaceToCache(serviceClient, resolvedUrl, placeData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: placeData, source: placeData.source })
    };

  } catch (error) {
    console.error('Google Maps proxy error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};

// ============================================
// URL Validation & Parsing
// ============================================

function isGoogleMapsUrl(url) {
  return /^https?:\/\/(www\.)?(google\.\w+\/maps|maps\.google\.\w+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url);
}

async function resolveShortlink(url) {
  // If it's already a full URL, return as-is
  if (url.includes('google.com/maps') || url.includes('google.it/maps')) {
    return url;
  }

  // Resolve shortlink via HEAD request following redirects
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return response.url || url;
  } catch {
    // Try with GET as fallback
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      return response.url || url;
    } catch {
      return url;
    }
  }
}

function parseGoogleMapsUrl(url) {
  const result = { name: null, latitude: null, longitude: null };

  // Extract place name from /place/Name+Here/
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    result.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  // Extract coordinates from /@lat,lng or !3dlat!4dlng
  const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (coordMatch) {
    result.latitude = parseFloat(coordMatch[1]);
    result.longitude = parseFloat(coordMatch[2]);
  } else {
    // Try !3d and !4d format
    const latMatch = url.match(/!3d(-?\d+\.?\d*)/);
    const lngMatch = url.match(/!4d(-?\d+\.?\d*)/);
    if (latMatch && lngMatch) {
      result.latitude = parseFloat(latMatch[1]);
      result.longitude = parseFloat(lngMatch[1]);
    }
  }

  return result;
}

// ============================================
// Cache Operations
// ============================================

async function getCachedPlace(supabase, resolvedUrl) {
  const { data, error } = await supabase
    .from('google_places_cache')
    .select('*')
    .eq('resolved_url', resolvedUrl)
    .single();

  if (error || !data) return null;

  // Check TTL
  const fetchedAt = new Date(data.fetched_at);
  const now = new Date();
  const daysSinceFetch = (now - fetchedAt) / (1000 * 60 * 60 * 24);

  if (daysSinceFetch > CACHE_TTL_DAYS) {
    return null; // Expired
  }

  return {
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    rating: data.rating,
    reviewCount: data.review_count,
    category: data.category,
    source: 'cache'
  };
}

async function savePlaceToCache(supabase, resolvedUrl, placeData) {
  const row = {
    resolved_url: resolvedUrl,
    name: placeData.name || null,
    address: placeData.address || null,
    latitude: placeData.latitude || null,
    longitude: placeData.longitude || null,
    rating: placeData.rating || null,
    review_count: placeData.reviewCount || null,
    category: placeData.category || null,
    fetched_at: new Date().toISOString()
  };

  // Upsert: insert or update if URL already exists (expired cache refresh)
  const { error } = await supabase
    .from('google_places_cache')
    .upsert(row, { onConflict: 'resolved_url' });

  if (error) {
    console.error('Cache save error:', error);
  }
}

// ============================================
// Google APIs
// ============================================

async function searchPlacesApi(apiKey, placeName, latitude, longitude) {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType,places.location'
      },
      body: JSON.stringify({
        textQuery: placeName,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: 200
          }
        },
        languageCode: 'it'
      })
    });

    if (!response.ok) {
      console.error('Places API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return null;
    }

    const place = data.places[0];
    return {
      name: place.displayName?.text || placeName,
      address: place.formattedAddress || null,
      latitude: place.location?.latitude || latitude,
      longitude: place.location?.longitude || longitude,
      rating: place.rating || null,
      reviewCount: place.userRatingCount || null,
      category: place.primaryType || null,
      source: 'places_api'
    };
  } catch (error) {
    console.error('Places API request failed:', error);
    return null;
  }
}

async function reverseGeocode(apiKey, latitude, longitude) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=it`
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      name: null,
      address: result.formatted_address || null,
      latitude,
      longitude,
      rating: null,
      reviewCount: null,
      category: null,
      source: 'geocoding_api'
    };
  } catch (error) {
    console.error('Geocoding API request failed:', error);
    return null;
  }
}
