/**
 * Netlify Function: Admin API
 * Single endpoint with action-based routing for admin dashboard
 * Only accessible by admin user (fstagno@idibgroup.com)
 */

const { authenticateRequest, getServiceClient, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { processSinglePdfWithClaude } = require('./utils/pdfProcessor');

const ADMIN_EMAIL = 'fstagno@idibgroup.com';

/**
 * Resolve i18n field: { it: "...", en: "..." } → string
 */
function resolveI18n(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.it || val.en || Object.values(val)[0] || '';
  return String(val);
}

/**
 * Verify the request is from the admin user
 */
async function authenticateAdmin(event) {
  const authResult = await authenticateRequest(event);
  if (!authResult) return null;

  if (authResult.user.email !== ADMIN_EMAIL) {
    return null;
  }

  return authResult;
}

/**
 * Log admin action to audit table
 */
async function logAdminAction(serviceClient, userId, action, entityType, entityId, details) {
  const { error } = await serviceClient
    .from('admin_audit_log')
    .insert({
      admin_user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || null
    });
  if (error) console.error('Failed to log admin action:', error);
}

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const authResult = await authenticateAdmin(event);
  if (!authResult) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Forbidden: admin access required' })
    };
  }

  const { user } = authResult;
  const serviceClient = getServiceClient();

  try {
    const body = JSON.parse(event.body);
    const { action } = body;

    if (!action) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'action is required' }) };
    }

    let result;

    switch (action) {
      case 'get-dashboard-stats':
        result = await getDashboardStats(serviceClient);
        break;
      case 'list-users':
        result = await listUsers(serviceClient, body);
        break;
      case 'get-user':
        result = await getUser(serviceClient, body);
        break;
      case 'pre-delete-check':
        result = await preDeleteCheck(serviceClient, body);
        break;
      case 'delete-user':
        result = await deleteUser(serviceClient, body, user.id);
        break;
      case 'list-trips':
        result = await listTrips(serviceClient, body);
        break;
      case 'get-trip':
        result = await getTrip(serviceClient, body);
        break;
      case 'update-trip':
        result = await updateTrip(serviceClient, body, user.id);
        break;
      case 'delete-trip':
        result = await deleteTrip(serviceClient, body, user.id);
        break;
      case 'restore-trip':
        result = await restoreTrip(serviceClient, body, user.id);
        break;
      case 'list-pending-bookings':
        result = await listPendingBookings(serviceClient, body);
        break;
      case 'delete-pending-booking':
        result = await deletePendingBooking(serviceClient, body, user.id);
        break;
      case 'list-email-logs':
        result = await listEmailLogs(serviceClient, body);
        break;
      case 'get-airport-stats':
        result = await getAirportStats(serviceClient);
        break;
      case 'get-pdf-stats':
        result = await getPdfStats(serviceClient);
        break;
      case 'get-email-stats':
        result = await getEmailStats(serviceClient);
        break;
      case 'list-shared-trips':
        result = await listSharedTrips(serviceClient);
        break;
      case 'revoke-share':
        result = await revokeShare(serviceClient, body, user.id);
        break;
      case 'export-data':
        result = await exportData(serviceClient, body);
        break;
      case 'get-audit-log':
        result = await getAuditLog(serviceClient, body);
        break;
      case 'get-system-info':
        result = await getSystemInfo();
        break;
      case 'refresh-stats-cache':
        result = await refreshStatsCache(serviceClient);
        break;
      case 'get-trip-collaborators':
        result = await getTripCollaborators(serviceClient, body);
        break;
      case 'list-pdf-logs':
        result = await listPdfLogs(serviceClient, body);
        break;
      case 'pdf-log-stats':
        result = await getPdfLogStats(serviceClient, body.source);
        break;
      case 'clear-pdf-logs':
        result = await clearPdfLogs(serviceClient, user.id, body.source);
        break;
      case 'get-trip-files':
        result = await getTripFiles(serviceClient, body);
        break;
      case 'get-pending-booking-detail':
        result = await getPendingBookingDetail(serviceClient, body);
        break;
      case 'analyze-pdf-admin':
        result = await analyzePdfAdmin(body);
        break;
      case 'analyze-pdf-smart':
        result = await analyzePdfSmart(body);
        break;
      case 'test-email-smartparse':
        result = await testEmailSmartParse(body);
        break;
      case 'test-eml-smartparse':
        result = await testEmlSmartParse(body);
        break;
      case 'smartparse-list-templates':
        result = await smartParseListTemplates();
        break;
      case 'smartparse-delete-template':
        result = await smartParseDeleteTemplate(body);
        break;
      case 'list-pending-invitations':
        result = await listPendingInvitations(serviceClient, body);
        break;
      case 'revoke-pending-invitation':
        result = await revokePendingInvitation(serviceClient, body, user.id);
        break;
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, ...result })
    };

  } catch (error) {
    console.error('Admin API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Internal error' })
    };
  }
};

// ============================================
// Dashboard
// ============================================

async function getDashboardStats(sc) {
  // Counts
  const [usersRes, tripsRes, pendingRes, emailLogsRes] = await Promise.all([
    sc.from('profiles').select('id', { count: 'exact', head: true }),
    sc.from('trips').select('id', { count: 'exact', head: true }),
    sc.from('pending_bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sc.from('email_processing_log').select('id', { count: 'exact', head: true })
  ]);

  // Get all trips to compute flight/hotel/activity counts
  const { data: allTrips } = await sc.from('trips').select('data, created_at, user_id');
  let totalFlights = 0, totalHotels = 0, totalActivities = 0;
  if (allTrips) {
    for (const t of allTrips) {
      const d = t.data || {};
      totalFlights += (d.flights || []).length;
      totalHotels += (d.hotels || []).length;
      totalActivities += (d.activities || []).length;
    }
  }

  // Trips created in last 8 weeks
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const weeklyTrips = {};
  if (allTrips) {
    for (const t of allTrips) {
      const created = new Date(t.created_at);
      if (created >= eightWeeksAgo) {
        const weekStart = getWeekStart(created);
        weeklyTrips[weekStart] = (weeklyTrips[weekStart] || 0) + 1;
      }
    }
  }

  // Build 8-week array
  const tripsPerWeek = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - (i * 7));
    const ws = getWeekStart(d);
    tripsPerWeek.push({ week: ws, count: weeklyTrips[ws] || 0 });
  }

  // Recent trips (last 10)
  const { data: recentTrips } = await sc
    .from('trips')
    .select('id, data, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10);

  // Resolve usernames for recent trips
  let recentWithUsers = [];
  if (recentTrips && recentTrips.length > 0) {
    const userIds = [...new Set(recentTrips.map(t => t.user_id).filter(Boolean))];
    const { data: profiles } = await sc.from('profiles').select('id, username, email').in('id', userIds);
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.id] = p);

    recentWithUsers = recentTrips.map(t => ({
      id: t.id,
      title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Untitled',
      destination: resolveI18n(t.data?.destination) || '-',
      startDate: t.data?.startDate,
      username: profileMap[t.user_id]?.username || '-',
      created_at: t.created_at
    }));
  }

  return {
    stats: {
      totalUsers: usersRes.count || 0,
      totalTrips: tripsRes.count || 0,
      totalFlights,
      totalHotels,
      totalActivities,
      totalPending: pendingRes.count || 0,
      totalEmailLogs: emailLogsRes.count || 0
    },
    tripsPerWeek,
    recentTrips: recentWithUsers
  };
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ============================================
// Users
// ============================================

