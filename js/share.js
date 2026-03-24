/**
 * Share - Vista pubblica di un viaggio (sola lettura)
 * Allineata alla struttura di tripPage.js: tab dinamici, stesse card, nessun controllo di modifica.
 */

(async function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const cats = () => window.activityCategories;

  // Stato filtri/ricerca (scope modulo)
  let activeFilters = new Set(window.activityCategories.CATEGORY_ORDER);
  let _presentCategories = new Set();
  let searchQuery = '';
  let _dropdownCleanup = null;

  // ===========================
  // Stub window.tripPage
  // I moduli tripFlights, tripHotels, tripTrains, tripBuses, tripRentals
  // dipendono da window.tripPage per escAttr e per i pannelli di modifica.
  // Forniamo uno stub sicuro: escAttr funziona, le azioni di modifica sono no-op.
  // ===========================

  function escAttr(val) {
    if (val == null) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.tripPage = {
    currentTripData: null,
    userRole: 'ospite',
    esc,
    escAttr,
    loadTripFromUrl: () => {},
    switchToTab: () => {},
    rerenderCurrentTab: () => {},
    loadSlidePanel: () => Promise.resolve(null),
    showAddBookingModal: () => {},
    showManageBookingPanel: () => {},
    spaInit: () => {},
  };

  // ===========================
  // Configurazione tab (identica a tripPage.js)
  // ===========================

  const TAB_CONFIG = {
    activities: { icon: 'calendar_today',  i18nKey: 'trip.activities', fallback: 'Attività' },
    flights:    { icon: 'travel',          i18nKey: 'trip.flights',    fallback: 'Voli' },
    hotels:     { icon: 'bed',             i18nKey: 'trip.hotels',     fallback: 'Hotel' },
    trains:     { icon: 'train',           i18nKey: 'trip.trains',     fallback: 'Treni', beta: true },
    buses:      { icon: 'directions_bus',  i18nKey: 'trip.buses',      fallback: 'Bus', beta: true },
    rentals:    {
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.8L18 11l-2-4H8L6 11l-2.5.2C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
      i18nKey: 'trip.rentals', fallback: 'Auto'
    },
  };

  /**
   * Calcola i tab visibili in base ai dati del viaggio (logica identica a tripPage.js)
   */
  function getVisibleTabs(tripData) {
    const tabs = [];
    const hasAnyData = (tripData.flights?.length > 0) ||
                       (tripData.hotels?.length > 0) ||
                       (tripData.trains?.length > 0) ||
                       (tripData.buses?.length > 0) ||
                       (tripData.rentals?.length > 0) ||
                       (tripData.activities?.length > 0);
    if (hasAnyData) tabs.push('activities');
    if (tripData.flights?.length > 0) tabs.push('flights');
    if (tripData.hotels?.length > 0) tabs.push('hotels');
    if (tripData.trains?.length > 0) tabs.push('trains');
    if (tripData.buses?.length > 0) tabs.push('buses');
    if (tripData.rentals?.length > 0) tabs.push('rentals');
    return tabs;
  }

  // ===========================
  // Init
  // ===========================

  async function init() {
    try {
      await i18n.init();
      initLangSelector();
      i18n.apply();
      initAutoHideHeader();
      await initSharedTripPage();
    } catch (error) {
      console.error('Errore inizializzazione vista condivisa:', error);
    }
  }

  /**
   * Auto-hide header: nasconde scorrendo giù, riappare scorrendo su
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
   * Selettore lingua semplificato
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

  // ===========================
  // Caricamento e render viaggio
  // ===========================

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
      const tripId = result.tripId;

      // Aggiorna window.tripPage con i dati del viaggio (usato dagli stub dei moduli)
      window.tripPage.currentTripData = { ...tripData, id: tripId };

      // Aggiorna titolo pagina e meta OG
      const lang = i18n.getLang();
      const title = tripData.title?.[lang] || tripData.title?.en || tripData.title?.it || '';
      document.title = `${title} | Travel Flow`;

      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      const twImage = document.querySelector('meta[name="twitter:image"]');

      if (ogTitle) ogTitle.setAttribute('content', `${title} | Travel Flow`);
      if (ogDesc) {
        const parts = [];
        if (tripData.startDate && tripData.endDate) {
          const fmt = d => {
            const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
            const dt = new Date(d + 'T00:00:00');
            return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
          };
          parts.push(`${fmt(tripData.startDate)} – ${fmt(tripData.endDate)}`);
        }
        if ((tripData.flights||[]).length) parts.push(`${tripData.flights.length} vol${tripData.flights.length === 1 ? 'o' : 'i'}`);
        if ((tripData.hotels||[]).length) parts.push(`${tripData.hotels.length} hotel`);
        ogDesc.setAttribute('content', parts.join(' · ') || 'Visualizza i dettagli su Travel Flow');
      }
      const coverUrl = tripData.coverPhoto?.url;
      if (coverUrl && ogImage) ogImage.setAttribute('content', coverUrl);
      if (coverUrl && twTitle) twTitle.setAttribute('content', `${title} | Travel Flow`);
      if (coverUrl && twImage) twImage.setAttribute('content', coverUrl);

      // Render hero
      updateTripHero(tripData);

      // Render contenuto con tab dinamici
      renderSharedTripContent(contentContainer, tripData);

      // Banner "Vai al tuo viaggio" per utenti loggati
      if (tripId && window.auth?.user) {
        const banner = document.createElement('a');
        banner.href = `/trip.html?id=${tripId}`;
        banner.className = 'share-logged-in-banner';
        banner.innerHTML = `
          <span>${i18n.t('share.openFullTrip') || 'Sei registrato su Travel Flow — accedi al viaggio completo'}</span>
          <span class="share-logged-in-cta">${i18n.t('share.goToTrip') || 'Vai al tuo viaggio →'}</span>
        `;
        const hero = document.querySelector('.trip-hero');
        if (hero) hero.after(banner);
      }

    } catch (error) {
      console.error('Errore caricamento viaggio condiviso:', error);

      const heroTabs = document.getElementById('trip-hero-tabs');
      if (heroTabs) heroTabs.innerHTML = '';

      const hero = document.getElementById('trip-hero');
      if (hero) hero.classList.remove('is-loading');

      const isExpired = error.message === 'shareExpired';
      const icon = isExpired ? '⏱️' : '🔗';
      const titleKey = isExpired ? 'trip.shareExpired' : 'trip.shareNotFound';
      const defaultTitle = isExpired ? 'Questo link condiviso è scaduto' : 'Viaggio condiviso non trovato';

      contentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icon}</div>
          <h3 class="empty-state-title">${i18n.t(titleKey) || defaultTitle}</h3>
        </div>
      `;
    }
  }

  /**
   * Aggiorna l'hero con i dati del viaggio
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

    const hero = document.getElementById('trip-hero');
    if (hero) {
      if (tripData.coverPhoto?.url) {
        hero.style.backgroundImage = `url('${tripData.coverPhoto.url}')`;
      }
      hero.classList.remove('is-loading');
    }
  }

  // ===========================
  // Render contenuto con tab dinamici
  // ===========================

  /**
   * Render dell'intera pagina condivisa: tab bar + contenuto tab
   */
  function renderSharedTripContent(container, tripData) {
    const visibleTabs = getVisibleTabs(tripData);
    const heroTabs = document.getElementById('trip-hero-tabs');

    // Render segmented control nell'hero (solo se >= 2 tab)
    if (visibleTabs.length >= 2) {
      const tabButtons = visibleTabs.map(tabName => {
        const cfg = TAB_CONFIG[tabName];
        return `
          <button class="segmented-control-btn" data-tab="${tabName}">
            ${cfg.iconSvg ? cfg.iconSvg : `<span class="material-symbols-outlined" style="font-size: 20px;">${cfg.icon}</span>`}
            <span${tabName === 'trains' || tabName === 'buses' || tabName === 'rentals' ? ' class="segmented-label"' : ''} data-i18n="${cfg.i18nKey}">${cfg.fallback}</span>
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
    } else if (heroTabs) {
      heroTabs.innerHTML = '';
    }

    if (visibleTabs.length === 0) {
      // Viaggio vuoto: empty state semplificato (nessuna CTA di aggiunta)
      container.innerHTML = `
        <div class="trip-empty-state">
          <svg class="trip-empty-state-icon" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="21" x2="8" y2="22"/><line x1="16" y1="21" x2="16" y2="22"/></svg>
          <h2 class="trip-empty-state-title" data-i18n="trip.emptyTripTitle">Nessun contenuto in questo viaggio</h2>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    // Genera contenitori tab
    const tabsHtml = visibleTabs.map(tabName => `
      <div id="${tabName}-tab" class="tab-content">
        <div id="${tabName}-container"></div>
      </div>
    `).join('');
    container.innerHTML = tabsHtml;

    // Render di ogni tab (sola lettura)
    visibleTabs.forEach(tabName => {
      const tabContainer = document.getElementById(`${tabName}-container`);
      if (!tabContainer) return;

      switch (tabName) {
        case 'activities':
          renderActivities(tabContainer, tripData);
          break;
        case 'flights':
          if (window.tripFlights?.render) {
            window.tripFlights.render(tabContainer, tripData.flights);
            stripEditControls(tabContainer);
          }
          break;
        case 'hotels':
          if (window.tripHotels?.render) {
            window.tripHotels.render(tabContainer, tripData.hotels);
            stripEditControls(tabContainer);
          }
          break;
        case 'trains':
          if (window.tripTrains?.render) {
            window.tripTrains.render(tabContainer, tripData.trains);
            stripEditControls(tabContainer);
          }
          break;
        case 'buses':
          if (window.tripBuses?.render) {
            window.tripBuses.render(tabContainer, tripData.buses);
            stripEditControls(tabContainer);
          }
          break;
        case 'rentals':
          if (window.tripRentals?.render) {
            window.tripRentals.render(tabContainer, tripData.rentals);
            stripEditControls(tabContainer);
          }
          break;
      }
    });

    // Tab switching
    if (visibleTabs.length >= 2) {
      initTabSwitching();
    }

    // Attiva il primo tab
    switchToTab(visibleTabs[0]);
    if (visibleTabs.length >= 2) showIndicator();

    // Applica traduzioni
    if (heroTabs) i18n.apply(heroTabs);
    i18n.apply(container);
  }

  /**
   * Rimuove dal container tutti i controlli di modifica/aggiunta/eliminazione.
   * Viene chiamato dopo il render di ogni modulo autenticato.
   */
  function stripEditControls(container) {
    // Pulsanti sezione (Modifica in section-header-actions)
    container.querySelectorAll('.section-header-actions').forEach(el => el.remove());

    // Pulsanti inline modifica/elimina nelle card (btn-edit-item, btn-delete-item)
    container.querySelectorAll('.btn-edit-item, .btn-delete-item').forEach(el => el.remove());

    // Pulsanti empty-state CTA (Aggiungi prenotazione)
    container.querySelectorAll('.empty-state-cta').forEach(el => el.remove());

    // Blocchi azioni nei pannelli dettaglio: tieni solo btn-download-pdf se presente
    const actionSelectors = '.train-actions, .bus-actions, .rental-actions, .hotel-actions';
    container.querySelectorAll(actionSelectors).forEach(actionsEl => {
      const downloadBtn = actionsEl.querySelector('.btn-download-pdf');
      if (downloadBtn) {
        actionsEl.innerHTML = downloadBtn.outerHTML;
      } else {
        actionsEl.remove();
      }
    });

    // Pulsanti azione nei dettagli voli (classi variabili — usa btn-edit-item già coperto sopra)
    // Rimuovi anche eventuali righe di azione nei dettagli volo
    container.querySelectorAll('.flight-actions-row').forEach(el => el.remove());
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
   * Posiziona l'indicatore sull'active tab senza animazione iniziale
   */
  function showIndicator() {
    const indicator = document.querySelector('.segmented-control > .segmented-indicator');
    const activeBtn = document.querySelector('.segmented-control-btn.active[data-tab]');
    if (!indicator || !activeBtn) return;

    indicator.style.transition = 'none';
    updateSegmentedIndicator(activeBtn);
    indicator.style.opacity = '1';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        indicator.style.transition = '';
      });
    });

    document.fonts.ready.then(() => {
      const currentActive = document.querySelector('.segmented-control-btn.active[data-tab]');
      if (currentActive) updateSegmentedIndicator(currentActive);
    });
  }

  // ===========================
  // Attività (sola lettura, con filtro e ricerca)
  // ===========================

  /**
   * Costruisce gli eventi giorno per giorno dai dati del viaggio
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
    const trains = tripData.trains || [];
    const buses = tripData.buses || [];
    const rentals = tripData.rentals || [];
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

    for (const train of trains) {
      events.push({ date: train.date, time: train.departure?.time || null, type: 'train', data: train });
    }

    for (const bus of buses) {
      events.push({ date: bus.date, time: bus.departure?.time || null, type: 'bus', data: bus });
    }

    for (const rental of rentals) {
      const pickupDate = rental.date;
      const dropoffDate = rental.endDate;
      if (pickupDate) {
        events.push({ date: pickupDate, time: rental.pickupLocation?.time || null, type: 'rental-pickup', data: rental });
      }
      if (pickupDate && dropoffDate) {
        const start = new Date(pickupDate + 'T00:00:00');
        const end = new Date(dropoffDate + 'T00:00:00');
        let current = new Date(start.getTime() + oneDay);
        while (current < end) {
          events.push({ date: toLocalDateStr(current), time: null, type: 'rental-active', data: rental });
          current = new Date(current.getTime() + oneDay);
        }
      }
      if (dropoffDate) {
        events.push({ date: dropoffDate, time: rental.dropoffLocation?.time || null, type: 'rental-dropoff', data: rental });
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

    const typePriority = {
      'hotel-checkout': 0, 'rental-dropoff': 0.5,
      'flight': 1, 'train': 1.2, 'bus': 1.4,
      'rental-pickup': 1.8, 'hotel-checkin': 2,
      'hotel-stay': 3, 'rental-active': 3.5, 'activity': 4
    };
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
  // Helper filtri
  // ===========================

  function matchesSearch(event, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const d = event.data;
    if (event.type === 'flight') {
      const parts = [d.departure?.city, d.departure?.code, d.arrival?.city, d.arrival?.code, d.airline, d.flightNumber];
      return parts.some(p => p && p.toLowerCase().includes(q));
    }
    if (event.type === 'train') {
      const parts = [d.departure?.city, d.departure?.station, d.arrival?.city, d.arrival?.station, d.trainNumber, d.operator];
      return parts.some(p => p && p.toLowerCase().includes(q));
    }
    if (event.type === 'bus') {
      const parts = [d.departure?.city, d.departure?.station, d.arrival?.city, d.arrival?.station, d.busNumber, d.operator];
      return parts.some(p => p && p.toLowerCase().includes(q));
    }
    const s = v => typeof v === 'string' && v.toLowerCase().includes(q);
    if (event.type.startsWith('hotel')) {
      return s(d.name) || s(d.address?.fullAddress);
    }
    if (event.type.startsWith('rental-')) {
      const parts = [d.provider, d.pickupLocation?.city, d.dropoffLocation?.city, d.bookingReference];
      return parts.some(p => p && p.toLowerCase().includes(q));
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
  // Activity header + filter panel
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
  // List view (sola lettura)
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
        } else if (event.type === 'train') {
          const dep = event.data.departure?.city || event.data.departure?.station || '';
          const arr = event.data.arrival?.city || event.data.arrival?.station || '';
          text = `Treno da <strong>${esc(dep)}</strong> \u2192 <strong>${esc(arr)}</strong>`;
          if (event.data.operator) text += ` <span class="activity-item-sub">${esc(event.data.operator)}</span>`;
        } else if (event.type === 'bus') {
          const dep = event.data.departure?.city || event.data.departure?.station || '';
          const arr = event.data.arrival?.city || event.data.arrival?.station || '';
          text = `Bus da <strong>${esc(dep)}</strong> \u2192 <strong>${esc(arr)}</strong>`;
          if (event.data.operator) text += ` <span class="activity-item-sub">${esc(event.data.operator)}</span>`;
        } else if (event.type === 'rental-pickup') {
          const city = event.data.pickupLocation?.city || '';
          text = `<strong>${esc(event.data.provider || 'Noleggio')}</strong> - Ritiro${city ? ` a ${esc(city)}` : ''}`;
        } else if (event.type === 'rental-active') {
          text = `<strong>${esc(event.data.provider || 'Noleggio')}</strong> - Auto in uso`;
        } else if (event.type === 'rental-dropoff') {
          const city = event.data.dropoffLocation?.city || '';
          text = `<strong>${esc(event.data.provider || 'Noleggio')}</strong> - Riconsegna${city ? ` a ${esc(city)}` : ''}`;
        } else if (event.type === 'activity') {
          const desc = event.data.description ? ' - ' + esc(event.data.description) : '';
          text = `<strong>${esc(event.data.name)}</strong>${desc}`;
        }

        let timeLabel = event.time || '';
        if (timeLabel && event.type === 'flight' && event.data.arrivalTime) {
          timeLabel += ' \u2192 ' + event.data.arrivalTime;
          if (event.data.arrivalNextDay) timeLabel += ' +1';
        }
        if (timeLabel && (event.type === 'train' || event.type === 'bus') && event.data.arrival?.time) {
          timeLabel += ' \u2192 ' + event.data.arrival.time;
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
  // Re-render e interazioni
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

    function positionDropdown(btn, dropdown) {
      if (!btn || !dropdown || !window.matchMedia('(max-width: 640px)').matches) {
        dropdown.style.top = '';
        return;
      }
      const rect = btn.closest('.activity-btn-container')?.getBoundingClientRect()
        || btn.getBoundingClientRect();
      dropdown.style.top = (rect.bottom + 8) + 'px';
    }

    function closeAllDropdowns() {
      if (searchDropdown) { searchDropdown.hidden = true; searchBtn?.classList.remove('active'); searchDropdown.style.top = ''; }
      if (filterDropdown) { filterDropdown.hidden = true; filterBtn?.classList.remove('active'); filterDropdown.style.top = ''; }
    }

    if (searchBtn && searchDropdown) {
      searchBtn.addEventListener('click', () => {
        const isHidden = searchDropdown.hidden;
        closeAllDropdowns();
        if (isHidden) {
          searchDropdown.hidden = false;
          searchBtn.classList.add('active');
          positionDropdown(searchBtn, searchDropdown);
          document.getElementById('activity-search-input')?.focus();
        }
      });

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

    if (filterBtn && filterDropdown) {
      filterBtn.addEventListener('click', () => {
        const isHidden = filterDropdown.hidden;
        closeAllDropdowns();
        if (isHidden) {
          filterDropdown.hidden = false;
          filterBtn.classList.add('active');
          positionDropdown(filterBtn, filterDropdown);
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

    const onOutsideInteraction = (e) => {
      if (!e.target.closest('.activity-btn-container')) {
        closeAllDropdowns();
      }
    };
    if (_dropdownCleanup) _dropdownCleanup();
    document.addEventListener('click', onOutsideInteraction);
    document.addEventListener('touchstart', onOutsideInteraction);
    _dropdownCleanup = () => {
      document.removeEventListener('click', onOutsideInteraction);
      document.removeEventListener('touchstart', onOutsideInteraction);
    };
  }

  /**
   * Render tab attività (sola lettura, con filtro e ricerca)
   */
  function renderActivities(container, tripData) {
    const flights = tripData.flights || [];
    const hotels = tripData.hotels || [];
    const trains = tripData.trains || [];
    const buses = tripData.buses || [];
    const rentals = tripData.rentals || [];
    const customActivities = tripData.activities || [];

    if (flights.length === 0 && hotels.length === 0 && trains.length === 0 &&
        buses.length === 0 && rentals.length === 0 && customActivities.length === 0) {
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
  // Avvio
  // ===========================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
