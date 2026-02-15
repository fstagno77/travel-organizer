/**
 * Trip Activities - Day-by-day timeline tab rendering (list + card views)
 * Uses SVG icons from activityCategories, supports filtering by category.
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const VIEW_MODE_KEY = 'activitiesViewMode';
  const cats = () => window.activityCategories;
  const airportName = (code) => window.AirportAutocomplete?.getAirportName(code) || '';

  function getViewMode() {
    try { return sessionStorage.getItem(VIEW_MODE_KEY) || 'list'; } catch(e) { return 'list'; }
  }

  function setViewMode(mode) {
    try { sessionStorage.setItem(VIEW_MODE_KEY, mode); } catch(e) {}
  }

  // Filter state
  let activeFilters = new Set(window.activityCategories.CATEGORY_ORDER);
  let searchQuery = '';
  let _dropdownCleanup = null;

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
    // custom activity
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

  // ===========================
  // Header + Filter Panel
  // ===========================

  const iconList = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z"/></svg>`;
  const iconCards = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>`;
  const iconCalendar = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`;

  function renderFilterPanel() {
    const c = cats();
    const pills = c.CATEGORY_ORDER.map(key => {
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

  function renderActivityHeader(activeMode) {
    const icons = cats().ICONS;
    return `
      <div class="activity-header">
        <div class="activity-header-title">Le mie attivit\u00e0</div>
        <div class="activity-header-actions">
          <div class="activity-btn-container" id="activity-search-container">
            <button class="activity-header-btn" id="activity-search-btn" title="Cerca">
              ${icons.search}
            </button>
            <div class="activity-dropdown" id="activity-search-dropdown" hidden>
              <div class="activity-dropdown-arrow"></div>
              <div class="activity-search-wrapper">
                <input type="text" class="activity-search-input" placeholder="Cerca attivit\u00e0..." id="activity-search-input">
                <button class="activity-search-clear" id="activity-search-clear" hidden>&times;</button>
              </div>
            </div>
          </div>
          <div class="activity-btn-container" id="activity-filter-container">
            <button class="activity-header-btn" id="activity-filter-btn" title="Filtra">
              ${icons.filter}
            </button>
            <div class="activity-dropdown activity-dropdown--filter" id="activity-filter-dropdown" hidden>
              <div class="activity-dropdown-arrow"></div>
              ${renderFilterPanel()}
            </div>
          </div>
          <div class="activity-view-switcher">
            <button class="activity-view-btn ${activeMode === 'list' ? 'active' : ''}"
                    data-view-mode="list" title="${i18n.t('trip.viewList') || 'List view'}">
              ${iconList}
            </button>
            <button class="activity-view-btn ${activeMode === 'calendar' ? 'active' : ''}"
                    data-view-mode="calendar" title="${i18n.t('trip.viewCalendar') || 'Calendar view'}">
              ${iconCalendar}
            </button>
            <button class="activity-view-btn ${activeMode === 'cards' ? 'active' : ''}"
                    data-view-mode="cards" title="${i18n.t('trip.viewCards') || 'Card view'}">
              ${iconCards}
            </button>
          </div>
          <button class="activity-header-add-btn" id="activity-header-add-btn">
            ${icons.plusCircle}
            <span class="activity-header-add-label">Aggiungi Attivit\u00e0</span>
            <span class="activity-header-add-label-short">Attivit\u00e0</span>
          </button>
        </div>
      </div>
    `;
  }

  // ===========================
  // List View
  // ===========================

  function renderListView(container, dayData) {
    const { allDates, grouped, lang } = dayData;
    const icons = cats().ICONS;

    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const itemsHtml = dayEvents.map(event => {
        const category = cats().getCategoryForEvent(event);
        const catKey = cats().eventToCategoryKey(event);
        let text = '';
        let tab = '';
        let itemId = '';
        let isCustom = false;

        if (event.type === 'flight') {
          const dep = event.data.departure?.city || event.data.departure?.code || '';
          const dest = event.data.arrival?.city || event.data.arrival?.code || '';
          text = `Volo da <strong>${esc(dep)}</strong> \u2192 <strong>${esc(dest)}</strong>`;
          tab = 'flights';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkin') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - Check-in`;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-stay') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - ${i18n.t('hotel.stay') || 'Soggiorno'}`;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkout') {
          text = `<strong>${esc(event.data.name || 'Hotel')}</strong> - Check-out`;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'activity') {
          const desc = event.data.description ? ' - ' + esc(event.data.description) : '';
          text = `<strong>${esc(event.data.name)}</strong>${desc}`;
          isCustom = true;
          itemId = event.data.id;
        }

        let timeLabel = event.time || '';
        if (timeLabel && event.type === 'activity' && event.data.endTime) {
          timeLabel += ' \u2013 ' + event.data.endTime;
        }
        const timeStr = timeLabel
          ? `<span class="activity-item-time">${esc(timeLabel)}</span>`
          : '';

        const linkClass = isCustom ? 'activity-item-link--custom' : 'activity-item-link';
        const dataAttrs = isCustom
          ? `data-activity-id="${itemId}"`
          : `data-tab="${tab}" data-item-id="${itemId}"`;

        return `
          <a class="activity-item activity-item--clickable ${linkClass}" href="#" ${dataAttrs}
             style="--cat-color: ${category.color}; --cat-hover: ${category.hoverBg}" data-cat="${catKey}">
            <span class="activity-item-icon" style="color: ${category.color}">${category.svg}</span>
            ${timeStr}
            <span class="activity-item-text">${text}</span>
            <span class="activity-item-arrow">${icons.externalLink}</span>
          </a>
        `;
      }).join('');

      const newActivityBtn = `
        <button class="activity-new-btn activity-new-btn--dashed" data-date="${date}">
          ${icons.plusCircle}
          <span>Aggiungi attivit\u00e0</span>
        </button>
      `;

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
            ${newActivityBtn}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // ===========================
  // Card View
  // ===========================

  const clockIcon = `<svg class="activity-card-clock" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  function renderFlightCard(event) {
    const flight = event.data;
    const category = cats().CATEGORIES.volo;
    const depCity = flight.departure?.city || flight.departure?.code || '';
    const depCode = flight.departure?.code || '';
    const arrCity = flight.arrival?.city || flight.arrival?.code || '';
    const arrCode = flight.arrival?.code || '';
    const depTime = flight.departureTime || '';
    const flightNum = flight.flightNumber || '';
    const depAirportName = depCode ? airportName(depCode) : '';
    const duration = flight.duration ? utils.formatDuration(flight.duration, i18n.getLang()) : '';

    return `
      <a class="activity-card activity-item-link"
         href="#" data-tab="flights" data-item-id="${flight.id}" data-category="volo">
        <div class="activity-card-header">
          <div class="activity-card-icon-container" style="background: ${category.gradient}">
            ${category.svg}
          </div>
          ${flightNum ? `<span class="activity-card-flight-badge">${esc(flightNum)}</span>` : ''}
          ${depTime ? `<span class="activity-card-time-badge" style="background: ${category.gradient}">${clockIcon}${esc(depTime)}</span>` : ''}
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title">${esc(depCity)}</span>
          ${depAirportName ? `<span class="activity-card-subtitle">${esc(depAirportName)}</span>` : (depCode ? `<span class="activity-card-subtitle">${esc(depCode)}</span>` : '')}
        </div>
        <div class="activity-card-route">
          <span class="activity-card-route-city">${esc(depCode || depCity)}</span>
          <span class="activity-card-route-line">${duration ? `<span class="activity-card-route-duration">${esc(duration)}</span>` : ''}</span>
          <span class="activity-card-route-city">${esc(arrCode || arrCity)}</span>
        </div>
      </a>
    `;
  }

  function renderHotelCard(event) {
    const hotel = event.data;
    const category = cats().CATEGORIES.hotel;
    const hotelName = hotel.name || 'Hotel';
    const city = hotel.address?.city || '';

    let statusText;
    if (event.type === 'hotel-checkin') {
      statusText = i18n.t('hotel.checkIn') || 'Check-in';
    } else if (event.type === 'hotel-checkout') {
      statusText = i18n.t('hotel.checkOut') || 'Check-out';
    } else {
      statusText = i18n.t('hotel.stay') || 'Soggiorno';
    }

    const timeStr = event.time || '';
    const badgeText = timeStr || statusText;

    return `
      <a class="activity-card activity-item-link"
         href="#" data-tab="hotels" data-item-id="${hotel.id}" data-category="hotel">
        <div class="activity-card-header">
          <div class="activity-card-icon-container" style="background: ${category.gradient}">
            ${category.svg}
          </div>
          <span class="activity-card-time-badge" style="background: ${category.gradient}">${clockIcon}${esc(badgeText)}</span>
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title">${esc(hotelName)}</span>
          <span class="activity-card-subtitle">${esc(statusText)}</span>
          ${city ? `<span class="activity-card-location"><span class="material-symbols-outlined activity-card-location-icon">location_on</span><span>${esc(city)}</span></span>` : ''}
        </div>
      </a>
    `;
  }

  function renderCustomActivityCard(event) {
    const activity = event.data;
    const category = cats().getCategoryForEvent(event);
    const catKey = cats().eventToCategoryKey(event);
    const name = activity.name || '';
    const description = activity.description || '';
    const truncatedDesc = description.length > 60 ? description.substring(0, 60) + '\u2026' : description;
    const address = activity.location?.address || activity.address || '';

    let timeRange = '';
    if (event.time) {
      timeRange = event.time;
      if (activity.endTime) timeRange += ' \u2013 ' + activity.endTime;
    }

    const timeBadge = timeRange
      ? `<span class="activity-card-time-badge" style="background: ${category.gradient}">${clockIcon}${esc(timeRange)}</span>`
      : '';

    return `
      <a class="activity-card activity-item-link--custom"
         href="#" data-activity-id="${activity.id}" data-category="${catKey}">
        <div class="activity-card-header">
          <div class="activity-card-icon-container" style="background: ${category.gradient}">
            ${category.svg}
          </div>
          ${timeBadge}
        </div>
        <div class="activity-card-body">
          <span class="activity-card-title${description ? '' : ' activity-card-title--expand'}">${esc(name)}</span>
          ${description ? `<span class="activity-card-subtitle">${esc(truncatedDesc)}</span>` : ''}
          ${address ? `<span class="activity-card-location"><span class="material-symbols-outlined activity-card-location-icon">location_on</span><span>${esc(address)}</span></span>` : ''}
        </div>
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
    const icons = cats().ICONS;

    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const cardsHtml = dayEvents.map(event => renderEventCard(event)).join('');

      const addCardBtn = `
        <button class="activity-card activity-card--add activity-new-btn" data-date="${date}">
          ${icons.plusCircle}
          <span class="activity-card-add-label">Aggiungi attivit\u00e0</span>
        </button>
      `;

      return `
        <div class="activity-day activity-day--cards">
          <div class="activity-day-sidebar">
            <div class="activity-day-header">
              <div class="activity-day-number">${dayNumber}</div>
              <div class="activity-day-meta">${weekdayShort}, ${monthShort}</div>
            </div>
          </div>
          <div class="activity-card-row">
            ${cardsHtml}
            ${addCardBtn}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // ===========================
  // Calendar View (monthly grid)
  // ===========================

  let _calendarMonth = null; // { year, month } - tracks displayed month

  const CATEGORY_INDICATOR_MAP = {
    ristorante: 'activity-indicator-restaurant',
    volo: 'activity-indicator-flight',
    hotel: 'activity-indicator-hotel',
    museo: 'activity-indicator-museum',
    attrazione: 'activity-indicator-attraction',
    treno: 'activity-indicator-train',
    luogo: 'activity-indicator-place'
  };

  function getCalendarActivityLabel(event) {
    const time = event.time ? event.time : '';
    let label = '';
    if (event.type === 'flight') {
      const dep = event.data.departure?.city || event.data.departure?.code || '';
      const arr = event.data.arrival?.city || event.data.arrival?.code || '';
      label = `Volo per ${arr || dep}`;
    } else if (event.type === 'hotel-checkin') {
      label = event.data.name || 'Hotel';
    } else if (event.type === 'hotel-checkout') {
      label = event.data.name || 'Hotel';
    } else if (event.type === 'hotel-stay') {
      label = event.data.name || 'Hotel';
    } else if (event.type === 'activity') {
      label = event.data.name || '';
    }
    const prefix = time ? time + ' \u00b7 ' : '';
    return prefix + label;
  }

  function renderCalendarActivityItem(event) {
    const catKey = cats().eventToCategoryKey(event);
    const indicatorClass = CATEGORY_INDICATOR_MAP[catKey] || CATEGORY_INDICATOR_MAP.luogo;
    const text = getCalendarActivityLabel(event);

    const isCustom = event.type === 'activity';
    const linkClass = isCustom ? 'activity-item-link--custom' : 'activity-item-link';
    const dataAttrs = isCustom
      ? `data-activity-id="${event.data.id}"`
      : `data-tab="${event.type === 'flight' ? 'flights' : 'hotels'}" data-item-id="${event.data.id}"`;

    return `
      <a class="calendar-activity-item ${linkClass}" href="#" ${dataAttrs}>
        <span class="activity-indicator ${indicatorClass}"></span>
        <span class="calendar-activity-text">${esc(text)}</span>
      </a>
    `;
  }

  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function renderCalendarView(container, dayData, tripData) {
    const lang = dayData.lang;
    const grouped = dayData.grouped;

    // Determine trip date range
    const tripStart = tripData.startDate || dayData.allDates[0];
    const tripEnd = tripData.endDate || dayData.allDates[dayData.allDates.length - 1];

    // Determine which month to show
    if (!_calendarMonth) {
      const startD = new Date(tripStart + 'T00:00:00');
      _calendarMonth = { year: startD.getFullYear(), month: startD.getMonth() };
    }

    const { year, month } = _calendarMonth;
    const monthNames = lang === 'en'
      ? ['January','February','March','April','May','June','July','August','September','October','November','December']
      : ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const dayNames = lang === 'en'
      ? ['MON','TUE','WED','THU','FRI','SAT','SUN']
      : ['LUN','MAR','MER','GIO','VEN','SAB','DOM'];

    // Build month grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday=0 based day of week for first day
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    // Build weeks
    const weeks = [];
    let currentWeek = [];

    // Empty cells before month start
    for (let i = 0; i < startDow; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Empty cells after month end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    // Render week headers
    const headersHtml = dayNames.map(d => `<div class="week-day-header">${d}</div>`).join('');

    // Render weeks
    const weeksHtml = weeks.map(week => {
      const cellsHtml = week.map(day => {
        if (day === null) {
          return '<div class="calendar-cell-empty"></div>';
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isTrip = dateStr >= tripStart && dateStr <= tripEnd;
        const cellClass = isTrip ? 'calendar-cell calendar-cell-trip' : 'calendar-cell calendar-cell-default';
        const numClass = isTrip ? 'calendar-day-number calendar-day-number-trip' : 'calendar-day-number';

        const dayEvents = grouped[dateStr] || [];
        const activitiesHtml = dayEvents.map(ev => renderCalendarActivityItem(ev)).join('');

        const addBtn = `
          <button class="calendar-cell-add activity-new-btn" data-date="${dateStr}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        `;

        return `
          <div class="${cellClass}">
            <div class="calendar-cell-content">
              <div class="calendar-cell-top">
                <div class="${numClass}">${day}</div>
                ${addBtn}
              </div>
              ${activitiesHtml ? `<div class="calendar-activities">${activitiesHtml}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `<div class="calendar-week">${cellsHtml}</div>`;
    }).join('');

    const chevronLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const chevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <div class="calendar-title">${monthNames[month]} ${year}</div>
          <div class="calendar-nav-buttons">
            <button class="calendar-nav-button" id="calendar-prev">${chevronLeft}</button>
            <button class="calendar-nav-button" id="calendar-next">${chevronRight}</button>
          </div>
        </div>
        <div class="week-headers">${headersHtml}</div>
        <div class="calendar-grid">${weeksHtml}</div>
      </div>
    `;
  }

  // ===========================
  // Re-render with current filters
  // ===========================

  function rerenderContent(container, dayData, tripData) {
    const contentDiv = document.getElementById('activities-view-content');
    if (!contentDiv) return;
    const filteredData = getFilteredDayData(dayData);
    const mode = getViewMode();
    if (mode === 'calendar') {
      renderCalendarView(contentDiv, filteredData, tripData);
    } else if (mode === 'cards') {
      renderCardView(contentDiv, filteredData);
    } else {
      renderListView(contentDiv, filteredData);
    }
  }

  // ===========================
  // Header interactions
  // ===========================

  function initHeaderInteractions(container, dayData, tripData) {
    const switcher = container.querySelector('.activity-view-switcher');
    if (switcher) {
      switcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.activity-view-btn:not([disabled])');
        if (!btn || btn.classList.contains('active')) return;
        const mode = btn.dataset.viewMode;
        setViewMode(mode);
        if (mode === 'calendar') _calendarMonth = null; // reset to trip start
        container.querySelectorAll('.activity-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rerenderContent(container, dayData, tripData);
        setupCalendarNav(container, dayData, tripData);
      });
    }

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
      // Apply initial gradient styles to active pills
      filterDropdown.querySelectorAll('.activity-filter-pill.active').forEach(p => {
        p.style.background = p.dataset.gradient;
      });

      // Hover: swap gradient on active pills
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
          rerenderContent(container, dayData, tripData);
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
            activeFilters = new Set(cats().CATEGORY_ORDER);
            deselectBtn.textContent = 'Deseleziona tutti';
          } else {
            activeFilters.clear();
            deselectBtn.textContent = 'Seleziona tutti';
          }
          rerenderContent(container, dayData, tripData);
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

      // Search input filtering
      const searchInput = document.getElementById('activity-search-input');
      const searchClear = document.getElementById('activity-search-clear');
      if (searchInput && searchClear) {
        searchInput.addEventListener('input', () => {
          searchClear.hidden = !searchInput.value;
          searchQuery = searchInput.value.trim();
          rerenderContent(container, dayData, tripData);
        });
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchClear.hidden = true;
          searchQuery = '';
          rerenderContent(container, dayData, tripData);
          searchInput.focus();
        });
      }
    }

    // Close dropdowns on outside click (clean up previous listener first)
    if (_dropdownCleanup) _dropdownCleanup();
    document.addEventListener('click', closeAllDropdowns);
    _dropdownCleanup = () => document.removeEventListener('click', closeAllDropdowns);

    const headerAddBtn = document.getElementById('activity-header-add-btn');
    if (headerAddBtn) {
      headerAddBtn.addEventListener('click', async () => {
        const sp = await window.tripPage.loadSlidePanel();
        sp.show('create', null, null);
      });
    }

    setupCalendarNav(container, dayData, tripData);
  }

  function setupCalendarNav(container, dayData, tripData) {
    const prevBtn = document.getElementById('calendar-prev');
    const nextBtn = document.getElementById('calendar-next');
    if (!prevBtn || !nextBtn) return;

    prevBtn.onclick = () => {
      _calendarMonth.month--;
      if (_calendarMonth.month < 0) { _calendarMonth.month = 11; _calendarMonth.year--; }
      rerenderContent(container, dayData, tripData);
      setupCalendarNav(container, dayData, tripData);
    };
    nextBtn.onclick = () => {
      _calendarMonth.month++;
      if (_calendarMonth.month > 11) { _calendarMonth.month = 0; _calendarMonth.year++; }
      rerenderContent(container, dayData, tripData);
      setupCalendarNav(container, dayData, tripData);
    };
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
    activeFilters = new Set(cats().CATEGORY_ORDER);
    searchQuery = '';

    container.innerHTML = renderActivityHeader(viewMode);
    const contentDiv = document.createElement('div');
    contentDiv.id = 'activities-view-content';
    container.appendChild(contentDiv);

    if (viewMode === 'calendar') {
      _calendarMonth = null;
      renderCalendarView(contentDiv, dayData, tripData);
    } else if (viewMode === 'cards') {
      renderCardView(contentDiv, dayData);
    } else {
      renderListView(contentDiv, dayData);
    }

    initHeaderInteractions(container, dayData, tripData);

    // Lazy-load airport names for flight cards (fire-and-forget)
    if (flights.length > 0 && window.AirportAutocomplete) {
      window.AirportAutocomplete.loadAirports().then(() => {
        if (getViewMode() === 'cards') rerenderContent(container, dayData, tripData);
      });
    }
  }

  window.tripActivities = {
    render: renderActivities
  };
})();
