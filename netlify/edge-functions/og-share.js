/**
 * Netlify Edge Function: Dynamic OG tags for shared trips
 * Intercepts /share.html requests, fetches trip data via Supabase REST API,
 * and injects dynamic Open Graph meta tags for rich link previews
 * (iMessage, WhatsApp, Telegram, etc.)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/**
 * Format date as "dd MMM yyyy" (Italian month abbreviations)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Build a description string from trip data
 */
function buildDescription(tripData) {
  const parts = [];

  // Date range
  if (tripData.startDate && tripData.endDate) {
    parts.push(`${formatDate(tripData.startDate)} – ${formatDate(tripData.endDate)}`);
  }

  // Flight count
  const flights = tripData.flights || [];
  if (flights.length > 0) {
    parts.push(`${flights.length} vol${flights.length === 1 ? 'o' : 'i'}`);
  }

  // Hotel count
  const hotels = tripData.hotels || [];
  if (hotels.length > 0) {
    parts.push(`${hotels.length} hotel`);
  }

  // Activity count
  const activities = tripData.activities || [];
  if (activities.length > 0) {
    parts.push(`${activities.length} attività`);
  }

  return parts.join(' · ') || 'Visualizza i dettagli di questo viaggio su Travel Flow';
}

/**
 * Escape HTML special chars for safe injection into meta tags
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  // No token → just serve static page
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return context.next();
  }

  let tripData = null;

  try {
    // Query Supabase REST API directly (edge functions can't use Node packages)
    const apiUrl = `${SUPABASE_URL}/rest/v1/trips?select=data&data->>shareToken=eq.${token}`;
    const resp = await fetch(apiUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/vnd.pgrst.object+json',
      },
    });

    if (resp.ok) {
      const row = await resp.json();
      tripData = row?.data || null;
    }
  } catch (e) {
    // Silently fall through to static page
    console.error('OG edge function: Supabase fetch failed', e);
  }

  // If we couldn't get trip data, serve the static page as-is
  if (!tripData) {
    return context.next();
  }

  // Check expiration — if expired, still serve the page (share.js handles the error state)
  // but don't inject trip-specific OG tags (use fallback)
  if (tripData.endDate) {
    const endDate = new Date(tripData.endDate + 'T23:59:59');
    if (endDate < new Date()) {
      return context.next();
    }
  }

  // Build dynamic OG values
  const title = escapeHtml(tripData.name || 'Viaggio condiviso');
  const ogTitle = `${title} | Travel Flow`;
  const description = escapeHtml(buildDescription(tripData));
  const imageUrl = tripData.coverPhoto?.url || `${url.origin}/assets/icons/og-image.png`;
  const pageUrl = `${url.origin}/share.html?token=${token}`;

  // Get the original response
  const response = await context.next();
  const html = await response.text();

  // Replace static OG meta tags with dynamic ones
  const modifiedHtml = html
    // Page title
    .replace(
      /<title>.*?<\/title>/,
      `<title>${ogTitle}</title>`
    )
    // OG tags
    .replace(
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${ogTitle}">`
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${description}">`
    )
    .replace(
      /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${imageUrl}">`
    )
    // Twitter tags
    .replace(
      /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${ogTitle}">`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${description}">`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${imageUrl}">`
    )
    // Add og:url
    .replace(
      /<meta property="og:site_name" content="[^"]*">/,
      `<meta property="og:site_name" content="Travel Flow">\n  <meta property="og:url" content="${pageUrl}">`
    );

  return new Response(modifiedHtml, {
    status: response.status,
    headers: response.headers,
  });
}

export const config = {
  path: '/share.html',
};
