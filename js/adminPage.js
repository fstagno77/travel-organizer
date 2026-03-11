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
      'email-parse': () => this.renderEmailParse(),
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

  async renderUsers(page = 1, search = '', pageSize = 10) {
    const data = await this.api('list-users', { page, pageSize, search: search || undefined });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Gestione Utenti</h1>
        <p>${data.total} utenti registrati</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <input type="text" class="admin-search" id="users-search" placeholder="Cerca per username o email..." value="${this.esc(search)}">
          ${this.pageSizeSelector(pageSize)}
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
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    // Search
    let searchTimer;
    document.getElementById('users-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.renderUsers(1, e.target.value, pageSize), 400);
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
    this.bindPagination(() => (p, ps) => this.renderUsers(p, document.getElementById('users-search')?.value || '', ps || pageSize));
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
    // Step 1: pre-check — raccoglie tutte le dipendenze
    let checkData;
    try {
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.id = 'delete-check-loading';
      overlay.innerHTML = `<div class="admin-modal" style="max-width:360px;text-align:center;padding:32px">
        <span class="spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:12px"></span>
        <p style="margin:0;color:var(--color-gray-600)">Analisi dipendenze utente...</p>
      </div>`;
      document.body.appendChild(overlay);

      checkData = await this.api('pre-delete-check', { userId });
    } catch (err) {
      document.getElementById('delete-check-loading')?.remove();
      this.toast('Errore analisi: ' + err.message, 'error');
      return;
    }
    document.getElementById('delete-check-loading')?.remove();

    // Step 2: mostra modale con checklist dettagliata
    const c = checkData.counts;
    const hasImpact = c.impactedCollaborators > 0 || c.collaboratingOn > 0 || c.receivedInvitations > 0;

    // Costruisce le sezioni della checklist
    let sections = '';

    // Viaggi di proprietà
    sections += `<div class="delete-check-section">
      <div class="delete-check-icon">${c.trips > 0 ? '⚠️' : '✅'}</div>
      <div class="delete-check-content">
        <strong>${c.trips} viaggi di proprietà</strong>
        ${c.trips > 0 ? '<span class="delete-check-badge delete-check-badge-danger">Verranno eliminati</span>' : '<span class="delete-check-badge">Nessuno</span>'}
        ${checkData.ownedTrips.length > 0 ? `<ul class="delete-check-list">${checkData.ownedTrips.map(t =>
          `<li>${this.esc(t.title)} <span class="delete-check-meta">${t.flights}V ${t.hotels}H ${t.activities}A</span></li>`
        ).join('')}</ul>` : ''}
      </div>
    </div>`;

    // Collaboratori impattati
    sections += `<div class="delete-check-section">
      <div class="delete-check-icon">${c.impactedCollaborators > 0 ? '⚠️' : '✅'}</div>
      <div class="delete-check-content">
        <strong>${c.impactedCollaborators} collaboratori impattati</strong>
        ${c.impactedCollaborators > 0 ? '<span class="delete-check-badge delete-check-badge-warning">Perderanno accesso</span>' : '<span class="delete-check-badge">Nessuno</span>'}
        ${checkData.impactedCollaborators.length > 0 ? `<ul class="delete-check-list">${checkData.impactedCollaborators.map(ic =>
          `<li>${this.esc(ic.username || ic.email)} → ${this.esc(ic.tripTitle)} <span class="delete-check-meta">${ic.role}${ic.type === 'invitation' ? ' (invito)' : ''}</span></li>`
        ).join('')}</ul>` : ''}
      </div>
    </div>`;

    // Viaggi dove collabora
    sections += `<div class="delete-check-section">
      <div class="delete-check-icon">${c.collaboratingOn > 0 ? 'ℹ️' : '✅'}</div>
      <div class="delete-check-content">
        <strong>${c.collaboratingOn} collaborazioni su viaggi altrui</strong>
        ${c.collaboratingOn > 0 ? '<span class="delete-check-badge delete-check-badge-info">Verrà rimosso</span>' : '<span class="delete-check-badge">Nessuna</span>'}
        ${checkData.collaboratingOn.length > 0 ? `<ul class="delete-check-list">${checkData.collaboratingOn.map(co =>
          `<li>${this.esc(co.title)} <span class="delete-check-meta">di ${this.esc(co.ownerUsername)}, ${co.role}</span></li>`
        ).join('')}</ul>` : ''}
      </div>
    </div>`;

    // Inviti pending ricevuti
    if (c.receivedInvitations > 0) {
      sections += `<div class="delete-check-section">
        <div class="delete-check-icon">ℹ️</div>
        <div class="delete-check-content">
          <strong>${c.receivedInvitations} inviti pending ricevuti</strong>
          <span class="delete-check-badge delete-check-badge-info">Verranno revocati</span>
          <ul class="delete-check-list">${checkData.receivedInvitations.map(ri =>
            `<li>${this.esc(ri.tripTitle)} <span class="delete-check-meta">${ri.role}</span></li>`
          ).join('')}</ul>
        </div>
      </div>`;
    }

    // Dati personali
    sections += `<div class="delete-check-section">
      <div class="delete-check-icon">🗑️</div>
      <div class="delete-check-content">
        <strong>Dati personali</strong>
        <span class="delete-check-badge delete-check-badge-danger">Cancellazione definitiva</span>
        <ul class="delete-check-list">
          <li>${c.travelers} profili viaggiatore</li>
          <li>${c.pendingBookings} prenotazioni pendenti</li>
          <li>${c.notifications} notifiche</li>
          <li>${c.storageFiles} file PDF in storage</li>
        </ul>
      </div>
    </div>`;

    // Azioni di cleanup
    const cleanupActions = [];
    if (c.impactedCollaborators > 0) cleanupActions.push('Notifica collaboratori impattati');
    if (c.receivedInvitations > 0) cleanupActions.push('Revoca inviti pending ricevuti');
    if (c.collaboratingOn > 0) cleanupActions.push('Notifica owner dei viaggi condivisi');
    if (c.storageFiles > 0) cleanupActions.push('Pulizia file da Supabase Storage');
    cleanupActions.push('Cancellazione account e cascade dati');
    cleanupActions.push('Registrazione in audit log');

    const cleanupHtml = `<div class="delete-check-cleanup">
      <strong>Azioni di cleanup automatiche:</strong>
      <ol>${cleanupActions.map(a => `<li>${a}</li>`).join('')}</ol>
    </div>`;

    const modalHtml = `
      <div class="admin-modal-overlay" id="delete-user-modal">
        <div class="admin-modal delete-user-check-modal">
          <div class="admin-modal-header">
            <h3>Eliminazione utente: ${this.esc(username)}</h3>
            <button class="admin-modal-close" id="delete-modal-close">&times;</button>
          </div>
          <div class="admin-modal-body">
            <div class="delete-check-user-info">
              <span>${this.esc(checkData.user.email)}</span>
              <span>Registrato: ${this.fmtDate(checkData.user.created_at)}</span>
            </div>
            ${hasImpact ? '<div class="delete-check-warning">Questa operazione impatta altri utenti. Verranno notificati automaticamente.</div>' : ''}
            <div class="delete-check-sections">${sections}</div>
            ${cleanupHtml}
          </div>
          <div class="admin-modal-footer">
            <button class="admin-btn admin-btn-secondary" id="delete-modal-cancel">Annulla</button>
            <button class="admin-btn admin-btn-danger" id="delete-modal-confirm">
              Elimina definitivamente
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind eventi
    const modal = document.getElementById('delete-user-modal');
    const close = () => modal?.remove();

    document.getElementById('delete-modal-close').addEventListener('click', close);
    document.getElementById('delete-modal-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    document.getElementById('delete-modal-confirm').addEventListener('click', async () => {
      const btn = document.getElementById('delete-modal-confirm');
      btn.disabled = true;
      btn.textContent = 'Eliminazione in corso...';

      try {
        await this.api('delete-user', { userId });
        close();
        this.showDeleteSummary(username, checkData);
        this.renderUsers();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Elimina definitivamente';
        this.toast('Errore: ' + err.message, 'error');
      }
    });
  },

  /**
   * Modale riepilogo post-cancellazione
   */
  showDeleteSummary(username, checkData) {
    const c = checkData.counts;
    const items = [];
    if (c.trips > 0) items.push(`${c.trips} viaggi eliminati`);
    if (c.impactedCollaborators > 0) items.push(`${c.impactedCollaborators} collaboratori notificati`);
    if (c.collaboratingOn > 0) items.push(`${c.collaboratingOn} collaborazioni rimosse`);
    if (c.receivedInvitations > 0) items.push(`${c.receivedInvitations} inviti revocati`);
    if (c.travelers > 0) items.push(`${c.travelers} profili viaggiatore rimossi`);
    if (c.pendingBookings > 0) items.push(`${c.pendingBookings} prenotazioni pendenti rimosse`);
    if (c.notifications > 0) items.push(`${c.notifications} notifiche rimosse`);
    if (c.storageFiles > 0) items.push(`${c.storageFiles} file PDF rimossi dallo storage`);

    const html = `
      <div class="admin-modal-overlay" id="delete-summary-modal">
        <div class="admin-modal" style="max-width:440px">
          <div class="admin-modal-header">
            <h3>Utente eliminato</h3>
            <button class="admin-modal-close" id="summary-modal-close">&times;</button>
          </div>
          <div class="admin-modal-body">
            <div class="delete-summary-header">
              <div class="delete-summary-check">&#10003;</div>
              <strong>${this.esc(username)}</strong> (${this.esc(checkData.user.email)})
            </div>
            <div class="delete-summary-list">
              ${items.map(i => `<div class="delete-summary-item">&#10003; ${i}</div>`).join('')}
              <div class="delete-summary-item">&#10003; Account rimosso da Supabase Auth</div>
              <div class="delete-summary-item">&#10003; Azione registrata in audit log</div>
            </div>
          </div>
          <div class="admin-modal-footer">
            <button class="admin-btn admin-btn-primary" id="summary-modal-ok">Chiudi</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('delete-summary-modal');
    const closeModal = () => modal?.remove();
    document.getElementById('summary-modal-close').addEventListener('click', closeModal);
    document.getElementById('summary-modal-ok').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  },

  // ============================================
  // Trips
  // ============================================

  async renderTrips(page = 1, search = '', statusFilter = '', pageSize = 10) {
    const data = await this.api('list-trips', { page, pageSize, search: search || undefined, status: statusFilter || undefined });
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
          ${this.pageSizeSelector(pageSize)}
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Titolo</th><th>Utente</th><th>Destinazione</th><th>Creato</th><th></th></tr>
            </thead>
            <tbody>
              ${data.trips.length ? data.trips.map(t => `
                <tr class="admin-row-clickable trip-row" data-trip-id="${t.id}" style="cursor:pointer" title="Clicca per dettagli">
                  <td><strong>${this.esc(t.title)}</strong></td>
                  <td>${this.esc(t.username)}</td>
                  <td>${this.esc(t.destination)}</td>
                  <td style="white-space:nowrap;font-size:12px">${this.fmtDate(t.created_at)}</td>
                  <td class="admin-actions" onclick="event.stopPropagation()">
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-trip="${t.id}" data-title="${this.esc(t.title)}">Elimina</button>
                  </td>
                </tr>
                <tr class="trip-detail-row" id="trip-detail-${t.id}" style="display:none">
                  <td colspan="5">
                    <div class="pdf-log-detail-panel" style="text-align:center;padding:16px">
                      <span class="spinner"></span>
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessun viaggio trovato</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    // Search
    let searchTimer;
    document.getElementById('trips-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.renderTrips(1, e.target.value, document.getElementById('trips-status-filter')?.value || '', pageSize);
      }, 400);
    });

    // Filter
    document.getElementById('trips-status-filter')?.addEventListener('change', () => {
      this.renderTrips(1, document.getElementById('trips-search')?.value || '', document.getElementById('trips-status-filter').value, pageSize);
    });

    // Row click → expand detail inline
    document.querySelectorAll('.trip-row').forEach(row => {
      row.addEventListener('click', () => this.toggleTripDetail(row.dataset.tripId));
    });

    // Delete trip
    document.querySelectorAll('[data-delete-trip]').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeleteTrip(btn.dataset.deleteTrip, btn.dataset.title));
    });

    this.bindPagination(() => (p, ps) => this.renderTrips(p, document.getElementById('trips-search')?.value || '', document.getElementById('trips-status-filter')?.value || '', ps || pageSize));
  },

  async toggleTripDetail(tripId) {
    const detailRow = document.getElementById(`trip-detail-${tripId}`);
    if (!detailRow) return;

    // Toggle visibility
    if (detailRow.style.display === 'table-row') {
      detailRow.style.display = 'none';
      return;
    }
    detailRow.style.display = 'table-row';

    // If already loaded, don't reload
    if (detailRow.dataset.loaded) return;

    try {
      const [data, collabData] = await Promise.all([
        this.api('get-trip', { tripId }),
        this.api('get-trip-collaborators', { tripId }).catch(() => null)
      ]);
      const t = data.trip;
      const d = t.data || {};
      const flights = d.flights || [];
      const hotels = d.hotels || [];
      const activities = d.activities || [];
      const collabSection = collabData ? this._renderCollaboratorsSection(collabData) : '';

      detailRow.querySelector('td').innerHTML = `
        <div class="pdf-log-detail-panel">
          <div class="pdf-log-detail-grid">
            <div><div class="admin-detail-label">Destinazione</div><div class="admin-detail-value">${this.esc(this.i18n(d.destination) || '-')}</div></div>
            <div><div class="admin-detail-label">Date</div><div class="admin-detail-value">${d.startDate || '-'} → ${d.endDate || '-'}</div></div>
            <div><div class="admin-detail-label">Creato</div><div class="admin-detail-value">${this.fmtDate(t.created_at)}</div></div>
            <div><div class="admin-detail-label">Utente</div><div class="admin-detail-value">${this.esc(t.username)}</div></div>
          </div>

          ${flights.length ? `
            <div class="pdf-log-extracted">
              <div class="pdf-log-extracted-title">Voli (${flights.length})</div>
              <div class="admin-trip-cards">
                ${flights.map(f => `
                  <div class="admin-trip-card">
                    <div class="admin-trip-card-title">${this.esc(this.i18n(f.flightNumber) || 'Volo')}</div>
                    <div class="admin-trip-card-detail">
                      ${this.esc(this.i18n(f.departure?.code) || '')} → ${this.esc(this.i18n(f.arrival?.code) || '')}<br>
                      ${this.i18n(f.date) || ''} ${this.i18n(f.departureTime) || ''}<br>
                      ${this.esc(this.i18n(f.airline) || '')} ${f.passenger?.name ? '- ' + this.esc(this.i18n(f.passenger.name)) : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${hotels.length ? `
            <div class="pdf-log-extracted">
              <div class="pdf-log-extracted-title">Hotel (${hotels.length})</div>
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
            </div>
          ` : ''}

          ${activities.length ? `
            <div class="pdf-log-extracted">
              <div class="pdf-log-extracted-title">Attività (${activities.length})</div>
              <div class="admin-trip-cards">
                ${activities.map(a => `
                  <div class="admin-trip-card">
                    <div class="admin-trip-card-title">${this.esc(this.i18n(a.name) || 'Attività')}</div>
                    <div class="admin-trip-card-detail">
                      ${this.i18n(a.date) || ''} ${a.startTime || ''} ${a.endTime ? '- ' + a.endTime : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${collabSection}
        </div>
      `;
      detailRow.dataset.loaded = '1';
    } catch (err) {
      detailRow.querySelector('td').innerHTML = `
        <div class="pdf-log-detail-panel">
          <p style="color:var(--color-error)">Errore: ${this.esc(err.message)}</p>
        </div>
      `;
    }
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

  async renderPending(page = 1, statusFilter = '', typeFilter = '', pageSize = 10) {
    const data = await this.api('list-pending-bookings', { page, pageSize, status: statusFilter || undefined });
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
          ${this.pageSizeSelector(pageSize)}
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
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    const getFilters = () => ({
      status: document.getElementById('pending-status-filter')?.value || '',
      type: document.getElementById('pending-type-filter')?.value || ''
    });

    document.getElementById('pending-status-filter')?.addEventListener('change', () => {
      const f = getFilters();
      this.renderPending(1, f.status, f.type, pageSize);
    });

    document.getElementById('pending-type-filter')?.addEventListener('change', () => {
      const f = getFilters();
      this.renderPending(1, f.status, f.type, pageSize);
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
          this.renderPending(1, f.status, f.type, pageSize);
        } catch (err) {
          this.toast('Errore: ' + err.message, 'error');
        }
      });
    });

    this.bindPagination(() => (p, ps) => {
      const f = getFilters();
      return this.renderPending(p, f.status, f.type, ps || pageSize);
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

  async renderEmailLogs(page = 1, statusFilter = '', pageSize = 10) {
    const data = await this.api('list-email-logs', { page, pageSize, status: statusFilter || undefined });
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
          ${this.pageSizeSelector(pageSize)}
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
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    document.getElementById('email-log-filter')?.addEventListener('change', () => {
      this.renderEmailLogs(1, document.getElementById('email-log-filter').value, pageSize);
    });

    this.bindPagination(() => (p, ps) => this.renderEmailLogs(p, document.getElementById('email-log-filter')?.value || '', ps || pageSize));
  },

  // ============================================
  // PDF Logs
  // ============================================

  async renderPdfLogs(page = 1, statusFilter = '', pageSize = 10) {
    const [data, statsData] = await Promise.all([
      this.api('list-pdf-logs', { page, pageSize, status: statusFilter || undefined }),
      page === 1 && !statusFilter ? this.api('pdf-log-stats') : Promise.resolve(null)
    ]);
    const main = document.querySelector('.admin-content');
    const st = statsData?.stats;

    const statusOpts = [
      { value: 'success', label: 'OK' },
      { value: 'error', label: 'Errore' },
      { value: 'extraction_failed', label: 'Fallito' },
      { value: 'user_not_found', label: 'Utente non trovato' },
    ];

    main.innerHTML = `
      <div class="admin-view-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <h1 style="margin:0">Elaborazioni PDF</h1>
          <div style="display:flex;gap:8px">
            <button class="admin-btn admin-btn-danger admin-btn-sm" id="clear-pdf-logs-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Svuota log
            </button>
            <a href="#analyzer" class="admin-btn admin-btn-secondary admin-btn-sm" data-view="analyzer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Analizzatore
            </a>
          </div>
        </div>
        <p>${data.total} elaborazioni totali</p>
      </div>

      ${st ? `
      <div class="pdf-stats-cards">
        <div class="pdf-stat-card">
          <div class="pdf-stat-value sp-level-1-text">${st.byLevel[1]}</div>
          <div class="pdf-stat-label">Da cache (L1)</div>
        </div>
        <div class="pdf-stat-card">
          <div class="pdf-stat-value sp-level-2-text">${st.byLevel[2]}</div>
          <div class="pdf-stat-label">Da template (L2)</div>
        </div>
        <div class="pdf-stat-card">
          <div class="pdf-stat-value sp-level-4-text">${st.byLevel[4]}</div>
          <div class="pdf-stat-label">Con AI (L4)</div>
        </div>
        <div class="pdf-stat-card">
          <div class="pdf-stat-value">${st.claudeSavingsPercent}%</div>
          <div class="pdf-stat-label">Risparmio AI</div>
        </div>
        <div class="pdf-stat-card">
          <div class="pdf-stat-value">${st.feedback.up > 0 || st.feedback.down > 0 ? `${st.feedback.up}/${st.feedback.up + st.feedback.down}` : '-'}</div>
          <div class="pdf-stat-label">Feedback positivo</div>
        </div>
      </div>` : ''}

      <div class="admin-card">
        <div class="admin-toolbar">
          <select class="admin-filter" id="pdf-log-filter">
            <option value="">Tutti gli stati</option>
            ${statusOpts.map(s => `<option value="${s.value}" ${statusFilter === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          ${this.pageSizeSelector(pageSize)}
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Livello</th>
                <th>Stato</th>
                <th>Brand</th>
                <th>Utente</th>
                <th>File</th>
                <th>Estratto</th>
                <th>Feedback</th>
                <th>Durata</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${data.logs.length ? data.logs.map(l => {
                const meta = l.parse_meta || {};
                const level = l.parse_level;
                const levelBadge = this._pdfLevelBadge(level);
                const brand = meta.brand || '';
                const feedback = meta.feedback;
                const durationMs = meta.durationMs;
                const durationStr = durationMs ? (durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`) : '-';
                const feedbackIcon = feedback === 'up' ? '<span title="Positivo" style="color:#22c55e">&#x1F44D;</span>'
                  : feedback === 'down' ? '<span title="Negativo" style="color:#ef4444">&#x1F44E;</span>' : '';
                return `
                <tr class="pdf-log-row" data-log-id="${this.esc(l.id)}" style="cursor:pointer" title="Clicca per dettagli">
                  <td>${levelBadge}</td>
                  <td>${this.emailStatusBadge(l.status)}</td>
                  <td style="font-size:12px">${this.esc(brand || '-')}</td>
                  <td>
                    <div style="font-weight:500">${this.esc(l.username || '-')}</div>
                  </td>
                  <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.esc(l.email_subject || '')}">
                    ${this.esc((l.email_subject || '-').substring(0, 40))}
                  </td>
                  <td style="font-size:12px">
                    ${l.extracted_summary ? (() => {
                      const chips = [];
                      const fc = l.extracted_summary.flights || 0;
                      const hc = l.extracted_summary.hotels || 0;
                      if (fc > 0) chips.push(`<span class="admin-badge admin-badge-flight">${fc} Vol${fc === 1 ? 'o' : 'i'}</span>`);
                      if (hc > 0) chips.push(`<span class="admin-badge admin-badge-hotel">${hc} Hotel</span>`);
                      return chips.length ? chips.join(' ') : '-';
                    })() : '-'}
                  </td>
                  <td style="text-align:center">${feedbackIcon}</td>
                  <td style="font-size:12px;white-space:nowrap">${durationStr}</td>
                  <td style="white-space:nowrap">${this.fmtDate(l.created_at)}</td>
                </tr>
                <tr class="pdf-log-detail-row" id="pdf-log-detail-${this.esc(l.id)}" style="display:none">
                  <td colspan="9">
                    <div class="pdf-log-detail-panel">
                      ${this._renderPdfLogDetail(l)}
                    </div>
                  </td>
                </tr>
              `}).join('') : '<tr><td colspan="9" class="admin-table-empty">Nessun log PDF</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    // Filter
    document.getElementById('pdf-log-filter')?.addEventListener('change', () => {
      this.renderPdfLogs(1, document.getElementById('pdf-log-filter').value, pageSize);
    });

    // Clear logs button
    const clearBtn = document.getElementById('clear-pdf-logs-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const confirmed = await window.utils.showConfirm(
          'Svuotare tutti i log delle elaborazioni PDF? Questa azione è irreversibile.', {
            title: 'Svuota log',
            confirmText: 'Svuota tutto',
            variant: 'danger'
          }
        );
        if (!confirmed) return;
        clearBtn.disabled = true;
        clearBtn.textContent = 'Svuotamento...';
        try {
          await this.api('clear-pdf-logs');
          this.renderPdfLogs();
        } catch (err) {
          console.error('Clear PDF logs error:', err);
          clearBtn.disabled = false;
          clearBtn.textContent = 'Svuota log';
          window.utils.showToast('Errore: ' + err.message, 'error');
        }
      });
    }

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

    // Download trip files buttons
    document.querySelectorAll('[data-download-trip-files]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tripId = btn.dataset.downloadTripFiles;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          const res = await this.api('get-trip-files', { tripId });
          if (!res.files || res.files.length === 0) {
            this.toast('Nessun file trovato', 'error');
            return;
          }
          // Download each file
          for (const f of res.files) {
            const a = document.createElement('a');
            a.href = f.signedUrl;
            a.download = f.name;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
        } catch (err) {
          this.toast('Errore download: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Scarica PDF';
        }
      });
    });

    this.bindPagination(() => (p, ps) => this.renderPdfLogs(p, document.getElementById('pdf-log-filter')?.value || '', ps || pageSize));
  },

  _pdfLevelBadge(level) {
    const map = {
      1: { label: 'Cache (L1)', cls: 'sp-level-1' },
      2: { label: 'Template (L2)', cls: 'sp-level-2' },
      4: { label: 'AI (L4)', cls: 'sp-level-4' },
    };
    const info = map[level];
    if (info) {
      return `<span class="${info.cls}" style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px">${info.label}</span>`;
    }
    return `<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:#f3f4f6;color:#6b7280">Legacy</span>`;
  },

  _renderPdfLogDetail(log) {
    const meta = log.parse_meta || {};
    const s = log.extracted_summary || {};

    // ── Row 1: inline tags + completeness ──
    const tags = [];
    tags.push(this._pdfSourceBadge(log.source));
    if (log.parse_level) tags.push(this._pdfLevelBadge(log.parse_level));
    if (meta.brand) tags.push(`<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#f0f9ff;color:#0369a1">${this.esc(meta.brand)}</span>`);
    if (s.fieldsFilled != null && s.fieldsTotal) {
      const pct = Math.round((s.fieldsFilled / s.fieldsTotal) * 100);
      const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626';
      tags.push(`<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:${pct >= 70 ? '#f0fdf4' : pct >= 40 ? '#fefce8' : '#fef2f2'};color:${color}">${s.fieldsFilled}/${s.fieldsTotal} campi</span>`);
    }
    if (meta.claudeCalls != null && meta.claudeCalls > 0) {
      tags.push(`<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#faf5ff;color:#7c3aed">${meta.claudeCalls} chiamat${meta.claudeCalls === 1 ? 'a' : 'e'} Claude</span>`);
    }
    if (meta.editedFields?.length) {
      const fieldLabels = meta.editedFields.map(f => f.replace(/^(flight|hotel)\[\d+\]\./, '')).join(', ');
      tags.push(`<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#fff7ed;color:#c2410c" title="${this.esc(meta.editedFields.join(', '))}">Modificato (${meta.editedFields.length})</span>`);
    }

    // ── Row 2: file + user ──
    const fileUser = [];
    fileUser.push(this.esc(log.email_subject || '-'));
    if (log.attachment_count > 1) fileUser.push(`(${log.attachment_count} file)`);
    fileUser.push('·');
    fileUser.push(this.esc(log.username || log.email_from || '-'));

    // ── Row 3: extracted data summary ──
    let dataHtml = '';
    if (s && typeof s === 'object' && (s.flights || s.hotels)) {
      const parts = [];
      // Flights count + routes
      if (s.flights) {
        let flightTxt = `${s.flights} vol${s.flights === 1 ? 'o' : 'i'}`;
        if (s.routes?.length) flightTxt += ` (${s.routes.join(', ')})`;
        parts.push(flightTxt);
      }
      // Hotels count + names
      if (s.hotels) {
        let hotelTxt = `${s.hotels} hotel`;
        if (s.hotelNames?.length) hotelTxt += ` (${s.hotelNames.map(n => this.esc(n)).join(', ')})`;
        parts.push(hotelTxt);
      }
      // Passenger
      if (s.passenger) parts.push(this.esc(s.passenger));
      // Destination + dates
      if (s.destination) parts.push(this.esc(s.destination));
      if (s.startDate) parts.push(this.fmtDate(s.startDate + 'T00:00:00') + (s.endDate ? ` → ${this.fmtDate(s.endDate + 'T00:00:00')}` : ''));

      // Warnings inline
      const warn = [];
      if (s.skippedFlights) warn.push(`${s.skippedFlights} duplicat${s.skippedFlights === 1 ? 'o' : 'i'}`);
      if (s.skippedHotels) warn.push(`${s.skippedHotels} hotel dup.`);

      dataHtml = `<div style="font-size:12px;color:var(--color-gray-700);margin-top:6px;display:inline">${parts.join(' · ')}</div>`;
      if (warn.length) {
        dataHtml += `<div style="font-size:11px;color:#b45309;margin-top:2px">⚠ ${warn.join(' · ')}</div>`;
      }
    } else if (log.extracted_summary && !s.flights && !s.hotels && log.status === 'success') {
      dataHtml = `<span style="font-size:11px;color:#b45309">⚠ nessun dato estratto</span>`;
    }

    // Edited fields detail
    if (meta.editedFields?.length) {
      const labels = meta.editedFields.map(f => f.replace(/^(flight|hotel)\[\d+\]\./, ''));
      dataHtml += `<div style="font-size:11px;color:#c2410c;margin-top:4px">Campi modificati: ${labels.join(', ')}</div>`;
    }

    // ── Trip link (row 1, right-aligned) ──
    let tripLink = '';
    if (log.trip_id) {
      tripLink = `<a href="/trip.html?id=${encodeURIComponent(log.trip_id)}" target="_blank" style="font-size:11px;color:var(--color-primary);text-decoration:none;margin-left:auto">Apri viaggio ↗</a>`;
    }

    // ── JSON toggle (inline after data text) ──
    const jsonId = `pdf-json-${log.id}`;
    const hasJson = log.extracted_summary && Object.keys(log.extracted_summary).length > 0;
    const jsonToggle = hasJson
      ? ` <button class="admin-btn admin-btn-sm admin-btn-secondary" style="font-size:10px;padding:1px 6px;margin-left:6px" onclick="(function(b){var el=document.getElementById('${jsonId}');if(el.style.display==='none'){el.style.display='block';b.textContent='Nascondi JSON'}else{el.style.display='none';b.textContent='Mostra JSON'}})(this)">Mostra JSON</button>`
      : '';
    const jsonBlock = hasJson
      ? `<pre id="${jsonId}" style="display:none;margin-top:6px;padding:8px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:6px;font-size:11px;max-height:300px;overflow:auto;white-space:pre-wrap;word-break:break-all">${this.esc(JSON.stringify(log.extracted_summary, null, 2))}</pre>`
      : '';

    return `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">${tags.join('')}${tripLink}</div>
      <div style="font-size:11px;color:var(--color-gray-500);margin-top:6px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        <span>${fileUser.join(' ')}</span>
        ${log.trip_id ? `<button class="admin-btn admin-btn-sm admin-btn-secondary" style="font-size:10px;padding:1px 6px;margin-left:4px" data-download-trip-files="${log.trip_id}">Scarica PDF</button>` : ''}
      </div>
      <div style="margin-top:6px">${dataHtml}${jsonToggle}</div>
      ${jsonBlock}
      ${log.error_message ? `<div style="font-size:12px;color:var(--color-error);margin-top:4px">${this.esc(log.error_message)}</div>` : ''}
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
    const trains = result.trains || [];
    const buses = result.buses || [];
    // Supporta sia passenger (singolare) che passengers (array, formato email)
    const passenger = result.passenger || null;
    const passengers = result.passengers?.length ? result.passengers : (passenger ? [passenger] : []);
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
        const dtLabels = { flight: '✈ Volo rilevato', hotel: '🏨 Hotel rilevato', train: '🚆 Treno rilevato', bus: '🚌 Autobus rilevato' };
        const dtLabel = dtLabels[detectedDocType] || `📄 ${detectedDocType} rilevato`;
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

    const typeLabels = { flight: 'Volo', hotel: 'Hotel', train: 'Treno', bus: 'Autobus' };
    const typeLabel = typeLabels[docType] || 'Auto';
    let html = `
      <div class="pdf-analyze-result-header">
        <span class="pdf-analyze-result-type">${typeLabel}</span>
        ${!smartMeta?.isBeta ? `<span class="pdf-analyze-result-time">${durationMs}ms</span>` : ''}
        <span class="pdf-analyze-result-note">Simulazione — nessun dato salvato</span>
      </div>
      ${smartBar}
    `;

    if (passengers.length > 0) {
      const resolvePassengerVal = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'boolean') return v ? 'Sì' : 'No';
        if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? (x.number || x.value || JSON.stringify(x)) : x).join(', ');
        if (typeof v === 'object') {
          // Seat con outbound/return: "09C (A) / 06D (R)"
          if (v.outbound || v.return) return [v.outbound && `${v.outbound} (A)`, v.return && `${v.return} (R)`].filter(Boolean).join(' / ');
          return v.allowance || v.number || v.value || v.description || JSON.stringify(v);
        }
        return String(v);
      };
      html += `<div class="pdf-section-title">Passeggeri (${passengers.length})</div>`;
      passengers.forEach((p, i) => {
        html += `
          <div class="pdf-flight-card" style="margin-bottom:8px">
            ${passengers.length > 1 ? `<div class="pdf-flight-card-header">Passeggero ${i + 1}</div>` : ''}
            <div class="pdf-result-grid">
              ${this._pdfField('Nome', resolvePassengerVal(p.name))}
              ${this._pdfField('Tipo', resolvePassengerVal(p.type))}
              ${this._pdfField('Numero biglietto', resolvePassengerVal(p.ticketNumber))}
              ${this._pdfField('Posto', resolvePassengerVal(p.seat))}
              ${this._pdfField('Bagaglio', resolvePassengerVal(p.baggage))}
              ${this._pdfField('Frequent flyer', resolvePassengerVal(p.frequentFlyer))}
            </div>
          </div>
        `;
      });
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
          ${this._pdfField('Codice prenotazione', resolveBookingVal(booking.reference || booking.bookingReference || booking.pnr))}
          ${this._pdfField('Biglietto', resolveBookingVal(booking.ticketNumber))}
          ${this._pdfField('Classe', resolveBookingVal(booking.class || booking.cabinClass))}
          ${this._pdfField('Totale', booking.totalAmount ? `${booking.totalAmount.value ?? ''} ${booking.totalAmount.currency ?? ''}`.trim() : resolveBookingVal(booking.fare || booking.price))}
          ${this._pdfField('Data emissione', resolveBookingVal(booking.issueDate || booking.issuedDate))}
          ${this._pdfField('Emesso da', resolveBookingVal(booking.issuedBy))}
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
            // Prefer fullAddress when available (most complete)
            if (v.fullAddress) return v.fullAddress;
            const parts = [v.street, v.city, v.postalCode, v.country].filter(Boolean);
            return parts.length ? parts.join(', ') : null;
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

    if (trains.length > 0) {
      html += `<div class="pdf-section-title">Treni estratti (${trains.length})</div>`;
      const resolveStr = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') return [v.date, v.time, v.value].filter(Boolean).join(' ') || JSON.stringify(v);
        return String(v);
      };
      const resolvePrice = (v) => {
        if (!v) return null;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v.value != null) return `${v.value}${v.currency ? ' ' + v.currency : ''}`;
        return null;
      };
      trains.forEach((t, i) => {
        html += `
          <div class="pdf-flight-card">
            <div class="pdf-flight-card-header">🚆 Treno ${i + 1}: ${this.esc(t.departure?.station || t.departure?.city || '?')} → ${this.esc(t.arrival?.station || t.arrival?.city || '?')}</div>
            <div class="pdf-result-grid">
              ${this._pdfField('N° treno', resolveStr(t.trainNumber))}
              ${this._pdfField('Operatore', resolveStr(t.operator))}
              ${this._pdfField('Data', resolveStr(t.date))}
              ${this._pdfField('Partenza', `${t.departure?.station || t.departure?.city || ''} ${t.departure?.time || ''}`.trim())}
              ${this._pdfField('Arrivo', `${t.arrival?.station || t.arrival?.city || ''} ${t.arrival?.time || ''}`.trim())}
              ${this._pdfField('Classe', resolveStr(t.class))}
              ${this._pdfField('Posto', resolveStr(t.seat))}
              ${this._pdfField('Carrozza', resolveStr(t.coach))}
              ${this._pdfField('Prenotazione', resolveStr(t.bookingReference))}
              ${this._pdfField('Prezzo', resolvePrice(t.price))}
            </div>
            <div class="pdf-analyze-usage-note">
              ⚠️ <strong>Tipo sperimentale (BETA)</strong> — non ancora integrato nel salvataggio viaggio.
            </div>
          </div>
        `;
      });
    }

    if (buses.length > 0) {
      html += `<div class="pdf-section-title">Autobus estratti (${buses.length})</div>`;
      const resolveStr = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') return [v.date, v.time, v.value].filter(Boolean).join(' ') || JSON.stringify(v);
        return String(v);
      };
      const resolvePrice = (v) => {
        if (!v) return null;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v.value != null) return `${v.value}${v.currency ? ' ' + v.currency : ''}`;
        return null;
      };
      buses.forEach((b, i) => {
        html += `
          <div class="pdf-flight-card">
            <div class="pdf-flight-card-header">🚌 Autobus ${i + 1}: ${this.esc(b.departure?.station || b.departure?.city || '?')} → ${this.esc(b.arrival?.station || b.arrival?.city || '?')}</div>
            <div class="pdf-result-grid">
              ${this._pdfField('Operatore', resolveStr(b.operator))}
              ${this._pdfField('Linea', resolveStr(b.routeNumber))}
              ${this._pdfField('Data', resolveStr(b.date))}
              ${this._pdfField('Partenza', `${b.departure?.station || b.departure?.city || ''} ${b.departure?.time || ''}`.trim())}
              ${this._pdfField('Arrivo', `${b.arrival?.station || b.arrival?.city || ''} ${b.arrival?.time || ''}`.trim())}
              ${this._pdfField('Posto', resolveStr(b.seat))}
              ${this._pdfField('Prenotazione', resolveStr(b.bookingReference))}
              ${this._pdfField('Prezzo', resolvePrice(b.price))}
            </div>
            <div class="pdf-analyze-usage-note">
              ⚠️ <strong>Tipo sperimentale (BETA)</strong> — non ancora integrato nel salvataggio viaggio.
            </div>
          </div>
        `;
      });
    }

    if (flights.length === 0 && hotels.length === 0 && trains.length === 0 && buses.length === 0) {
      html += `<div class="pdf-analyze-empty">Nessun documento di viaggio riconoscibile.</div>`;
    }

    const uid = Date.now().toString(36);
    const copyBtn = (preId) => `<button data-copy-pre="${preId}" title="Copia" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#8b949e;cursor:pointer;padding:5px 7px;display:flex;align-items:center;font-size:11px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`;

    html += `
      <div class="pdf-analyze-raw-toggle">
        <details>
          <summary>JSON estratto</summary>
          <div style="position:relative">
            ${copyBtn(`json-pre-${uid}`)}
            <pre id="json-pre-${uid}" class="pdf-log-json">${this.esc(JSON.stringify(result, null, 2))}</pre>
          </div>
        </details>
        ${smartMeta?.isBeta ? `
        <details style="margin-top:6px">
          <summary>Metadati SmartParse</summary>
          <div style="position:relative">
            ${copyBtn(`meta-pre-${uid}`)}
            <pre id="meta-pre-${uid}" class="pdf-log-json">${this.esc(JSON.stringify({
              parseLevel: smartMeta.parseLevel,
              brand: smartMeta.brand,
              l2Method: smartMeta.l2Method,
              templateId: smartMeta.templateId || smartMeta.cacheId,
              claudeCalls: smartMeta.claudeCalls,
              textLength: smartMeta.textLength,
              durationMs: smartMeta.durationMs
            }, null, 2))}</pre>
          </div>
        </details>` : ''}
      </div>
    `;

    return html;
  },

  _attachCopyBtns(container) {
    container.querySelectorAll('[data-copy-pre]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = document.getElementById(btn.dataset.copyPre);
        if (!pre) return;
        navigator.clipboard.writeText(pre.textContent).then(() => {
          const orig = btn.innerHTML;
          btn.textContent = '✓';
          btn.style.color = '#56d364';
          setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 1200);
        });
      });
    });
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
  // Email Parse
  // ============================================

  renderEmailParse() {
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Email Tester</h1>
        <p>Testa SmartParse su email reali. Fornisci il corpo email (EML, HTML o testo) e, se disponibile, il PDF allegato. Nessun dato viene salvato nel database.</p>
      </div>

      <div class="analyzer-layout">

        <!-- Colonna form -->
        <div class="analyzer-form-col">
          <div class="admin-card" style="padding:20px">

            <!-- Tipo sorgente -->
            <div style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Tipo sorgente</label>
              <div class="pdf-parser-options">
                <label class="pdf-parser-option">
                  <input type="radio" name="ep-content-type" value="eml" checked>
                  <span class="pdf-parser-option-label">File EML</span>
                </label>
                <label class="pdf-parser-option">
                  <input type="radio" name="ep-content-type" value="html">
                  <span class="pdf-parser-option-label">HTML</span>
                </label>
                <label class="pdf-parser-option">
                  <input type="radio" name="ep-content-type" value="text">
                  <span class="pdf-parser-option-label">Testo</span>
                </label>
              </div>
            </div>

            <!-- EML file -->
            <div style="margin-bottom:12px" id="ep-eml-wrap">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">File EML</label>
              <div class="pdf-upload-area" id="ep-upload-area">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-gray-400);margin-bottom:8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p style="margin:0;color:var(--color-gray-500);font-size:14px">Trascina EML qui oppure</p>
                <p style="margin:2px 0 0;color:var(--color-gray-400);font-size:12px">Gmail → Scarica messaggio &nbsp;·&nbsp; Apple Mail → File → Salva come</p>
                <label for="ep-eml-input" class="admin-btn admin-btn-secondary admin-btn-sm" style="margin-top:8px;cursor:pointer">Scegli file</label>
                <input type="file" id="ep-eml-input" accept=".eml,.msg" style="display:none">
                <div id="ep-file-list" style="margin:8px 0 0;font-size:12px;color:var(--color-gray-500)"></div>
              </div>
            </div>

            <!-- Oggetto email -->
            <div style="margin-bottom:12px;display:none" id="ep-subject-wrap">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Oggetto email</label>
              <input type="text" id="ep-subject-input"
                placeholder="Es. Conferma prenotazione volo AZ123"
                style="width:100%;box-sizing:border-box;padding:8px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px;outline:none">
            </div>

            <!-- Contenuto textarea -->
            <div style="margin-bottom:12px;display:none" id="ep-content-wrap">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Contenuto email</label>
              <textarea id="ep-content-input" rows="12"
                placeholder="Incolla qui il contenuto HTML o testo dell'email..."
                style="width:100%;box-sizing:border-box;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;font-family:monospace;resize:vertical;outline:none"></textarea>
            </div>

            <!-- PDF allegato opzionale -->
            <div style="margin-bottom:12px" id="ep-pdf-wrap">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">PDF allegato <span style="font-weight:400;text-transform:none;letter-spacing:0">(opzionale)</span></label>
              <div class="pdf-upload-area" id="ep-pdf-upload-area">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-gray-400);margin-bottom:8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p style="margin:0;color:var(--color-gray-500);font-size:14px">Trascina PDF qui oppure</p>
                <p style="margin:2px 0 0;color:var(--color-gray-400);font-size:12px">Se presente, ha priorità sul corpo email</p>
                <label for="ep-pdf-input" class="admin-btn admin-btn-secondary admin-btn-sm" style="margin-top:8px;cursor:pointer">Scegli file</label>
                <input type="file" id="ep-pdf-input" accept=".pdf" style="display:none">
                <div id="ep-pdf-file-list" style="margin:8px 0 0;font-size:12px;color:var(--color-gray-500)"></div>
              </div>
            </div>

            <button class="admin-btn admin-btn-primary" id="ep-analyze-btn" disabled style="width:100%;padding:14px;text-align:center;justify-content:center;font-size:15px">
              Analizza
            </button>
          </div>

          <!-- Activity log -->
          <div id="ep-log-wrap" style="display:none;margin-top:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:8px 16px;background:#161b22;border-radius:8px 8px 0 0;
                        border:1px solid #30363d;border-bottom:none">
              <span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6e7681">ACTIVITY LOG</span>
              <div style="display:flex;gap:6px">
                <button id="ep-log-copy" style="font-size:11px;padding:3px 10px;background:transparent;border:1px solid #30363d;border-radius:4px;color:#8b949e;cursor:pointer">Copia</button>
                <button id="ep-log-clear" style="font-size:11px;padding:3px 10px;background:transparent;border:1px solid #30363d;border-radius:4px;color:#8b949e;cursor:pointer">Clear</button>
              </div>
            </div>
            <div id="ep-activity-log"
              style="background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',Menlo,'Courier New',monospace;
                     font-size:12px;line-height:1.8;border-radius:0 0 8px 8px;padding:14px 18px;
                     min-height:80px;max-height:220px;overflow-y:auto;white-space:pre-wrap;
                     word-break:break-word;border:1px solid #30363d"></div>
          </div>
        </div>

        <!-- Colonna risultati -->
        <div class="analyzer-results-col">
          <div id="ep-result"></div>
        </div>

      </div>
    `;

    // Refs
    const radios      = document.querySelectorAll('[name="ep-content-type"]');
    const emlWrap     = document.getElementById('ep-eml-wrap');
    const subjectWrap = document.getElementById('ep-subject-wrap');
    const contentWrap = document.getElementById('ep-content-wrap');
    const pdfWrap     = document.getElementById('ep-pdf-wrap');
    const logWrap     = document.getElementById('ep-log-wrap');
    const logEl       = document.getElementById('ep-activity-log');
    const uploadArea  = document.getElementById('ep-upload-area');
    const fileListEl  = document.getElementById('ep-file-list');
    const analyzeBtn  = document.getElementById('ep-analyze-btn');
    const logLines    = [];
    let emlText = null;
    let emlFile = null;

    // Aggiorna visibilità input in base al tipo selezionato
    const updateUI = () => {
      const type = document.querySelector('[name="ep-content-type"]:checked')?.value;
      emlWrap.style.display     = type === 'eml'  ? '' : 'none';
      subjectWrap.style.display = type === 'eml'  ? 'none' : '';
      contentWrap.style.display = (type === 'html' || type === 'text') ? '' : 'none';
      analyzeBtn.disabled       = type === 'eml' && !emlText;
    };
    radios.forEach(r => r.addEventListener('change', updateUI));
    updateUI();

    // EML file handling
    const handleEmlFile = (file) => {
      if (!file) return;
      fileListEl.innerHTML = '<span style="color:var(--color-gray-400)">Lettura in corso...</span>';
      analyzeBtn.disabled = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        emlText = e.target.result;
        emlFile = file;
        fileListEl.innerHTML = `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          ${this.esc(file.name)}
        </div>`;
        analyzeBtn.disabled = false;
      };
      reader.onerror = () => this.toast('Errore lettura file', 'error');
      reader.readAsText(file);
    };

    document.getElementById('ep-eml-input')?.addEventListener('change', (e) => handleEmlFile(e.target.files[0]));
    uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      handleEmlFile(e.dataTransfer.files[0]);
    });

    // PDF allegato — drag & drop
    const pdfUploadArea  = document.getElementById('ep-pdf-upload-area');
    const pdfFileListEl  = document.getElementById('ep-pdf-file-list');
    const pdfInput       = document.getElementById('ep-pdf-input');

    const clearPdfFile = () => {
      pdfInput.value = '';
      pdfFileListEl.innerHTML = '';
    };

    const handlePdfFile = (file) => {
      if (!file) return;
      pdfFileListEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(file.name)}</span>
        <button id="ep-pdf-remove" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--color-gray-400);padding:0;display:flex;align-items:center" title="Rimuovi allegato">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
      document.getElementById('ep-pdf-remove')?.addEventListener('click', clearPdfFile);
    };

    pdfInput?.addEventListener('change', (e) => handlePdfFile(e.target.files[0]));
    pdfUploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); pdfUploadArea.classList.add('drag-over'); });
    pdfUploadArea?.addEventListener('dragleave', () => pdfUploadArea.classList.remove('drag-over'));
    pdfUploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfUploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        pdfInput.files = dt.files;
        handlePdfFile(file);
      }
    });

    // Log helper
    const log = (msg, level = 'info') => {
      const colors = { error: '#f85149', warn: '#e3b341', ok: '#56d364', step: '#79c0ff' };
      const now = new Date();
      const ts = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
      logLines.push(`${ts} ${msg}`);
      const row = document.createElement('span');
      row.style.cssText = `display:block;color:${colors[level] || '#e6edf3'}`;
      row.textContent = `${ts} ${msg}`;
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
      logWrap.style.display = 'block';
    };

    document.getElementById('ep-log-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(logLines.join('\n'))
        .then(() => this.toast('Log copiato', 'success'))
        .catch(() => this.toast('Copia non riuscita', 'error'));
    });
    document.getElementById('ep-log-clear')?.addEventListener('click', () => {
      logLines.length = 0;
      logEl.innerHTML = '';
    });

    // Analizza
    document.getElementById('ep-analyze-btn').addEventListener('click', async () => {
      const btn         = document.getElementById('ep-analyze-btn');
      const resultEl    = document.getElementById('ep-result');
      const contentType = document.querySelector('[name="ep-content-type"]:checked')?.value || 'eml';

      let apiAction, apiPayload;

      // Controlla se è stato caricato un PDF allegato opzionale
      const pdfFile = document.getElementById('ep-pdf-input').files[0];

      if (pdfFile) {
        // PDF allegato presente: ha priorità sul corpo email, come nel parser reale
        log(`▶ PDF allegato: ${pdfFile.name} — analisi prioritaria`, 'step');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = e => resolve(e.target.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(pdfFile);
        });
        apiAction  = 'test-email-smartparse';
        apiPayload = {
          content:     base64,
          contentType: 'pdf',
          subject:     document.getElementById('ep-subject-input').value.trim(),
        };

      } else if (contentType === 'eml') {
        if (!emlText) { this.toast('Seleziona un file EML', 'error'); return; }
        log(`▶ Caricamento EML: ${emlFile?.name || 'file'} (${Math.round(emlText.length / 1024)} KB)`, 'step');
        apiAction  = 'test-eml-smartparse';
        apiPayload = { emlText };

      } else {
        const content = document.getElementById('ep-content-input').value.trim();
        if (!content) { this.toast('Inserisci del contenuto email', 'error'); return; }
        log(`▶ Analisi ${contentType.toUpperCase()} (${content.length} car.)`, 'step');
        apiAction  = 'test-email-smartparse';
        apiPayload = {
          content,
          contentType,
          subject: document.getElementById('ep-subject-input').value.trim(),
        };
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right:8px"></span>Analisi in corso...';
      resultEl.innerHTML = '<div style="padding:32px;text-align:center"><span class="spinner"></span></div>';

      try {
        const res = await this.api(apiAction, apiPayload);

        const lvlLabels = { 1: '⚡ L1 Cache esatta', 2: '🧩 L2 Template', 4: '🤖 L4 Claude API' };
        const lvlColors = { 1: '#56d364', 2: '#79c0ff', 4: '#d2a8ff' };
        const lvl = res.parseLevel || 4;

        log(`  Livello: ${lvlLabels[lvl] || lvl} | Claude: ${res.claudeCalls ?? 0} | ${res.durationMs}ms`, lvl === 1 ? 'ok' : lvl === 4 ? 'warn' : 'info');
        if (res.emlMeta) {
          log(`  Oggetto: ${res.emlMeta.subject || '—'}`, 'info');
          log(`  Sorgente usata: ${res.emlMeta.sourceUsed}`, 'info');
          if (res.emlMeta.pdfsFound?.length) log(`  PDF trovati: ${res.emlMeta.pdfsFound.join(', ')}`, 'ok');
        }
        if (res.cacheSaved) log(`  💾 Cache salvata — prossima analisi: 0 chiamate`, 'ok');
        if (res.error) log(`  ⚠ ${res.error}`, 'warn');

        // Metadati EML se presenti
        const emlMetaHtml = res.emlMeta ? `
          <div style="padding:10px 14px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border-color);margin-bottom:10px;font-size:12px;color:var(--text-secondary)">
            <div style="margin-bottom:3px"><strong style="color:var(--text-primary)">Oggetto:</strong> ${this.esc(res.emlMeta.subject || '—')}</div>
            <div style="margin-bottom:3px"><strong style="color:var(--text-primary)">Da:</strong> ${this.esc(res.emlMeta.from || '—')}</div>
            <div style="margin-bottom:3px"><strong style="color:var(--text-primary)">Sorgente usata:</strong> ${this.esc(res.emlMeta.sourceUsed)}</div>
            ${res.emlMeta.pdfsFound?.length ? `<div><strong style="color:var(--text-primary)">PDF allegati:</strong> ${res.emlMeta.pdfsFound.map(f => this.esc(f)).join(', ')}</div>` : ''}
          </div>` : '';

        // Badge livello
        const levelBadge = `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${lvlColors[lvl]}22;color:${lvlColors[lvl]};border:1px solid ${lvlColors[lvl]}44">
              ${lvlLabels[lvl] || `Livello ${lvl}`}
            </span>
            <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color)">
              ${res.claudeCalls === 0 ? '✅ 0 chiamate Claude' : `🤖 ${res.claudeCalls} chiamata Claude`}
            </span>
            <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color)">
              ⏱ ${res.durationMs}ms
            </span>
            ${res.textLength ? `<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color)">📝 ${res.textLength} car.</span>` : ''}
            ${res.cacheSaved ? '<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#56d36422;color:#56d364;border:1px solid #56d36444">💾 Cache salvata</span>' : ''}
            ${res.error ? `<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#f8514922;color:#f85149;border:1px solid #f8514944">⚠ ${this.esc(res.error)}</span>` : ''}
          </div>`;

        const resultHtml = this._renderPdfAnalysisResult(
          res.result,
          res.detectedDocType || 'auto',
          res.durationMs,
          { ...res, isBeta: true }
        );

        resultEl.innerHTML = levelBadge + emlMetaHtml + resultHtml;
        this._attachCopyBtns(resultEl);

      } catch (err) {
        log(`  ✗ Errore: ${err.message}`, 'error');
        resultEl.innerHTML = `<div class="pdf-analyze-error"><strong>Errore:</strong> ${this.esc(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Analizza con SmartParse';
      }
    });
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

  /**
   * Formatta i dettagli audit in HTML leggibile
   */
  formatAuditDetails(action, details) {
    if (!details) return '<span style="color:var(--color-gray-400)">Nessun dettaglio</span>';
    const items = [];

    // Campi comuni
    if (details.username) items.push(`<strong>Username:</strong> ${this.esc(details.username)}`);
    if (details.email) items.push(`<strong>Email:</strong> ${this.esc(details.email)}`);
    if (details.title) items.push(`<strong>Titolo:</strong> ${this.esc(details.title)}`);

    // Specifici per delete_user
    if (action === 'delete_user') {
      if (details.tripsDeleted != null) items.push(`<strong>Viaggi eliminati:</strong> ${details.tripsDeleted}`);
      if (details.collaboratorsNotified != null) items.push(`<strong>Collaboratori notificati:</strong> ${details.collaboratorsNotified}`);
      if (details.storageCleanup) items.push(`<strong>Storage:</strong> pulito`);
    }

    // Specifici per update_trip
    if (details.fields) items.push(`<strong>Campi modificati:</strong> ${Array.isArray(details.fields) ? details.fields.join(', ') : details.fields}`);

    // Specifici per clear_pdf_logs
    if (details.deletedCount != null) items.push(`<strong>Record eliminati:</strong> ${details.deletedCount}`);

    // Fallback: mostra campi non gestiti
    const knownKeys = ['username', 'email', 'title', 'tripsDeleted', 'collaboratorsNotified', 'storageCleanup', 'fields', 'deletedCount'];
    const extraKeys = Object.keys(details).filter(k => !knownKeys.includes(k));
    for (const k of extraKeys) {
      const val = typeof details[k] === 'object' ? JSON.stringify(details[k]) : details[k];
      items.push(`<strong>${this.esc(k)}:</strong> ${this.esc(String(val))}`);
    }

    return items.length > 0 ? items.join('<br>') : '<span style="color:var(--color-gray-400)">Nessun dettaglio</span>';
  },

  /**
   * Etichetta leggibile per le azioni audit
   */
  auditActionLabel(action) {
    const labels = {
      'delete_user': 'Utente eliminato',
      'delete_trip': 'Viaggio eliminato',
      'update_trip': 'Viaggio modificato',
      'delete_pending_booking': 'Prenotazione eliminata',
      'revoke_share': 'Condivisione revocata',
      'clear_pdf_logs': 'Log PDF cancellati',
      'smartparse_delete_template': 'Template eliminato'
    };
    return labels[action] || action;
  },

  async renderAudit(page = 1, pageSize = 10) {
    const data = await this.api('get-audit-log', { page, pageSize });
    const main = document.querySelector('.admin-content');

    main.innerHTML = `
      <div class="admin-view-header">
        <h1>Azioni Admin</h1>
        <p>Storico delle operazioni distruttive eseguite dall'area admin (eliminazioni, revoche, modifiche dati)</p>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          ${this.pageSizeSelector(pageSize)}
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr><th>Azione</th><th>Tipo</th><th>ID Entità</th><th>Riepilogo</th><th>Data</th></tr>
            </thead>
            <tbody>
              ${data.logs.length ? data.logs.map((l, i) => `
                <tr class="admin-row-clickable audit-row" data-audit-idx="${i}" title="Clicca per i dettagli">
                  <td><span class="admin-badge-status admin-badge-neutral">${this.esc(this.auditActionLabel(l.action))}</span></td>
                  <td>${this.esc(l.entity_type)}</td>
                  <td style="font-family:var(--font-family-mono);font-size:11px">${this.esc((l.entity_id || '-').substring(0, 12))}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.details?.username ? this.esc(l.details.username) : l.details?.title ? this.esc(l.details.title) : '-'}</td>
                  <td style="white-space:nowrap">${this.fmtDate(l.created_at)}</td>
                </tr>
                <tr class="audit-detail-row" id="audit-detail-${i}" style="display:none"><td colspan="5"></td></tr>
              `).join('') : '<tr><td colspan="5" class="admin-table-empty">Nessuna azione registrata</td></tr>'}
            </tbody>
          </table>
        </div>
        ${this.pagination(data.total, page, pageSize)}
      </div>
    `;

    // Click per espandere dettagli
    document.querySelectorAll('.audit-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = row.dataset.auditIdx;
        const detailRow = document.getElementById(`audit-detail-${idx}`);
        if (!detailRow) return;

        if (detailRow.style.display !== 'none') {
          detailRow.style.display = 'none';
          return;
        }

        const log = data.logs[idx];
        detailRow.querySelector('td').innerHTML = `
          <div class="audit-detail-content">
            <div class="audit-detail-grid">
              <div><span class="audit-detail-label">Azione</span><span>${this.esc(log.action)}</span></div>
              <div><span class="audit-detail-label">Tipo entità</span><span>${this.esc(log.entity_type)}</span></div>
              <div><span class="audit-detail-label">ID entità</span><span style="font-family:var(--font-family-mono);font-size:11px">${this.esc(log.entity_id || '-')}</span></div>
              <div><span class="audit-detail-label">Data e ora</span><span>${new Date(log.created_at).toLocaleString('it-IT')}</span></div>
            </div>
            <div class="audit-detail-details">
              <span class="audit-detail-label">Dettagli operazione</span>
              <div class="audit-detail-body">${this.formatAuditDetails(log.action, log.details)}</div>
            </div>
          </div>
        `;
        detailRow.style.display = '';
      });
    });

    this.bindPagination(() => (p, ps) => this.renderAudit(p, ps || pageSize));
  },

  // ============================================
  // SmartParse Templates
  // ============================================

  async renderSmartTemplates() {
    const main = document.querySelector('.admin-content');
    const { templates } = await this.api('smartparse-list-templates');

    const typeIcon = { flight: '✈', hotel: '🏨', train: '🚆', bus: '🚌', any: '📄' };

    // email- appartiene al tester (beta), non alla cache live
    const liveTemplates = templates.filter(t => !t.id.startsWith('beta:') && !t.id.startsWith('email-'));
    const betaTemplates = templates.filter(t => t.id.startsWith('beta:') || t.id.startsWith('email-'));

    const fmtDateTime = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
      const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return `${date} - ${time}`;
    };

    const buildRows = (list) => list.map(t => {
      const icon = typeIcon[t.doc_type] || '?';
      const fpShort = t.last_sample_fingerprint ? t.last_sample_fingerprint.substring(0, 12) + '...' : '—';
      const isEmail = t.id.startsWith('email-');
      const sourceBadge = isEmail
        ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#dbeafe;color:#1d4ed8;font-weight:700;margin-left:4px">Email</span>`
        : '';
      const nameDisplay = t.name ? `<span style="font-size:11px;color:var(--text-secondary);display:block;margin-top:2px">${this.esc(t.name.substring(0, 50))}</span>` : '';
      const wasUpdated = t.updated_at && t.created_at && t.updated_at !== t.created_at;
      return `
        <tr class="sp-tpl-row" data-tpl-id="${this.esc(t.id)}">
          <td>
            <code style="font-size:11px;color:var(--text-secondary)">${fpShort}</code>${sourceBadge}
            ${nameDisplay}
          </td>
          <td><span class="sp-tpl-type">${icon} ${t.doc_type}</span></td>
          <td class="sp-tpl-uses">${t.usage_count || 0}</td>
          <td style="color:var(--text-secondary);font-size:12px;white-space:nowrap">${fmtDateTime(t.created_at)}</td>
          <td style="color:${wasUpdated ? 'var(--text-primary)' : 'var(--text-secondary)'};font-size:12px;white-space:nowrap">${wasUpdated ? fmtDateTime(t.updated_at) : '—'}</td>
          <td class="sp-tpl-actions">
            <button class="admin-btn admin-btn-sm admin-btn-danger sp-tpl-delete-btn" data-tpl-id="${this.esc(t.id)}" data-tpl-name="${this.esc(t.name)}">Elimina</button>
          </td>
        </tr>`;
    }).join('');

    const buildTable = (list) => {
      if (list.length === 0) {
        return `<div style="padding:32px;text-align:center;color:var(--text-secondary)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:8px;display:block;margin-inline:auto"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <p style="margin:0;font-size:13px">Nessun documento in cache.</p>
        </div>`;
      }
      return `<div class="admin-table-wrapper">
        <table class="admin-table sp-tpl-table">
          <thead>
            <tr><th>Fingerprint</th><th>Tipo</th><th>Utilizzi</th><th>Creato</th><th>Aggiornato</th><th></th></tr>
          </thead>
          <tbody>${buildRows(list)}</tbody>
        </table>
      </div>`;
    };

    main.innerHTML = `
      <div class="admin-view-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <h1 style="margin:0;display:flex;align-items:center;gap:10px">
            SmartParse v2 Cache
          </h1>
          <button class="admin-btn admin-btn-secondary" id="btn-refresh-sptpl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Aggiorna
          </button>
        </div>
        <p style="margin:4px 0 0;color:var(--text-secondary);font-size:14px">${templates.length} documenti in cache — L1 cache hit = 0 chiamate Claude</p>
      </div>

      <!-- LIVE section -->
      <div class="sp-cache-section">
        <div class="sp-cache-section-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="sp-live-badge" style="font-size:10px;padding:2px 7px">LIVE</span>
            <span style="font-size:14px;font-weight:600;color:var(--text-primary)">${liveTemplates.length} documenti</span>
            <span style="font-size:12px;color:var(--text-secondary)">— Voli, Hotel</span>
          </div>
          ${liveTemplates.length > 0 ? `<button class="admin-btn admin-btn-sm admin-btn-danger" id="btn-clear-live-cache" style="font-size:11px">Svuota live</button>` : ''}
        </div>
        <div class="admin-card" style="padding:0;overflow:hidden">
          ${buildTable(liveTemplates)}
        </div>
      </div>

      <!-- BETA section -->
      <div class="sp-cache-section">
        <div class="sp-cache-section-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="sp-beta-badge" style="font-size:10px;padding:2px 7px">BETA</span>
            <span style="font-size:14px;font-weight:600;color:var(--text-primary)">${betaTemplates.length} documenti</span>
            <span style="font-size:12px;color:var(--text-secondary)">— Treni, Autobus</span>
          </div>
          ${betaTemplates.length > 0 ? `<button class="admin-btn admin-btn-sm admin-btn-danger" id="btn-clear-beta-cache" style="font-size:11px">Svuota beta</button>` : ''}
        </div>
        <div class="admin-card" style="padding:0;overflow:hidden">
          ${buildTable(betaTemplates)}
        </div>
      </div>`;

    this._setupSmartCacheView(templates, liveTemplates, betaTemplates);
  },

  _setupSmartCacheView(templates, liveTemplates, betaTemplates) {
    const main = document.querySelector('.admin-content');

    // Refresh
    main.querySelector('#btn-refresh-sptpl')?.addEventListener('click', () => this.renderSmartTemplates());

    // Clear live cache
    main.querySelector('#btn-clear-live-cache')?.addEventListener('click', async () => {
      const confirmed = await this.confirm(`Svuotare la cache Live (${liveTemplates.length} documenti)? I prossimi upload utente richiederanno Claude.`, 'Svuota cache Live');
      if (!confirmed) return;
      for (const t of liveTemplates) {
        try { await this.api('smartparse-delete-template', { id: t.id }); } catch (_) {}
      }
      this.toast('Cache Live svuotata', 'success');
      this.renderSmartTemplates();
    });

    // Clear beta cache
    main.querySelector('#btn-clear-beta-cache')?.addEventListener('click', async () => {
      const confirmed = await this.confirm(`Svuotare la cache Beta (${betaTemplates.length} documenti)? I template sperimentali verranno rimossi.`, 'Svuota cache Beta');
      if (!confirmed) return;
      for (const t of betaTemplates) {
        try { await this.api('smartparse-delete-template', { id: t.id }); } catch (_) {}
      }
      this.toast('Cache Beta svuotata', 'success');
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
    const styleMap = { success: 'success', error: 'error', extraction_failed: 'error', user_not_found: 'warning' };
    const labelMap = { success: 'OK', error: 'Errore', extraction_failed: 'Fallito', user_not_found: 'Utente non trovato' };
    return `<span class="admin-badge-status admin-badge-${styleMap[status] || 'neutral'}">${labelMap[status] || status.replace(/_/g, ' ')}</span>`;
  },

  pageSizeSelector(pageSize) {
    return `
      <div class="admin-pagination-size">
        <span style="font-size:12px;color:var(--color-gray-500)">Righe per pagina</span>
        <select class="admin-page-size-select" data-page-size>
          ${[10, 25, 50].map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    `;
  },

  pagination(total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize);

    return `
      <div class="admin-pagination">
        <div class="admin-pagination-info">${total > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} di ${total}` : '0 risultati'}</div>
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
    document.querySelectorAll('[data-page-size]').forEach(sel => {
      sel.addEventListener('change', () => {
        const fn = getNavFn();
        fn(1, parseInt(sel.value));
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
        <h1>PDF Tester</h1>
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
                  </span>
                </label>
              </div>
              <!-- SmartParse mode dropdown (visible only when SmartParse is selected) -->
              <div id="sp-mode-select" style="margin-top:8px">
                <div class="sp-mode-dropdown-wrap" id="sp-mode-dropdown-wrap">
                  <div class="sp-mode-selected" id="sp-mode-selected">
                    <span class="sp-beta-badge">BETA</span>
                    <span>Tutti i tipi (treni, autobus...)</span>
                    <svg class="sp-doctype-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div class="sp-mode-options" id="sp-mode-options">
                    <div class="sp-mode-option sp-mode-active" data-value="beta">
                      <span class="sp-beta-badge">BETA</span>
                      <span>Tutti i tipi (treni, autobus...)</span>
                    </div>
                    <div class="sp-mode-option" data-value="live">
                      <span class="sp-live-badge">LIVE</span>
                      <span>Voli + Hotel</span>
                    </div>
                  </div>
                  <input type="hidden" id="sp-mode-value" value="beta">
                </div>
              </div>
            </div>

            <!-- Tipo documento (custom dropdown with icons) -->
            <div style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Tipo documento</label>
              <div class="sp-doctype-dropdown" id="sp-doctype-dropdown">
                <div class="sp-doctype-selected" id="sp-doctype-selected">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  <span>Auto-detect</span>
                  <svg class="sp-doctype-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="sp-doctype-options" id="sp-doctype-options">
                  <div class="sp-doctype-option sp-doctype-active" data-value="auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    <span>Auto-detect</span>
                  </div>
                  <div class="sp-doctype-option" data-value="flight">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
                    <span>Volo</span>
                  </div>
                  <div class="sp-doctype-option" data-value="hotel">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>Hotel</span>
                  </div>
                  <div class="sp-doctype-option sp-doctype-beta-opt" data-value="train" style="display:none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/><path d="M8 19l-2 3"/><path d="M16 19l2 3"/></svg>
                    <span>Treno</span>
                    <span class="sp-beta-badge" style="margin-left:auto">BETA</span>
                  </div>
                  <div class="sp-doctype-option sp-doctype-beta-opt" data-value="bus" style="display:none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/><path d="M2 12h20"/></svg>
                    <span>Autobus</span>
                    <span class="sp-beta-badge" style="margin-left:auto">BETA</span>
                  </div>
                </div>
                <input type="hidden" name="pdf-doc-type" id="pdf-doc-type-value" value="auto">
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

    // ── Custom docType dropdown ──
    const doctypeDropdown = document.getElementById('sp-doctype-dropdown');
    const doctypeSelected = document.getElementById('sp-doctype-selected');
    const doctypeOptions  = document.getElementById('sp-doctype-options');
    const doctypeHidden   = document.getElementById('pdf-doc-type-value');

    doctypeSelected.addEventListener('click', () => {
      doctypeDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!doctypeDropdown.contains(e.target)) doctypeDropdown.classList.remove('open');
    });
    doctypeOptions.addEventListener('click', (e) => {
      const opt = e.target.closest('.sp-doctype-option');
      if (!opt || opt.style.display === 'none') return;
      // Update hidden input
      doctypeHidden.value = opt.dataset.value;
      // Update selected display: clone icon + label from option
      const svg = opt.querySelector('svg').cloneNode(true);
      const label = opt.querySelector('span').textContent;
      doctypeSelected.innerHTML = '';
      doctypeSelected.appendChild(svg);
      const span = document.createElement('span');
      span.textContent = label;
      doctypeSelected.appendChild(span);
      doctypeSelected.insertAdjacentHTML('beforeend',
        '<svg class="sp-doctype-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
      // Update active state
      doctypeOptions.querySelectorAll('.sp-doctype-option').forEach(o => o.classList.remove('sp-doctype-active'));
      opt.classList.add('sp-doctype-active');
      doctypeDropdown.classList.remove('open');
    });

    // ── Custom mode dropdown (Live/Beta) ──
    const spModeSelect = document.getElementById('sp-mode-select');
    const spModeWrap = document.getElementById('sp-mode-dropdown-wrap');
    const spModeSelectedEl = document.getElementById('sp-mode-selected');
    const spModeOptionsEl = document.getElementById('sp-mode-options');
    const spModeHidden = document.getElementById('sp-mode-value');

    spModeSelectedEl.addEventListener('click', () => {
      spModeWrap.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!spModeWrap.contains(e.target)) spModeWrap.classList.remove('open');
    });
    spModeOptionsEl.addEventListener('click', (e) => {
      const opt = e.target.closest('.sp-mode-option');
      if (!opt) return;
      spModeHidden.value = opt.dataset.value;
      // Clone inner content (badge + label) to selected display
      spModeSelectedEl.innerHTML = opt.innerHTML +
        '<svg class="sp-doctype-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      spModeOptionsEl.querySelectorAll('.sp-mode-option').forEach(o => o.classList.remove('sp-mode-active'));
      opt.classList.add('sp-mode-active');
      spModeWrap.classList.remove('open');
      updateBetaVisibility();
    });

    // ── Parser selector toggle — show/hide mode dropdown + beta docType options ──
    const resetDoctypeToAuto = () => {
      doctypeHidden.value = 'auto';
      const autoOpt = doctypeOptions.querySelector('[data-value="auto"]');
      const svg = autoOpt.querySelector('svg').cloneNode(true);
      doctypeSelected.innerHTML = '';
      doctypeSelected.appendChild(svg);
      const span = document.createElement('span');
      span.textContent = 'Auto-detect';
      doctypeSelected.appendChild(span);
      doctypeSelected.insertAdjacentHTML('beforeend',
        '<svg class="sp-doctype-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
      doctypeOptions.querySelectorAll('.sp-doctype-option').forEach(o => o.classList.remove('sp-doctype-active'));
      autoOpt.classList.add('sp-doctype-active');
    };

    const updateBetaVisibility = () => {
      const isSmart = document.querySelector('input[name="pdf-parser-type"]:checked')?.value === 'smart';
      const isBeta = isSmart && spModeHidden.value === 'beta';
      spModeSelect.style.display = isSmart ? '' : 'none';
      document.querySelectorAll('.sp-doctype-beta-opt').forEach(el => {
        el.style.display = isBeta ? '' : 'none';
      });
      if (!isBeta && (doctypeHidden.value === 'train' || doctypeHidden.value === 'bus')) {
        resetDoctypeToAuto();
      }
    };

    document.querySelectorAll('input[name="pdf-parser-type"]').forEach(radio => {
      radio.addEventListener('change', updateBetaVisibility);
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

      const docType    = document.getElementById('pdf-doc-type-value')?.value || 'auto';
      const parserType = document.querySelector('input[name="pdf-parser-type"]:checked')?.value || 'only-claude';
      const isSmart    = parserType === 'smart';
      const smartMode  = isSmart ? (document.getElementById('sp-mode-value')?.value || 'beta') : 'live';
      const resultEl   = document.getElementById('pdf-analyze-result');
      const total      = selectedFiles.length;
      const isMulti    = total > 1;

      runBtn.disabled = true;
      resultEl.innerHTML = '';
      const modeLabel = isSmart ? ` [${smartMode.toUpperCase()}]` : '';
      spLog(`─── Analisi avviata: ${total} file, parser=${parserType}${modeLabel}, docType=${docType} ───`, 'step');

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
          if (isSmart) {
            spLog(`▶ [${name}] Invio a analyze-pdf-smart (docType=${docType}, mode=${smartMode})`, 'step');
            res = await this.api('analyze-pdf-smart', { pdfBase64: base64, docType, mode: smartMode });

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
            const trainsFound = res.result?.trains?.length ?? 0;
            const busesFound = res.result?.buses?.length ?? 0;
            const totalFound = hotelsFound + flightsFound + trainsFound + busesFound;
            let extractedParts = [];
            if (flightsFound) extractedParts.push(`${flightsFound} voli`);
            if (hotelsFound) extractedParts.push(`${hotelsFound} hotel`);
            if (trainsFound) extractedParts.push(`${trainsFound} treni`);
            if (busesFound) extractedParts.push(`${busesFound} autobus`);
            spLog(`  Estratti: ${extractedParts.length ? extractedParts.join(', ') : '0 risultati'}`, totalFound > 0 ? 'ok' : 'warn');
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
          this._attachCopyBtns(placeholder);
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
