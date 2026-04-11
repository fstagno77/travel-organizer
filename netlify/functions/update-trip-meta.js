/**
 * Netlify Function: Update Trip Meta
 * Aggiorna date (startDate/endDate nel JSONB data), status, nome e città di un viaggio.
 * Solo il proprietario del viaggio può modificare questi campi.
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { canDeleteTrip } = require('./utils/permissions');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'PATCH') {
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
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
      };
    }

    const { tripId, startDate, endDate, status, name, cities } = body;

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId is required' })
      };
    }

    // Verifica che almeno un campo sia presente
    if (startDate === undefined && endDate === undefined && status === undefined && name === undefined && cities === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'At least one field (startDate, endDate, status, name, cities) is required' })
      };
    }

    // Validazione name
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'name must be a non-empty string of max 50 characters' })
      };
    }

    // Validazione cities
    if (cities !== undefined && !Array.isArray(cities)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'cities must be an array' })
      };
    }

    // Validazione status
    if (status !== undefined && !['draft', 'active'].includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'status must be "draft" or "active"' })
      };
    }

    // Solo il proprietario può modificare questi campi
    const isOwner = await canDeleteTrip(user.id, tripId);
    if (!isOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Only the trip owner can update trip meta' })
      };
    }

    const serviceClient = getServiceClient();

    // Leggi il record corrente per fare merge del JSONB
    const { data: row, error: fetchError } = await serviceClient
      .from('trips')
      .select('data, status')
      .eq('id', tripId)
      .single();

    if (fetchError || !row) {
      console.error('Supabase fetch error:', fetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    // Merge del JSONB data con i nuovi valori
    const updatedData = { ...(row.data || {}) };
    if (startDate !== undefined) updatedData.startDate = startDate;
    if (endDate !== undefined) updatedData.endDate = endDate;
    if (name !== undefined) updatedData.title = { it: name.trim(), en: name.trim() };
    if (cities !== undefined) updatedData.cities = cities;

    const updatePayload = {
      data: updatedData,
      updated_at: new Date().toISOString()
    };
    if (status !== undefined) updatePayload.status = status;

    const { error: updateError } = await serviceClient
      .from('trips')
      .update(updatePayload)
      .eq('id', tripId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to update trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Error updating trip meta:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
