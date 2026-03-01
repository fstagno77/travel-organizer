/**
 * Permission helpers for collaborative trip access
 */

const { getServiceClient } = require('./auth');

/**
 * Check if user can modify a trip (owner or viaggiatore)
 * @param {string} userId - Current user's ID
 * @param {string} tripId - Trip ID to check
 * @returns {{ allowed: boolean, role: string|null, isOwner: boolean }}
 */
async function canModifyTrip(userId, tripId) {
  const serviceClient = getServiceClient();

  const { data: trip } = await serviceClient
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) return { allowed: false, role: null, isOwner: false };
  if (trip.user_id === userId) return { allowed: true, role: 'proprietario', isOwner: true };

  const { data: collab } = await serviceClient
    .from('trip_collaborators')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (collab?.role === 'viaggiatore') {
    return { allowed: true, role: 'viaggiatore', isOwner: false };
  }

  return { allowed: false, role: collab?.role || null, isOwner: false };
}

/**
 * Check if user can delete a trip (owner only)
 * @param {string} userId - Current user's ID
 * @param {string} tripId - Trip ID to check
 * @returns {boolean}
 */
async function canDeleteTrip(userId, tripId) {
  const serviceClient = getServiceClient();

  const { data: trip } = await serviceClient
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  return trip?.user_id === userId;
}

/**
 * Get the user's role for a trip
 * @param {string} userId - Current user's ID
 * @param {string} tripId - Trip ID to check
 * @returns {string|null} 'proprietario', 'viaggiatore', 'ospite', or null
 */
async function getUserRole(userId, tripId) {
  const serviceClient = getServiceClient();

  const { data: trip } = await serviceClient
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) return null;
  if (trip.user_id === userId) return 'proprietario';

  const { data: collab } = await serviceClient
    .from('trip_collaborators')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  return collab?.role || null;
}

module.exports = { canModifyTrip, canDeleteTrip, getUserRole };
