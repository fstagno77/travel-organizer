/**
 * Notifications Page - Unified inbox for notifications + pending bookings
 */

const notificationsPage = (() => {
  'use strict';

  async function init() {
    if (!window.auth?.isAuthenticated()) {
      window.auth?.showLoginModal();
      return;
    }

    await loadAll();

    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', markAllRead);
    }
  }

  async function loadAll() {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    try {
      // Fetch both sources in parallel
      const [notifRes, bookingsRes] = await Promise.all([
        utils.authFetch('/.netlify/functions/notifications').catch(() => null),
        utils.authFetch('/.netlify/functions/pending-bookings').catch(() => null)
      ]);

      const notifData = notifRes?.ok ? await notifRes.json() : null;
      const bookingsData = bookingsRes?.ok ? await bookingsRes.json() : null;

      const notifications = (notifData?.success && notifData.notifications?.length)
        ? notifData.notifications.map(n => ({ ...n, _kind: 'notification' }))
        : [];

      const bookings = (bookingsData?.success && bookingsData.bookings?.length)
        ? bookingsData.bookings.map(b => ({ ...b, _kind: 'booking' }))
        : [];

      // Abilita il pulsante solo se ci sono notifiche non lette
      const markAllBtn = document.getElementById('mark-all-read-btn');
      if (markAllBtn) {
        markAllBtn.disabled = !(notifData?.unreadCount > 0);
      }

      if (!notifications.length && !bookings.length) {
        container.innerHTML = renderEmpty();
        if (window.i18n) i18n.apply(container);
        return;
      }

      // Merge and sort by date descending
      const allItems = [
        ...notifications,
        ...bookings
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.email_received_at || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.email_received_at || b.created_at || 0);
        return dateB - dateA;
      });

      container.innerHTML = allItems.map(item =>
        item._kind === 'booking' ? renderBookingItem(item) : renderNotificationItem(item)
      ).join('');

      bindActions(container);
      if (window.i18n) i18n.apply(container);
    } catch (err) {
      console.error('Error loading notifications:', err);
      container.innerHTML = renderEmpty();
    }
  }

  // ─── Render: notification ─────────────────────────────────────────────────

  function renderNotificationItem(n) {
    const lang = window.i18n?.getLang() || 'it';
    const message = n.message?.[lang] || n.message?.it || n.message?.en || '';
    const timeAgo = formatTimeAgo(n.createdAt, lang);
    const unreadClass = n.read ? '' : 'notification-item--unread';
    const tripTitle = n.tripTitle ? utils.escapeHtml(n.tripTitle) : '';
    const actorName = n.actorName ? utils.escapeHtml(n.actorName) : '';
    const typeIcon = getTypeIcon(n.type);

    const actionsHTML = n.actionable ? `
      <div class="notification-actions">
        <button class="notification-action-btn notification-action-btn--accept" data-action="accept-invite" data-trip-id="${n.actionTripId}" data-notification-id="${n.id}">
          ${i18n.t('share.acceptInvite') || 'Accetta'}
        </button>
        <button class="notification-action-btn notification-action-btn--decline" data-action="decline-invite" data-trip-id="${n.actionTripId}" data-notification-id="${n.id}">
          ${i18n.t('share.declineInvite') || 'Rifiuta'}
        </button>
      </div>
    ` : n.inviteStatus === 'accepted' ? `
      <div class="notification-invite-status notification-invite-status--accepted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${lang === 'it' ? 'Accettato' : 'Accepted'}
      </div>
    ` : '';

    return `
      <div class="notification-item ${unreadClass}" data-notification-id="${n.id}" data-trip-id="${n.tripId || ''}" ${n.actionable ? 'data-actionable="true"' : ''}>
        <div class="notification-icon">${typeIcon}</div>
        <div class="notification-content">
          <div class="notification-message">
            ${actorName ? `<strong>${actorName}</strong> ` : ''}${utils.escapeHtml(message)}
          </div>
          ${tripTitle ? `<a class="notification-trip" href="/trip.html?id=${n.tripId || ''}">${tripTitle}</a>` : ''}
          ${actionsHTML}
          <div class="notification-time">${timeAgo}</div>
        </div>
        ${!n.read ? `<button class="notification-unread-dot" data-notification-id="${n.id}" title="Segna come letto"></button>` : ''}
      </div>
    `;
  }

  // ─── Render: pending booking ───────────────────────────────────────────────

  function renderBookingItem(b) {
    const lang = window.i18n?.getLang() || 'it';
    const timeAgo = formatTimeAgo(b.email_received_at || b.created_at, lang);
    const title = b.summary_title || b.email_subject || (lang === 'it' ? 'Prenotazione' : 'Booking');
    const dates = b.summary_dates || '';
    const typeIcon = getBookingIcon(b.booking_type);
    const labelIt = b.booking_type === 'flight' ? 'Volo' : b.booking_type === 'hotel' ? 'Hotel' : 'Prenotazione';
    const labelEn = b.booking_type === 'flight' ? 'Flight' : b.booking_type === 'hotel' ? 'Hotel' : 'Booking';
    const label = lang === 'it' ? labelIt : labelEn;

    return `
      <div class="notification-item notification-item--unread notification-item--booking" data-booking-id="${b.id}">
        <div class="notification-icon">${typeIcon}</div>
        <div class="notification-content">
          <div class="notification-message">
            <span class="notification-badge notification-badge--booking">${label}</span>
            <strong>${utils.escapeHtml(title)}</strong>
          </div>
          ${dates ? `<div class="notification-trip">${utils.escapeHtml(dates)}</div>` : ''}
          <div class="notification-actions">
            <a class="notification-action-btn notification-action-btn--secondary" href="/pending-bookings.html?id=${b.id}">
              ${lang === 'it' ? 'Dettagli' : 'Details'}
            </a>
            <a class="notification-action-btn notification-action-btn--accept" href="/pending-bookings.html?id=${b.id}&action=associate">
              ${lang === 'it' ? 'Aggiungi a viaggio' : 'Add to trip'}
            </a>
          </div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }

  // ─── Empty state ──────────────────────────────────────────────────────────

  function renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <h3 class="empty-state-title" data-i18n="notifications.empty">Nessuna notifica</h3>
        <p class="empty-state-text" data-i18n="notifications.emptyDesc">Le notifiche sui viaggi condivisi appariranno qui.</p>
      </div>
    `;
  }

  // ─── Icons ────────────────────────────────────────────────────────────────

  function getTypeIcon(type) {
    const icons = {
      'collaboration_invite':  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v2m0 2h.01"/></svg>`,
      'collaboration_added':   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      'collaboration_revoked': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
      'invitation_accepted':   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
      'invitation_declined':   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
      'booking_added':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
      'booking_edited':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      'booking_deleted':       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      'activity_added':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'activity_edited':       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'activity_deleted':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    };
    return icons[type] || icons['booking_edited'];
  }

  function getBookingIcon(type) {
    if (type === 'flight') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`;
    }
    if (type === 'hotel') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  }

  // ─── Time ─────────────────────────────────────────────────────────────────

  function formatTimeAgo(dateStr, lang) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (lang === 'it') {
      if (diffMin < 1) return 'Adesso';
      if (diffMin < 60) return `${diffMin} min fa`;
      if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'ora' : 'ore'} fa`;
      if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'giorno' : 'giorni'} fa`;
      return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    }
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function bindActions(container) {
    container.addEventListener('click', async (e) => {
      // Accept/decline invite
      const actionBtn = e.target.closest('.notification-action-btn[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        const tripId = actionBtn.dataset.tripId;
        const notificationId = actionBtn.dataset.notificationId;

        actionBtn.disabled = true;
        const siblingBtns = actionBtn.closest('.notification-actions')?.querySelectorAll('[data-action]');
        siblingBtns?.forEach(b => b.disabled = true);

        try {
          const accept = action === 'accept-invite';
          const response = await utils.authFetch('/.netlify/functions/manage-collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'respond-invite', tripId, accept })
          });
          const result = await response.json();

          if (result.success) {
            const lang = window.i18n?.getLang() || 'it';
            const accept = action === 'accept-invite';
            const feedbackText = accept
              ? (lang === 'it' ? 'Hai accettato l\'invito' : 'You accepted the invite')
              : (lang === 'it' ? 'Hai rifiutato l\'invito' : 'You declined the invite');
            const feedbackColor = accept ? 'var(--color-success)' : 'var(--color-text-secondary)';
            const feedbackIcon = accept
              ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

            // Replace action buttons with inline feedback
            const actionsDiv = actionBtn.closest('.notification-actions');
            if (actionsDiv) {
              actionsDiv.outerHTML = `
                <div class="notification-feedback" style="color:${feedbackColor}">
                  ${feedbackIcon}
                  <span>${feedbackText}</span>
                  ${accept && result.tripId ? `<a href="/trip.html?id=${result.tripId}" class="notification-feedback-link">${lang === 'it' ? 'Vai al viaggio →' : 'Go to trip →'}</a>` : ''}
                </div>`;
            }

            markRead(notificationId);

            const item = actionBtn.closest('.notification-item') || container.querySelector(`[data-notification-id="${notificationId}"]`);
            item?.classList.remove('notification-item--unread');
            item?.removeAttribute('data-actionable');

            if (window.navigation) navigation.refreshPendingCount();
          } else {
            utils.showToast(result.error || 'Errore', 'error');
            siblingBtns?.forEach(b => b.disabled = false);
          }
        } catch (err) {
          console.error('Error responding to invite:', err);
          utils.showToast(i18n.t('common.error') || 'Errore', 'error');
          siblingBtns?.forEach(b => b.disabled = false);
        }
        return;
      }

      // Mark single read (blue dot click)
      const markBtn = e.target.closest('.notification-unread-dot');
      if (markBtn) {
        e.stopPropagation();
        await markRead(markBtn.dataset.notificationId);
        markBtn.closest('.notification-item')?.classList.remove('notification-item--unread');
        markBtn.remove();
        return;
      }

      // Click notification row → go to trip (not for bookings, not for actionable)
      const item = e.target.closest('.notification-item');
      if (item && !item.dataset.bookingId && item.dataset.tripId && !item.dataset.actionable) {
        const notificationId = item.dataset.notificationId;
        if (item.classList.contains('notification-item--unread')) {
          markRead(notificationId);
        }
        window.location.href = `/trip.html?id=${item.dataset.tripId}`;
      }
    });
  }

  async function markRead(notificationId) {
    try {
      await utils.authFetch('/.netlify/functions/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', notificationId })
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async function markAllRead() {
    try {
      await utils.authFetch('/.netlify/functions/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' })
      });

      document.querySelectorAll('.notification-item--unread:not(.notification-item--booking)').forEach(el => {
        el.classList.remove('notification-item--unread');
        el.querySelector('.notification-unread-dot')?.remove();
      });
      const markBtn = document.getElementById('mark-all-read-btn');
      if (markBtn) markBtn.disabled = true;

      if (window.navigation) navigation.refreshPendingCount();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  return { init };
})();

window.notificationsPage = notificationsPage;
