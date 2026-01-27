/**
 * Netlify Function: Save Trip Photo
 * Downloads photo from Unsplash and saves to trip-specific storage
 */

const { createClient } = require('@supabase/supabase-js');
const { getPhotoById, triggerDownloadTracking, downloadPhoto } = require('./utils/unsplash');
const { saveCityPhoto } = require('./utils/cityPhotos');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET_NAME = 'city-photos';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

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
    const { tripId, unsplashPhotoId, destination } = body;

    if (!tripId || !unsplashPhotoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'tripId and unsplashPhotoId are required'
        })
      };
    }

    // Get full photo data from Unsplash
    const photoData = await getPhotoById(unsplashPhotoId);

    if (!photoData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Photo not found on Unsplash'
        })
      };
    }

    // Download the photo
    const photoBuffer = await downloadPhoto(photoData.fullUrl);

    if (!photoBuffer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to download photo'
        })
      };
    }

    // Trigger Unsplash download tracking (required by API guidelines)
    if (photoData.attribution.downloadLocation) {
      await triggerDownloadTracking(photoData.attribution.downloadLocation);
    }

    // Save to trip-specific path in storage
    const fileName = `trips/${tripId}/cover.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, photoBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading trip photo:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to save photo to storage'
        })
      };
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Also save to city cache (permanent "last used" storage)
    if (destination) {
      await saveCityPhoto(destination, photoBuffer, unsplashPhotoId, photoData.attribution);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        photo: {
          url: publicUrl,
          attribution: photoData.attribution,
          isCustom: false
        }
      })
    };

  } catch (error) {
    console.error('Error in save-city-photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
