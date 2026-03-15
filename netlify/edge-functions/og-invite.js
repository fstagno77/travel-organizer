/**
 * Netlify Edge Function: Dynamic OG tags for platform invite links
 * Intercepts /login.html?platform_invite=TOKEN requests and injects
 * invite-specific Open Graph meta tags for rich link previews
 * (iMessage, WhatsApp, Telegram, ecc.)
 */

export default async function handler(request, context) {
  const url = new URL(request.url);
  const token = url.searchParams.get('platform_invite');

  // Nessun token invito → serve la pagina statica normalmente
  if (!token) {
    return context.next();
  }

  const response = await context.next();
  const html = await response.text();

  const pageUrl = `${url.origin}/login.html?platform_invite=${token}`;
  const imageUrl = `${url.origin}/assets/icons/og-image.png`;

  const ogTitle = 'Sei invitato su Travel Flow!';
  const ogDescription = 'Unisciti a Travel Flow per organizzare i tuoi viaggi in modo semplice e collaborativo. Registrati con il link ricevuto.';

  // Sovrascrive i meta tag statici con quelli specifici per l'invito
  const modifiedHtml = html
    .replace(
      /<title>.*?<\/title>/,
      `<title>${ogTitle}</title>`
    )
    .replace(
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${ogTitle}">`
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${ogDescription}">`
    )
    .replace(
      /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${imageUrl}">`
    )
    .replace(
      /<meta property="og:site_name" content="[^"]*">/,
      `<meta property="og:site_name" content="Travel Flow"><meta property="og:url" content="${pageUrl}">`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${ogTitle}">`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${ogDescription}">`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${imageUrl}">`
    );

  const newHeaders = new Headers(response.headers);
  newHeaders.delete('content-encoding');
  newHeaders.delete('content-length');
  newHeaders.set('content-type', 'text/html; charset=utf-8');

  return new Response(modifiedHtml, {
    status: response.status,
    headers: newHeaders,
  });
}

export const config = {
  path: '/login.html',
};
