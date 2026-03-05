/**
 * Netlify Function: Get Single Trip
 * Retrieves a single trip from Supabase by ID for the authenticated user
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { getUserRole } = require('./utils/permissions');

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

  const { supabase, user } = authResult;

  try {
    // Get trip ID from query parameters
    const tripId = event.queryStringParameters?.id;

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    // RLS will automatically filter to user's trips + shared trips
    const { data, error } = await supabase
      .from('trips')
      .select('data, user_id')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    // Get user's role for this trip
    let role = 'proprietario';
    let owner = null;
    try {
      role = await getUserRole(user.id, tripId) || 'proprietario';

      // Get owner info if not the owner
      if (data.user_id !== user.id) {
        const serviceClient = getServiceClient();
        const [{ data: ownerProfile }, { data: ownerTraveler }] = await Promise.all([
          serviceClient
            .from('profiles')
            .select('username, email')
            .eq('id', data.user_id)
            .single(),
          serviceClient
            .from('travelers')
            .select('first_name, last_name')
            .eq('user_id', data.user_id)
            .eq('is_owner', true)
            .single()
        ]);
        owner = ownerProfile ? {
          username: ownerProfile.username,
          email: ownerProfile.email,
          fullName: ownerTraveler ? `${ownerTraveler.first_name} ${ownerTraveler.last_name}`.trim() : null
        } : null;
      }
    } catch (roleErr) {
      console.error('Error fetching role/owner info:', roleErr);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, tripData: data.data, role, owner })
    };

  } catch (error) {
    console.error('Error fetching trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
