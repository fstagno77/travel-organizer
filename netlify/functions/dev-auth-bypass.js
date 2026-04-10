/**
 * Netlify Function: Dev Auth Bypass
 *
 * SOLO DEVELOPMENT — questa funzione NON deve mai essere deployata in produzione.
 * Permette di autenticarsi con il codice OTP "111111" senza un'email reale.
 * Usata per i test Playwright in locale quando l'SMTP di Supabase non è disponibile.
 *
 * Protezioni attive:
 * - Rifiuta tutte le richieste se NODE_ENV === 'production'
 * - Accetta solo richieste provenienti da localhost (origin/referer check)
 */

const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleOptions } = require('./utils/auth');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // Guard produzione — blocca sempre se NODE_ENV è production
  if (process.env.NODE_ENV === 'production') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Forbidden' })
    };
  }

  // Guard host — accetta solo richieste da localhost
  const origin = event.headers.origin || event.headers.referer || '';
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
  if (!isLocalhost) {
    console.warn('[dev-auth-bypass] Rejected non-localhost origin:', origin);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Forbidden' })
    };
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

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Genera un magic link per l'email fornita
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (error) {
      console.error('[dev-auth-bypass] generateLink error:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

    // Restituisce il token hashed che il client userà per creare la sessione
    // via supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
    const { hashed_token } = data.properties;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        hashed_token
      })
    };
  } catch (err) {
    console.error('[dev-auth-bypass] Unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
