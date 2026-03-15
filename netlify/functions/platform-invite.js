/**
 * Netlify Function: platform-invite
 * Gestisce gli inviti piattaforma: ogni utente può invitare fino a 5 nuovi utenti al mese.
 *
 * Azioni:
 *   send    - Invia un invito piattaforma (controlla limite mensile)
 *   list    - Lista inviti inviati dall'utente + conteggio mensile
 *   accept  - Accetta un invito tramite token (chiamato dopo il login)
 *   revoke  - Revoca un invito pendente
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const crypto = require('crypto');

const MONTHLY_LIMIT = 5;

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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Body non valido' })
    };
  }

  const { action } = body;

  switch (action) {
    case 'send':
      return handleSend(user, body, headers);
    case 'list':
      return handleList(user, headers);
    case 'accept':
      return handleAccept(user, body, headers);
    case 'revoke':
      return handleRevoke(user, body, headers);
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Azione non riconosciuta: ${action}` })
      };
  }
};

/**
 * Invia un invito piattaforma a un'email
 */
async function handleSend(user, body, headers) {
  const serviceClient = getServiceClient();
  const { email } = body;

  if (!email || !email.includes('@')) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Email non valida' })
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verifica che l'email non sia già registrata sulla piattaforma
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ success: false, error: 'Questo utente è già registrato su Travel Flow.' })
    };
  }

  // Verifica limite mensile: conta inviti di questo mese (non revocati)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlyInvites, error: countError } = await serviceClient
    .from('platform_invitations')
    .select('id', { count: 'exact' })
    .eq('invited_by', user.id)
    .in('status', ['pending', 'accepted'])
    .gte('created_at', monthStart.toISOString());

  if (countError) {
    console.error('[platform-invite] Errore conteggio mensile:', countError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Errore interno del server' })
    };
  }

  const usedThisMonth = monthlyInvites?.length ?? 0;

  if (usedThisMonth >= MONTHLY_LIMIT) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Hai raggiunto il limite di ${MONTHLY_LIMIT} inviti per questo mese.`,
        code: 'monthly_limit_reached'
      })
    };
  }

  // Verifica che non esista già un invito pendente per questa email da questo utente
  const { data: existing } = await serviceClient
    .from('platform_invitations')
    .select('id, status')
    .eq('invited_by', user.id)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ success: false, error: 'Hai già un invito pendente per questa email.' })
    };
  }

  // Genera token univoco
  const token = crypto.randomBytes(32).toString('hex');

  const { data: invite, error: insertError } = await serviceClient
    .from('platform_invitations')
    .insert({
      invited_by: user.id,
      email: normalizedEmail,
      token,
      status: 'pending'
    })
    .select()
    .single();

  if (insertError) {
    console.error('[platform-invite] Errore inserimento:', insertError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Errore interno del server' })
    };
  }

  const inviteUrl = `${process.env.URL || 'https://travel-flow.com'}/login.html?platform_invite=${token}`;

  console.log(`[platform-invite] Invito inviato da ${user.id} a ${normalizedEmail}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        status: invite.status,
        token: invite.token,
        inviteUrl,
        created_at: invite.created_at
      },
      usedThisMonth: usedThisMonth + 1,
      remainingThisMonth: MONTHLY_LIMIT - usedThisMonth - 1,
      monthlyLimit: MONTHLY_LIMIT
    })
  };
}

/**
 * Lista gli inviti inviati dall'utente con conteggio mensile
 */
async function handleList(user, headers) {
  const serviceClient = getServiceClient();

  const { data: invites, error } = await serviceClient
    .from('platform_invitations')
    .select('id, email, status, token, created_at, updated_at')
    .eq('invited_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[platform-invite] Errore lista:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Errore interno del server' })
    };
  }

  // Conta inviti di questo mese (non revocati)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usedThisMonth = (invites || []).filter(inv =>
    inv.status !== 'revoked' &&
    new Date(inv.created_at) >= monthStart
  ).length;

  // Aggiungi URL a ogni invito pendente
  const baseUrl = process.env.URL || 'https://travel-flow.com';
  const invitesWithUrl = (invites || []).map(inv => ({
    ...inv,
    inviteUrl: inv.status === 'pending'
      ? `${baseUrl}/login.html?platform_invite=${inv.token}`
      : null
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      invites: invitesWithUrl,
      usedThisMonth,
      remainingThisMonth: Math.max(0, MONTHLY_LIMIT - usedThisMonth),
      monthlyLimit: MONTHLY_LIMIT
    })
  };
}

/**
 * Accetta un invito piattaforma tramite token (chiamato post-login)
 */
async function handleAccept(user, body, headers) {
  const serviceClient = getServiceClient();
  const { token } = body;

  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Token mancante' })
    };
  }

  const { data: invite, error } = await serviceClient
    .from('platform_invitations')
    .select('id, email, status, invited_by')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !invite) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Invito non trovato o già utilizzato' })
    };
  }

  // Aggiorna status ad accepted
  const { error: updateError } = await serviceClient
    .from('platform_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (updateError) {
    console.error('[platform-invite] Errore accept:', updateError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Errore interno del server' })
    };
  }

  console.log(`[platform-invite] Invito accettato: ${invite.email} -> user ${user.id}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Revoca un invito pendente
 */
async function handleRevoke(user, body, headers) {
  const serviceClient = getServiceClient();
  const { inviteId } = body;

  if (!inviteId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'inviteId mancante' })
    };
  }

  const { data: invite, error: findError } = await serviceClient
    .from('platform_invitations')
    .select('id, status, invited_by')
    .eq('id', inviteId)
    .eq('invited_by', user.id)
    .maybeSingle();

  if (findError || !invite) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Invito non trovato' })
    };
  }

  if (invite.status !== 'pending') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Solo gli inviti pendenti possono essere revocati' })
    };
  }

  const { error: updateError } = await serviceClient
    .from('platform_invitations')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (updateError) {
    console.error('[platform-invite] Errore revoca:', updateError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Errore interno del server' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}
