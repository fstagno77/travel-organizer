/**
 * Netlify Function: Get Upload URL
 * Generates a signed URL for direct PDF upload to Supabase Storage.
 * Frontend uploads the file directly to Storage, then sends only the path to process-pdf/add-booking.
 * Authenticated endpoint.
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'trip-pdfs';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

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

  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user } = authResult;

  try {
    const { filename, contentType } = JSON.parse(event.body);

    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Filename is required' })
      };
    }

    // Validate content type
    if (contentType && contentType !== 'application/pdf') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Only PDF files are allowed' })
      };
    }

    // Generate a unique path in the tmp folder, scoped to user
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `tmp/${user.id}/${uniqueId}-${safeName}`;

    // Use service role client to create signed upload URL
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('Error creating signed upload URL:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to create upload URL' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadUrl: data.signedUrl,
        token: data.token,
        storagePath
      })
    };

  } catch (error) {
    console.error('Error in get-upload-url:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
