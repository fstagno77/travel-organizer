/**
 * Supabase Storage Service
 * Handles PDF file storage operations for local server
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'trip-pdfs';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Upload PDF to Supabase Storage
 * @param {string} base64Content - Base64 encoded PDF content
 * @param {string} tripId - Trip ID
 * @param {string} itemId - Flight or hotel ID
 * @returns {Promise<string>} Storage path
 */
async function uploadPdf(base64Content, tripId, itemId) {
  const path = `trips/${tripId}/${itemId}.pdf`;
  const buffer = Buffer.from(base64Content, 'base64');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }

  console.log('Successfully uploaded PDF to:', path);
  return path;
}

/**
 * Delete PDF from Supabase Storage
 * @param {string} path - Storage path
 */
async function deletePdf(path) {
  if (!path) return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting PDF:', error);
  }
}

/**
 * Delete all PDFs for a trip
 * @param {string} tripId - Trip ID
 */
async function deleteAllTripPdfs(tripId) {
  if (!tripId) return;

  const folderPath = `trips/${tripId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError) {
    console.error('Error listing trip PDFs:', listError);
    return;
  }

  if (!files || files.length === 0) return;

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
