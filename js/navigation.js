/**
 * Navigation - Header, Footer, and Navigation components
 */

const navigation = {
  /**
   * Initialize navigation components
   */
  async init() {
    await this.loadHeader();
    await this.loadFooter();
    this.initLangSelector();
    this.setActiveNavLink();
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
              <button class="btn btn-primary btn-sm" id="new-trip-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span data-i18n="trip.new">Nuovo Viaggio</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    `;

    headerPlaceholder.innerHTML = headerHTML;
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
            <div class="footer-left">
              <div class="footer-copyright">
                © ${currentYear} Travel Organizer
              </div>
              <div class="footer-version">
                <span>v${version}</span>
                <span>|</span>
                <a href="${prefix}changelog.html" data-i18n="footer.changelog">Changelog</a>
              </div>
            </div>
            <div class="lang-selector">
              <button class="lang-selector-btn" aria-expanded="false" aria-haspopup="true">
                <span class="lang-flag"></span>
                <span class="lang-current"></span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="lang-dropdown lang-dropdown-up" role="menu">
                <button class="lang-option" data-lang="it" role="menuitem">
                  <span>🇮🇹</span>
                  <span>Italiano</span>
                </button>
                <button class="lang-option" data-lang="en" role="menuitem">
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    `;

    footerPlaceholder.innerHTML = footerHTML;
  },

  /**
   * Initialize language selector
   */
  initLangSelector() {
    const selector = document.querySelector('.lang-selector');
    if (!selector) return;

    const btn = selector.querySelector('.lang-selector-btn');
    const dropdown = selector.querySelector('.lang-dropdown');
    const options = selector.querySelectorAll('.lang-option');
    const flagEl = selector.querySelector('.lang-flag');
    const currentEl = selector.querySelector('.lang-current');

    // Update display
    const updateDisplay = () => {
      const lang = i18n.getLang();
      flagEl.textContent = i18n.getLangFlag(lang);
      currentEl.textContent = i18n.getLangName(lang);

      // Update active state
      options.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
      });
    };

    // Initial update
    updateDisplay();

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('active');
      btn.setAttribute('aria-expanded', isOpen);
    });

    // Handle language selection
    options.forEach(option => {
      option.addEventListener('click', async () => {
        const lang = option.dataset.lang;
        await i18n.setLang(lang);
        updateDisplay();
        dropdown.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });

    // Update on language change
    window.addEventListener('languageChanged', updateDisplay);
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
  }
};

// Make available globally
window.navigation = navigation;
