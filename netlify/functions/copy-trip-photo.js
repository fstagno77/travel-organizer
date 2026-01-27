/**
 * Netlify Function: Copy Trip Photo
 * Copies a photo from one URL to a new trip's storage
 */

const { createClient } = require('@supabase/supabase-js');
const { saveCityPhoto } = require('./utils/cityPhotos');

const BUCKET_NAME = 'city-photos';

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
    const { tripId, sourceUrl, attribution, isCustom, destination } = body;

    if (!tripId || !sourceUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'tripId and sourceUrl are required'
        })
      };
    }

    // Download photo from source URL
    const photoResponse = await fetch(sourceUrl);

    if (!photoResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to download source photo'
        })
      };
    }

    const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

    // Determine content type from response or default to jpeg
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' :
                      contentType.includes('webp') ? 'webp' : 'jpg';

    // Save to new trip's storage with timestamp to avoid cache issues
    const timestamp = Date.now();
    const fileName = `trips/${tripId}/cover-${timestamp}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, photoBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading copied photo:', uploadError);
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

    const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;

    // Also save to city cache (permanent "last used" storage)
    if (destination) {
      await saveCityPhoto(destination, photoBuffer, null, attribution);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        photo: {
          url: publicUrl,
          attribution: attribution || null,
          isCustom: isCustom || false
        }
      })
    };

  } catch (error) {
    console.error('Error in copy-trip-photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
