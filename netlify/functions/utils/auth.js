/**
 * Auth Utility for Netlify Functions
 * Validates JWT tokens and provides authenticated Supabase client
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Extract and validate JWT from Authorization header
 * Returns user object and authenticated Supabase client if valid
 * @param {Object} event - Netlify function event
 * @returns {Promise<{user: Object, supabase: Object}|null>}
 */
async function authenticateRequest(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Create Supabase client with user's JWT
  // This enables RLS policies to work automatically
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Auth error:', error?.message || 'No user found');
      return null;
    }

    return { user, supabase };
  } catch (error) {
    console.error('Auth validation error:', error);
    return null;
  }
}

/**
 * Get Supabase client with service role (bypasses RLS)
 * Use only for operations that need admin access (e.g., shared trips)
 * @returns {Object} Supabase client with service role
 */
function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Standard unauthorized response
 * @returns {Object} Netlify function response
 */
function unauthorizedResponse() {
  return {
    statusCode: 401,
    headers: {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: false,
      error: 'Unauthorized'
    })
  };
}

/**
 * Standard CORS headers for all responses
 * @returns {Object} CORS headers
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
}

/**
 * Handle OPTIONS preflight request
 * @returns {Object} Netlify function response for OPTIONS
 */
function handleOptions() {
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: ''
  };
}

module.exports = {
  authenticateRequest,
  getServiceClient,
  unauthorizedResponse,
  getCorsHeaders,
  handleOptions
};
