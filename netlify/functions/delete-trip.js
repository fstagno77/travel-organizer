/**
 * Netlify Function: Delete Trip
 * Soft-delete di un viaggio: imposta deleted_at invece di cancellare il record.
 * I PDF e i file rimangono in storage per permettere il ripristino da admin.
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { canDeleteTrip } = require('./utils/permissions');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'DELETE') {
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

  const { supabase, user } = authResult;

  try {
    const tripId = event.queryStringParameters?.id;

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    // Solo il proprietario può cancellare
    const isOwner = await canDeleteTrip(user.id, tripId);
    if (!isOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Only the trip owner can delete this trip' })
      };
    }

    // Soft delete: imposta deleted_at via service client (bypassa RLS che richiederebbe deleted_at IS NULL)
    // Il controllo permessi è già stato fatto da canDeleteTrip
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from('trips')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tripId);

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to delete trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Trip deleted' })
    };

  } catch (error) {
    console.error('Error deleting trip:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
