/**
 * Admin Page - Main module for admin dashboard
 * Auth check, router, API helper, all view renderers
 */

const ADMIN_EMAIL = 'fstagno@idibgroup.com';

const SP_HELP_CONTENT = {
  matchRules: {
    title: 'Match Rules',
    body: `<p>Le <strong>Match Rules</strong> determinano se questo template è applicabile a un documento.</p>
<ul>
  <li><strong>Tutti richiesti (all):</strong> tutte le parole chiave devono essere presenti nel testo del PDF. Se anche una sola manca, il template viene scartato.</li>
  <li><strong>Bonus se presenti (any):</strong> ogni parola trovata aggiunge punti allo score di matching (non obbligatorie).</li>
</ul>
<p>Lo score finale determina se il template supera la soglia minima di confidenza.</p>
<p><em>Suggerimento: usa parole uniche al tipo di documento, come nomi di compagnie aeree o catene alberghiere.</em></p>`
  },
  settings: {
    title: 'Impostazioni template',
    body: `<p>Le <strong>Impostazioni</strong> controllano il comportamento del template:</p>
<ul>
  <li><strong>Soglia confidenza:</strong> valore tra 0 e 100%. Il template viene usato solo se la confidenza totale supera questa soglia. Valori alti (es. 80%) riducono i falsi positivi; valori bassi aumentano la copertura.</li>
  <li><strong>Tipo documento:</strong> filtra il template per tipo di documento. "Qualsiasi" lo applica a qualunque tipo indipendentemente dalla richiesta.</li>
</ul>`
  },
  fieldRules: {
    title: 'Field Rules',
    body: `<p>Le <strong>Field Rules</strong> sono le istruzioni regex che il template usa per estrarre i dati dal testo del PDF.</p>
<p>Ogni regola definisce:</p>
<ul>
  <li><strong>field:</strong> il nome del campo da estrarre (es. "flightNumber", "price")</li>
  <li><strong>patterns:</strong> lista di espressioni regolari provate in ordine</li>
  <li><strong>transform:</strong> trasformazioni post-estrazione (uppercase, toFloat, ecc.)</li>
</ul>
<p>Queste regole sono generate da Claude AI. Per aggiornarle usa la sezione <em>Rigenera Template</em> qui sotto.</p>`
  },
  regenerate: {
    title: 'Rigenera Template',
    body: `<p><strong>Rigenera</strong> chiede a Claude AI di analizzare un nuovo PDF campione e riscrivere completamente le Field Rules e le Match Rules del template.</p>
<p><strong>Quando usarlo:</strong></p>
<ul>
  <li>Il template non estrae correttamente alcuni campi</li>
  <li>Il formato del documento è cambiato (nuova versione del biglietto)</li>
  <li>Vuoi migliorare la copertura con un campione più recente</li>
</ul>
<p><strong>Attenzione:</strong> questa operazione sovrascrive le regole esistenti. Nome e contatore utilizzi vengono mantenuti.</p>
<p>Richiede una chiamata a Claude AI (~15 secondi).</p>`
  },
  sampleResult: {
    title: 'Risultato Campione',
    body: `<p>Il <strong>Risultato campione</strong> è il JSON estratto dall'ultimo documento che ha generato o aggiornato questo template.</p>
<p>Serve come riferimento per capire che tipo di dati il template riesce a estrarre e con quale struttura.</p>
<p>Non è modificabile — viene aggiornato automaticamente ogni volta che il template viene rigenerato o usato con successo.</p>`
  }
};

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
      'pdf-logs': () => this.renderPdfLogs(),
      smartparse: () => this.renderSmartTemplates(),
      analyzer: () => this.renderAnalyzer(),
      analytics: () => this.renderAnalytics(),
      sharing: () => this.renderSharing(),
      audit: () => this.renderAudit(),
      system: () => this.renderSystem(),
    };

    const renderer = renderers[view];
    if (renderer) {
      const result = renderer();
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          console.error('View render error:', err);
          main.innerHTML = `<div class="admin-card"><p style="color:var(--color-error)">Errore: ${this.esc(err.message)}</p></div>`;
        });
      }
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
      const text = await res.text().catch(() => '');
      let err = {};
      try { err = JSON.parse(text); } catch (_) {}
      console.error(`[admin-api] ${action} → ${res.status}`, text.substring(0, 500));
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
                <tr class="admin-row-clickable" data-detail="${u.id}" title="Clicca per i dettagli">
                  <td><strong>${this.esc(u.username)}</strong></td>
                  <td>${this.esc(u.email)}</td>
                  <td>${u.tripCount}</td>
                  <td>${this.fmtDate(u.created_at)}</td>
                  <td class="admin-actions" onclick="event.stopPropagation()">
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

    // Row click → detail
    document.querySelectorAll('tr[data-detail]').forEach(row => {
      row.addEventListener('click', () => this.toggleUserDetail(row.dataset.detail));
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
                <tr class="admin-row-clickable" data-view-trip="${t.id}" title="Clicca per i dettagli">
                  <td><strong>${this.esc(t.title)}</strong></td>
                  <td>${this.esc(t.username)}</td>
                  <td>${this.esc(t.destination)}</td>
                  <td style="white-space:nowrap">${t.startDate || '-'} ${t.endDate ? '/ ' + t.endDate : ''}</td>
                  <td>${t.flightCount}/${t.hotelCount}/${t.activityCount}</td>
                  <td class="admin-actions" onclick="event.stopPropagation()">
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

    // Row click → trip detail
    document.querySelectorAll('tr[data-view-trip]').forEach(row => {
      row.addEventListener('click', () => this.showTripDetail(row.dataset.viewTrip));
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

    let data, collabData;
    try {
      [data, collabData] = await Promise.all([
        this.api('get-trip', { tripId }),
        this.api('get-trip-collaborators', { tripId }).catch(() => null)
      ]);
    } catch (err) {
      container.innerHTML = `<div class="admin-card"><p style="color:var(--color-error)">Errore: ${this.esc(err.message)}</p></div>`;
      return;
    }
    const t = data.trip;
    const d = t.data || {};

    const flights = (d.flights || []);
    const hotels = (d.hotels || []);
    const activities = (d.activities || []);

    // Build collaborators section
    const collabSection = collabData ? this._renderCollaboratorsSection(collabData) : '';

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

        ${collabSection}
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

  _renderCollaboratorsSection(collabData) {
    const { owner, collaborators, invitations } = collabData;
    const all = [owner, ...collaborators];
    const pendingInvitations = invitations.filter(i => i.status === 'pending');
    const revokedInvitations = invitations.filter(i => i.status === 'revoked');

    const roleBadge = (role) => {
      const map = { proprietario: 'primary', viaggiatore: 'info', ospite: 'neutral' };
      return `<span class="admin-collab-role admin-collab-role-${map[role] || 'neutral'}">${role}</span>`;
    };

    const statusBadge = (status) => {
      const map = { accepted: 'success', pending: 'warning', revoked: 'error' };
      const labels = { accepted: 'attivo', pending: 'in attesa', revoked: 'revocato' };
      return `<span class="admin-collab-status admin-collab-status-${map[status] || 'neutral'}">${labels[status] || status}</span>`;
    };

    const memberRows = all.map(m => `
      <div class="admin-collab-row">
        <div class="admin-collab-avatar">${(m.username || m.email || '?')[0].toUpperCase()}</div>
        <div class="admin-collab-info">
          <div class="admin-collab-name">${this.esc(m.username || '-')}</div>
          <div class="admin-collab-email">${this.esc(m.email || '-')}</div>
        </div>
        <div class="admin-collab-badges">
          ${roleBadge(m.role)}
          ${statusBadge(m.status || 'accepted')}
        </div>
        ${m.type !== 'owner' ? `<div class="admin-collab-meta">${this.fmtDate(m.createdAt)}</div>` : '<div class="admin-collab-meta">—</div>'}
      </div>
    `).join('');

    const inviteRows = pendingInvitations.map(inv => `
      <div class="admin-collab-row admin-collab-row-invite">
        <div class="admin-collab-avatar admin-collab-avatar-invite">@</div>
        <div class="admin-collab-info">
          <div class="admin-collab-name">${this.esc(inv.email)}</div>
          <div class="admin-collab-email">Invitato da: ${this.esc(inv.invitedBy)}</div>
        </div>
        <div class="admin-collab-badges">
          ${roleBadge(inv.role)}
          ${statusBadge('pending')}
        </div>
        <div class="admin-collab-meta">${this.fmtDate(inv.createdAt)}</div>
      </div>
    `).join('');

    const revokedRows = revokedInvitations.length ? `
      <details style="margin-top:8px">
        <summary style="font-size:12px;color:var(--color-gray-500);cursor:pointer;padding:4px 0">
          ${revokedInvitations.length} invit${revokedInvitations.length === 1 ? 'o revocato' : 'i revocati'}
        </summary>
        ${revokedInvitations.map(inv => `
          <div class="admin-collab-row admin-collab-row-revoked">
            <div class="admin-collab-avatar admin-collab-avatar-revoked">@</div>
            <div class="admin-collab-info">
              <div class="admin-collab-name">${this.esc(inv.email)}</div>
              <div class="admin-collab-email">Invitato da: ${this.esc(inv.invitedBy)}</div>
            </div>
            <div class="admin-collab-badges">
              ${roleBadge(inv.role)}
              ${statusBadge('revoked')}
            </div>
            <div class="admin-collab-meta">${this.fmtDate(inv.updatedAt || inv.createdAt)}</div>
          </div>
        `).join('')}
      </details>
    ` : '';

    const totalMembers = all.length + pendingInvitations.length;

    return `
      <div class="admin-collab-section">
        <h4 class="admin-collab-title">
          Partecipanti al viaggio
          <span class="admin-collab-count">${totalMembers}</span>
        </h4>
        <div class="admin-collab-list">
          ${memberRows}
          ${inviteRows}
        </div>
        ${revokedRows}
      </div>
    `;
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
                <tr class="admin-row-clickable" data-view-booking="${b.id}" title="Clicca per i dettagli">
                  <td><strong>${this.esc(b.summary_title || '-')}</strong></td>
                  <td>${this.bookingTypeBadge(b.booking_type)}</td>
                  <td>${this.esc(b.username)}</td>
                  <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(b.email_from || '-')}</td>
                  <td>${this.statusBadge(b.status)}</td>
                  <td>${this.fmtDate(b.created_at)}</td>
                  <td class="admin-actions" onclick="event.stopPropagation()">
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

    // Row click → booking detail
    document.querySelectorAll('tr[data-view-booking]').forEach(row => {
      row.addEventListener('click', () => this.toggleBookingDetail(row.dataset.viewBooking, bookings));
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
  // PDF Logs
  // ============================================

  async renderPdfLogs(page = 1, statusFilter = '') {
    const data = await this.api('list-pdf-logs', { page, pageSize: 20, status: statusFilter || undefined });
    const main = document.querySelector('.admin-content');

    const statusOpts = ['success', 'error', 'extraction_failed', 'user_not_found'];

    main.innerHTML = `
      <div class="admin-view-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <h1 style="margin:0">Elaborazioni PDF</h1>
          <a href="#analyzer" class="admin-btn admin-btn-secondary admin-btn-sm" data-view="analyzer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Analizzatore
          </a>
        </div>
        <p>${data.total} elaborazioni totali</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <select class="admin-filter" id="pdf-log-filter">
            <option value="">Tutti gli stati</option>
            ${statusOpts.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Sorgente</th>
                <th>Stato</th>
                <th>Utente</th>
                <th>File / Oggetto email</th>
                <th>Estratto</th>
                <th>Errore</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${data.logs.length ? data.logs.map(l => `
                <tr class="pdf-log-row" data-log-id="${this.esc(l.id)}" style="cursor:pointer" title="Clicca per dettagli">
                  <td>${this._pdfSourceBadge(l.source)}</td>
                  <td>${this.emailStatusBadge(l.status)}</td>
                  <td>
                    <div style="font-weight:500">${this.esc(l.username || '-')}</div>
                    <div style="font-size:11px;color:var(--color-gray-500)">${this.esc(l.userEmail || l.email_from || '')}</div>
                  </td>
                  <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.esc(l.email_subject || '')}">
                    ${this.esc((l.email_subject || '-').substring(0, 45))}
                  </td>
                  <td style="font-size:12px;color:var(--color-gray-600)">
                    ${l.extracted_summary ? `${l.extracted_summary.flights || 0}✈ ${l.extracted_summary.hotels || 0}🏨` : (l.attachment_count != null ? `${l.attachment_count} file` : '-')}
                  </td>
                  <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-error);font-size:12px" title="${this.esc(l.error_message || '')}">${this.esc((l.error_message || '').substring(0, 35) || '-')}</td>
                  <td style="white-space:nowrap">${this.fmtDate(l.created_at)}</td>
                </tr>
                <tr class="pdf-log-detail-row" id="pdf-log-detail-${this.esc(l.id)}" style="display:none">
                  <td colspan="7">
                    <div class="pdf-log-detail-panel">
                      ${this._renderPdfLogDetail(l)}
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="7" class="admin-table-empty">Nessun log PDF</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, 20)}
      </div>

    `;

    // Filter
    document.getElementById('pdf-log-filter')?.addEventListener('change', () => {
      this.renderPdfLogs(1, document.getElementById('pdf-log-filter').value);
    });

    // Row toggle detail
    document.querySelectorAll('.pdf-log-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.logId;
        const detail = document.getElementById(`pdf-log-detail-${id}`);
        if (detail) {
          detail.style.display = detail.style.display === 'none' ? 'table-row' : 'none';
        }
      });
    });

    this.bindPagination(() => (p) => this.renderPdfLogs(p, document.getElementById('pdf-log-filter')?.value || ''));
  },

  _renderPdfLogDetail(log) {
    const extracted = log.extracted_data;
    let extractedHtml = '';

    if (extracted) {
      const data = typeof extracted === 'string' ? JSON.parse(extracted) : extracted;
      extractedHtml = `
        <div class="pdf-log-extracted">
          <div class="pdf-log-extracted-title">Dati estratti</div>
          <pre class="pdf-log-json">${this.esc(JSON.stringify(data, null, 2))}</pre>
        </div>
      `;
    }

    // Build extracted_summary block for uploads
    let summaryHtml = '';
    if (log.extracted_summary && typeof log.extracted_summary === 'object') {
      const s = log.extracted_summary;
      summaryHtml = `
        <div class="pdf-log-extracted">
          <div class="pdf-log-extracted-title">Riepilogo estrazione</div>
          <div class="pdf-result-grid" style="margin-bottom:0">
            ${s.destination ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Destinazione</div><div class="pdf-result-field-value">${this.esc(s.destination)}</div></div>` : ''}
            ${s.flights != null ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Voli estratti</div><div class="pdf-result-field-value">${s.flights}</div></div>` : ''}
            ${s.hotels != null ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Hotel estratti</div><div class="pdf-result-field-value">${s.hotels}</div></div>` : ''}
            ${s.passenger ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Passeggero</div><div class="pdf-result-field-value">${this.esc(s.passenger)}</div></div>` : ''}
            ${s.startDate ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Data inizio</div><div class="pdf-result-field-value">${this.esc(s.startDate)}</div></div>` : ''}
            ${s.endDate ? `<div class="pdf-result-field"><div class="pdf-result-field-label">Data fine</div><div class="pdf-result-field-value">${this.esc(s.endDate)}</div></div>` : ''}
          </div>
        </div>
      `;
    }

    const sourceLabel = log.source === 'upload' ? 'Caricamento diretto' : 'Email forwarding';
    const emailLabel = log.source === 'upload' ? 'Utente' : 'Email da';
    const subjectLabel = log.source === 'upload' ? 'File elaborati' : 'Oggetto email';

    return `
      <div class="pdf-log-detail-grid">
        <div>
          <div class="admin-detail-label">Sorgente</div>
          <div class="admin-detail-value">${this._pdfSourceBadge(log.source)} <span style="font-size:12px;color:var(--color-gray-500);margin-left:4px">${sourceLabel}</span></div>
        </div>
        <div>
          <div class="admin-detail-label">ID Log</div>
          <div class="admin-detail-value" style="font-family:monospace;font-size:11px">${this.esc(log.id)}</div>
        </div>
        <div>
          <div class="admin-detail-label">Utente</div>
          <div class="admin-detail-value">${this.esc(log.username || log.user_id || '-')}</div>
        </div>
        <div>
          <div class="admin-detail-label">${emailLabel}</div>
          <div class="admin-detail-value">${this.esc(log.email_from || '-')}</div>
        </div>
        <div>
          <div class="admin-detail-label">${subjectLabel}</div>
          <div class="admin-detail-value">${this.esc(log.email_subject || '-')}</div>
        </div>
        ${log.attachment_count != null ? `
        <div>
          <div class="admin-detail-label">N° file</div>
          <div class="admin-detail-value">${log.attachment_count}</div>
        </div>` : ''}
        ${log.trip_id ? `
        <div>
          <div class="admin-detail-label">Viaggio creato</div>
          <div class="admin-detail-value" style="font-family:monospace;font-size:11px">${this.esc(log.trip_id)}</div>
        </div>` : ''}
        ${log.error_message ? `
        <div style="grid-column:1/-1">
          <div class="admin-detail-label">Messaggio errore</div>
          <div class="admin-detail-value" style="color:var(--color-error)">${this.esc(log.error_message)}</div>
        </div>` : ''}
      </div>
      ${summaryHtml}
      ${extractedHtml}
    `;
  },

  _pdfSourceBadge(source) {
    if (source === 'upload') {
      return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:#ede9fe;color:#6d28d9">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
        Upload
      </span>`;
    }
    return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:#dbeafe;color:#1d4ed8">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      Email
    </span>`;
  },

  _renderPdfAnalysisResult(result, docType, durationMs, smartMeta = null) {
    if (!result) {
      return `<div class="pdf-analyze-error">Nessun dato estratto dal documento.</div>`;
    }

    const flights = result.flights || (result.flightNumber ? [result] : []);
    const hotels = result.hotels || (result.name && result.checkIn ? [result] : []);
    const passenger = result.passenger;
    const booking = result.booking;

    const LEVEL_LABELS = {
      1: { label: 'Cache esatta', cls: 'sp-level-1', icon: '⚡' },
      2: { label: 'Template L2', cls: 'sp-level-2', icon: '🧩' },
      4: { label: 'Claude API', cls: 'sp-level-4', icon: '🤖' }
    };

    let smartBar = '';
    if (smartMeta?.isBeta) {
      const lvl   = LEVEL_LABELS[smartMeta.parseLevel] || { label: `Livello ${smartMeta.parseLevel}`, cls: 'sp-level-4', icon: '?' };
      const calls = smartMeta.claudeCalls ?? 0;

      const claudeCallsHtml = calls === 0
        ? `<span class="sp-claude-calls sp-calls-zero">✅ 0 chiamate a Claude</span>`
        : `<span class="sp-claude-calls sp-calls-one">🤖 ${calls} chiamata a Claude</span>`;

      // Cache status for Level 4
      let cacheStatusHtml = '';
      if (smartMeta.parseLevel === 4) {
        if (smartMeta.cacheSaved) {
          cacheStatusHtml = `<span class="sp-tpl-status sp-tpl-ok">💾 Cache salvata — prossimo upload: 0 chiamate</span>`;
        } else if (smartMeta.timedOut) {
          cacheStatusHtml = `<span class="sp-tpl-status sp-tpl-error">⚠️ Timeout Claude — riprova</span>`;
        }
      }

      // DB load error
      let dbErrorHtml = '';
      if (smartMeta.dbLoadError) {
        const isMissingTable = smartMeta.dbLoadError.toLowerCase().includes('does not exist');
        dbErrorHtml = `<span class="sp-tpl-status sp-tpl-error">
          ⚠️ DB non raggiungibile${isMissingTable ? ' — <strong>esegui migrazione 012</strong>' : `: ${this.esc(smartMeta.dbLoadError)}`}
        </span>`;
      }

      // Detected doc type badge
      const detectedDocType = smartMeta.detectedDocType;
      let detectedTypeHtml = '';
      if (detectedDocType && detectedDocType !== 'auto') {
        const dtLabel = detectedDocType === 'flight' ? '✈ Volo rilevato' : '🏨 Hotel rilevato';
        detectedTypeHtml = `<span class="sp-detected-type">${dtLabel}</span>`;
      }

      const textInfo = smartMeta.textLength > 0 ? `Testo PDF: ${smartMeta.textLength} car.` : '⚠️ Testo non estratto';

      smartBar = `
        <div class="sp-result-bar">
          <div class="sp-result-bar-top">
            <span class="sp-level-badge ${lvl.cls}">${lvl.icon} ${lvl.label}</span>
            ${detectedTypeHtml}
            ${claudeCallsHtml}
            <span class="sp-result-time">${durationMs}ms</span>
          </div>
          ${cacheStatusHtml || dbErrorHtml ? `
          <div class="sp-result-bar-details">
            ${cacheStatusHtml ? `<div style="width:100%">${cacheStatusHtml}</div>` : ''}
            ${dbErrorHtml     ? `<div style="width:100%">${dbErrorHtml}</div>`     : ''}
            <span class="sp-result-text-len">${textInfo}</span>
          </div>` : ''}
        </div>
      `;
    }

    const typeLabel = docType === 'flight' ? 'Volo' : docType === 'hotel' ? 'Hotel' : 'Auto';
    let html = `
      <div class="pdf-analyze-result-header">
        <span class="pdf-analyze-result-type">${typeLabel}</span>
        ${!smartMeta?.isBeta ? `<span class="pdf-analyze-result-time">${durationMs}ms</span>` : ''}
        <span class="pdf-analyze-result-note">Simulazione — nessun dato salvato</span>
      </div>
      ${smartBar}
    `;

    if (passenger) {
      // Normalize any nested objects in passenger fields
      const resolvePassengerVal = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'boolean') return v ? 'Sì' : 'No';
        if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? (x.number || x.value || JSON.stringify(x)) : x).join(', ');
        if (typeof v === 'object') return v.allowance || v.number || v.value || v.description || JSON.stringify(v);
        return String(v);
      };
      html += `
        <div class="pdf-section-title">Passeggero</div>
        <div class="pdf-result-grid">
          ${this._pdfField('Nome', resolvePassengerVal(passenger.name))}
          ${this._pdfField('Tipo', resolvePassengerVal(passenger.type))}
          ${this._pdfField('Numero biglietto', resolvePassengerVal(passenger.ticketNumber))}
          ${this._pdfField('Posto', resolvePassengerVal(passenger.seat))}
          ${this._pdfField('Bagaglio', resolvePassengerVal(passenger.baggage))}
          ${this._pdfField('Frequent flyer', resolvePassengerVal(passenger.frequentFlyer))}
        </div>
      `;
    }

    if (booking) {
      const resolveBookingVal = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') return v.value || v.code || v.amount || v.description || JSON.stringify(v);
        return String(v);
      };
      html += `
        <div class="pdf-section-title">Prenotazione</div>
        <div class="pdf-result-grid">
          ${this._pdfField('Codice prenotazione', resolveBookingVal(booking.bookingReference || booking.pnr))}
          ${this._pdfField('Biglietto', resolveBookingVal(booking.ticketNumber))}
          ${this._pdfField('Classe', resolveBookingVal(booking.class || booking.cabinClass))}
          ${this._pdfField('Tariffa', resolveBookingVal(booking.fare || booking.price))}
          ${this._pdfField('Emesso da', resolveBookingVal(booking.issuedBy))}
          ${this._pdfField('Data emissione', resolveBookingVal(booking.issuedDate))}
        </div>
      `;
    }

    if (flights.length > 0) {
      html += `<div class="pdf-section-title">Voli estratti (${flights.length})</div>`;
      // Resolve potentially-nested scalar fields from Claude response
      const resolveStr = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'boolean') return v ? 'Sì' : 'No';
        if (typeof v === 'object') return [v.date, v.time, v.value, v.text].filter(Boolean).join(' ') || JSON.stringify(v);
        return String(v);
      };
      flights.forEach((f, i) => {
        const depTime = resolveStr(f.departureTime);
        const arrTime = resolveStr(f.arrivalTime);
        html += `
          <div class="pdf-flight-card">
            <div class="pdf-flight-card-header">Segmento ${i + 1}: ${this.esc(f.departure?.code || f.departure?.city || '?')} → ${this.esc(f.arrival?.code || f.arrival?.city || '?')}</div>
            <div class="pdf-result-grid">
              ${this._pdfField('N° volo', resolveStr(f.flightNumber))}
              ${this._pdfField('Compagnia', resolveStr(f.airline))}
              ${this._pdfField('Data', resolveStr(f.date))}
              ${this._pdfField('Partenza', `${f.departure?.city || ''} ${f.departure?.airport || ''} (${f.departure?.code || ''}) ${depTime || ''}`.trim())}
              ${this._pdfField('Arrivo', `${f.arrival?.city || ''} ${f.arrival?.airport || ''} (${f.arrival?.code || ''}) ${arrTime || ''}`.trim())}
              ${this._pdfField('Durata', resolveStr(f.duration))}
              ${this._pdfField('Terminale partenza', f.departure?.terminal)}
              ${this._pdfField('Terminale arrivo', f.arrival?.terminal)}
            </div>
            <div class="pdf-analyze-usage-note">
              Come verrebbe usato: aggiunto a <strong>tripData.flights[]</strong> con
              passenger, ticketNumber, pdfUrl collegati al passeggero estratto.
            </div>
          </div>
        `;
      });
    }

    if (hotels.length > 0) {
      html += `<div class="pdf-section-title">Hotel estratti (${hotels.length})</div>`;
      hotels.forEach((h, i) => {
        // Resolve nested date objects: { date, time } → "date time"
        const resolveDate = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          if (typeof v === 'object') return [v.date, v.time].filter(Boolean).join(' ') || null;
          return String(v);
        };
        // Resolve address: object → readable string
        const resolveAddress = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          if (typeof v === 'object') {
            const parts = [v.street, v.city, v.postalCode, v.country].filter(Boolean);
            return parts.length ? parts.join(', ') : (v.fullAddress || null);
          }
          return String(v);
        };
        // Resolve guests: { adults, children: [{age},...], total, pets } → "2 adulti, 4 bambini, 1 animale"
        const resolveGuests = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          if (typeof v === 'number') return String(v);
          if (Array.isArray(v)) return v.map(g => typeof g === 'object' ? (g.name || g.value || '') : g).filter(Boolean).join(', ') || null;
          if (typeof v === 'object') {
            if (v.name) return v.name;
            const parts = [];
            if (v.adults != null) parts.push(`${v.adults} adult${v.adults === 1 ? 'o' : 'i'}`);
            const childCount = Array.isArray(v.children) ? v.children.length : (typeof v.children === 'number' ? v.children : null);
            if (childCount) parts.push(`${childCount} bambin${childCount === 1 ? 'o' : 'i'}`);
            if (v.pets != null && v.pets > 0) parts.push(`${v.pets} animal${v.pets === 1 ? 'e' : 'i'}`);
            if (v.total && !parts.length) parts.push(`${v.total} totale`);
            return parts.join(', ') || null;
          }
          return String(v);
        };
        // Resolve breakfast / cancellation: bool or object → readable string (null if no meaningful data)
        const resolveText = (v) => {
          if (v == null) return null;
          if (typeof v === 'boolean') return v ? 'Sì' : 'No';
          if (typeof v === 'string') return v;
          if (typeof v === 'object') {
            const val = v.description || v.policy || v.details || v.freeCancellationUntil
              || (v.included != null ? (v.included ? 'Inclusa' : 'Non inclusa') : null)
              || (v.type && v.type !== 'null' ? v.type : null);
            return val || null;
          }
          return String(v);
        };
        // Resolve nested price object → "1420.64 EUR" or "Tasse: 11"
        const resolvePrice = (v) => {
          if (!v) return null;
          if (typeof v === 'number') return String(v);
          if (typeof v === 'string') return v;
          if (typeof v === 'object') {
            // { total: { value, currency } } or { value, currency }
            const node = v.total || v;
            if (node.value != null) return `${node.value}${node.currency ? ' ' + node.currency : ''}`;
            // partial: only tax info
            if (v.tax?.value != null) return `Tasse: ${v.tax.value}${v.tax.currency ? ' ' + v.tax.currency : ''}`;
          }
          return null;
        };
        // Resolve roomTypes array: [{it, en}] → Italian label
        const resolveRoomType = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          if (Array.isArray(v) && v.length > 0) return v[0].it || v[0].en || null;
          return null;
        };

        const city = h.city || h.address?.city || null;
        const country = h.country || h.address?.country || null;
        const cancellation = resolveText(h.cancellationPolicy || h.cancellation);
        const totalPrice = resolvePrice(h.totalPrice ?? h.price);
        const roomType = resolveRoomType(h.roomType || h.roomTypes);
        const source = h.source ? ` · ${h.source}` : '';

        html += `
          <div class="pdf-hotel-card">
            <div class="pdf-hotel-card-header">${this.esc(h.name || `Hotel ${i + 1}`)}${this.esc(source)}</div>
            <div class="pdf-result-grid">
              ${this._pdfField('Check-in', resolveDate(h.checkIn))}
              ${this._pdfField('Check-out', resolveDate(h.checkOut))}
              ${this._pdfField('Notti', h.nights)}
              ${this._pdfField('Indirizzo', resolveAddress(h.address))}
              ${this._pdfField('Città', city)}
              ${this._pdfField('Paese', country)}
              ${this._pdfField('Camera', roomType)}
              ${this._pdfField('Ospiti', resolveGuests(h.guests))}
              ${this._pdfField('Ospite', h.guestName || h.hostName)}
              ${this._pdfField('Prezzo totale', totalPrice)}
              ${this._pdfField('Codice prenotazione', h.bookingReference || h.confirmationNumber)}
              ${this._pdfField('Numero camera/stanza', h.rooms != null ? String(h.rooms) : null)}
              ${this._pdfField('Cancellazione', cancellation)}
              ${this._pdfField('Colazione', resolveText(h.breakfast))}
              ${this._pdfField('Contatti', h.contact || h.phone || h.email)}
            </div>
            <div class="pdf-analyze-usage-note">
              Come verrebbe usato: aggiunto a <strong>tripData.hotels[]</strong> con
              pdfUrl collegato alla prenotazione.
            </div>
          </div>
        `;
      });
    }

    if (flights.length === 0 && hotels.length === 0) {
      html += `<div class="pdf-analyze-empty">Nessun volo o hotel riconoscibile nel documento.</div>`;
    }

    html += `
      <div class="pdf-analyze-raw-toggle">
        <details>
          <summary>JSON estratto</summary>
          <pre class="pdf-log-json">${this.esc(JSON.stringify(result, null, 2))}</pre>
        </details>
        ${smartMeta?.isBeta ? `
        <details style="margin-top:6px">
          <summary>Metadati SmartParse</summary>
          <pre class="pdf-log-json">${this.esc(JSON.stringify({
            parseLevel: smartMeta.parseLevel,
            brand: smartMeta.brand,
            l2Method: smartMeta.l2Method,
            templateId: smartMeta.templateId || smartMeta.cacheId,
            claudeCalls: smartMeta.claudeCalls,
            textLength: smartMeta.textLength,
            durationMs: smartMeta.durationMs
          }, null, 2))}</pre>
        </details>` : ''}
      </div>
    `;

    return html;
  },

  _pdfField(label, value) {
    if (value == null || value === '' || value === 'N/A' || value === 'null') return '';
    return `
      <div class="pdf-result-field">
        <div class="pdf-result-field-label">${this.esc(label)}</div>
        <div class="pdf-result-field-value">${this.esc(String(value))}</div>
      </div>
    `;
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
        <h1>Azioni Admin</h1>
        <p>Storico delle operazioni distruttive eseguite dall'area admin (eliminazioni, revoche, modifiche dati)</p>
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
  // SmartParse Templates
  // ============================================

  async renderSmartTemplates() {
    const main = document.querySelector('.admin-content');
    const { templates } = await this.api('smartparse-list-templates');

    const typeIcon = { flight: '✈', hotel: '🏨', any: '?' };

    const rows = templates.map(t => {
      const icon = typeIcon[t.doc_type] || '?';
      const date = new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
      const fpShort = t.last_sample_fingerprint ? t.last_sample_fingerprint.substring(0, 12) + '...' : '—';
      return `
        <tr class="sp-tpl-row" data-tpl-id="${this.esc(t.id)}">
          <td><code style="font-size:11px;color:var(--text-secondary)">${fpShort}</code></td>
          <td><span class="sp-tpl-type">${icon} ${t.doc_type}</span></td>
          <td class="sp-tpl-uses">${t.usage_count || 0}</td>
          <td style="color:var(--text-secondary);font-size:12px">${date}</td>
          <td class="sp-tpl-actions">
            <button class="admin-btn admin-btn-sm admin-btn-danger sp-tpl-delete-btn" data-tpl-id="${this.esc(t.id)}" data-tpl-name="${this.esc(t.name)}">Elimina</button>
          </td>
        </tr>`;
    }).join('');

    main.innerHTML = `
      <div class="admin-view-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <h1 style="margin:0;display:flex;align-items:center;gap:10px">
            SmartParse v2 Cache
            <span class="sp-beta-badge" style="font-size:11px;padding:2px 8px;border-radius:4px;background:#4c1d95;color:#d8b4fe;font-weight:700;letter-spacing:.5px">BETA</span>
          </h1>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="admin-btn admin-btn-danger" id="btn-clear-all-cache" style="font-size:12px">Svuota cache</button>
            <button class="admin-btn admin-btn-secondary" id="btn-refresh-sptpl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Aggiorna
            </button>
          </div>
        </div>
        <p style="margin:4px 0 0;color:var(--text-secondary);font-size:14px">${templates.length} documenti in cache — L1 cache hit = 0 chiamate Claude</p>
      </div>

      <div class="admin-card" style="padding:0;overflow:hidden">
        ${templates.length === 0
          ? `<div style="padding:40px;text-align:center;color:var(--text-secondary)">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:12px;display:block;margin-inline:auto"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
               <p style="margin:0">Nessun documento in cache.<br>Analizza un PDF con SmartParse — la cache viene popolata automaticamente.</p>
             </div>`
          : `<div class="admin-table-wrapper">
               <table class="admin-table sp-tpl-table">
                 <thead>
                   <tr>
                     <th>Fingerprint</th>
                     <th>Tipo</th>
                     <th>Utilizzi</th>
                     <th>Creato</th>
                     <th></th>
                   </tr>
                 </thead>
                 <tbody>${rows}</tbody>
               </table>
             </div>`
        }
      </div>`;

    this._setupSmartCacheView(templates);
  },

  _setupSmartCacheView(templates) {
    const main = document.querySelector('.admin-content');

    // Refresh
    main.querySelector('#btn-refresh-sptpl')?.addEventListener('click', () => this.renderSmartTemplates());

    // Clear all cache
    main.querySelector('#btn-clear-all-cache')?.addEventListener('click', async () => {
      const confirmed = await this.confirm('Svuotare tutta la cache SmartParse? I prossimi upload richiederanno Claude.', 'Svuota cache');
      if (!confirmed) return;
      for (const t of templates) {
        try { await this.api('smartparse-delete-template', { id: t.id }); } catch (_) {}
      }
      this.toast('Cache svuotata', 'success');
      this.renderSmartTemplates();
    });

    // Delete single entry
    main.querySelectorAll('.sp-tpl-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.tplId;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await this.api('smartparse-delete-template', { id });
          this.toast('Cache entry eliminata', 'success');
          this.renderSmartTemplates();
        } catch (err) {
          this.toast(`Errore: ${err.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'Elimina';
        }
      });
    });
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
  },

  // ============================================
  // Analizzatore PDF
  // ============================================

  renderAnalyzer() {
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Analizzatore</h1>
        <p>Carica uno o più PDF per vedere come vengono estratti e interpretati dal sistema. Nessun dato viene salvato nel database.</p>
      </div>

      <div class="analyzer-layout">

        <!-- Colonna form -->
        <div class="analyzer-form-col">
          <div class="admin-card" style="padding:20px">

            <!-- Parser selector -->
            <div style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Parser</label>
              <div class="pdf-parser-options">
                <label class="pdf-parser-option">
                  <input type="radio" name="pdf-parser-type" value="only-claude">
                  <span class="pdf-parser-option-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    Only Claude
                  </span>
                </label>
                <label class="pdf-parser-option">
                  <input type="radio" name="pdf-parser-type" value="smart" checked>
                  <span class="pdf-parser-option-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    SmartParse
                    <span class="sp-beta-badge">BETA</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Tipo documento -->
            <div style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Tipo documento</label>
              <div class="pdf-analyze-type-select">
                <label class="pdf-type-option">
                  <input type="radio" name="pdf-doc-type" value="auto" checked>
                  <span class="pdf-type-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    Auto
                  </span>
                </label>
                <label class="pdf-type-option">
                  <input type="radio" name="pdf-doc-type" value="flight">
                  <span class="pdf-type-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
                    Volo
                  </span>
                </label>
                <label class="pdf-type-option">
                  <input type="radio" name="pdf-doc-type" value="hotel">
                  <span class="pdf-type-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Hotel
                  </span>
                </label>
              </div>
            </div>

            <!-- Upload area -->
            <div style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">File PDF</label>
              <div class="pdf-upload-area" id="pdf-upload-area">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-gray-400);margin-bottom:8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p style="margin:0;color:var(--color-gray-500);font-size:14px">Trascina PDF qui oppure</p>
                <p style="margin:2px 0 0;color:var(--color-gray-400);font-size:12px">Fino a 5 file — processati in sequenza</p>
                <label for="pdf-file-input" class="admin-btn admin-btn-secondary admin-btn-sm" style="margin-top:8px;cursor:pointer">Scegli file</label>
                <input type="file" id="pdf-file-input" accept=".pdf" multiple style="display:none">
                <div id="pdf-file-list" style="margin:8px 0 0;font-size:12px;color:var(--color-gray-500)"></div>
              </div>
            </div>

            <button class="admin-btn admin-btn-primary" id="btn-run-analysis" disabled style="width:100%;padding:14px;text-align:center;justify-content:center;font-size:15px">
              Analizza
            </button>
          </div>

          <!-- SmartParse Activity Log — inside parser column, below the card -->
          <div id="sp-activity-log-wrap" style="display:none;margin-top:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:8px 16px;background:#161b22;border-radius:8px 8px 0 0;
                        border:1px solid #30363d;border-bottom:none">
              <span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6e7681">
                SYSTEM ACTIVITY LOG
              </span>
              <div style="display:flex;gap:6px">
                <button id="sp-log-copy" style="font-size:11px;padding:3px 10px;background:transparent;
                  border:1px solid #30363d;border-radius:4px;color:#8b949e;cursor:pointer">Copia</button>
                <button id="sp-log-clear" style="font-size:11px;padding:3px 10px;background:transparent;
                  border:1px solid #30363d;border-radius:4px;color:#8b949e;cursor:pointer">Clear</button>
              </div>
            </div>
            <div id="sp-activity-log"
              style="background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',Menlo,'Courier New',monospace;
                     font-size:12px;line-height:1.8;border-radius:0 0 8px 8px;padding:14px 18px;
                     min-height:100px;max-height:280px;overflow-y:auto;white-space:pre-wrap;
                     word-break:break-word;border:1px solid #30363d"></div>
          </div>
        </div>

        <!-- Colonna risultati -->
        <div class="analyzer-results-col">
          <div id="pdf-analyze-result"></div>
        </div>

      </div>
    `;

    // ── Activity Log ──────────────────────────────────────────────────────────
    const logWrap = document.getElementById('sp-activity-log-wrap');
    const logEl   = document.getElementById('sp-activity-log');
    const logLines = []; // raw strings kept for copy

    // Highlight numbers, quoted strings and key=value pairs within a log line
    const spHighlight = (msg, level) => {
      const accent = { error: '#f85149', warn: '#e3b341', ok: '#56d364', step: '#79c0ff' }[level];
      // Escape HTML first
      let safe = msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      // key=value → key=<accent>value</accent>
      safe = safe.replace(/([\w]+)=([^\s,)]+)/g, (_, k, v) =>
        `${k}=<span style="color:${accent||'#79c0ff'}">${v}</span>`);
      // Quoted strings "..."
      safe = safe.replace(/"([^"]+)"/g, `"<span style="color:#e3b341">$1</span>"`);
      // Numbers (standalone)
      safe = safe.replace(/\b(\d+(?:\.\d+)?(?:ms|s)?)\b/g, `<span style="color:#d2a8ff">$1</span>`);
      return safe;
    };

    const spLog = (msg, level = 'info') => {
      const now = new Date();
      const ts  = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
      const lineColors = { error: '#f85149', warn: '#e3b341', ok: '#56d364' };
      const lineColor  = lineColors[level] || '#e6edf3'; // default white
      const rawLine    = `${ts} ${msg}`;
      logLines.push(rawLine);
      const row = document.createElement('span');
      row.style.cssText = `display:block;color:${lineColor}`;
      row.innerHTML =
        `<span style="color:#6e7681">${ts}</span> ${spHighlight(msg, level)}`;
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
      if (logWrap) logWrap.style.display = 'block';
    };

    document.getElementById('sp-log-clear')?.addEventListener('click', () => {
      logLines.length = 0;
      logEl.innerHTML = '';
    });

    document.getElementById('sp-log-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(logLines.join('\n')).then(
        () => this.toast('Log copiato negli appunti', 'success'),
        () => this.toast('Copia non riuscita', 'error')
      );
    });

    // Parser selector toggle
    document.querySelectorAll('input[name="pdf-parser-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        // v2: no mode options to toggle
      });
    });

    // File handling
    const MAX_PDF_FILES = 5;
    const fileInput  = document.getElementById('pdf-file-input');
    const runBtn     = document.getElementById('btn-run-analysis');
    const fileListEl = document.getElementById('pdf-file-list');
    const uploadArea = document.getElementById('pdf-upload-area');
    let selectedFiles = [];

    const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result.split(',')[1]);
      reader.onerror = () => reject(new Error(`Errore lettura file: ${file.name}`));
      reader.readAsDataURL(file);
    });

    const handleFiles = async (rawFiles) => {
      const pdfs = Array.from(rawFiles).filter(f => f.type === 'application/pdf');
      if (pdfs.length === 0) { this.toast('Seleziona almeno un file PDF valido', 'error'); return; }
      if (pdfs.length > MAX_PDF_FILES) { this.toast(`Massimo ${MAX_PDF_FILES} file per analisi`, 'error'); return; }

      fileListEl.innerHTML = '<span style="color:var(--color-gray-400)">Lettura in corso...</span>';
      runBtn.disabled = true;
      selectedFiles = [];

      try {
        for (const f of pdfs) {
          const base64 = await readFileAsBase64(f);
          selectedFiles.push({ name: f.name, base64 });
        }
        fileListEl.innerHTML = selectedFiles.map(f =>
          `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${this.esc(f.name)}
          </div>`
        ).join('');
        runBtn.disabled = false;
      } catch (err) {
        fileListEl.innerHTML = `<span style="color:var(--color-danger)">${this.esc(err.message)}</span>`;
      }
    };

    fileInput?.addEventListener('change', (e) => handleFiles(e.target.files));
    uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    runBtn?.addEventListener('click', async () => {
      if (!selectedFiles.length) return;

      const docType    = document.querySelector('input[name="pdf-doc-type"]:checked')?.value || 'auto';
      const parserType = document.querySelector('input[name="pdf-parser-type"]:checked')?.value || 'only-claude';
      const resultEl   = document.getElementById('pdf-analyze-result');
      const total      = selectedFiles.length;
      const isMulti    = total > 1;

      runBtn.disabled = true;
      resultEl.innerHTML = '';
      spLog(`─── Analisi avviata: ${total} file, parser=${parserType}, docType=${docType} ───`, 'step');

      const updateProgress = (i) => {
        runBtn.innerHTML = isMulti
          ? `<span class="spinner" style="width:15px;height:15px;margin-right:8px;display:inline-block;vertical-align:middle"></span>Documento ${i} di ${total}...`
          : `<span class="spinner" style="width:15px;height:15px;margin-right:8px;display:inline-block;vertical-align:middle"></span>Analisi in corso...`;
      };

      for (let i = 0; i < selectedFiles.length; i++) {
        const { name, base64 } = selectedFiles[i];
        updateProgress(i + 1);

        const placeholder = document.createElement('div');
        placeholder.style.cssText = isMulti ? 'margin-bottom:16px;border:1px solid var(--border-color);border-radius:8px;overflow:hidden' : '';
        placeholder.innerHTML = isMulti
          ? `<div style="padding:8px 12px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
               <span class="spinner" style="width:12px;height:12px;display:inline-block"></span>
               ${i + 1}. ${this.esc(name)}
             </div>
             <div style="padding:12px;color:var(--text-secondary);font-size:13px">Elaborazione...</div>`
          : `<div style="color:var(--text-secondary);font-size:13px;padding:8px 0">Elaborazione...</div>`;
        resultEl.appendChild(placeholder);

        try {
          let res, html;
          if (parserType === 'smart') {
            spLog(`▶ [${name}] Invio a analyze-pdf-smart (docType=${docType})`, 'step');
            res = await this.api('analyze-pdf-smart', { pdfBase64: base64, docType });

            // Log the core parse result
            const lvlLabel = { 1:'L1 Cache esatta', 2:'L2 Template extraction', 4:'L4 Claude AI' };
            spLog(`  Livello raggiunto: ${lvlLabel[res.parseLevel] || `L${res.parseLevel}`} (${res.durationMs}ms)`, res.parseLevel <= 2 ? 'ok' : 'warn');
            if (res.textLength > 0) spLog(`  Testo PDF estratto: ${res.textLength} caratteri`, 'muted');
            else spLog(`  ⚠ Testo PDF non estratto (PDF scansionato o protetto)`, 'warn');
            if (res.parseLevel === 2) {
              spLog(`  Template L2: brand=${res.brand || '?'}, metodo=${res.l2Method || '?'}`, 'info');
            }
            const hotelsFound = res.result?.hotels?.length ?? 0;
            const flightsFound = res.result?.flights?.length ?? 0;
            spLog(`  Estratti: ${hotelsFound} hotel, ${flightsFound} voli`, hotelsFound + flightsFound > 0 ? 'ok' : 'warn');
            if (res.error) spLog(`  ⚠ ${res.error}`, 'warn');

            // If Claude timed out, show a friendly retry UI instead of an error
            if (res.timedOut) {
              spLog(`  ✗ Timeout AI: ${res.timedOutMsg}`, 'error');
              placeholder.innerHTML = isMulti
                ? `<div style="padding:8px 12px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary)">⏱ ${i + 1}. ${this.esc(name)}</div>
                   <div style="padding:12px"><div class="pdf-analyze-error" style="background:var(--bg-warning,#fef3c7);border-color:var(--text-warning,#b45309);color:var(--text-warning,#b45309)">
                     <strong>Timeout AI:</strong> ${this.esc(res.timedOutMsg || 'Riprova tra qualche secondo')}
                   </div></div>`
                : `<div class="pdf-analyze-error" style="background:var(--bg-warning,#fef3c7);border-color:var(--text-warning,#b45309);color:var(--text-warning,#b45309)">
                     <strong>Timeout AI:</strong> ${this.esc(res.timedOutMsg || 'Riprova tra qualche secondo')}
                   </div>`;
              continue;
            }

            if (res.cacheSaved) spLog(`  💾 Template salvato (${res.cacheId}) — prossimi upload stesso provider: L2 (0 chiamate)`, 'ok');
            else if (res.parseLevel === 1) spLog(`  ✓ Cache L1 hit — nessuna chiamata Claude`, 'ok');
            else if (res.parseLevel === 2) spLog(`  ✓ Template L2 hit — nessuna chiamata Claude`, 'ok');
            else if (res.timedOut) spLog(`  ⚠ Claude timeout — riprova`, 'warn');

            spLog(`  Chiamate Claude totali: ${res.claudeCalls ?? 0} | Durata: ${res.durationMs}ms`, 'muted');
            html = this._renderPdfAnalysisResult(res.result, res.detectedDocType || docType, res.durationMs, res);
          } else {
            spLog(`▶ [${name}] Invio a analyze-pdf-admin (docType=${docType})`, 'step');
            res  = await this.api('analyze-pdf-admin', { pdfBase64: base64, docType });
            spLog(`  Completato: ${res.durationMs}ms`, 'muted');
            html = this._renderPdfAnalysisResult(res.result, res.detectedDocType || docType, res.durationMs, null);
          }
          placeholder.style.cssText = isMulti ? 'margin-bottom:16px;border:1px solid var(--border-color);border-radius:8px;overflow:hidden' : '';
          placeholder.innerHTML = isMulti
            ? `<div style="padding:8px 12px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                 ${i + 1}. ${this.esc(name)}
               </div>
               <div style="padding:12px">${html}</div>`
            : html;
        } catch (err) {
          const isOverload = /529|overload/i.test(err.message);
          spLog(`  ✗ ERRORE [${name}]: ${err.message}`, 'error');
          placeholder.innerHTML = isMulti
            ? `<div style="padding:8px 12px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary)">
                 ❌ ${i + 1}. ${this.esc(name)}
               </div>
               <div style="padding:12px"><div class="pdf-analyze-error"><strong>${isOverload ? '⚠ API sovraccarica (529)' : 'Errore'}:</strong> ${this.esc(err.message)}</div></div>`
            : `<div class="pdf-analyze-error"><strong>Errore:</strong> ${this.esc(err.message)}</div>`;
          if (isOverload) {
            resultEl.insertAdjacentHTML('beforeend', `<div class="pdf-analyze-error" style="margin-top:8px">⚠ Elaborazione interrotta: API sovraccarica. Riprova tra qualche secondo.</div>`);
            break;
          }
        }
      }

      runBtn.disabled = false;
      runBtn.innerHTML = 'Analizza';
      spLog(`─── Analisi completata ───`, 'step');
    });
  },
};

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => adminPage.init());

window.adminPage = adminPage;
