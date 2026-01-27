/**
 * Unsplash API Helper
 * Fetches destination photos for trip cards
 */

const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

/**
 * Get Unsplash Access Key from environment
 */
function getAccessKey() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.warn('UNSPLASH_ACCESS_KEY not configured');
  }
  return key;
}

/**
 * Search for destination photos
 * @param {string} destination - City or place name
 * @param {number} count - Number of photos to return (default 3)
 * @param {number} page - Page number for pagination (default 1)
 * @returns {Promise<Array|null>} Array of photo data or null
 */
async function searchDestinationPhotos(destination, count = 3, page = 1) {
  const accessKey = getAccessKey();

  if (!accessKey) {
    return null;
  }

  const query = `${destination} city travel landmark`;

  const params = new URLSearchParams({
    query,
    orientation: 'landscape',
    per_page: String(count),
    page: String(page),
    order_by: 'relevant'
  });

  try {
    const response = await fetch(
      `${UNSPLASH_BASE_URL}/search/photos?${params}`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`No photos found for destination: ${destination}`);
      return null;
    }

    return data.results.map(photo => ({
      id: photo.id,
      previewUrl: `${photo.urls.raw}&w=400&h=250&fit=crop&q=80`,
      fullUrl: `${photo.urls.raw}&w=800&h=500&fit=crop&q=80`,
      color: photo.color,
      attribution: {
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
        downloadLocation: photo.links.download_location
      }
    }));

  } catch (error) {
    console.error('Error searching Unsplash:', error);
    return null;
  }
}

/**
 * Get full photo data by ID
 * @param {string} photoId - Unsplash photo ID
 * @returns {Promise<Object|null>} Photo data or null
 */
async function getPhotoById(photoId) {
  const accessKey = getAccessKey();

  if (!accessKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${UNSPLASH_BASE_URL}/photos/${photoId}`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return null;
    }

    const photo = await response.json();

    return {
      id: photo.id,
      fullUrl: `${photo.urls.raw}&w=800&h=500&fit=crop&q=80`,
      color: photo.color,
      attribution: {
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
        downloadLocation: photo.links.download_location
      }
    };

  } catch (error) {
    console.error('Error fetching photo:', error);
    return null;
  }
}

/**
 * Trigger download tracking (required by Unsplash API guidelines)
 * @param {string} downloadLocation - The download_location URL from photo data
 */
async function triggerDownloadTracking(downloadLocation) {
  const accessKey = getAccessKey();

  if (!accessKey || !downloadLocation) {
    return;
  }

  try {
    await fetch(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });
  } catch (error) {
    // Non-critical, just log
    console.log('Download tracking failed:', error.message);
  }
}

/**
 * Download photo as buffer
 * @param {string} photoUrl - URL to download
 * @returns {Promise<Buffer|null>} Photo buffer or null
 */
async function downloadPhoto(photoUrl) {
  try {
    const response = await fetch(photoUrl);

    if (!response.ok) {
      console.error('Error downloading photo:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('Error downloading photo:', error);
    return null;
  }
}

module.exports = {
  searchDestinationPhotos,
  getPhotoById,
  triggerDownloadTracking,
  downloadPhoto
};
