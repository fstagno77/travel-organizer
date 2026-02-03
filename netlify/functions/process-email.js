/**
 * Netlify Function: Process Email
 * Webhook handler for SendGrid Inbound Parse
 * Receives forwarded booking emails, extracts data with Claude, saves to pending_bookings
 */

const Busboy = require('busboy');
const { getServiceClient } = require('./utils/auth');
const { uploadPendingPdf } = require('./utils/storage');
const {
  extractFromEmailHtml,
  extractFromEmailText,
  extractFromPdf,
  determineBookingType,
  generateSummary
} = require('./utils/emailExtractor');
const crypto = require('crypto');

// Configuration
const EMAIL_ADDRESS = 'trips@travel-flow.com';

exports.handler = async (event, context) => {
  console.log('=== PROCESS-EMAIL FUNCTION START ===');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
  console.log('Body length:', event.body?.length || 0);
  console.log('Is Base64:', event.isBase64Encoded);

  // Only accept POST from SendGrid
  if (event.httpMethod !== 'POST') {
    console.log('Rejecting non-POST request');
    return { statusCode: 405, body: 'Method not allowed' };
  }

  console.log('Received email webhook - starting processing');

  // Use service role client (bypasses RLS for INSERT)
  const supabase = getServiceClient();
  console.log('Supabase client initialized');

  try {
    // Parse multipart form data from SendGrid
    console.log('Starting multipart parsing...');
    const formData = await parseMultipartFormData(event);
    console.log('Parsed form data fields:', Object.keys(formData));
    console.log('Form data keys count:', Object.keys(formData).length);

    // Debug: log all field values (truncated)
    console.log('Field "attachments":', typeof formData.attachments, formData.attachments?.substring?.(0, 500) || formData.attachments?.length);
    console.log('Field "attachment-info":', formData['attachment-info']?.substring?.(0, 500));
    console.log('Field "email" length:', formData.email?.length);
    console.log('Has attachment1?', !!formData.attachment1);

    // Extract key fields
    const senderEmail = extractSenderEmail(formData.from || '');
    const subject = formData.subject || '';
    let htmlBody = formData.html || '';
    let textBody = formData.text || '';
    const messageId = formData['message-id'] || extractMessageId(formData.headers) || crypto.randomUUID();

    // If html/text are empty but we have raw MIME, extract body from MIME
    if (!htmlBody && !textBody && formData.email) {
      console.log('Extracting body content from raw MIME...');
      const mimeBody = extractBodyFromMime(formData.email);
      htmlBody = mimeBody.html || '';
      textBody = mimeBody.text || '';
      console.log(`Extracted from MIME - HTML length: ${htmlBody.length}, Text length: ${textBody.length}`);
    }

    // Handle attachments from different SendGrid formats
    let attachments = [];

    // Format 1: Attachments from busboy file parsing (multipart files)
    if (formData.attachments && Array.isArray(formData.attachments) && formData.attachments.length > 0) {
      attachments = formData.attachments;
      console.log('Using attachments from multipart files:', attachments.length);
    }

    // Format 2: SendGrid parsed mode - attachment-info JSON + attachment1, attachment2, etc.
    if (attachments.length === 0 && formData['attachment-info']) {
      try {
        const attachmentInfo = JSON.parse(formData['attachment-info']);
        console.log('Parsed attachment-info:', JSON.stringify(attachmentInfo));

        // attachmentInfo is like: { "attachment1": { "filename": "...", "type": "...", ... } }
        for (const [key, info] of Object.entries(attachmentInfo)) {
          if (formData[key]) {
            // formData[key] contains the file content (might be base64 or buffer)
            const content = formData[key];
            attachments.push({
              fieldname: key,
              filename: info.filename || info.name || 'attachment.pdf',
              contentType: info.type || info['content-type'] || 'application/octet-stream',
              content: typeof content === 'string' ? content : content.toString('base64')
            });
            console.log(`Added attachment from ${key}: ${info.filename}`);
          }
        }
      } catch (e) {
        console.error('Failed to parse attachment-info:', e.message);
      }
    }

    // Format 3: Raw MIME message - need to parse email field
    if (attachments.length === 0 && formData.email) {
      console.log('Attempting to extract attachments from raw MIME email...');
      const mimeAttachments = extractAttachmentsFromMime(formData.email);
      if (mimeAttachments.length > 0) {
        attachments = mimeAttachments;
        console.log('Extracted attachments from MIME:', attachments.length);
      }
    }

    console.log('Final attachment count:', attachments.length);

    console.log(`Email from: ${senderEmail}, Subject: ${subject}, Attachments: ${attachments.length}`);

    // Check for duplicate (same message ID)
    const { data: existingLog } = await supabase
      .from('email_processing_log')
      .select('id')
      .eq('email_message_id', messageId)
      .maybeSingle();

    if (existingLog) {
      console.log('Duplicate email, skipping:', messageId);
      return { statusCode: 200, body: 'Duplicate' };
    }

    // Find user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', senderEmail)
      .maybeSingle();

    if (profileError || !profile) {
      // Log unknown sender
      await logEmailProcessing(supabase, {
        email_from: senderEmail,
        email_subject: subject,
        email_message_id: messageId,
        status: 'user_not_found',
        email_body_preview: (textBody || htmlBody).substring(0, 500)
      });

      console.log('User not found for email:', senderEmail);
      return { statusCode: 200, body: 'User not found' };
    }

    console.log(`User found: ${profile.id}`);

    // Extract booking data from email content
    let extractedData = null;
    let pdfContent = null;

    // Try PDF attachments first (more reliable)
    const pdfAttachment = attachments.find(a =>
      a.contentType === 'application/pdf' ||
      a.filename?.toLowerCase().endsWith('.pdf')
    );

    if (pdfAttachment) {
      console.log(`Processing PDF attachment: ${pdfAttachment.filename}`);
      extractedData = await extractFromPdf(pdfAttachment.content, pdfAttachment.filename);
      if (extractedData) {
        pdfContent = pdfAttachment.content;
        console.log('Successfully extracted data from PDF');
      }
    }

    // If no PDF or extraction failed, try email HTML body
    if (!extractedData && htmlBody) {
      console.log('Trying HTML body extraction...');
      extractedData = await extractFromEmailHtml(htmlBody, subject);
      if (extractedData) {
        console.log('Successfully extracted data from HTML');
      }
    }

    // If still no data, try plain text
    if (!extractedData && textBody) {
      console.log('Trying text body extraction...');
      extractedData = await extractFromEmailText(textBody, subject);
      if (extractedData) {
        console.log('Successfully extracted data from text');
      }
    }

    // If extraction completely failed
    if (!extractedData || (!extractedData.flights?.length && !extractedData.hotels?.length)) {
      await logEmailProcessing(supabase, {
        email_from: senderEmail,
        email_subject: subject,
        email_message_id: messageId,
        status: 'extraction_failed',
        user_id: profile.id,
        email_body_preview: (textBody || htmlBody).substring(0, 500)
      });

      console.log('Extraction failed - no booking data found');
      return { statusCode: 200, body: 'Extraction failed' };
    }

    // Determine booking type and generate summary
    const bookingType = determineBookingType(extractedData);
    const { summaryTitle, summaryDates } = generateSummary(bookingType, extractedData);

    // Create pending booking
    const pendingBookingId = crypto.randomUUID();

    // Upload PDF if present
    let pdfPath = null;
    if (pdfContent) {
      try {
        pdfPath = await uploadPendingPdf(pdfContent, pendingBookingId);
        console.log(`Uploaded PDF to: ${pdfPath}`);
      } catch (uploadError) {
        console.error('PDF upload failed:', uploadError);
        // Continue without PDF
      }
    }

    // Insert pending booking
    const { error: insertError } = await supabase
      .from('pending_bookings')
      .insert({
        id: pendingBookingId,
        user_id: profile.id,
        email_from: senderEmail,
        email_subject: subject,
        email_received_at: new Date().toISOString(),
        email_message_id: messageId,
        booking_type: bookingType,
        extracted_data: extractedData,
        summary_title: summaryTitle,
        summary_dates: summaryDates,
        pdf_path: pdfPath,
        status: 'pending'
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Log success
    await logEmailProcessing(supabase, {
      email_from: senderEmail,
      email_subject: subject,
      email_message_id: messageId,
      status: 'success',
      user_id: profile.id,
      pending_booking_id: pendingBookingId
    });

    console.log(`Successfully created pending booking: ${pendingBookingId}`);
    return { statusCode: 200, body: 'OK' };

  } catch (error) {
    console.error('=== ERROR PROCESSING EMAIL ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Log error
    try {
      await logEmailProcessing(supabase, {
        email_from: 'unknown',
        email_message_id: crypto.randomUUID(),
        status: 'error',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Always return 200 to prevent SendGrid retries
    return { statusCode: 200, body: 'Error logged' };
  }
};

/**
 * Parse multipart form data from SendGrid webhook
 */
function parseMultipartFormData(event) {
  return new Promise((resolve, reject) => {
    const result = {
      attachments: []
    };

    // Get content type header
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!contentType) {
      // If no content type, try to parse as URL-encoded or JSON
      if (event.body) {
        try {
          const parsed = JSON.parse(event.body);
          resolve(parsed);
          return;
        } catch (e) {
          // Try URL-encoded
          const params = new URLSearchParams(event.body);
          for (const [key, value] of params) {
            result[key] = value;
          }
          resolve(result);
          return;
        }
      }
      resolve(result);
      return;
    }

    // Check if it's multipart
    if (!contentType.includes('multipart/form-data')) {
      // Handle as URL-encoded or JSON
      if (event.body) {
        if (contentType.includes('application/json')) {
          try {
            resolve(JSON.parse(event.body));
            return;
          } catch (e) {
            reject(new Error('Invalid JSON body'));
            return;
          }
        }
        // URL-encoded
        const params = new URLSearchParams(event.body);
        for (const [key, value] of params) {
          result[key] = value;
        }
      }
      resolve(result);
      return;
    }

    // Parse multipart with busboy
    const busboy = Busboy({ headers: { 'content-type': contentType } });

    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];

      file.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        result.attachments.push({
          fieldname,
          filename,
          contentType: mimeType,
          content: buffer.toString('base64')
        });
      });
    });

    busboy.on('field', (fieldname, value) => {
      result[fieldname] = value;
    });

    busboy.on('finish', () => {
      resolve(result);
    });

    busboy.on('error', (error) => {
      reject(error);
    });

    // Handle base64 encoded body from Netlify
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    busboy.end(body);
  });
}