async function listUsers(sc, { search, page = 1, pageSize = 20 }) {
  let query = sc.from('profiles').select('id, username, email, created_at', { count: 'exact' });

  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: users, count, error } = await query;
  if (error) throw error;

  // Get trip counts per user
  if (users && users.length > 0) {
    const userIds = users.map(u => u.id);
    const { data: trips } = await sc.from('trips').select('user_id').in('user_id', userIds);
    const tripCounts = {};
    if (trips) trips.forEach(t => { tripCounts[t.user_id] = (tripCounts[t.user_id] || 0) + 1; });
    users.forEach(u => { u.tripCount = tripCounts[u.id] || 0; });
  }

  return { users: users || [], total: count || 0, page, pageSize };
}

async function getUser(sc, { userId }) {
  if (!userId) throw new Error('userId is required');

  const { data: profile, error } = await sc.from('profiles').select('id, username, email, created_at').eq('id', userId).single();
  if (error) throw error;

  // Get user trips
  const { data: trips } = await sc.from('trips').select('id, data, created_at').eq('user_id', userId).order('created_at', { ascending: false });

  // Get traveler count (no sensitive data)
  const { count: travelerCount } = await sc.from('travelers').select('id', { count: 'exact', head: true }).eq('user_id', userId);

  const tripsSummary = (trips || []).map(t => ({
    id: t.id,
    title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Untitled',
    destination: resolveI18n(t.data?.destination) || '-',
    startDate: t.data?.startDate,
    endDate: t.data?.endDate,
    flightCount: (t.data?.flights || []).length,
    hotelCount: (t.data?.hotels || []).length,
    activityCount: (t.data?.activities || []).length
  }));

  return {
    user: profile,
    trips: tripsSummary,
    travelerCount: travelerCount || 0
  };
}

/**
 * Pre-delete check: raccoglie tutte le dipendenze dell'utente
 * per mostrare all'admin cosa verrà cancellato/impattato
 */
async function preDeleteCheck(sc, { userId }) {
  if (!userId) throw new Error('userId is required');

  const { data: profile } = await sc.from('profiles').select('id, username, email, created_at').eq('id', userId).single();
  if (!profile) throw new Error('Utente non trovato');

  // Viaggi di proprietà
  const { data: ownedTrips } = await sc.from('trips').select('id, data').eq('user_id', userId);
  const trips = (ownedTrips || []).map(t => ({
    id: t.id,
    title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Senza titolo',
    flights: (t.data?.flights || []).length,
    hotels: (t.data?.hotels || []).length,
    activities: (t.data?.activities || []).length
  }));

  // Collaboratori sui suoi viaggi (persone che perderanno accesso)
  const tripIds = trips.map(t => t.id);
  let impactedCollaborators = [];
  if (tripIds.length > 0) {
    const { data: collabs } = await sc.from('trip_collaborators').select('id, trip_id, user_id, role, status').in('trip_id', tripIds);
    if (collabs && collabs.length > 0) {
      const collabUserIds = [...new Set(collabs.map(c => c.user_id))];
      const { data: collabProfiles } = await sc.from('profiles').select('id, username, email').in('id', collabUserIds);
      const profileMap = {};
      if (collabProfiles) collabProfiles.forEach(p => profileMap[p.id] = p);

      impactedCollaborators = collabs.map(c => ({
        tripId: c.trip_id,
        tripTitle: trips.find(t => t.id === c.trip_id)?.title || '-',
        userId: c.user_id,
        username: profileMap[c.user_id]?.username || '-',
        email: profileMap[c.user_id]?.email || '-',
        role: c.role,
        status: c.status
      }));
    }

    // Inviti pending sui suoi viaggi
    const { data: tripInvites } = await sc.from('trip_invitations').select('id, trip_id, email, role, status').in('trip_id', tripIds).eq('status', 'pending');
    if (tripInvites && tripInvites.length > 0) {
      for (const inv of tripInvites) {
        impactedCollaborators.push({
          tripId: inv.trip_id,
          tripTitle: trips.find(t => t.id === inv.trip_id)?.title || '-',
          email: inv.email,
          role: inv.role,
          status: 'invited',
          type: 'invitation'
        });
      }
    }
  }

  // Viaggi dove l'utente è collaboratore (non owner)
  const { data: collabTrips } = await sc.from('trip_collaborators').select('id, trip_id, role, status').eq('user_id', userId);
  let collaboratingOn = [];
  if (collabTrips && collabTrips.length > 0) {
    const collabTripIds = collabTrips.map(c => c.trip_id);
    const { data: otherTrips } = await sc.from('trips').select('id, data, user_id').in('id', collabTripIds);
    const ownerIds = [...new Set((otherTrips || []).map(t => t.user_id))];
    const { data: ownerProfiles } = ownerIds.length > 0
      ? await sc.from('profiles').select('id, username').in('id', ownerIds)
      : { data: [] };
    const ownerMap = {};
    if (ownerProfiles) ownerProfiles.forEach(p => ownerMap[p.id] = p.username);

    collaboratingOn = (otherTrips || []).map(t => {
      const collab = collabTrips.find(c => c.trip_id === t.id);
      return {
        tripId: t.id,
        title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Senza titolo',
        ownerUsername: ownerMap[t.user_id] || '-',
        role: collab?.role || '-',
        status: collab?.status || '-'
      };
    });
  }

  // Inviti pending ricevuti dall'utente (per email)
  const { data: pendingInvites } = await sc.from('trip_invitations').select('id, trip_id, role, status, email').eq('email', profile.email).eq('status', 'pending');
  let receivedInvitations = [];
  if (pendingInvites && pendingInvites.length > 0) {
    const invTripIds = pendingInvites.map(i => i.trip_id);
    const { data: invTrips } = await sc.from('trips').select('id, data').in('id', invTripIds);
    const invTripMap = {};
    if (invTrips) invTrips.forEach(t => invTripMap[t.id] = resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Senza titolo');

    receivedInvitations = pendingInvites.map(i => ({
      id: i.id,
      tripId: i.trip_id,
      tripTitle: invTripMap[i.trip_id] || '-',
      role: i.role
    }));
  }

  // Pending bookings
  const { count: pendingBookingsCount } = await sc.from('pending_bookings').select('id', { count: 'exact', head: true }).eq('user_id', userId);

  // Travelers
  const { count: travelersCount } = await sc.from('travelers').select('id', { count: 'exact', head: true }).eq('user_id', userId);

  // Notifiche
  const { count: notificationsCount } = await sc.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId);

  // File storage: conta PDF nei viaggi dell'utente
  let storageFilesCount = 0;
  for (const t of trips) {
    try {
      const { data: files } = await sc.storage.from('trip-pdfs').list(t.id);
      if (files) storageFilesCount += files.length;
    } catch { /* bucket potrebbe non esistere */ }
  }

  return {
    user: profile,
    ownedTrips: trips,
    impactedCollaborators,
    collaboratingOn,
    receivedInvitations,
    counts: {
      trips: trips.length,
      impactedCollaborators: impactedCollaborators.length,
      collaboratingOn: collaboratingOn.length,
      receivedInvitations: receivedInvitations.length,
      pendingBookings: pendingBookingsCount || 0,
      travelers: travelersCount || 0,
      notifications: notificationsCount || 0,
      storageFiles: storageFilesCount
    }
  };
}

