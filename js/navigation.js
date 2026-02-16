/**
 * Navigation - Header, Footer, and Navigation components
 */

const navigation = {
  pendingCount: 0,
  pollInterval: null,

  /**
   * Initialize navigation components
   */
  async init() {
    await this.loadHeader();
    await this.loadFooter();
    this.setActiveNavLink();
    this.startPendingBookingsPolling();
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
    let rightActions = '';
    if (isAuthenticated) {
      const initial = profile?.username?.charAt(0).toUpperCase() || '?';
      rightActions = `
        <a href="/pending-bookings.html" class="header-glass-btn" id="notification-bell" title="Pending Bookings">
          ${bellSvg}
          <span class="header-glass-badge" id="notification-badge" style="display: none;">0</span>
        </a>
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
   * Fetch and update pending bookings count
   */
  async updatePendingBookingsCount() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    try {
      const response = await window.utils?.authFetch('/.netlify/functions/pending-bookings');
      if (!response || !response.ok) {
        badge.style.display = 'none';
        return;
      }

      const data = await response.json();
      this.pendingCount = data.count || 0;

      if (this.pendingCount > 0) {
        badge.textContent = this.pendingCount > 99 ? '99+' : this.pendingCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to fetch pending bookings count:', error);
      badge.style.display = 'none';
    }
  },

  /**
   * Manually refresh the pending count (called after actions)
   */
  async refreshPendingCount() {
    await this.updatePendingBookingsCount();
  }
};

// Make available globally
window.navigation = navigation;
