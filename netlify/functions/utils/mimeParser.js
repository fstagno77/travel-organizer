/**
 * MIME Parser — funzioni condivise per parsing di messaggi email in formato MIME/EML.
 *
 * Estratto da process-email.js per essere riusato in admin-api.js e futuri moduli.
 */

'use strict';

/**
 * Estrae subject e header dal blocco intestazioni di un messaggio MIME/EML.
 * @param {string} mimeMessage
 * @returns {{ subject: string, from: string, date: string }}
 */
function extractHeaders(mimeMessage) {
  // Gli header stanno prima del primo doppio a-capo
  const splitIdx = mimeMessage.search(/\r?\n\r?\n/);
  const headerSection = splitIdx !== -1 ? mimeMessage.substring(0, splitIdx) : mimeMessage;

  const get = (name) => {
    // Supporta header multi-riga (folded headers con spazio/tab a inizio riga successiva)
    const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\r?\\n(?![\\t ])|\$)`, 'im');
    const m = headerSection.match(re);
    const raw = m ? m[1].replace(/\r?\n[\t ]+/g, ' ').trim() : '';
    return decodeRfc2047(raw);
  };

  return {
    subject: get('Subject'),
    from:    get('From'),
    date:    get('Date'),
  };
}

/**
 * Estrae il body HTML e testo da un messaggio MIME.
 * Gestisce multipart/mixed, multipart/alternative e annidamenti ricorsivi.
 *
 * @param {string} mimeMessage
 * @param {number} depth         - Profondità ricorsione (max 10)
 * @param {Set}    seenBoundaries - Boundary già processati (anti-loop)
 * @returns {{ html: string, text: string }}
 */
function extractBodyFromMime(mimeMessage, depth = 0, seenBoundaries = new Set()) {
  const result = { html: '', text: '' };

  if (depth > 10) return result;

  try {
    const boundaryMatch = mimeMessage.match(/boundary="?([^"\s;]+)"?/i);
    if (!boundaryMatch) {
      // Messaggio single-part: rispetta Content-Type e Content-Transfer-Encoding
      const bodyStart = mimeMessage.search(/\r?\n\r?\n/);
      if (bodyStart !== -1) {
        let content = mimeMessage.substring(bodyStart + (mimeMessage[bodyStart + 1] === '\n' ? 2 : 4));

        // Decodifica in base all'encoding dichiarato negli header
        // Usa ^ con flag m per evitare falsi match in header come DKIM-Signature
        const headerBlock = mimeMessage.substring(0, bodyStart);
        const encodingMatch = headerBlock.match(/^Content-Transfer-Encoding:\s*(\S+)/im);
        const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '7bit';
        if (encoding === 'base64') {
          try { content = Buffer.from(content.replace(/[\r\n\s]/g, ''), 'base64').toString('utf-8'); } catch (_) {}
        } else if (encoding === 'quoted-printable') {
          content = decodeQuotedPrintable(content);
        }

        // Assegna a html o text in base al Content-Type
        const ctMatch = headerBlock.match(/^Content-Type:\s*([^;\s\n]+)/im);
        const mimeType = ctMatch ? ctMatch[1].toLowerCase() : 'text/plain';
        if (mimeType === 'text/html') {
          result.html = content.trim();
        } else {
          result.text = content.trim();
        }
      }
      return result;
    }

    const boundary = boundaryMatch[1];
    if (seenBoundaries.has(boundary)) return result;
    seenBoundaries.add(boundary);

    const parts = mimeMessage.split('--' + boundary);

    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;

      const contentTypeMatch = part.match(/Content-Type:\s*([^;\s\n]+)/i);
      const encodingMatch    = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);

      if (!contentTypeMatch) continue;

      const mimeType = contentTypeMatch[1].toLowerCase();

      // Salta allegati
      if (part.match(/Content-Disposition:\s*attachment/i)) continue;

      // Multipart annidato
      if (mimeType.startsWith('multipart/')) {
        const nestedBoundaryMatch = part.match(/boundary="?([^"\s;]+)"?/i);
        if (nestedBoundaryMatch && nestedBoundaryMatch[1] !== boundary) {
          const nested = extractBodyFromMime(part, depth + 1, seenBoundaries);
          if (nested.html && !result.html) result.html = nested.html;
          if (nested.text && !result.text) result.text = nested.text;
        }
        continue;
      }

      // Trova inizio contenuto (dopo doppio a-capo)
      let contentStart = part.indexOf('\r\n\r\n');
      contentStart = contentStart !== -1 ? contentStart + 4 : (() => {
        const i = part.indexOf('\n\n');
        return i !== -1 ? i + 2 : -1;
      })();
      if (contentStart === -1) continue;

      let content = part.substring(contentStart);

      // Rimuove eventuali boundary marker finali
      const lines = content.split(/\r?\n/);
      const cleanLines = [];
      for (const line of lines) {
        if (line.trim().startsWith('--')) break;
        cleanLines.push(line);
      }
      content = cleanLines.join('\n');

      // Decodifica
      const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '7bit';
      if (encoding === 'base64') {
        try {
          content = Buffer.from(content.replace(/[\r\n\s]/g, ''), 'base64').toString('utf-8');
        } catch (_) { /* ignora errori di decodifica */ }
      } else if (encoding === 'quoted-printable') {
        content = decodeQuotedPrintable(content);
      }

      if (mimeType === 'text/html') {
        if (!result.html || content.trim().length > result.html.length) result.html = content.trim();
      } else if (mimeType === 'text/plain') {
        if (!result.text || content.trim().length > result.text.length) result.text = content.trim();
      }
    }
  } catch (err) {
    console.error('[mimeParser] extractBodyFromMime error:', err.message);
  }

  return result;
}

/**
 * Estrae allegati PDF da un messaggio MIME.
 * @param {string} mimeMessage
 * @returns {Array<{ filename: string, content: string }>} - content è base64 pulito
 */
function extractAttachmentsFromMime(mimeMessage) {
  const attachments = [];

  try {
    const boundaryMatch = mimeMessage.match(/boundary="?([^"\s;]+)"?/i);
    if (!boundaryMatch) return attachments;

    const boundary = boundaryMatch[1];
    const parts = mimeMessage.split('--' + boundary);

    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;

      const contentDisposition = part.match(/Content-Disposition:\s*attachment[^;]*(?:;\s*filename="?([^"\n]+)"?)?/i);
      const contentTypeMatch   = part.match(/Content-Type:\s*([^;\s\n]+)/i);

      const isPdf = contentTypeMatch && contentTypeMatch[1].toLowerCase() === 'application/pdf';
      if (!isPdf) continue;

      // Filename
      let filename = 'attachment.pdf';
      if (contentDisposition?.[1]) {
        filename = contentDisposition[1].trim();
      } else {
        const nameMatch = part.match(/name="?([^"\n]+)"?/i);
        if (nameMatch) filename = nameMatch[1].trim();
      }

      // Inizio contenuto
      let contentStart = part.indexOf('\r\n\r\n');
      contentStart = contentStart !== -1 ? contentStart + 4 : (() => {
        const i = part.indexOf('\n\n');
        return i !== -1 ? i + 2 : -1;
      })();
      if (contentStart === -1) continue;

      let content = part.substring(contentStart);

      // Rimuove trailing boundary
      const bIdx = content.indexOf('--');
      if (bIdx !== -1) content = content.substring(0, bIdx);

      // Pulisce e valida base64
      content = content.replace(/[\r\n\s\t]/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
      const padding = content.length % 4;
      if (padding > 0) content += '='.repeat(4 - padding);

      if (content.length > 100) {
        attachments.push({ filename, content });
      }
    }
  } catch (err) {
    console.error('[mimeParser] extractAttachmentsFromMime error:', err.message);
  }

  return attachments;
}

/**
 * Decodifica contenuto quoted-printable.
 */
function decodeQuotedPrintable(input) {
  return input
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Decodifica header RFC 2047 (es. =?utf-8?B?...?= o =?utf-8?Q?...?=).
 */
function decodeRfc2047(str) {
  if (!str || !str.includes('=?')) return str;
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, enc, text) => {
    try {
      if (enc.toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString('utf-8');
      } else {
        return text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (__, hex) => String.fromCharCode(parseInt(hex, 16)));
      }
    } catch (_) { return text; }
  });
}

/**
 * Parsing completo di un file EML.
 * Restituisce subject, HTML body, testo e lista di PDF allegati.
 *
 * @param {string} emlText - Contenuto del file .eml come stringa
 * @returns {{ subject: string, from: string, html: string, text: string, pdfs: Array }}
 */
function parseEml(emlText) {
  const headers     = extractHeaders(emlText);
  const body        = extractBodyFromMime(emlText);
  const pdfs        = extractAttachmentsFromMime(emlText);

  return {
    subject: headers.subject,
    from:    headers.from,
    html:    body.html,
    text:    body.text,
    pdfs,   // Array<{ filename, content (base64) }>
  };
}

module.exports = {
  parseEml,
  extractBodyFromMime,
  extractAttachmentsFromMime,
  extractHeaders,
  decodeQuotedPrintable,
  decodeRfc2047,
};