/**
 * Cancellazione utente sicura con cleanup completo
 */
async function deleteUser(sc, { userId }, adminId) {
  if (!userId) throw new Error('userId is required');

  // Raccogli info per audit prima della cancellazione
  const { data: profile } = await sc.from('profiles').select('username, email').eq('id', userId).single();
  if (!profile) throw new Error('Utente non trovato');

  // 1. Raccogli i trip di proprietà per cleanup storage e notifiche
  const { data: ownedTrips } = await sc.from('trips').select('id, data').eq('user_id', userId);
  const tripIds = (ownedTrips || []).map(t => t.id);

  // 2. Notifica collaboratori dei suoi viaggi che il viaggio verrà rimosso
  if (tripIds.length > 0) {
    const { data: collabs } = await sc.from('trip_collaborators').select('user_id, trip_id').in('trip_id', tripIds);
    if (collabs && collabs.length > 0) {
      const uniqueCollabUserIds = [...new Set(collabs.map(c => c.user_id))];
      const notifications = uniqueCollabUserIds.map(collabUserId => ({
        user_id: collabUserId,
        type: 'collaboration_revoked',
        trip_id: collabs.find(c => c.user_id === collabUserId)?.trip_id,
        actor_id: adminId,
        message: {
          it: `Il viaggio condiviso da ${profile.username} è stato rimosso (utente eliminato dall'admin)`,
          en: `The trip shared by ${profile.username} has been removed (user deleted by admin)`
        },
        read: false
      }));
      // Inserisci notifiche in batch (non-fatal)
      try {
        await sc.from('notifications').insert(notifications);
      } catch (e) { console.error('Errore invio notifiche pre-delete:', e); }
    }
  }

  // 3. Revocare inviti pending ricevuti dall'utente (per email)
  try {
    await sc.from('trip_invitations').update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('email', profile.email).eq('status', 'pending');
  } catch (e) { console.error('Errore revoca inviti ricevuti:', e); }

  // 4. Rimuovere collaborazioni dell'utente su viaggi altrui (+ notifica owner)
  const { data: userCollabs } = await sc.from('trip_collaborators').select('trip_id').eq('user_id', userId);
  if (userCollabs && userCollabs.length > 0) {
    const otherTripIds = userCollabs.map(c => c.trip_id).filter(id => !tripIds.includes(id));
    if (otherTripIds.length > 0) {
      // Notifica gli owner dei viaggi da cui l'utente viene rimosso
      const { data: otherTrips } = await sc.from('trips').select('id, user_id').in('id', otherTripIds);
      if (otherTrips) {
        const ownerNotifs = otherTrips.map(t => ({
          user_id: t.user_id,
          type: 'collaboration_revoked',
          trip_id: t.id,
          actor_id: adminId,
          message: {
            it: `${profile.username} è stato rimosso dal viaggio (utente eliminato dall'admin)`,
            en: `${profile.username} has been removed from the trip (user deleted by admin)`
          },
          read: false
        }));
        try {
          await sc.from('notifications').insert(ownerNotifs);
        } catch (e) { console.error('Errore notifica owner:', e); }
      }
    }
  }

  // 5. Cleanup file Storage per ogni viaggio di proprietà
  for (const trip of (ownedTrips || [])) {
    // PDF del viaggio
    try {
      const { data: files } = await sc.storage.from('trip-pdfs').list(trip.id);
      if (files && files.length > 0) {
        const paths = files.map(f => `${trip.id}/${f.name}`);
        await sc.storage.from('trip-pdfs').remove(paths);
      }
    } catch (e) { console.error('Errore cleanup PDF:', e); }

    // File attività
    const activities = trip.data?.activities || [];
    for (const act of activities) {
      if (act.attachments) {
        for (const att of act.attachments) {
          try { await sc.storage.from('activity-files').remove([att.path]); } catch { /* ignore */ }
        }
      }
    }
  }

  // 6. Cancella utente via auth admin API (cascade su tutte le tabelle)
  const { error } = await sc.auth.admin.deleteUser(userId);
  if (error) throw error;

  // 7. Audit log con dettagli completi
  await logAdminAction(sc, adminId, 'delete_user', 'user', userId, {
    username: profile.username,
    email: profile.email,
    tripsDeleted: tripIds.length,
    collaboratorsNotified: (userCollabs || []).length,
    storageCleanup: true
  });

  return { deleted: true };
}

