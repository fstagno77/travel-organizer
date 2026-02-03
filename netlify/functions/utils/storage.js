/**
 * Supabase Storage Helper
 * Handles PDF file storage operations
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'trip-pdfs';

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Upload PDF to Supabase Storage
 * @param {string} base64Content - Base64 encoded PDF content
 * @param {string} tripId - Trip ID
 * @param {string} itemId - Flight or hotel ID (e.g., "flight-1", "hotel-2")
 * @returns {Promise<string>} Storage path
 */
async function uploadPdf(base64Content, tripId, itemId) {
  const supabase = getSupabaseClient();
  const path = `trips/${tripId}/${itemId}.pdf`;

  const buffer = Buffer.from(base64Content, 'base64');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true // Overwrite if exists
    });

  if (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }

  return path;
}

/**
 * Delete PDF from Supabase Storage
 * @param {string} path - Storage path
 */
async function deletePdf(path) {
  if (!path) return;

  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting PDF:', error);
    // Don't throw - deletion failure shouldn't block other operations
  }
}

/**
 * Delete all PDFs for a trip
 * @param {string} tripId - Trip ID
 */
async function deleteAllTripPdfs(tripId) {
  if (!tripId) return;

  const supabase = getSupabaseClient();
  const folderPath = `trips/${tripId}`;

  // List all files in the trip folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError) {
    console.error('Error listing trip PDFs:', listError);
    return;
  }

  if (!files || files.length === 0) return;

  // Delete all files
  const filePaths = files.map(f => `${folderPath}/${f.name}`);
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths);

  if (deleteError) {
    console.error('Error deleting trip PDFs:', deleteError);
  }
}

/**
 * Get signed URL for PDF download
 * @param {string} path - Storage path
 * @param {number} expiresIn - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function getPdfSignedUrl(path, expiresIn = 3600) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }

  return data.signedUrl;
}

// ============================================
// Pending Bookings Storage Functions
// ============================================

/**
 * Upload PDF to pending folder (for email forwarding)
 * @param {string} base64Content - Base64 encoded PDF content
 * @param {string} pendingBookingId - Pending booking UUID
 * @returns {Promise<string>} Storage path
 */
async function uploadPendingPdf(base64Content, pendingBookingId) {
  const supabase = getSupabaseClient();
  const path = `pending/${pendingBookingId}/attachment.pdf`;

  const buffer = Buffer.from(base64Content, 'base64');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Error uploading pending PDF:', error);
    throw error;
  }

  return path;
}

/**
 * Move PDF from pending folder to trip folder
 * @param {string} pendingPath - Current path (e.g., pending/abc123/attachment.pdf)
 * @param {string} tripId - Destination trip ID
 * @param {string} itemId - Flight or hotel ID (e.g., flight-1)
 * @returns {Promise<string>} New storage path
 */
async function movePdfToTrip(pendingPath, tripId, itemId) {
  const supabase = getSupabaseClient();
  const newPath = `trips/${tripId}/${itemId}.pdf`;

  // Download from pending
  const { data, error: downloadError } = await supabase.storage
    .from(BUCKET_NAME)
    .download(pendingPath);

  if (downloadError) {
    console.error('Error downloading pending PDF:', downloadError);
    throw downloadError;
  }

  // Upload to trips folder
  const buffer = Buffer.from(await data.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(newPath, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading PDF to trip:', uploadError);
    throw uploadError;
  }

  // Delete from pending folder
  await supabase.storage.from(BUCKET_NAME).remove([pendingPath]);

  return newPath;
}

/**
 * Delete pending booking PDF
 * @param {string} pendingBookingId - Pending booking UUID
 */
async function deletePendingPdf(pendingBookingId) {
  if (!pendingBookingId) return;

  const supabase = getSupabaseClient();
  const path = `pending/${pendingBookingId}/attachment.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting pending PDF:', error);
    // Don't throw - deletion failure shouldn't block other operations
  }
}

module.exports = {
  uploadPdf,
  deletePdf,
  deleteAllTripPdfs,
  getPdfSignedUrl,
  uploadPendingPdf,
  movePdfToTrip,
  deletePendingPdf,
  BUCKET_NAME
};
