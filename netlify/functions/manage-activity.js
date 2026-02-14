/**
 * Netlify Function: Manage Activity
 * CRUD operations for custom activities within a trip
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { uploadActivityFile, deleteActivityFile, getActivityFileSignedUrl } = require('./utils/storage');

// Map MIME types to file extensions
const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { supabase } = authResult;

  try {
    const { action, tripId, activity, activityId, attachments, removedAttachments, filePath } = JSON.parse(event.body);

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'action is required' })
      };
    }

    // Handle get-url separately (no trip modification needed)
    if (action === 'get-url') {
      if (!filePath) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'filePath is required' })
        };
      }
      try {
        const url = await getActivityFileSignedUrl(filePath);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, url })
        };
      } catch (err) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to get file URL' })
        };
      }
    }

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'tripId is required' })
      };
    }

    // Fetch trip
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = tripRecord.data;
    if (!tripData.activities) tripData.activities = [];

    let result;

    switch (action) {
      case 'create':
        result = await handleCreate(tripData, tripId, activity, attachments);
        break;
      case 'update':
        result = await handleUpdate(tripData, tripId, activityId, activity, attachments, removedAttachments);
        break;
      case 'delete':
        result = await handleDelete(tripData, activityId);
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid action' })
        };
    }

    if (result.error) {
      return {
        statusCode: result.statusCode || 400,
        headers,
        body: JSON.stringify({ success: false, error: result.error })
      };
    }

    // Save updated trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to save trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, tripData })
    };

  } catch (error) {
    console.error('Error in manage-activity:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Internal error' })
    };
  }
};

/**
 * Create a new activity
 */
async function handleCreate(tripData, tripId, activity, attachments) {
  if (!activity || !activity.name || !activity.date) {
    return { error: 'name and date are required' };
  }

  if (activity.name.length > 100) {
    return { error: 'Name must be 100 characters or less' };
  }

  const id = `activity-${Date.now()}`;

  const newActivity = {
    id,
    name: activity.name.trim(),
    address: (activity.address || '').trim(),
    description: (activity.description || '').trim(),
    date: activity.date,
    startTime: activity.startTime || null,
    endTime: activity.endTime || null,
    urls: (activity.urls || []).filter(u => u && u.trim()),
    attachments: [],
    location: activity.location || null,
    category: activity.category || null
  };

  // Upload attachments
  if (attachments && attachments.length > 0) {
    if (attachments.length > MAX_FILES) {
      return { error: `Maximum ${MAX_FILES} files allowed` };
    }

    // Find next available index (for new activities, start at 0)
    let fileIndex = 0;

    for (const file of attachments) {
      const ext = MIME_TO_EXT[file.type];
      if (!ext) {
        return { error: `Unsupported file type: ${file.type}` };
      }

      // Check approximate size (base64 is ~33% larger than binary)
      const approxSize = (file.data.length * 3) / 4;
      if (approxSize > MAX_FILE_SIZE) {
        return { error: `File ${file.name} exceeds 10MB limit` };
      }

      const path = await uploadActivityFile(file.data, tripId, id, fileIndex, ext, file.type);
      newActivity.attachments.push({
        name: file.name,
        path,
        type: file.type,
        size: Math.round(approxSize)
      });
      fileIndex++;
    }
  }

  tripData.activities.push(newActivity);
  return { success: true };
}

/**
 * Update an existing activity
 */
async function handleUpdate(tripData, tripId, activityId, activity, attachments, removedAttachments) {
  if (!activityId) {
    return { error: 'activityId is required' };
  }

  const existing = tripData.activities.find(a => a.id === activityId);
  if (!existing) {
    return { error: 'Activity not found', statusCode: 404 };
  }

  if (activity) {
    if (activity.name !== undefined) {
      if (!activity.name || activity.name.trim().length === 0) {
        return { error: 'Name cannot be empty' };
      }
      if (activity.name.length > 100) {
        return { error: 'Name must be 100 characters or less' };
      }
      existing.name = activity.name.trim();
    }
    if (activity.address !== undefined) existing.address = (activity.address || '').trim();
    if (activity.description !== undefined) existing.description = (activity.description || '').trim();
    if (activity.date !== undefined) existing.date = activity.date;
    if (activity.startTime !== undefined) existing.startTime = activity.startTime || null;
    if (activity.endTime !== undefined) existing.endTime = activity.endTime || null;
    if (activity.urls !== undefined) existing.urls = (activity.urls || []).filter(u => u && u.trim());
    if (activity.location !== undefined) existing.location = activity.location || null;
    if (activity.category !== undefined) existing.category = activity.category || null;
  }

  // Remove deleted attachments
  if (removedAttachments && removedAttachments.length > 0) {
    for (const path of removedAttachments) {
      await deleteActivityFile(path);
      existing.attachments = (existing.attachments || []).filter(a => a.path !== path);
    }
  }

  // Upload new attachments
  if (attachments && attachments.length > 0) {
    const currentCount = (existing.attachments || []).length;
    if (currentCount + attachments.length > MAX_FILES) {
      return { error: `Maximum ${MAX_FILES} files allowed` };
    }

    // Find next available index
    let fileIndex = 0;
    if (existing.attachments && existing.attachments.length > 0) {
      // Parse the highest existing index from paths
      for (const att of existing.attachments) {
        const match = att.path.match(/-(\d+)\.\w+$/);
        if (match) {
          fileIndex = Math.max(fileIndex, parseInt(match[1]) + 1);
        }
      }
    }

    for (const file of attachments) {
      const ext = MIME_TO_EXT[file.type];
      if (!ext) {
        return { error: `Unsupported file type: ${file.type}` };
      }

      const approxSize = (file.data.length * 3) / 4;
      if (approxSize > MAX_FILE_SIZE) {
        return { error: `File ${file.name} exceeds 10MB limit` };
      }

      const path = await uploadActivityFile(file.data, tripId, activityId, fileIndex, ext, file.type);
      if (!existing.attachments) existing.attachments = [];
      existing.attachments.push({
        name: file.name,
        path,
        type: file.type,
        size: Math.round(approxSize)
      });
      fileIndex++;
    }
  }

  return { success: true };
}

/**
 * Delete an activity
 */
async function handleDelete(tripData, activityId) {
  if (!activityId) {
    return { error: 'activityId is required' };
  }

  const index = tripData.activities.findIndex(a => a.id === activityId);
  if (index === -1) {
    return { error: 'Activity not found', statusCode: 404 };
  }

  const activity = tripData.activities[index];

  // Delete all attachments from storage
  if (activity.attachments && activity.attachments.length > 0) {
    for (const att of activity.attachments) {
      await deleteActivityFile(att.path);
    }
  }

  tripData.activities.splice(index, 1);
  return { success: true };
}