// ============================================
// Pending Invitations (piattaforma + viaggio)
// ============================================

async function listPendingInvitations(sc, { type } = {}) {
  const results = {};

  // Inviti piattaforma (registrazione)
  if (!type || type === 'platform') {
    const { data: platInvites, error: platErr } = await sc
      .from('platform_invitations')
      .select('id, email, invited_by, status, created_at, updated_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (platErr) throw platErr;

    // Risolve profili degli invitanti
    const inviterIds = [...new Set((platInvites || []).map(i => i.invited_by).filter(Boolean))];
    const inviterMap = {};
    if (inviterIds.length > 0) {
      const { data: profiles } = await sc.from('profiles').select('id, username, email').in('id', inviterIds);
      if (profiles) profiles.forEach(p => { inviterMap[p.id] = p; });
    }

    results.platformInvitations = (platInvites || []).map(i => ({
      id: i.id,
      email: i.email,
      invitedBy: inviterMap[i.invited_by]?.username || '-',
      invitedByEmail: inviterMap[i.invited_by]?.email || '-',
      invitedById: i.invited_by,
      role: 'Invitato piattaforma',
      type: 'platform',
      status: i.status,
      created_at: i.created_at
    }));
  }

  // Inviti collaborazione su viaggio
  if (!type || type === 'trip') {
    const { data: tripInvites, error: tripErr } = await sc
      .from('trip_invitations')
      .select('id, trip_id, email, role, invited_by, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (tripErr) throw tripErr;

    // Risolve titoli viaggi
    const tripIds = [...new Set((tripInvites || []).map(i => i.trip_id).filter(Boolean))];
    const tripMap = {};
    if (tripIds.length > 0) {
      const { data: trips } = await sc.from('trips').select('id, data').in('id', tripIds);
      if (trips) trips.forEach(t => {
        tripMap[t.id] = resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Senza titolo';
      });
    }

    // Risolve profili degli invitanti
    const tripInviterIds = [...new Set((tripInvites || []).map(i => i.invited_by).filter(Boolean))];
    const tripInviterMap = {};
    if (tripInviterIds.length > 0) {
      const { data: profiles } = await sc.from('profiles').select('id, username, email').in('id', tripInviterIds);
      if (profiles) profiles.forEach(p => { tripInviterMap[p.id] = p; });
    }

    results.tripInvitations = (tripInvites || []).map(i => ({
      id: i.id,
      email: i.email,
      invitedBy: tripInviterMap[i.invited_by]?.username || '-',
      invitedByEmail: tripInviterMap[i.invited_by]?.email || '-',
      invitedById: i.invited_by,
      role: i.role,
      type: 'trip',
      tripId: i.trip_id,
      tripTitle: tripMap[i.trip_id] || '-',
      status: i.status,
      created_at: i.created_at
    }));
  }

  const total = (results.platformInvitations?.length || 0) + (results.tripInvitations?.length || 0);
  return { ...results, total };
}

async function revokePendingInvitation(sc, { invitationId, type }, adminId) {
  if (!invitationId || !type) throw new Error('invitationId e type sono obbligatori');

  const table = type === 'platform' ? 'platform_invitations' : 'trip_invitations';
  const { error } = await sc
    .from(table)
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('status', 'pending');
  if (error) throw error;

  await logAdminAction(sc, adminId, 'revoke_invitation', type === 'platform' ? 'platform_invitation' : 'trip_invitation', invitationId, { type });

  return { revoked: true };
}

// ============================================
// Trips
// ============================================

async function listTrips(sc, { search, userId: filterUserId, status, page = 1, pageSize = 20 }) {
  let query = sc.from('trips').select('id, data, created_at, updated_at, user_id, deleted_at', { count: 'exact' });

  if (filterUserId) {
    query = query.eq('user_id', filterUserId);
  }

  // Filtro soft delete: mostra solo i cancellati se richiesto, altrimenti solo gli attivi
  if (status === 'deleted') {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.is('deleted_at', null);
  }

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: trips, count, error } = await query;
  if (error) throw error;

  // Resolve usernames
  const userIds = [...new Set((trips || []).map(t => t.user_id).filter(Boolean))];
  const profileMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await sc.from('profiles').select('id, username').in('id', userIds);
    if (profiles) profiles.forEach(p => profileMap[p.id] = p.username);
  }

  const now = new Date().toISOString().split('T')[0];
  let result = (trips || []).map(t => {
    const d = t.data || {};
    return {
      id: t.id,
      title: resolveI18n(d.title) || resolveI18n(d.destination) || 'Untitled',
      destination: resolveI18n(d.destination) || '-',
      startDate: d.startDate,
      endDate: d.endDate,
      flightCount: (d.flights || []).length,
      hotelCount: (d.hotels || []).length,
      activityCount: (d.activities || []).length,
      username: profileMap[t.user_id] || '-',
      userId: t.user_id,
      created_at: t.created_at,
      deleted_at: t.deleted_at || null
    };
  });

  // Filter by status (past/current/future) in memory — 'deleted' è già filtrato in DB
  if (status === 'past') {
    result = result.filter(t => t.endDate && t.endDate < now);
  } else if (status === 'current') {
    result = result.filter(t => t.startDate && t.startDate <= now && (!t.endDate || t.endDate >= now));
  } else if (status === 'future') {
    result = result.filter(t => t.startDate && t.startDate > now);
  }

  // Search filter
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(t =>
      (t.title || '').toLowerCase().includes(s) ||
      (t.destination || '').toLowerCase().includes(s) ||
      (t.username || '').toLowerCase().includes(s)
    );
  }

  return { trips: result, total: count || 0, page, pageSize };
}

async function getTrip(sc, { tripId }) {
  if (!tripId) throw new Error('tripId is required');

  const { data: trip, error } = await sc.from('trips').select('*').eq('id', tripId).single();
  if (error) throw error;

  // Get username
  let username = '-';
  if (trip.user_id) {
    const { data: profile } = await sc.from('profiles').select('username').eq('id', trip.user_id).single();
    if (profile) username = profile.username;
  }

  return { trip: { ...trip, username } };
}

async function updateTrip(sc, { tripId, updates }, adminId) {
  if (!tripId) throw new Error('tripId is required');
  if (!updates) throw new Error('updates is required');

  // Only allow updating data blob fields
  const { data: existing, error: fetchErr } = await sc.from('trips').select('data').eq('id', tripId).single();
  if (fetchErr) throw fetchErr;

  const newData = { ...existing.data, ...updates };
  const { error } = await sc.from('trips').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', tripId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'update_trip', 'trip', tripId, { fields: Object.keys(updates) });

  return { updated: true };
}

