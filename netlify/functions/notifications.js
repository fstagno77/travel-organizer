/**
 * Netlify Function: Notifications
 * GET: list notifications or count unread
 * POST: mark as read
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;

  try {
    if (event.httpMethod === 'GET') {
      return await handleGet(supabase, user, event.queryStringParameters || {}, headers);
    }

    if (event.httpMethod === 'POST') {
      return await handlePost(supabase, user, JSON.parse(event.body), headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error in notifications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

async function handleGet(supabase, user, params, headers) {
  // Count-only mode for badge polling
  if (params.count === 'true') {
    const { data: unreadNotifs, error } = await supabase
      .from('notifications')
      .select('id, trip_id')
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    // Escludi notifiche di viaggi soft-deleted
    const unreadTripIds = [...new Set((unreadNotifs || []).filter(n => n.trip_id).map(n => n.trip_id))];
    let deletedTripIds = new Set();
    if (unreadTripIds.length > 0) {
      const { data: deleted } = await getServiceClient()
        .from('trips')
        .select('id')
        .in('id', unreadTripIds)
        .not('deleted_at', 'is', null);
      if (deleted) deleted.forEach(t => deletedTripIds.add(t.id));
    }

    const validCount = (unreadNotifs || []).filter(n => !deletedTripIds.has(n.trip_id)).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, unreadCount: validCount })
    };
  }

  // Full list mode
  const serviceClient = getServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  // Enrich with actor profiles and trip titles
  const actorIds = [...new Set((notifications || []).filter(n => n.actor_id).map(n => n.actor_id))];
  const tripIds = [...new Set((notifications || []).filter(n => n.trip_id).map(n => n.trip_id))];

  let actorMap = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, username, email')
      .in('id', actorIds);

    if (profiles) {
      for (const p of profiles) {
        actorMap[p.id] = { username: p.username, email: p.email };
      }
    }
  }

  let tripMap = {};
  if (tripIds.length > 0) {
    // Escludi viaggi soft-deleted: non devono apparire nella lista notifiche
    const { data: trips } = await serviceClient
      .from('trips')
      .select('id, data')
      .in('id', tripIds)
      .is('deleted_at', null);

    if (trips) {
      for (const t of trips) {
        tripMap[t.id] = {
          title: t.data?.title?.it || t.data?.title || null
        };
      }
    }
  }

  // Check which collaboration_invite notifications are still actionable (pending) or already accepted
  const inviteNotifs = (notifications || []).filter(n => n.type === 'collaboration_invite' && n.trip_id);
  let pendingInviteTrips = new Set();
  let acceptedInviteTrips = new Set();
  if (inviteNotifs.length > 0) {
    const inviteTripIds = [...new Set(inviteNotifs.map(n => n.trip_id))];
    const { data: collabs } = await serviceClient
      .from('trip_collaborators')
      .select('trip_id, status')
      .eq('user_id', user.id)
      .in('trip_id', inviteTripIds);

    if (collabs) {
      for (const c of collabs) {
        if (c.status === 'pending') pendingInviteTrips.add(c.trip_id);
        else if (c.status === 'active') acceptedInviteTrips.add(c.trip_id);
      }
    }
  }

  // Track which trips have already had their most-recent invite marked actionable
  const actionableInviteTripsSeen = new Set();

  // Viaggi soft-deleted: trip_id non compare nel tripMap → escludi le notifiche relative
  const deletedTripSet = new Set(tripIds.filter(id => !tripMap[id]));
  const visibleNotifications = (notifications || []).filter(n => !n.trip_id || !deletedTripSet.has(n.trip_id));

  const enriched = visibleNotifications.map(n => {
    const item = {
      id: n.id,
      type: n.type,
      tripId: n.trip_id,
      tripTitle: tripMap[n.trip_id]?.title || null,
      actorId: n.actor_id,
      actorName: actorMap[n.actor_id]?.username || actorMap[n.actor_id]?.email || null,
      message: n.message,
      read: n.read,
      createdAt: n.created_at
    };

    // Mark collaboration_invite as actionable only for the most recent one per trip
    // (notifications are ordered created_at DESC, so first occurrence = most recent)
    if (n.type === 'collaboration_invite') {
      if (pendingInviteTrips.has(n.trip_id) && !actionableInviteTripsSeen.has(n.trip_id)) {
        item.actionable = true;
        item.actionTripId = n.trip_id;
        actionableInviteTripsSeen.add(n.trip_id);
      } else if (acceptedInviteTrips.has(n.trip_id)) {
        item.inviteStatus = 'accepted';
      }
    }

    return item;
  });

  // Conta unread solo sulle notifiche visibili (escluse quelle di viaggi soft-deleted)
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      notifications: enriched,
      unreadCount: unreadCount || 0
    })
  };
}

async function handlePost(supabase, user, body, headers) {
  const { action, notificationId } = body;

  if (action === 'mark-read' && notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  }

  if (action === 'mark-all-read') {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ success: false, error: 'Invalid action' })
  };
}
