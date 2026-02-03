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
  // Only accept POST from SendGrid
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  console.log('Received email webhook');

  // Use service role client (bypasses RLS for INSERT)
  const supabase = getServiceClient();

  try {
    // Parse multipart form data from SendGrid
    const formData = await parseMultipartFormData(event);
    console.log('Parsed form data fields:', Object.keys(formData));

    // Extract key fields
    const senderEmail = extractSenderEmail(formData.from || '');
    const subject = formData.subject || '';
    const htmlBody = formData.html || '';
    const textBody = formData.text || '';
    const messageId = formData['message-id'] || extractMessageId(formData.headers) || crypto.randomUUID();
    const attachments = formData.attachments || [];

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
    console.error('Error processing email:', error);

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
