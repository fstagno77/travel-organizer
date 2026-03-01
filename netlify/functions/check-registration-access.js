/**
 * Netlify Function: Check Registration Access
 * Authenticated endpoint (JWT required) that validates whether a newly-authenticated user
 * is allowed to create an account on Travel Flow.
 *
 * Rules:
 * - Existing users (already have a profile) → always allowed
 * - New users → must have a pending invitation in trip_invitations
 * - If not allowed → the auth.users record is deleted so no account persists
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');

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
  const serviceClient = getServiceClient();

  // Check if user already has a profile (existing registered user)
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    // Existing user — always allowed regardless of current trip memberships
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ allowed: true, reason: 'existing' })
    };
  }

  // New user — check for a pending invitation matching their email
  const email = user.email?.trim().toLowerCase();
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
      body: JSON.stringify({ allowed: true, reason: 'invited' })
    };
  }

  // No valid invitation — delete the auth user so no account remains
  console.log(`[check-registration-access] Blocking unauthorized registration for: ${email}`);
  try {
    await serviceClient.auth.admin.deleteUser(user.id);
  } catch (deleteErr) {
    console.error('[check-registration-access] Failed to delete unauthorized user:', deleteErr);
  }

  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ allowed: false, reason: 'not_invited' })
  };
};
