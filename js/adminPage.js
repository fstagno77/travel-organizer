/**
 * Admin Page - Main module for admin dashboard
 * Auth check, router, API helper, all view renderers
 */

const ADMIN_EMAIL = 'fstagno@idibgroup.com';

const adminPage = {
  currentView: 'dashboard',
  charts: {},

  async init() {
    await window.auth.init();

    // Auth check
    if (!window.auth.session) {
      window.location.href = '/login.html';
      return;
    }

    if (window.auth.session.user.email !== ADMIN_EMAIL) {
      window.location.href = '/index.html';
      return;
    }

    // Setup sidebar navigation
    this.setupNav();
    this.setupMobileMenu();
    this.setupLogout();

    // Route to initial view
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash);

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const view = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(view);
    });
  },

  setupNav() {
    document.querySelectorAll('.admin-nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        window.location.hash = view;
      });
    });
  },

  setupMobileMenu() {
    const hamburger = document.getElementById('admin-hamburger');
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-sidebar-overlay');

    const toggle = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    };

    hamburger?.addEventListener('click', toggle);
    overlay?.addEventListener('click', toggle);

    // Close on nav click (mobile)
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    });
  },

  setupLogout() {
    document.getElementById('admin-logout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.auth.signOut();
    });
  },

  navigate(view) {
    this.currentView = view;

    // Update active nav item
    document.querySelectorAll('.admin-nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Destroy old charts
    Object.values(this.charts).forEach(c => c.destroy());
    this.charts = {};

    // Render view
    const main = document.querySelector('.admin-content');
    main.innerHTML = '<div class="admin-loading"><span class="spinner"></span></div>';

    const renderers = {
      dashboard: () => this.renderDashboard(),
      users: () => this.renderUsers(),
      trips: () => this.renderTrips(),
      pending: () => this.renderPending(),
      'email-logs': () => this.renderEmailLogs(),
      analytics: () => this.renderAnalytics(),
      sharing: () => this.renderSharing(),
      audit: () => this.renderAudit(),
      system: () => this.renderSystem(),
    };

    const renderer = renderers[view];
    if (renderer) {
      renderer().catch(err => {
        console.error('View render error:', err);
        main.innerHTML = `<div class="admin-card"><p style="color:var(--color-error)">Errore: ${this.esc(err.message)}</p></div>`;
      });
    } else {
      main.innerHTML = '<div class="admin-card"><p>Vista non trovata</p></div>';
    }
  },

  // ============================================
  // API Helper
  // ============================================

  async api(action, params = {}) {
    const res = await window.utils.authFetch('/.netlify/functions/admin-api', {
      method: 'POST',
      body: JSON.stringify({ action, ...params })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  // ============================================
  // Dashboard
  // ============================================

  async renderDashboard() {
    const data = await this.api('get-dashboard-stats');
    const s = data.stats;
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Dashboard</h1>
        <p>Panoramica della piattaforma</p>
      </div>

      <div class="admin-stats-grid">
        ${this.statCard('Utenti', s.totalUsers, 'primary')}
        ${this.statCard('Viaggi', s.totalTrips, 'primary')}
        ${this.statCard('Voli', s.totalFlights)}
        ${this.statCard('Hotel', s.totalHotels)}
        ${this.statCard('Attivit\u00e0', s.totalActivities)}
        ${this.statCard('Pendenti', s.totalPending, s.totalPending > 0 ? 'warning' : '')}
      </div>

      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Nuovi viaggi (8 settimane)</h3>
          </div>
          <div class="admin-chart-container">
            <canvas id="chart-weekly-trips"></canvas>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Ultimi viaggi creati</h3>
          </div>
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr><th>Titolo</th><th>Utente</th><th>Destinazione</th><th>Data</th></tr>
              </thead>
              <tbody>
                ${data.recentTrips.length ? data.recentTrips.map(t => `
                  <tr>
                    <td><strong>${this.esc(t.title)}</strong></td>
                    <td>${this.esc(t.username)}</td>
                    <td>${this.esc(t.destination)}</td>
                    <td>${this.fmtDate(t.created_at)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="admin-table-empty">Nessun viaggio</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Chart
    const ctx = document.getElementById('chart-weekly-trips');
    if (ctx && data.tripsPerWeek) {
      this.charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.tripsPerWeek.map(w => this.fmtWeek(w.week)),
          datasets: [{
            label: 'Viaggi',
            data: data.tripsPerWeek.map(w => w.count),
            backgroundColor: 'rgba(33, 99, 246, 0.7)',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  },

  // ============================================
  // Users
  // ============================================

  async renderUsers(page = 1, search = '') {
    const data = await this.api('list-users', { page, pageSize: 20, search: search || undefined });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Gestione Utenti</h1>
        <p>${data.total} utenti registrati</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <input type="text" class="admin-search" id="users-search" placeholder="Cerca per username o email..." value="${this.esc(search)}">
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Username</th><th>Email</th><th>Viaggi</th><th>Registrato</th><th></th></tr>
            </thead>
            <tbody id="users-tbody">
              ${data.users.length ? data.users.map(u => `
                <tr>
                  <td><strong>${this.esc(u.username)}</strong></td>
                  <td>${this.esc(u.email)}</td>
                  <td>${u.tripCount}</td>
                  <td>${this.fmtDate(u.created_at)}</td>
                  <td class="admin-actions">
                    <button class="admin-btn admin-btn-secondary admin-btn-sm" data-detail="${u.id}">Dettagli</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-user="${u.id}" data-username="${this.esc(u.username)}">Elimina</button>
                  </td>
                </tr>
                <tr id="detail-${u.id}" style="display:none"><td colspan="5"></td></tr>
              `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessun utente trovato</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 20)}
      </div>
    `;

    // Search
    let searchTimer;
    document.getElementById('users-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.renderUsers(1, e.target.value), 400);
    });

    // Detail buttons
    document.querySelectorAll('[data-detail]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleUserDetail(btn.dataset.detail));
    });

    // Delete buttons
    document.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeleteUser(btn.dataset.deleteUser, btn.dataset.username));
    });

    // Pagination
    this.bindPagination(() => (p) => this.renderUsers(p, document.getElementById('users-search')?.value || ''));
  },

  async toggleUserDetail(userId) {
    const row = document.getElementById(`detail-${userId}`);
    if (!row) return;

    if (row.style.display !== 'none') {
      row.style.display = 'none';
      return;
    }

    row.querySelector('td').innerHTML = '<span class="spinner" style="margin:8px auto;display:block;width:20px;height:20px"></span>';
    row.style.display = '';

    const data = await this.api('get-user', { userId });
    const u = data.user;

    row.querySelector('td').innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail-grid">
          <div><div class="admin-detail-label">Username</div><div class="admin-detail-value">${this.esc(u.username)}</div></div>
          <div><div class="admin-detail-label">Email</div><div class="admin-detail-value">${this.esc(u.email)}</div></div>
          <div><div class="admin-detail-label">Viaggiatori</div><div class="admin-detail-value">${data.travelerCount}</div></div>
          <div><div class="admin-detail-label">Registrato</div><div class="admin-detail-value">${this.fmtDate(u.created_at)}</div></div>
        </div>
        ${data.trips.length ? `
          <h4 style="margin:12px 0 8px;font-size:13px;color:var(--color-gray-600)">Viaggi (${data.trips.length})</h4>
          <div class="admin-trip-cards">
            ${data.trips.map(t => `
              <div class="admin-trip-card">
                <div class="admin-trip-card-title">${this.esc(t.title)}</div>
                <div class="admin-trip-card-detail">
                  ${t.destination !== '-' ? t.destination + '<br>' : ''}
                  ${t.startDate ? t.startDate : ''} ${t.endDate ? '- ' + t.endDate : ''}<br>
                  ${t.flightCount} voli, ${t.hotelCount} hotel, ${t.activityCount} attivit\u00e0
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p style="margin-top:12px;color:var(--color-gray-400);font-size:13px">Nessun viaggio</p>'}
      </div>
    `;
  },

  async confirmDeleteUser(userId, username) {
    const confirmed = await this.confirm(
      `Eliminare l'utente <strong>${this.esc(username)}</strong>?<br><br>Verranno eliminati tutti i dati: viaggi, viaggiatori, prenotazioni pendenti e file.`,
      'Elimina utente'
    );
    if (!confirmed) return;

    try {
      await this.api('delete-user', { userId });
      this.toast('Utente eliminato', 'success');
      this.renderUsers();
    } catch (err) {
      this.toast('Errore: ' + err.message, 'error');
    }
  },

  // ============================================
  // Trips
  // ============================================

  async renderTrips(page = 1, search = '', statusFilter = '') {
    const data = await this.api('list-trips', { page, pageSize: 20, search: search || undefined, status: statusFilter || undefined });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Gestione Viaggi</h1>
        <p>${data.total} viaggi totali</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <input type="text" class="admin-search" id="trips-search" placeholder="Cerca per titolo, destinazione o utente..." value="${this.esc(search)}">
          <select class="admin-filter" id="trips-status-filter">
            <option value="">Tutti</option>
            <option value="future" ${statusFilter === 'future' ? 'selected' : ''}>Futuri</option>
            <option value="current" ${statusFilter === 'current' ? 'selected' : ''}>In corso</option>
            <option value="past" ${statusFilter === 'past' ? 'selected' : ''}>Passati</option>
          </select>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Titolo</th><th>Utente</th><th>Destinazione</th><th>Date</th><th>V/H/A</th><th></th></tr>
            </thead>
            <tbody>
              ${data.trips.length ? data.trips.map(t => `
                <tr>
                  <td><strong>${this.esc(t.title)}</strong></td>
                  <td>${this.esc(t.username)}</td>
                  <td>${this.esc(t.destination)}</td>
                  <td style="white-space:nowrap">${t.startDate || '-'} ${t.endDate ? '/ ' + t.endDate : ''}</td>
                  <td>${t.flightCount}/${t.hotelCount}/${t.activityCount}</td>
                  <td class="admin-actions">
                    <button class="admin-btn admin-btn-secondary admin-btn-sm" data-view-trip="${t.id}">Vedi</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-trip="${t.id}" data-title="${this.esc(t.title)}">Elimina</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="admin-table-empty">Nessun viaggio trovato</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 20)}
      </div>

      <div id="trip-detail-container"></div>
    `;

    // Search
    let searchTimer;
    document.getElementById('trips-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.renderTrips(1, e.target.value, document.getElementById('trips-status-filter')?.value || '');
      }, 400);
    });

    // Filter
    document.getElementById('trips-status-filter')?.addEventListener('change', () => {
      this.renderTrips(1, document.getElementById('trips-search')?.value || '', document.getElementById('trips-status-filter').value);
    });

    // View trip
    document.querySelectorAll('[data-view-trip]').forEach(btn => {
      btn.addEventListener('click', () => this.showTripDetail(btn.dataset.viewTrip));
    });

    // Delete trip
    document.querySelectorAll('[data-delete-trip]').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeleteTrip(btn.dataset.deleteTrip, btn.dataset.title));
    });

    this.bindPagination(() => (p) => this.renderTrips(p, document.getElementById('trips-search')?.value || '', document.getElementById('trips-status-filter')?.value || ''));
  },

  async showTripDetail(tripId) {
    const container = document.getElementById('trip-detail-container');
    if (!container) return;
    container.innerHTML = '<div class="admin-card"><div class="admin-loading"><span class="spinner"></span></div></div>';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let data;
    try {
      data = await this.api('get-trip', { tripId });
    } catch (err) {
      container.innerHTML = `<div class="admin-card"><p style="color:var(--color-error)">Errore: ${this.esc(err.message)}</p></div>`;
      return;
    }
    const t = data.trip;
    const d = t.data || {};

    const flights = (d.flights || []);
    const hotels = (d.hotels || []);
    const activities = (d.activities || []);

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">
            <span id="trip-title-display">${this.esc(this.i18n(d.title) || this.i18n(d.destination) || 'Untitled')}</span>
            <button class="admin-btn admin-btn-secondary admin-btn-sm" id="edit-title-btn" style="margin-left:8px">Modifica</button>
          </h3>
          <button class="admin-btn admin-btn-secondary admin-btn-sm" id="close-trip-detail">Chiudi</button>
        </div>
        <div class="admin-detail-grid" style="margin-bottom:16px">
          <div><div class="admin-detail-label">Utente</div><div class="admin-detail-value">${this.esc(t.username)}</div></div>
          <div><div class="admin-detail-label">Destinazione</div><div class="admin-detail-value">${this.esc(this.i18n(d.destination) || '-')}</div></div>
          <div><div class="admin-detail-label">Date</div><div class="admin-detail-value">${d.startDate || '-'} - ${d.endDate || '-'}</div></div>
          <div><div class="admin-detail-label">Creato</div><div class="admin-detail-value">${this.fmtDate(t.created_at)}</div></div>
        </div>

        ${flights.length ? `
          <h4 style="margin:8px 0;font-size:13px;color:var(--color-gray-600)">Voli (${flights.length})</h4>
          <div class="admin-trip-cards">
            ${flights.map(f => `
              <div class="admin-trip-card">
                <div class="admin-trip-card-title">${this.esc(this.i18n(f.flightNumber) || 'Volo')}</div>
                <div class="admin-trip-card-detail">
                  ${this.esc(this.i18n(f.departure?.code) || '')} &rarr; ${this.esc(this.i18n(f.arrival?.code) || '')}<br>
                  ${this.i18n(f.date) || ''} ${this.i18n(f.departureTime) || ''}<br>
                  ${this.esc(this.i18n(f.airline) || '')} ${f.passenger?.name ? '- ' + this.esc(this.i18n(f.passenger.name)) : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${hotels.length ? `
          <h4 style="margin:12px 0 8px;font-size:13px;color:var(--color-gray-600)">Hotel (${hotels.length})</h4>
          <div class="admin-trip-cards">
            ${hotels.map(h => `
              <div class="admin-trip-card">
                <div class="admin-trip-card-title">${this.esc(this.i18n(h.name) || 'Hotel')}</div>
                <div class="admin-trip-card-detail">
                  ${this.i18n(h.checkIn) || ''} - ${this.i18n(h.checkOut) || ''}<br>
                  ${this.esc(this.i18n(h.address) || '')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${activities.length ? `
          <h4 style="margin:12px 0 8px;font-size:13px;color:var(--color-gray-600)">Attivit\u00e0 (${activities.length})</h4>
          <div class="admin-trip-cards">
            ${activities.map(a => `
              <div class="admin-trip-card">
                <div class="admin-trip-card-title">${this.esc(this.i18n(a.name) || 'Attivit\u00e0')}</div>
                <div class="admin-trip-card-detail">
                  ${this.i18n(a.date) || ''} ${a.startTime ? a.startTime : ''} ${a.endTime ? '- ' + a.endTime : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('close-trip-detail')?.addEventListener('click', () => container.innerHTML = '');

    // Edit title
    document.getElementById('edit-title-btn')?.addEventListener('click', () => {
      const display = document.getElementById('trip-title-display');
      const currentTitle = this.i18n(d.title) || this.i18n(d.destination) || '';
      display.innerHTML = `
        <div class="admin-inline-edit">
          <input type="text" class="admin-inline-input" id="edit-title-input" value="${this.esc(currentTitle)}">
          <button class="admin-btn admin-btn-primary admin-btn-sm" id="save-title-btn">Salva</button>
          <button class="admin-btn admin-btn-secondary admin-btn-sm" id="cancel-title-btn">Annulla</button>
        </div>
      `;
      document.getElementById('save-title-btn')?.addEventListener('click', async () => {
        const newTitle = document.getElementById('edit-title-input').value.trim();
        if (!newTitle) return;
        try {
          await this.api('update-trip', { tripId, updates: { title: newTitle } });
          this.toast('Titolo aggiornato', 'success');
          this.showTripDetail(tripId);
        } catch (err) {
          this.toast('Errore: ' + err.message, 'error');
        }
      });
      document.getElementById('cancel-title-btn')?.addEventListener('click', () => this.showTripDetail(tripId));
    });
  },

  async confirmDeleteTrip(tripId, title) {
    const confirmed = await this.confirm(
      `Eliminare il viaggio <strong>${this.esc(title)}</strong>?<br>Verranno eliminati anche i PDF e i file associati.`,
      'Elimina viaggio'
    );
    if (!confirmed) return;

    try {
      await this.api('delete-trip', { tripId });
      this.toast('Viaggio eliminato', 'success');
      this.renderTrips();
    } catch (err) {
      this.toast('Errore: ' + err.message, 'error');
    }
  },

  // ============================================
  // Pending Bookings
  // ============================================

  async renderPending(page = 1, statusFilter = '', typeFilter = '') {
    const data = await this.api('list-pending-bookings', { page, pageSize: 20, status: statusFilter || undefined });
    const main = document.querySelector('.admin-content');

    // Client-side type filter
    let bookings = data.bookings;
    if (typeFilter) {
      bookings = bookings.filter(b => b.booking_type === typeFilter);
    }

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Prenotazioni Pendenti</h1>
        <p>${data.total} prenotazioni</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <select class="admin-filter" id="pending-status-filter">
            <option value="">Tutti gli stati</option>
            <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="associated" ${statusFilter === 'associated' ? 'selected' : ''}>Associated</option>
            <option value="dismissed" ${statusFilter === 'dismissed' ? 'selected' : ''}>Dismissed</option>
          </select>
          <select class="admin-filter" id="pending-type-filter">
            <option value="">Tutti i tipi</option>
            <option value="flight" ${typeFilter === 'flight' ? 'selected' : ''}>Volo</option>
            <option value="hotel" ${typeFilter === 'hotel' ? 'selected' : ''}>Hotel</option>
            <option value="unknown" ${typeFilter === 'unknown' ? 'selected' : ''}>Sconosciuto</option>
          </select>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table admin-table-fixed">
            <thead>
              <tr>
                <th style="width:25%">Titolo</th>
                <th style="width:80px">Tipo</th>
                <th style="width:12%">Utente</th>
                <th style="width:18%">Email da</th>
                <th style="width:90px">Stato</th>
                <th style="width:100px">Data</th>
                <th style="width:120px"></th>
              </tr>
            </thead>
            <tbody>
              ${bookings.length ? bookings.map(b => `
                <tr>
                  <td><strong>${this.esc(b.summary_title || '-')}</strong></td>
                  <td>${this.bookingTypeBadge(b.booking_type)}</td>
                  <td>${this.esc(b.username)}</td>
                  <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(b.email_from || '-')}</td>
                  <td>${this.statusBadge(b.status)}</td>
                  <td>${this.fmtDate(b.created_at)}</td>
                  <td class="admin-actions">
                    <button class="admin-btn admin-btn-secondary admin-btn-sm" data-view-booking="${b.id}">Vedi</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-booking="${b.id}">Elimina</button>
                  </td>
                </tr>
                <tr id="booking-detail-${b.id}" style="display:none"><td colspan="7"></td></tr>
              `).join('') : '<tr><td colspan="7" class="admin-table-empty">Nessuna prenotazione</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 20)}
      </div>
    `;

    const getFilters = () => ({
      status: document.getElementById('pending-status-filter')?.value || '',
      type: document.getElementById('pending-type-filter')?.value || ''
    });

    document.getElementById('pending-status-filter')?.addEventListener('change', () => {
      const f = getFilters();
      this.renderPending(1, f.status, f.type);
    });

    document.getElementById('pending-type-filter')?.addEventListener('change', () => {
      const f = getFilters();
      this.renderPending(1, f.status, f.type);
    });

    // View booking detail
    document.querySelectorAll('[data-view-booking]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleBookingDetail(btn.dataset.viewBooking, bookings));
    });

    document.querySelectorAll('[data-delete-booking]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await this.confirm('Eliminare questa prenotazione pendente?', 'Elimina');
        if (!confirmed) return;
        try {
          await this.api('delete-pending-booking', { bookingId: btn.dataset.deleteBooking });
          this.toast('Prenotazione eliminata', 'success');
          const f = getFilters();
          this.renderPending(1, f.status, f.type);
        } catch (err) {
          this.toast('Errore: ' + err.message, 'error');
        }
      });
    });

    this.bindPagination(() => (p) => {
      const f = getFilters();
      return this.renderPending(p, f.status, f.type);
    });
  },

  toggleBookingDetail(bookingId, bookings) {
    const row = document.getElementById(`booking-detail-${bookingId}`);
    if (!row) return;

    if (row.style.display !== 'none') {
      row.style.display = 'none';
      return;
    }

    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    row.style.display = '';
    row.querySelector('td').innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail-grid">
          <div><div class="admin-detail-label">Titolo</div><div class="admin-detail-value">${this.esc(b.summary_title || '-')}</div></div>
          <div><div class="admin-detail-label">Tipo</div><div class="admin-detail-value">${this.bookingTypeBadge(b.booking_type)}</div></div>
          <div><div class="admin-detail-label">Date</div><div class="admin-detail-value">${this.esc(b.summary_dates || '-')}</div></div>
          <div><div class="admin-detail-label">Stato</div><div class="admin-detail-value">${this.statusBadge(b.status)}</div></div>
          <div><div class="admin-detail-label">Email da</div><div class="admin-detail-value">${this.esc(b.email_from || '-')}</div></div>
          <div><div class="admin-detail-label">Oggetto email</div><div class="admin-detail-value">${this.esc(b.email_subject || '-')}</div></div>
          <div><div class="admin-detail-label">Utente</div><div class="admin-detail-value">${this.esc(b.username)}</div></div>
          <div><div class="admin-detail-label">Ricevuta</div><div class="admin-detail-value">${this.fmtDate(b.created_at)}</div></div>
        </div>
      </div>
    `;
  },

  // ============================================
  // Email Logs
  // ============================================

  async renderEmailLogs(page = 1, statusFilter = '') {
    const data = await this.api('list-email-logs', { page, pageSize: 20, status: statusFilter || undefined });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Log Elaborazione Email</h1>
        <p>${data.total} log totali</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <select class="admin-filter" id="email-log-filter">
            <option value="">Tutti gli stati</option>
            <option value="success" ${statusFilter === 'success' ? 'selected' : ''}>Success</option>
            <option value="error" ${statusFilter === 'error' ? 'selected' : ''}>Error</option>
            <option value="user_not_found" ${statusFilter === 'user_not_found' ? 'selected' : ''}>User not found</option>
            <option value="extraction_failed" ${statusFilter === 'extraction_failed' ? 'selected' : ''}>Extraction failed</option>
          </select>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Stato</th><th>Email da</th><th>Oggetto</th><th>Errore</th><th>Data</th></tr>
            </thead>
            <tbody>
              ${data.logs.length ? data.logs.map(l => `
                <tr>
                  <td>${this.emailStatusBadge(l.status)}</td>
                  <td>${this.esc(l.email_from || '-')}</td>
                  <td>${this.esc((l.email_subject || '-').substring(0, 50))}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.esc(l.error_message || '')}">${this.esc(l.error_message || '-')}</td>
                  <td style="white-space:nowrap">${this.fmtDate(l.created_at)}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessun log</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 20)}
      </div>
    `;

    document.getElementById('email-log-filter')?.addEventListener('change', () => {
      this.renderEmailLogs(1, document.getElementById('email-log-filter').value);
    });

    this.bindPagination(() => (p) => this.renderEmailLogs(p, document.getElementById('email-log-filter')?.value || ''));
  },

  // ============================================
  // Analytics
  // ============================================

  async renderAnalytics() {
    const main = document.querySelector('.admin-content');
    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Analytics</h1>
        <p>Statistiche aggregate della piattaforma</p>
      </div>
      <div class="admin-section-tabs">
        <button class="admin-section-tab active" data-analytics="airports">Aeroporti & Rotte</button>
        <button class="admin-section-tab" data-analytics="pdf">Elaborazione PDF</button>
        <button class="admin-section-tab" data-analytics="email">Email Forwarding</button>
      </div>
      <div id="analytics-content">
        <div class="admin-loading"><span class="spinner"></span></div>
      </div>
    `;

    document.querySelectorAll('[data-analytics]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-analytics]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
        this.renderAnalyticsSection(tab.dataset.analytics);
      });
    });

    this.renderAnalyticsSection('airports');
  },

  async renderAnalyticsSection(section) {
    const container = document.getElementById('analytics-content');
    container.innerHTML = '<div class="admin-loading"><span class="spinner"></span></div>';

    if (section === 'airports') {
      const data = await this.api('get-airport-stats');

      container.innerHTML = `
        <div class="admin-grid-2">
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Top Aeroporti</h3></div>
            <div class="admin-chart-container"><canvas id="chart-airports"></canvas></div>
          </div>
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Top Rotte</h3></div>
            <div class="admin-chart-container"><canvas id="chart-routes"></canvas></div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-header"><h3 class="admin-card-title">Compagnie Aeree</h3></div>
          <div class="admin-chart-container"><canvas id="chart-airlines"></canvas></div>
        </div>
      `;

      if (data.topAirports.length) {
        this.charts.airports = new Chart(document.getElementById('chart-airports'), {
          type: 'bar',
          data: {
            labels: data.topAirports.map(a => `${a.code} (${a.city})`),
            datasets: [{ label: 'Voli', data: data.topAirports.map(a => a.count), backgroundColor: 'rgba(33, 99, 246, 0.7)', borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
      }

      if (data.topRoutes.length) {
        this.charts.routes = new Chart(document.getElementById('chart-routes'), {
          type: 'bar',
          data: {
            labels: data.topRoutes.map(r => `${r.from} \u2192 ${r.to}`),
            datasets: [{ label: 'Voli', data: data.topRoutes.map(r => r.count), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
      }

      if (data.topAirlines.length) {
        this.charts.airlines = new Chart(document.getElementById('chart-airlines'), {
          type: 'bar',
          data: {
            labels: data.topAirlines.map(a => a.name),
            datasets: [{ label: 'Voli', data: data.topAirlines.map(a => a.count), backgroundColor: 'rgba(245, 158, 11, 0.7)', borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
      }
    }

    if (section === 'pdf') {
      const data = await this.api('get-pdf-stats');

      container.innerHTML = `
        <div class="admin-stats-grid">
          ${this.statCard('PDF elaborati', data.totalPdfs, 'primary')}
        </div>
        <div class="admin-grid-2">
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Trend mensile</h3></div>
            <div class="admin-chart-container"><canvas id="chart-pdf-trend"></canvas></div>
          </div>
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Errori recenti</h3></div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead><tr><th>Stato</th><th>Errore</th><th>Data</th></tr></thead>
                <tbody>
                  ${data.recentErrors.length ? data.recentErrors.map(e => `
                    <tr>
                      <td>${this.emailStatusBadge(e.status)}</td>
                      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${this.esc(e.error_message || '-')}</td>
                      <td style="white-space:nowrap">${this.fmtDate(e.created_at)}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="3" class="admin-table-empty">Nessun errore</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      if (data.trend.length) {
        this.charts.pdfTrend = new Chart(document.getElementById('chart-pdf-trend'), {
          type: 'line',
          data: {
            labels: data.trend.map(t => t.month),
            datasets: [{ label: 'PDF', data: data.trend.map(t => t.count), borderColor: '#2163f6', backgroundColor: 'rgba(33, 99, 246, 0.1)', fill: true, tension: 0.3 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
      }
    }

    if (section === 'email') {
      const data = await this.api('get-email-stats');
      const sc = data.statusCounts;

      container.innerHTML = `
        <div class="admin-stats-grid">
          ${this.statCard('Totale email', data.total, 'primary')}
          ${this.statCard('Successo', sc.success, 'success')}
          ${this.statCard('Utente non trovato', sc.user_not_found, 'warning')}
          ${this.statCard('Errori', sc.error + sc.extraction_failed, 'error')}
        </div>
        <div class="admin-grid-2">
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Distribuzione per stato</h3></div>
            <div class="admin-chart-container"><canvas id="chart-email-status"></canvas></div>
          </div>
          <div class="admin-card">
            <div class="admin-card-header"><h3 class="admin-card-title">Top utenti forwarding</h3></div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead><tr><th>Utente</th><th>Email elaborate</th></tr></thead>
                <tbody>
                  ${data.topUsers.length ? data.topUsers.map(u => `
                    <tr><td>${this.esc(u.username)}</td><td>${u.count}</td></tr>
                  `).join('') : '<tr><td colspan="2" class="admin-table-empty">Nessun utente</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-header"><h3 class="admin-card-title">Errori recenti</h3></div>
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead><tr><th>Stato</th><th>Email da</th><th>Oggetto</th><th>Errore</th><th>Data</th></tr></thead>
              <tbody>
                ${data.recentErrors.length ? data.recentErrors.map(e => `
                  <tr>
                    <td>${this.emailStatusBadge(e.status)}</td>
                    <td>${this.esc(e.email_from || '-')}</td>
                    <td>${this.esc((e.email_subject || '-').substring(0, 40))}</td>
                    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${this.esc(e.error_message || '-')}</td>
                    <td style="white-space:nowrap">${this.fmtDate(e.created_at)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessun errore</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;

      this.charts.emailStatus = new Chart(document.getElementById('chart-email-status'), {
        type: 'doughnut',
        data: {
          labels: ['Successo', 'Utente non trovato', 'Estrazione fallita', 'Errore'],
          datasets: [{
            data: [sc.success, sc.user_not_found, sc.extraction_failed, sc.error],
            backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  },

  // ============================================
  // Sharing
  // ============================================

  async renderSharing() {
    const data = await this.api('list-shared-trips');
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Viaggi Condivisi</h1>
        <p>${data.sharedTrips.length} viaggi con link di condivisione</p>
      </div>

      <div class="admin-card">
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Viaggio</th><th>Utente</th><th>Token</th><th></th></tr>
            </thead>
            <tbody>
              ${data.sharedTrips.length ? data.sharedTrips.map(s => `
                <tr>
                  <td><strong>${this.esc(s.title)}</strong></td>
                  <td>${this.esc(s.username)}</td>
                  <td><code style="font-size:11px">${this.esc(s.shareToken)}</code></td>
                  <td class="admin-actions">
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-revoke-share="${s.id}">Revoca</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="admin-table-empty">Nessun viaggio condiviso</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-revoke-share]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await this.confirm('Revocare la condivisione di questo viaggio?', 'Revoca');
        if (!confirmed) return;
        try {
          await this.api('revoke-share', { tripId: btn.dataset.revokeShare });
          this.toast('Condivisione revocata', 'success');
          this.renderSharing();
        } catch (err) {
          this.toast('Errore: ' + err.message, 'error');
        }
      });
    });
  },

  // ============================================
  // Audit Log
  // ============================================

  async renderAudit(page = 1) {
    const data = await this.api('get-audit-log', { page, pageSize: 50 });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Audit Log</h1>
        <p>Registro azioni amministrative</p>
      </div>

      <div class="admin-card">
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Azione</th><th>Tipo</th><th>ID Entit\u00e0</th><th>Dettagli</th><th>Data</th></tr>
            </thead>
            <tbody>
              ${data.logs.length ? data.logs.map(l => `
                <tr>
                  <td><span class="admin-badge-status admin-badge-neutral">${this.esc(l.action)}</span></td>
                  <td>${this.esc(l.entity_type)}</td>
                  <td style="font-family:var(--font-family-mono);font-size:11px">${this.esc((l.entity_id || '-').substring(0, 12))}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${l.details ? this.esc(JSON.stringify(l.details)) : '-'}</td>
                  <td style="white-space:nowrap">${this.fmtDate(l.created_at)}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessuna azione registrata</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 50)}
      </div>
    `;

    this.bindPagination(() => (p) => this.renderAudit(p));
  },

  // ============================================
  // System
  // ============================================

  async renderSystem() {
    const data = await this.api('get-system-info');
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Informazioni Sistema</h1>
        <p>Stato della piattaforma</p>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Variabili d'Ambiente</h3>
        </div>
        <div class="admin-env-grid">
          ${Object.entries(data.envStatus).map(([key, present]) => `
            <div class="admin-env-item">
              <span class="admin-env-name">${key}</span>
              <span class="admin-env-dot admin-env-dot--${present ? 'ok' : 'missing'}" title="${present ? 'Configurata' : 'Mancante'}"></span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Info Runtime</h3>
        </div>
        <div class="admin-detail-grid">
          <div><div class="admin-detail-label">Node.js</div><div class="admin-detail-value">${this.esc(data.nodeVersion)}</div></div>
          <div><div class="admin-detail-label">Ultimo check</div><div class="admin-detail-value">${this.fmtDate(data.timestamp)}</div></div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Cache Statistiche</h3>
          <button class="admin-btn admin-btn-primary" id="refresh-cache-btn">Aggiorna statistiche</button>
        </div>
        <div id="cache-status"><p style="color:var(--color-gray-500);font-size:13px">Clicca per aggiornare le statistiche della piattaforma</p></div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Esportazione Dati</h3>
        </div>
        <div class="admin-export-row">
          <button class="admin-btn admin-btn-secondary" id="export-users-json">Export Utenti (JSON)</button>
          <button class="admin-btn admin-btn-secondary" id="export-users-csv">Export Utenti (CSV)</button>
          <button class="admin-btn admin-btn-secondary" id="export-trips-json">Export Viaggi (JSON)</button>
          <button class="admin-btn admin-btn-secondary" id="export-trips-csv">Export Viaggi (CSV)</button>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--color-gray-200)">
          <h4 style="font-size:13px;color:var(--color-gray-600);margin-bottom:8px">Export dati utente (GDPR)</h4>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" class="admin-search" id="gdpr-user-id" placeholder="User ID (UUID)" style="max-width:320px">
            <button class="admin-btn admin-btn-primary" id="export-user-data">Esporta</button>
          </div>
        </div>
      </div>
    `;

    // Refresh cache
    document.getElementById('refresh-cache-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('refresh-cache-btn');
      btn.disabled = true;
      btn.textContent = 'Aggiornamento...';
      try {
        const result = await this.api('refresh-stats-cache');
        document.getElementById('cache-status').innerHTML = `
          <p style="color:var(--color-success);font-size:13px">Aggiornato: ${this.fmtDate(result.refreshedAt)}</p>
          <div class="admin-detail-grid" style="margin-top:8px">
            <div><div class="admin-detail-label">Utenti</div><div class="admin-detail-value">${result.stats.totalUsers}</div></div>
            <div><div class="admin-detail-label">Viaggi</div><div class="admin-detail-value">${result.stats.totalTrips}</div></div>
            <div><div class="admin-detail-label">Voli</div><div class="admin-detail-value">${result.stats.totalFlights}</div></div>
            <div><div class="admin-detail-label">Hotel</div><div class="admin-detail-value">${result.stats.totalHotels}</div></div>
          </div>
        `;
        btn.textContent = 'Aggiorna statistiche';
        btn.disabled = false;
      } catch (err) {
        this.toast('Errore: ' + err.message, 'error');
        btn.textContent = 'Aggiorna statistiche';
        btn.disabled = false;
      }
    });

    // Export buttons
    const downloadData = async (type, format) => {
      try {
        const result = await this.api('export-data', { type, format });
        if (format === 'csv') {
          this.downloadCSV(result.data, result.filename);
        } else {
          this.downloadJSON(result.data, result.filename);
        }
        this.toast('Download avviato', 'success');
      } catch (err) {
        this.toast('Errore export: ' + err.message, 'error');
      }
    };

    document.getElementById('export-users-json')?.addEventListener('click', () => downloadData('users', 'json'));
    document.getElementById('export-users-csv')?.addEventListener('click', () => downloadData('users', 'csv'));
    document.getElementById('export-trips-json')?.addEventListener('click', () => downloadData('trips', 'json'));
    document.getElementById('export-trips-csv')?.addEventListener('click', () => downloadData('trips', 'csv'));

    document.getElementById('export-user-data')?.addEventListener('click', async () => {
      const userId = document.getElementById('gdpr-user-id')?.value?.trim();
      if (!userId) { this.toast('Inserire un User ID', 'error'); return; }
      try {
        const result = await this.api('export-data', { type: 'user-data', userId, format: 'json' });
        this.downloadJSON(result.data, result.filename);
        this.toast('Download avviato', 'success');
      } catch (err) {
        this.toast('Errore: ' + err.message, 'error');
      }
    });
  },

  // ============================================
  // Helpers
  // ============================================

  i18n(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.it || val.en || Object.values(val)[0] || '';
    return String(val);
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  fmtDate(dateStr) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  },

  fmtWeek(weekStr) {
    if (!weekStr) return '';
    const d = new Date(weekStr + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  },

  statCard(label, value, variant = '') {
    return `
      <div class="admin-stat-card ${variant ? 'admin-stat-card--' + variant : ''}">
        <div class="admin-stat-label">${label}</div>
        <div class="admin-stat-value">${value}</div>
      </div>
    `;
  },

  bookingTypeBadge(type) {
    const map = {
      flight: { cls: 'admin-badge-flight', label: 'Volo' },
      hotel: { cls: 'admin-badge-hotel', label: 'Hotel' },
      unknown: { cls: 'admin-badge-neutral', label: 'Sconosciuto' }
    };
    const m = map[type] || map.unknown;
    return `<span class="admin-badge-status ${m.cls}">${m.label}</span>`;
  },

  statusBadge(status) {
    const map = { pending: 'warning', associated: 'success', dismissed: 'neutral' };
    return `<span class="admin-badge-status admin-badge-${map[status] || 'neutral'}">${status}</span>`;
  },

  emailStatusBadge(status) {
    const map = { success: 'success', error: 'error', extraction_failed: 'error', user_not_found: 'warning' };
    return `<span class="admin-badge-status admin-badge-${map[status] || 'neutral'}">${status.replace(/_/g, ' ')}</span>`;
  },

  pagination(total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return '';

    return `
      <div class="admin-pagination">
        <div class="admin-pagination-info">${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} di ${total}</div>
        <div class="admin-pagination-btns">
          <button class="admin-pagination-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Prec</button>
          <button class="admin-pagination-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Succ</button>
        </div>
      </div>
    `;
  },

  bindPagination(getNavFn) {
    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p > 0) getNavFn()(p);
      });
    });
  },

  async confirm(message, title) {
    return new Promise(resolve => {
      const html = `
        <div class="admin-modal-overlay" id="admin-confirm-overlay">
          <div class="admin-modal">
            <div class="admin-modal-header"><h3>${title}</h3></div>
            <div class="admin-modal-body">${message}</div>
            <div class="admin-modal-footer">
              <button class="admin-btn admin-btn-secondary" id="admin-confirm-cancel">Annulla</button>
              <button class="admin-btn admin-btn-danger" id="admin-confirm-ok">Conferma</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);

      const overlay = document.getElementById('admin-confirm-overlay');
      const cleanup = (result) => { overlay.remove(); resolve(result); };

      document.getElementById('admin-confirm-cancel').addEventListener('click', () => cleanup(false));
      document.getElementById('admin-confirm-ok').addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    });
  },

  toast(message, type = 'error') {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.triggerDownload(blob, filename);
  },

  downloadCSV(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      this.downloadJSON(data, filename.replace('.csv', '.json'));
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => {
      const val = row[h];
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    this.triggerDownload(blob, filename);
  },

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => adminPage.init());

window.adminPage = adminPage;
