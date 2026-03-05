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
    // Salva pagina corrente per la sidebar su trip.html
    const path = window.location.pathname;
    if (!path.includes('trip.html') && !path.includes('login.html') && !path.includes('admin.html') && !path.includes('share.html')) {
      sessionStorage.setItem('sidebar-active-page', path);
    }

    await this.loadHeader();

    // Su pagine senza #header-placeholder (trip.html), inizializza comunque la sidebar se presente dal cache
    if (!document.getElementById('header-placeholder') && document.getElementById('app-sidebar')) {
      const isAuthenticated = window.auth?.isAuthenticated();
      if (isAuthenticated) {
        this._updateSidebarActiveLink();
        this.initSidebar();
      }
    }

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
   * Verifica se la pagina corrente mostra il FAB "Nuovo Viaggio"
   */
  isPageWithFab() {
    const path = window.location.pathname;
    return this.isHomePage() || path.includes('past-trips.html');
  },

  /**
   * Load header con hamburger menu + CTA desktop + FAB mobile
   */
  loadHomeHeader(placeholder, isAuthenticated, profile) {
    const bellSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`;

    const hamburgerSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`;

    const isAdmin = window.auth?.session?.user?.email === 'fstagno@idibgroup.com';

    // Sinistra: solo hamburger
    const leftActions = `
      <button class="header-glass-btn" id="hamburger-btn" title="Menu" aria-label="Menu">
        ${hamburgerSvg}
      </button>
    `;

    // Destra: solo notifiche (o login se non autenticato)
    let rightActions = '';
    if (isAuthenticated) {
      rightActions = `
        <div class="notif-bell-wrap">
          <button class="header-glass-btn" id="notification-bell" title="Notifications" aria-haspopup="true" aria-expanded="false">
            ${bellSvg}
            <span class="header-glass-badge" id="notification-badge" style="display: none;">0</span>
          </button>
        </div>
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
              ${leftActions}
            </div>
            <a href="/index.html" class="header-logo header-logo--img">
              <img src="/assets/icons/travel-flow-logo-bk.png" alt="Travel Flow" class="header-logo-img" width="161" height="40">
            </a>
            <div class="header-actions">
              ${rightActions}
            </div>
          </div>
        </div>
      </header>
    `;

    // Bind login button se non autenticato
    if (!isAuthenticated) {
      const loginBtn = document.getElementById('login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          window.auth?.showLoginModal();
        });
      }
    }

    // Sidebar (sostituisce il drawer)
    if (isAuthenticated) {
      this.wrapContentArea();
      this.renderSidebar(profile, isAdmin);
      this.initSidebar();
      this.initNotificationDropdown();
    }

    // FAB mobile (solo pagine home e past-trips)
    if (isAuthenticated && this.isPageWithFab()) {
      this.renderFab();
    }
  },

  /**
   * Render della sidebar (stile Claude)
   */
  renderSidebar(profile, isAdmin) {
    // Se la sidebar è già nel DOM (iniettata dal cache inline script), aggiorna solo il link attivo
    if (document.getElementById('app-sidebar')) {
      this._updateSidebarActiveLink();
      return;
    }


    const initial = profile?.username?.charAt(0).toUpperCase() || '?';
    const username = profile?.username || '';
    const email = profile?.email || '';
    const path = window.location.pathname;

    // Su trip.html, mantieni il link attivo della pagina di provenienza
    const isTrip = path.includes('trip.html');
    let activePath = path;
    if (isTrip) {
      const source = sessionStorage.getItem('sidebar-active-page');
      if (source) activePath = source;
    }

    const isHome = activePath.endsWith('/') || activePath.endsWith('index.html');
    const isPast = activePath.includes('past-trips.html');
    const isProfile = activePath.includes('profile.html');
    const isNotifications = activePath.includes('notifications.html');
    const isPending = activePath.includes('pending-bookings.html');

    // Icone SVG
    const toggleExpandSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
    const closeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    const plusCircleSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
    const planeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`;
    const clockSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const gearSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    const shieldSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    const sidebarHtml = `
      <div class="app-sidebar-overlay" id="app-sidebar-overlay"></div>
      <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <a href="/index.html" class="sidebar-logo">
            <img src="/assets/icons/travel-flow-logo-bk.png" alt="Travel Flow" class="sidebar-logo-img">
          </a>
          <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">${toggleExpandSvg}</button>
          <button class="sidebar-close" id="sidebar-close">${closeSvg}</button>
        </div>
        <nav class="sidebar-nav">
          <button class="sidebar-cta" id="sidebar-new-trip-btn" data-tooltip="Nuovo Viaggio">
            ${plusCircleSvg}
            <span data-i18n="trip.new">Nuovo Viaggio</span>
          </button>
          <a href="/index.html" class="sidebar-link${isHome ? ' sidebar-link--active' : ''}" data-tooltip="Prossimi viaggi">
            ${planeSvg}
            <span data-i18n="nav.upcomingTrips">Prossimi viaggi</span>
          </a>
          <a href="/past-trips.html" class="sidebar-link${isPast ? ' sidebar-link--active' : ''}" data-tooltip="Viaggi passati">
            ${clockSvg}
            <span data-i18n="nav.pastTrips">Viaggi passati</span>
          </a>
          <div class="sidebar-separator"></div>
          <a href="/profile.html" class="sidebar-link${isProfile ? ' sidebar-link--active' : ''}" data-tooltip="Impostazioni">
            ${gearSvg}
            <span data-i18n="nav.settings">Impostazioni</span>
          </a>
          ${isAdmin ? `
          <a href="/admin.html" class="sidebar-link" data-tooltip="Admin">
            ${shieldSvg}
            <span data-i18n="nav.admin">Admin</span>
          </a>` : ''}
        </nav>
        <div class="sidebar-footer">
          <a href="/profile.html" class="sidebar-user">
            <div class="sidebar-avatar">${initial}</div>
            <div class="sidebar-user-info">
              <span class="sidebar-username">${utils.escapeHtml(username)}</span>
              ${email ? `<span class="sidebar-email">${utils.escapeHtml(email)}</span>` : ''}
            </div>
          </a>
        </div>
      </aside>
    `;

    // Inserisco sidebar nel body (position:fixed, non dipende dal parent)
    // Se esiste una sidebar cached dall'inline script, la rimuovo e uso quella renderizzata
    const pageWrapper = document.querySelector('.page-wrapper');
    if (pageWrapper) {
      pageWrapper.insertAdjacentHTML('afterbegin', sidebarHtml);
    } else {
      document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    }

    // Salva sidebar HTML in cache per instant-render al prossimo page load
    try {
      sessionStorage.setItem('sidebar-cache', sidebarHtml);
    } catch (e) { /* sessionStorage pieno, ignora */ }
  },

  /**
   * Aggiorna il link attivo nella sidebar (usato quando la sidebar viene da cache)
   */
  _updateSidebarActiveLink() {
    const path = window.location.pathname;
    const isTrip = path.includes('trip.html');
    let activePath = path;
    if (isTrip) {
      const source = sessionStorage.getItem('sidebar-active-page');
      if (source) activePath = source;
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
      const linkPath = new URL(link.href, location.origin).pathname;
      const isActive = linkPath === activePath ||
        ((activePath.endsWith('/') || activePath.endsWith('index.html')) && linkPath === '/index.html') ||
        (activePath === '/' && linkPath === '/index.html');
      link.classList.toggle('sidebar-link--active', isActive);
    });
  },

  /**
   * Wrappa il contenuto esistente in .app-content (per layout sidebar)
   */
  wrapContentArea() {
    const pageWrapper = document.querySelector('.page-wrapper');
    if (!pageWrapper || pageWrapper.querySelector('.app-content')) return;

    const appContent = document.createElement('div');
    appContent.className = 'app-content';

    // Sposta tutti i figli di page-wrapper dentro app-content
    // (escluso sidebar e overlay che verranno aggiunti dopo)
    while (pageWrapper.firstChild) {
      appContent.appendChild(pageWrapper.firstChild);
    }
    pageWrapper.appendChild(appContent);

    // Aggiungi classi body per il layout
    document.body.classList.add('has-sidebar');

    // Recupera stato compresso da localStorage
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    }
  },

  /**
   * Inizializza toggle e interazioni sidebar
   */
  initSidebar() {
    if (this._sidebarInitialized) return;
    this._sidebarInitialized = true;
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('app-sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById('sidebar-close');
    const hamburger = document.getElementById('hamburger-btn');

    if (!sidebar) return;

    // Stato iniziale da localStorage
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (collapsed) {
      sidebar.classList.add('sidebar--collapsed');
    }

    // Toggle espandi/comprimi (solo desktop)
    toggleBtn?.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('sidebar--collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      localStorage.setItem('sidebar-collapsed', isCollapsed);
    });

    // Mobile: apertura sidebar
    const openSidebar = () => {
      sidebar.classList.add('sidebar--open');
      overlay?.classList.add('app-sidebar-overlay--open');
      document.body.style.overflow = 'hidden';
    };

    const closeSidebar = () => {
      sidebar.classList.remove('sidebar--open');
      overlay?.classList.remove('app-sidebar-overlay--open');
      document.body.style.overflow = '';
    };

    // Hamburger apre sidebar su mobile (event delegation: funziona con hamburger creati dopo SPA navigation)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#hamburger-btn');
      if (btn) {
        e.stopPropagation();
        openSidebar();
      }
    });

    // Chiudi sidebar mobile
    overlay?.addEventListener('click', closeSidebar);
    closeBtn?.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('sidebar--open')) {
        closeSidebar();
      }
    });

    // CTA "Nuovo Viaggio"
    const ctaBtn = document.getElementById('sidebar-new-trip-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        // Chiudi su mobile
        if (window.innerWidth < 768) closeSidebar();
        if (typeof tripCreator !== 'undefined' && tripCreator.open) {
          tripCreator.open();
        }
      });
    }

    // Gestione resize: chiudi overlay mobile se si passa a desktop
    const mql = window.matchMedia('(min-width: 768px)');
    mql.addEventListener('change', (e) => {
      if (e.matches) {
        closeSidebar();
      }
    });

    // Navigazione SPA per i link della sidebar
    this.initSpaNavigation(closeSidebar);
  },

  /**
   * Navigazione SPA: cambia pagina senza ricaricare la sidebar
   */
  initSpaNavigation(closeSidebar) {
    // Pagine standard supportate dalla navigazione SPA
    const spaPages = ['/', '/index.html', '/past-trips.html', '/notifications.html', '/profile.html', '/pending-bookings.html'];

    // Mappa pagina → funzione init
    const pageInitMap = {
      '/': () => window.homePage?.init(),
      '/index.html': () => window.homePage?.init(),
      '/past-trips.html': () => window.pastTripsPage?.init(),
      '/notifications.html': () => window.notificationsPage?.init(),
      '/profile.html': () => window.profilePage?.init(),
      '/pending-bookings.html': () => window.pendingBookingsPage?.init(),
    };

    const isSpaPage = (url) => {
      const path = new URL(url, location.origin).pathname;
      return spaPages.includes(path);
    };

    const isTripPage = (url) => {
      const path = new URL(url, location.origin).pathname;
      return path.includes('trip.html');
    };

    // Template HTML della pagina trip (iniettato nell'app-content durante SPA navigation)
    const tripTemplate = `
      <header class="header header--trip">
        <div class="container">
          <div class="header-inner header-inner--trip">
            <a href="/index.html" class="trip-back-link" id="trip-close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Indietro</span>
            </a>
            <div class="trip-header-spacer"></div>
          </div>
        </div>
      </header>
      <div class="trip-page-content" id="modal-page-slider">
        <div class="trip-page-main modal-page--main" id="modal-page-main">
          <div class="trip-hero" id="trip-hero">
            <div class="trip-hero-overlay"></div>
            <div class="trip-hero-content">
              <h1 id="trip-title" class="trip-hero-title">Loading...</h1>
              <div class="trip-hero-meta">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span id="trip-dates"></span>
              </div>
            </div>
            <div class="trip-hero-tabs" id="trip-hero-tabs"></div>
          </div>
          <main>
            <div class="container">
              <div id="trip-content">
                <div class="text-center py-6">
                  <span class="spinner"></span>
                </div>
              </div>
            </div>
          </main>
          <div id="footer-placeholder" style="display:none"></div>
        </div>
        <div class="modal-page modal-page--activity" id="modal-page-activity"></div>
      </div>`;

    let _navigating = false;

    /**
     * Naviga verso una pagina standard (non trip) via SPA
     */
    const navigateToPage = async (url, pushState) => {
      const targetPath = new URL(url, location.origin).pathname;

      // Salva pagina attiva per sidebar trip.html
      sessionStorage.setItem('sidebar-active-page', targetPath);

      // Aggiorna link attivo nella sidebar
      document.querySelectorAll('.sidebar-link').forEach(link => {
        const linkPath = new URL(link.href, location.origin).pathname;
        link.classList.toggle('sidebar-link--active', linkPath === targetPath || (targetPath === '/' && linkPath === '/index.html'));
      });

      // Chiudi sidebar su mobile
      if (window.innerWidth < 768) closeSidebar();

      // Fetch della nuova pagina
      const res = await fetch(url);
      if (!res.ok) { window.location.href = url; return; }
      const html = await res.text();

      // Parse HTML ed estrai contenuto del page-wrapper
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newPageWrapper = doc.querySelector('.page-wrapper');
      const currentAppContent = document.querySelector('.app-content');

      if (!newPageWrapper || !currentAppContent) { window.location.href = url; return; }

      // Sostituisci contenuto
      currentAppContent.innerHTML = newPageWrapper.innerHTML;

      // Rimuovi classi pagina-specifiche e ripristina theme-color
      document.body.classList.remove('trip-page');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');

      // Aggiorna titolo e URL
      document.title = doc.title;
      if (pushState) history.pushState({ spaNav: true }, '', url);

      // Ri-renderizza header
      const headerPlaceholder = currentAppContent.querySelector('#header-placeholder');
      if (headerPlaceholder) {
        const isAuthenticated = window.auth?.isAuthenticated();
        const profile = window.auth?.profile;
        navigation.loadHomeHeader(headerPlaceholder, isAuthenticated, profile);

        // Hamburger gestito via event delegation in initSidebar
        navigation.initNotificationDropdown();
      }

      // FAB mobile
      const fabTargets = ['/', '/index.html', '/past-trips.html'];
      const existingFab = document.getElementById('fab-new-trip');
      if (fabTargets.includes(targetPath)) {
        if (!existingFab) navigation.renderFab();
      } else {
        existingFab?.remove();
      }

      // Init pagina target
      const initFn = pageInitMap[targetPath];
      if (initFn) initFn();

      if (typeof i18n !== 'undefined') i18n.apply();
      navigation.refreshPendingCount?.();
      window.scrollTo(0, 0);
    };

    /**
     * Naviga verso trip.html via SPA (carica moduli dinamicamente)
     */
    const navigateToTrip = async (url, pushState) => {
      const currentAppContent = document.querySelector('.app-content');
      if (!currentAppContent) { window.location.href = url; return; }

      // Chiudi sidebar su mobile
      if (window.innerWidth < 768) closeSidebar();

      // Aggiungi classe trip-page al body e aggiorna theme-color
      document.body.classList.add('trip-page');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');

      // Inietta template trip
      currentAppContent.innerHTML = tripTemplate;

      // Rimuovi FAB
      document.getElementById('fab-new-trip')?.remove();

      // Aggiorna URL e titolo
      if (pushState) history.pushState({ spaNav: true, trip: true }, '', url);
      document.title = 'Trip - Travel Flow';

      // Scroll in cima
      window.scrollTo(0, 0);

      // Carica moduli trip se necessario (prima volta)
      if (!window.tripPage) {
        await Promise.all([
          import('./tripFlights.js'),
          import('./tripHotels.js'),
          import('./airportAutocomplete.js'),
          import('./tripActivities.js'),
        ]);
        // tripPage.js auto-inizializza via IIFE (chiama init → loadTripFromUrl)
        await import('./tripPage.js');
      } else {
        // Moduli già caricati: re-init per nuovo viaggio
        await window.tripPage.spaInit();
      }

      // Bind link "Indietro" per SPA navigation
      const backLink = document.getElementById('trip-close-btn');
      if (backLink) {
        backLink.addEventListener('click', (e) => {
          e.preventDefault();
          const source = sessionStorage.getItem('sidebar-active-page') || '/index.html';
          navigate(source);
        });
      }
    };

    /**
     * Funzione navigate principale
     */
    const navigate = async (url, pushState = true) => {
      const targetUrl = new URL(url, location.origin);
      const currentUrl = new URL(location.href);

      // Stessa pagina (path + search) — skip
      if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) return;
      if (_navigating) return;
      _navigating = true;

      try {
        if (isTripPage(url)) {
          await navigateToTrip(url, pushState);
        } else if (isSpaPage(url)) {
          await navigateToPage(url, pushState);
        } else {
          window.location.href = url;
        }
      } catch (err) {
        console.error('[nav] SPA navigation failed:', err);
        window.location.href = url;
      } finally {
        _navigating = false;
      }
    };

    // Intercetta click sui link sidebar (pagine standard)
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (!isSpaPage(link.href)) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.href);
      });
    });

    // Intercetta link "Indietro" di trip.html (se siamo su trip al caricamento)
    const tripBackLink = document.getElementById('trip-close-btn');
    if (tripBackLink) {
      tripBackLink.addEventListener('click', (e) => {
        e.preventDefault();
        const source = sessionStorage.getItem('sidebar-active-page') || '/index.html';
        navigate(source);
      });
    }

    // Intercetta link del footer sidebar (profilo)
    document.querySelectorAll('.sidebar-user').forEach(link => {
      if (!isSpaPage(link.href)) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.href);
      });
    });

    // Event delegation: intercetta click su link a trip.html ovunque nel contenuto
    document.addEventListener('click', (e) => {
      // Ignora se meta/ctrl (apri in nuovo tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      const link = e.target.closest('a[href*="trip.html?id="]');
      if (!link) return;

      // Verifica che sia un link interno
      const linkUrl = new URL(link.href, location.origin);
      if (linkUrl.origin !== location.origin) return;

      e.preventDefault();
      navigate(link.href);
    });

    // Gestione back/forward del browser
    window.addEventListener('popstate', (e) => {
      const href = location.href;
      if (isSpaPage(href) || isTripPage(href)) {
        navigate(href, false);
      }
    });
  },

  /**
   * Render del FAB mobile "Nuovo Viaggio"
   */
  renderFab() {
    const existing = document.getElementById('fab-new-trip');
    if (existing) existing.remove();

    const fabHtml = `
      <button class="fab-new-trip" id="fab-new-trip">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        <span data-i18n="trip.newShort">Viaggio</span>
      </button>
    `;
    document.body.insertAdjacentHTML('beforeend', fabHtml);

    document.getElementById('fab-new-trip')?.addEventListener('click', () => {
      if (typeof tripCreator !== 'undefined' && tripCreator.open) {
        tripCreator.open();
      }
    });
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
    const mql = window.matchMedia('(min-width: 768px)');

    function update() {
      // Su mobile, header sempre visibile (serve hamburger per aprire menu)
      if (!mql.matches) {
        header.classList.remove('header--hidden');
        const scrollY = window.scrollY;
        if (scrollY > 0) {
          header.classList.add('header--scrolled');
        } else {
          header.classList.remove('header--scrolled');
        }
        ticking = false;
        return;
      }

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
