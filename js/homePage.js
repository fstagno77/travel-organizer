/**
 * HomePage - Homepage initialization, trip cards, today section, and modals
 */
const homePage = (function() {
  'use strict';

  const CACHE_KEY = 'trips_cache_v2';
  const PHASE1_UPCOMING_COUNT = 3;

  let renderGeneration = 0;

  // Alias per funzioni condivise da tripCardUtils
  const getToday = () => tripCardUtils.getToday();

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

  // isTripPast e isTripCurrent ora in tripCardUtils
  const isTripPast = (trip) => tripCardUtils.isTripPast(trip);
  const isTripCurrent = (trip) => tripCardUtils.isTripCurrent(trip);

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
   * Trova il prossimo evento dopo oggi per un viaggio
   */
  function collectNextEvent(tripId, todayTrips, lang) {
    const d = getToday();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cats = window.activityCategories;
    const tripData = todayTrips.find(t => t.id === tripId);
    if (!tripData) return null;

    const futureEvents = [];

    // Voli futuri
    for (const flight of (tripData.flights || [])) {
      if (flight.date > today) {
        const depCity = flight.departure?.city || '';
        const arrCity = flight.arrival?.city || '';
        const cat = cats?.CATEGORIES?.volo;
        futureEvents.push({
          type: 'flight',
          id: flight.id,
          date: flight.date,
          time: flight.departureTime || '',
          title: `${depCity} → ${arrCity}`,
          description: flight.flightNumber || '',
          location: flight.departure?.airport || '',
          category: cat || null
        });
      }
    }

    // Hotel check-in futuri
    for (const hotel of (tripData.hotels || [])) {
      const checkInDate = hotel.checkIn?.date;
      if (checkInDate && checkInDate > today) {
        const cat = cats?.CATEGORIES?.hotel;
        futureEvents.push({
          type: 'hotel',
          id: hotel.id,
          date: checkInDate,
          time: hotel.checkIn?.time || '15:00',
          title: hotel.name || 'Hotel',
          description: i18n.t('hotel.checkIn') || 'Check-in',
          location: hotel.address?.city || hotel.address?.fullAddress || '',
          category: cat || null
        });
      }
    }

    // Attivita future
    for (const activity of (tripData.activities || [])) {
      if (activity.date > today) {
        const catKey = cats?.detectCategory?.(activity.name, activity.description) || 'luogo';
        const cat = cats?.CATEGORIES?.[activity.category || catKey];
        futureEvents.push({
          type: 'activity',
          id: activity.id,
          date: activity.date,
          time: activity.startTime || '',
          title: activity.name || '',
          description: activity.description || '',
          location: activity.address || '',
          category: cat || null
        });
      }
    }

    if (futureEvents.length === 0) return null;

    // Ordina per data e orario, prendi il primo
    futureEvents.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      if (!a.time && b.time) return 1;
      if (a.time && !b.time) return -1;
      return (a.time || '').localeCompare(b.time || '');
    });

    const next = futureEvents[0];

    // Calcola label data relativa
    const eventDate = new Date(next.date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((eventDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      next.dateLabel = i18n.t('home.tomorrow') || 'Domani';
    } else if (diffDays <= 7) {
      next.dateLabel = (i18n.t('home.inDays') || 'Tra {n} giorni').replace('{n}', diffDays);
    } else {
      next.dateLabel = utils.formatDate(next.date, lang, { day: 'numeric', month: 'short' });
    }

    return next;
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
   * Renderizza la sezione summary quando non ci sono eventi oggi:
   * progress bar, riepilogo numerico, prossimo evento
   */
  function renderTripSummary(trip, todayTrips, lang) {
    const tripData = todayTrips.find(t => t.id === trip.id);

    // Progress: Giorno X di Y
    const today = getToday();
    const start = new Date(trip.startDate + 'T00:00:00');
    const end = new Date(trip.endDate + 'T00:00:00');
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.min(Math.round((today - start) / (1000 * 60 * 60 * 24)) + 1, totalDays);
    const progressPct = Math.round((currentDay / totalDays) * 100);
    const progressLabel = (i18n.t('home.dayProgress') || 'Giorno {current} di {total}')
      .replace('{current}', currentDay)
      .replace('{total}', totalDays);

    // Riepilogo numerico
    const flightCount = (tripData?.flights || []).length;
    const hotelCount = (tripData?.hotels || []).length;
    const activityCount = (tripData?.activities || []).length;

    const statItems = [];
    if (flightCount > 0) {
      statItems.push(`
        <div class="current-trip-stat">
          <div class="current-trip-stat-icon" style="background: linear-gradient(135deg, #3b82f6, #4f46e5)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.7 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
          </div>
          <span class="current-trip-stat-count">${flightCount}</span>
          <span class="current-trip-stat-label">${i18n.t('trip.flights') || 'Voli'}</span>
        </div>
      `);
    }
    if (hotelCount > 0) {
      statItems.push(`
        <div class="current-trip-stat">
          <div class="current-trip-stat-icon" style="background: linear-gradient(135deg, #34d399, #14b8a6)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7"></path>
              <path d="M3 14h18"></path>
              <path d="M7 10h0"></path>
              <path d="M3 7l9-4 9 4"></path>
            </svg>
          </div>
          <span class="current-trip-stat-count">${hotelCount}</span>
          <span class="current-trip-stat-label">Hotel</span>
        </div>
      `);
    }
    if (activityCount > 0) {
      statItems.push(`
        <div class="current-trip-stat">
          <div class="current-trip-stat-icon" style="background: linear-gradient(135deg, #a855f7, #7c3aed)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
          </div>
          <span class="current-trip-stat-count">${activityCount}</span>
          <span class="current-trip-stat-label">${i18n.t('trip.activities') || 'Attività'}</span>
        </div>
      `);
    }

    // Prossimo evento
    const nextEvent = collectNextEvent(trip.id, todayTrips, lang);
    let nextEventHtml = '';
    if (nextEvent) {
      const cat = nextEvent.category;
      const bg = cat?.cardBg || 'linear-gradient(135deg, #faf5ff, #faf5ff)';
      const border = cat?.cardBorder || '#e9d5ff';
      const iconGradient = cat?.gradient || 'linear-gradient(135deg, #a855f7, #7c3aed)';
      const iconHtml = cat?.svg || '<span class="material-symbols-outlined" style="font-size:16px">event</span>';

      const tabMap = { flight: 'flights', hotel: 'hotels', activity: 'activities' };
      const nextTab = tabMap[nextEvent.type] || 'activities';

      nextEventHtml = `
        <div class="current-trip-next">
          <h4 class="current-trip-next-label">${i18n.t('home.nextEvent') || 'Prossimo'} &middot; ${utils.escapeHtml(nextEvent.dateLabel)}</h4>
          <div class="current-event-card" style="background: ${bg}; border-color: ${border}"
               data-event-type="${nextEvent.type}" data-event-id="${nextEvent.id || ''}" data-event-tab="${nextTab}">
            <div class="current-event-icon" style="background: ${iconGradient}">
              <span style="color: white; display: flex; align-items: center; justify-content: center">${iconHtml}</span>
            </div>
            <div class="current-event-info">
              <div class="current-event-header-row">
                ${nextEvent.time ? `<span class="current-event-time">${utils.escapeHtml(nextEvent.time)}</span><span class="current-event-dot">&middot;</span>` : ''}
                <span class="current-event-title">${utils.escapeHtml(nextEvent.title)}</span>
              </div>
              ${nextEvent.description ? `<span class="current-event-description">${utils.escapeHtml(nextEvent.description)}</span>` : ''}
              ${nextEvent.location ? `
                <div class="current-event-location">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${utils.escapeHtml(nextEvent.location)}</span>
                </div>
              ` : ''}
            </div>
            <div class="current-event-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="current-trip-summary">
        <div class="current-trip-progress">
          <div class="current-trip-progress-header">
            <span class="current-trip-progress-label">${progressLabel}</span>
            <span class="current-trip-progress-pct">${progressPct}%</span>
          </div>
          <div class="current-trip-progress-bar">
            <div class="current-trip-progress-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>
        ${statItems.length > 0 ? `
          <div class="current-trip-stats">
            ${statItems.join('')}
          </div>
        ` : ''}
        ${nextEventHtml}
      </div>
    `;
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
              </div>
            </div>
            <div class="current-trip-arrow">
              <span class="current-trip-arrow-label">${i18n.t('home.viewFullItinerary') || 'Visualizza Itinerario Completo'}</span>
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
          ` : renderTripSummary(trip, todayTrips, lang)}
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

  // Funzioni delegate a tripCardUtils
  const renderSectionHeader = (title, subtitle, variant) => tripCardUtils.renderSectionHeader(title, subtitle, variant);
  const renderTripCard = (trip, lang, isPast, index) => tripCardUtils.renderTripCard(trip, lang, isPast, index);

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
          if (typeof tripCreator !== 'undefined' && tripCreator.open) {
            tripCreator.open();
          }
        });
      }
      return;
    }

    const lang = i18n.getLang();
    const generation = ++renderGeneration;
    todayTrips = todayTrips || [];

    // Separa in 2 categorie: in corso e prossimi (viaggi passati in pagina dedicata)
    const currentTrips = trips.filter(t => isTripCurrent(t));
    const upcomingTrips = trips.filter(t => !isTripCurrent(t) && !isTripPast(t));

    // Ordina prossimi per data inizio (più vicino prima)
    upcomingTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

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

    // Sezione "Prossimi Viaggi" — sempre visibile con pulsante "+" Nuovo Viaggio
    {
      const countLabel = upcomingTrips.length === 0
        ? (i18n.t('home.noUpcoming') || 'Nessun viaggio in programma')
        : upcomingTrips.length === 1
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
          ${upcomingTrips.length > 0 ? `<div class="grid md:grid-cols-2 lg:grid-cols-3" id="upcoming-trips-grid">${cardsHtml}</div>` : ''}
        </section>
      `;
    }

    container.innerHTML = phase1Html;
    initCoverLazyLoad(container);
    initTripCardMenus();
    initCurrentTripEventLinks(container);
    i18n.apply(container);

    // --- Phase 2: remaining cards via requestAnimationFrame ---
    const hasPhase2 = phase2Upcoming.length > 0;
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

      // Initialize Phase 2 cards
      initCoverLazyLoad(container);
      initTripCardMenus();
      i18n.apply(container);
    });
  }

  // Funzioni delegate a tripCardUtils
  const initCoverLazyLoad = (container) => tripCardUtils.initCoverLazyLoad(container);

  function initTripCardMenus() {
    const onSuccess = () => { invalidateCache(); init(); };
    tripCardUtils.initTripCardMenus({
      onChangePhoto: (tripId, dest) => tripCardUtils.changePhoto(tripId, dest),
      onShare: (tripId, role) => shareModal.show(tripId, role),
      onRename: (tripId, name) => tripCardUtils.showRenameModal(tripId, name, onSuccess),
      onDelete: (tripId, name) => tripCardUtils.showDeleteModal(tripId, name, onSuccess)
    });
  }

  return { init, invalidateCache };
})();

// Make available globally (required for Vite bundling)
window.homePage = homePage;