/**
 * Extract sender email from "From" header
 * Handles formats like: "Name <email@domain.com>" or just "email@domain.com"
 */
function extractSenderEmail(fromHeader) {
  if (!fromHeader) return '';

  // Try to extract email from angle brackets
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase().trim();
  }

  // If no brackets, assume it's just the email
  return fromHeader.toLowerCase().trim();
}

/**
 * Extract Message-ID from email headers
 */
function extractMessageId(headers) {
  if (!headers) return null;

  // Headers might be a string or object
  if (typeof headers === 'string') {
    const match = headers.match(/Message-ID:\s*<([^>]+)>/i);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract attachments from raw MIME email message
 * This handles the case when SendGrid sends the full MIME message in the 'email' field
 */
function extractAttachmentsFromMime(mimeMessage) {
  const attachments = [];

  try {
    // Find Content-Type boundary
    const boundaryMatch = mimeMessage.match(/boundary="?([^"\s;]+)"?/i);
    if (!boundaryMatch) {
      console.log('No MIME boundary found');
      return attachments;
    }

    const boundary = boundaryMatch[1];
    console.log('MIME boundary:', boundary);

    // Split by boundary
    const parts = mimeMessage.split('--' + boundary);

    for (const part of parts) {
      // Skip empty parts and closing boundary
      if (!part.trim() || part.trim() === '--') continue;

      // Check if this part is an attachment (has Content-Disposition: attachment or is a PDF)
      const contentDisposition = part.match(/Content-Disposition:\s*attachment[^;]*(?:;\s*filename="?([^"\n]+)"?)?/i);
      const contentType = part.match(/Content-Type:\s*([^;\s\n]+)/i);
      const contentTransferEncoding = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);

      const isPdf = contentType && contentType[1].toLowerCase() === 'application/pdf';
      const isAttachment = contentDisposition || isPdf;

      if (isAttachment && isPdf) {
        // Extract filename
        let filename = 'attachment.pdf';
        if (contentDisposition && contentDisposition[1]) {
          filename = contentDisposition[1].trim();
        } else {
          // Try to get filename from Content-Type
          const filenameMatch = part.match(/name="?([^"\n]+)"?/i);
          if (filenameMatch) {
            filename = filenameMatch[1].trim();
          }
        }

        // Find the content (after the double newline - headers end with blank line)
        let contentStartIndex = part.indexOf('\r\n\r\n');
        if (contentStartIndex !== -1) {
          contentStartIndex += 4; // Skip the \r\n\r\n
        } else {
          contentStartIndex = part.indexOf('\n\n');
          if (contentStartIndex !== -1) {
            contentStartIndex += 2; // Skip the \n\n
          } else {
            console.log('Could not find content start in MIME part');
            continue;
          }
        }

        let content = part.substring(contentStartIndex);

        // Clean up the base64 content
        // Remove any trailing boundary markers or whitespace
        const boundaryIndex = content.indexOf('--');
        if (boundaryIndex !== -1) {
          content = content.substring(0, boundaryIndex);
        }

        // Remove all whitespace (newlines, spaces, tabs, carriage returns)
        content = content.replace(/[\r\n\s\t]/g, '');

        // Validate base64 - should only contain valid base64 characters
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(content)) {
          console.log('Warning: Content does not appear to be valid base64, attempting to clean...');
          // Remove any non-base64 characters
          content = content.replace(/[^A-Za-z0-9+/=]/g, '');
        }

        // Ensure proper padding
        const padding = content.length % 4;
        if (padding > 0) {
          content += '='.repeat(4 - padding);
        }

        console.log(`Base64 content length after cleaning: ${content.length}`);
        console.log(`Base64 starts with: ${content.substring(0, 50)}`);
        console.log(`Base64 ends with: ${content.substring(content.length - 50)}`);

        attachments.push({
          fieldname: 'mime-attachment',
          filename: filename,
          contentType: 'application/pdf',
          content: content
        });

        console.log(`Extracted PDF from MIME: ${filename}, content length: ${content.length}`);
      }
    }
  } catch (error) {
    console.error('Error parsing MIME message:', error.message);
  }

  return attachments;
}

