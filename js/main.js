/**
 * Main - Application entry point and page router
 */
(async function() {
  'use strict';

  /**
   * Initialize the application
   */
  async function init() {
    console.log('[main] init() started');
    try {
      // Initialize i18n first
      console.log('[main] Initializing i18n...');
      await i18n.init();

      // Initialize auth
      console.log('[main] Initializing auth...');
      if (typeof auth !== 'undefined') {
        await auth.init();

        // Apply language preference from profile if available
        if (auth.profile?.language_preference) {
          await i18n.setLang(auth.profile.language_preference);
        }
      }

      // Initialize navigation (header, footer)
      console.log('[main] Initializing navigation...');
      await navigation.init();

      // Re-apply translations after navigation is loaded
      console.log('[main] Applying translations...');
      i18n.apply();

      // Initialize trip creator (modal for new trips)
      if (typeof tripCreator !== 'undefined') {
        tripCreator.init();
      }

      // Initialize page-specific functionality
      console.log('[main] Initializing page-specific functionality...');
      initPageSpecific();
      console.log('[main] init() completed');

    } catch (error) {
      console.error('[main] Error initializing application:', error);
    }
  }

  /**
   * Initialize page-specific functionality
   */
  function initPageSpecific() {
    const path = window.location.pathname;

    if ((path.endsWith('/') || path.endsWith('index.html')) && typeof homePage !== 'undefined') {
      homePage.init();
    }
  }

  // Listen for language changes to re-render dynamic content
  // Only re-render if auth is already initialized to avoid race conditions
  window.addEventListener('languageChanged', () => {
    if (auth?.initialized) {
      initPageSpecific();
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
