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

module.exports = {
  uploadPdf,
  deletePdf,
  deleteAllTripPdfs,
  getPdfSignedUrl,
  BUCKET_NAME
};