async function deleteTrip(sc, { tripId }, adminId) {
  if (!tripId) throw new Error('tripId is required');

  // Get trip info for audit
  const { data: trip } = await sc.from('trips').select('data, user_id').eq('id', tripId).single();

  // Cleanup storage PDFs
  try {
    const { data: files } = await sc.storage.from('trip-pdfs').list(tripId);
    if (files && files.length > 0) {
      const paths = files.map(f => `${tripId}/${f.name}`);
      await sc.storage.from('trip-pdfs').remove(paths);
    }
  } catch (err) {
    console.error('Storage cleanup error:', err);
  }

  // Cleanup activity files
  try {
    const activities = trip?.data?.activities || [];
    for (const act of activities) {
      if (act.attachments) {
        for (const att of act.attachments) {
          try {
            await sc.storage.from('activity-files').remove([att.path]);
          } catch (e) { /* ignore */ }
        }
      }
    }
  } catch (err) {
    console.error('Activity files cleanup error:', err);
  }

  const { error } = await sc.from('trips').delete().eq('id', tripId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'delete_trip', 'trip', tripId, {
    title: resolveI18n(trip?.data?.title) || resolveI18n(trip?.data?.destination)
  });

  return { deleted: true };
}

async function restoreTrip(sc, { tripId }, adminId) {
  if (!tripId) throw new Error('tripId is required');

  const { data: trip } = await sc.from('trips').select('data').eq('id', tripId).single();

  const { error } = await sc.from('trips').update({ deleted_at: null }).eq('id', tripId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'restore_trip', 'trip', tripId, {
    title: resolveI18n(trip?.data?.title) || resolveI18n(trip?.data?.destination)
  });

  return { restored: true };
}

// ============================================
// Pending Bookings
// ============================================

async function listPendingBookings(sc, { status, userId: filterUserId, page = 1, pageSize = 20 }) {
  let query = sc.from('pending_bookings').select('id, user_id, email_from, email_subject, booking_type, summary_title, summary_dates, status, created_at', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (filterUserId) query = query.eq('user_id', filterUserId);

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  // Resolve usernames
  const userIds = [...new Set((data || []).map(b => b.user_id).filter(Boolean))];
  const profileMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await sc.from('profiles').select('id, username').in('id', userIds);
    if (profiles) profiles.forEach(p => profileMap[p.id] = p.username);
  }

  const bookings = (data || []).map(b => ({ ...b, username: profileMap[b.user_id] || '-' }));

  return { bookings, total: count || 0, page, pageSize };
}

async function deletePendingBooking(sc, { bookingId }, adminId) {
  if (!bookingId) throw new Error('bookingId is required');

  const { error } = await sc.from('pending_bookings').delete().eq('id', bookingId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'delete_pending_booking', 'pending_booking', bookingId);

  return { deleted: true };
}

// ============================================
// Trip Files (signed URLs for download)
// ============================================

async function getTripFiles(sc, { tripId }) {
  if (!tripId) throw new Error('tripId is required');
  const { data: files } = await sc.storage.from('trip-pdfs').list(tripId);
  if (!files || files.length === 0) return { files: [] };

  const { data: urls } = await sc.storage.from('trip-pdfs').createSignedUrls(
    files.map(f => `${tripId}/${f.name}`),
    600 // 10 minutes
  );

  return {
    files: (urls || []).map((u, i) => ({
      name: files[i].name,
      signedUrl: u.signedUrl,
      size: files[i].metadata?.size || 0,
    }))
  };
}

// ============================================
// Email Logs
// ============================================

async function listEmailLogs(sc, { status, page = 1, pageSize = 20 }) {
  let query = sc.from('email_processing_log').select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return { logs: data || [], total: count || 0, page, pageSize };
}

// ============================================
// Airport Stats
// ============================================

