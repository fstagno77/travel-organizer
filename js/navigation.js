/**
 * Navigation - Header, Footer, and Navigation components
 */

const navigation = {
  pendingCount: 0,
  notificationCount: 0,
  pollInterval: null,

  /**
   * Initialize navigation components
   */
  async init() {
    await this.loadHeader();
    await this.loadFooter();
    this.setActiveNavLink();
    this.startPendingBookingsPolling();
    this.initAutoHideHeader();
  },

  /**
   * Detect if current page is the home page
   */
  isHomePage() {
    const path = window.location.pathname;
    return path.endsWith('/') || path.endsWith('index.html');
  },

  /**
   * Load header component
   */
  async loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;

    const isAuthenticated = window.auth?.isAuthenticated();
    const profile = window.auth?.profile;

    // All pages with header-placeholder use the same gradient header
    this.loadHomeHeader(headerPlaceholder, isAuthenticated, profile);
  },

  /**
   * Load home page header variant (gradient + glass icons)
   */
  loadHomeHeader(placeholder, isAuthenticated, profile) {
    const bellSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`;

    const plusSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>`;

    // Left side: Logo + CTA button
    const ctaBtn = isAuthenticated ? `
      <button class="header-cta-btn" id="new-trip-btn">
        ${plusSvg}
        <span class="header-cta-label-full" data-i18n="trip.new">Nuovo Viaggio</span>
        <span class="header-cta-label-short" data-i18n="trip.newShort">Viaggio</span>
      </button>
    ` : '';

    // Right side: Glass notification bell + profile avatar
    const adminSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`;

    const isAdmin = window.auth?.session?.user?.email === 'fstagno@idibgroup.com';

    let rightActions = '';
    if (isAuthenticated) {
      const initial = profile?.username?.charAt(0).toUpperCase() || '?';
      rightActions = `
        ${isAdmin ? `<a href="/admin.html" class="header-glass-btn" title="Admin">${adminSvg}</a>` : ''}
        <div class="notif-bell-wrap">
          <button class="header-glass-btn" id="notification-bell" title="Notifications" aria-haspopup="true" aria-expanded="false">
            ${bellSvg}
            <span class="header-glass-badge" id="notification-badge" style="display: none;">0</span>
          </button>
        </div>
        <a href="/profile.html" class="header-glass-btn" title="@${profile?.username || ''}">
          <span class="header-glass-avatar">${initial}</span>
        </a>
      `;
    } else {
      rightActions = `
        <button class="header-glass-btn" id="login-btn" title="Login" style="width: auto; padding: 0 16px; gap: 6px;">
          <span style="font-size: 14px; font-weight: 500;" data-i18n="auth.login">Login</span>
        </button>
      `;
    }

    placeholder.innerHTML = `
      <header class="header header--home">
        <div class="container">
          <div class="header-inner header-inner--three">
            <div class="header-actions">
              ${ctaBtn}
            </div>
            <a href="/index.html" class="header-logo header-logo--img">
              <img src="/assets/icons/travel-flow-logo.png" alt="Travel Flow" class="header-logo-img" width="161" height="40">
            </a>
            <div class="header-actions">
              ${rightActions}
            </div>
          </div>
        </div>
      </header>
    `;

    // Bind login button if not authenticated
    if (!isAuthenticated) {
      const loginBtn = document.getElementById('login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          window.auth?.showLoginModal();
        });
      }
    }

    if (isAuthenticated) {
      this.initNotificationDropdown();
    }
  },

  // ─── Notification Dropdown ─────────────────────────────────────────────────

  _dropdownOpen: false,
  _dropdownData: null,
  _dropdownTab: 'all', // 'all' | 'unread'

  initNotificationDropdown() {
    const bell = document.getElementById('notification-bell');
    if (!bell) return;

    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      this._dropdownOpen ? this.closeNotifDropdown() : this.openNotifDropdown();
    });

    document.addEventListener('click', (e) => {
      if (this._dropdownOpen && !e.target.closest('.notif-dropdown') && !e.target.closest('#notification-bell')) {
        this.closeNotifDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._dropdownOpen) this.closeNotifDropdown();
    });
  },

  openNotifDropdown() {
    this.closeNotifDropdown(); // remove existing if any
    this._dropdownOpen = true;
    this._dropdownTab = 'all';

    const bell = document.getElementById('notification-bell');
    if (bell) {
      bell.setAttribute('aria-expanded', 'true');
      bell.classList.add('header-glass-btn--active');
      bell.blur();
    }

    const panel = document.createElement('div');
    panel.className = 'notif-dropdown';
    panel.innerHTML = this._renderDropdownShell();

    const wrap = document.querySelector('.notif-bell-wrap');
    if (wrap) wrap.appendChild(panel);

    // Bind tabs
    panel.querySelector('#notif-tab-all')?.addEventListener('click', () => {
      this._dropdownTab = 'all';
      this._renderDropdownList(panel);
    });
    panel.querySelector('#notif-tab-unread')?.addEventListener('click', () => {
      this._dropdownTab = 'unread';
      this._renderDropdownList(panel);
    });

    this._loadDropdownData(panel);
  },

  closeNotifDropdown() {
    document.querySelector('.notif-dropdown')?.remove();
    this._dropdownOpen = false;
    const bell = document.getElementById('notification-bell');
    if (bell) {
      bell.setAttribute('aria-expanded', 'false');
      bell.classList.remove('header-glass-btn--active');
    }
  },

  _renderDropdownShell() {
    const lang = window.i18n?.getLang() || 'it';
    const t = {
      title:   lang === 'it' ? 'Notifiche' : 'Notifications',
      all:     lang === 'it' ? 'Tutte' : 'All',
      unread:  lang === 'it' ? 'Non lette' : 'Unread',
      showAll: lang === 'it' ? 'Mostra tutte' : 'Show all',
    };
    return `
      <div class="notif-dropdown-header">
        <span class="notif-dropdown-title">${t.title}</span>
        <div class="notif-dropdown-tabs">
          <button id="notif-tab-all" class="notif-tab notif-tab--active">${t.all}</button>
          <button id="notif-tab-unread" class="notif-tab">${t.unread}</button>
        </div>
      </div>
      <div class="notif-dropdown-list" id="notif-dropdown-list">
        <div class="notif-dropdown-loading"><span class="spinner spinner--sm"></span></div>
      </div>
      <div class="notif-dropdown-footer">
        <a href="/notifications.html" class="notif-dropdown-showall">${t.showAll} →</a>
      </div>
    `;
  },

  async _loadDropdownData(panel) {
    try {
      const [notifRes, bookingsRes] = await Promise.all([
        window.utils?.authFetch('/.netlify/functions/notifications').catch(() => null),
        window.utils?.authFetch('/.netlify/functions/pending-bookings').catch(() => null)
      ]);

      const notifData = notifRes?.ok ? await notifRes.json() : null;
      const bookingsData = bookingsRes?.ok ? await bookingsRes.json() : null;

      const notifications = (notifData?.success && notifData.notifications?.length)
        ? notifData.notifications.map(n => ({ ...n, _kind: 'notification' }))
        : [];

      const bookings = (bookingsData?.success && bookingsData.bookings?.length)
        ? bookingsData.bookings.map(b => ({ ...b, _kind: 'booking' }))
        : [];

      this._dropdownData = [...notifications, ...bookings].sort((a, b) => {
        const dA = new Date(a.createdAt || a.email_received_at || a.created_at || 0);
        const dB = new Date(b.createdAt || b.email_received_at || b.created_at || 0);
        return dB - dA;
      });

      this._renderDropdownList(panel);
    } catch (err) {
      const list = panel.querySelector('#notif-dropdown-list');
      if (list) list.innerHTML = '<div class="notif-dropdown-empty">–</div>';
    }
  },

  _renderDropdownList(panel) {
    const list = panel.querySelector('#notif-dropdown-list');
    if (!list || !this._dropdownData) return;

    const lang = window.i18n?.getLang() || 'it';

    // Update tab styles
    panel.querySelector('#notif-tab-all')?.classList.toggle('notif-tab--active', this._dropdownTab === 'all');
    panel.querySelector('#notif-tab-unread')?.classList.toggle('notif-tab--active', this._dropdownTab === 'unread');

    let items = this._dropdownData;
    if (this._dropdownTab === 'unread') {
      items = items.filter(i => i._kind === 'booking' || !i.read);
    }

    if (!items.length) {
      const msg = lang === 'it' ? 'Nessuna notifica' : 'No notifications';
      list.innerHTML = `<div class="notif-dropdown-empty">${msg}</div>`;
      return;
    }

    list.innerHTML = items.slice(0, 12).map(item =>
      item._kind === 'booking'
        ? this._renderDropdownBooking(item, lang)
        : this._renderDropdownNotif(item, lang)
    ).join('');

    // Bind accept/decline in dropdown
    list.querySelectorAll('[data-notif-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._handleDropdownInvite(btn, panel, lang);
      });
    });

    // Click item → go to trip
    list.querySelectorAll('.notif-item[data-trip-id]').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.bookingId || item.dataset.actionable) return;
        if (item.dataset.notifId) {
          window.utils?.authFetch('/.netlify/functions/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark-read', notificationId: item.dataset.notifId })
          }).catch(() => {});
        }
        this.closeNotifDropdown();
        window.location.href = `/trip.html?id=${item.dataset.tripId}`;
      });
    });
  },

  _renderDropdownNotif(n, lang) {
    const msg = n.message?.[lang] || n.message?.it || n.message?.en || '';
    const actor = n.actorName ? `<strong>${this._esc(n.actorName)}</strong> ` : '';
    const time = this._timeAgo(n.createdAt, lang);
    const unread = n.read ? '' : 'notif-item--unread';
    const icon = this._notifIcon(n.type);
    const tripTitle = n.tripTitle ? `<div class="notif-item-sub">${this._esc(n.tripTitle)}</div>` : '';

    const actions = n.actionable ? `
      <div class="notif-item-actions">
        <button class="notif-action-btn notif-action-btn--accept" data-notif-action="accept" data-trip-id="${n.actionTripId}" data-notif-id="${n.id}">
          ${lang === 'it' ? 'Accetta' : 'Accept'}
        </button>
        <button class="notif-action-btn notif-action-btn--decline" data-notif-action="decline" data-trip-id="${n.actionTripId}" data-notif-id="${n.id}">
          ${lang === 'it' ? 'Rifiuta' : 'Decline'}
        </button>
      </div>`
      : n.inviteStatus === 'accepted' ? `
      <div class="notif-item-feedback" style="color:var(--color-success)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${lang === 'it' ? 'Accettato' : 'Accepted'}</span>
      </div>` : '';

    return `
      <div class="notif-item ${unread}" data-notif-id="${n.id}" data-trip-id="${n.tripId || ''}" ${n.actionable ? 'data-actionable="true"' : ''}>
        <div class="notif-item-icon">${icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-msg">${actor}${this._esc(msg)}</div>
          ${tripTitle}
          ${actions}
          <div class="notif-item-time">${time}</div>
        </div>
      </div>`;
  },

  _renderDropdownBooking(b, lang) {
    const time = this._timeAgo(b.email_received_at || b.created_at, lang);
    const title = b.summary_title || b.email_subject || (lang === 'it' ? 'Prenotazione' : 'Booking');
    const dates = b.summary_dates ? `<div class="notif-item-sub">${this._esc(b.summary_dates)}</div>` : '';
    const typeLabel = b.booking_type === 'flight' ? (lang === 'it' ? 'Volo' : 'Flight')
                    : b.booking_type === 'hotel'  ? 'Hotel'
                    : (lang === 'it' ? 'Prenotazione' : 'Booking');
    const icon = this._bookingIcon(b.booking_type);

    return `
      <div class="notif-item notif-item--unread notif-item--booking" data-booking-id="${b.id}">
        <div class="notif-item-icon">${icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-msg">
            <span class="notif-type-badge">${typeLabel}</span>
            <strong>${this._esc(title)}</strong>
          </div>
          ${dates}
          <div class="notif-item-actions">
            <a class="notif-action-btn notif-action-btn--secondary" href="/pending-bookings.html?id=${b.id}">
              ${lang === 'it' ? 'Dettagli' : 'Details'}
            </a>
            <a class="notif-action-btn notif-action-btn--accept" href="/pending-bookings.html?id=${b.id}&action=associate">
              ${lang === 'it' ? 'Aggiungi' : 'Add to trip'}
            </a>
          </div>
          <div class="notif-item-time">${time}</div>
        </div>
      </div>`;
  },

  async _handleDropdownInvite(btn, panel, lang) {
    const action = btn.dataset.notifAction;
    const tripId = btn.dataset.tripId;
    const notifId = btn.dataset.notifId;

    btn.disabled = true;
    btn.closest('.notif-item-actions')?.querySelectorAll('button').forEach(b => b.disabled = true);

    try {
      const accept = action === 'accept';
      const res = await window.utils?.authFetch('/.netlify/functions/manage-collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond-invite', tripId, accept })
      });
      const result = await res.json();

      if (result.success) {
        const feedbackText = accept
          ? (lang === 'it' ? 'Invito accettato' : 'Invite accepted')
          : (lang === 'it' ? 'Invito rifiutato' : 'Invite declined');
        const feedbackColor = accept ? 'var(--color-success)' : 'var(--color-text-secondary)';
        const feedbackIcon = accept
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        const actionsEl = btn.closest('.notif-item-actions');
        if (actionsEl) {
          actionsEl.outerHTML = `
            <div class="notif-item-feedback" style="color:${feedbackColor}">
              ${feedbackIcon} <span>${feedbackText}</span>
              ${accept && result.tripId ? `<a href="/trip.html?id=${result.tripId}" class="notif-feedback-link">${lang === 'it' ? 'Vai →' : 'Go →'}</a>` : ''}
            </div>`;
        }

        // Update local data + re-render
        if (this._dropdownData) {
          const item = this._dropdownData.find(i => i.id === notifId);
          if (item) { item.read = true; item.actionable = false; }
        }

        const notifItem = panel.querySelector(`[data-notif-id="${notifId}"]`);
        notifItem?.classList.remove('notif-item--unread');
        notifItem?.removeAttribute('data-actionable');

        this.refreshPendingCount();

        // Mark read server-side
        window.utils?.authFetch('/.netlify/functions/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-read', notificationId: notifId })
        }).catch(() => {});
      } else {
        btn.disabled = false;
        btn.closest('.notif-item-actions')?.querySelectorAll('button').forEach(b => b.disabled = false);
      }
    } catch (err) {
      console.error('Error handling invite:', err);
      btn.disabled = false;
    }
  },

  _notifIcon(type) {
    const icons = {
      'collaboration_invite':  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v2m0 2h.01"/></svg>`,
      'collaboration_added':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      'collaboration_revoked': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
      'invitation_accepted':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
      'invitation_declined':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
      'booking_added':         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
      'booking_edited':        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      'booking_deleted':       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      'activity_added':        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'activity_edited':       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'activity_deleted':      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    };
    return icons[type] || icons['booking_edited'];
  },

  _bookingIcon(type) {
    if (type === 'flight') {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`;
    }
    if (type === 'hotel') {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  },

  _timeAgo(dateStr, lang) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr  = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (lang === 'it') {
      if (min < 1)  return 'Adesso';
      if (min < 60) return `${min} min fa`;
      if (hr < 24)  return `${hr} ${hr === 1 ? 'ora' : 'ore'} fa`;
      if (day < 30) return `${day} ${day === 1 ? 'giorno' : 'giorni'} fa`;
      return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    }
    if (min < 1)  return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24)  return `${hr}h ago`;
    if (day < 30) return `${day}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  },

  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /**
   * Load footer component
   */
  async loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;

    const version = await changelog.getVersion();
    const currentYear = new Date().getFullYear();

    const footerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-inner">
            <div class="footer-copyright">
              © ${currentYear} Travel Flow
            </div>
            <div class="footer-right">
              <button class="footer-changelog-btn" id="footer-changelog-btn">
                <span class="footer-version">v${version}</span>
                <span class="footer-separator">|</span>
                <span data-i18n="footer.changelog">Changelog</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    `;

    footerPlaceholder.innerHTML = footerHTML;

    document.getElementById('footer-changelog-btn')?.addEventListener('click', () => {
      changelog.showModal();
    });
  },

  /**
   * Set active navigation link based on current page
   */
  setActiveNavLink() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('[data-nav]');

    navLinks.forEach(link => {
      const nav = link.dataset.nav;
      let isActive = false;

      if (nav === 'home' && (path.endsWith('/') || path.endsWith('index.html'))) {
        isActive = true;
      }

      link.classList.toggle('active', isActive);
    });
  },

  /**
   * Start polling for pending bookings count
   */
  startPendingBookingsPolling() {
    if (!window.auth?.isAuthenticated()) return;

    // Initial fetch
    this.updatePendingBookingsCount();

    // Poll every 60 seconds
    this.pollInterval = setInterval(() => {
      this.updatePendingBookingsCount();
    }, 60000);
  },

  /**
   * Stop polling
   */
  stopPendingBookingsPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  /**
   * Fetch and update pending bookings + notifications count
   */
  async updatePendingBookingsCount() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    try {
      // Fetch both counts in parallel
      const [pendingRes, notifRes] = await Promise.all([
        window.utils?.authFetch('/.netlify/functions/pending-bookings').catch(() => null),
        window.utils?.authFetch('/.netlify/functions/notifications?count=true').catch(() => null)
      ]);

      this.pendingCount = 0;
      this.notificationCount = 0;

      if (pendingRes?.ok) {
        const pendingData = await pendingRes.json();
        this.pendingCount = pendingData.count || 0;
      }

      if (notifRes?.ok) {
        const notifData = await notifRes.json();
        this.notificationCount = notifData.unreadCount || 0;
      }

      const totalCount = this.pendingCount + this.notificationCount;

      if (totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : totalCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
      badge.style.display = 'none';
    }
  },

  /**
   * Manually refresh the pending count (called after actions)
   */
  async refreshPendingCount() {
    await this.updatePendingBookingsCount();
  },

  /**
   * Auto-hide header: hides on scroll down, shows on scroll up
   */
  initAutoHideHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;
    const threshold = 5;

    function update() {
      const scrollY = window.scrollY;
      const diff = scrollY - lastScrollY;

      if (scrollY <= 0) {
        header.classList.remove('header--hidden');
        header.classList.remove('header--scrolled');
      } else {
        header.classList.add('header--scrolled');
        if (diff >= threshold) {
          header.classList.add('header--hidden');
        } else if (diff <= -threshold) {
          header.classList.remove('header--hidden');
        }
      }

      if (Math.abs(diff) >= threshold) {
        lastScrollY = scrollY;
      }
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }
};

// Make available globally
window.navigation = navigation;
