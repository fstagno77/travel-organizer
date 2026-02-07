/**
 * Main - Application entry point
 */

(async function() {
  'use strict';

  // Store trip data globally for tab switching
  let currentTripData = null;

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

    if (path.includes('changelog.html')) {
      initChangelogPage();
    } else if (path.includes('/trips/')) {
      initTripPage();
    } else if (path.endsWith('/') || path.endsWith('index.html')) {
      initHomePage();
    }
  }

  /**
   * Initialize homepage
   */
  async function initHomePage() {
    console.log('[main] initHomePage() called');
    const todayContainer = document.getElementById('today-container');
    const tripsContainer = document.getElementById('trips-container');
    if (!tripsContainer) return;

    console.log('[main] auth object:', auth);
    console.log('[main] isAuthenticated:', auth?.isAuthenticated());

    // Check if user is authenticated - redirect to login page if not
    if (!auth?.isAuthenticated()) {
      console.log('[main] User not authenticated, redirecting to login page');
      window.location.href = './login.html';
      return;
    }

    try {
      // Load trips from Supabase with authentication
      let allTrips = [];

      try {
        const response = await utils.authFetch('/.netlify/functions/get-trips');
        const result = await response.json();
        if (result.success && result.trips) {
          allTrips = result.trips;
        }
      } catch (e) {
        console.log('Could not load trips from database');
      }

      // Render today section
      if (todayContainer) {
        renderTodaySection(todayContainer, allTrips);
      }

      // Render trips
      renderTrips(tripsContainer, allTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      tripsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✈️</div>
          <h3 class="empty-state-title" data-i18n="home.noTrips">No trips yet</h3>
          <p class="empty-state-text" data-i18n="home.noTripsText">Your trips will appear here</p>
        </div>
      `;
      i18n.apply();
    }
  }

  /**
   * Format today's date in long format
   * @param {string} lang
   * @returns {string}
   */
  function formatTodayDate(lang) {
    const date = new Date();
    const formatted = date.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /**
   * Get the next day date string
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @returns {string}
   */
  function getNextDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the current flight for today
   * @param {Array} trips - All trips
   * @returns {object|null} - Flight data with trip info or null
   */
  function getTodayFlight(trips) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Collect all flights from all trips that are relevant for today
    let todayFlights = [];

    for (const trip of trips) {
      const flights = trip.data?.flights || [];

      for (const flight of flights) {
        const flightDate = flight.date;
        const isToday = flightDate === today;
        const arrivesToday = flight.arrivalNextDay && getNextDay(flightDate) === today;

        if (isToday || arrivesToday) {
          todayFlights.push({
            flight,
            tripId: trip.id,
            tripTitle: trip.title,
            tripColor: trip.color
          });
        }
      }
    }

    if (todayFlights.length === 0) return null;

    // Filter out flights that have already landed (current time > arrival time)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    todayFlights = todayFlights.filter(({ flight }) => {
      const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);
      const arrivalMinutes = arrH * 60 + arrM;

      // If flight departs today and arrives tomorrow, it's active all day today
      if (flight.arrivalNextDay && flight.date === today) {
        return true;
      }

      // If flight departed yesterday and arrives today, check arrival time
      if (flight.arrivalNextDay && getNextDay(flight.date) === today) {
        return currentMinutes <= arrivalMinutes;
      }

      // Normal same-day flight: active until arrival
      return currentMinutes <= arrivalMinutes;
    });

    if (todayFlights.length === 0) return null;

    // Sort by departure time and get the first active one
    todayFlights.sort((a, b) => {
      const [aH, aM] = a.flight.departureTime.split(':').map(Number);
      const [bH, bM] = b.flight.departureTime.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });

    return todayFlights[0];
  }

  /**
   * Get the current hotel for today
   * @param {Array} trips - All trips
   * @returns {object|null} - Hotel data with trip info or null
   */
  function getTodayHotel(trips) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const trip of trips) {
      const hotels = trip.data?.hotels || [];

      for (const hotel of hotels) {
        const checkInDate = hotel.checkIn?.date;
        const checkOutDate = hotel.checkOut?.date;

        if (!checkInDate || !checkOutDate) continue;

        // Hotel visible from check-in until day after check-out
        const checkOutPlusOne = getNextDay(checkOutDate);

        if (today >= checkInDate && today <= checkOutPlusOne) {
          return {
            hotel,
            tripId: trip.id,
            tripTitle: trip.title
          };
        }
      }
    }

    return null;
  }

  /**
   * Render today's flight card
   * @param {object} flightData
   * @param {string} lang
   * @returns {string}
   */
  function renderTodayFlightCard({ flight, tripId, tripTitle, tripColor }, lang) {
    const trackingUrl = utils.getFlightTrackingUrl(flight.flightNumber);
    const detailsUrl = `trip.html?id=${tripId}`;

    // Main info
    const depCity = flight.departure?.city || '-';
    const depAirport = flight.departure?.airport || '';
    const terminal = flight.departure?.terminal || '-';
    const depTime = flight.departureTime;

    // Secondary info
    const arrCity = flight.arrival?.city || '-';
    const arrTime = flight.arrivalTime;
    const nextDayIndicator = flight.arrivalNextDay ? ' +1' : '';

    return `
      <div class="today-flight-card">
        <div class="today-flight-header">
          <div class="today-flight-departure">
            <span class="material-icons-outlined today-flight-icon">flight_takeoff</span>
            <span class="today-flight-time">${depTime}</span>
          </div>
          <a href="${trackingUrl}" target="_blank" rel="noopener" class="today-flight-number">
            ${flight.flightNumber}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
        <div class="today-flight-main">
          <div class="today-flight-location">
            <span class="today-flight-city">${depCity}</span>
            <span class="today-flight-airport">${depAirport}</span>
          </div>
          <div class="today-flight-terminal">
            <span class="today-flight-label" data-i18n="flight.terminal">Terminal</span>
            <span class="today-flight-value">${terminal}</span>
          </div>
        </div>
        <div class="today-flight-secondary">
          <span class="material-icons-outlined today-flight-landing-icon">flight_land</span>
          <span class="today-flight-dest">${arrCity}</span>
          <span class="today-flight-arr-time">${arrTime}${nextDayIndicator}</span>
        </div>
        <a href="${detailsUrl}" class="today-flight-details-link">
          <span data-i18n="home.flightDetails">Details</span>
        </a>
      </div>
    `;
  }

  /**
   * Render today's hotel card
   * @param {object} hotelData
   * @param {string} lang
   * @returns {string}
   */
  function renderTodayHotelCard({ hotel, tripId, tripTitle }, lang) {
    const detailsUrl = `trip.html?id=${tripId}`;
    const today = new Date().toISOString().split('T')[0];

    // Determine if check-in day, during stay, or check-out day
    const isCheckIn = hotel.checkIn?.date === today;
    const isCheckOut = hotel.checkOut?.date === today;
    const isCheckOutPlusOne = getNextDay(hotel.checkOut?.date) === today;

    // Hotel info
    const hotelName = hotel.name || '-';
    const checkInTime = hotel.checkIn?.time || '15:00';
    const checkOutTime = hotel.checkOut?.time || '12:00';
    const address = hotel.address?.city || '';
    const confirmation = hotel.confirmationNumber || '-';

    // Determine status and icon
    let statusIcon, statusText, statusTime;
    if (isCheckIn) {
      statusIcon = 'login';
      statusText = i18n.t('hotel.checkIn');
      statusTime = checkInTime;
    } else if (isCheckOut || isCheckOutPlusOne) {
      statusIcon = 'logout';
      statusText = i18n.t('hotel.checkOut');
      statusTime = checkOutTime;
    } else {
      statusIcon = 'bed';
      statusText = i18n.t('hotel.stay');
      statusTime = '';
    }

    // Only show confirmation on check-in/check-out days
    const showConfirmation = isCheckIn || isCheckOut || isCheckOutPlusOne;

    // Google Maps link
    const mapsUrl = hotel.address?.fullAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`
      : '#';

    return `
      <div class="today-hotel-card">
        <div class="today-hotel-header">
          <div class="today-hotel-status">
            <span class="material-icons-outlined today-hotel-icon">${statusIcon}</span>
            <span class="today-hotel-time">${statusTime || statusText}</span>
          </div>
          ${showConfirmation ? `<span class="today-hotel-confirmation">${confirmation}</span>` : ''}
        </div>
        <div class="today-hotel-main">
          <div class="today-hotel-name">${hotelName}</div>
          <div class="today-hotel-city">${address}</div>
        </div>
        <div class="today-hotel-secondary">
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="today-hotel-maps-link">
            <span class="material-icons-outlined">location_on</span>
            <span class="today-hotel-address">${hotel.address?.fullAddress || address}</span>
          </a>
        </div>
        <a href="${detailsUrl}" class="today-hotel-details-link">
          <span data-i18n="home.flightDetails">Details</span>
        </a>
      </div>
    `;
  }

  /**
   * Render today section
   * @param {HTMLElement} container
   * @param {Array} trips
   */
  function renderTodaySection(container, trips) {
    const lang = i18n.getLang();
    const todayStr = formatTodayDate(lang);

    const todayFlight = getTodayFlight(trips);
    const todayHotel = getTodayHotel(trips);

    // Hide section if no flight or hotel for today
    if (!todayFlight && !todayHotel) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    let cardsHtml = '';

    if (todayFlight) {
      cardsHtml += renderTodayFlightCard(todayFlight, lang);
    }

    if (todayHotel) {
      cardsHtml += renderTodayHotelCard(todayHotel, lang);
    }

    container.innerHTML = `
      <div class="today-date">${todayStr}</div>
      <div class="today-cards">${cardsHtml}</div>
    `;

    i18n.apply();
  }

  /**
   * Check if a trip is in the past
   * @param {object} trip
   * @returns {boolean}
   */
  function isTripPast(trip) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  /**
   * Render a single trip card
   * @param {object} trip
   * @param {string} lang
   * @param {boolean} isPast
   * @returns {string}
   */
  function renderTripCard(trip, lang, isPast) {
    const title = trip.title[lang] || trip.title.en || trip.title.it;
    const startDate = utils.formatDate(trip.startDate, lang, { month: 'short', day: 'numeric' });
    const endDate = utils.formatDate(trip.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
    const cardClass = isPast ? 'trip-card trip-card--past' : 'trip-card';
    const bgColor = isPast ? 'var(--color-gray-400)' : (trip.color || 'var(--color-primary)');

    // All trips now use dynamic page
    const tripUrl = `trip.html?id=${trip.id}`;

    // Cover photo styling (show for all trips, past trips will have grayscale via CSS)
    const coverPhoto = trip.coverPhoto;
    let imageStyle = `background-color: ${bgColor}`;
    if (coverPhoto?.url) {
      imageStyle = `background-image: url('${coverPhoto.url}'); background-color: ${coverPhoto.color || bgColor}`;
    }

    return `
      <div class="trip-card-wrapper">
        <a href="${tripUrl}" class="${cardClass}">
          <div class="trip-card-image" style="${imageStyle}">
            <span class="trip-card-destination">${title}</span>
          </div>
          <div class="trip-card-body">
            <div class="trip-card-dates">${startDate} - ${endDate}</div>
          </div>
        </a>
        <div class="trip-card-menu">
          <button class="trip-card-menu-btn" data-trip-id="${trip.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="trip-card-dropdown" data-trip-id="${trip.id}">
            <button class="trip-card-dropdown-item" data-action="changePhoto" data-trip-id="${trip.id}" data-trip-destination="${trip.destination || ''}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span data-i18n="trip.changePhoto">Cambia foto</span>
            </button>
            <button class="trip-card-dropdown-item" data-action="share" data-trip-id="${trip.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span data-i18n="trip.share">Condividi</span>
            </button>
            <button class="trip-card-dropdown-item" data-action="rename" data-trip-id="${trip.id}" data-trip-name="${title}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="trip.rename">Rinomina</span>
            </button>
            <button class="trip-card-dropdown-item trip-card-dropdown-item--danger" data-action="delete" data-trip-id="${trip.id}" data-trip-name="${title}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span data-i18n="trip.delete">Elimina</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render trips list
   * @param {HTMLElement} container
   * @param {Array} trips
   */
  function renderTrips(container, trips) {
    // Get the today section and trips header
    const todaySection = document.querySelector('.today-section');
    const tripsHeader = container.parentElement?.querySelector('.section-header');

    if (!trips || trips.length === 0) {
      // Hide today section and trips header when no trips
      if (todaySection) todaySection.style.display = 'none';
      if (tripsHeader) tripsHeader.style.display = 'none';

      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="home.emptyTitle">Il tuo viaggio inizia da qui!</h3>
          <p class="empty-state-text" data-i18n="home.emptyText">Raccogli le ricevute in PDF dei tuoi voli e hotel e crea il tuo primo viaggio.</p>
          <button class="btn btn-primary empty-state-cta" id="empty-new-trip-btn" data-i18n="trip.new">Nuovo Viaggio</button>
        </div>
      `;
      i18n.apply();

      // Bind click handler for the empty state button
      const emptyBtn = document.getElementById('empty-new-trip-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          document.getElementById('new-trip-btn')?.click();
        });
      }
      return;
    }

    // Show today section and trips header when there are trips
    if (todaySection) todaySection.style.display = '';
    if (tripsHeader) tripsHeader.style.display = '';

    const lang = i18n.getLang();

    // Separate upcoming and past trips
    const upcomingTrips = trips.filter(t => !isTripPast(t));
    const pastTrips = trips.filter(t => isTripPast(t));

    // Sort upcoming by start date (closest first)
    upcomingTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    // Sort past by start date (most recent first)
    pastTrips.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    let html = '';

    // Render upcoming trips
    if (upcomingTrips.length > 0) {
      const upcomingHtml = upcomingTrips.map(trip => renderTripCard(trip, lang, false)).join('');
      html += `<div class="grid md:grid-cols-2 lg:grid-cols-3">${upcomingHtml}</div>`;
    }

    // Render past trips (always with separator line if past trips exist)
    if (pastTrips.length > 0) {
      const pastHtml = pastTrips.map(trip => renderTripCard(trip, lang, true)).join('');
      html += `
        <div class="past-trips-section">
          <h3 class="past-trips-title" data-i18n="home.pastTrips">Viaggi passati</h3>
          <div class="grid md:grid-cols-2 lg:grid-cols-3">${pastHtml}</div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Initialize dropdown menus
    initTripCardMenus();

    // Apply translations
    i18n.apply();
  }

  /**
   * Initialize trip card dropdown menus
   */
  function initTripCardMenus() {
    const menuBtns = document.querySelectorAll('.trip-card-menu-btn');

    menuBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const tripId = btn.dataset.tripId;
        const dropdown = document.querySelector(`.trip-card-dropdown[data-trip-id="${tripId}"]`);

        // Close all other dropdowns
        document.querySelectorAll('.trip-card-dropdown.active').forEach(d => {
          if (d !== dropdown) d.classList.remove('active');
        });

        dropdown.classList.toggle('active');
      });
    });

    // Handle dropdown actions
    document.querySelectorAll('.trip-card-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const action = item.dataset.action;
        const tripId = item.dataset.tripId;
        const tripName = item.dataset.tripName;
        const tripDestination = item.dataset.tripDestination;

        // Close dropdown
        item.closest('.trip-card-dropdown').classList.remove('active');

        if (action === 'changePhoto') {
          changePhoto(tripId, tripDestination);
        } else if (action === 'share') {
          showShareModal(tripId);
        } else if (action === 'rename') {
          renameTrip(tripId, tripName);
        } else if (action === 'delete') {
          deleteTrip(tripId, tripName);
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.trip-card-dropdown.active').forEach(d => {
        d.classList.remove('active');
      });
    });
  }

  /**
   * Show rename modal
   * @param {string} tripId
   * @param {string} currentName
   */
  function showRenameModal(tripId, currentName) {
    // Remove existing modal if any
    const existingModal = document.getElementById('rename-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay active" id="rename-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.renameTitle">Rinomina viaggio</h2>
            <button class="modal-close" id="rename-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="rename-input" data-i18n="trip.newName">Nuovo nome</label>
              <input type="text" id="rename-input" class="form-input" value="${currentName}" autofocus>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="rename-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="rename-submit" data-i18n="modal.save">Salva</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-input');
    const closeBtn = document.getElementById('rename-modal-close');
    const cancelBtn = document.getElementById('rename-cancel');
    const submitBtn = document.getElementById('rename-submit');

    // Select all text in input
    input.select();

    // Close modal function
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Submit function
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

        closeModal();
        // Refresh homepage
        initHomePage();
      } catch (error) {
        console.error('Error renaming trip:', error);
        alert(i18n.t('trip.renameError') || 'Errore durante la rinomina');
        submitBtn.disabled = false;
        submitBtn.textContent = i18n.t('modal.save') || 'Salva';
      }
    };

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitRename();
    });
    submitBtn.addEventListener('click', submitRename);

    // Apply translations
    i18n.apply();
  }

  /**
   * Change trip photo - opens photo selection modal
   * @param {string} tripId
   * @param {string} destination
   */
  async function changePhoto(tripId, destination) {
    if (!destination) {
      console.error('No destination for trip');
      return;
    }

    try {
      // Fetch trip data with auth
      const response = await utils.authFetch(`/.netlify/functions/get-trip?id=${tripId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to load trip data');
      }

      // Open photo selection modal
      if (window.tripCreator) {
        window.tripCreator.openPhotoSelection(tripId, destination, result.tripData);
      }
    } catch (error) {
      console.error('Error loading trip for photo change:', error);
    }
  }

  /**
   * Rename a trip (opens modal)
   * @param {string} tripId
   * @param {string} currentName
   */
  function renameTrip(tripId, currentName) {
    showRenameModal(tripId, currentName);
  }

  /**
   * Delete a trip - shows confirmation modal
   * @param {string} tripId
   * @param {string} tripName
   */
  function deleteTrip(tripId, tripName) {
    showDeleteModal(tripId, tripName);
  }

  /**
   * Show delete confirmation modal
   * @param {string} tripId
   * @param {string} tripName
   */
  function showDeleteModal(tripId, tripName) {
    const existingModal = document.getElementById('delete-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay active" id="delete-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteTitle">Elimina viaggio</h2>
            <button class="modal-close" id="delete-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="trip.deleteConfirm">Sei sicuro di voler eliminare questo viaggio?</p>
            <p class="text-muted mt-2"><strong>${tripName || ''}</strong></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-danger" id="delete-confirm" data-i18n="trip.delete">Elimina</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('delete-modal');
    const closeBtn = document.getElementById('delete-modal-close');
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

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to delete trip');
        }

        closeModal();
        // Reload trips
        initHomePage();
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert(i18n.t('trip.deleteError') || 'Errore durante l\'eliminazione');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.delete') || 'Elimina';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    confirmBtn.addEventListener('click', performDelete);

    // Apply translations
    i18n.apply();
  }

  /**
   * Initialize changelog page
   */
  async function initChangelogPage() {
    const changelogList = document.getElementById('changelog-list');
    if (!changelogList) return;

    try {
      changelogList.innerHTML = `<div class="changelog-loading"><span class="spinner"></span></div>`;

      const pathPrefix = i18n.getPathPrefix();
      const changelog = await utils.loadJSON(`${pathPrefix}data/changelog.json`);

      renderChangelog(changelogList, changelog.versions);
    } catch (error) {
      console.error('Error loading changelog:', error);
      changelogList.innerHTML = `
        <div class="changelog-error" data-i18n="common.error">An error occurred</div>
      `;
      i18n.apply();
    }
  }

  /**
   * Render changelog entries
   * @param {HTMLElement} container
   * @param {Array} versions
   */
  function renderChangelog(container, versions) {
    const lang = i18n.getLang();

    const html = versions.map(version => {
      const changes = version.changes[lang] || version.changes.en || version.changes;
      const changesList = Array.isArray(changes) ? changes : [changes];

      return `
        <article class="changelog-card">
          <header class="changelog-card-header">
            <span class="changelog-version">v${version.version}</span>
            <span class="changelog-date">${utils.formatDate(version.date, lang)}</span>
          </header>
          <ul class="changelog-changes">
            ${changesList.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </article>
      `;
    }).join('');

    container.innerHTML = html;
  }

  /**
   * Initialize trip page
   */
  async function initTripPage() {
    const contentContainer = document.getElementById('trip-content');
    if (!contentContainer) return;

    try {
      const tripData = await utils.loadJSON(`./trip.json`);
      currentTripData = tripData;

      // Update page title
      const lang = i18n.getLang();
      const title = tripData.title[lang] || tripData.title.en;
      document.title = `${title} - Travel Flow`;

      // Update trip header
      updateTripHeader(tripData);

      // Render segmented control and content
      renderTripContent(contentContainer, tripData);

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

    const routeEl = document.querySelector('.trip-meta-route');
    if (routeEl && tripData.route) {
      routeEl.textContent = tripData.route;
    }
  }

  /**
   * Render trip content with segmented control
   * @param {HTMLElement} container
   * @param {object} tripData
   */
  function renderTripContent(container, tripData) {
    const hasFlights = tripData.flights && tripData.flights.length > 0;
    const hasHotels = tripData.hotels && tripData.hotels.length > 0;

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
            <button class="section-dropdown-item" data-action="add-booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span data-i18n="trip.addBooking">Aggiungi prenotazione</span>
            </button>
            <button class="section-dropdown-item" data-action="rename">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="trip.rename">Rinomina</span>
            </button>
            <button class="section-dropdown-item" data-action="share">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span data-i18n="trip.share">Condividi</span>
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

    // Initialize section menus
    initSectionMenus(tripData.id);

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

        // Update button states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }

  /**
   * Initialize section menus (add flight/hotel)
   * @param {string} tripId
   */
  function initSectionMenus(tripId) {
    // Content menu (unified)
    const contentMenuBtn = document.getElementById('content-menu-btn');
    const contentDropdown = document.getElementById('content-dropdown');

    if (contentMenuBtn && contentDropdown) {
      contentMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        contentDropdown.classList.toggle('active');
      });
    }

    // Handle dropdown actions
    document.querySelectorAll('.section-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;

        // Close dropdown
        contentDropdown?.classList.remove('active');

        if (action === 'share') {
          showShareModal(tripId);
        } else if (action === 'add-booking') {
          showAddBookingModal(tripId);
        } else if (action === 'rename') {
          const lang = i18n.getLang();
          const currentName = currentTripData?.title[lang] || currentTripData?.title.en || '';
          showRenameModal(tripId, currentName);
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      contentDropdown?.classList.remove('active');
    });
  }

  /**
   * Show modal to add booking (flight or hotel - AI will determine type)
   * @param {string} tripId
   */
  function showAddBookingModal(tripId) {
    // Remove existing modal if any
    const existingModal = document.getElementById('add-booking-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay active" id="add-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.addBookingTitle">Aggiungi prenotazione</h2>
            <button class="modal-close" id="add-booking-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body" id="add-booking-modal-body">
            <div class="upload-zone" id="add-booking-upload-zone">
              <input type="file" id="add-booking-file-input" accept=".pdf" hidden>
              <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="upload-zone-text" data-i18n="trip.uploadHint">Trascina qui i PDF o clicca per selezionare</div>
              <div class="upload-zone-hint">PDF</div>
            </div>
            <div class="file-list" id="add-booking-file-list"></div>
          </div>
          <div class="modal-footer" id="add-booking-modal-footer">
            <button class="btn btn-secondary" id="add-booking-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="add-booking-submit" disabled data-i18n="modal.add">Aggiungi</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('add-booking-modal');
    const closeBtn = document.getElementById('add-booking-modal-close');
    const cancelBtn = document.getElementById('add-booking-cancel');
    const submitBtn = document.getElementById('add-booking-submit');
    const uploadZone = document.getElementById('add-booking-upload-zone');
    const fileInput = document.getElementById('add-booking-file-input');
    const fileList = document.getElementById('add-booking-file-list');

    let files = [];

    // Close modal function
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Render file list
    const renderFileList = () => {
      if (files.length === 0) {
        fileList.innerHTML = '';
        submitBtn.disabled = true;
        return;
      }

      fileList.innerHTML = files.map((file, index) => `
        <div class="file-item">
          <div class="file-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="file-item-info">
            <div class="file-item-name">${file.name}</div>
          </div>
          <button class="file-item-remove" data-index="${index}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `).join('');

      submitBtn.disabled = false;

      // Bind remove buttons
      fileList.querySelectorAll('.file-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          files.splice(index, 1);
          renderFileList();
        });
      });
    };

    // Add files
    const addFiles = (fileListInput) => {
      const pdfFiles = Array.from(fileListInput).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 1 || (pdfFiles.length === 1 && files.length > 0)) {
        utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
        return;
      }
      files.push(...pdfFiles);
      renderFileList();
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

    // Convert file to base64
    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    };

    // Submit function
    const submitBooking = async () => {
      if (files.length === 0) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        // Convert files to base64
        const pdfs = await Promise.all(
          files.map(async file => ({
            filename: file.name,
            content: await fileToBase64(file)
          }))
        );

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

        // Check for rate limit error
        if (response.status === 429 || result.errorType === 'rate_limit') {
          throw new Error('rate_limit');
        }

        if (!response.ok || !result.success) {
          throw Object.assign(
            new Error(result.error || 'Failed to add booking'),
            { errorCode: result.errorCode }
          );
        }

        closeModal();
        // Reload trip page
        initTripPage();
        utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
      } catch (error) {
        console.error('Error adding booking:', error);
        let errorMessage;
        if (error.message === 'rate_limit') {
          errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
        } else {
          errorMessage = i18n.t('trip.addError') || 'Errore durante l\'aggiunta';
          if (error.errorCode) errorMessage += ` [${error.errorCode}]`;
        }
        alert(errorMessage);
        submitBtn.disabled = false;
        submitBtn.textContent = i18n.t('modal.add') || 'Aggiungi';
      }
    };

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    submitBtn.addEventListener('click', submitBooking);

    // Apply translations
    i18n.apply();
  }

  /**
   * Show share modal with shareable link
   * @param {string} tripId
   */
  function showShareModal(tripId) {
    // Remove existing modal if any
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    // Generate share URL
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share.html?id=${tripId}`;

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
          <p class="empty-state-text" data-i18n="trip.noFlightsText">Add a booking to see your flights here</p>
          <button class="btn btn-primary empty-state-cta" id="add-flight-cta">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span data-i18n="trip.addBooking">Add booking</span>
          </button>
        </div>
      `;
      i18n.apply();
      // Add click handler for CTA
      document.getElementById('add-flight-cta')?.addEventListener('click', () => {
        const tripId = window.location.pathname.split('/trips/')[1]?.split('/')[0];
        if (tripId) showAddBookingModal(tripId);
      });
      return;
    }

    const lang = i18n.getLang();

    // Sort flights: upcoming first (by date), then past flights (by date)
    const sortedFlights = [...flights].sort((a, b) => {
      const aPast = isFlightPast(a);
      const bPast = isFlightPast(b);

      // If one is past and one is not, upcoming comes first
      if (aPast !== bPast) {
        return aPast ? 1 : -1;
      }

      // Both are in the same category, sort by date
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
              ${flight.flightNumber}
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
          <p class="empty-state-text" data-i18n="trip.noHotelsText">Add a booking to see your hotels here</p>
          <button class="btn btn-primary empty-state-cta" id="add-hotel-cta">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span data-i18n="trip.addBooking">Add booking</span>
          </button>
        </div>
      `;
      i18n.apply();
      // Add click handler for CTA
      document.getElementById('add-hotel-cta')?.addEventListener('click', () => {
        const tripId = window.location.pathname.split('/trips/')[1]?.split('/')[0];
        if (tripId) showAddBookingModal(tripId);
      });
      return;
    }

    const lang = i18n.getLang();

    // Sort hotels by check-in date
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
                <span class="hotel-detail-value">${utils.formatGuests(hotel.guests, lang)}</span>
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
