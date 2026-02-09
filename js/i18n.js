/**
 * i18n - Internationalization module
 */

const i18n = {
  currentLang: 'it',
  translations: {},
  supportedLangs: ['it', 'en'],
  defaultLang: 'en', // Default to English for non-Italian browsers

  /**
   * Initialize i18n system
   */
  async init() {
    // Get stored language or detect from browser
    const storedLang = localStorage.getItem('lang');
    const browserLang = navigator.language.slice(0, 2);

    // Determine which language to use:
    // 1. Use stored preference if valid
    // 2. Use Italian if browser is Italian
    // 3. Use English for all other cases
    if (storedLang && this.supportedLangs.includes(storedLang)) {
      this.currentLang = storedLang;
    } else if (browserLang === 'it') {
      this.currentLang = 'it';
    } else {
      this.currentLang = 'en';
    }

    // Load translations
    await this.load(this.currentLang);
  },

  /**
   * Load translations for a language
   * @param {string} lang - Language code
   */
  async load(lang) {
    try {
      const response = await fetch(`/i18n/${lang}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }

      this.translations = await response.json();
      this.currentLang = lang;
      localStorage.setItem('lang', lang);

      // Update HTML lang attribute
      document.documentElement.lang = lang;

      // Apply translations to DOM
      this.apply();

      // Dispatch custom event for components that need to update
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);

      // Fallback to default language if not already trying it
      if (lang !== this.defaultLang) {
        console.log(`Falling back to ${this.defaultLang}`);
        await this.load(this.defaultLang);
      }
    }
  },

  /**
   * Get translation by key path
   * @param {string} key - Dot-notation key (e.g., 'nav.home')
   * @param {object} params - Optional parameters for interpolation
   * @returns {string} Translated string or key if not found
   */
  t(key, params = {}) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], this.translations);

    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Simple interpolation: replace {param} with value
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  },

  /**
   * Apply translations to all elements with data-i18n attributes
   * @param {Element|Document} [root=document] - Root element to search within
   */
  apply(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria]').forEach(el => {
      if (el.dataset.i18n) {
        const translation = this.t(el.dataset.i18n);
        if (translation !== el.dataset.i18n) el.textContent = translation;
      }
      if (el.dataset.i18nPlaceholder) {
        const translation = this.t(el.dataset.i18nPlaceholder);
        if (translation !== el.dataset.i18nPlaceholder) el.placeholder = translation;
      }
      if (el.dataset.i18nTitle) {
        const translation = this.t(el.dataset.i18nTitle);
        if (translation !== el.dataset.i18nTitle) el.title = translation;
      }
      if (el.dataset.i18nAria) {
        const translation = this.t(el.dataset.i18nAria);
        if (translation !== el.dataset.i18nAria) el.setAttribute('aria-label', translation);
      }
    });
  },

  /**
   * Change language
   * @param {string} lang - Language code
   */
  async setLang(lang) {
    if (this.supportedLangs.includes(lang) && lang !== this.currentLang) {
      await this.load(lang);
    }
  },

  /**
   * Get current language
   * @returns {string}
   */
  getLang() {
    return this.currentLang;
  },

  /**
   * Get language display name
   * @param {string} lang - Language code
   * @returns {string}
   */
  getLangName(lang) {
    const names = {
      it: 'Italiano',
      en: 'English'
    };
    return names[lang] || lang;
  },

  /**
   * Check if device is touch-only (smartphone/tablet without mouse)
   * @returns {boolean}
   */
  isTouchDevice() {
    return 'ontouchstart' in window && window.matchMedia('(max-width: 768px)').matches;
  },

  /**
   * Get language flag emoji
   * @param {string} lang - Language code
   * @returns {string}
   */
  getLangFlag(lang) {
    const flags = {
      it: '🇮🇹',
      en: '🇬🇧'
    };
    return flags[lang] || '';
  }
};

// Make available globally
window.i18n = i18n;
