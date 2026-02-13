/**
 * Trip Activities - Day-by-day timeline tab rendering (list + card views)
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const VIEW_MODE_KEY = 'activitiesViewMode';

  function getViewMode() {
    try { return sessionStorage.getItem(VIEW_MODE_KEY) || 'list'; } catch(e) { return 'list'; }
  }

  function setViewMode(mode) {
    try { sessionStorage.setItem(VIEW_MODE_KEY, mode); } catch(e) {}
  }

  // ===========================
  // Shared: build & group events
  // ===========================

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

    // Group by date
    const grouped = {};
    for (const event of events) {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }

    // Generate all trip days
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

    // Sort events within each day
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
  // View Switcher
  // ===========================

  // SVG icons for view switcher (not in the Material Symbols font subset)
  const iconList = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z"/></svg>`;
  const iconCards = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>`;
  const iconCalendar = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`;

  function renderViewSwitcher(activeMode) {
    return `
      <div class="activity-view-switcher">
        <button class="activity-view-btn ${activeMode === 'list' ? 'active' : ''}"
                data-view-mode="list" title="${i18n.t('trip.viewList') || 'List view'}">
          ${iconList}
        </button>
        <button class="activity-view-btn ${activeMode === 'cards' ? 'active' : ''}"
                data-view-mode="cards" title="${i18n.t('trip.viewCards') || 'Card view'}">
          ${iconCards}
        </button>
        <button class="activity-view-btn" disabled
                data-view-mode="calendar" title="${i18n.t('trip.viewCalendarSoon') || 'Calendar view (coming soon)'}">
          ${iconCalendar}
        </button>
      </div>
    `;
  }

  // ===========================
  // List View (existing)
  // ===========================

  function renderListView(container, dayData) {
    const { allDates, grouped, lang } = dayData;

    const flightIcon = `<span class="material-symbols-outlined activity-icon-flight">travel</span>`;
    const hotelIcon = `<span class="material-symbols-outlined activity-icon-hotel">bed</span>`;
    const customActivityIcon = `<span class="material-symbols-outlined activity-icon-custom">event</span>`;

    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const itemsHtml = dayEvents.map(event => {
        let icon = '';
        let text = '';
        let tab = '';
        let itemId = '';
        let isCustom = false;

        if (event.type === 'flight') {
          const dep = event.data.departure?.city || event.data.departure?.code || '';
          const dest = event.data.arrival?.city || event.data.arrival?.code || '';
          text = `${i18n.t('trip.flightFromTo') || 'Flight from'} ${esc(dep)} → ${esc(dest)}`;
          icon = flightIcon;
          tab = 'flights';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkin') {
          text = `Check-in ${esc(event.data.name || 'Hotel')}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-stay') {
          text = `${i18n.t('hotel.stay') || 'Stay'} ${esc(event.data.name || 'Hotel')}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkout') {
          text = `Check-out ${esc(event.data.name || 'Hotel')}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'activity') {
          text = esc(event.data.name);
          icon = customActivityIcon;
          isCustom = true;
          itemId = event.data.id;
        }

        let timeStr = '';
        if (event.time) {
          if (event.type === 'activity' && event.data.endTime) {
            timeStr = `<span class="activity-item-time">${esc(event.time)} – ${esc(event.data.endTime)}</span>`;
          } else {
            timeStr = `<span class="activity-item-time">${esc(event.time)}</span>`;
          }
        }

        const eyeIcon = `<svg class="activity-detail-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

        if (isCustom) {
          return `
            <a class="activity-item activity-item--clickable activity-item-link--custom" href="#" data-activity-id="${itemId}">
              <div class="activity-item-icon">${icon}</div>
              <div class="activity-item-content">
                ${timeStr}
                <span class="activity-item-text">${text}</span>
              </div>
              <span class="activity-item-detail">${eyeIcon}</span>
            </a>
          `;
        }

        return `
          <a class="activity-item activity-item--clickable activity-item-link" href="#" data-tab="${tab}" data-item-id="${itemId}">
            <div class="activity-item-icon">${icon}</div>
            <div class="activity-item-content">
              ${timeStr}
              <span class="activity-item-text">${text}</span>
            </div>
            <span class="activity-item-detail">${eyeIcon}</span>
          </a>
        `;
      }).join('');

      const newActivityBtn = `
        <button class="activity-new-btn" data-date="${date}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span data-i18n="trip.newActivity">${i18n.t('trip.newActivity') || 'New activity'}</span>
        </button>
      `;

      return `
        <div class="activity-day">
          <div class="activity-day-header">
            <div class="activity-day-number">${dayNumber}</div>
            <div class="activity-day-meta">${monthShort}, ${weekdayShort}</div>
          </div>
          <div class="activity-list">
            ${itemsHtml}
            ${newActivityBtn}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply(container);
  }

  // ===========================
  // Card View
  // ===========================

  function renderFlightCard(event) {
    const flight = event.data;
    const depCity = flight.departure?.city || flight.departure?.code || '';
    const depAirport = flight.departure?.airport || '';
    const depTerminal = flight.departure?.terminal || '';
    const arrCity = flight.arrival?.city || flight.arrival?.code || '';
    const arrTime = flight.arrivalTime || '';
    const depTime = flight.departureTime || '';
    const flightNum = flight.flightNumber || '';

    return `
      <a class="activity-card activity-card--flight activity-item-link"
         href="#" data-tab="flights" data-item-id="${flight.id}">
        <div class="activity-card-header activity-card-header--flight">
          <div class="activity-card-header-left">
            <span class="material-symbols-outlined activity-card-icon">travel</span>
            <span class="activity-card-time">${esc(depTime)}</span>
          </div>
          ${flightNum ? `<span class="activity-card-badge">${esc(flightNum)}</span>` : ''}
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title">${esc(depCity)}</span>
          ${depAirport ? `<span class="activity-card-subtitle">${esc(depAirport)}</span>` : ''}
          ${depTerminal ? `<span class="activity-card-detail">Terminal ${esc(depTerminal)}</span>` : ''}
        </div>
        <div class="activity-card-footer">
          <span class="material-icons-outlined activity-card-footer-icon">flight_land</span>
          <span class="activity-card-footer-text">${esc(arrCity)}</span>
          ${arrTime ? `<span class="activity-card-footer-meta">${esc(arrTime)}</span>` : ''}
        </div>
      </a>
    `;
  }

  function renderHotelCard(event) {
    const hotel = event.data;
    const hotelName = hotel.name || 'Hotel';
    const city = hotel.address?.city || '';
    const address = hotel.address?.fullAddress || city;

    let statusIcon, statusText;
    if (event.type === 'hotel-checkin') {
      statusIcon = 'login';
      statusText = i18n.t('hotel.checkIn') || 'Check-in';
    } else if (event.type === 'hotel-checkout') {
      statusIcon = 'logout';
      statusText = i18n.t('hotel.checkOut') || 'Check-out';
    } else {
      statusIcon = 'bed';
      statusText = i18n.t('hotel.stay') || 'Stay';
    }

    const timeStr = event.time || '';

    return `
      <a class="activity-card activity-card--hotel activity-item-link"
         href="#" data-tab="hotels" data-item-id="${hotel.id}">
        <div class="activity-card-header activity-card-header--hotel">
          <div class="activity-card-header-left">
            <span class="${statusIcon === 'bed' ? 'material-symbols-outlined' : 'material-icons-outlined'} activity-card-icon">${statusIcon}</span>
            <span class="activity-card-time">${esc(timeStr || statusText)}</span>
          </div>
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title">${esc(hotelName)}</span>
          ${city ? `<span class="activity-card-subtitle">${esc(city)}</span>` : ''}
        </div>
        <div class="activity-card-footer">
          ${address ? `
            <span class="material-icons-outlined activity-card-footer-icon">location_on</span>
            <span class="activity-card-footer-text">${esc(address)}</span>
          ` : ''}
        </div>
      </a>
    `;
  }

  function renderCustomActivityCard(event) {
    const activity = event.data;
    const name = activity.name || '';
    const description = activity.description || '';
    const truncatedDesc = description.length > 60 ? description.substring(0, 60) + '…' : description;

    let timeRange = '';
    if (event.time) {
      timeRange = event.time;
      if (activity.endTime) timeRange += ' – ' + activity.endTime;
    }

    return `
      <a class="activity-card activity-card--custom activity-item-link--custom"
         href="#" data-activity-id="${activity.id}">
        <div class="activity-card-header activity-card-header--custom">
          <div class="activity-card-header-left">
            <span class="material-symbols-outlined activity-card-icon">event</span>
            <span class="activity-card-time">${esc(timeRange)}</span>
          </div>
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title">${esc(name)}</span>
          ${truncatedDesc ? `<span class="activity-card-subtitle">${esc(truncatedDesc)}</span>` : ''}
        </div>
        <div class="activity-card-footer"></div>
      </a>
    `;
  }

  function renderEventCard(event) {
    if (event.type === 'flight') return renderFlightCard(event);
    if (event.type.startsWith('hotel-')) return renderHotelCard(event);
    if (event.type === 'activity') return renderCustomActivityCard(event);
    return '';
  }

  function renderCardView(container, dayData) {
    const { allDates, grouped, lang } = dayData;

    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const cardsHtml = dayEvents.map(event => renderEventCard(event)).join('');

      const addCardBtn = `
        <button class="activity-card activity-card--add activity-new-btn" data-date="${date}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      `;

      return `
        <div class="activity-day activity-day--cards">
          <div class="activity-day-header">
            <div class="activity-day-number">${dayNumber}</div>
            <div class="activity-day-meta">${monthShort}, ${weekdayShort}</div>
          </div>
          <div class="activity-card-row">
            ${cardsHtml}
            ${addCardBtn}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply(container);
  }

  // ===========================
  // Main orchestrator
  // ===========================

  function renderActivities(container, tripData) {
    const flights = tripData.flights || [];
    const hotels = tripData.hotels || [];
    const customActivities = tripData.activities || [];

    if (flights.length === 0 && hotels.length === 0 && customActivities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noActivities">No activities</h3>
          <p class="empty-state-text" data-i18n="trip.noActivitiesText">Add a booking to see your activities here</p>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    const dayData = buildDayEvents(tripData);
    const viewMode = getViewMode();

    // Render view switcher + content area
    container.innerHTML = renderViewSwitcher(viewMode);
    const contentDiv = document.createElement('div');
    contentDiv.id = 'activities-view-content';
    container.appendChild(contentDiv);

    if (viewMode === 'cards') {
      renderCardView(contentDiv, dayData);
    } else {
      renderListView(contentDiv, dayData);
    }

    // View switcher interaction
    container.querySelector('.activity-view-switcher').addEventListener('click', (e) => {
      const btn = e.target.closest('.activity-view-btn:not([disabled])');
      if (!btn || btn.classList.contains('active')) return;

      const mode = btn.dataset.viewMode;
      setViewMode(mode);

      container.querySelectorAll('.activity-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const content = document.getElementById('activities-view-content');
      if (mode === 'cards') {
        renderCardView(content, dayData);
      } else {
        renderListView(content, dayData);
      }
    });
  }

  window.tripActivities = {
    render: renderActivities
  };
})();