async function getAirportStats(sc) {
  const { data: trips } = await sc.from('trips').select('data');

  const airportCounts = {};
  const routeCounts = {};
  const airlineCounts = {};

  if (trips) {
    for (const t of trips) {
      const flights = t.data?.flights || [];
      for (const f of flights) {
        // Airports
        const depCode = f.departure?.code || f.departure?.airport;
        const arrCode = f.arrival?.code || f.arrival?.airport;

        if (depCode) {
          const key = depCode;
          airportCounts[key] = airportCounts[key] || { code: depCode, city: f.departure?.city || depCode, count: 0 };
          airportCounts[key].count++;
        }
        if (arrCode) {
          const key = arrCode;
          airportCounts[key] = airportCounts[key] || { code: arrCode, city: f.arrival?.city || arrCode, count: 0 };
          airportCounts[key].count++;
        }

        // Routes
        if (depCode && arrCode) {
          const routeKey = `${depCode}-${arrCode}`;
          routeCounts[routeKey] = routeCounts[routeKey] || { from: depCode, to: arrCode, count: 0 };
          routeCounts[routeKey].count++;
        }

        // Airlines
        const airline = f.airline || f.flightNumber?.replace(/\d+/g, '').trim();
        if (airline) {
          airlineCounts[airline] = (airlineCounts[airline] || 0) + 1;
        }
      }
    }
  }

  const topAirports = Object.values(airportCounts).sort((a, b) => b.count - a.count).slice(0, 10);
  const topRoutes = Object.values(routeCounts).sort((a, b) => b.count - a.count).slice(0, 10);
  const topAirlines = Object.entries(airlineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return { topAirports, topRoutes, topAirlines };
}

// ============================================
// PDF Stats
// ============================================

async function getPdfStats(sc) {
  // Count trips (each trip = at least 1 PDF processed)
  const { data: trips } = await sc.from('trips').select('created_at, data');

  let totalPdfs = 0;
  const monthlyTrend = {};

  if (trips) {
    for (const t of trips) {
      // Estimate PDFs from flights + hotels (rough count)
      const flights = (t.data?.flights || []).length;
      const hotels = (t.data?.hotels || []).length;
      const pdfCount = Math.max(1, Math.ceil((flights + hotels) / 2));
      totalPdfs += pdfCount;

      const month = t.created_at?.substring(0, 7); // YYYY-MM
      if (month) {
        monthlyTrend[month] = (monthlyTrend[month] || 0) + pdfCount;
      }
    }
  }

  // Get error logs from email processing (as proxy for PDF failures)
  const { data: errorLogs } = await sc.from('email_processing_log')
    .select('status, error_message, created_at')
    .in('status', ['extraction_failed', 'error'])
    .order('created_at', { ascending: false })
    .limit(20);

  const trend = Object.entries(monthlyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  return {
    totalPdfs,
    recentErrors: errorLogs || [],
    trend
  };
}

// ============================================
// Email Stats
// ============================================

async function getEmailStats(sc) {
  const { data: logs } = await sc.from('email_processing_log').select('status, user_id, created_at');

  const statusCounts = { success: 0, user_not_found: 0, extraction_failed: 0, error: 0 };
  const userCounts = {};

  if (logs) {
    for (const l of logs) {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      if (l.user_id && l.status === 'success') {
        userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1;
      }
    }
  }

  // Top users by forwarding
  const topUserIds = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let topUsers = [];
  if (topUserIds.length > 0) {
    const ids = topUserIds.map(([id]) => id);
    const { data: profiles } = await sc.from('profiles').select('id, username').in('id', ids);
    const pMap = {};
    if (profiles) profiles.forEach(p => pMap[p.id] = p.username);
    topUsers = topUserIds.map(([id, count]) => ({ username: pMap[id] || id, count }));
  }

  // Recent errors
  const { data: recentErrors } = await sc.from('email_processing_log')
    .select('email_from, email_subject, status, error_message, created_at')
    .neq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    total: logs?.length || 0,
    statusCounts,
    topUsers,
    recentErrors: recentErrors || []
  };
}

// ============================================
// Shared Trips
// ============================================

async function listSharedTrips(sc) {
  const { data: trips } = await sc.from('trips').select('id, data, user_id, created_at');

  const shared = [];
  if (trips) {
    for (const t of trips) {
      if (t.data?.shareToken) {
        shared.push({
          id: t.id,
          title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination) || 'Untitled',
          shareToken: t.data.shareToken,
          userId: t.user_id,
          created_at: t.created_at
        });
      }
    }
  }

  // Resolve usernames
  const userIds = [...new Set(shared.map(s => s.userId).filter(Boolean))];
  const profileMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await sc.from('profiles').select('id, username').in('id', userIds);
    if (profiles) profiles.forEach(p => profileMap[p.id] = p.username);
  }

  shared.forEach(s => { s.username = profileMap[s.userId] || '-'; });

  return { sharedTrips: shared };
}

async function revokeShare(sc, { tripId }, adminId) {
  if (!tripId) throw new Error('tripId is required');

  const { data: trip, error: fetchErr } = await sc.from('trips').select('data').eq('id', tripId).single();
  if (fetchErr) throw fetchErr;

  const newData = { ...trip.data };
  delete newData.shareToken;

  const { error } = await sc.from('trips').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', tripId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'revoke_share', 'trip', tripId);

  return { revoked: true };
}

// ============================================
// Export
// ============================================

async function exportData(sc, { type, userId: exportUserId, format = 'json' }) {
  if (!type) throw new Error('type is required');

  if (type === 'users') {
    const { data } = await sc.from('profiles').select('id, username, email, created_at');
    return { data: data || [], filename: `users.${format}` };
  }

  if (type === 'trips') {
    const { data: trips } = await sc.from('trips').select('id, data, created_at, user_id');
    const result = (trips || []).map(t => ({
      id: t.id,
      title: resolveI18n(t.data?.title) || resolveI18n(t.data?.destination),
      destination: resolveI18n(t.data?.destination),
      startDate: t.data?.startDate,
      endDate: t.data?.endDate,
      flightCount: (t.data?.flights || []).length,
      hotelCount: (t.data?.hotels || []).length,
      activityCount: (t.data?.activities || []).length,
      userId: t.user_id,
      created_at: t.created_at
    }));
    return { data: result, filename: `trips.${format}` };
  }

  if (type === 'user-data' && exportUserId) {
    // GDPR export - all user data except sensitive fields
    const { data: profile } = await sc.from('profiles').select('id, username, email, created_at').eq('id', exportUserId).single();
    const { data: trips } = await sc.from('trips').select('id, data, created_at').eq('user_id', exportUserId);
    const { data: travelers } = await sc.from('travelers')
      .select('id, first_name, last_name, is_owner, created_at')
      .eq('user_id', exportUserId);
    const { data: pendingBookings } = await sc.from('pending_bookings')
      .select('id, booking_type, summary_title, summary_dates, status, created_at')
      .eq('user_id', exportUserId);

    return {
      data: {
        profile,
        trips: (trips || []).map(t => ({ id: t.id, title: resolveI18n(t.data?.title), destination: resolveI18n(t.data?.destination), startDate: t.data?.startDate, endDate: t.data?.endDate, created_at: t.created_at })),
        travelers: travelers || [],
        pendingBookings: pendingBookings || []
      },
      filename: `user-${profile?.username || exportUserId}.${format}`
    };
  }

  throw new Error('Invalid export type');
}

// ============================================
// Audit Log
// ============================================

async function getAuditLog(sc, { page = 1, pageSize = 50 }) {
  const { data, count, error } = await sc
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    // Table might not exist yet
    if (error.code === '42P01') return { logs: [], total: 0 };
    throw error;
  }

  return { logs: data || [], total: count || 0, page, pageSize };
}

// ============================================
// System Info
// ============================================

async function getSystemInfo() {
  const envVars = [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY', 'ENCRYPTION_KEY', 'CORS_ORIGIN',
    'GOOGLE_PLACES_API_KEY', 'SENDGRID_WEBHOOK_SECRET'
  ];

  const envStatus = {};
  for (const key of envVars) {
    envStatus[key] = !!process.env[key];
  }

  return {
    envStatus,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  };
}

async function refreshStatsCache(sc) {
  // Just return fresh stats - no caching layer yet
  const stats = await getDashboardStats(sc);
  return { ...stats, refreshedAt: new Date().toISOString() };
}

// ============================================
// Trip Collaborators (Admin view)
// ============================================

