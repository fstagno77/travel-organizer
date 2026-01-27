/**
 * Netlify Function: Update Trip Photo
 * Updates a trip with the selected cover photo
 */

const { createClient } = require('@supabase/supabase-js');

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
    const { tripId, coverPhoto } = body;

    if (!tripId || !coverPhoto) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'tripId and coverPhoto are required'
        })
      };
    }

    // Get current trip data
    const { data: tripRow, error: fetchError } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRow) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Trip not found'
        })
      };
    }

    // Update trip data with cover photo
    const updatedData = {
      ...tripRow.data,
      coverPhoto
    };

    // Save updated trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Error updating trip:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to update trip'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData: updatedData
      })
    };

  } catch (error) {
    console.error('Error in update-trip-photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
