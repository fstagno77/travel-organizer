/**
 * Share - Shared trip view functionality
 * View-only rendering with activities, flights, and hotels tabs
 */

(async function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);

  const cats = () => window.activityCategories;

  // Filter/search state (module-scoped)
  let activeFilters = new Set(window.activityCategories.CATEGORY_ORDER);
  let _presentCategories = new Set();
  let searchQuery = '';
  let _dropdownCleanup = null;

  /**
   * Initialize the shared view
   */
  async function init() {
    try {
      await i18n.init();
      initLangSelector();
      i18n.apply();
      initAutoHideHeader();
      initShareHeaderButton();
      await initSharedTripPage();
    } catch (error) {
      console.error('Error initializing shared view:', error);
    }
  }

  /**
   * Auto-hide header: hides on scroll down, shows on scroll up
   */
  function initAutoHideHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;
    const threshold = 5;

    function update() {
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

  /**
   * Initialize share button in header
   */
  function initShareHeaderButton() {
    const btn = document.getElementById('share-header-btn');
    if (btn) {
      btn.addEventListener('click', showShareModal);
    }
  }

  /**
   * Initialize language selector (simplified version)
   */
  function initLangSelector() {
    const selector = document.querySelector('.lang-selector');
    if (!selector) return;

    const btn = selector.querySelector('.lang-selector-btn');
    const dropdown = selector.querySelector('.lang-dropdown');
    const options = selector.querySelectorAll('.lang-option');
    const flagEl = selector.querySelector('.lang-flag');
    const currentEl = selector.querySelector('.lang-current');

    const updateDisplay = () => {
      const lang = i18n.getLang();
      flagEl.textContent = i18n.getLangFlag(lang);
      currentEl.textContent = i18n.getLangName(lang);
      options.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
      });
    };

    updateDisplay();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('active');
      btn.setAttribute('aria-expanded', isOpen);
    });

    options.forEach(option => {
      option.addEventListener('click', async () => {
        const lang = option.dataset.lang;
        await i18n.setLang(lang);
        updateDisplay();
        dropdown.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        initSharedTripPage();
      });
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Initialize shared trip page
   */
  async function initSharedTripPage() {
    const contentContainer = document.getElementById('trip-content');
    if (!contentContainer) return;

    try {
      const token = new URLSearchParams(window.location.search).get('token');

      if (!token) {
        throw new Error('noToken');
      }

      const response = await fetch(`/.netlify/functions/get-shared-trip?token=${encodeURIComponent(token)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorKey = result.error || 'shareNotFound';
        throw new Error(errorKey);
      }

      const tripData = result.tripData;

      // Update page title
      const lang = i18n.getLang();
      const title = tripData.title?.[lang] || tripData.title?.en || tripData.title?.it || '';
      document.title = `${title} - Travel Flow`;

      // Update hero
      updateTripHero(tripData);

      // Render hero tabs
      renderHeroTabs(tripData);

      // Render content
      renderSharedTripContent(contentContainer, tripData);

    } catch (error) {
      console.error('Error loading trip data:', error);

      // Clear hero tabs on error
      const heroTabs = document.getElementById('trip-hero-tabs');
      if (heroTabs) heroTabs.innerHTML = '';

      const isExpired = error.message === 'shareExpired';
      const icon = isExpired ? '⏱️' : '🔗';
      const titleKey = isExpired ? 'trip.shareExpired' : 'trip.shareNotFound';
      const defaultTitle = isExpired ? 'This shared link has expired' : 'Shared trip not found';

      contentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icon}</div>
          <h3 class="empty-state-title">${i18n.t(titleKey) || defaultTitle}</h3>
        </div>
      `;
    }
  }

  /**
   * Update trip hero with trip data
   */
  function updateTripHero(tripData) {
    const lang = i18n.getLang();

    const titleEl = document.querySelector('.trip-hero-title');
    if (titleEl) {
      titleEl.textContent = tripData.title?.[lang] || tripData.title?.en || tripData.title?.it || '';
    }

    const dateEl = document.getElementById('trip-dates');
    if (dateEl && tripData.startDate && tripData.endDate) {
      const start = utils.formatDate(tripData.startDate, lang, { month: 'short', day: 'numeric' });
      const end = utils.formatDate(tripData.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
      dateEl.textContent = `${start} - ${end}`;
    }

    // Set hero background image if available
    const hero = document.getElementById('trip-hero');
    if (hero && tripData.coverPhoto?.url) {
      hero.style.backgroundImage = `url('${tripData.coverPhoto.url}')`;
    }
  }

  /**
   * Render tabs in the hero section
   */
  function renderHeroTabs(tripData) {
    const heroTabs = document.getElementById('trip-hero-tabs');
    if (!heroTabs) return;

    heroTabs.innerHTML = `
      <div class="segmented-control">
        <div class="segmented-indicator"></div>
        <button class="segmented-control-btn" data-tab="activities">
          <span class="material-symbols-outlined" style="font-size: 20px;">calendar_today</span>
          <span data-i18n="trip.activities">Attività</span>
        </button>
        <button class="segmented-control-btn" data-tab="flights">
          <span class="material-symbols-outlined" style="font-size: 20px;">travel</span>
          <span data-i18n="trip.flights">Voli</span>
        </button>
        <button class="segmented-control-btn" data-tab="hotels">
          <span class="material-symbols-outlined" style="font-size: 20px;">bed</span>
          <span data-i18n="trip.hotels">Hotel</span>
        </button>
      </div>
    `;

    i18n.apply(heroTabs);
  }

  /**
   * Render shared trip content (tab containers only)
   */
  function renderSharedTripContent(container, tripData) {
    container.innerHTML = `
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

    // Render all tabs
    renderActivities(document.getElementById('activities-container'), tripData);
    renderFlights(document.getElementById('flights-container'), tripData.flights);
    renderHotels(document.getElementById('hotels-container'), tripData.hotels);

    // Initialize tab switching
    initTabSwitching();

    // Determine default tab
    const hasFlights = tripData.flights && tripData.flights.length > 0;
    const hasHotels = tripData.hotels && tripData.hotels.length > 0;
    const hasActivities = tripData.activities && tripData.activities.length > 0;

    // Default to activities tab (always has content if there are flights/hotels)
    if (hasFlights || hasHotels || hasActivities) {
      switchToTab('activities');
    } else {
      switchToTab('flights');
    }
    showIndicator();
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
      tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
    });
  }

  function switchToTab(tabName) {
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

  // ===========================
  // Share modal
  // ===========================

  function showShareModal() {
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    const shareUrl = window.location.href;

    const modalHTML = `
      <div class="modal-overlay active" id="share-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.shareTitle">Condividi viaggio</h2>
            <button class="modal-close" id="share-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="share-description" data-i18n="trip.shareDescription">Copia questo link per condividere il viaggio con altri.</p>
            <div class="share-link-container">
              <input type="text" id="share-link-input" class="form-input share-link-input" value="${shareUrl}" readonly>
              <button class="btn btn-primary share-copy-btn" id="share-copy-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span data-i18n="trip.copyLink">Copia</span>
              </button>
            </div>
            <div class="share-copied-message" id="share-copied-message" data-i18n="trip.linkCopied">Link copiato!</div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('share-modal');
    const closeBtn = document.getElementById('share-modal-close');
    const copyBtn = document.getElementById('share-copy-btn');
    const linkInput = document.getElementById('share-link-input');
    const copiedMessage = document.getElementById('share-copied-message');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copiedMessage.classList.add('visible');
        setTimeout(() => copiedMessage.classList.remove('visible'), 2000);
      } catch (err) {
        linkInput.select();
        document.execCommand('copy');
        copiedMessage.classList.add('visible');
        setTimeout(() => copiedMessage.classList.remove('visible'), 2000);
      }
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    copyBtn.addEventListener('click', copyLink);
    linkInput.addEventListener('focus', () => linkInput.select());

    i18n.apply(modal);
  }

  // ===========================
  // Activities (view-only)
  // ===========================

  /**
   * Build day-by-day events from trip data
   * (Minimal copy of tripActivities.js buildDayEvents)
   */
  function buildDayEvents(tripData) {
    const lang = i18n.getLang();
    const oneDay = 24 * 60 * 60 * 1000;
    const toLocalDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const flights = tripData.flights || [];
    const hotels = tripData.hotels || [];
    const customActivities = tripData.activities || [];
    const events = [];

    for (const flight of flights) {
      events.push({ date: flight.date, time: flight.departureTime || null, type: 'flight', data: flight });
    }

    for (const hotel of hotels) {
      const checkInDate = hotel.checkIn?.date;
      const checkOutDate = hotel.checkOut?.date;
      if (checkInDate) {
        events.push({ date: checkInDate, time: hotel.checkIn?.time || null, type: 'hotel-checkin', data: hotel });
      }
      if (checkInDate && checkOutDate) {
        const start = new Date(checkInDate + 'T00:00:00');
        const end = new Date(checkOutDate + 'T00:00:00');
        let current = new Date(start.getTime() + oneDay);
        while (current < end) {
          events.push({ date: toLocalDateStr(current), time: null, type: 'hotel-stay', data: hotel });
          current = new Date(current.getTime() + oneDay);
        }
      }
      if (checkOutDate) {
        events.push({ date: checkOutDate, time: hotel.checkOut?.time || null, type: 'hotel-checkout', data: hotel });
      }
    }

    for (const activity of customActivities) {
      events.push({ date: activity.date, time: activity.startTime || null, type: 'activity', data: activity });
    }

    const grouped = {};
    for (const event of events) {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }

    const allDates = [];
    if (tripData.startDate && tripData.endDate) {
      let current = new Date(tripData.startDate + 'T00:00:00');
      const end = new Date(tripData.endDate + 'T00:00:00');
      while (current <= end) {
        allDates.push(toLocalDateStr(current));
        current = new Date(current.getTime() + oneDay);
      }
    }
    for (const date of Object.keys(grouped)) {
      if (!allDates.includes(date)) allDates.push(date);
    }
    allDates.sort();

    const typePriority = { 'hotel-checkout': 0, 'flight': 1, 'hotel-checkin': 2, 'hotel-stay': 3, 'activity': 4 };
    for (const date of allDates) {
      if (grouped[date]) {
        grouped[date].sort((a, b) => {
          const aHasTime = a.time !== null;
          const bHasTime = b.time !== null;
          if (aHasTime !== bHasTime) return aHasTime ? 1 : -1;
          if (aHasTime && bHasTime && a.time !== b.time) return a.time.localeCompare(b.time);
          return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
        });
      }
    }

    return { allDates, grouped, lang };
  }

  // ===========================
  // Filter helpers
  // ===========================

  function matchesSearch(event, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const d = event.data;
    if (event.type === 'flight') {
      const parts = [
        d.departure?.city, d.departure?.code, d.arrival?.city, d.arrival?.code,
        d.airline, d.flightNumber
      ];
      return parts.some(p => p && p.toLowerCase().includes(q));
    }
    const s = v => typeof v === 'string' && v.toLowerCase().includes(q);
    if (event.type.startsWith('hotel')) {
      return s(d.name) || s(d.address);
    }
    return s(d.name) || s(d.description) || s(d.address);
  }

  function getFilteredDayData(dayData) {
    const { allDates, grouped, lang } = dayData;
    const filtered = {};
    for (const date of allDates) {
      const events = grouped[date] || [];
      filtered[date] = events.filter(event =>
        activeFilters.has(cats().eventToCategoryKey(event)) && matchesSearch(event, searchQuery)
      );
    }
    return { allDates, grouped: filtered, lang };
  }

  function getPresentCategories(dayData) {
    const present = new Set();
    for (const date of dayData.allDates) {
      for (const event of (dayData.grouped[date] || [])) {
        present.add(cats().eventToCategoryKey(event));
      }
    }
    return present;
  }

  // ===========================
  // Activity Header + Filter Panel
  // ===========================

  function renderFilterPanel(presentCategories) {
    const c = cats();
    const keys = c.CATEGORY_ORDER.filter(k => presentCategories.has(k));
    if (keys.length <= 1) return '';

    const pills = keys.map(key => {
      const cat = c.CATEGORIES[key];
      const label = c.getCategoryLabel(cat);
      return `<button class="activity-filter-pill active" data-category="${key}"
                      data-gradient="${cat.gradient}" data-gradient-hover="${cat.gradientHover}">
                <span class="activity-filter-pill-icon">${cat.svg}</span>
                ${label}
              </button>`;
    }).join('');

    return `
      <div class="activity-filter-header">
        <span class="activity-filter-title">Filtra per tipo:</span>
        <button class="activity-filter-deselect" id="activity-filter-deselect">Deseleziona tutti</button>
      </div>
      <div class="activity-filter-pills">${pills}</div>
    `;
  }

  function renderActivityHeader(presentCategories) {
    const icons = cats().ICONS;
    const filterPanel = renderFilterPanel(presentCategories);
    const showFilter = filterPanel.length > 0;
    return `
      <div class="activity-header">
        <div class="activity-header-title">${i18n.t('trip.activities') || 'Attività'}</div>
        <div class="activity-header-actions">
          <div class="activity-btn-container" id="activity-search-container">
            <button class="activity-header-btn" id="activity-search-btn" title="Cerca">
              ${icons.search}
            </button>
            <div class="activity-dropdown" id="activity-search-dropdown" hidden>
              <div class="activity-dropdown-arrow"></div>
              <div class="activity-search-wrapper">
                <input type="text" class="activity-search-input" placeholder="Cerca attività..." id="activity-search-input">
                <button class="activity-search-clear" id="activity-search-clear" hidden>&times;</button>
              </div>
            </div>
          </div>
          ${showFilter ? `<div class="activity-btn-container" id="activity-filter-container">
            <button class="activity-header-btn" id="activity-filter-btn" title="Filtra">
              ${icons.filter}
            </button>
            <div class="activity-dropdown activity-dropdown--filter" id="activity-filter-dropdown" hidden>
              <div class="activity-dropdown-arrow"></div>
              ${filterPanel}
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  // ===========================
  // List View (read-only)
  // ===========================

  function renderListViewShared(container, dayData) {
    const { allDates, grouped, lang } = dayData;

    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const itemsHtml = dayEvents.map(event => {
        const category = cats().getCategoryForEvent(event);
        let text = '';

        if (event.type === 'flight') {
          const dep = event.data.departure?.city || event.data.departure?.code || '';
          const dest = event.data.arrival?.city || event.data.arrival?.code || '';
          text = `Volo da <strong>${esc(dep)}</strong> \u2192 <strong>${esc(dest)}</strong>`;
        } else if (event.type === 'hotel-checkin') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - Check-in`;
        } else if (event.type === 'hotel-stay') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - ${i18n.t('hotel.stay') || 'Soggiorno'}`;
        } else if (event.type === 'hotel-checkout') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - Check-out`;
        } else if (event.type === 'activity') {
          const desc = event.data.description ? ' - ' + esc(event.data.description) : '';
          text = `<strong>${esc(event.data.name)}</strong>${desc}`;
        }

        let timeLabel = event.time || '';
        if (timeLabel && event.type === 'flight' && event.data.arrivalTime) {
          timeLabel += ' \u2192 ' + event.data.arrivalTime;
          if (event.data.arrivalNextDay) timeLabel += ' +1';
        }
        if (timeLabel && event.type === 'activity' && event.data.endTime) {
          timeLabel += ' \u2013 ' + event.data.endTime;
        }
        const timeStr = timeLabel
          ? `<span class="activity-item-time">${esc(timeLabel)}</span>`
          : '';

        return `
          <div class="activity-item" style="--cat-color: ${category.color}">
            <span class="activity-item-icon" style="color: ${category.color}">${category.svg}</span>
            ${timeStr}
            <span class="activity-item-text">${text}</span>
          </div>
        `;
      }).join('');

      const emptyDay = dayEvents.length === 0
        ? '<div class="activity-item activity-item--empty">\u2014</div>'
        : '';

      return `
        <div class="activity-day">
          <div class="activity-day-sidebar">
            <div class="activity-day-header">
              <div class="activity-day-number">${dayNumber}</div>
              <div class="activity-day-meta">${weekdayShort}, ${monthShort}</div>
            </div>
          </div>
          <div class="activity-list">
            ${itemsHtml}
            ${emptyDay}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // ===========================
  // Re-render & interactions
  // ===========================

  function rerenderContent(container, dayData) {
    const contentDiv = document.getElementById('activities-view-content');
    if (!contentDiv) return;
    const filteredData = getFilteredDayData(dayData);
    renderListViewShared(contentDiv, filteredData);
  }

  function initActivityInteractions(container, dayData) {
    const filterBtn = document.getElementById('activity-filter-btn');
    const filterDropdown = document.getElementById('activity-filter-dropdown');
    const searchBtn = document.getElementById('activity-search-btn');
    const searchDropdown = document.getElementById('activity-search-dropdown');

    function closeAllDropdowns() {
      if (searchDropdown) { searchDropdown.hidden = true; searchBtn?.classList.remove('active'); }
      if (filterDropdown) { filterDropdown.hidden = true; filterBtn?.classList.remove('active'); }
    }

    if (filterBtn && filterDropdown) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = filterDropdown.hidden;
        closeAllDropdowns();
        if (isHidden) {
          filterDropdown.hidden = false;
          filterBtn.classList.add('active');
        }
      });
    }

    if (filterDropdown) {
      filterDropdown.querySelectorAll('.activity-filter-pill.active').forEach(p => {
        p.style.background = p.dataset.gradient;
      });

      filterDropdown.addEventListener('mouseenter', (e) => {
        const pill = e.target.closest('.activity-filter-pill');
        if (pill && pill.classList.contains('active')) {
          pill.style.background = pill.dataset.gradientHover;
        }
      }, true);
      filterDropdown.addEventListener('mouseleave', (e) => {
        const pill = e.target.closest('.activity-filter-pill');
        if (pill && pill.classList.contains('active')) {
          pill.style.background = pill.dataset.gradient;
        }
      }, true);

      filterDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const pill = e.target.closest('.activity-filter-pill');
        if (pill) {
          const catKey = pill.dataset.category;
          pill.classList.toggle('active');
          pill.style.background = pill.classList.contains('active') ? pill.dataset.gradient : '';
          if (activeFilters.has(catKey)) {
            activeFilters.delete(catKey);
          } else {
            activeFilters.add(catKey);
          }
          rerenderContent(container, dayData);
          return;
        }
        const deselectBtn = e.target.closest('#activity-filter-deselect');
        if (deselectBtn) {
          const allActive = activeFilters.size === 0;
          filterDropdown.querySelectorAll('.activity-filter-pill').forEach(p => {
            p.classList.toggle('active', allActive);
            p.style.background = allActive ? p.dataset.gradient : '';
          });
          if (allActive) {
            activeFilters = new Set(_presentCategories);
            deselectBtn.textContent = 'Deseleziona tutti';
          } else {
            activeFilters.clear();
            deselectBtn.textContent = 'Seleziona tutti';
          }
          rerenderContent(container, dayData);
        }
      });
    }

    if (searchBtn && searchDropdown) {
      searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = searchDropdown.hidden;
        closeAllDropdowns();
        if (isHidden) {
          searchDropdown.hidden = false;
          searchBtn.classList.add('active');
          document.getElementById('activity-search-input')?.focus();
        }
      });
      searchDropdown.addEventListener('click', (e) => e.stopPropagation());

      const searchInput = document.getElementById('activity-search-input');
      const searchClear = document.getElementById('activity-search-clear');
      if (searchInput && searchClear) {
        searchInput.addEventListener('input', () => {
          searchClear.hidden = !searchInput.value;
          searchQuery = searchInput.value.trim();
          rerenderContent(container, dayData);
        });
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchClear.hidden = true;
          searchQuery = '';
          rerenderContent(container, dayData);
          searchInput.focus();
        });
      }
    }

    if (_dropdownCleanup) _dropdownCleanup();
    document.addEventListener('click', closeAllDropdowns);
    _dropdownCleanup = () => document.removeEventListener('click', closeAllDropdowns);
  }

  /**
   * Render activities tab (view-only with filter & search)
   */
  function renderActivities(container, tripData) {
    const flights = tripData.flights || [];
    const hotels = tripData.hotels || [];
    const customActivities = tripData.activities || [];

    if (flights.length === 0 && hotels.length === 0 && customActivities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noActivities">Nessuna attività</h3>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    const dayData = buildDayEvents(tripData);
    _presentCategories = getPresentCategories(dayData);
    activeFilters = new Set(_presentCategories);
    searchQuery = '';

    container.innerHTML = renderActivityHeader(_presentCategories);

    const contentDiv = document.createElement('div');
    contentDiv.id = 'activities-view-content';
    container.appendChild(contentDiv);

    renderListViewShared(contentDiv, dayData);
    initActivityInteractions(container, dayData);

    i18n.apply(container);
  }

  // ===========================
  // Flights
  // ===========================

  function isFlightPast(flight) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const flightDate = new Date(flight.date);
    flightDate.setHours(0, 0, 0, 0);
    return flightDate < today;
  }

  function renderFlights(container, flights) {
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">Nessun volo</h3>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    const lang = i18n.getLang();

    const sortedFlights = [...flights].sort((a, b) => {
      const aPast = isFlightPast(a);
      const bPast = isFlightPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedFlights.map((flight, index) => {
      const trackingUrl = utils.getFlightTrackingUrl(flight.flightNumber);
      const formattedDate = utils.formatFlightDate(flight.date, lang);
      const duration = utils.formatDuration(flight.duration, lang);
      const isPast = isFlightPast(flight);

      return `
        <div class="flight-card${isPast ? ' past' : ''}">
          <div class="flight-card-header">
            <span class="flight-date">${esc(formattedDate)}</span>
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="flight-number-link">
              ${esc(flight.flightNumber)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div class="flight-card-body">
            <div class="flight-route">
              <div class="flight-endpoint">
                <div class="flight-time">${esc(flight.departureTime)}</div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${esc(flight.departure.code)}</span>
                </div>
                <div class="flight-airport">${esc(flight.departure.city)}</div>
              </div>

              <div class="flight-arrow">
                <div class="flight-duration">${esc(duration)}</div>
                <div class="flight-arrow-line"></div>
              </div>

              <div class="flight-endpoint">
                <div class="flight-time">${esc(flight.arrivalTime)}${flight.arrivalNextDay ? ' +1' : ''}</div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${esc(flight.arrival.code)}</span>
                </div>
                <div class="flight-airport">${esc(flight.arrival.city)}</div>
              </div>
            </div>
          </div>

          <button class="flight-toggle-details" data-flight-index="${index}">
            <span data-i18n="flight.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="flight-details" id="flight-details-${index}">
            <div class="flight-details-grid">
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.bookingRef">Booking Reference</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${esc(flight.bookingReference || '-')}</span>
                  ${flight.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(flight.bookingReference)}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.ticketNumber">Ticket Number</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${esc(flight.ticketNumber || '-')}</span>
                  ${flight.ticketNumber ? `<button class="btn-copy-value" data-copy="${esc(flight.ticketNumber)}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${esc(flight.seat || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${esc(flight.class || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.departureTerminal">Departure Terminal</span>
                <span class="flight-detail-value">${esc(flight.departure.terminal || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.arrivalTerminal">Arrival Terminal</span>
                <span class="flight-detail-value">${esc(flight.arrival.terminal || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.duration">Flight Duration</span>
                <span class="flight-detail-value">${esc(duration)}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.frequentFlyer">Frequent Flyer</span>
                <span class="flight-detail-value">${esc(flight.frequentFlyer || '-')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply(container);
    initFlightToggleButtons();
    initCopyValueButtons();
  }

  // ===========================
  // Hotels
  // ===========================

  function renderHotels(container, hotels) {
    if (!hotels || hotels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noHotels">Nessun hotel</h3>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    const lang = i18n.getLang();

    const sortedHotels = [...hotels].sort((a, b) => {
      const dateA = new Date(a.checkIn?.date || '9999-12-31');
      const dateB = new Date(b.checkIn?.date || '9999-12-31');
      return dateA - dateB;
    });

    const html = sortedHotels.map((hotel, index) => {
      const checkInDate = new Date(hotel.checkIn.date);
      const checkOutDate = new Date(hotel.checkOut.date);
      const checkInDay = checkInDate.getDate();
      const checkOutDay = checkOutDate.getDate();
      const checkInMonth = checkInDate.toLocaleDateString(lang, { month: 'short' });
      const checkOutMonth = checkOutDate.toLocaleDateString(lang, { month: 'short' });

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`;
      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');
      let roomType = '-';
      if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
        roomType = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
      } else if (hotel.roomType) {
        roomType = hotel.roomType[lang] || hotel.roomType.en || hotel.roomType;
      }
      const notes = hotel.notes ? (hotel.notes[lang] || hotel.notes.en) : null;

      const freeCancellationDate = hotel.cancellation?.freeCancellationUntil
        ? utils.formatDate(hotel.cancellation.freeCancellationUntil.split('T')[0], lang, { month: 'short', day: 'numeric' })
        : null;

      return `
        <div class="hotel-card">
          <div class="hotel-card-header">
            <h3>${esc(hotel.name)}</h3>
            <div class="hotel-confirmation">
              <span class="hotel-confirmation-label" data-i18n="hotel.confirmation">Confirmation</span>
              <span class="hotel-confirmation-number">${esc(hotel.confirmationNumber)}</span>
            </div>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-dates">
              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkIn">Check-in</div>
                <div class="hotel-date-day">${checkInDay}</div>
                <div class="hotel-date-month">${checkInMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.from')} ${esc(hotel.checkIn.time)}</div>
              </div>

              <div class="hotel-nights">
                <div class="hotel-nights-count">${hotel.nights}</div>
                <div class="hotel-nights-label">${nightsLabel}</div>
              </div>

              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkOut">Check-out</div>
                <div class="hotel-date-day">${checkOutDay}</div>
                <div class="hotel-date-month">${checkOutMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.until')} ${esc(hotel.checkOut.time)}</div>
              </div>
            </div>

            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="hotel-address-text">${esc(hotel.address.fullAddress)}</span>
              </a>
            </div>
          </div>

          <button class="hotel-toggle-details" data-hotel-index="${index}">
            <span data-i18n="hotel.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="hotel-details" id="hotel-details-${index}">
            <div class="hotel-details-grid">
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.roomType">Room type</span>
                <span class="hotel-detail-value">${esc(roomType)}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guests">Guests</span>
                <span class="hotel-detail-value">${esc(utils.formatGuests(hotel.guests, lang))}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guestName">Guest name</span>
                <span class="hotel-detail-value">${esc(hotel.guestName)}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.phone">Phone</span>
                <span class="hotel-detail-value"><a href="tel:${esc(hotel.phone)}">${esc(hotel.phone)}</a></span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.pin">PIN code</span>
                <span class="hotel-detail-value">${esc(hotel.pinCode || '-')}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.price">Total price</span>
                <span class="hotel-detail-value">~${esc(hotel.price.total.currency)} ${esc(hotel.price.total.value)}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.payment">Payment</span>
                <span class="hotel-detail-value">${hotel.payment.prepayment ? '' : i18n.t('hotel.payAtProperty')}</span>
              </div>
              ${freeCancellationDate ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.cancellation">Cancellation</span>
                <span class="hotel-detail-value">${i18n.t('hotel.freeCancellationUntil')} ${freeCancellationDate}</span>
              </div>
              ` : ''}
              ${notes ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.notes">Notes</span>
                <span class="hotel-detail-value">${esc(notes)}</span>
              </div>
              ` : ''}
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.source">Booked on</span>
                <span class="hotel-detail-value">${esc(hotel.source)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply(container);
    initHotelToggleButtons();
  }

  // ===========================
  // Toggle buttons & copy
  // ===========================

  function initFlightToggleButtons() {
    document.querySelectorAll('.flight-toggle-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.flightIndex;
        const details = document.getElementById(`flight-details-${index}`);
        const isActive = details.classList.toggle('active');
        btn.classList.toggle('active', isActive);

        const textSpan = btn.querySelector('span[data-i18n]');
        if (textSpan) {
          textSpan.dataset.i18n = isActive ? 'flight.hideDetails' : 'flight.showDetails';
          textSpan.textContent = i18n.t(textSpan.dataset.i18n);
        }
      });
    });
  }

  function initCopyValueButtons() {
    document.querySelectorAll('.btn-copy-value').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.copy;
        if (!value) return;

        try {
          await navigator.clipboard.writeText(value);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        } catch (err) {
          const textArea = document.createElement('textarea');
          textArea.value = value;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        }
      });
    });
  }

  function initHotelToggleButtons() {
    document.querySelectorAll('.hotel-toggle-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.hotelIndex;
        const details = document.getElementById(`hotel-details-${index}`);
        const isActive = details.classList.toggle('active');
        btn.classList.toggle('active', isActive);

        const textSpan = btn.querySelector('span[data-i18n]');
        if (textSpan) {
          textSpan.dataset.i18n = isActive ? 'hotel.hideDetails' : 'hotel.showDetails';
          textSpan.textContent = i18n.t(textSpan.dataset.i18n);
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
