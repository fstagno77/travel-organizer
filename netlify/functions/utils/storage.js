/**
 * Supabase Storage Helper
 * Handles file storage operations
 * - trip-pdfs: booking PDFs (flights, hotels)
 * - activity-files: activity attachments (PDFs, images)
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'trip-pdfs';
const ACTIVITY_BUCKET = 'activity-files';

/**
 * Get Supabase client instance (anon key)
 */
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Get Supabase client with service role (for storage admin ops)
 */
function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let activityBucketReady = false;

/**
 * Ensure activity-files bucket exists (idempotent, creates if missing)
 */
async function ensureActivityBucket() {
  if (activityBucketReady) return;
  try {
    const supabase = getServiceClient();
    // Try to create; if already exists, Supabase returns an error we can ignore
    const { error } = await supabase.storage.createBucket(ACTIVITY_BUCKET, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    });
    if (error && !error.message?.includes('already exists')) {
      console.error('Error creating activity bucket:', error);
    }
    activityBucketReady = true;
  } catch (err) {
    console.error('Error ensuring activity bucket:', err);
    activityBucketReady = true; // Don't retry endlessly
  }
}

// ============================================
// Booking PDF Functions (trip-pdfs bucket)
// ============================================

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

// ============================================
// Activity File Functions (activity-files bucket)
// ============================================

/**
 * Upload a file (PDF, image) for an activity
 * @param {string} base64Content - Base64 encoded file
 * @param {string} tripId - Trip ID
 * @param {string} activityId - Activity ID
 * @param {number} index - File index
 * @param {string} extension - File extension (pdf, jpg, png, etc.)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Storage path
 */
async function uploadActivityFile(base64Content, tripId, activityId, index, extension, contentType) {
  await ensureActivityBucket();

  const supabase = getServiceClient();
  const path = `${tripId}/${activityId}-${index}.${extension}`;
  const buffer = Buffer.from(base64Content, 'base64');

  const { error } = await supabase.storage
    .from(ACTIVITY_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    console.error('Error uploading activity file:', error);
    throw error;
  }

  return path;
}

/**
 * Delete a file from the activity bucket
 * @param {string} path - Storage path
 */
async function deleteActivityFile(path) {
  if (!path) return;
  const supabase = getServiceClient();

  const { error } = await supabase.storage
    .from(ACTIVITY_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Error deleting activity file:', error);
  }
}

/**
 * Get signed URL for an activity file
 * @param {string} path - Storage path
 * @param {number} expiresIn - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function getActivityFileSignedUrl(path, expiresIn = 3600) {
  const supabase = getServiceClient();

  const { data, error } = await supabase.storage
    .from(ACTIVITY_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating activity file signed URL:', error);
    throw error;
  }

  return data.signedUrl;
}

module.exports = {
  uploadPdf,
  deletePdf,
  deleteAllTripPdfs,
  getPdfSignedUrl,
  uploadPendingPdf,
  movePdfToTrip,
  deletePendingPdf,
  uploadActivityFile,
  deleteActivityFile,
  getActivityFileSignedUrl,
  BUCKET_NAME,
  ACTIVITY_BUCKET
};
