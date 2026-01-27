/**
 * Netlify Function: Upload Trip Photo
 * Handles custom photo uploads for trips (stored separately from city cache)
 */

const { createClient } = require('@supabase/supabase-js');
const { saveCityPhoto } = require('./utils/cityPhotos');

const BUCKET_NAME = 'city-photos';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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
    const { tripId, imageData, fileName, destination } = body;

    if (!tripId || !imageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID and image data are required' })
      };
    }

    // Extract base64 data (remove data URL prefix if present)
    let base64Data = imageData;
    let contentType = 'image/jpeg';

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        base64Data = matches[2];
      }
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'File too large. Maximum size is 2MB'
        })
      };
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid file type. Allowed: JPEG, PNG, WebP'
        })
      };
    }

    // Generate unique filename with trips/ prefix
    const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
    const timestamp = Date.now();
    const storagePath = `trips/${tripId}/${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to upload photo' })
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // Also save to city cache (permanent "last used" storage)
    if (destination) {
      await saveCityPhoto(destination, buffer, null, null);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        photo: {
          url: urlData.publicUrl,
          isCustom: true,
          attribution: null
        }
      })
    };

  } catch (error) {
    console.error('Error in upload-trip-photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
