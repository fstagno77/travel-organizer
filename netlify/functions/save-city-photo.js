/**
 * Netlify Function: Save Trip Photo
 * Downloads photo from Unsplash and saves to trip-specific storage
 * Saves city photo to user's personal cache
 */

const { createClient } = require('@supabase/supabase-js');
const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { getPhotoById, triggerDownloadTracking, downloadPhoto } = require('./utils/unsplash');
const { saveCityPhotoForUser } = require('./utils/cityPhotos');

const BUCKET_NAME = 'city-photos';

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

    // Also save to user's city photo cache (permanent "last used" storage)
    if (destination) {
      await saveCityPhotoForUser(user.id, destination, photoBuffer, unsplashPhotoId, photoData.attribution);
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
