/**
 * Netlify Function: Check Invite Status
 * Public endpoint (no JWT required) that checks if an email is allowed to proceed with registration.
 * Used before sending OTP to avoid sending codes to uninvited users.
 */

const { getServiceClient, getCorsHeaders, handleOptions } = require('./utils/auth');

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

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email?.trim().toLowerCase();
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid request body' })
    };
  }

  if (!email || !email.includes('@')) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Valid email is required' })
    };
  }

  const serviceClient = getServiceClient();

  // Check if email belongs to an already-registered user (has a profile)
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ canProceed: true, reason: 'existing' })
    };
  }

  // Check if email has a pending invitation
  const { data: invitation } = await serviceClient
    .from('trip_invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (invitation) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ canProceed: true, reason: 'invited' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ canProceed: false, reason: 'not_invited' })
  };
};
