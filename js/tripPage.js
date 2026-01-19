/**
 * Trip Page - Handles dynamic trip display from localStorage
 */

(async function() {
  'use strict';

  let currentTripData = null;

  /**
   * Initialize the trip page
   */
  async function init() {
    try {
      // Initialize i18n first
      await i18n.init();

      // Initialize navigation (header, footer)
      await navigation.init();

      // Re-apply translations after navigation is loaded
      i18n.apply();

      // Load trip data from URL parameter
      loadTripFromUrl();

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
      // Load trip from Supabase via Netlify Function
      const response = await fetch(`/.netlify/functions/get-trip?id=${encodeURIComponent(tripId)}`);
      const result = await response.json();

      if (!result.success || !result.tripData) {
        showError('Trip not found');
        return;
      }

      currentTripData = result.tripData;
      renderTrip(result.tripData);
    } catch (error) {
      console.error('Error loading trip:', error);
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
        <p class="empty-state-text">${message}</p>
        <a href="./" class="btn btn-primary" data-i18n="common.backHome">Back to home</a>
      </div>
    `;
    i18n.apply();
  }

  /**
   * Render trip data
   * @param {Object} tripData
   */
  function renderTrip(tripData) {
    const lang = i18n.getLang();

    // Update page title
    const title = tripData.title[lang] || tripData.title.en || tripData.title.it;
    document.title = `${title} - Travel Organizer`;
    document.getElementById('trip-title').textContent = title;

    // Update dates
    if (tripData.startDate && tripData.endDate) {
      const start = utils.formatDate(tripData.startDate, lang, { month: 'short', day: 'numeric' });
      const end = utils.formatDate(tripData.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('trip-dates').textContent = `${start} - ${end}`;
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
        <div class="section-menu" id="content-menu">
          <button class="section-menu-btn" id="content-menu-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="section-dropdown" id="content-dropdown">
            <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span data-i18n="trip.delete">Delete</span>
            </button>
          </div>
        </div>
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

    // Initialize menu
    initMenu(tripData.id);

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
        const targetTab = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }

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

        if (action === 'delete') {
          deleteTrip(tripId);
        }
      });
    });

    document.addEventListener('click', () => {
      dropdown?.classList.remove('active');
    });
  }

  /**
   * Delete trip from Supabase
   * @param {string} tripId
   */
  async function deleteTrip(tripId) {
    const confirmText = i18n.t('trip.deleteConfirm') || 'Are you sure you want to delete this trip?';
    if (!confirm(confirmText)) return;

    try {
      const response = await fetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(tripId)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      // Redirect to home
      window.location.href = './';
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert(i18n.t('trip.deleteError') || 'Error deleting trip');
    }
  }

  /**
   * Check if a flight is in the past
   * @param {Object} flight
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
   * Render flights
   * @param {HTMLElement} container
   * @param {Array} flights
   */
  function renderFlights(container, flights) {
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">No flights</h3>
          <p class="empty-state-text" data-i18n="trip.noFlightsText">No flight information available</p>
        </div>
      `;
      i18n.apply();
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
            <span class="flight-date">${formattedDate}</span>
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="flight-number-link">
              ${flight.airline || ''} ${flight.flightNumber}
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
                  <span class="flight-airport-code">${flight.departure?.code || ''}</span>
                </div>
                <div class="flight-airport">${flight.departure?.city || ''}</div>
              </div>

              <div class="flight-arrow">
                <div class="flight-duration">${duration}</div>
                <div class="flight-arrow-line"></div>
              </div>

              <div class="flight-endpoint">
                <div class="flight-time">${flight.arrivalTime}${flight.arrivalNextDay ? ' +1' : ''}</div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${flight.arrival?.code || ''}</span>
                </div>
                <div class="flight-airport">${flight.arrival?.city || ''}</div>
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
                <span class="flight-detail-value">${flight.bookingReference || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.ticketNumber">Ticket Number</span>
                <span class="flight-detail-value">${flight.ticketNumber || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${flight.seat || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${flight.class || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply();
    initFlightToggleButtons();
  }

  /**
   * Render hotels
   * @param {HTMLElement} container
   * @param {Array} hotels
   */
  function renderHotels(container, hotels) {
    if (!hotels || hotels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noHotels">No hotels</h3>
          <p class="empty-state-text" data-i18n="trip.noHotelsText">No hotel information available</p>
        </div>
      `;
      i18n.apply();
      return;
    }

    const lang = i18n.getLang();

    const html = hotels.map((hotel, index) => {
      const checkInDate = new Date(hotel.checkIn?.date);
      const checkOutDate = new Date(hotel.checkOut?.date);
      const checkInDay = checkInDate.getDate();
      const checkOutDay = checkOutDate.getDate();
      const checkInMonth = checkInDate.toLocaleDateString(lang, { month: 'short' });
      const checkOutMonth = checkOutDate.toLocaleDateString(lang, { month: 'short' });

      const mapsUrl = hotel.address?.fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`
        : '#';
      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');
      const roomType = hotel.roomType ? (hotel.roomType[lang] || hotel.roomType.en || hotel.roomType) : '-';

      return `
        <div class="hotel-card">
          <div class="hotel-card-header">
            <h3>${hotel.name}</h3>
            <div class="hotel-confirmation">
              <span class="hotel-confirmation-label" data-i18n="hotel.confirmation">Confirmation</span>
              <span class="hotel-confirmation-number">${hotel.confirmationNumber || '-'}</span>
            </div>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-dates">
              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkIn">Check-in</div>
                <div class="hotel-date-day">${checkInDay}</div>
                <div class="hotel-date-month">${checkInMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.from')} ${hotel.checkIn?.time || ''}</div>
              </div>

              <div class="hotel-nights">
                <div class="hotel-nights-count">${hotel.nights || '-'}</div>
                <div class="hotel-nights-label">${nightsLabel}</div>
              </div>

              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkOut">Check-out</div>
                <div class="hotel-date-day">${checkOutDay}</div>
                <div class="hotel-date-month">${checkOutMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.until')} ${hotel.checkOut?.time || ''}</div>
              </div>
            </div>

            ${hotel.address?.fullAddress ? `
            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="hotel-address-text">${hotel.address.fullAddress}</span>
              </a>
            </div>
            ` : ''}
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
                <span class="hotel-detail-value">${hotel.guests || '-'}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guestName">Guest name</span>
                <span class="hotel-detail-value">${hotel.guestName || '-'}</span>
              </div>
              ${hotel.phone ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.phone">Phone</span>
                <span class="hotel-detail-value"><a href="tel:${hotel.phone}">${hotel.phone}</a></span>
              </div>
              ` : ''}
              ${hotel.price?.total ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.price">Total price</span>
                <span class="hotel-detail-value">~${hotel.price.total.currency} ${hotel.price.total.value}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply();
    initHotelToggleButtons();
  }

  /**
   * Initialize flight toggle buttons
   */
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

  /**
   * Initialize hotel toggle buttons
   */
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

  // Listen for language changes
  window.addEventListener('languageChanged', () => {
    if (currentTripData) {
      renderTrip(currentTripData);
    }
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
