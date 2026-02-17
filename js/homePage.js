/**
 * HomePage - Homepage initialization, trip cards, today section, and modals
 */
const homePage = (function() {
  'use strict';

  const CACHE_KEY = 'trips_cache';
  const PAST_TRIPS_PAGE_SIZE = 6;
  const PHASE1_UPCOMING_COUNT = 3;

  let renderGeneration = 0;
  let documentClickBound = false;

  /**
   * Get today's date, optionally overridden by ?testDate=YYYY-MM-DD query param
   * @returns {Date}
   */
  function getToday() {
    const params = new URLSearchParams(window.location.search);
    const testDate = params.get('testDate');
    if (testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
      const d = new Date(testDate + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  /**
   * Invalidate the trips cache in sessionStorage
   */
  function invalidateCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ }
  }

  /**
   * Initialize homepage
   */
  async function init() {
    console.log('[homePage] init() called');
    const tripsContainer = document.getElementById('trips-container');
    if (!tripsContainer) return;

    // Check if user is authenticated - redirect to login page if not
    if (!auth?.isAuthenticated()) {
      window.location.href = './login.html';
      return;
    }

    // Stale-while-revalidate: render cached data immediately if available
    let cachedJson = null;
    try {
      cachedJson = sessionStorage.getItem(CACHE_KEY);
    } catch (e) { /* ignore */ }

    if (cachedJson) {
      try {
        const cached = JSON.parse(cachedJson);
        renderTrips(tripsContainer, cached.trips || [], cached.todayTrips || []);
      } catch (e) {
        invalidateCache();
      }
    }

    // Fetch fresh data in parallel
    try {
      let allTrips = [];
      let todayTrips = [];

      try {
        const testDate = new URLSearchParams(window.location.search).get('testDate');
        const tripsUrl = testDate ? `/.netlify/functions/get-trips?testDate=${encodeURIComponent(testDate)}` : '/.netlify/functions/get-trips';
        const response = await utils.authFetch(tripsUrl);
        const result = await response.json();
        if (result.success && result.trips) {
          allTrips = result.trips;
        }
        if (result.todayTrips) {
          todayTrips = result.todayTrips;
        }
      } catch (e) {
        console.log('Could not load trips from database');
        if (cachedJson) return;
      }

      // Save fresh data to cache
      const freshJson = JSON.stringify({ trips: allTrips, todayTrips });
      try { sessionStorage.setItem(CACHE_KEY, freshJson); } catch (e) { /* ignore */ }

      // Only re-render if data changed (or no cache existed)
      if (freshJson !== cachedJson) {
        renderTrips(tripsContainer, allTrips, todayTrips);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      if (cachedJson) return;
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
    const date = getToday();
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
   * @param {Array} todayTrips - Trips active today (with flights/hotels data)
   * @returns {object|null} - Flight data with trip info or null
   */
  function getTodayFlight(todayTrips) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Collect all flights from today's trips
    let todayFlights = [];

    for (const trip of todayTrips) {
      const flights = trip.flights || [];

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
   * @param {Array} todayTrips - Trips active today (with flights/hotels data)
   * @returns {object|null} - Hotel data with trip info or null
   */
  function getTodayHotel(todayTrips) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const trip of todayTrips) {
      const hotels = trip.hotels || [];

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
    const today = getToday();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  /**
   * Check if a trip is currently active (today is between start and end)
   * @param {object} trip
   * @returns {boolean}
   */
  function isTripCurrent(trip) {
    const today = getToday();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return startDate <= today && today <= endDate;
  }

  /**
   * Collect today's events from todayTrips data for a specific trip
   * @param {string} tripId
   * @param {Array} todayTrips
   * @param {string} lang
   * @returns {Array} - Array of event objects { type, time, title, subtitle, location }
   */
  function collectTodayEvents(tripId, todayTrips, lang) {
    const d = getToday();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const events = [];
    const cats = window.activityCategories;

    const tripData = todayTrips.find(t => t.id === tripId);
    if (!tripData) return events;

    // Flights
    const flights = tripData.flights || [];
    for (const flight of flights) {
      const isToday = flight.date === today;
      const arrivesToday = flight.arrivalNextDay && getNextDay(flight.date) === today;
      if (isToday || arrivesToday) {
        const depCity = flight.departure?.city || '';
        const arrCity = flight.arrival?.city || '';
        const cat = cats?.CATEGORIES?.volo;
        events.push({
          type: 'flight',
          id: flight.id,
          time: flight.departureTime || '',
          title: `${depCity} → ${arrCity}`,
          description: flight.flightNumber || '',
          location: flight.departure?.airport || '',
          category: cat || null
        });
      }
    }

    // Hotels
    const hotels = tripData.hotels || [];
    for (const hotel of hotels) {
      const checkInDate = hotel.checkIn?.date;
      const checkOutDate = hotel.checkOut?.date;
      if (!checkInDate || !checkOutDate) continue;

      const checkOutPlusOne = getNextDay(checkOutDate);
      if (today >= checkInDate && today <= checkOutPlusOne) {
        const isCheckIn = checkInDate === today;
        const isCheckOut = checkOutDate === today || checkOutPlusOne === today;
        let statusLabel;
        if (isCheckIn) statusLabel = i18n.t('hotel.checkIn') || 'Check-in';
        else if (isCheckOut) statusLabel = i18n.t('hotel.checkOut') || 'Check-out';
        else statusLabel = i18n.t('hotel.stay') || 'Soggiorno';

        const cat = cats?.CATEGORIES?.hotel;
        events.push({
          type: 'hotel',
          id: hotel.id,
          time: isCheckIn ? (hotel.checkIn?.time || '15:00') : (isCheckOut ? (hotel.checkOut?.time || '12:00') : ''),
          title: hotel.name || 'Hotel',
          description: statusLabel,
          location: hotel.address?.city || hotel.address?.fullAddress || '',
          category: cat || null
        });
      }
    }

    // Custom activities for today
    const activities = tripData.activities || [];
    for (const activity of activities) {
      if (activity.date === today) {
        const catKey = cats?.detectCategory?.(activity.name, activity.description) || 'luogo';
        const cat = cats?.CATEGORIES?.[activity.category || catKey];
        events.push({
          type: 'activity',
          id: activity.id,
          time: activity.startTime || '',
          title: activity.name || '',
          description: activity.description || '',
          location: activity.address || '',
          category: cat || null
        });
      }
    }

    // Sort: no-time first, then by time
    events.sort((a, b) => {
      if (!a.time && b.time) return -1;
      if (a.time && !b.time) return 1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });

    return events;
  }

  /**
   * Get color config for event type
   * @param {string} type
   * @returns {object}
   */
  function getEventTypeColors(type) {
    const colors = {
      flight:   { bg: 'linear-gradient(135deg, #eff6ff, #eef2ff)', border: '#bfdbfe', icon: 'linear-gradient(135deg, #3b82f6, #4f46e5)', iconName: 'flight' },
      hotel:    { bg: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)', border: '#a7f3d0', icon: 'linear-gradient(135deg, #34d399, #14b8a6)', iconName: 'bed' },
      activity: { bg: 'linear-gradient(135deg, #faf5ff, #faf5ff)', border: '#e9d5ff', icon: 'linear-gradient(135deg, #a855f7, #7c3aed)', iconName: 'local_activity' }
    };
    return colors[type] || colors.activity;
  }

  /**
   * Get destination cities string for a trip
   * @param {object} trip
   * @param {Array} todayTrips
   * @returns {string}
   */
  function getTripDestinations(trip) {
    // Only show cities explicitly set by the user via the "Città" modal
    if (!trip.cities || trip.cities.length === 0) return '';
    return trip.cities
      .map(c => typeof c === 'string' ? c : (c.name || ''))
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Add click handlers on today's event cards to deep-link into the trip page
   */
  function initCurrentTripEventLinks(container) {
    const tripCard = container.querySelector('.current-trip-card');
    if (!tripCard) return;
    const tripUrl = tripCard.getAttribute('href');
    if (!tripUrl) return;

    tripCard.addEventListener('click', (e) => {
      const eventCard = e.target.closest('.current-event-card[data-event-type]');
      if (!eventCard) return; // let the default <a> navigation happen

      e.preventDefault();
      e.stopPropagation();

      const type = eventCard.dataset.eventType;
      const id = eventCard.dataset.eventId;
      const tab = eventCard.dataset.eventTab;

      const url = new URL(tripUrl, window.location.origin);
      if (tab) url.searchParams.set('tab', tab);

      if (type === 'activity' && id) {
        url.searchParams.set('activityId', id);
      } else if (id) {
        url.searchParams.set('itemId', id);
      }

      window.location.href = url.toString();
    });
  }

  /**
   * Render the "In Corso" featured card for the current trip
   * @param {object} trip
   * @param {Array} todayTrips
   * @param {string} lang
   * @returns {string}
   */
  function renderCurrentTripCard(trip, todayTrips, lang) {
    const title = trip.title[lang] || trip.title.en || trip.title.it;
    const startDate = utils.formatDate(trip.startDate, lang, { month: 'short', day: 'numeric' });
    const endDate = utils.formatDate(trip.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
    const days = getTripDuration(trip.startDate, trip.endDate);
    const dayLabel = days === 1 ? (i18n.t('home.day') || 'giorno') : (i18n.t('home.days') || 'giorni');
    const tripUrl = `trip.html?id=${trip.id}`;
    const todayStr = formatTodayDate(lang);

    // Build destination cities string from trip data
    const destinationStr = getTripDestinations(trip);

    // Collect today's events
    const todayEvents = collectTodayEvents(trip.id, todayTrips, lang);

    // Render event cards with category colors
    let eventsHtml = '';
    if (todayEvents.length > 0) {
      eventsHtml = todayEvents.map(event => {
        const cat = event.category;
        const bg = cat?.cardBg || 'linear-gradient(135deg, #faf5ff, #faf5ff)';
        const border = cat?.cardBorder || '#e9d5ff';
        const iconGradient = cat?.gradient || 'linear-gradient(135deg, #a855f7, #7c3aed)';
        const iconHtml = cat?.svg || '<span class="material-symbols-outlined">location_on</span>';

        // Map event type to trip page tab name
        const tabMap = { flight: 'flights', hotel: 'hotels', activity: 'activities' };
        const tab = tabMap[event.type] || 'activities';

        return `
          <div class="current-event-card" style="background: ${bg}; border-color: ${border}"
               data-event-type="${event.type}" data-event-id="${event.id || ''}" data-event-tab="${tab}">
            <div class="current-event-icon" style="background: ${iconGradient}">
              <span style="color: white; display: flex; align-items: center; justify-content: center">${iconHtml}</span>
            </div>
            <div class="current-event-info">
              <div class="current-event-header-row">
                ${event.time ? `<span class="current-event-time">${utils.escapeHtml(event.time)}</span><span class="current-event-dot">&middot;</span>` : ''}
                <span class="current-event-title">${utils.escapeHtml(event.title)}</span>
              </div>
              ${event.description ? `<span class="current-event-description">${utils.escapeHtml(event.description)}</span>` : ''}
              ${event.location ? `
                <div class="current-event-location">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${utils.escapeHtml(event.location)}</span>
                </div>
              ` : ''}
            </div>
            <div class="current-event-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        `;
      }).join('');
    }

    const headerHtml = renderSectionHeader(
      i18n.t('home.currentTrip') || 'In Corso',
      i18n.t('home.currentSubtitle') || 'Il tuo viaggio attuale',
      'current'
    );

    return `
      <section class="home-section">
        ${headerHtml}
        <a href="${tripUrl}" class="current-trip-card">
          <div class="current-trip-header">
            <div class="current-trip-info">
              <h3 class="current-trip-title">${utils.escapeHtml(title)}</h3>
              ${destinationStr ? `
                <div class="current-trip-destination">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${utils.escapeHtml(destinationStr)}</span>
                </div>
              ` : ''}
              <div class="current-trip-meta">
                <div class="current-trip-meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>${startDate} - ${endDate}</span>
                </div>
                <div class="current-trip-meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>${days} ${dayLabel}</span>
                </div>
              </div>
            </div>
            <div class="current-trip-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
          ${todayEvents.length > 0 ? `
            <div class="current-trip-today">
              <h4 class="current-trip-today-label">${i18n.t('home.todayLabel') || 'Oggi'} &middot; ${todayStr}</h4>
              <div class="current-trip-events">${eventsHtml}</div>
            </div>
          ` : ''}
          <div class="current-trip-cta">
            <span>${i18n.t('home.viewFullItinerary') || 'Visualizza Itinerario Completo'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>
      </section>
    `;
  }

  /**
   * Calculate trip duration in days
   * @param {string} startDate
   * @param {string} endDate
   * @returns {number}
   */
  function getTripDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Render a section header with colored bar
   * @param {string} title
   * @param {string} subtitle
   * @param {string} variant - 'upcoming', 'past'
   * @returns {string}
   */
  function renderSectionHeader(title, subtitle, variant) {
    return `
      <div class="home-section-header">
        <div class="home-section-bar home-section-bar--${variant}"></div>
        <div>
          <h2 class="home-section-title">${utils.escapeHtml(title)}</h2>
          <p class="home-section-subtitle">${utils.escapeHtml(subtitle)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render a single trip card
   * @param {object} trip
   * @param {string} lang
   * @param {boolean} isPast
   * @param {number} index - Card position in render order (for eager/lazy loading)
   * @returns {string}
   */
  function renderTripCard(trip, lang, isPast, index) {
    const title = trip.title[lang] || trip.title.en || trip.title.it;
    const startDate = utils.formatDate(trip.startDate, lang, { month: 'short', day: 'numeric' });
    const endDate = utils.formatDate(trip.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
    const cardClass = isPast ? 'trip-card trip-card--past' : 'trip-card';
    const bgColor = isPast ? 'var(--color-gray-400)' : (trip.color || 'var(--color-primary)');

    // Trip duration
    const days = getTripDuration(trip.startDate, trip.endDate);
    const dayLabel = days === 1
      ? (i18n.t('home.day') || 'giorno')
      : (i18n.t('home.days') || 'giorni');
    const durationText = `${days} ${dayLabel}`;

    // All trips now use dynamic page
    const tripUrl = `trip.html?id=${trip.id}`;

    // Cover photo: first 3 cards eager, rest lazy via data-bg
    const coverPhoto = trip.coverPhoto;
    let imageStyle = `background-color: ${coverPhoto?.color || bgColor}`;
    let dataBg = '';
    if (coverPhoto?.url) {
      if (index < 3) {
        imageStyle = `background-image: url('${coverPhoto.url}'); background-color: ${coverPhoto.color || bgColor}`;
      } else {
        dataBg = ` data-bg="${utils.escapeHtml(coverPhoto.url)}"`;
      }
    }

    return `
      <div class="trip-card-wrapper">
        <a href="${tripUrl}" class="${cardClass}">
          <div class="trip-card-image" style="${imageStyle}"${dataBg}>
            <div class="trip-card-overlay">
              <h3 class="trip-card-destination">${utils.escapeHtml(title)}</h3>
              ${trip.cities && trip.cities.length > 0 ? `
                <div class="trip-card-cities">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${trip.cities.map(c => utils.escapeHtml(typeof c === 'string' ? c : (c.name || ''))).filter(Boolean).join(', ')}</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="trip-card-content">
            <div class="trip-card-info">
              <svg class="trip-card-calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="trip-card-dates">${startDate} - ${endDate}</span>
              <span class="trip-card-dot">&middot;</span>
              <span class="trip-card-duration">${durationText}</span>
            </div>
            <svg class="trip-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>
      </div>
    `;
  }

  /**
   * Render trips list
   * @param {HTMLElement} container
   * @param {Array} trips
   * @param {Array} todayTrips - Trips with detailed flight/hotel data for today
   */
  function renderTrips(container, trips, todayTrips) {
    // Hide old today section (replaced by In Corso)
    const todaySection = document.querySelector('.today-section');
    if (todaySection) todaySection.style.display = 'none';

    if (!trips || trips.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="home.emptyTitle">Il tuo viaggio inizia da qui!</h3>
          <p class="empty-state-text" data-i18n="home.emptyText">Raccogli le ricevute in PDF dei tuoi voli e hotel e crea il tuo primo viaggio.</p>
          <button class="btn btn-primary empty-state-cta" id="empty-new-trip-btn" data-i18n="trip.new">Nuovo Viaggio</button>
        </div>
      `;
      i18n.apply(container);

      const emptyBtn = document.getElementById('empty-new-trip-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          document.getElementById('new-trip-btn')?.click();
        });
      }
      return;
    }

    const lang = i18n.getLang();
    const generation = ++renderGeneration;
    todayTrips = todayTrips || [];

    // Separate into 3 categories: current, upcoming (future), past
    const currentTrips = trips.filter(t => isTripCurrent(t));
    const upcomingTrips = trips.filter(t => !isTripCurrent(t) && !isTripPast(t));
    const pastTrips = trips.filter(t => isTripPast(t));

    // Sort upcoming by start date (closest first)
    upcomingTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    // Sort past by start date (most recent first)
    pastTrips.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    let cardIndex = 0;

    // --- Phase 1: In Corso + first 3 upcoming cards ---
    let phase1Html = '';

    // Render "In Corso" section (first current trip)
    if (currentTrips.length > 0) {
      phase1Html += renderCurrentTripCard(currentTrips[0], todayTrips, lang);
    }

    // Render "Prossimi Viaggi" section
    const phase1Upcoming = upcomingTrips.slice(0, PHASE1_UPCOMING_COUNT);
    const phase2Upcoming = upcomingTrips.slice(PHASE1_UPCOMING_COUNT);

    if (upcomingTrips.length > 0) {
      const countLabel = upcomingTrips.length === 1
        ? `1 ${i18n.t('home.tripPlanned') || 'viaggio pianificato'}`
        : `${upcomingTrips.length} ${i18n.t('home.tripsPlanned') || 'viaggi pianificati'}`;
      const headerHtml = renderSectionHeader(
        i18n.t('home.title') || 'Prossimi Viaggi',
        countLabel,
        'upcoming'
      );
      const cardsHtml = phase1Upcoming.map(trip => renderTripCard(trip, lang, false, cardIndex++)).join('');
      phase1Html += `
        <section class="home-section">
          ${headerHtml}
          <div class="grid md:grid-cols-2 lg:grid-cols-3" id="upcoming-trips-grid">${cardsHtml}</div>
        </section>
      `;
    }

    container.innerHTML = phase1Html;
    initCoverLazyLoad(container);
    initTripCardMenus();
    initCurrentTripEventLinks(container);
    i18n.apply(container);

    // --- Phase 2: remaining cards via requestAnimationFrame ---
    const hasPhase2 = phase2Upcoming.length > 0 || pastTrips.length > 0;
    if (!hasPhase2) return;

    requestAnimationFrame(() => {
      // Abort if a newer renderTrips call has started
      if (generation !== renderGeneration) return;

      // Append remaining upcoming cards
      if (phase2Upcoming.length > 0) {
        const upcomingGrid = document.getElementById('upcoming-trips-grid');
        if (upcomingGrid) {
          const fragment = document.createDocumentFragment();
          const tempDiv = document.createElement('div');
          phase2Upcoming.forEach(trip => {
            tempDiv.innerHTML = renderTripCard(trip, lang, false, cardIndex++);
            fragment.appendChild(tempDiv.firstElementChild);
          });
          upcomingGrid.appendChild(fragment);
        }
      }

      // Append past trips section
      if (pastTrips.length > 0) {
        const initialPast = pastTrips.slice(0, PAST_TRIPS_PAGE_SIZE);
        const pastCardsHtml = initialPast.map(trip => renderTripCard(trip, lang, true, cardIndex++)).join('');
        const remaining = pastTrips.length - PAST_TRIPS_PAGE_SIZE;

        const pastHeaderHtml = renderSectionHeader(
          i18n.t('home.pastTrips') || 'Viaggi Passati',
          i18n.t('home.pastSubtitle') || 'I tuoi ricordi',
          'past'
        );

        const pastSection = document.createElement('section');
        pastSection.className = 'home-section past-trips-section';
        pastSection.innerHTML = `
          ${pastHeaderHtml}
          <div class="grid md:grid-cols-2 lg:grid-cols-3" id="past-trips-grid">${pastCardsHtml}</div>
          ${remaining > 0 ? `
            <div class="past-trips-load-more">
              <button class="btn btn-secondary" id="load-more-past-trips">
                <span data-i18n="home.loadMoreTrips">${i18n.t('home.loadMoreTrips') || 'Mostra altri viaggi'}</span> (${remaining})
              </button>
            </div>
          ` : ''}
        `;
        container.appendChild(pastSection);

        // Bind load-more button
        if (pastTrips.length > PAST_TRIPS_PAGE_SIZE) {
          let shown = PAST_TRIPS_PAGE_SIZE;
          const loadMoreBtn = document.getElementById('load-more-past-trips');
          const pastGrid = document.getElementById('past-trips-grid');

          if (loadMoreBtn && pastGrid) {
            loadMoreBtn.addEventListener('click', () => {
              const nextBatch = pastTrips.slice(shown, shown + PAST_TRIPS_PAGE_SIZE);
              const fragment = document.createDocumentFragment();
              const tempDiv = document.createElement('div');

              nextBatch.forEach(trip => {
                tempDiv.innerHTML = renderTripCard(trip, lang, true, cardIndex++);
                fragment.appendChild(tempDiv.firstElementChild);
              });

              pastGrid.appendChild(fragment);
              shown += nextBatch.length;

              initCoverLazyLoad(pastGrid);
              initTripCardMenus();
              i18n.apply(pastGrid);

              const newRemaining = pastTrips.length - shown;
              if (newRemaining > 0) {
                loadMoreBtn.innerHTML = `<span data-i18n="home.loadMoreTrips">${i18n.t('home.loadMoreTrips') || 'Mostra altri viaggi'}</span> (${newRemaining})`;
              } else {
                loadMoreBtn.closest('.past-trips-load-more').remove();
              }
            });
          }
        }
      }

      // Initialize Phase 2 cards
      initCoverLazyLoad(container);
      initTripCardMenus();
      i18n.apply(container);
    });
  }

  /**
   * Lazy load cover images using IntersectionObserver
   * @param {HTMLElement} container
   */
  function initCoverLazyLoad(container) {
    const lazyCards = container.querySelectorAll('.trip-card-image[data-bg]');
    if (lazyCards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.backgroundImage = `url('${el.dataset.bg}')`;
          el.removeAttribute('data-bg');
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '200px' });

    lazyCards.forEach(card => observer.observe(card));
  }

  /**
   * Initialize trip card dropdown menus
   */
  function initTripCardMenus() {
    document.querySelectorAll('.trip-card-menu-btn:not([data-menu-init])').forEach(btn => {
      btn.setAttribute('data-menu-init', '1');
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
    document.querySelectorAll('.trip-card-dropdown-item:not([data-menu-init])').forEach(item => {
      item.setAttribute('data-menu-init', '1');
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

    // Close dropdowns when clicking outside (bind once)
    if (!documentClickBound) {
      documentClickBound = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.trip-card-dropdown.active').forEach(d => {
          d.classList.remove('active');
        });
      });
    }
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
        invalidateCache();
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
        invalidateCache();
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

  return { init, invalidateCache };
})();

// Make available globally (required for Vite bundling)
window.homePage = homePage;
