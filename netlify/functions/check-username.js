/**
 * Netlify Function: Check Username Availability
 * Public endpoint to verify if a username is available
 */

const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleOptions } = require('./utils/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

  try {
    const { username } = JSON.parse(event.body || '{}');

    if (!username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Username is required' })
      };
    }

    // Validate format first
    const isValid = /^[a-zA-Z0-9]{5,12}$/.test(username);
    if (!isValid) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          available: false,
          reason: 'invalid_format'
        })
      };
    }

    // Check availability using database function
    const { data, error } = await supabase
      .rpc('is_username_available', { check_username: username });

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to check username' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        available: data === true
      })
    };

  } catch (error) {
    console.error('Error checking username:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
