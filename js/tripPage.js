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
  let tabRendered = { activities: false, flights: false, hotels: false };

  // ===========================
  // Shared API exposed to modules
  // ===========================

  window.tripPage = {
    get currentTripData() { return currentTripData; },
    set currentTripData(v) { currentTripData = v; },
    esc,
    escAttr,
    loadTripFromUrl,
    switchToTab,
    rerenderCurrentTab,
    initQuickUploadCard,
    loadSlidePanel,
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
    const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';
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

      // Initialize close button with slide-out animation
      document.getElementById('trip-close-btn')?.addEventListener('click', () => {
        const modal = document.querySelector('.trip-modal');
        document.body.classList.add('closing');
        modal.classList.add('closing');
        modal.addEventListener('animationend', () => {
          if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
            history.back();
          } else {
            window.location.href = '/';
          }
        }, { once: true });
      });

      // Initialize trip creator (for "Change photo" feature)
      if (window.tripCreator) {
        window.tripCreator.init();
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
      console.log('Fetching trip:', tripId);
      const response = await utils.authFetch(`/.netlify/functions/get-trip?id=${encodeURIComponent(tripId)}`);
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Result:', result);

      if (!result.success || !result.tripData) {
        showError('Trip not found');
        return;
      }

      currentTripData = result.tripData;
      console.log('Rendering trip...');
      renderTrip(result.tripData);
      console.log('Trip rendered successfully');
      if (typeof window.__perfMarkTripLoaded === 'function') window.__perfMarkTripLoaded();
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

    // Render content
    renderTripContent(document.getElementById('trip-content'), tripData);
  }

  /**
   * Render trip content with segmented control
   * @param {HTMLElement} container
   * @param {Object} tripData
   */
  function renderTripContent(container, tripData) {
    // Render floating tab bar inside hero
    const heroTabs = document.getElementById('trip-hero-tabs');
    heroTabs.innerHTML = `
      <div class="segmented-control">
        <div class="segmented-indicator"></div>
        <button class="segmented-control-btn" data-tab="activities">
          <span class="material-symbols-outlined" style="font-size: 20px;">calendar_today</span>
          <span data-i18n="trip.activities">Activities</span>
        </button>
        <button class="segmented-control-btn" data-tab="flights">
          <span class="material-symbols-outlined" style="font-size: 20px;">travel</span>
          <span data-i18n="trip.flights">Flights</span>
        </button>
        <button class="segmented-control-btn" data-tab="hotels">
          <span class="material-symbols-outlined" style="font-size: 20px;">bed</span>
          <span data-i18n="trip.hotels">Hotels</span>
        </button>
        <div class="section-menu" id="content-menu">
          <button class="section-menu-btn" id="content-menu-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="section-dropdown" id="content-dropdown">
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
            <div class="section-dropdown-divider"></div>
            <button class="section-dropdown-item" data-action="delete-booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span data-i18n="trip.deleteBookingMenu">Delete booking</span>
            </button>
            <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span data-i18n="trip.deleteTrip">Delete trip</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const html = `
      <div id="activities-tab" class="tab-content">
        <div id="activities-container"></div>
      </div>

      <div id="flights-tab" class="tab-content">
        <div id="flights-container"></div>
      </div>

      <div id="hotels-tab" class="tab-content">
        <div id="hotels-container"></div>
      </div>
    `;

    container.innerHTML = html;

    // Reset tab render state
    tabRendered = { activities: false, flights: false, hotels: false };

    // Initialize tab switching
    initTabSwitching();

    // Determine which tab to show:
    // - Page refresh → restore saved tab
    // - New navigation (opening a trip) → always Activities
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isRefresh = navEntry && navEntry.type === 'reload';
    const savedTab = isRefresh ? sessionStorage.getItem('tripActiveTab') : null;
    const activeTab = savedTab || 'activities';

    // Render only the active tab (lazy rendering — others rendered on first access)
    renderTab(activeTab);
    switchToTab(activeTab);
    showIndicator();

    // Initialize menu
    initMenu(tripData.id);

    // Setup event delegation on tab containers
    setupEventDelegation();

    // Apply translations
    i18n.apply(container);
    i18n.apply(heroTabs);
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
    const isFlightToggle = type === 'flight';
    const indexAttr = isFlightToggle ? 'flightIndex' : 'hotelIndex';
    const index = btn.dataset[indexAttr];
    const detailsId = isFlightToggle ? `flight-details-${index}` : `hotel-details-${index}`;
    const details = document.getElementById(detailsId);
    if (!details) return;

    // Lazy render details on first expand
    if (!details.dataset.rendered) {
      const items = isFlightToggle ? window.tripFlights._flights : window.tripHotels._hotels;
      const renderFn = isFlightToggle ? window.tripFlights.renderDetails : window.tripHotels.renderDetails;
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
      const hideKey = isFlightToggle ? 'flight.hideDetails' : 'hotel.hideDetails';
      const showKey = isFlightToggle ? 'flight.showDetails' : 'hotel.showDetails';
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
    }
    tabRendered[tabName] = true;
    if (typeof window.__perfMarkTabRender === 'function') {
      window.__perfMarkTabRender(performance.now() - t0);
    }
  }

  /**
   * Switch to a specific tab
   * @param {string} tabName - 'flights', 'hotels', or 'activities'
   */
  function switchToTab(tabName) {
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

    // Show/hide menu items based on active tab
    const deleteBookingItem = document.querySelector('[data-action="delete-booking"]');
    const menuDivider = deleteBookingItem?.previousElementSibling;
    const isActivities = tabName === 'activities';

    if (deleteBookingItem) deleteBookingItem.style.display = isActivities ? 'none' : '';
    if (menuDivider?.classList.contains('section-dropdown-divider')) {
      menuDivider.style.display = isActivities ? 'none' : '';
    }
  }

  // ===========================
  // Menu
  // ===========================

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
        } else if (action === 'delete-booking') {
          showDeleteBookingModal(tripId);
        } else if (action === 'share') {
          showShareModal(tripId);
        } else if (action === 'change-photo') {
          changePhoto(tripId);
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
  function showAddChoiceModal(tripId) {
    const existingModal = document.getElementById('add-choice-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay" id="add-choice-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="modal.add">Add</h2>
            <button class="modal-close" id="add-choice-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="add-choice-grid">
              <button class="add-choice-block" data-choice="flight">
                <span class="material-symbols-outlined add-choice-icon">travel</span>
                <span data-i18n="trip.addFlight">Flights</span>
              </button>
              <button class="add-choice-block" data-choice="hotel">
                <span class="material-symbols-outlined add-choice-icon">bed</span>
                <span data-i18n="trip.addHotel">Hotel</span>
              </button>
              <button class="add-choice-block" data-choice="activity">
                <span class="material-symbols-outlined add-choice-icon">event</span>
                <span data-i18n="trip.activities">Activities</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('add-choice-modal');
    i18n.apply(modal);
    const closeBtn = document.getElementById('add-choice-close');

    // Trigger reflow then add active class for CSS transition
    modal.offsetHeight;
    modal.classList.add('active');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll('.add-choice-block').forEach(block => {
      block.addEventListener('click', async () => {
        const choice = block.dataset.choice;
        if (choice === 'flight' || choice === 'hotel') {
          closeModal();
          showAddBookingModal(tripId, choice);
        } else if (choice === 'activity') {
          closeModal();
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const defaultDate = (currentTripData && todayStr >= currentTripData.startDate && todayStr <= currentTripData.endDate)
            ? todayStr
            : (currentTripData?.startDate || todayStr);
          const sp = await loadSlidePanel();
          sp.show('create', defaultDate, null);
        }
      });
    });
  }

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
        submitBooking();
      }
    };

    const submitBooking = async () => {
      if (files.length === 0) return;

      // Show processing state with rotating phrases
      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');
      const originalBodyContent = modalBody.innerHTML;

      modalBody.innerHTML = `
        <div class="processing-state">
          <div class="spinner"></div>
          <p class="processing-phrase loading-phrase"></p>
        </div>
      `;
      modalFooter.style.display = 'none';

      // Start rotating phrases
      const phraseElement = modalBody.querySelector('.processing-phrase');
      const phraseController = utils.startLoadingPhrases(phraseElement, 3000);

      try {
        // Upload files directly to Storage, then send only paths to backend
        await import('./pdfUpload.js');
        const pdfs = await pdfUpload.uploadFiles(files);

        const response = await utils.authFetch('/.netlify/functions/add-booking', {
          method: 'POST',
          body: JSON.stringify({ pdfs, tripId })
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
        }

        if (!response.ok || !result.success) {
          // Check for rate limit error
          if (response.status === 429 || result.errorType === 'rate_limit') {
            throw new Error('rate_limit');
          }
          // Check for duplicate booking error
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
        // Reload trip data
        await loadTripFromUrl();

        // Switch tab: if added from Flights/Hotels, stay on that tab;
        // if added from Activities, navigate to the corresponding tab
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
        phraseController.stop();

        // Show error in modal
        let errorMessage;
        if (error.message === 'rate_limit') {
          errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
        } else if (error.message === 'duplicate') {
          errorMessage = `${i18n.t('trip.duplicateError') || 'This booking is already in'} "${error.tripName}"`;
        } else {
          errorMessage = i18n.t('trip.addError') || 'Error adding booking';
        }
        const errorCode = error.errorCode || '';

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

        // Retry button - restore upload zone
        document.getElementById('error-retry-btn').addEventListener('click', () => {
          modalBody.innerHTML = originalBodyContent;
          modalFooter.style.display = '';
          i18n.apply(modalBody);

          // Re-attach event listeners
          const newUploadZone = document.getElementById('add-booking-upload-zone');
          const newFileInput = document.getElementById('add-booking-file-input');
          newUploadZone.addEventListener('click', () => newFileInput.click());
          newFileInput.addEventListener('change', (e) => {
            addFiles(e.target.files);
            newFileInput.value = '';
          });
          newUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            newUploadZone.classList.add('dragover');
          });
          newUploadZone.addEventListener('dragleave', () => {
            newUploadZone.classList.remove('dragover');
          });
          newUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            newUploadZone.classList.remove('dragover');
            addFiles(e.dataTransfer.files);
          });
        });
      }
    };

    // Upload zone events
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      addFiles(e.target.files);
      fileInput.value = '';
    });
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      addFiles(e.dataTransfer.files);
    });

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
          <div class="modal-footer">
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
    const type = currentTab === 'hotels' ? 'hotel' : 'flight';
    const items = type === 'flight'
      ? (currentTripData?.flights || [])
      : (currentTripData?.hotels || []);

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
                  itemId: id
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
            } else {
              currentTripData.hotels = (currentTripData.hotels || []).filter(h => !deleteIds.has(h.id));
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
   * Show share modal
   * @param {string} tripId
   */
  function showShareModal(tripId) {
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    const shareUrl = `${window.location.origin}/share.html?id=${encodeURIComponent(tripId)}`;

    const modalHTML = `
      <div class="modal-overlay" id="share-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.share">Share</h2>
            <button class="modal-close" id="share-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="mb-4" data-i18n="trip.shareDescription">Share this trip with others using the link below:</p>
            <div class="share-url-container">
              <input type="text" class="share-url-input" id="share-url-input" value="${shareUrl}" readonly>
              <button class="btn btn-primary" id="copy-url-btn" data-i18n="trip.copyLink">Copy link</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('share-modal');
    const closeBtn = document.getElementById('share-close');
    const copyBtn = document.getElementById('copy-url-btn');
    const urlInput = document.getElementById('share-url-input');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyBtn.textContent = i18n.t('trip.copied') || 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = i18n.t('trip.copyLink') || 'Copy link';
        }, 2000);
      } catch (err) {
        urlInput.select();
        document.execCommand('copy');
      }
    });

    urlInput.addEventListener('click', () => urlInput.select());

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
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
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="rename-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-primary" id="rename-submit" data-i18n="modal.save">Save</button>
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

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const submitRename = async () => {
      const newName = input.value.trim();
      if (!newName) return;

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
  // Edit booking panel (shared between flights/hotels)
  // ===========================

  /**
   * Open edit panel for a single item directly from card button
   */
  function openEditPanelForItem(type, itemId) {
    const tripId = currentTripData?.id;
    if (!tripId) return;

    const items = type === 'flight'
      ? (currentTripData?.flights || [])
      : (currentTripData?.hotels || []);

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
    const existingPanel = document.getElementById('edit-booking-panel');
    if (existingPanel) {
      existingPanel.remove();
      document.body.classList.remove('slide-panel-open');
    }

    const formHTML = type === 'flight'
      ? window.tripFlights.buildEditForm(item)
      : window.tripHotels.buildEditForm(item);

    const panelHTML = `
      <div class="slide-panel-overlay" id="edit-booking-panel">
        <div class="slide-panel">
          <div class="slide-panel-header">
            <h2>${i18n.t('trip.editBookingTitle') || 'Modifica prenotazione'}</h2>
            <button class="modal-close" id="edit-panel-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    const panel = document.getElementById('edit-booking-panel');
    const panelBody = panel.querySelector('.slide-panel-body');
    const closeBtn = document.getElementById('edit-panel-close');
    const cancelBtn = document.getElementById('edit-panel-cancel');
    const saveBtn = document.getElementById('edit-panel-save');

    if (type === 'flight') {
      import('./airportAutocomplete.js').then(() => {
        if (window.AirportAutocomplete) {
          window.AirportAutocomplete.init(panelBody);
        }
      });
    }

    let outsideClickHandler = null;
    let escapeHandler = null;

    const closePanel = () => {
      panel.classList.remove('active');
      document.body.classList.remove('slide-panel-open');
      if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
        outsideClickHandler = null;
      }
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
      }
      setTimeout(() => panel.remove(), 300);
      document.body.style.overflow = '';
    };

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
        const updates = type === 'flight'
          ? window.tripFlights.collectUpdates(panelBody)
          : window.tripHotels.collectUpdates(panelBody);

        const response = await utils.authFetch('/.netlify/functions/edit-booking', {
          method: 'POST',
          body: JSON.stringify({ tripId, type, itemId: item.id, updates })
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closePanel();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
        utils.showToast(i18n.t('trip.editBookingSuccess') || 'Booking updated', 'success');
      } catch (error) {
        console.error('Error editing booking:', error);
        utils.showToast(i18n.t('trip.editError') || 'Error updating', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('modal.save') || 'Salva';
      }
    };

    closeBtn.addEventListener('click', closePanel);
    cancelBtn.addEventListener('click', closePanel);
    saveBtn.addEventListener('click', performSave);

    // Close on click outside the panel
    outsideClickHandler = (e) => {
      const slidePanel = panel.querySelector('.slide-panel');
      if (slidePanel && !slidePanel.contains(e.target)) {
        closePanel();
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClickHandler), 10);

    // Close on Escape key
    escapeHandler = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', escapeHandler);

    // Trigger animation
    requestAnimationFrame(() => {
      panel.classList.add('active');
      document.body.classList.add('slide-panel-open');
    });
    document.body.style.overflow = 'hidden';
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
    }

    const titleKey = type === 'flight' ? 'flight.deleteTitle' : 'hotel.deleteTitle';
    const confirmKey = type === 'flight' ? 'flight.deleteConfirm' : 'hotel.deleteConfirm';
    const deleteKey = type === 'flight' ? 'flight.delete' : 'hotel.delete';

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
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/delete-booking', {
          method: 'POST',
          body: JSON.stringify({
            tripId: currentTripData.id,
            type: type,
            itemId: itemId
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
        } else {
          currentTripData.hotels = (currentTripData.hotels || []).filter(h => h.id !== itemId);
        }

        // Check if this was the last booking
        if ((currentTripData.flights || []).length === 0 && (currentTripData.hotels || []).length === 0) {
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
  function initQuickUploadCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const input = card.querySelector('.quick-upload-input');

    // Click to select file
    card.addEventListener('click', (e) => {
      if (e.target !== input) {
        input.click();
      }
    });

    // File selected
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        handleQuickUpload(file);
      }
      input.value = ''; // Reset for next upload
    });

    // Drag & drop
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('dragover');
    });

    card.addEventListener('dragleave', (e) => {
      e.preventDefault();
      card.classList.remove('dragover');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dragover');

      const pdfFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 1) {
        utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
        return;
      }
      if (pdfFiles.length === 1) {
        handleQuickUpload(pdfFiles[0]);
      }
    });
  }

  /**
   * Handle quick upload - process file immediately
   * @param {File} file - The PDF file to upload
   */
  async function handleQuickUpload(file) {
    // Show loading state on all quick upload cards
    const cards = document.querySelectorAll('.quick-upload-card');
    const phraseControllers = [];

    cards.forEach(card => {
      card.classList.add('uploading');
      const text = card.querySelector('.quick-upload-text');
      if (text) {
        text.dataset.originalText = text.textContent;
        text.classList.add('loading-phrase');
        // Start rotating phrases
        const controller = utils.startLoadingPhrases(text, 3000);
        phraseControllers.push(controller);
      }
    });

    try {
      // Upload file directly to Storage, then send only path to backend
      await import('./pdfUpload.js');
      const pdfs = await pdfUpload.uploadFiles([file]);

      const response = await utils.authFetch('/.netlify/functions/add-booking', {
        method: 'POST',
        body: JSON.stringify({ pdfs, tripId: currentTripData.id })
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
      }

      // Check for rate limit error
      if (response.status === 429 || result.errorType === 'rate_limit') {
        throw new Error('rate_limit');
      }

      // Check for duplicate booking error
      if (response.status === 409 || result.errorType === 'duplicate') {
        const error = new Error('duplicate');
        error.tripName = result.tripName;
        throw error;
      }

      if (!response.ok || !result.success) {
        throw Object.assign(
          new Error(result.error || 'Failed to add booking'),
          { errorCode: result.errorCode }
        );
      }

      // Remember current tab, reload, then stay on same tab
      const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
      await loadTripFromUrl();
      if (currentTab) switchToTab(currentTab);

      utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
    } catch (error) {
      let errorMessage;
      if (error.message === 'rate_limit') {
        console.log('Rate limit reached');
        errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
      } else if (error.message === 'duplicate') {
        console.log('Duplicate booking detected');
        errorMessage = `${i18n.t('trip.duplicateError') || 'This booking is already in'} "${error.tripName}"`;
      } else {
        console.error('Error in quick upload:', error);
        errorMessage = i18n.t('trip.addError') || 'Error adding booking';
        if (error.errorCode) errorMessage += ` [${error.errorCode}]`;
      }
      utils.showToast(errorMessage, 'error');
    } finally {
      // Stop rotating phrases
      phraseControllers.forEach(controller => controller.stop());

      // Reset loading state
      cards.forEach(card => {
        card.classList.remove('uploading');
        const text = card.querySelector('.quick-upload-text');
        if (text) {
          text.classList.remove('loading-phrase', 'phrase-visible');
          if (text.dataset.originalText) {
            text.textContent = text.dataset.originalText;
          }
        }
      });
    }
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
