/**
 * Netlify Function: Get PDF URL
 * Returns a signed URL for downloading a PDF from storage for the authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { getPdfSignedUrl } = require('./utils/storage');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET') {
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