async function getTripCollaborators(sc, { tripId }) {
  if (!tripId) throw new Error('tripId is required');

  // Get trip owner
  const { data: trip } = await sc.from('trips').select('user_id').eq('id', tripId).single();
  if (!trip) throw new Error('Trip not found');

  const { data: ownerProfile } = await sc.from('profiles').select('username, email').eq('id', trip.user_id).single();

  // Get collaborators (registered users)
  const { data: collabs } = await sc
    .from('trip_collaborators')
    .select('id, user_id, role, invited_by, created_at, status')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const collaborators = [];
  if (collabs && collabs.length > 0) {
    const userIds = [...new Set(collabs.map(c => c.user_id))];
    const inviterIds = [...new Set(collabs.map(c => c.invited_by).filter(Boolean))];
    const allIds = [...new Set([...userIds, ...inviterIds])];

    const { data: profiles } = await sc.from('profiles').select('id, username, email').in('id', allIds);
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.id] = p);

    for (const c of collabs) {
      const profile = profileMap[c.user_id];
      const inviterProfile = profileMap[c.invited_by];
      collaborators.push({
        id: c.id,
        userId: c.user_id,
        email: profile?.email || '-',
        username: profile?.username || '-',
        role: c.role,
        status: c.status || 'accepted',
        invitedBy: inviterProfile?.username || inviterProfile?.email || '-',
        createdAt: c.created_at,
        type: 'collaborator'
      });
    }
  }

  // Get all invitations (including revoked for history)
  const { data: invitations } = await sc
    .from('trip_invitations')
    .select('id, email, role, invited_by, status, created_at, updated_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const inviterIds2 = [...new Set((invitations || []).map(i => i.invited_by).filter(Boolean))];
  const inviterMap = {};
  if (inviterIds2.length > 0) {
    const { data: inviterProfiles } = await sc.from('profiles').select('id, username, email').in('id', inviterIds2);
    if (inviterProfiles) inviterProfiles.forEach(p => inviterMap[p.id] = p);
  }

  // Deduplica: escludi gli inviti pending per email che hanno già un record in trip_collaborators.
  // Può succedere quando un utente non registrato riceve un invito (→ trip_invitations pending),
  // poi si registra e accetta — trip_collaborators viene aggiornato ma trip_invitations rimane pending.
  // Gli inviti revocati vengono mantenuti (storico).
  const collaboratorEmails = new Set(
    collaborators.map(c => (c.email || '').toLowerCase()).filter(Boolean)
  );

  const invitationList = (invitations || [])
    .filter(inv => {
      if (inv.status === 'pending') {
        return !collaboratorEmails.has((inv.email || '').toLowerCase());
      }
      return true; // revocati e altri stati: mantieni per storico
    })
    .map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invitedBy: inviterMap[inv.invited_by]?.username || inviterMap[inv.invited_by]?.email || '-',
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      type: 'invitation'
    }));

  return {
    owner: {
      userId: trip.user_id,
      email: ownerProfile?.email || '-',
      username: ownerProfile?.username || '-',
      role: 'proprietario',
      status: 'accepted',
      type: 'owner'
    },
    collaborators,
    invitations: invitationList
  };
}

// ============================================
// PDF Logs (Admin view)
// ============================================

async function listPdfLogs(sc, { page = 1, pageSize = 20, status, source }) {
  let query = sc.from('email_processing_log').select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  // Resolve usernames for user_id
  const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))];
  const profileMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await sc.from('profiles').select('id, username, email').in('id', userIds);
    if (profiles) profiles.forEach(p => profileMap[p.id] = p);
  }

  const logs = (data || []).map(l => ({
    ...l,
    username: profileMap[l.user_id]?.username || null,
    userEmail: profileMap[l.user_id]?.email || null
  }));

  return { logs, total: count || 0, page, pageSize };
}

async function getPdfLogStats(sc, source) {
  let query = sc
    .from('email_processing_log')
    .select('status, parse_level, parse_meta, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (source) query = query.eq('source', source);
  const { data: logs } = await query;

  const stats = {
    total: (logs || []).length,
    byLevel: { 1: 0, 2: 0, 4: 0, legacy: 0 },
    byStatus: { success: 0, error: 0, extraction_failed: 0 },
    feedback: { up: 0, down: 0 },
    totalClaudeCalls: 0,
    totalSaved: 0, // Calls saved by L1/L2
    avgDurationByLevel: { 1: [], 2: [], 4: [] },
  };

  for (const log of (logs || [])) {
    // Status
    stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;

    // Parse level
    const level = log.parse_level;
    if (level === 1 || level === 2 || level === 4) {
      stats.byLevel[level]++;
      if (level === 1 || level === 2) stats.totalSaved++;
    } else {
      stats.byLevel.legacy++;
    }

    // Parse meta
    const meta = log.parse_meta;
    if (meta) {
      if (meta.claudeCalls) stats.totalClaudeCalls += meta.claudeCalls;
      if (meta.feedback === 'up') stats.feedback.up++;
      if (meta.feedback === 'down') stats.feedback.down++;
      if (meta.durationMs && level) {
        if (stats.avgDurationByLevel[level]) {
          stats.avgDurationByLevel[level].push(meta.durationMs);
        }
      }
    }
  }

  // Compute averages
  for (const level of [1, 2, 4]) {
    const arr = stats.avgDurationByLevel[level];
    stats.avgDurationByLevel[level] = arr.length > 0
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : 0;
  }

  // Claude savings percentage
  const smartParseTotal = stats.byLevel[1] + stats.byLevel[2] + stats.byLevel[4];
  stats.claudeSavingsPercent = smartParseTotal > 0
    ? Math.round((stats.totalSaved / smartParseTotal) * 100)
    : 0;

  return { stats };
}

async function clearPdfLogs(sc, adminUserId, source) {
  let countQuery = sc.from('email_processing_log').select('*', { count: 'exact', head: true });
  if (source) countQuery = countQuery.eq('source', source);
  const { count } = await countQuery;

  let deleteQuery = sc.from('email_processing_log').delete();
  if (source) deleteQuery = deleteQuery.eq('source', source);
  else deleteQuery = deleteQuery.gte('created_at', '1970-01-01'); // match all rows
  const { error } = await deleteQuery;

  if (error) throw error;

  // Audit log
  await sc.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action: source ? `clear_${source}_logs` : 'clear_pdf_logs',
    details: { deletedCount: count || 0, source: source || 'all' },
  });

  return { deleted: count || 0 };
}

// ============================================
// Pending Booking Detail (per log email)
// ============================================

