/**
 * Netlify Function: Get PDF URL
 * Returns a signed URL for downloading a PDF from storage
 */

const { getPdfSignedUrl } = require('./utils/storage');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { path } = event.queryStringParameters || {};

    if (!path) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Path is required' })
      };
    }

    // Validate path format (must be trips/{tripId}/{itemId}.pdf)
    if (!path.match(/^trips\/[^/]+\/[^/]+\.pdf$/)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid path format' })
      };
    }

    const signedUrl = await getPdfSignedUrl(path);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: signedUrl
      })
    };

  } catch (error) {
    console.error('Error getting PDF URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to get PDF URL'
      })
    };
  }
};
