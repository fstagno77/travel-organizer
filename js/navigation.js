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
   * Get path prefix based on current page location
   * @returns {string}
   */
  getPathPrefix() {
    const path = window.location.pathname;

    // Check if we're in trips subfolder (2 levels deep)
    if (path.includes('/trips/')) {
      return '../../';
    }

    // Check if we're in pages subfolder (1 level deep)
    if (path.includes('/pages/')) {
      return '../';
    }

    return './';
  },

  /**
   * Load header component
   */
  async loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;

    const prefix = this.getPathPrefix();
    const isAuthenticated = window.auth?.isAuthenticated();
    const profile = window.auth?.profile;

    // Build auth section based on state
    let authSection = '';
    if (isAuthenticated && profile) {
      // Show profile avatar as direct link to settings
      const initial = profile.username.charAt(0).toUpperCase();
      authSection = `
        <a href="${prefix}profile.html" class="header-profile-link" title="@${profile.username}">
          <span class="header-profile-avatar">${initial}</span>
        </a>
      `;
    } else {
      // Show login button
      authSection = `
        <button class="btn btn-secondary btn-sm" id="login-btn" data-i18n="auth.login">Login</button>
      `;
    }

    // Show "New Trip" button only if authenticated
    const newTripBtn = isAuthenticated ? `
      <button class="btn btn-primary btn-sm" id="new-trip-btn">
        <span data-i18n="trip.new">Nuovo Viaggio</span>
      </button>
    ` : '';

    // Notification bell (only for authenticated users)
    const notificationBell = isAuthenticated ? `
      <a href="${prefix}pending-bookings.html" class="header-notification-btn" id="notification-bell" title="Pending Bookings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="header-notification-badge" id="notification-badge" style="display: none;">0</span>
      </a>
    ` : '';

    const headerHTML = `
      <header class="header">
        <div class="container">
          <div class="header-inner">
            <a href="${prefix}index.html" class="header-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
              </svg>
              <span data-i18n="app.name">Travel Organizer</span>
            </a>

            <div class="header-actions">
              ${newTripBtn}
              ${notificationBell}
              ${authSection}
            </div>
          </div>
        </div>
      </header>
    `;

    headerPlaceholder.innerHTML = headerHTML;

    // Bind login button click if present
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.auth?.showLoginModal();
      });
    }
  },

  /**
   * Load footer component
   */
  async loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;

    const prefix = this.getPathPrefix();

    // Load version from changelog
    let version = '0.1.0';
    try {
      const changelog = await utils.loadJSON(`${prefix}data/changelog.json`);
      if (changelog.versions && changelog.versions.length > 0) {
        version = changelog.versions[0].version;
      }
    } catch (e) {
      console.warn('Could not load version from changelog');
    }

    const currentYear = new Date().getFullYear();

    const footerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-inner">
            <div class="footer-copyright">
              © ${currentYear} Travel Organizer
            </div>
            <div class="footer-right">
              <span class="footer-version">v${version}</span>
              <span class="footer-separator">|</span>
              <a href="${prefix}changelog.html" class="footer-changelog-link" data-i18n="footer.changelog">Changelog</a>
            </div>
          </div>
        </div>
      </footer>
    `;

    footerPlaceholder.innerHTML = footerHTML;
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
