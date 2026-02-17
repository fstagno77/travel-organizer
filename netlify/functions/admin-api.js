/**
 * Netlify Function: Admin API
 * Single endpoint with action-based routing for admin dashboard
 * Only accessible by admin user (fstagno@idibgroup.com)
 */

const { authenticateRequest, getServiceClient, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

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
  try {
    await serviceClient
      .from('admin_audit_log')
      .insert({
        admin_user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || null
      });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
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

async function deleteUser(sc, { userId }, adminId) {
  if (!userId) throw new Error('userId is required');

  // Get user info for audit log
  const { data: profile } = await sc.from('profiles').select('username, email').eq('id', userId).single();

  // Delete via auth admin API (cascades to profiles, trips, travelers, pending_bookings)
  const { error } = await sc.auth.admin.deleteUser(userId);
  if (error) throw error;

  await logAdminAction(sc, adminId, 'delete_user', 'user', userId, { username: profile?.username, email: profile?.email });

  return { deleted: true };
}

// ============================================
// Trips
// ============================================

async function listTrips(sc, { search, userId: filterUserId, status, page = 1, pageSize = 20 }) {
  let query = sc.from('trips').select('id, data, created_at, updated_at, user_id', { count: 'exact' });

  if (filterUserId) {
    query = query.eq('user_id', filterUserId);
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
      created_at: t.created_at
    };
  });

  // Filter by status (past/current/future) in memory
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
