/**
 * Notification helper for collaborative trip changes
 */

const { getServiceClient } = require('./auth');

/**
 * Send notifications to all collaborators (viaggiatori + owner) except the actor.
 * @param {string} tripId - Trip that was modified
 * @param {string} actorId - User who performed the action
 * @param {string} type - Notification type (e.g. 'booking_added')
 * @param {string} messageIt - Italian message
 * @param {string} messageEn - English message
 */
async function notifyCollaborators(tripId, actorId, type, messageIt, messageEn) {
  try {
    const serviceClient = getServiceClient();

    // Get trip owner
    const { data: trip } = await serviceClient
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (!trip) return;

    // Get all accepted collaborators
    const { data: collabs } = await serviceClient
      .from('trip_collaborators')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('status', 'accepted');

    // Collect unique user IDs, excluding the actor
    const userIds = new Set();
    if (trip.user_id && trip.user_id !== actorId) {
      userIds.add(trip.user_id);
    }
    if (collabs) {
      for (const c of collabs) {
        if (c.user_id !== actorId) {
          userIds.add(c.user_id);
        }
      }
    }

    if (userIds.size === 0) return;

    const notifications = [...userIds].map(uid => ({
      user_id: uid,
      type,
      trip_id: tripId,
      actor_id: actorId,
      message: { it: messageIt, en: messageEn }
    }));

    await serviceClient.from('notifications').insert(notifications);
  } catch (error) {
    // Don't fail the main operation if notification fails
    console.error('Failed to send notifications:', error);
  }
}

module.exports = { notifyCollaborators };
