/**
 * City Photos Cache Helper
 * Manages cached city photos in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'city-photos';
const TABLE_NAME = 'city_photos';

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Normalize city name for consistent storage
 * @param {string} city - City name
 * @returns {string} Normalized city name
 */
function normalizeCityName(city) {
  if (!city) return '';

  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
    .trim()
    .replace(/\s+/g, '-');           // Spaces to hyphens
}

/**
 * Get cached photo for a city
 * @param {string} city - City name
 * @returns {Promise<Object|null>} Cached photo data or null
 */
async function getCachedCityPhoto(city) {
  const supabase = getSupabaseClient();
  const normalizedCity = normalizeCityName(city);

  if (!normalizedCity) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('city', normalizedCity)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - city not in cache
        return null;
      }
      console.error('Error fetching cached photo:', error);
      return null;
    }

    return {
      url: data.photo_url,
      attribution: data.attribution,
      unsplashId: data.unsplash_id
    };

  } catch (error) {
    console.error('Error in getCachedCityPhoto:', error);
    return null;
  }
}

/**
 * Save city photo to cache
 * @param {string} city - City name
 * @param {Buffer} photoBuffer - Photo data as buffer
 * @param {string} unsplashId - Unsplash photo ID
 * @param {Object} attribution - Attribution data
 * @returns {Promise<string|null>} Public URL or null
 */
async function saveCityPhoto(city, photoBuffer, unsplashId, attribution) {
  const supabase = getSupabaseClient();
  const normalizedCity = normalizeCityName(city);

  if (!normalizedCity || !photoBuffer) {
    return null;
  }

  const fileName = `${normalizedCity}.jpg`;

  try {
    // Upload photo to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, photoBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading city photo:', uploadError);
      return null;
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Add timestamp to bust browser cache when photo is updated
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Save metadata to database
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .upsert({
        city: normalizedCity,
        photo_url: publicUrl,
        unsplash_id: unsplashId,
        attribution: attribution,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'city'
      });

    if (dbError) {
      console.error('Error saving city photo metadata:', dbError);
      // Photo is uploaded but metadata failed - still return URL
    }

    return publicUrl;

  } catch (error) {
    console.error('Error in saveCityPhoto:', error);
    return null;
  }
}

/**
 * Get all cached cities
 * @returns {Promise<Array>} List of cached city names
 */
async function getAllCachedCities() {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('city, photo_url')
      .order('city');

    if (error) {
      console.error('Error fetching cached cities:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error in getAllCachedCities:', error);
    return [];
  }
}

/**
 * Get cached photo for a city for a specific user
 * @param {string} userId - User ID
 * @param {string} city - City name
 * @returns {Promise<Object|null>} Cached photo data or null
 */
async function getCachedCityPhotoForUser(userId, city) {
  const supabase = getSupabaseClient();
  const normalizedCity = normalizeCityName(city);

  if (!normalizedCity || !userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('city', normalizedCity)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - city not in cache for this user
        return null;
      }
      console.error('Error fetching cached photo for user:', error);
      return null;
    }

    return {
      url: data.photo_url,
      attribution: data.attribution,
      unsplashId: data.unsplash_id
    };

  } catch (error) {
    console.error('Error in getCachedCityPhotoForUser:', error);
    return null;
  }
}

/**
 * Save city photo to cache for a specific user
 * @param {string} userId - User ID
 * @param {string} city - City name
 * @param {Buffer} photoBuffer - Photo data as buffer
 * @param {string} unsplashId - Unsplash photo ID
 * @param {Object} attribution - Attribution data
 * @returns {Promise<string|null>} Public URL or null
 */
async function saveCityPhotoForUser(userId, city, photoBuffer, unsplashId, attribution) {
  const supabase = getSupabaseClient();
  const normalizedCity = normalizeCityName(city);

  if (!normalizedCity || !photoBuffer || !userId) {
    return null;
  }

  // Use user-specific filename to avoid conflicts
  const fileName = `users/${userId}/${normalizedCity}.jpg`;

  try {
    // Upload photo to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, photoBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading city photo for user:', uploadError);
      return null;
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Add timestamp to bust browser cache when photo is updated
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Save metadata to database with user_id
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .upsert({
        city: normalizedCity,
        user_id: userId,
        photo_url: publicUrl,
        unsplash_id: unsplashId,
        attribution: attribution,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,city'
      });

    if (dbError) {
      console.error('Error saving city photo metadata for user:', dbError);
      // Photo is uploaded but metadata failed - still return URL
    }

    return publicUrl;

  } catch (error) {
    console.error('Error in saveCityPhotoForUser:', error);
    return null;
  }
}

module.exports = {
  normalizeCityName,
  getCachedCityPhoto,
  saveCityPhoto,
  getAllCachedCities,
  getCachedCityPhotoForUser,
  saveCityPhotoForUser,
  BUCKET_NAME,
  TABLE_NAME
};