async function getPendingBookingDetail(sc, { id }) {
  if (!id) throw new Error('id obbligatorio');
  const { data, error } = await sc
    .from('pending_bookings')
    .select('id, email_subject, email_from, booking_type, extracted_data, status, created_at, associated_trip_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return { booking: data || null };
}

// ============================================
// PDF Analyze (Admin simulation - no save)
// ============================================

async function analyzePdfAdmin({ pdfBase64, docType }) {
  if (!pdfBase64) throw new Error('pdfBase64 is required');
  if (!['flight', 'hotel', 'auto'].includes(docType)) throw new Error('docType must be "flight", "hotel", or "auto"');

  // For auto, try flight schema first then detect from result structure
  const resolvedType = docType === 'auto' ? 'flight' : docType;
  const filename = resolvedType === 'flight' ? 'volo-eticket.pdf' : 'hotel-booking.pdf';

  const startTime = Date.now();
  const result = await processSinglePdfWithClaude(pdfBase64, filename);
  const durationMs = Date.now() - startTime;

  // Detect doc type from result when auto was requested
  const detectedDocType = docType === 'auto'
    ? (result?.hotels?.length ? 'hotel' : result?.flights?.length ? 'flight' : null)
    : null;

  return { result, docType: detectedDocType || docType, detectedDocType, durationMs };
}

// ============================================
// SmartParse v2 — L1 Cache + L4 Claude Only
// ============================================

async function analyzePdfSmart({ pdfBase64, docType, mode }) {
  if (!pdfBase64) throw new Error('pdfBase64 is required');
  const validMode = mode === 'beta' ? 'beta' : 'live';
  const allowedDocTypes = validMode === 'beta'
    ? ['flight', 'hotel', 'train', 'bus', 'auto']
    : ['flight', 'hotel', 'auto'];
  if (!allowedDocTypes.includes(docType)) throw new Error(`docType must be one of: ${allowedDocTypes.join(', ')}`);

  const { parseDocumentSmart } = require('./utils/smartParser');
  const parseResult = await parseDocumentSmart(pdfBase64, docType, validMode);

  return {
    result:          parseResult.result,
    docType:         parseResult.detectedDocType || docType,
    detectedDocType: parseResult.detectedDocType ?? null,
    durationMs:      parseResult.durationMs,
    parseLevel:      parseResult.parseLevel,
    claudeCalls:     parseResult.claudeCalls ?? 0,
    cacheId:         parseResult.cacheId ?? null,
    cacheSaved:      parseResult.cacheSaved ?? null,
    dbLoadError:     parseResult.dbLoadError ?? null,
    textLength:      parseResult.textLength ?? 0,
    timedOut:        parseResult.timedOut ?? false,
    error:           parseResult.error ?? null,
    mode:            validMode,
    isBeta:          validMode === 'beta'
  };
}

async function testEmailSmartParse({ content, contentType = 'text', subject = '' }) {
  if (!content) throw new Error('content is required');

  const { parseEmailContent, parseDocumentSmart } = require('./utils/smartParser');

  let parseResult;
  if (contentType === 'pdf') {
    // PDF base64: sempre in beta (nessuna versione live aggiornata)
    parseResult = await parseDocumentSmart(content, 'auto', 'beta');
  } else {
    // HTML o testo: usa il nuovo parseEmailContent
    parseResult = await parseEmailContent(content, contentType, subject);
  }

  return {
    result:          parseResult.result,
    detectedDocType: parseResult.detectedDocType ?? null,
    durationMs:      parseResult.durationMs,
    parseLevel:      parseResult.parseLevel,
    claudeCalls:     parseResult.claudeCalls ?? 0,
    cacheId:         parseResult.cacheId ?? null,
    cacheSaved:      parseResult.cacheSaved ?? null,
    dbLoadError:     parseResult.dbLoadError ?? null,
    textLength:      parseResult.textLength ?? 0,
    timedOut:        parseResult.timedOut ?? false,
    error:           parseResult.error ?? null,
    isBeta:          true,
  };
}

/**
 * Test EML: legge un file .eml, estrae subject/HTML/PDF e chiama SmartParse.
 * Priorità: PDF allegato > HTML body > testo.
 */
async function testEmlSmartParse({ emlText }) {
  if (!emlText) throw new Error('emlText is required');

  const { parseEml }                         = require('./utils/mimeParser');
  const { parseEmailContent, parseDocumentSmart } = require('./utils/smartParser');

  const parsed = parseEml(emlText);

  // Scegli il contenuto migliore: PDF > HTML > testo
  let parseResult;
  let sourceUsed;

  if (parsed.pdfs.length > 0) {
    // Usa il primo PDF trovato nell'allegato — sempre beta
    const pdf = parsed.pdfs[0];
    sourceUsed = `PDF allegato: ${pdf.filename}`;
    parseResult = await parseDocumentSmart(pdf.content, 'auto', 'beta');
  } else if (parsed.html) {
    sourceUsed = `HTML body (${parsed.html.length} char)`;
    parseResult = await parseEmailContent(parsed.html, 'html', parsed.subject);
  } else if (parsed.text) {
    sourceUsed = `Testo plain (${parsed.text.length} char)`;
    parseResult = await parseEmailContent(parsed.text, 'text', parsed.subject);
  } else {
    throw new Error('Nessun contenuto estraibile dall\'EML');
  }

  return {
    result:          parseResult.result,
    detectedDocType: parseResult.detectedDocType ?? null,
    durationMs:      parseResult.durationMs,
    parseLevel:      parseResult.parseLevel,
    claudeCalls:     parseResult.claudeCalls ?? 0,
    cacheId:         parseResult.cacheId ?? null,
    cacheSaved:      parseResult.cacheSaved ?? null,
    dbLoadError:     parseResult.dbLoadError ?? null,
    textLength:      parseResult.textLength ?? 0,
    timedOut:        parseResult.timedOut ?? false,
    error:           parseResult.error ?? null,
    isBeta:          true,
    // Metadati EML
    emlMeta: {
      subject:    parsed.subject,
      from:       parsed.from,
      pdfsFound:  parsed.pdfs.map(p => p.filename),
      hasHtml:    !!parsed.html,
      hasText:    !!parsed.text,
      sourceUsed,
    },
  };
}

async function smartParseListTemplates() {
  const { listTemplates } = require('./utils/smartParser');
  const templates = await listTemplates();
  return { templates };
}

async function smartParseDeleteTemplate({ id }) {
  if (!id) throw new Error('id is required');
  const { deleteTemplate } = require('./utils/smartParser');
  await deleteTemplate(id);
  return { deleted: true };
}