/**
 * Extract HTML and text body from raw MIME email message
 * This handles the case when SendGrid sends the full MIME message in the 'email' field
 * @param {string} mimeMessage - The MIME message content
 * @param {number} depth - Current recursion depth (to prevent infinite loops)
 * @param {Set} seenBoundaries - Boundaries already processed (to prevent loops)
 */
function extractBodyFromMime(mimeMessage, depth = 0, seenBoundaries = new Set()) {
  const result = { html: '', text: '' };

  // Prevent infinite recursion
  if (depth > 10) {
    console.log('Max MIME nesting depth reached, stopping recursion');
    return result;
  }

  try {
    // Find Content-Type boundary
    const boundaryMatch = mimeMessage.match(/boundary="?([^"\s;]+)"?/i);
    if (!boundaryMatch) {
      console.log('No MIME boundary found for body extraction');
      // If no boundary, try to extract body directly (single-part message)
      const bodyStart = mimeMessage.indexOf('\r\n\r\n');
      if (bodyStart !== -1) {
        result.text = mimeMessage.substring(bodyStart + 4);
      }
      return result;
    }

    const boundary = boundaryMatch[1];

    // Prevent processing the same boundary twice (loop detection)
    if (seenBoundaries.has(boundary)) {
      console.log(`Boundary already processed: ${boundary}, skipping to prevent loop`);
      return result;
    }
    seenBoundaries.add(boundary);

    console.log(`Processing MIME boundary (depth ${depth}): ${boundary}`);
    const parts = mimeMessage.split('--' + boundary);

    for (const part of parts) {
      // Skip empty parts and closing boundary
      if (!part.trim() || part.trim() === '--') continue;

      const contentType = part.match(/Content-Type:\s*([^;\s\n]+)/i);
      const contentTransferEncoding = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);

      if (!contentType) continue;

      const mimeType = contentType[1].toLowerCase();

      // Skip attachments
      if (part.match(/Content-Disposition:\s*attachment/i)) continue;

      // Check if this is a nested multipart (e.g., multipart/alternative inside multipart/mixed)
      if (mimeType.startsWith('multipart/')) {
        const nestedBoundaryMatch = part.match(/boundary="?([^"\s;]+)"?/i);
        if (nestedBoundaryMatch && nestedBoundaryMatch[1] !== boundary) {
          // Recursively extract from nested multipart
          const nestedResult = extractBodyFromMime(part, depth + 1, seenBoundaries);
          if (nestedResult.html && !result.html) result.html = nestedResult.html;
          if (nestedResult.text && !result.text) result.text = nestedResult.text;
        }
        continue;
      }

      // Find the content (after the double newline)
      let contentStartIndex = part.indexOf('\r\n\r\n');
      if (contentStartIndex !== -1) {
        contentStartIndex += 4;
      } else {
        contentStartIndex = part.indexOf('\n\n');
        if (contentStartIndex !== -1) {
          contentStartIndex += 2;
        } else {
          continue;
        }
      }

      let content = part.substring(contentStartIndex);

      // Remove any trailing boundary markers or whitespace at the end
      // Be careful not to remove content that legitimately contains '--'
      const lines = content.split(/\r?\n/);
      const cleanLines = [];
      for (const line of lines) {
        // Stop if we hit a boundary marker (line that starts with --)
        if (line.trim().startsWith('--')) break;
        cleanLines.push(line);
      }
      content = cleanLines.join('\n');

      // Decode content based on transfer encoding
      const encoding = contentTransferEncoding ? contentTransferEncoding[1].toLowerCase() : '7bit';

      if (encoding === 'base64') {
        try {
          const cleanBase64 = content.replace(/[\r\n\s]/g, '');
          content = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        } catch (e) {
          console.error('Failed to decode base64 content:', e.message);
        }
      } else if (encoding === 'quoted-printable') {
        content = decodeQuotedPrintable(content);
      }

      // Store based on content type (prefer longer content if we already have some)
      if (mimeType === 'text/html') {
        if (!result.html || content.trim().length > result.html.length) {
          result.html = content.trim();
          console.log(`Found HTML body, length: ${result.html.length}`);
        }
      } else if (mimeType === 'text/plain') {
        if (!result.text || content.trim().length > result.text.length) {
          result.text = content.trim();
          console.log(`Found text body, length: ${result.text.length}`);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting body from MIME:', error.message);
  }

  return result;
}

/**
 * Decode quoted-printable encoded content
 */
function decodeQuotedPrintable(input) {
  return input
    // Handle soft line breaks (= at end of line)
    .replace(/=\r?\n/g, '')
    // Handle encoded characters (=XX where XX is hex)
    .replace(/=([0-9A-Fa-f]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Log email processing result
 */
async function logEmailProcessing(supabase, data) {
  try {
    await supabase
      .from('email_processing_log')
      .insert({
        email_from: data.email_from,
        email_subject: data.email_subject || null,
        email_message_id: data.email_message_id || null,
        status: data.status,
        user_id: data.user_id || null,
        pending_booking_id: data.pending_booking_id || null,
        error_message: data.error_message || null,
        email_body_preview: data.email_body_preview || null
      });
  } catch (error) {
    console.error('Failed to log email processing:', error);
  }
}
