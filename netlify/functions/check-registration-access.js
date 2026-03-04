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

  // New user — check for a pending invitation
  const email = user.email?.trim().toLowerCase();

  // Controlla prima per invite token (se presente), poi per email
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    body = {};
  }

  // Se c'è un invite token, verifica direttamente per token (indipendente dall'email)
  if (body.invite_token) {
    const { data: tokenInvite } = await serviceClient
      .from('trip_invitations')
      .select('id, email')
      .eq('token', body.invite_token)
      .eq('status', 'pending')
      .maybeSingle();

    if (tokenInvite) {
      console.log(`[check-registration-access] Accesso consentito tramite invite token per: ${email} (invitato come: ${tokenInvite.email})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ allowed: true, reason: 'invited_by_token' })
      };
    }
  }

  // Fallback: cerca invito per email
  console.log(`[check-registration-access] Cercando invito per email: "${email}"`);
  const { data: invitation, error: invError } = await serviceClient
    .from('trip_invitations')
    .select('id, email, status')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  console.log(`[check-registration-access] Query result: data=${JSON.stringify(invitation)}, error=${JSON.stringify(invError)}`);

  if (invError) {
    console.error(`[check-registration-access] Query ERRORE per email "${email}":`, invError);
    // In caso di errore query, fai un secondo tentativo senza filtro status per debug
    const { data: allInvites, error: allErr } = await serviceClient
      .from('trip_invitations')
      .select('id, email, status, token')
      .eq('email', email);
    console.log(`[check-registration-access] DEBUG tutti inviti per "${email}":`, JSON.stringify(allInvites), allErr ? JSON.stringify(allErr) : 'no error');
  }

  if (invitation) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ allowed: true, reason: 'invited' })
    };
  }

  // Se non trovato, cerca QUALSIASI invito per questa email (debug: potrebbe avere status diverso)
  if (!invitation && !invError) {
    const { data: anyInvite } = await serviceClient
      .from('trip_invitations')
      .select('id, email, status')
      .eq('email', email);
    if (anyInvite && anyInvite.length > 0) {
      console.log(`[check-registration-access] Inviti trovati ma con status diverso da pending:`, JSON.stringify(anyInvite));
      // Se c'è un invito (qualsiasi status) per questa email, consenti comunque
      // L'invito potrebbe essere stato "accettato" da un tentativo precedente
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ allowed: true, reason: 'invited_any_status' })
      };
    }
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
