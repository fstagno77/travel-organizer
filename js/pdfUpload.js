/**
 * PDF Upload Helper - Direct upload to Supabase Storage via signed URL
 * Replaces base64-in-JSON approach to bypass Netlify's 6MB body limit.
 *
 * Flow:
 * 1. Request signed upload URL from backend
 * 2. Upload PDF binary directly to Supabase Storage
 * 3. Return storage path for backend processing
 */

const pdfUpload = {
  /**
   * Upload a PDF file to Supabase Storage via signed URL.
   * @param {File} file - The PDF file to upload
   * @returns {Promise<{filename: string, storagePath: string}>}
   */
  async uploadFile(file) {
    // 1. Get signed upload URL from backend
    const urlResponse = await utils.authFetch('/.netlify/functions/get-upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/pdf'
      })
    });

    if (!urlResponse.ok) {
      const err = await urlResponse.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get upload URL');
    }

    const { uploadUrl, token, storagePath } = await urlResponse.json();

    // 2. Upload file directly to Supabase Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf'
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`Storage upload failed: ${uploadResponse.status}`);
    }

    // 3. Return metadata for backend processing
    return {
      filename: file.name,
      storagePath
    };
  },

  /**
   * Upload multiple PDF files to Storage.
   * @param {File[]} files - Array of PDF files
   * @returns {Promise<Array<{filename: string, storagePath: string}>>}
   */
  async uploadFiles(files) {
    return Promise.all(files.map(file => this.uploadFile(file)));
  }
};

window.pdfUpload = pdfUpload;
