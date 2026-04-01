/**
 * Trip Page - Orchestrator: init, tab routing, shared state and helpers
 */
(async function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);

  /**
   * Escape attribute value for safe HTML insertion
   */
  function escAttr(val) {
    if (val == null) return '';
    return String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let currentTripData = null;
  let currentUserRole = 'proprietario'; // 'proprietario', 'viaggiatore', 'ospite'
  let currentTripOwner = null; // { username, email } if not owner
  let tabRendered = { activities: false, flights: false, hotels: false, trains: false, buses: false, ferries: false, rentals: false };
  let visibleTabs = []; // tab attualmente visibili (calcolati dinamicamente)

  // ===========================
  // Shared API exposed to modules
  // ===========================

  window.tripPage = {
    get currentTripData() { return currentTripData; },
    set currentTripData(v) { currentTripData = v; },
    get userRole() { return currentUserRole; },
    esc,
    escAttr,
    loadTripFromUrl,
    switchToTab,
    rerenderCurrentTab,
    loadSlidePanel,
    showAddBookingModal,
    showManageBookingPanel,
    getVisibleTabs,

    /**
     * Re-init per navigazione SPA (moduli già caricati, auth/i18n già inizializzati)
     */
    async spaInit() {
      // Reset stato viaggio
      tabRendered = { activities: false, flights: false, hotels: false, trains: false, buses: false, ferries: false, rentals: false };
      visibleTabs = [];
      currentTripData = null;
      currentUserRole = 'proprietario';
      currentTripOwner = null;

      // Cleanup FAB e bottom sheet dalla navigazione precedente
      const oldFab = document.getElementById('trip-fab');
      if (oldFab) oldFab.remove();
      const oldSheet = document.getElementById('fab-bottom-sheet');
      if (oldSheet) oldSheet.remove();

      preloadHeroFromCache();
      i18n.apply();

      // Hamburger gestito via event delegation in navigation.initSidebar

      if (!auth?.requireAuth()) return;
      await loadTripFromUrl();
    },
  };

  // ===========================
  // Lazy-loaded modules
  // ===========================

  async function loadSlidePanel() {
    if (!window.tripSlidePanel) {
      await import('./tripSlidePanel.js');
    }
    return window.tripSlidePanel;
  }

  /**
   * Re-render the current tab and reset activities (which derives from flights+hotels)
   */
  function rerenderCurrentTab() {
    const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab
      || (visibleTabs.length > 0 ? visibleTabs[0] : 'activities');
    // Reset the active tab and activities (since activities depends on flights+hotels)
    tabRendered[activeTab] = false;
    tabRendered.activities = false;
    renderTab(activeTab);
  }

  // ===========================
  // Init
  // ===========================

  /**
   * Pre-populate hero from cached trip data (instant, no network)
   */
  function preloadHeroFromCache() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');
    if (!tripId) return;

    try {
      const cached = JSON.parse(sessionStorage.getItem('trips_cache'));
      if (!cached?.trips) return;
      const trip = cached.trips.find(t => t.id === tripId);
      if (!trip) return;

      const lang = document.documentElement.lang || 'it';
      const hero = document.getElementById('trip-hero');
      const titleEl = document.getElementById('trip-title');
      const datesEl = document.getElementById('trip-dates');

      if (trip.coverPhoto?.url && hero) {
        hero.style.backgroundImage = `url('${trip.coverPhoto.url}')`;
      }
      if (trip.title && titleEl) {
        titleEl.textContent = trip.title[lang] || trip.title.en || trip.title.it || '';
      }
      if (trip.startDate && trip.endDate && datesEl) {
        const start = utils.formatDate(trip.startDate, lang, { month: 'short', day: 'numeric' });
        const end = utils.formatDate(trip.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
        datesEl.textContent = `${start} - ${end}`;
      }
      // Rimuovi skeleton se i dati dalla cache sono sufficienti
      if (hero && trip.title) {
        hero.classList.remove('is-loading');
      }
    } catch (e) {
      // Cache miss or parse error — no problem, API will fill it
    }
  }

  /**
   * Initialize the trip page
   */
  async function init() {
    try {
      // Pre-populate hero instantly from homepage cache (before any async work)
      preloadHeroFromCache();

      // Initialize i18n first
      await i18n.init();

      // Initialize auth
      if (typeof auth !== 'undefined') {
        await auth.init();

        // Apply language preference from profile if available
        if (auth.profile?.language_preference) {
          await i18n.setLang(auth.profile.language_preference);
        }
      }

      // Apply translations
      i18n.apply();

      // Il link "Indietro" (#trip-close-btn) è un <a href="/index.html">
      // La navigazione è gestita dal SPA navigation in initSpaNavigation()
      // Nessun listener JS necessario qui

      // Initialize trip creator (for "Change photo" feature)
      if (window.tripCreator) {
        window.tripCreator.init();
      }

      // Auto-hide header on scroll
      if (window.navigation?.initAutoHideHeader) {
        window.navigation.initAutoHideHeader();
      }

      // Sidebar (trip.html non chiama navigation.init, quindi inizializziamo qui)
      // Hamburger ora è nell'HTML statico, gestito via event delegation
      if (auth?.isAuthenticated() && window.navigation) {
        const profile = auth.profile;
        const isAdmin = auth.session?.user?.email === 'fstagno@idibgroup.com';
        window.navigation.wrapContentArea();
        window.navigation.renderSidebar(profile, isAdmin);
        window.navigation.initSidebar();
      }

      // Load trip data from URL parameter (requires auth)
      if (!auth?.requireAuth()) {
        return;
      }
      await loadTripFromUrl();

    } catch (error) {
      console.error('Error initializing trip page:', error);
      showError('Could not load trip data');
    }
  }

  /**
   * Load trip from URL parameter
   */
  async function loadTripFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
      showError('No trip ID provided');
      return;
    }

    try {
      // Load trip from Supabase via Netlify Function (authenticated)
      const response = await utils.authFetch(`/.netlify/functions/get-trip?id=${encodeURIComponent(tripId)}`);
      const result = await response.json();

      if (!result.success || !result.tripData) {
        showError('Trip not found');
        return;
      }

      currentTripData = result.tripData;
      currentUserRole = result.role || 'proprietario';
      currentTripOwner = result.owner || null;
      renderTrip(result.tripData);
      if (typeof window.__perfMarkTripLoaded === 'function') window.__perfMarkTripLoaded();

      // Apri pannello edit se reindirizzati da pendingBookingModal (click "Modifica")
      const pendingEditRaw = sessionStorage.getItem('pendingBookingEdit');
      if (pendingEditRaw) {
        sessionStorage.removeItem('pendingBookingEdit');
        try {
          const { type, id } = JSON.parse(pendingEditRaw);
          setTimeout(() => openEditPanelForItem(type, id), 300);
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error loading trip:', error);
      console.error('Error stack:', error.stack);
      showError('Could not load trip data');
    }
  }

  /**
   * Show error message
   * @param {string} message
   */
  function showError(message) {
    const content = document.getElementById('trip-content');
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3 class="empty-state-title" data-i18n="common.error">Error</h3>
        <p class="empty-state-text">${esc(message)}</p>
        <a href="./" class="btn btn-primary" data-i18n="common.backHome">Back to home</a>
      </div>
    `;
    i18n.apply(content);
  }

  // ===========================
  // Render trip
  // ===========================

  /**
   * Render trip data
   * @param {Object} tripData
   */
  function renderTrip(tripData) {
    const lang = i18n.getLang();

    // Update page title
    const title = tripData.title[lang] || tripData.title.en || tripData.title.it;
    document.title = `${title} - Travel Flow`;
    const titleEl = document.getElementById('trip-title');
    titleEl.textContent = title;

    // Update dates
    if (tripData.startDate && tripData.endDate) {
      const start = utils.formatDate(tripData.startDate, lang, { month: 'short', day: 'numeric' });
      const end = utils.formatDate(tripData.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('trip-dates').textContent = `${start} - ${end}`;
    }

    // Set hero background image from cover photo
    const hero = document.getElementById('trip-hero');
    if (tripData.coverPhoto?.url) {
      hero.style.backgroundImage = `url('${tripData.coverPhoto.url}')`;
    }
    hero.classList.remove('is-loading');

    // Render content
    renderTripContent(document.getElementById('trip-content'), tripData);
  }

  // Configurazione icone e label per ciascun tab
  const TAB_CONFIG = {
    activities: { icon: 'calendar_today',  i18nKey: 'trip.activities', fallback: 'Attività' },
    flights:    { icon: 'travel',          i18nKey: 'trip.flights',    fallback: 'Voli' },
    hotels:     { icon: 'bed',             i18nKey: 'trip.hotels',     fallback: 'Hotel' },
    trains:     { icon: 'train',           i18nKey: 'trip.trains',     fallback: 'Treni', beta: true },
    buses:      { icon: 'directions_bus',  i18nKey: 'trip.buses',      fallback: 'Bus', beta: true },
    ferries:    { icon: 'directions_boat', i18nKey: 'trip.ferries',    fallback: 'Traghetti', beta: true },
    rentals:    { iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.8L18 11l-2-4H8L6 11l-2.5.2C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`, i18nKey: 'trip.rentals', fallback: 'Auto' },
  };

  /**
   * Calcola i tab da mostrare in base ai dati del viaggio
   */
  function getVisibleTabs(tripData) {
    const tabs = [];
    const hasAnyData = (tripData.flights?.length > 0) ||
                       (tripData.hotels?.length > 0) ||
                       (tripData.trains?.length > 0) ||
                       (tripData.buses?.length > 0) ||
                       (tripData.ferries?.length > 0) ||
                       (tripData.rentals?.length > 0) ||
                       (tripData.activities?.length > 0);
    if (hasAnyData) tabs.push('activities');
    if (tripData.flights?.length > 0) tabs.push('flights');
    if (tripData.hotels?.length > 0) tabs.push('hotels');
    if (tripData.trains?.length > 0) tabs.push('trains');
    if (tripData.buses?.length > 0) tabs.push('buses');
    if (tripData.ferries?.length > 0) tabs.push('ferries');
    if (tripData.rentals?.length > 0) tabs.push('rentals');
    return tabs;
  }

  /**
   * Render trip content with dynamic segmented control
   * @param {HTMLElement} container
   * @param {Object} tripData
   */
  function renderTripContent(container, tripData) {
    // Calcola tab visibili
    visibleTabs = getVisibleTabs(tripData);

    // Render floating tab bar inside hero (solo se 2+ tab)
    const heroTabs = document.getElementById('trip-hero-tabs');
    if (visibleTabs.length >= 2) {
      const tabButtons = visibleTabs.map(tabName => {
        const cfg = TAB_CONFIG[tabName];
        return `
          <button class="segmented-control-btn" data-tab="${tabName}">
            ${cfg.iconSvg ? cfg.iconSvg : `<span class="material-symbols-outlined" style="font-size: 20px;">${cfg.icon}</span>`}
            <span${tabName === 'trains' || tabName === 'buses' || tabName === 'ferries' || tabName === 'rentals' ? ' class="segmented-label"' : ''} data-i18n="${cfg.i18nKey}">${cfg.fallback}</span>
            ${cfg.beta ? '<span class="beta-badge-tab">Beta</span>' : ''}
          </button>
        `;
      }).join('');

      heroTabs.innerHTML = `
        <div class="segmented-control${visibleTabs.length >= 4 ? ' segmented-control--compact' : ''}">
          <div class="segmented-indicator"></div>
          ${tabButtons}
        </div>
      `;
    } else {
      heroTabs.innerHTML = '';
    }

    // Genera contenitori tab solo per quelli visibili (o empty state se 0 tab)
    if (visibleTabs.length === 0) {
      // Trip vuoto: empty state globale
      const luggageSvg = '<svg class="trip-empty-state-icon" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="21" x2="8" y2="22"/><line x1="16" y1="21" x2="16" y2="22"/></svg>';
      const uploadBtnSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
      const eventBtnSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>';
      container.innerHTML = `
        <div class="trip-empty-state">
          ${luggageSvg}
          <h2 class="trip-empty-state-title" data-i18n="trip.emptyTripTitle">Inizia ad organizzare il tuo viaggio</h2>
          <p class="trip-empty-state-text" data-i18n="trip.emptyTripText">Carica un PDF di prenotazione o aggiungi un'attività personalizzata</p>
          <div class="trip-empty-state-actions">
            <button class="btn btn-primary" id="empty-trip-upload">
              ${uploadBtnSvg}
              <span data-i18n="trip.uploadBooking">Carica prenotazione</span>
            </button>
            <button class="btn btn-outline" id="empty-trip-activity">
              ${eventBtnSvg}
              <span data-i18n="trip.addActivity">Aggiungi attività</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Genera solo i tab-content necessari
      const tabsHtml = visibleTabs.map(tabName => `
        <div id="${tabName}-tab" class="tab-content">
          <div id="${tabName}-container"></div>
        </div>
      `).join('');
      container.innerHTML = tabsHtml;
    }

    // Reset tab render state
    tabRendered = { activities: false, flights: false, hotels: false, trains: false, buses: false, ferries: false, rentals: false };

    // Initialize tab switching (solo se ci sono tab)
    if (visibleTabs.length >= 2) {
      initTabSwitching();
    }

    // Determine which tab to show
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isRefresh = navEntry && navEntry.type === 'reload';
    const savedTab = isRefresh ? sessionStorage.getItem('tripActiveTab') : null;

    let activeTab;
    if (visibleTabs.length === 0) {
      activeTab = null;
    } else if (urlTab && visibleTabs.includes(urlTab)) {
      activeTab = urlTab;
    } else if (savedTab && visibleTabs.includes(savedTab)) {
      activeTab = savedTab;
    } else {
      activeTab = visibleTabs[0];
    }

    if (activeTab) {
      renderTab(activeTab);
      switchToTab(activeTab);
      if (visibleTabs.length >= 2) showIndicator();
    }

    // Render header menu (three dots in top-right)
    renderHeaderMenu();
    initMenu(tripData.id);

    // Setup event delegation on tab containers
    setupEventDelegation();

    // FAB per aggiungere contenuti
    renderFab(tripData.id);

    // Empty state CTA wiring
    if (visibleTabs.length === 0) {
      const uploadBtn = document.getElementById('empty-trip-upload');
      if (uploadBtn) uploadBtn.addEventListener('click', () => triggerFabUpload());
      const activityBtn = document.getElementById('empty-trip-activity');
      if (activityBtn) activityBtn.addEventListener('click', () => triggerFabActivity());
    }

    // Apply permission-based UI gating
    applyPermissionGating();

    // Apply translations
    i18n.apply(container);
    i18n.apply(heroTabs);

    // Deep link: scroll to specific item or open activity panel
    handleDeepLink(urlParams, tripData);
  }

  // ===========================
  // FAB + Bottom Sheet
  // ===========================

  function renderFab(tripId) {
    // Rimuovi FAB precedente se esiste
    const existingFab = document.getElementById('trip-fab');
    if (existingFab) existingFab.remove();
    const existingSheet = document.getElementById('fab-bottom-sheet');
    if (existingSheet) existingSheet.remove();

    // FAB
    const fab = document.createElement('button');
    fab.className = 'trip-fab';
    fab.id = 'trip-fab';
    fab.setAttribute('aria-label', i18n.t('modal.add') || 'Aggiungi');
    fab.innerHTML = '<svg class="trip-fab-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    document.body.appendChild(fab);

    // SVG per le opzioni del bottom sheet
    const uploadSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
    const eventSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>`;

    // Bottom Sheet overlay
    const sheetOverlay = document.createElement('div');
    sheetOverlay.className = 'fab-bottom-sheet-overlay';
    sheetOverlay.id = 'fab-bottom-sheet';
    sheetOverlay.innerHTML = `
      <div class="fab-bottom-sheet">
        <div class="fab-bottom-sheet-handle"></div>
        <div class="fab-bottom-sheet-options">
          <button class="fab-bottom-sheet-option" data-action="upload">
            <span class="fab-bottom-sheet-option-icon fab-bottom-sheet-option-icon--upload">${uploadSvg}</span>
            <div class="fab-bottom-sheet-option-text">
              <span class="fab-bottom-sheet-option-title" data-i18n="trip.uploadBooking">Carica prenotazione</span>
              <span class="fab-bottom-sheet-option-desc" data-i18n="trip.uploadBookingDesc">PDF di volo, hotel, treno o bus</span>
            </div>
          </button>
          <button class="fab-bottom-sheet-option" data-action="activity">
            <span class="fab-bottom-sheet-option-icon fab-bottom-sheet-option-icon--activity">${eventSvg}</span>
            <div class="fab-bottom-sheet-option-text">
              <span class="fab-bottom-sheet-option-title" data-i18n="trip.addActivity">Aggiungi attività</span>
              <span class="fab-bottom-sheet-option-desc" data-i18n="trip.addActivityDesc">Escursione, ristorante, visita...</span>
            </div>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(sheetOverlay);
    i18n.apply(sheetOverlay);

    const toggleSheet = (show) => {
      if (show) {
        sheetOverlay.classList.add('active');
        fab.classList.add('active');
      } else {
        sheetOverlay.classList.remove('active');
        fab.classList.remove('active');
      }
    };

    fab.addEventListener('click', () => {
      toggleSheet(!sheetOverlay.classList.contains('active'));
    });

    // Chiudi cliccando fuori
    sheetOverlay.addEventListener('click', (e) => {
      if (e.target === sheetOverlay) toggleSheet(false);
    });

    // Azioni
    sheetOverlay.querySelectorAll('.fab-bottom-sheet-option').forEach(opt => {
      opt.addEventListener('click', () => {
        toggleSheet(false);
        if (opt.dataset.action === 'upload') {
          triggerFabUpload();
        } else if (opt.dataset.action === 'activity') {
          triggerFabActivity();
        }
      });
    });

    // Chiudi con Escape
    const escHandler = (e) => {
      if (e.key === 'Escape' && sheetOverlay.classList.contains('active')) {
        toggleSheet(false);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function triggerFabUpload() {
    const tripId = currentTripData?.id;
    if (tripId) showAddBookingModal(tripId);
  }

  async function triggerFabActivity() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const defaultDate = (currentTripData && todayStr >= currentTripData.startDate && todayStr <= currentTripData.endDate)
      ? todayStr
      : (currentTripData?.startDate || todayStr);
    const sp = await loadSlidePanel();
    sp.show('create', defaultDate, null);
  }

  /**
   * Hide UI elements based on user's role
   */
  function applyPermissionGating() {
    if (currentUserRole === 'ospite') {
      // Hide all upload/add/edit/delete UI for guests
      document.body.classList.add('role-ospite');
    } else if (currentUserRole === 'viaggiatore') {
      document.body.classList.add('role-viaggiatore');
    }

    // Badge ruolo nell'hero (alto a destra)
    if (currentUserRole !== 'proprietario') {
      const badgeEl = document.getElementById('trip-hero-role-badge');
      if (badgeEl) {
        const roleLabel = currentUserRole === 'viaggiatore'
          ? (i18n.t('share.roleViaggiatore') || 'Viaggiatore')
          : (i18n.t('share.roleOspite') || 'Ospite');
        const badgeClass = currentUserRole === 'viaggiatore' ? 'trip-role-badge--viaggiatore' : 'trip-role-badge--ospite';
        badgeEl.className = `trip-hero-role-badge trip-role-badge ${badgeClass}`;
        badgeEl.textContent = roleLabel;
      }
    }

    // Organizzatore sotto le date
    if (currentTripOwner && currentUserRole !== 'proprietario') {
      const metaEl = document.querySelector('.trip-hero-meta');
      if (metaEl) {
        const ownerDisplayName = currentTripOwner.fullName || currentTripOwner.username || currentTripOwner.email;
        metaEl.insertAdjacentHTML('afterend',
          `<div class="trip-owner-info">
            <span class="trip-owner-name">${i18n.t('trip.organizer') || 'Organizzatore'}: <strong>${esc(ownerDisplayName)}</strong></span>
          </div>`);
      }
    }
  }

  /**
   * Handle deep-link URL params: scroll to item or open activity panel
   */
  async function handleDeepLink(urlParams, tripData) {
    const itemId = urlParams.get('itemId');
    const activityId = urlParams.get('activityId');

    if (itemId) {
      // Scroll to a specific flight or hotel card
      setTimeout(() => {
        const card = document.querySelector(`[data-id="${CSS.escape(itemId)}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-card');
          setTimeout(() => card.classList.remove('highlight-card'), 1500);
        }
      }, 150);
    } else if (activityId) {
      // Open the activity slide panel
      const activity = tripData.activities?.find(a => a.id === activityId);
      if (activity) {
        setTimeout(async () => {
          const sp = await loadSlidePanel();
          sp.show('view', null, activity);
        }, 150);
      }
    }

    // Clean deep-link params from URL (keep only ?id=)
    if (itemId || activityId || urlParams.get('tab')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('tab');
      cleanUrl.searchParams.delete('itemId');
      cleanUrl.searchParams.delete('activityId');
      window.history.replaceState(null, '', cleanUrl.toString());
    }
  }

  // ===========================
  // Event delegation
  // ===========================

  /**
   * Handle PDF download (shared by flights and hotels)
   */
  async function handlePdfDownload(pdfPath, btn) {
    if (!pdfPath) return;
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    const svg = btn.querySelector('svg');
    if (svg) svg.style.opacity = '0.5';

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    let newWindow = null;
    if (isIOS) {
      newWindow = window.open('about:blank', '_blank');
    }

    try {
      const response = await utils.authFetch(`/.netlify/functions/get-pdf-url?path=${encodeURIComponent(pdfPath)}`);
      const result = await response.json();

      if (result.success && result.url) {
        if (newWindow) {
          newWindow.location.href = result.url;
        } else {
          window.open(result.url, '_blank');
        }
      } else {
        if (newWindow) newWindow.close();
        throw new Error(result.error || 'Failed to get PDF URL');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (newWindow) newWindow.close();
      alert(i18n.t('common.downloadError') || 'Error downloading PDF');
    } finally {
      btn.disabled = false;
      if (svg) svg.style.opacity = '1';
      // Restore content for large PDF buttons that replaced innerHTML
      if (btn.classList.contains('btn-download-pdf')) {
        btn.innerHTML = originalContent;
      }
    }
  }

  /**
   * Upload PDF per un passeggero che ne è sprovvisto
   */
  async function handleUploadPassengerPdf(btn) {
    const flightId = btn.dataset.flightId;
    const passengerIndex = parseInt(btn.dataset.passengerIndex);
    const passengerName = btn.dataset.passengerName;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      btn.disabled = true;
      const origText = btn.querySelector('span');
      if (origText) origText.textContent = '...';

      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await utils.authFetch('/.netlify/functions/add-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload-passenger-pdf',
            tripId: currentTripData?.id,
            flightId,
            passengerIndex,
            pdfBase64: base64,
            fileName: file.name
          })
        });

        const result = await response.json();
        if (result.success) {
          utils.showToast('PDF caricato', 'success');

          // Aggiorna currentTripData in-place
          const normN = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const thisFlight = currentTripData?.flights?.find(f => f.id === flightId);
          const bookingRef = (thisFlight?.bookingReference || '').toLowerCase().trim();
          const paxNorm = normN(passengerName);

          // Aggiorna tutti i voli con stesso bookingRef per lo stesso passeggero
          for (const f of (currentTripData?.flights || [])) {
            if (bookingRef && (f.bookingReference || '').toLowerCase().trim() !== bookingRef) continue;
            if (!bookingRef && f.id !== flightId) continue;
            if (!f.passengers) continue;

            const pIdx = f.passengers.findIndex(p => normN(p.name) === paxNorm);
            if (pIdx >= 0) {
              f.passengers[pIdx].pdfPath = result.pdfPath;

              // Aggiorna la card UI: sostituisci bottone upload con download
              const flightCard = document.querySelector(`.flight-card[data-id="${f.id}"]`);
              if (!flightCard) continue;
              const paxItems = flightCard.querySelectorAll('.flight-passenger-item');
              const paxItem = paxItems[pIdx];
              if (!paxItem) continue;

              const uploadBtn = paxItem.querySelector('.btn-upload-pdf-small');
              if (uploadBtn) {
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn-download-pdf-small';
                downloadBtn.dataset.pdfPath = result.pdfPath;
                downloadBtn.title = 'Download PDF';
                downloadBtn.innerHTML = `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>PDF</span>`;
                uploadBtn.replaceWith(downloadBtn);
              }

              // Aggiorna anche nel menu dropdown
              const menuUploadBtn = paxItem.querySelector('[data-action="upload-pdf"]');
              if (menuUploadBtn) {
                menuUploadBtn.dataset.action = 'download-pdf';
                menuUploadBtn.dataset.pdfPath = result.pdfPath;
                delete menuUploadBtn.dataset.flightId;
                delete menuUploadBtn.dataset.passengerIndex;
                delete menuUploadBtn.dataset.passengerName;
                menuUploadBtn.querySelector('svg polyline')?.setAttribute('points', '7 10 12 15 17 10');
                const label = menuUploadBtn.querySelector('span');
                if (label) label.textContent = i18n.t('flight.downloadPdf') || 'Scarica PDF';
              }
            }
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error uploading passenger PDF:', error);
        utils.showToast('Errore nel caricamento', 'error');
        btn.disabled = false;
        if (origText) origText.textContent = 'Carica PDF';
      }
    };
    input.click();
  }

  /**
   * Handle copy to clipboard
   */
  async function handleCopyValue(btn) {
    const value = btn.dataset.copy;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  }

  /**
   * Handle toggle details (flights or hotels) with lazy rendering
   */
  function handleToggleDetails(btn, type) {
    const indexAttrMap = { flight: 'flightIndex', hotel: 'hotelIndex', train: 'trainIndex', bus: 'busIndex', ferry: 'ferryIndex', rental: 'rentalIndex' };
    const indexAttr = indexAttrMap[type] || 'flightIndex';
    const index = btn.dataset[indexAttr];
    const detailsId = `${type}-details-${index}`;
    const details = document.getElementById(detailsId);
    if (!details) return;

    // Lazy render details on first expand
    if (!details.dataset.rendered) {
      const itemsMap = {
        flight: window.tripFlights._flights,
        hotel: window.tripHotels._hotels,
        train: window.tripTrains._trains,
        bus: window.tripBuses._buses,
        ferry: window.tripFerries._ferries,
        rental: window.tripRentals._rentals
      };
      const renderFnMap = {
        flight: window.tripFlights.renderDetails,
        hotel: window.tripHotels.renderDetails,
        train: window.tripTrains.renderDetails,
        bus: window.tripBuses.renderDetails,
        ferry: window.tripFerries.renderDetails,
        rental: window.tripRentals.renderDetails
      };
      const items = itemsMap[type];
      const renderFn = renderFnMap[type];
      if (items && items[index] && renderFn) {
        details.innerHTML = renderFn(items[index], index);
        details.dataset.rendered = 'true';
        i18n.apply(details);
      }
    }

    const isActive = details.classList.toggle('active');
    btn.classList.toggle('active', isActive);

    const textSpan = btn.querySelector('span[data-i18n]');
    if (textSpan) {
      const hideKey = 'flight.hideDetails';
      const showKey = 'flight.showDetails';
      textSpan.dataset.i18n = isActive ? hideKey : showKey;
      textSpan.textContent = i18n.t(textSpan.dataset.i18n);
    }
  }

  /**
   * Setup delegated event listeners on tab containers
   */
  function setupEventDelegation() {
    const flightsContainer = document.getElementById('flights-container');
    const hotelsContainer = document.getElementById('hotels-container');
    const activitiesContainer = document.getElementById('activities-container');

    // --- Flights container delegation ---
    if (flightsContainer) {
      flightsContainer.addEventListener('click', (e) => {
        const target = e.target;

        // Toggle details
        const toggleBtn = target.closest('.flight-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'flight'); return; }

        // Edit item
        const editBtn = target.closest('.btn-edit-item[data-type="flight"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('flight', editBtn.dataset.id); return; }

        // Delete item
        const deleteBtn = target.closest('.btn-delete-item[data-type="flight"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('flight', deleteBtn.dataset.id); return; }

        // Download PDF (large button)
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }

        // Download PDF (small, multi-passenger)
        const smallPdfBtn = target.closest('.btn-download-pdf-small');
        if (smallPdfBtn) { e.stopPropagation(); handlePdfDownload(smallPdfBtn.dataset.pdfPath, smallPdfBtn); return; }

        // Upload PDF per passeggero senza PDF
        const uploadPdfBtn = target.closest('.btn-upload-pdf-small');
        if (uploadPdfBtn) { e.stopPropagation(); handleUploadPassengerPdf(uploadPdfBtn); return; }

        // Delete passenger
        const delPassBtn = target.closest('.btn-delete-passenger');
        if (delPassBtn) {
          e.stopPropagation();
          window.tripFlights.showDeletePassengerModal(delPassBtn.dataset.passengerName, delPassBtn.dataset.bookingRef);
          return;
        }

        // Passenger menu toggle
        const menuBtn = target.closest('.btn-passenger-menu');
        if (menuBtn) {
          e.stopPropagation();
          const dropdown = menuBtn.nextElementSibling;
          const wasActive = dropdown?.classList.contains('active');
          document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => d.classList.remove('active'));
          if (!wasActive && dropdown) dropdown.classList.add('active');
          return;
        }

        // Passenger menu item
        const menuItem = target.closest('.passenger-menu-item');
        if (menuItem) {
          e.stopPropagation();
          const action = menuItem.dataset.action;
          const dropdown = menuItem.closest('.passenger-menu-dropdown');
          dropdown?.classList.remove('active');

          if (action === 'download-pdf') {
            handlePdfDownload(menuItem.dataset.pdfPath, menuItem);
          } else if (action === 'upload-pdf') {
            handleUploadPassengerPdf(menuItem);
          } else if (action === 'delete-passenger') {
            window.tripFlights.showDeletePassengerModal(menuItem.dataset.passengerName, menuItem.dataset.bookingRef);
          }
          return;
        }

        // Copy value
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }
      });
    }

    // --- Hotels container delegation ---
    if (hotelsContainer) {
      hotelsContainer.addEventListener('click', (e) => {
        const target = e.target;

        // Toggle details
        const toggleBtn = target.closest('.hotel-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'hotel'); return; }

        // Edit item
        const editBtn = target.closest('.btn-edit-item[data-type="hotel"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('hotel', editBtn.dataset.id); return; }

        // Delete item
        const deleteBtn = target.closest('.btn-delete-item[data-type="hotel"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('hotel', deleteBtn.dataset.id); return; }

        // Download PDF
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }

        // Copy value
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }

        // Header confirmation copy
        const confBtn = target.closest('.hotel-header-confirmation');
        if (confBtn) { e.preventDefault(); handleCopyValue(confBtn); return; }
      });
    }

    // --- Trains container delegation ---
    const trainsContainer = document.getElementById('trains-container');
    if (trainsContainer) {
      trainsContainer.addEventListener('click', (e) => {
        const target = e.target;
        const toggleBtn = target.closest('.train-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'train'); return; }
        const editBtn = target.closest('.btn-edit-item[data-type="train"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('train', editBtn.dataset.id); return; }
        const deleteBtn = target.closest('.btn-delete-item[data-type="train"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('train', deleteBtn.dataset.id); return; }
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }
      });
    }

    // --- Buses container delegation ---
    const busesContainer = document.getElementById('buses-container');
    if (busesContainer) {
      busesContainer.addEventListener('click', (e) => {
        const target = e.target;
        const toggleBtn = target.closest('.bus-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'bus'); return; }
        const editBtn = target.closest('.btn-edit-item[data-type="bus"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('bus', editBtn.dataset.id); return; }
        const deleteBtn = target.closest('.btn-delete-item[data-type="bus"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('bus', deleteBtn.dataset.id); return; }
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }
      });
    }

    // --- Ferries container delegation ---
    const ferriesContainer = document.getElementById('ferries-container');
    if (ferriesContainer) {
      ferriesContainer.addEventListener('click', (e) => {
        const target = e.target;
        const toggleBtn = target.closest('.ferry-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'ferry'); return; }
        const editBtn = target.closest('.btn-edit-item[data-type="ferry"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('ferry', editBtn.dataset.id); return; }
        const deleteBtn = target.closest('.btn-delete-item[data-type="ferry"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('ferry', deleteBtn.dataset.id); return; }
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }
      });
    }

    // --- Rentals container delegation ---
    const rentalsContainer = document.getElementById('rentals-container');
    if (rentalsContainer) {
      rentalsContainer.addEventListener('click', (e) => {
        const target = e.target;
        const toggleBtn = target.closest('.rental-toggle-details');
        if (toggleBtn) { handleToggleDetails(toggleBtn, 'rental'); return; }
        const editBtn = target.closest('.btn-edit-item[data-type="rental"]');
        if (editBtn) { e.stopPropagation(); openEditPanelForItem('rental', editBtn.dataset.id); return; }
        const deleteBtn = target.closest('.btn-delete-item[data-type="rental"]');
        if (deleteBtn) { e.stopPropagation(); showDeleteItemModal('rental', deleteBtn.dataset.id); return; }
        const pdfBtn = target.closest('.btn-download-pdf');
        if (pdfBtn) { e.stopPropagation(); handlePdfDownload(pdfBtn.dataset.pdfPath, pdfBtn); return; }
        const copyBtn = target.closest('.btn-copy-value');
        if (copyBtn) { handleCopyValue(copyBtn); return; }
      });
    }

    // --- Activities container delegation ---
    if (activitiesContainer) {
      activitiesContainer.addEventListener('click', async (e) => {
        const target = e.target;

        // Activity link (navigate to flights/hotels tab)
        const activityLink = target.closest('.activity-item-link:not(.activity-item-link--custom)');
        if (activityLink) {
          e.preventDefault();
          const tab = activityLink.dataset.tab;
          const itemId = activityLink.dataset.itemId;
          if (tab) {
            switchToTab(tab);
            if (itemId) {
              setTimeout(() => {
                const card = document.querySelector(`[data-id="${itemId}"]`);
                if (card) {
                  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  card.classList.add('highlight-card');
                  setTimeout(() => card.classList.remove('highlight-card'), 1500);
                }
              }, 100);
            }
          }
          return;
        }

        // Custom activity link (open slide panel)
        const customLink = target.closest('.activity-item-link--custom');
        if (customLink) {
          e.preventDefault();
          const activityId = customLink.dataset.activityId;
          const activity = currentTripData?.activities?.find(a => a.id === activityId);
          if (activity) {
            const sp = await loadSlidePanel();
            sp.show('view', null, activity);
          }
          return;
        }

        // New activity button
        const newBtn = target.closest('.activity-new-btn');
        if (newBtn) {
          const sp = await loadSlidePanel();
          sp.show('create', newBtn.dataset.date, null);
          return;
        }
      });
    }

    // Close passenger menus on outside click (once per setup)
    document.addEventListener('click', () => {
      document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => d.classList.remove('active'));
    });
  }

  // ===========================
  // Tab switching
  // ===========================

  function updateSegmentedIndicator(activeBtn) {
    const indicator = document.querySelector('.segmented-control > .segmented-indicator');
    if (!indicator || !activeBtn) return;
    const control = activeBtn.parentElement;
    const controlPadding = parseFloat(getComputedStyle(control).paddingLeft) || 0;
    indicator.style.width = activeBtn.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + (activeBtn.offsetLeft - controlPadding) + 'px)';
  }

  function initTabSwitching() {
    const tabs = document.querySelectorAll('.segmented-control-btn');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchToTab(targetTab);
      });
    });
  }

  /**
   * Position indicator on the active tab without animation (call after switchToTab on init)
   */
  function showIndicator() {
    const indicator = document.querySelector('.segmented-control > .segmented-indicator');
    const activeBtn = document.querySelector('.segmented-control-btn.active[data-tab]');
    if (!indicator || !activeBtn) return;

    // Position without animation, then reveal
    indicator.style.transition = 'none';
    updateSegmentedIndicator(activeBtn);
    indicator.style.opacity = '1';

    // Re-enable transition after layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        indicator.style.transition = '';
      });
    });

    // Recalculate after fonts load (icon font changes button widths)
    document.fonts.ready.then(() => {
      const currentActive = document.querySelector('.segmented-control-btn.active[data-tab]');
      if (currentActive) updateSegmentedIndicator(currentActive);
    });
  }

  /**
   * Render a tab's content if not already rendered (lazy rendering)
   * @param {string} tabName - 'flights', 'hotels', or 'activities'
   */
  function renderTab(tabName) {
    if (tabRendered[tabName] || !currentTripData) return;
    const t0 = performance.now();
    if (tabName === 'activities') {
      window.tripActivities.render(document.getElementById('activities-container'), currentTripData);
    } else if (tabName === 'flights') {
      window.tripFlights.render(document.getElementById('flights-container'), currentTripData.flights);
    } else if (tabName === 'hotels') {
      window.tripHotels.render(document.getElementById('hotels-container'), currentTripData.hotels);
    } else if (tabName === 'trains') {
      window.tripTrains.render(document.getElementById('trains-container'), currentTripData.trains);
    } else if (tabName === 'buses') {
      window.tripBuses.render(document.getElementById('buses-container'), currentTripData.buses);
    } else if (tabName === 'ferries') {
      window.tripFerries.render(document.getElementById('ferries-container'), currentTripData.ferries);
    } else if (tabName === 'rentals') {
      window.tripRentals.render(document.getElementById('rentals-container'), currentTripData.rentals);
    }
    tabRendered[tabName] = true;
    if (typeof window.__perfMarkTabRender === 'function') {
      window.__perfMarkTabRender(performance.now() - t0);
    }
  }

  /**
   * Switch to a specific tab
   * @param {string} tabName - 'flights', 'hotels', 'activities', 'trains', or 'buses'
   */
  function switchToTab(tabName) {
    // Guard: se il tab non è tra quelli visibili, fallback al primo disponibile
    if (visibleTabs.length > 0 && !visibleTabs.includes(tabName)) {
      tabName = visibleTabs[0];
    }

    // Lazy render the tab if needed
    renderTab(tabName);
    const tabs = document.querySelectorAll('.segmented-control-btn');

    tabs.forEach(t => t.classList.remove('active'));
    const targetBtn = document.querySelector(`.segmented-control-btn[data-tab="${tabName}"]`);
    if (targetBtn) {
      targetBtn.classList.add('active');
      updateSegmentedIndicator(targetBtn);
    }

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) targetContent.classList.add('active');

    // Persist active tab for page refresh
    try { sessionStorage.setItem('tripActiveTab', tabName); } catch(e) {}

  }

  // ===========================
  // Menu
  // ===========================

  /**
   * Render the three-dots menu into the header (top-right)
   */
  function renderHeaderMenu() {
    const spacer = document.querySelector('.trip-header-spacer');
    if (!spacer) return;

    const canEdit = currentUserRole === 'proprietario' || currentUserRole === 'viaggiatore';
    const canDelete = currentUserRole === 'proprietario';

    spacer.innerHTML = `
      <div class="section-menu" id="content-menu">
        <button class="section-menu-btn" id="content-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
        <div class="section-dropdown" id="content-dropdown">
          ${canEdit ? `
          <button class="section-dropdown-item" data-action="rename">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span data-i18n="trip.rename">Rinomina</span>
          </button>
          <button class="section-dropdown-item" data-action="change-photo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span data-i18n="trip.changePhoto">Cambia foto</span>
          </button>
          <button class="section-dropdown-item" data-action="cities">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span data-i18n="trip.cities">Città</span>
          </button>
          ` : ''}
          <button class="section-dropdown-item" data-action="share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span data-i18n="trip.share">Share</span>
          </button>
          ${canDelete ? `
          <div class="section-dropdown-divider"></div>
          <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span data-i18n="trip.deleteTrip">Delete trip</span>
          </button>
          ` : ''}
          ${currentUserRole !== 'proprietario' ? `
          <div class="section-dropdown-divider"></div>
          <button class="section-dropdown-item section-dropdown-item--danger" data-action="leave-trip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span data-i18n="trip.leaveTrip">Lascia viaggio</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Initialize menu
   * @param {string} tripId
   */
  function initMenu(tripId) {
    const menuBtn = document.getElementById('content-menu-btn');
    const dropdown = document.getElementById('content-dropdown');

    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });
    }

    document.querySelectorAll('.section-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        dropdown?.classList.remove('active');

        if (action === 'rename') {
          showRenameModal(tripId);
        } else if (action === 'delete') {
          deleteTrip(tripId);
        } else if (action === 'share') {
          const lang = i18n.getLang();
          const tripName = currentTripData?.title?.[lang] || currentTripData?.title?.en || currentTripData?.title?.it || '';
          shareModal.show(tripId, currentUserRole, tripName);
        } else if (action === 'change-photo') {
          changePhoto(tripId);
        } else if (action === 'cities') {
          showCitiesModal(tripId);
        } else if (action === 'leave-trip') {
          leaveTrip(tripId);
        }
      });
    });

    document.addEventListener('click', () => {
      dropdown?.classList.remove('active');
    });
  }

  // ===========================
  // Menu modals
  // ===========================

  /**
   * Show choice modal (Volo / Hotel / Attività) from Activities tab
   * @param {string} tripId
   */
  /**
   * Show modal to add booking
   * @param {string} tripId
   * @param {string} [type] - 'flight' or 'hotel' to customize title
   */
  function showAddBookingModal(tripId, type) {
    const existingModal = document.getElementById('add-booking-modal');
    if (existingModal) existingModal.remove();

    // Remember which tab was active when modal opened
    const originTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;

    let titleKey = 'trip.addBookingTitle';
    if (type === 'flight') titleKey = 'trip.addFlightTitle';
    else if (type === 'hotel') titleKey = 'trip.addHotelTitle';

    const modalHTML = `
      <div class="modal-overlay" id="add-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="${titleKey}">Add booking</h2>
            <button class="modal-close" id="add-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-zone" id="add-booking-upload-zone">
              <input type="file" id="add-booking-file-input" accept=".pdf" hidden>
              <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="upload-zone-text" data-i18n="trip.uploadHint">Drag PDFs here or click to select</div>
              <div class="upload-zone-hint">PDF</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="add-booking-cancel" data-i18n="modal.cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('add-booking-modal');
    const closeBtn = document.getElementById('add-booking-close');
    const cancelBtn = document.getElementById('add-booking-cancel');
    const uploadZone = document.getElementById('add-booking-upload-zone');
    const fileInput = document.getElementById('add-booking-file-input');

    let files = [];
    let _uploadedPdfs = null;
    let _parsedResults = null;
    let _editedFields = [];
    let phraseController = null;
    let originalBodyContent = null;

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const addFiles = (fileListInput) => {
      const pdfFiles = Array.from(fileListInput).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 1) {
        utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
        return;
      }
      if (pdfFiles.length > 0) {
        files = pdfFiles;
        parseBooking();
      }
    };

    /** Step 1: Upload and parse with SmartParse */
    const parseBooking = async () => {
      if (files.length === 0) return;

      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');
      originalBodyContent = modalBody.innerHTML;

      modalBody.innerHTML = `
        <div class="processing-state">
          <div class="spinner"></div>
          <p class="processing-phrase loading-phrase"></p>
        </div>
      `;
      modalFooter.style.display = 'none';

      const phraseElement = modalBody.querySelector('.processing-phrase');
      phraseController = utils.startLoadingPhrases(phraseElement, 3000);

      try {
        const pdfs = await pdfUpload.uploadFiles(files);
        _uploadedPdfs = pdfs;

        const response = await utils.authFetch('/.netlify/functions/parse-pdf', {
          method: 'POST',
          body: JSON.stringify({ pdfs })
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
        }

        if (response.status === 429 || result.errorType === 'rate_limit') {
          throw new Error('rate_limit');
        }

        if (!response.ok || !result.success) {
          throw Object.assign(
            new Error(result.error || 'Failed to parse PDFs'),
            { errorCode: result.errorCode }
          );
        }

        phraseController.stop();
        _parsedResults = result.parsedResults;

        const modalHeader = modal.querySelector('.modal-header h2');

        // Rileva aggiornamenti confrontando con i booking esistenti nel viaggio
        // Usa optional chaining: se updatePreview non è disponibile (es. cache vecchia),
        // tratta tutto come nuovo booking e usa il flusso parsePreview standard
        if (!window.updatePreview) {
          console.warn('[tripPage] window.updatePreview non disponibile — fallback a parsePreview');
        }
        const updateCheck = window.updatePreview?.detectUpdates(_parsedResults, currentTripData);

        if (updateCheck?.hasUpdates) {
          // ── Mostra subito il confronto aggiornamenti ──
          if (modalHeader) modalHeader.textContent = i18n.t('trip.updateDetected') || 'Aggiornamenti rilevati';

          window.updatePreview.render(modalBody, updateCheck.updates, updateCheck.pendingNew, {
            onConfirm: async (selectedUpdates, pendingNew) => {
              let skipDateUpdate = false;
              // Controlla estensione date per i nuovi booking
              if (pendingNew) {
                const dateExt = checkDateExtension(_parsedResults);
                if (dateExt) {
                  const shouldExtend = await showDateExtensionDialog(dateExt);
                  if (!shouldExtend) skipDateUpdate = true;
                }
              }
              await confirmUpdates(selectedUpdates, pendingNew, skipDateUpdate);
            },
            onCancel: () => {
              modalBody.innerHTML = originalBodyContent;
              modalFooter.style.display = '';
              i18n.apply(modalBody);
              bindUploadZoneEvents();
            }
          }, currentTripData);
        } else {
          // ── Nessun aggiornamento: preview normale ──
          if (modalHeader) {
            const hasFlights = _parsedResults.some(pr => pr.result?.flights?.length);
            const hasHotels = _parsedResults.some(pr => pr.result?.hotels?.length);
            let previewTitle = 'Aggiungi prenotazione';
            if (hasFlights && hasHotels) previewTitle = 'Voli e Hotel';
            else if (hasFlights) previewTitle = 'Voli';
            else if (hasHotels) previewTitle = 'Hotel';
            modalHeader.textContent = previewTitle;
          }

          window.parsePreview.render(modalBody, _parsedResults, {
            onConfirm: async (feedback, updatedResults, editedFields) => {
              if (updatedResults) _parsedResults = updatedResults;
              _editedFields = editedFields || [];
              let skipDateUpdate = false;
              const dateExt = checkDateExtension(_parsedResults);
              if (dateExt) {
                const shouldExtend = await showDateExtensionDialog(dateExt);
                if (!shouldExtend) skipDateUpdate = true;
              }
              confirmAddBooking(feedback, skipDateUpdate);
            },
            onCancel: () => {
              modalBody.innerHTML = originalBodyContent;
              modalFooter.style.display = '';
              i18n.apply(modalBody);
              bindUploadZoneEvents();
            }
          });
        }

      } catch (error) {
        console.error('Error parsing booking:', error);
        if (phraseController) phraseController.stop();
        showBookingError(error, modalBody, modalFooter, originalBodyContent);
      }
    };

    /** Step 2: Confirm and save */
    const confirmAddBooking = async (feedback, skipDateUpdate = false) => {
      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');

      modalBody.innerHTML = `
        <div class="processing-state">
          <div class="spinner"></div>
          <p class="processing-phrase loading-phrase"></p>
        </div>
      `;
      modalFooter.style.display = 'none';

      const phraseElement = modalBody.querySelector('.processing-phrase');
      phraseController = utils.startLoadingPhrases(phraseElement, 3000);

      try {
        const response = await utils.authFetch('/.netlify/functions/add-booking', {
          method: 'POST',
          body: JSON.stringify({
            pdfs: _uploadedPdfs,
            tripId,
            parsedData: _parsedResults,
            feedback,
            skipDateUpdate,
            ...(_editedFields.length ? { editedFields: _editedFields } : {})
          })
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
        }

        if (!response.ok || !result.success) {
          if (response.status === 429 || result.errorType === 'rate_limit') {
            throw new Error('rate_limit');
          }
          if (response.status === 409 || result.errorType === 'duplicate') {
            const error = new Error('duplicate');
            error.tripName = result.tripName;
            throw error;
          }
          throw Object.assign(
            new Error(result.error || 'Failed to add booking'),
            { errorCode: result.errorCode }
          );
        }

        phraseController.stop();
        closeModal();
        await loadTripFromUrl();

        if (originTab === 'activities' && result.added) {
          if (result.added.hotels > 0) {
            switchToTab('hotels');
          } else if (result.added.flights > 0) {
            switchToTab('flights');
          }
        } else if (originTab) {
          switchToTab(originTab);
        }

        utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
      } catch (error) {
        console.error('Error adding booking:', error);
        if (phraseController) phraseController.stop();

        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');
        showBookingError(error, modalBody, modalFooter, originalBodyContent);
      }
    };

    /** Step 3: Conferma aggiornamenti (2a chiamata ad add-booking) */
    const confirmUpdates = async (selectedUpdates, pendingNew, skipDateUpdate) => {
      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');

      modalBody.innerHTML = `
        <div class="processing-state">
          <div class="spinner"></div>
          <p class="processing-phrase loading-phrase"></p>
        </div>
      `;
      modalFooter.style.display = 'none';

      const phraseElement = modalBody.querySelector('.processing-phrase');
      phraseController = utils.startLoadingPhrases(phraseElement, 3000);

      try {
        // Converti file extra passeggeri in base64
        for (const update of selectedUpdates) {
          if (update.extraPassengerPdfs) {
            for (const extra of update.extraPassengerPdfs) {
              if (extra.file) {
                const reader = new FileReader();
                extra.fileBase64 = await new Promise((resolve, reject) => {
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(extra.file);
                });
                extra.fileName = extra.file.name;
                delete extra.file;
              } else {
                delete extra.file;
              }
            }
          }
        }

        const response = await utils.authFetch('/.netlify/functions/add-booking', {
          method: 'POST',
          body: JSON.stringify({
            pdfs: _uploadedPdfs,
            tripId,
            confirmedUpdates: selectedUpdates,
            pendingNew,
            skipDateUpdate
          })
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
        }

        if (!response.ok || !result.success) {
          throw Object.assign(
            new Error(result.error || 'Failed to apply updates'),
            { errorCode: result.errorCode }
          );
        }

        phraseController.stop();
        closeModal();
        await loadTripFromUrl();

        if (originTab) switchToTab(originTab);

        const totalUpdated = result.updated ? Object.values(result.updated).reduce((a, b) => a + b, 0) : 0;
        const totalAdded = result.added ? Object.values(result.added).reduce((a, b) => a + b, 0) : 0;
        let toastMsg = i18n.t('trip.updateSuccess') || 'Prenotazioni aggiornate';
        if (totalAdded > 0) toastMsg += ` (+${totalAdded} ${totalAdded === 1 ? 'nuova' : 'nuove'})`;
        utils.showToast(toastMsg, 'success');
      } catch (error) {
        console.error('Error confirming updates:', error);
        if (phraseController) phraseController.stop();
        showBookingError(error, modalBody, modalFooter, originalBodyContent);
      }
    };

    /** Show error state in modal */
    const showBookingError = (error, modalBody, modalFooter, originalBodyContent) => {
      let errorMessage;
      let errorDetail = '';
      if (error.message === 'rate_limit') {
        errorMessage = i18n.t('common.rateLimitError') || 'Troppe richieste. Attendi un minuto e riprova.';
      } else if (error.message === 'duplicate') {
        errorMessage = `${i18n.t('trip.duplicateError') || 'Questa prenotazione è già presente in'} "${error.tripName}"`;
      } else if (error.message === 'server_error') {
        errorMessage = i18n.t('trip.serverError') || 'Errore del server. Riprova tra qualche istante.';
        errorDetail = error.errorCode || '';
      } else if (error instanceof TypeError || error.name === 'TypeError') {
        // Errore JS interno (es. modulo non caricato, proprietà undefined)
        errorMessage = i18n.t('trip.internalError') || 'Errore interno. Ricarica la pagina e riprova.';
        errorDetail = 'ERR_INTERNAL';
        console.error('[showBookingError] Errore interno:', error.message, error.stack);
      } else {
        errorMessage = i18n.t('trip.addError') || 'Errore durante l\'aggiunta della prenotazione.';
        errorDetail = error.errorCode || '';
      }
      const errorCode = errorDetail || error.errorCode || '';

      modalBody.innerHTML = `
        <div class="error-state">
          <div class="error-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <p class="error-state-message">${errorMessage}</p>
          ${errorCode ? `<p class="error-state-code">${errorCode}</p>` : ''}
          <button class="btn btn-secondary" id="error-retry-btn" data-i18n="modal.retry">Try again</button>
        </div>
      `;
      modalFooter.style.display = 'none';
      i18n.apply(modalBody);

      document.getElementById('error-retry-btn').addEventListener('click', () => {
        if (originalBodyContent) {
          modalBody.innerHTML = originalBodyContent;
          modalFooter.style.display = '';
          i18n.apply(modalBody);
          bindUploadZoneEvents();
        } else {
          closeModal();
        }
      });
    };

    /** Bind upload zone drag/drop/click events */
    const bindUploadZoneEvents = () => {
      const zone = document.getElementById('add-booking-upload-zone');
      const input = document.getElementById('add-booking-file-input');
      if (!zone || !input) return;
      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        addFiles(e.target.files);
        input.value = '';
      });
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        addFiles(e.dataTransfer.files);
      });
    };

    // Upload zone events
    bindUploadZoneEvents();

    // Modal events
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  }

  /**
   * Change trip cover photo
   * @param {string} tripId
   */
  function changePhoto(tripId) {
    if (!currentTripData?.destination || !window.tripCreator) return;
    window.tripCreator.openPhotoSelection(tripId, currentTripData.destination, currentTripData);
  }

  /**
   * Delete trip - shows confirmation modal
   * @param {string} tripId
   */
  function deleteTrip(tripId) {
    showDeleteModal(tripId);
  }

  /**
   * Show delete confirmation modal
   * @param {string} tripId
   */
  function showDeleteModal(tripId) {
    const existingModal = document.getElementById('delete-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    const tripTitle = currentTripData?.title?.[lang] || currentTripData?.title?.en || currentTripData?.title?.it || '';

    const modalHTML = `
      <div class="modal-overlay" id="delete-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteTitle">Delete trip</h2>
            <button class="modal-close" id="delete-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="trip.deleteConfirm">Are you sure you want to delete this trip?</p>
            <p class="text-muted mt-2"><strong>${esc(tripTitle)}</strong></p>
          </div>
          <div class="modal-footer" style="justify-content: space-between;">
            <button class="btn btn-secondary" id="delete-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-confirm" data-i18n="trip.delete">Delete</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-modal');
    const closeBtn = document.getElementById('delete-close');
    const cancelBtn = document.getElementById('delete-cancel');
    const confirmBtn = document.getElementById('delete-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(tripId)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete trip');
        }

        closeModal();
        // Redirect to home
        window.location.href = './';
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert(i18n.t('trip.deleteError') || 'Error deleting trip');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.delete') || 'Delete';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  }

  /**
   * Show delete booking modal with checkbox list
   * @param {string} tripId
   */
  function showDeleteBookingModal(tripId) {
    const existingModal = document.getElementById('delete-booking-modal');
    if (existingModal) existingModal.remove();

    const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';
    const typeMap = { flights: 'flight', hotels: 'hotel', trains: 'train', buses: 'bus', rentals: 'rental' };
    const type = typeMap[currentTab] || 'flight';
    const itemsMap = {
      flight: currentTripData?.flights || [],
      hotel: currentTripData?.hotels || [],
      train: currentTripData?.trains || [],
      bus: currentTripData?.buses || [],
      rental: currentTripData?.rentals || []
    };
    const items = itemsMap[type] || [];

    // Build single-items list
    let singleListHTML = '';
    if (items.length === 0) {
      singleListHTML = `<p class="text-muted">${i18n.t('trip.noBookings') || 'No bookings to delete'}</p>`;
    } else {
      singleListHTML = '<div class="delete-booking-list">';
      for (const item of items) {
        let label = '';
        if (type === 'flight') {
          const dep = item.departure?.code || '???';
          const arr = item.arrival?.code || '???';
          const date = item.date || '';
          label = `${esc(item.flightNumber || '')} ${esc(dep)} → ${esc(arr)}` + (date ? ` &middot; ${date}` : '');
        } else {
          const checkIn = item.checkIn?.date || '';
          const checkOut = item.checkOut?.date || '';
          label = esc(item.name || 'Hotel');
          if (checkIn) label += ` &middot; ${checkIn}`;
          if (checkOut) label += ` → ${checkOut}`;
        }
        singleListHTML += `
          <label class="delete-booking-item">
            <input type="checkbox" value="${item.id}" data-type="${type}">
            <span class="delete-booking-item-label">${label}</span>
          </label>`;
      }
      singleListHTML += '</div>';
    }

    // Build by-booking list (grouped by bookingReference/confirmation)
    let bookingListHTML = '';
    if (items.length === 0) {
      bookingListHTML = `<p class="text-muted">${i18n.t('trip.noBookings') || 'No bookings to delete'}</p>`;
    } else {
      const groups = {};
      for (const item of items) {
        const key = type === 'flight'
          ? (item.bookingReference || item.id)
          : (item.confirmation || item.id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      bookingListHTML = '<div class="delete-booking-list">';
      for (const [ref, groupItems] of Object.entries(groups)) {
        const itemIds = groupItems.map(g => g.id).join(',');
        let sublabel = '';
        if (type === 'flight') {
          sublabel = groupItems.map(f => {
            const dep = f.departure?.code || '???';
            const arr = f.arrival?.code || '???';
            return `${esc(f.flightNumber || '')} ${esc(dep)} → ${esc(arr)}`;
          }).join(', ');
          // Collect unique passenger names across all flights in this booking
          const nameSet = new Set();
          for (const f of groupItems) {
            if (f.passengers?.length) {
              f.passengers.forEach(p => p.name && nameSet.add(p.name));
            } else if (f.passenger?.name) {
              nameSet.add(f.passenger.name);
            }
          }
          const passengerNames = [...nameSet];
          if (passengerNames.length > 1) {
            // Multiple passengers: one row per passenger
            for (const name of passengerNames) {
              bookingListHTML += `
                <label class="delete-booking-item">
                  <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking" data-passenger="${esc(name)}">
                  <span class="delete-booking-item-label">
                    <span><strong>${esc(ref)}</strong> &middot; ${esc(name)}</span>
                    <span class="delete-booking-item-sub">${sublabel}</span>
                  </span>
                </label>`;
            }
          } else {
            const name = passengerNames[0] || '';
            bookingListHTML += `
              <label class="delete-booking-item">
                <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking">
                <span class="delete-booking-item-label">
                  <span><strong>${esc(ref)}</strong>${name ? ` &middot; ${esc(name)}` : ''}</span>
                  <span class="delete-booking-item-sub">${sublabel}</span>
                </span>
              </label>`;
          }
        } else {
          sublabel = groupItems.map(h => esc(h.name || 'Hotel')).join(', ');
          const nameSet = new Set();
          for (const h of groupItems) {
            if (h.guestName) nameSet.add(h.guestName);
          }
          const guestNames = [...nameSet];
          const names = guestNames.length ? guestNames.join(', ') : '';
          bookingListHTML += `
            <label class="delete-booking-item">
              <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking">
              <span class="delete-booking-item-label">
                <span><strong>${esc(ref)}</strong>${names ? ` &middot; ${esc(names)}` : ''}</span>
                <span class="delete-booking-item-sub">${sublabel}</span>
              </span>
            </label>`;
        }
      }
      bookingListHTML += '</div>';
    }

    const modalHTML = `
      <div class="modal-overlay" id="delete-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteBookingTitle">Delete booking</h2>
            <button class="modal-close" id="delete-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="segmented-control delete-mode-control">
              <button class="segmented-control-btn active" data-delete-mode="single" data-i18n="trip.deleteModeSingle">Individual</button>
              <button class="segmented-control-btn" data-delete-mode="booking" data-i18n="trip.deleteModeBooking">By booking</button>
            </div>
            <div id="delete-single-view">${singleListHTML}</div>
            <div id="delete-booking-view" style="display:none">${bookingListHTML}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-booking-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-booking-confirm" disabled data-i18n="trip.deleteSelected">Delete selected</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-booking-modal');
    const closeBtn = document.getElementById('delete-booking-close');
    const cancelBtn = document.getElementById('delete-booking-cancel');
    const confirmBtn = document.getElementById('delete-booking-confirm');
    const singleView = document.getElementById('delete-single-view');
    const bookingView = document.getElementById('delete-booking-view');
    const modeButtons = modal.querySelectorAll('[data-delete-mode]');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Enable/disable confirm button based on active view's checkboxes
    const updateConfirmState = () => {
      const activeView = modal.querySelector('[data-delete-mode].active').dataset.deleteMode === 'single' ? singleView : bookingView;
      const anyChecked = [...activeView.querySelectorAll('input[type="checkbox"]')].some(cb => cb.checked);
      confirmBtn.disabled = !anyChecked;
    };

    // Attach checkbox listeners
    modal.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateConfirmState));

    // Segmented control switching
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.deleteMode;
        singleView.style.display = mode === 'single' ? '' : 'none';
        bookingView.style.display = mode === 'booking' ? '' : 'none';
        // Uncheck all and reset confirm
        modal.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        confirmBtn.disabled = true;
      });
    });

    const performDelete = async () => {
      const activeMode = modal.querySelector('[data-delete-mode].active').dataset.deleteMode;
      const activeView = activeMode === 'single' ? singleView : bookingView;
      const selected = [...activeView.querySelectorAll('input[type="checkbox"]')].filter(cb => cb.checked);
      if (selected.length === 0) return;

      // Verifica se la cancellazione cambia le date del viaggio
      let skipDateUpdate = false;
      const deletions = selected.map(cb => {
        if (cb.dataset.passenger) {
          const ids = cb.value.split(',');
          const flight = (currentTripData?.flights || []).find(f => f.id === ids[0]);
          return { passenger: cb.dataset.passenger, bookingRef: flight?.bookingReference || '' };
        }
        return { type: cb.dataset.type, ids: cb.value.split(',') };
      });
      const shrinkInfo = checkDateShrinkOnDelete(deletions);
      if (shrinkInfo) {
        const shouldUpdate = await showDateShrinkDialog(shrinkInfo);
        if (!shouldUpdate) skipDateUpdate = true;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        // Separate passenger-level deletions from item-level deletions
        for (const cb of selected) {
          const passengerName = cb.dataset.passenger;
          if (passengerName) {
            // Per-passenger deletion: find the bookingReference from the flights
            const ids = cb.value.split(',');
            const flight = (currentTripData?.flights || []).find(f => f.id === ids[0]);
            const bookingRef = flight?.bookingReference || '';
            const response = await utils.authFetch('/.netlify/functions/delete-passenger', {
              method: 'POST',
              body: JSON.stringify({
                tripId,
                passengerName,
                bookingReference: bookingRef
              })
            });
            if (!response.ok) {
              throw new Error('Failed to delete passenger');
            }
            // Optimistic update: remove passenger from local data
            for (const f of (currentTripData?.flights || [])) {
              if (f.bookingReference?.toLowerCase()?.trim() === bookingRef?.toLowerCase()?.trim()) {
                f.passengers = (f.passengers || []).filter(p =>
                  p.name?.toLowerCase()?.trim() !== passengerName?.toLowerCase()?.trim()
                );
              }
            }
            // Remove flights with 0 passengers
            currentTripData.flights = (currentTripData.flights || []).filter(f =>
              !f.passengers || f.passengers.length > 0
            );
          } else {
            // Delete entire items
            const ids = cb.value.split(',');
            for (const id of ids) {
              const response = await utils.authFetch('/.netlify/functions/delete-booking', {
                method: 'POST',
                body: JSON.stringify({
                  tripId,
                  type: cb.dataset.type,
                  itemId: id,
                  skipDateUpdate
                })
              });
              if (!response.ok) {
                throw new Error('Failed to delete booking');
              }
            }
            // Optimistic update: remove items from local data
            const deleteType = cb.dataset.type;
            const deleteIds = new Set(ids);
            if (deleteType === 'flight') {
              currentTripData.flights = (currentTripData.flights || []).filter(f => !deleteIds.has(f.id));
            } else if (deleteType === 'hotel') {
              currentTripData.hotels = (currentTripData.hotels || []).filter(h => !deleteIds.has(h.id));
            } else if (deleteType === 'train') {
              currentTripData.trains = (currentTripData.trains || []).filter(t => !deleteIds.has(t.id));
            } else if (deleteType === 'bus') {
              currentTripData.buses = (currentTripData.buses || []).filter(b => !deleteIds.has(b.id));
            } else if (deleteType === 'rental') {
              currentTripData.rentals = (currentTripData.rentals || []).filter(r => !deleteIds.has(r.id));
            }
          }
        }

        closeModal();
        rerenderCurrentTab();
        utils.showToast(i18n.t('trip.deleteBookingSuccess') || 'Bookings deleted', 'success');
      } catch (error) {
        console.error('Error deleting bookings:', error);
        utils.showToast(i18n.t('trip.deleteError') || 'Error deleting', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.deleteSelected') || 'Delete selected';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  }

  /**
   * Leave a shared trip (remove self as collaborator)
   * @param {string} tripId
   */
  async function leaveTrip(tripId) {
    const confirmed = confirm(i18n.t('trip.leaveConfirm') || 'Sei sicuro di voler lasciare questo viaggio?');
    if (!confirmed) return;

    try {
      const response = await utils.authFetch('/.netlify/functions/manage-collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-self', tripId })
      });
      const result = await response.json();
      if (result.success) {
        window.location.href = '/index.html';
      } else {
        utils.showToast(i18n.t('common.error') || 'Errore', 'error');
      }
    } catch (err) {
      console.error('Error leaving trip:', err);
      utils.showToast(i18n.t('common.error') || 'Errore', 'error');
    }
  }

  /**
   * Show rename modal
   * @param {string} tripId
   */
  function showRenameModal(tripId) {
    const existingModal = document.getElementById('rename-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    const currentTitle = currentTripData?.title?.[lang] || currentTripData?.title?.en || currentTripData?.title?.it || '';

    const modalHTML = `
      <div class="modal-overlay" id="rename-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.rename">Rename</h2>
            <button class="modal-close" id="rename-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label" data-i18n="trip.newName">New name</label>
            <input type="text" class="form-input" id="rename-input" value="${esc(currentTitle)}">
            <div class="char-counter" id="rename-char-counter"><span class="char-limit-msg" id="rename-limit-msg">Raggiunto il limite di caratteri consentito</span><span><span id="rename-char-count">${currentTitle.length}</span>/50</span></div>
          </div>
          <div class="modal-footer" style="justify-content: space-between;">
            <button class="btn btn-secondary" id="rename-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="rename-submit">Conferma</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('rename-modal');
    const closeBtn = document.getElementById('rename-close');
    const cancelBtn = document.getElementById('rename-cancel');
    const submitBtn = document.getElementById('rename-submit');
    const input = document.getElementById('rename-input');

    const charCount = document.getElementById('rename-char-count');
    const charCounter = document.getElementById('rename-char-counter');
    input.addEventListener('input', () => {
      const len = input.value.length;
      const over = len > 50;
      charCount.textContent = len;
      charCounter.classList.toggle('over-limit', over);
      input.classList.toggle('input-error', over);
      submitBtn.disabled = over;
    });

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const submitRename = async () => {
      const newName = input.value.trim();
      if (!newName || newName.length > 50) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/rename-trip', {
          method: 'POST',
          body: JSON.stringify({ tripId, title: newName })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to rename trip');
        }

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
      } catch (error) {
        console.error('Error renaming trip:', error);
        alert(i18n.t('trip.renameError') || 'Error renaming trip');
        submitBtn.disabled = false;
        submitBtn.textContent = i18n.t('modal.save') || 'Save';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    submitBtn.addEventListener('click', submitRename);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitRename();
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    input.focus();
    input.select();
    i18n.apply(modal);
  }

  // ===========================
  // Cities modal
  // ===========================

  let _citiesDbPromise = null;

  /** Lazy-load cities database JSON (returns a promise) */
  function getCitiesDatabase() {
    if (!_citiesDbPromise) {
      _citiesDbPromise = fetch('/data/cities.json')
        .then(r => r.json())
        .catch(() => []);
    }
    return _citiesDbPromise;
  }

  /**
   * Show modal to manage trip cities
   * @param {string} tripId
   */
  function showCitiesModal(tripId) {
    const existingModal = document.getElementById('cities-modal');
    if (existingModal) existingModal.remove();

    // Normalize legacy string cities to objects
    const rawCities = currentTripData?.cities || [];
    let draftCities = rawCities.map(c =>
      typeof c === 'string' ? { name: c } : { ...c }
    );
    const labelText = draftCities.length > 0 ? 'Aggiungi un\'altra città' : 'Aggiungi una città';

    const modalHTML = `
      <div class="modal-overlay" id="cities-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.cities">Città</h2>
            <button class="modal-close" id="cities-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label" id="city-label">${labelText}</label>
            <div class="city-input-wrapper">
              <input type="text" class="form-input" id="city-input" placeholder="Cerca una città..." maxlength="100" autocomplete="off">
              <div class="city-autocomplete-dropdown" id="city-dropdown"></div>
            </div>
            <div class="city-error" id="city-error"></div>
            <button class="city-autofill-btn" id="city-autofill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Compila da voli e hotel
            </button>
            <div class="cities-list" id="cities-list">
              ${renderCitiesList(draftCities)}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cities-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="cities-confirm">Conferma</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('cities-modal');
    const closeBtn = document.getElementById('cities-close');
    const cancelBtn = document.getElementById('cities-cancel');
    const confirmBtn = document.getElementById('cities-confirm');
    const input = document.getElementById('city-input');
    const dropdown = document.getElementById('city-dropdown');
    const errorEl = document.getElementById('city-error');

    let activeIndex = -1;
    // Pre-load cities database
    getCitiesDatabase();

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const showError = (msg) => {
      errorEl.textContent = msg;
      setTimeout(() => { errorEl.textContent = ''; }, 3000);
    };

    const refreshList = () => {
      document.getElementById('cities-list').innerHTML = renderCitiesList(draftCities);
      document.getElementById('city-label').textContent = draftCities.length > 0
        ? 'Aggiungi un\'altra città' : 'Aggiungi una città';
      bindCityRemoveButtons(modal, draftCities, refreshList);
    };

    const addCityObj = (cityObj) => {
      errorEl.textContent = '';
      const duplicate = draftCities.some(c => c.name.toLowerCase() === cityObj.name.toLowerCase());
      if (duplicate) {
        showError('Città già presente');
        return;
      }
      draftCities.push(cityObj);
      input.value = '';
      hideDropdown();
      refreshList();
      input.focus();
    };

    const hideDropdown = () => {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      activeIndex = -1;
    };

    const showDropdown = (items) => {
      if (items.length === 0) {
        hideDropdown();
        return;
      }
      activeIndex = -1;
      dropdown.innerHTML = items.map((item, i) => `
        <div class="city-autocomplete-item" data-index="${i}">
          <span class="city-autocomplete-name">${esc(item.name)}</span>
          <span class="city-autocomplete-country">${esc(item.country || '')}</span>
        </div>
      `).join('');
      dropdown.classList.add('active');

      dropdown.querySelectorAll('.city-autocomplete-item').forEach((el, i) => {
        el.addEventListener('click', () => addCityObj(items[i]));
        el.addEventListener('mouseenter', () => {
          setActiveItem(i);
        });
      });
    };

    const setActiveItem = (index) => {
      dropdown.querySelectorAll('.city-autocomplete-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });
      activeIndex = index;
    };

    // Local JSON autocomplete
    const searchCities = async (query) => {
      if (query.length < 2) { hideDropdown(); return; }
      const q = query.toLowerCase();
      const citiesDb = await getCitiesDatabase();
      if (!citiesDb.length) { hideDropdown(); return; }

      const results = [];
      // Prioritize cities that start with the query
      for (const c of citiesDb) {
        if (c.n.toLowerCase().startsWith(q)) {
          results.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
          if (results.length >= 8) break;
        }
      }
      // If fewer than 8, add cities that contain the query
      if (results.length < 8) {
        for (const c of citiesDb) {
          if (!c.n.toLowerCase().startsWith(q) && c.n.toLowerCase().includes(q)) {
            results.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
            if (results.length >= 8) break;
          }
        }
      }
      showDropdown(results);
    };

    input.addEventListener('input', () => {
      searchCities(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.city-autocomplete-item');
      if (!items.length) {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Allow adding plain text if no dropdown
          const cityName = input.value.trim();
          if (cityName) addCityObj({ name: cityName });
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveItem(Math.min(activeIndex + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveItem(Math.max(activeIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0) {
          items[activeIndex].click();
        } else {
          const cityName = input.value.trim();
          if (cityName) addCityObj({ name: cityName });
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    // Close dropdown when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { closeModal(); return; }
      if (!e.target.closest('.city-input-wrapper')) hideDropdown();
    });

    const autofillCities = async () => {
      const extracted = await extractCitiesFromTrip(currentTripData);
      if (extracted.length === 0) {
        showError('Nessuna città trovata nei voli e hotel');
        return;
      }

      if (draftCities.length > 0) {
        const existingWarning = document.getElementById('city-autofill-warning');
        if (existingWarning) return;

        const autofillBtn = document.getElementById('city-autofill');
        const warningHTML = `<div class="city-autofill-warning" id="city-autofill-warning">
          <span>Le città attuali verranno sostituite. Continuare?</span>
          <div class="city-autofill-warning-actions">
            <button class="btn btn-secondary" id="city-autofill-no">No, annulla</button>
            <button class="btn btn-primary" id="city-autofill-yes">Sì, continua</button>
          </div>
        </div>`;
        autofillBtn.insertAdjacentHTML('afterend', warningHTML);
        document.getElementById('city-autofill-no').addEventListener('click', () => {
          document.getElementById('city-autofill-warning').remove();
        });
        document.getElementById('city-autofill-yes').addEventListener('click', () => {
          document.getElementById('city-autofill-warning').remove();
          draftCities.length = 0;
          draftCities.push(...extracted);
          refreshList();
        });
        return;
      }

      draftCities.push(...extracted);
      refreshList();
    };

    const saveAndClose = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/manage-cities', {
          method: 'POST',
          body: JSON.stringify({ action: 'set', tripId, cities: draftCities })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to save cities');
        }

        currentTripData.cities = result.cities;
        closeModal();
      } catch (error) {
        showError('Errore nel salvataggio');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Conferma';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', saveAndClose);
    document.getElementById('city-autofill').addEventListener('click', autofillCities);

    bindCityRemoveButtons(modal, draftCities, refreshList);

    modal.offsetHeight;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    input.focus();
    i18n.apply(modal);
  }

  /**
   * Render cities list HTML (supports both string and object cities)
   */
  function renderCitiesList(cities) {
    if (!cities || cities.length === 0) {
      return '';
    }
    return cities.map(city => {
      const name = typeof city === 'string' ? city : city.name;
      const country = (typeof city === 'object' && city.country) ? city.country : '';
      return `
        <div class="city-item">
          <div class="city-item-info">
            <span class="city-name">${esc(name)}</span>
            ${country ? `<span class="city-country">${esc(country)}</span>` : ''}
          </div>
          <button class="city-remove-btn" data-city="${esc(name)}" title="Rimuovi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * Bind click handlers to city remove buttons (local draft, no API call)
   */
  function bindCityRemoveButtons(modal, draftCities, refreshList) {
    modal.querySelectorAll('.city-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cityName = btn.dataset.city;
        const index = draftCities.findIndex(c => {
          const n = typeof c === 'string' ? c : c.name;
          return n.toLowerCase() === cityName.toLowerCase();
        });
        if (index !== -1) {
          draftCities.splice(index, 1);
          refreshList();
        }
      });
    });
  }

  /**
   * Extract unique cities from flights and hotels as objects, ordered by date
   */
  async function extractCitiesFromTrip(tripData) {
    if (!tripData) return [];

    // Build a lookup index from the cities DB (lowercase name → city record)
    const citiesDb = await getCitiesDatabase();
    const cityIndex = new Map();
    for (const c of citiesDb) {
      cityIndex.set(c.n.toLowerCase(), c);
    }

    const seen = new Set();
    const cities = [];

    const addCity = (name) => {
      if (!name) return;
      const trimmed = name.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        const match = cityIndex.get(trimmed.toLowerCase());
        if (match) {
          cities.push({ name: match.n, country: match.c, lat: match.lat, lng: match.lng });
        } else {
          cities.push({ name: trimmed });
        }
      }
    };

    const flights = [...(tripData.flights || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const f of flights) {
      addCity(f.departure?.city);
      addCity(f.arrival?.city);
    }

    const hotels = [...(tripData.hotels || [])].sort((a, b) => (a.checkIn?.date || '').localeCompare(b.checkIn?.date || ''));
    for (const h of hotels) {
      addCity(h.address?.city);
    }

    return cities;
  }

  // ===========================
  // Manage booking panel (selection → edit/delete)
  // ===========================

  /**
   * Show slide-in panel to manage bookings (edit or delete)
   */
  function showManageBookingPanel(tripId) {
    const slider = document.getElementById('modal-page-slider');
    const mainPage = document.getElementById('modal-page-main');
    const activityPage = document.getElementById('modal-page-activity');
    if (!slider || !activityPage) return;

    const alreadyOpen = slider.classList.contains('at-activity');
    const savedScrollTop = alreadyOpen ? (slider._savedScrollTop || 0) : mainPage.scrollTop;
    if (!alreadyOpen) slider._savedScrollTop = savedScrollTop;

    const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';
    const typeMap = { flights: 'flight', hotels: 'hotel', trains: 'train', buses: 'bus', rentals: 'rental' };
    const type = typeMap[currentTab] || 'flight';
    const itemsMap = {
      flight: currentTripData?.flights || [],
      hotel: currentTripData?.hotels || [],
      train: currentTripData?.trains || [],
      bus: currentTripData?.buses || [],
      rental: currentTripData?.rentals || []
    };
    const items = itemsMap[type] || [];

    // Build booking list grouped by bookingReference/confirmation
    let listHTML = '';
    if (items.length === 0) {
      listHTML = `<p class="text-muted">${i18n.t('trip.noBookings') || 'Nessuna prenotazione'}</p>`;
    } else {
      const groups = {};
      for (const item of items) {
        let key;
        if (type === 'flight') key = item.bookingReference || item.id;
        else if (type === 'hotel') key = item.confirmationNumber || item.confirmation || item.id;
        else if (type === 'train') key = item.bookingReference || item.id;
        else key = item.bookingReference || item.id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      listHTML = '<div class="manage-booking-list">';
      for (const [ref, groupItems] of Object.entries(groups)) {
        const itemIds = groupItems.map(g => g.id).join(',');
        let sublabel = '';

        if (type === 'flight') {
          const flightLines = groupItems.map(f => {
            const dep = f.departure?.code || '???';
            const arr = f.arrival?.code || '???';
            const date = f.date || '';
            const time = f.departureTime || '';
            return `<div class="manage-booking-flight-row">
              <span class="manage-booking-flight-num">${esc(f.flightNumber || '')}</span>
              <span>${esc(dep)} → ${esc(arr)}</span>
              ${date ? `<span class="manage-booking-flight-date">${date}${time ? ' ' + time : ''}</span>` : ''}
            </div>`;
          }).join('');

          const nameSet = new Set();
          for (const f of groupItems) {
            if (f.passengers?.length) {
              f.passengers.forEach(p => p.name && nameSet.add(p.name));
            } else if (f.passenger?.name) {
              nameSet.add(f.passenger.name);
            }
          }
          const passengerNames = [...nameSet];

          if (passengerNames.length > 1) {
            for (const name of passengerNames) {
              listHTML += `
                <div class="manage-booking-item" data-value="${itemIds}" data-type="${type}" data-mode="booking" data-passenger="${esc(name)}" data-ref="${esc(ref)}">
                  <span class="manage-booking-item-label">
                    <span><strong>${esc(ref)}</strong> &middot; ${esc(name)}</span>
                    <div class="manage-booking-flights">${flightLines}</div>
                  </span>
                </div>`;
            }
          } else {
            const name = passengerNames[0] || '';
            listHTML += `
              <div class="manage-booking-item" data-value="${itemIds}" data-type="${type}" data-mode="booking" data-ref="${esc(ref)}">
                <span class="manage-booking-item-label">
                  <span><strong>${esc(ref)}</strong>${name ? ` &middot; ${esc(name)}` : ''}</span>
                  <div class="manage-booking-flights">${flightLines}</div>
                </span>
              </div>`;
          }
        } else if (type === 'hotel') {
          const hotelLines = groupItems.map(h => {
            const checkIn = h.checkIn?.date || '';
            const checkOut = h.checkOut?.date || '';
            return `<div class="manage-booking-flight-row">
              <span>${esc(h.name || 'Hotel')}</span>
              ${checkIn ? `<span class="manage-booking-flight-date">${checkIn}${checkOut ? ' → ' + checkOut : ''}</span>` : ''}
            </div>`;
          }).join('');

          const nameSet = new Set();
          for (const h of groupItems) {
            if (h.guestName) nameSet.add(h.guestName);
          }
          const guestNames = [...nameSet];
          const names = guestNames.length ? guestNames.join(', ') : '';
          listHTML += `
            <div class="manage-booking-item" data-value="${itemIds}" data-type="${type}" data-mode="booking" data-ref="${esc(ref)}">
              <span class="manage-booking-item-label">
                <span><strong>${esc(ref)}</strong>${names ? ` &middot; ${esc(names)}` : ''}</span>
                <div class="manage-booking-flights">${hotelLines}</div>
              </span>
            </div>`;
        } else if (type === 'rental') {
          const rentalLines = groupItems.map(r => {
            const pickup = r.pickupLocation?.city || '';
            const dropoff = r.dropoffLocation?.city || '';
            const date = r.date || '';
            const endDate = r.endDate || '';
            return `<div class="manage-booking-flight-row">
              <span>${esc(r.provider || 'Noleggio')}</span>
              ${pickup || dropoff ? `<span>${esc(pickup)} → ${esc(dropoff)}</span>` : ''}
              ${date ? `<span class="manage-booking-flight-date">${date}${endDate ? ' → ' + endDate : ''}</span>` : ''}
            </div>`;
          }).join('');

          const driverName = groupItems[0]?.driverName || groupItems[0]?.passenger?.name || '';
          listHTML += `
            <div class="manage-booking-item" data-value="${itemIds}" data-type="${type}" data-mode="booking" data-ref="${esc(ref)}">
              <span class="manage-booking-item-label">
                <span><strong>${esc(ref)}</strong>${driverName ? ` &middot; ${esc(driverName)}` : ''}</span>
                <div class="manage-booking-flights">${rentalLines}</div>
              </span>
            </div>`;
        } else {
          // Treni e bus
          const lines = groupItems.map(item => {
            const dep = item.departure?.station || item.departure?.city || '';
            const arr = item.arrival?.station || item.arrival?.city || '';
            const date = item.date || '';
            const time = item.departure?.time || '';
            const num = item.trainNumber || item.routeNumber || '';
            return `<div class="manage-booking-flight-row">
              ${num ? `<span class="manage-booking-flight-num">${esc(num)}</span>` : ''}
              <span>${esc(dep)} → ${esc(arr)}</span>
              ${date ? `<span class="manage-booking-flight-date">${date}${time ? ' ' + time : ''}</span>` : ''}
            </div>`;
          }).join('');

          const passengerName = groupItems[0]?.passenger?.name || '';
          listHTML += `
            <div class="manage-booking-item" data-value="${itemIds}" data-type="${type}" data-mode="booking" data-ref="${esc(ref)}">
              <span class="manage-booking-item-label">
                <span><strong>${esc(ref)}</strong>${passengerName ? ` &middot; ${esc(passengerName)}` : ''}</span>
                <div class="manage-booking-flights">${lines}</div>
              </span>
            </div>`;
        }
      }
      listHTML += '</div>';
    }

    activityPage.innerHTML = `
      <div class="slide-panel-header">
        <h2 id="manage-panel-title">${i18n.t('trip.manageBookingTitle') || 'Gestisci prenotazione'}</h2>
        <button class="activity-panel-close" id="manage-panel-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="slide-panel-body" id="manage-panel-body">
        ${listHTML}
      </div>
      <div class="slide-panel-footer" id="manage-panel-footer">
        <button class="btn btn-secondary" id="manage-close-btn">${i18n.t('modal.close') || 'Chiudi'}</button>
      </div>
    `;

    // Backdrop cliccabile per chiudere il pannello cliccando fuori
    const backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      slider.classList.add('at-activity');
      activityPage.scrollTop = 0;
    });

    const panelBody = document.getElementById('manage-panel-body');
    const panelTitle = document.getElementById('manage-panel-title');
    const panelFooter = document.getElementById('manage-panel-footer');

    const closePanel = (onComplete) => {
      backdrop.remove();
      slider.classList.remove('at-activity');
      activityPage.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== activityPage) return;
        activityPage.removeEventListener('transitionend', onEnd);
        activityPage.innerHTML = '';
        delete slider._savedScrollTop;
        mainPage.scrollTop = savedScrollTop;
        if (onComplete) onComplete();
      }, { once: false });
    };

    backdrop.addEventListener('click', () => closePanel());
    document.getElementById('manage-panel-close').addEventListener('click', () => closePanel());
    document.getElementById('manage-close-btn').addEventListener('click', () => closePanel());

    // Remove existing action buttons
    const removeActions = () => {
      const existing = panelBody.querySelector('.manage-booking-actions');
      if (existing) existing.remove();
    };

    // Card click selection → show action buttons below card
    activityPage.querySelectorAll('.manage-booking-item').forEach(card => {
      card.addEventListener('click', () => {
        activityPage.querySelectorAll('.manage-booking-item').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        removeActions();

        const actionsHTML = `
          <div class="manage-booking-actions">
            <button class="btn btn-outline btn-sm" id="manage-edit-btn">${i18n.t('trip.editBooking') || 'Modifica'}</button>
            <button class="btn btn-outline-danger btn-sm" id="manage-delete-btn">${i18n.t('trip.deleteBooking') || 'Elimina'}</button>
          </div>
        `;
        card.insertAdjacentHTML('afterend', actionsHTML);

        // Attach edit handler
        document.getElementById('manage-edit-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          handleEdit(card);
        });

        // Attach delete handler
        document.getElementById('manage-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          handleDelete(card);
        });
      });
    });

    // ---- EDIT action ----
    function handleEdit(selected) {

      const ids = selected.dataset.value.split(',');
      const selectedType = selected.dataset.type;
      const passengerName = selected.dataset.passenger;
      const allItems = selectedType === 'flight'
        ? (currentTripData?.flights || [])
        : (currentTripData?.hotels || []);
      const selectedItems = allItems.filter(it => ids.includes(it.id));

      if (selectedItems.length === 0) return;

      // Transition to edit mode
      panelTitle.textContent = i18n.t('trip.editBookingTitle') || 'Modifica prenotazione';

      // Build edit forms for all items in the booking
      let formHTML = '';
      if (selectedItems.length === 1) {
        const item = selectedItems[0];
        const itemLabel = selectedType === 'flight'
          ? `${item.flightNumber || ''} ${item.departure?.code || ''} → ${item.arrival?.code || ''}`
          : (item.name || 'Hotel');
        const form = ({ flight: window.tripFlights, hotel: window.tripHotels, train: window.tripTrains, bus: window.tripBuses }[selectedType] || window.tripFlights).buildFullEditForm(item);
        formHTML = `
          <div class="manage-edit-item" data-item-id="${item.id}">
            <div class="manage-edit-item-header">${esc(itemLabel)}</div>
            ${form}
          </div>
        `;
      } else {
        formHTML = selectedItems.map((item, idx) => {
          const itemLabel = selectedType === 'flight'
            ? `${item.flightNumber || ''} ${item.departure?.code || ''} → ${item.arrival?.code || ''}`
            : (item.name || 'Hotel');
          const form = selectedType === 'flight'
            ? window.tripFlights.buildFullEditForm(item)
            : window.tripHotels.buildFullEditForm(item);
          return `
            <div class="manage-edit-item" data-item-id="${item.id}">
              <div class="manage-edit-item-header">${esc(itemLabel)}</div>
              ${form}
            </div>
          `;
        }).join('');
      }

      panelBody.innerHTML = formHTML;

      // Add back button to header
      const header = activityPage.querySelector('.slide-panel-header');
      const backBtn = document.createElement('button');
      backBtn.className = 'manage-back-btn';
      backBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
      header.insertBefore(backBtn, panelTitle);

      backBtn.addEventListener('click', () => {
        // Return to selection view (re-render in place)
        showManageBookingPanel(tripId);
      });

      // Init airport autocomplete for flights
      if (selectedType === 'flight') {
        import('./airportAutocomplete.js').then(() => {
          if (window.AirportAutocomplete) {
            window.AirportAutocomplete.init(panelBody);
          }
        });
      }

      // Add-field mechanism
      if (window.AddFieldHelper) {
        panelBody.querySelectorAll('.manage-edit-item').forEach(item => {
          window.AddFieldHelper.init(item, selectedType);
        });
      }

      // Update footer
      panelFooter.innerHTML = `
        <button class="btn btn-secondary" id="manage-cancel-btn">${i18n.t('modal.cancel') || 'Annulla'}</button>
        <button class="btn btn-primary" id="manage-save-btn">${i18n.t('modal.save') || 'Salva'}</button>
      `;

      document.getElementById('manage-cancel-btn').addEventListener('click', () => closePanel());

      document.getElementById('manage-save-btn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('manage-save-btn');

        // Validate required fields
        const invalidInput = panelBody.querySelector('input:invalid');
        if (invalidInput) {
          invalidInput.focus();
          invalidInput.reportValidity();
          return;
        }

        // Validate IATA codes
        panelBody.querySelectorAll('input[data-field$=".code"]').forEach(input => {
          if (input.value.trim()) input.value = input.value.trim().toUpperCase();
        });

        // Validate hotel check-out > check-in
        if (selectedType === 'hotel') {
          const checkInDate = panelBody.querySelector('[data-field="checkIn.date"]')?.value;
          const checkOutDate = panelBody.querySelector('[data-field="checkOut.date"]')?.value;
          if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
            const field = panelBody.querySelector('[data-field="checkOut.date"]');
            field.focus();
            field.setCustomValidity(i18n.t('hotel.checkOut') + ' > ' + i18n.t('hotel.checkIn'));
            field.reportValidity();
            field.setCustomValidity('');
            return;
          }
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

        try {
          if (selectedItems.length === 1) {
            const updates = ({ flight: window.tripFlights, hotel: window.tripHotels, train: window.tripTrains, bus: window.tripBuses }[selectedType] || window.tripFlights).collectFullUpdates(panelBody);

            const response = await utils.authFetch('/.netlify/functions/edit-booking', {
              method: 'POST',
              body: JSON.stringify({ tripId, type: selectedType, itemId: selectedItems[0].id, updates })
            });
            if (!response.ok) throw new Error('Failed to save');
          } else {
            // Multiple items: collect updates per item
            const itemSections = panelBody.querySelectorAll('.manage-edit-item');
            for (const section of itemSections) {
              const itemId = section.dataset.itemId;
              const updates = ({ flight: window.tripFlights, hotel: window.tripHotels, train: window.tripTrains, bus: window.tripBuses }[selectedType] || window.tripFlights).collectFullUpdates(section);

              const response = await utils.authFetch('/.netlify/functions/edit-booking', {
                method: 'POST',
                body: JSON.stringify({ tripId, type: selectedType, itemId, updates })
              });
              if (!response.ok) throw new Error('Failed to save');
            }
          }

          const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
          closePanel(async () => {
            await loadTripFromUrl();
            if (activeTab) switchToTab(activeTab);
          });
          utils.showToast(i18n.t('trip.editBookingSuccess') || 'Prenotazione aggiornata', 'success');
        } catch (error) {
          console.error('Error editing booking:', error);
          utils.showToast(i18n.t('trip.editError') || 'Errore nell\'aggiornamento', 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = i18n.t('modal.save') || 'Salva';
        }
      });
    }

    // ---- DELETE action ----
    function handleDelete(selected) {
      const passengerName = selected.dataset.passenger;
      const bookingRef = selected.dataset.ref;

      // Replace action buttons with inline confirmation
      const actionsEl = panelBody.querySelector('.manage-booking-actions');
      if (actionsEl) {
        actionsEl.innerHTML = `
          <span class="manage-confirm-text">${i18n.t('trip.confirmDelete') || 'Confermi l\'eliminazione?'}</span>
          <button class="btn btn-secondary btn-sm" id="manage-delete-cancel">${i18n.t('modal.cancel') || 'Annulla'}</button>
          <button class="btn btn-danger btn-sm" id="manage-delete-confirm">${i18n.t('trip.confirmDeleteBtn') || 'Elimina'}</button>
        `;
      }

      document.getElementById('manage-delete-cancel').addEventListener('click', (e) => {
        e.stopPropagation();
        showManageBookingPanel(tripId);
      });

      document.getElementById('manage-delete-confirm').addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmBtn = document.getElementById('manage-delete-confirm');

        // Verifica se la cancellazione cambia le date del viaggio
        let skipDateUpdate = false;
        const deletion = passengerName
          ? { passenger: passengerName, bookingRef }
          : { type: selected.dataset.type, ids: selected.dataset.value.split(',') };
        const shrinkInfo = checkDateShrinkOnDelete([deletion]);
        if (shrinkInfo) {
          const shouldUpdate = await showDateShrinkDialog(shrinkInfo);
          if (!shouldUpdate) skipDateUpdate = true;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

        try {
          if (passengerName) {
            // Delete passenger
            const ids = selected.dataset.value.split(',');
            const response = await utils.authFetch('/.netlify/functions/delete-passenger', {
              method: 'POST',
              body: JSON.stringify({
                tripId,
                passengerName,
                bookingReference: bookingRef
              })
            });
            if (!response.ok) throw new Error('Failed to delete passenger');

            // Optimistic update
            for (const f of (currentTripData?.flights || [])) {
              if (f.bookingReference?.toLowerCase()?.trim() === bookingRef?.toLowerCase()?.trim()) {
                f.passengers = (f.passengers || []).filter(p =>
                  p.name?.toLowerCase()?.trim() !== passengerName?.toLowerCase()?.trim()
                );
              }
            }
            currentTripData.flights = (currentTripData.flights || []).filter(f =>
              !f.passengers || f.passengers.length > 0
            );
          } else {
            // Delete entire booking items
            const ids = selected.dataset.value.split(',');
            for (const id of ids) {
              const response = await utils.authFetch('/.netlify/functions/delete-booking', {
                method: 'POST',
                body: JSON.stringify({
                  tripId,
                  type: selected.dataset.type,
                  itemId: id,
                  skipDateUpdate
                })
              });
              if (!response.ok) throw new Error('Failed to delete booking');
            }

            // Optimistic update
            const deleteIds = new Set(ids);
            const dtype = selected.dataset.type;
            if (dtype === 'flight') {
              currentTripData.flights = (currentTripData.flights || []).filter(f => !deleteIds.has(f.id));
            } else if (dtype === 'hotel') {
              currentTripData.hotels = (currentTripData.hotels || []).filter(h => !deleteIds.has(h.id));
            } else if (dtype === 'train') {
              currentTripData.trains = (currentTripData.trains || []).filter(t => !deleteIds.has(t.id));
            } else if (dtype === 'bus') {
              currentTripData.buses = (currentTripData.buses || []).filter(b => !deleteIds.has(b.id));
            } else if (dtype === 'rental') {
              currentTripData.rentals = (currentTripData.rentals || []).filter(r => !deleteIds.has(r.id));
            }
          }

          closePanel(() => rerenderCurrentTab());
          utils.showToast(i18n.t('trip.deleteBookingSuccess') || 'Prenotazione eliminata', 'success');
        } catch (error) {
          console.error('Error deleting booking:', error);
          utils.showToast(i18n.t('trip.deleteError') || 'Errore nell\'eliminazione', 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = i18n.t('trip.confirmDeleteBtn') || 'Elimina';
        }
      });
    }
  }

  // ===========================
  // Edit booking panel (shared between flights/hotels)
  // ===========================

  /**
   * Open edit panel for a single item directly from card button
   */
  function openEditPanelForItem(type, itemId) {
    const tripId = currentTripData?.id;
    if (!tripId) return;

    const itemsMap = {
      flight: currentTripData?.flights || [],
      hotel: currentTripData?.hotels || [],
      train: currentTripData?.trains || [],
      bus: currentTripData?.buses || [],
      rental: currentTripData?.rentals || []
    };
    const items = itemsMap[type] || [];

    const item = items.find(i => i.id === itemId);
    if (!item) {
      utils.showToast(i18n.t('trip.editError') || 'Error', 'error');
      return;
    }

    showEditBookingPanel(type, item, tripId);
  }

  /**
   * Show slide-in panel with edit booking form for a single item
   */
  function showEditBookingPanel(type, item, tripId) {
    const slider = document.getElementById('modal-page-slider');
    const mainPage = document.getElementById('modal-page-main');
    const activityPage = document.getElementById('modal-page-activity');
    if (!slider || !activityPage) return;

    const alreadyOpen = slider.classList.contains('at-activity');
    const savedScrollTop = alreadyOpen ? (slider._savedScrollTop || 0) : mainPage.scrollTop;
    if (!alreadyOpen) slider._savedScrollTop = savedScrollTop;

    const formBuilders = {
      flight: window.tripFlights.buildEditForm,
      hotel: window.tripHotels.buildEditForm,
      train: window.tripTrains.buildEditForm,
      bus: window.tripBuses.buildEditForm,
      rental: window.tripRentals.buildEditForm,
      ferry: window.tripFerries.buildEditForm
    };
    const formHTML = (formBuilders[type] || formBuilders.flight)(item);

    activityPage.innerHTML = `
      <div class="slide-panel-header">
        <h2>${i18n.t('trip.editBookingTitle') || 'Modifica prenotazione'}</h2>
        <button class="activity-panel-close" id="edit-panel-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="slide-panel-body">
        ${formHTML}
      </div>
      <div class="slide-panel-footer">
        <button class="btn btn-secondary" id="edit-panel-cancel">${i18n.t('modal.cancel') || 'Annulla'}</button>
        <button class="btn btn-primary" id="edit-panel-save">${i18n.t('modal.save') || 'Salva'}</button>
      </div>
    `;

    // Backdrop cliccabile per chiudere il pannello cliccando fuori
    const backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      slider.classList.add('at-activity');
      activityPage.scrollTop = 0;
    });

    const panelBody = activityPage.querySelector('.slide-panel-body');
    const saveBtn = document.getElementById('edit-panel-save');

    if (type === 'flight') {
      import('./airportAutocomplete.js').then(() => {
        if (window.AirportAutocomplete) {
          window.AirportAutocomplete.init(panelBody);
        }
      });
    }

    if (type === 'ferry') {
      if (window.CityAutocomplete) {
        window.CityAutocomplete.init(panelBody, 'input[data-field="departure.city"], input[data-field="arrival.city"]');
      }
    }

    // Add-field mechanism for all booking types
    if (window.AddFieldHelper) {
      window.AddFieldHelper.init(panelBody, type);
    }

    const closePanel = (onComplete) => {
      backdrop.remove();
      slider.classList.remove('at-activity');
      activityPage.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== activityPage) return;
        activityPage.removeEventListener('transitionend', onEnd);
        activityPage.innerHTML = '';
        delete slider._savedScrollTop;
        mainPage.scrollTop = savedScrollTop;
        if (onComplete) onComplete();
      }, { once: false });
    };

    backdrop.addEventListener('click', () => closePanel());

    const performSave = async () => {
      // Validate required fields and patterns
      const invalidInput = panelBody.querySelector('input:invalid');
      if (invalidInput) {
        invalidInput.focus();
        invalidInput.reportValidity();
        return;
      }

      // Validate IATA codes are uppercase 3 letters if provided
      panelBody.querySelectorAll('input[data-field$=".code"]').forEach(input => {
        if (input.value.trim()) input.value = input.value.trim().toUpperCase();
      });

      // Validate hotel: check-out must be after check-in
      if (type === 'hotel') {
        const checkInDate = panelBody.querySelector('[data-field="checkIn.date"]')?.value;
        const checkOutDate = panelBody.querySelector('[data-field="checkOut.date"]')?.value;
        if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
          const field = panelBody.querySelector('[data-field="checkOut.date"]');
          field.focus();
          field.setCustomValidity(i18n.t('hotel.checkOut') + ' > ' + i18n.t('hotel.checkIn'));
          field.reportValidity();
          field.setCustomValidity('');
          return;
        }
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const updateCollectors = {
          flight: window.tripFlights.collectUpdates,
          hotel: window.tripHotels.collectUpdates,
          train: window.tripTrains.collectUpdates,
          bus: window.tripBuses.collectUpdates,
          rental: window.tripRentals.collectUpdates,
          ferry: window.tripFerries.collectUpdates
        };
        const updates = (updateCollectors[type] || updateCollectors.flight)(panelBody);

        const response = await utils.authFetch('/.netlify/functions/edit-booking', {
          method: 'POST',
          body: JSON.stringify({ tripId, type, itemId: item.id, updates })
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closePanel(async () => {
          await loadTripFromUrl();
          if (activeTab) switchToTab(activeTab);
        });
        utils.showToast(i18n.t('trip.editBookingSuccess') || 'Booking updated', 'success');
      } catch (error) {
        console.error('Error editing booking:', error);
        utils.showToast(i18n.t('trip.editError') || 'Error updating', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('modal.save') || 'Salva';
      }
    };

    document.getElementById('edit-panel-close').addEventListener('click', () => closePanel());
    document.getElementById('edit-panel-cancel').addEventListener('click', () => closePanel());
    saveBtn.addEventListener('click', performSave);
  }

  /**
   * Show delete item confirmation modal
   * @param {string} type - 'flight' or 'hotel'
   * @param {string} itemId
   */
  function showDeleteItemModal(type, itemId) {
    const existingModal = document.getElementById('delete-item-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    let itemDescription = '';

    if (type === 'flight') {
      const flight = currentTripData?.flights?.find(f => f.id === itemId);
      if (flight) {
        const date = utils.formatFlightDate(flight.date, lang);
        itemDescription = `${esc(flight.flightNumber)} - ${esc(flight.departure?.code)} → ${esc(flight.arrival?.code)} (${date})`;
      }
    } else if (type === 'hotel') {
      const hotel = currentTripData?.hotels?.find(h => h.id === itemId);
      if (hotel) {
        itemDescription = esc(hotel.name);
      }
    } else if (type === 'train') {
      const train = currentTripData?.trains?.find(t => t.id === itemId);
      if (train) {
        const date = utils.formatFlightDate(train.date, lang);
        itemDescription = `${esc(train.trainNumber || '')} - ${esc(train.departure?.station || '')} → ${esc(train.arrival?.station || '')} (${date})`;
      }
    } else if (type === 'bus') {
      const bus = currentTripData?.buses?.find(b => b.id === itemId);
      if (bus) {
        const date = utils.formatFlightDate(bus.date, lang);
        itemDescription = `${esc(bus.operator || '')} - ${esc(bus.departure?.city || '')} → ${esc(bus.arrival?.city || '')} (${date})`;
      }
    } else if (type === 'rental') {
      const rental = currentTripData?.rentals?.find(r => r.id === itemId);
      if (rental) {
        const date = utils.formatFlightDate(rental.date, lang);
        itemDescription = `${esc(rental.provider || 'Noleggio')} - ${esc(rental.pickupLocation?.city || '')} → ${esc(rental.dropoffLocation?.city || '')} (${date})`;
      }
    }

    const titleKeyMap = { flight: 'flight.deleteTitle', hotel: 'hotel.deleteTitle', train: 'train.deleteTitle', bus: 'bus.deleteTitle', rental: 'flight.deleteTitle' };
    const confirmKeyMap = { flight: 'flight.deleteConfirm', hotel: 'hotel.deleteConfirm', train: 'train.deleteConfirm', bus: 'bus.deleteConfirm', rental: 'flight.deleteConfirm' };
    const deleteKeyMap = { flight: 'flight.delete', hotel: 'hotel.delete', train: 'train.delete', bus: 'bus.delete', rental: 'flight.delete' };
    const titleKey = titleKeyMap[type] || 'flight.deleteTitle';
    const confirmKey = confirmKeyMap[type] || 'flight.deleteConfirm';
    const deleteKey = deleteKeyMap[type] || 'flight.delete';

    const modalHTML = `
      <div class="modal-overlay" id="delete-item-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="${titleKey}">${type === 'flight' ? 'Delete flight' : 'Delete hotel'}</h2>
            <button class="modal-close" id="delete-item-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="${confirmKey}">${type === 'flight' ? 'Are you sure you want to delete this flight?' : 'Are you sure you want to delete this hotel?'}</p>
            <p class="text-muted mt-2"><strong>${itemDescription}</strong></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-item-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-item-confirm" data-i18n="${deleteKey}">${type === 'flight' ? 'Delete flight' : 'Delete hotel'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-item-modal');
    const closeBtn = document.getElementById('delete-item-close');
    const cancelBtn = document.getElementById('delete-item-cancel');
    const confirmBtn = document.getElementById('delete-item-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      // Verifica se la cancellazione cambia le date del viaggio
      let skipDateUpdate = false;
      const shrinkInfo = checkDateShrinkOnDelete([{ type, ids: [itemId] }]);
      if (shrinkInfo) {
        const shouldUpdate = await showDateShrinkDialog(shrinkInfo);
        if (!shouldUpdate) skipDateUpdate = true;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/delete-booking', {
          method: 'POST',
          body: JSON.stringify({
            tripId: currentTripData.id,
            type: type,
            itemId: itemId,
            skipDateUpdate
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to delete');
        }

        closeModal();

        // Optimistic update: remove item from local data
        if (type === 'flight') {
          currentTripData.flights = (currentTripData.flights || []).filter(f => f.id !== itemId);
        } else if (type === 'hotel') {
          currentTripData.hotels = (currentTripData.hotels || []).filter(h => h.id !== itemId);
        } else if (type === 'train') {
          currentTripData.trains = (currentTripData.trains || []).filter(t => t.id !== itemId);
        } else if (type === 'bus') {
          currentTripData.buses = (currentTripData.buses || []).filter(b => b.id !== itemId);
        } else if (type === 'rental') {
          currentTripData.rentals = (currentTripData.rentals || []).filter(r => r.id !== itemId);
        }

        // Check if this was the last booking
        const allEmpty = (currentTripData.flights || []).length === 0 &&
          (currentTripData.hotels || []).length === 0 &&
          (currentTripData.trains || []).length === 0 &&
          (currentTripData.buses || []).length === 0 &&
          (currentTripData.rentals || []).length === 0;
        if (allEmpty) {
          try {
            await utils.authFetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(currentTripData.id)}`, {
              method: 'DELETE'
            });
          } catch (tripDeleteError) {
            console.error('Error deleting empty trip:', tripDeleteError);
          }
          window.location.href = 'index.html';
          return;
        }

        // Animate card removal, then re-render tab
        const card = document.querySelector(`.${type}-card[data-id="${itemId}"]`);
        if (card) {
          card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        rerenderCurrentTab();
      } catch (error) {
        console.error('Error deleting item:', error);
        utils.showToast(i18n.t('common.error') || 'Error deleting', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t(deleteKey) || 'Delete';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  }

  // ===========================
  // Quick upload (shared between flights/hotels)
  // ===========================

  /**
   * Initialize quick upload card
   * @param {string} cardId - The ID of the quick upload card
   */
  /**
   * Handle upload — two-step: parse → preview in modal → confirm saves to trip
   * @param {File} file - The PDF file to upload
   */
  /**
   * Extract all dates from parsed results and compare with trip dates.
   * Returns { newStart, newEnd } if extension needed, or null.
   */
  function checkDateExtension(parsedResults) {
    if (!currentTripData?.startDate || !currentTripData?.endDate) return null;

    const dates = [];
    for (const pr of parsedResults) {
      if (!pr.result) continue;
      if (pr.result.flights) {
        for (const f of pr.result.flights) {
          if (f.date) dates.push(f.date);
        }
      }
      if (pr.result.hotels) {
        for (const h of pr.result.hotels) {
          const checkIn = typeof h.checkIn === 'object' ? h.checkIn?.date : h.checkIn;
          const checkOut = typeof h.checkOut === 'object' ? h.checkOut?.date : h.checkOut;
          if (checkIn) dates.push(checkIn);
          if (checkOut) dates.push(checkOut);
        }
      }
      if (pr.result.trains) {
        for (const t of pr.result.trains) {
          if (t.date) dates.push(t.date);
        }
      }
      if (pr.result.buses) {
        for (const b of pr.result.buses) {
          if (b.date) dates.push(b.date);
        }
      }
      if (pr.result.rentals) {
        for (const r of pr.result.rentals) {
          if (r.date) dates.push(r.date);
          if (r.endDate) dates.push(r.endDate);
        }
      }
    }

    if (dates.length === 0) return null;

    dates.sort();
    const earliest = dates[0];
    const latest = dates[dates.length - 1];

    const needStart = earliest < currentTripData.startDate;
    const needEnd = latest > currentTripData.endDate;

    if (!needStart && !needEnd) return null;

    return {
      newStart: needStart ? earliest : null,
      oldStart: needStart ? currentTripData.startDate : null,
      newEnd: needEnd ? latest : null,
      oldEnd: needEnd ? currentTripData.endDate : null,
    };
  }

  /**
   * Show date extension confirmation dialog.
   * Returns a promise that resolves to true (extend) or false (keep).
   */
  function showDateExtensionDialog(extension) {
    return new Promise((resolve) => {
      const fmtDate = (str) => {
        if (!str) return '';
        try {
          const d = new Date(str + 'T00:00:00');
          const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
          return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch { return str; }
      };

      let details = '';
      if (extension.newStart) {
        const msg = (i18n.t('trip.dateExtendStart') || 'Move start from {old} to {new}?')
          .replace('{old}', fmtDate(extension.oldStart))
          .replace('{new}', fmtDate(extension.newStart));
        details += `<p class="date-extend-detail">${msg}</p>`;
      }
      if (extension.newEnd) {
        const msg = (i18n.t('trip.dateExtendEnd') || 'Move end from {old} to {new}?')
          .replace('{old}', fmtDate(extension.oldEnd))
          .replace('{new}', fmtDate(extension.newEnd));
        details += `<p class="date-extend-detail">${msg}</p>`;
      }

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay date-extend-overlay active';
      overlay.innerHTML = `
        <div class="modal date-extend-modal">
          <div class="modal-header">
            <h2>${i18n.t('trip.dateExtendTitle') || 'Update trip dates'}</h2>
          </div>
          <div class="modal-body">
            <p>${i18n.t('trip.dateExtendMessage') || 'The booking has dates outside the trip period.'}</p>
            ${details}
          </div>
          <div class="modal-footer date-extend-footer">
            <button class="btn btn-secondary date-extend-skip">${i18n.t('trip.dateExtendSkip') || 'Keep current dates'}</button>
            <button class="btn btn-primary date-extend-confirm">${i18n.t('trip.dateExtendConfirm') || 'Update dates'}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('.date-extend-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('.date-extend-skip').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  }

  /**
   * Simula la rimozione di item e verifica se le date del viaggio cambiano.
   * @param {Array} deletions - Array di { type, ids } oppure { type: 'passenger', bookingRef, name }
   * @returns {{ oldStart, newStart, oldEnd, newEnd } | null}
   */
  function checkDateShrinkOnDelete(deletions) {
    if (!currentTripData?.startDate || !currentTripData?.endDate) return null;

    // Clona le liste rilevanti
    let flights = [...(currentTripData.flights || [])];
    let hotels = [...(currentTripData.hotels || [])];
    let trains = [...(currentTripData.trains || [])];
    let buses = [...(currentTripData.buses || [])];
    let rentals = [...(currentTripData.rentals || [])];

    for (const del of deletions) {
      if (del.passenger) {
        // Rimozione passeggero: rimuovi solo se il volo resta con 0 passeggeri
        flights = flights.map(f => {
          if (f.bookingReference?.toLowerCase()?.trim() === del.bookingRef?.toLowerCase()?.trim()) {
            const remaining = (f.passengers || []).filter(p =>
              p.name?.toLowerCase()?.trim() !== del.passenger?.toLowerCase()?.trim()
            );
            return { ...f, passengers: remaining };
          }
          return f;
        }).filter(f => !f.passengers || f.passengers.length > 0);
      } else {
        const idsSet = new Set(del.ids);
        if (del.type === 'flight') flights = flights.filter(f => !idsSet.has(f.id));
        else if (del.type === 'hotel') hotels = hotels.filter(h => !idsSet.has(h.id));
        else if (del.type === 'train') trains = trains.filter(t => !idsSet.has(t.id));
        else if (del.type === 'bus') buses = buses.filter(b => !idsSet.has(b.id));
        else if (del.type === 'rental') rentals = rentals.filter(r => !idsSet.has(r.id));
      }
    }

    // Ricalcola le date come farebbe updateTripDates
    const dates = [];
    flights.forEach(f => { if (f.date) dates.push(f.date); });
    hotels.forEach(h => {
      const ci = typeof h.checkIn === 'object' ? h.checkIn?.date : h.checkIn;
      const co = typeof h.checkOut === 'object' ? h.checkOut?.date : h.checkOut;
      if (ci) dates.push(ci);
      if (co) dates.push(co);
    });
    trains.forEach(t => { if (t.date) dates.push(t.date); });
    buses.forEach(b => { if (b.date) dates.push(b.date); });
    rentals.forEach(r => { if (r.date) dates.push(r.date); if (r.endDate) dates.push(r.endDate); });

    if (dates.length === 0) return null; // Trip resterebbe vuoto, niente da confrontare

    dates.sort();
    const newStart = dates[0];
    const newEnd = dates[dates.length - 1];

    const changed = newStart !== currentTripData.startDate || newEnd !== currentTripData.endDate;
    if (!changed) return null;

    return {
      oldStart: currentTripData.startDate,
      newStart,
      oldEnd: currentTripData.endDate,
      newEnd
    };
  }

  /**
   * Mostra dialogo di conferma cambio date dopo cancellazione.
   * Ritorna true se l'utente conferma l'aggiornamento, false se vuole mantenere le date attuali.
   */
  function showDateShrinkDialog(shrinkInfo) {
    return new Promise((resolve) => {
      const fmtDate = (str) => {
        if (!str) return '';
        try {
          const d = new Date(str + 'T00:00:00');
          const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
          return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch { return str; }
      };

      let details = '';
      if (shrinkInfo.newStart !== shrinkInfo.oldStart) {
        const msg = (i18n.t('trip.dateShrinkStart') || 'Start date: from {old} to {new}')
          .replace('{old}', fmtDate(shrinkInfo.oldStart))
          .replace('{new}', fmtDate(shrinkInfo.newStart));
        details += `<p class="date-extend-detail">${msg}</p>`;
      }
      if (shrinkInfo.newEnd !== shrinkInfo.oldEnd) {
        const msg = (i18n.t('trip.dateShrinkEnd') || 'End date: from {old} to {new}')
          .replace('{old}', fmtDate(shrinkInfo.oldEnd))
          .replace('{new}', fmtDate(shrinkInfo.newEnd));
        details += `<p class="date-extend-detail">${msg}</p>`;
      }

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay date-extend-overlay active';
      overlay.innerHTML = `
        <div class="modal date-extend-modal">
          <div class="modal-header">
            <h2>${i18n.t('trip.dateShrinkTitle') || 'Trip dates changed'}</h2>
          </div>
          <div class="modal-body">
            <p>${i18n.t('trip.dateShrinkMessage') || 'Deleting this booking changes the trip dates.'}</p>
            ${details}
          </div>
          <div class="modal-footer date-extend-footer">
            <button class="btn btn-secondary date-shrink-skip">${i18n.t('trip.dateShrinkSkip') || 'Keep current dates'}</button>
            <button class="btn btn-primary date-shrink-confirm">${i18n.t('trip.dateShrinkConfirm') || 'Update dates'}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('.date-shrink-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('.date-shrink-skip').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  }

  async function handleQuickUpload(file) {
    // Mostra stato loading sul FAB
    const fab = document.getElementById('trip-fab');
    if (fab) fab.classList.add('loading');

    const resetFab = () => {
      if (fab) fab.classList.remove('loading');
    };

    try {
      // Step 1: Upload to storage + SmartParse extraction
      const pdfs = await pdfUpload.uploadFiles([file]);

      const parseResponse = await utils.authFetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        body: JSON.stringify({ pdfs })
      });

      let parseResult;
      try {
        parseResult = await parseResponse.json();
      } catch {
        throw Object.assign(new Error('server_error'), { errorCode: `HTTP${parseResponse.status}` });
      }

      if (parseResponse.status === 429 || parseResult.errorType === 'rate_limit') {
        throw new Error('rate_limit');
      }

      if (!parseResponse.ok || !parseResult.success) {
        const code = parseResult.errorCode ? ` [${parseResult.errorCode}]` : '';
        throw new Error((parseResult.error || 'Failed to process PDF') + code);
      }

      // Step 2: Show preview in modal
      resetFab();

      const parsedResults = parseResult.parsedResults;

      // Open the trip-modal for preview
      const modal = document.getElementById('trip-modal');
      const modalBody = document.getElementById('modal-body');
      const modalHeader = modal?.querySelector('.modal-header h2');

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      tripCreator.showFooter(false);

      // Rileva aggiornamenti confrontando con i booking esistenti
      // Usa optional chaining: fallback a parsePreview se updatePreview non disponibile
      if (!window.updatePreview) {
        console.warn('[tripPage] window.updatePreview non disponibile — fallback a parsePreview');
      }
      const updateCheck = window.updatePreview?.detectUpdates(parsedResults, currentTripData);

      if (updateCheck?.hasUpdates) {
        // ── Mostra subito il confronto aggiornamenti ──
        if (modalHeader) modalHeader.textContent = i18n.t('trip.updateDetected') || 'Aggiornamenti rilevati';

        window.updatePreview.render(modalBody, updateCheck.updates, updateCheck.pendingNew, {
          onConfirm: async (selectedUpdates, pendingNew) => {
            modalBody.innerHTML = `
              <div class="processing-state">
                <span class="spinner"></span>
                <p class="processing-phrase loading-phrase"></p>
              </div>
            `;
            const phraseEl = modalBody.querySelector('.processing-phrase');
            const savingPhrases = utils.startLoadingPhrases(phraseEl, 3000);

            try {
              // Converti file extra passeggeri in base64
              for (const update of selectedUpdates) {
                if (update.extraPassengerPdfs) {
                  for (const extra of update.extraPassengerPdfs) {
                    if (extra.file) {
                      const reader = new FileReader();
                      extra.fileBase64 = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(extra.file);
                      });
                      extra.fileName = extra.file.name;
                      delete extra.file;
                    } else {
                      delete extra.file;
                    }
                  }
                }
              }

              const saveResponse = await utils.authFetch('/.netlify/functions/add-booking', {
                method: 'POST',
                body: JSON.stringify({
                  pdfs,
                  tripId: currentTripData.id,
                  confirmedUpdates: selectedUpdates,
                  pendingNew,
                  skipDateUpdate: false
                })
              });

              const saveResult = await saveResponse.json();
              savingPhrases.stop();

              if (!saveResponse.ok || !saveResult.success) {
                throw new Error(saveResult.error || 'Failed to apply updates');
              }

              modal.classList.remove('active');
              document.body.style.overflow = '';
              tripCreator.reset();

              const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
              await loadTripFromUrl();
              if (currentTab) switchToTab(currentTab);

              const totalUpdated = saveResult.updated ? Object.values(saveResult.updated).reduce((a, b) => a + b, 0) : 0;
              const totalAdded = saveResult.added ? Object.values(saveResult.added).reduce((a, b) => a + b, 0) : 0;
              let toastMsg = i18n.t('trip.updateSuccess') || 'Prenotazioni aggiornate';
              if (totalAdded > 0) toastMsg += ` (+${totalAdded} ${totalAdded === 1 ? 'nuova' : 'nuove'})`;
              utils.showToast(toastMsg, 'success');
            } catch (saveError) {
              savingPhrases.stop();
              modal.classList.remove('active');
              document.body.style.overflow = '';
              tripCreator.reset();
              handleQuickUploadError(saveError);
            }
          },
          onCancel: () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            tripCreator.reset();
          }
        }, currentTripData);
      } else {
        // ── Nessun aggiornamento: preview normale ──
        if (modalHeader) {
          const hasFlights = parsedResults.some(pr => pr.result?.flights?.length);
          const hasHotels = parsedResults.some(pr => pr.result?.hotels?.length);
          let title = i18n.t('trip.addBookingTitle') || 'Aggiungi prenotazione';
          if (hasFlights && !hasHotels) title = i18n.t('trip.addFlightTitle') || 'Aggiungi Voli';
          else if (hasHotels && !hasFlights) title = i18n.t('trip.addHotelTitle') || 'Aggiungi Hotel';
          modalHeader.textContent = title;
        }

        window.parsePreview.render(modalBody, parsedResults, {
          onConfirm: async (feedback, updatedResults, editedFields) => {
            const finalResults = updatedResults || parsedResults;

            let skipDateUpdate = false;
            const dateExt = checkDateExtension(finalResults);
            if (dateExt) {
              const shouldExtend = await showDateExtensionDialog(dateExt);
              if (!shouldExtend) skipDateUpdate = true;
            }

            modalBody.innerHTML = `
              <div class="processing-state">
                <span class="spinner"></span>
                <p class="processing-phrase loading-phrase"></p>
              </div>
            `;
            const phraseEl = modalBody.querySelector('.processing-phrase');
            const savingPhrases = utils.startLoadingPhrases(phraseEl, 3000);

            try {
              const saveResponse = await utils.authFetch('/.netlify/functions/add-booking', {
                method: 'POST',
                body: JSON.stringify({
                  pdfs,
                  tripId: currentTripData.id,
                  parsedData: finalResults,
                  feedback,
                  skipDateUpdate,
                  ...(editedFields?.length ? { editedFields } : {})
                })
              });

              let saveResult;
              try {
                saveResult = await saveResponse.json();
              } catch {
                throw Object.assign(new Error('server_error'), { errorCode: `HTTP${saveResponse.status}` });
              }

              if (saveResponse.status === 429 || saveResult.errorType === 'rate_limit') {
                throw new Error('rate_limit');
              }
              if (saveResponse.status === 409 || saveResult.errorType === 'duplicate') {
                const err = new Error('duplicate');
                err.tripName = saveResult.tripName;
                throw err;
              }
              if (!saveResponse.ok || !saveResult.success) {
                throw Object.assign(
                  new Error(saveResult.error || 'Failed to add booking'),
                  { errorCode: saveResult.errorCode }
                );
              }

              savingPhrases.stop();

              modal.classList.remove('active');
              document.body.style.overflow = '';
              tripCreator.reset();

              const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
              await loadTripFromUrl();
              if (currentTab) switchToTab(currentTab);

              utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
            } catch (saveError) {
              savingPhrases.stop();
              modal.classList.remove('active');
              document.body.style.overflow = '';
              tripCreator.reset();
              handleQuickUploadError(saveError);
            }
          },
          onCancel: () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            tripCreator.reset();
          }
        });
      }

    } catch (error) {
      resetFab();
      handleQuickUploadError(error);
    }
  }

  /**
   * Show error toast for quick upload failures
   */
  function handleQuickUploadError(error) {
    let errorMessage;
    if (error.message === 'rate_limit') {
      errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
    } else if (error.message === 'duplicate') {
      errorMessage = `${i18n.t('trip.duplicateError') || 'This booking is already in'} "${error.tripName}"`;
    } else {
      console.error('Error in quick upload:', error);
      errorMessage = i18n.t('trip.addError') || 'Error adding booking';
      if (error.errorCode) errorMessage += ` [${error.errorCode}]`;
    }
    utils.showToast(errorMessage, 'error');
  }

  // ===========================
  // Language change listener
  // ===========================

  // Listen for language changes
  window.addEventListener('languageChanged', () => {
    if (currentTripData) {
      renderTrip(currentTripData);
    }
  });

  // ===========================
  // Initialize
  // ===========================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
