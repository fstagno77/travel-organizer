/**
 * Share - Shared trip view functionality
 * This is a minimal version for viewing shared trips without navigation
 */

(async function() {
  'use strict';

  /**
   * Initialize the shared view
   */
  async function init() {
    try {
      // Initialize i18n first
      await i18n.init();

      // Initialize language selector
      initLangSelector();

      // Apply translations
      i18n.apply();

      // Load and display trip data
      await initSharedTripPage();

    } catch (error) {
      console.error('Error initializing shared view:', error);
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
        // Re-render trip content on language change
        initSharedTripPage();
      });
    });

    // Close dropdown when clicking outside
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
      // Get trip ID from URL parameter or from path (for legacy static pages)
      let tripId = new URLSearchParams(window.location.search).get('id');

      // If no ID in params, try to get from path (legacy: /trips/{id}/share.html)
      if (!tripId && window.location.pathname.includes('/trips/')) {
        tripId = window.location.pathname.split('/trips/')[1]?.split('/')[0];
      }

      if (!tripId) {
        throw new Error('No trip ID provided');
      }

      // Load trip data from API
      let tripData;

      // First try to load from local trip.json (for legacy static pages)
      if (window.location.pathname.includes('/trips/')) {
        try {
          tripData = await utils.loadJSON(`./trip.json`);
        } catch (e) {
          // Fall back to API
        }
      }

      // If not loaded from local file, fetch from API
      if (!tripData) {
        const response = await fetch(`/.netlify/functions/get-trip?id=${tripId}`);
        const result = await response.json();
        if (result.success && result.tripData) {
          tripData = result.tripData;
        } else {
          throw new Error('Trip not found');
        }
      }

      // Update page title
      const lang = i18n.getLang();
      const title = tripData.title[lang] || tripData.title.en;
      document.title = `${title} - Travel Organizer`;

      // Update trip header
      updateTripHeader(tripData);

      // Render content (without menu options)
      renderSharedTripContent(contentContainer, tripData);

    } catch (error) {
      console.error('Error loading trip data:', error);
      contentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h3 class="empty-state-title" data-i18n="common.error">Error</h3>
          <p class="empty-state-text" data-i18n="trip.loadError">Could not load trip data</p>
        </div>
      `;
      i18n.apply();
    }
  }

  /**
   * Update trip header with trip data
   * @param {object} tripData
   */
  function updateTripHeader(tripData) {
    const lang = i18n.getLang();

    const titleEl = document.querySelector('.trip-header h1');
    if (titleEl) {
      titleEl.textContent = tripData.title[lang] || tripData.title.en;
    }

    const dateEl = document.querySelector('.trip-meta-date');
    if (dateEl && tripData.startDate && tripData.endDate) {
      const start = utils.formatDate(tripData.startDate, lang, { month: 'short', day: 'numeric' });
      const end = utils.formatDate(tripData.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
      dateEl.textContent = `${start} - ${end}`;
    }
  }

  /**
   * Render shared trip content (with share button instead of menu)
   * @param {HTMLElement} container
   * @param {object} tripData
   */
  function renderSharedTripContent(container, tripData) {
    const html = `
      <div class="trip-content-header mb-6">
        <div class="segmented-control">
          <button class="segmented-control-btn active" data-tab="flights">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
            <span data-i18n="trip.flights">Flights</span>
          </button>
          <button class="segmented-control-btn" data-tab="hotels">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
              <path d="M9 9v.01"></path>
              <path d="M9 12v.01"></path>
              <path d="M9 15v.01"></path>
              <path d="M9 18v.01"></path>
            </svg>
            <span data-i18n="trip.hotels">Hotels</span>
          </button>
        </div>
        <button class="section-menu-btn" id="share-btn" title="Share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>

      <div id="flights-tab" class="tab-content active">
        <div id="flights-container"></div>
      </div>

      <div id="hotels-tab" class="tab-content">
        <div id="hotels-container"></div>
      </div>
    `;

    container.innerHTML = html;

    // Render content
    renderFlights(document.getElementById('flights-container'), tripData.flights);
    renderHotels(document.getElementById('hotels-container'), tripData.hotels);

    // Initialize tab switching
    initTabSwitching();

    // Determine initial tab: show hotels if no flights, otherwise flights
    const hasFlights = tripData.flights && tripData.flights.length > 0;
    const hasHotels = tripData.hotels && tripData.hotels.length > 0;
    if (!hasFlights && hasHotels) {
      switchToTab('hotels');
    }

    // Initialize share button
    initShareButton();

    // Apply translations
    i18n.apply();
  }

  /**
   * Initialize tab switching
   */
  function initTabSwitching() {
    const tabs = document.querySelectorAll('.segmented-control-btn');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchToTab(tab.dataset.tab);
      });
    });
  }

  /**
   * Switch to a specific tab
   * @param {string} tabName - 'flights' or 'hotels'
   */
  function switchToTab(tabName) {
    const tabs = document.querySelectorAll('.segmented-control-btn');

    // Update button states
    tabs.forEach(t => t.classList.remove('active'));
    const targetBtn = document.querySelector(`.segmented-control-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) targetContent.classList.add('active');
  }

  /**
   * Initialize share button
   */
  function initShareButton() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', showShareModal);
    }
  }

  /**
   * Show share modal with current URL
   */
  function showShareModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    // Use current page URL
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
            <p class="share-description" data-i18n="trip.shareDescription">Copia questo link per condividere il viaggio con altri. Chi riceve il link potrà visualizzare solo questo viaggio.</p>
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

    // Close modal function
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Copy link function
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copiedMessage.classList.add('visible');
        setTimeout(() => {
          copiedMessage.classList.remove('visible');
        }, 2000);
      } catch (err) {
        // Fallback for older browsers
        linkInput.select();
        document.execCommand('copy');
        copiedMessage.classList.add('visible');
        setTimeout(() => {
          copiedMessage.classList.remove('visible');
        }, 2000);
      }
    };

    // Event listeners
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

    // Select all text when input is focused
    linkInput.addEventListener('focus', () => linkInput.select());

    // Apply translations
    i18n.apply();
  }

  /**
   * Check if a flight is in the past
   * @param {object} flight
   * @returns {boolean}
   */
  function isFlightPast(flight) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const flightDate = new Date(flight.date);
    flightDate.setHours(0, 0, 0, 0);
    return flightDate < today;
  }

  /**
   * Render flight cards
   * @param {HTMLElement} container
   * @param {Array} flights
   */
  function renderFlights(container, flights) {
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">No flights</h3>
        </div>
      `;
      i18n.apply();
      return;
    }

    const lang = i18n.getLang();

    // Sort flights: upcoming first (by date), then past flights (by date)
    const sortedFlights = [...flights].sort((a, b) => {
      const aPast = isFlightPast(a);
      const bPast = isFlightPast(b);

      if (aPast !== bPast) {
        return aPast ? 1 : -1;
      }

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
            <span class="flight-date">${formattedDate}</span>
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="flight-track-btn">
              <span data-i18n="flight.track">Track</span>
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
                <div class="flight-time">${flight.departureTime}</div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${flight.departure.code}</span>
                </div>
                <div class="flight-airport">${flight.departure.city}</div>
              </div>

              <div class="flight-arrow">
                <div class="flight-duration">${duration}</div>
                <div class="flight-arrow-line"></div>
                <div class="flight-info">${flight.airline} ${flight.flightNumber}</div>
              </div>

              <div class="flight-endpoint">
                <div class="flight-time">${flight.arrivalTime}${flight.arrivalNextDay ? ' +1' : ''}</div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${flight.arrival.code}</span>
                </div>
                <div class="flight-airport">${flight.arrival.city}</div>
              </div>
            </div>

          </div>

          <button class="flight-toggle-details" data-flight-index="${index}">
            <span data-i18n="flight.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="flight-details" id="flight-details-${index}">
            <div class="flight-details-grid">
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.bookingRef">Booking Reference</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${flight.bookingReference || '-'}</span>
                  ${flight.bookingReference ? `<button class="btn-copy-value" data-copy="${flight.bookingReference}" title="Copy">
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
                  <span class="flight-detail-value">${flight.ticketNumber || '-'}</span>
                  ${flight.ticketNumber ? `<button class="btn-copy-value" data-copy="${flight.ticketNumber}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${flight.seat || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${flight.class || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.departureTerminal">Departure Terminal</span>
                <span class="flight-detail-value">${flight.departure.terminal || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.arrivalTerminal">Arrival Terminal</span>
                <span class="flight-detail-value">${flight.arrival.terminal || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.duration">Flight Duration</span>
                <span class="flight-detail-value">${duration}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.frequentFlyer">Frequent Flyer</span>
                <span class="flight-detail-value">${flight.frequentFlyer || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Apply translations
    i18n.apply();

    // Initialize toggle buttons
    initFlightToggleButtons();
    initCopyValueButtons();
  }

  /**
   * Render hotel cards
   * @param {HTMLElement} container
   * @param {Array} hotels
   */
  function renderHotels(container, hotels) {
    if (!hotels || hotels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noHotels">No hotels</h3>
        </div>
      `;
      i18n.apply();
      return;
    }

    const lang = i18n.getLang();

    const html = hotels.map((hotel, index) => {
      const checkInDate = new Date(hotel.checkIn.date);
      const checkOutDate = new Date(hotel.checkOut.date);
      const checkInDay = checkInDate.getDate();
      const checkOutDay = checkOutDate.getDate();
      const checkInMonth = checkInDate.toLocaleDateString(lang, { month: 'short' });
      const checkOutMonth = checkOutDate.toLocaleDateString(lang, { month: 'short' });

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`;
      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');
      // Support both roomType (single) and roomTypes (array) formats
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
            <h3>${hotel.name}</h3>
            <div class="hotel-confirmation">
              <span class="hotel-confirmation-label" data-i18n="hotel.confirmation">Confirmation</span>
              <span class="hotel-confirmation-number">${hotel.confirmationNumber}</span>
            </div>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-dates">
              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkIn">Check-in</div>
                <div class="hotel-date-day">${checkInDay}</div>
                <div class="hotel-date-month">${checkInMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.from')} ${hotel.checkIn.time}</div>
              </div>

              <div class="hotel-nights">
                <div class="hotel-nights-count">${hotel.nights}</div>
                <div class="hotel-nights-label">${nightsLabel}</div>
              </div>

              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkOut">Check-out</div>
                <div class="hotel-date-day">${checkOutDay}</div>
                <div class="hotel-date-month">${checkOutMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.until')} ${hotel.checkOut.time}</div>
              </div>
            </div>

            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="hotel-address-text">${hotel.address.fullAddress}</span>
              </a>
            </div>
          </div>

          <button class="hotel-toggle-details" data-hotel-index="${index}">
            <span data-i18n="hotel.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="hotel-details" id="hotel-details-${index}">
            <div class="hotel-details-grid">
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.roomType">Room type</span>
                <span class="hotel-detail-value">${roomType}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guests">Guests</span>
                <span class="hotel-detail-value">${hotel.guests}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guestName">Guest name</span>
                <span class="hotel-detail-value">${hotel.guestName}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.phone">Phone</span>
                <span class="hotel-detail-value"><a href="tel:${hotel.phone}">${hotel.phone}</a></span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.pin">PIN code</span>
                <span class="hotel-detail-value">${hotel.pinCode || '-'}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.price">Total price</span>
                <span class="hotel-detail-value">~${hotel.price.total.currency} ${hotel.price.total.value}</span>
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
                <span class="hotel-detail-value">${notes}</span>
              </div>
              ` : ''}
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.source">Booked on</span>
                <span class="hotel-detail-value">${hotel.source}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Apply translations
    i18n.apply();

    // Initialize toggle buttons
    initHotelToggleButtons();
  }

  /**
   * Initialize flight detail toggle buttons
   */
  function initFlightToggleButtons() {
    const toggleButtons = document.querySelectorAll('.flight-toggle-details');

    toggleButtons.forEach(btn => {
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

  /**
   * Initialize copy value buttons
   */
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
          // Fallback for older browsers
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

  /**
   * Initialize hotel detail toggle buttons
   */
  function initHotelToggleButtons() {
    const toggleButtons = document.querySelectorAll('.hotel-toggle-details');

    toggleButtons.forEach(btn => {
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
