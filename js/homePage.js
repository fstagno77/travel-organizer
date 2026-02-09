/**
 * HomePage - Homepage initialization, trip cards, today section, and modals
 */
const homePage = (function() {
  'use strict';

  /**
   * Initialize homepage
   */
  async function init() {
    console.log('[homePage] init() called');
    const todayContainer = document.getElementById('today-container');
    const tripsContainer = document.getElementById('trips-container');
    if (!tripsContainer) return;

    console.log('[homePage] auth object:', auth);
    console.log('[homePage] isAuthenticated:', auth?.isAuthenticated());

    // Check if user is authenticated - redirect to login page if not
    if (!auth?.isAuthenticated()) {
      console.log('[homePage] User not authenticated, redirecting to login page');
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
      i18n.apply(tripsContainer);
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
            <span class="today-flight-time">${utils.escapeHtml(depTime)}</span>
          </div>
          <a href="${trackingUrl}" target="_blank" rel="noopener" class="today-flight-number">
            ${utils.escapeHtml(flight.flightNumber)}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
        <div class="today-flight-main">
          <div class="today-flight-location">
            <span class="today-flight-city">${utils.escapeHtml(depCity)}</span>
            <span class="today-flight-airport">${utils.escapeHtml(depAirport)}</span>
          </div>
          <div class="today-flight-terminal">
            <span class="today-flight-label" data-i18n="flight.terminal">Terminal</span>
            <span class="today-flight-value">${utils.escapeHtml(terminal)}</span>
          </div>
        </div>
        <div class="today-flight-secondary">
          <span class="material-icons-outlined today-flight-landing-icon">flight_land</span>
          <span class="today-flight-dest">${utils.escapeHtml(arrCity)}</span>
          <span class="today-flight-arr-time">${utils.escapeHtml(arrTime)}${nextDayIndicator}</span>
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
            <span class="today-hotel-time">${utils.escapeHtml(statusTime || statusText)}</span>
          </div>
          ${showConfirmation ? `<span class="today-hotel-confirmation">${utils.escapeHtml(confirmation)}</span>` : ''}
        </div>
        <div class="today-hotel-main">
          <div class="today-hotel-name">${utils.escapeHtml(hotelName)}</div>
          <div class="today-hotel-city">${utils.escapeHtml(address)}</div>
        </div>
        <div class="today-hotel-secondary">
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="today-hotel-maps-link">
            <span class="material-icons-outlined">location_on</span>
            <span class="today-hotel-address">${utils.escapeHtml(hotel.address?.fullAddress || address)}</span>
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

    i18n.apply(container);
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
            <span class="trip-card-destination">${utils.escapeHtml(title)}</span>
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
            <button class="trip-card-dropdown-item" data-action="changePhoto" data-trip-id="${trip.id}" data-trip-destination="${utils.escapeHtml(trip.destination || '')}">
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
            <button class="trip-card-dropdown-item" data-action="rename" data-trip-id="${trip.id}" data-trip-name="${utils.escapeHtml(title)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="trip.rename">Rinomina</span>
            </button>
            <button class="trip-card-dropdown-item trip-card-dropdown-item--danger" data-action="delete" data-trip-id="${trip.id}" data-trip-name="${utils.escapeHtml(title)}">
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
      i18n.apply(container);

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
    i18n.apply(container);
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
              <input type="text" id="rename-input" class="form-input" value="${utils.escapeHtml(currentName)}" autofocus>
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
        init();
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
    i18n.apply(modal);
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
            <p class="text-muted mt-2"><strong>${utils.escapeHtml(tripName || '')}</strong></p>
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
        init();
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
    i18n.apply(modal);
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
    i18n.apply(modal);
  }

  return { init };
})();

// Make available globally (required for Vite bundling)
window.homePage = homePage;
