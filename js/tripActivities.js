/**
 * Trip Activities - Day-by-day timeline tab rendering
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);

  /**
   * Render activities timeline (day-by-day view)
   * @param {HTMLElement} container
   * @param {Object} tripData
   */
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

    const lang = i18n.getLang();
    const oneDay = 24 * 60 * 60 * 1000;
    // Format date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
    const toLocalDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Build events list
    const events = [];

    // Add flight events
    for (const flight of flights) {
      events.push({
        date: flight.date,
        time: flight.departureTime || null,
        type: 'flight',
        data: flight
      });
    }

    // Add hotel events (check-in, stay, check-out are mutually exclusive per day)
    for (const hotel of hotels) {
      const checkInDate = hotel.checkIn?.date;
      const checkOutDate = hotel.checkOut?.date;

      if (checkInDate) {
        events.push({
          date: checkInDate,
          time: hotel.checkIn?.time || null,
          type: 'hotel-checkin',
          data: hotel
        });
      }

      // Stay days: only intermediate days (excludes check-in and check-out)
      if (checkInDate && checkOutDate) {
        const start = new Date(checkInDate + 'T00:00:00');
        const end = new Date(checkOutDate + 'T00:00:00');
        let current = new Date(start.getTime() + oneDay);
        while (current < end) {
          const dateStr = toLocalDateStr(current);
          events.push({
            date: dateStr,
            time: null,
            type: 'hotel-stay',
            data: hotel
          });
          current = new Date(current.getTime() + oneDay);
        }
      }

      if (checkOutDate) {
        events.push({
          date: checkOutDate,
          time: hotel.checkOut?.time || null,
          type: 'hotel-checkout',
          data: hotel
        });
      }
    }

    // Add custom activity events
    for (const activity of customActivities) {
      events.push({
        date: activity.date,
        time: activity.startTime || null,
        type: 'activity',
        data: activity
      });
    }

    // Group by date
    const grouped = {};
    for (const event of events) {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }

    // Generate all trip days from startDate to endDate
    const allDates = [];
    if (tripData.startDate && tripData.endDate) {
      let current = new Date(tripData.startDate + 'T00:00:00');
      const end = new Date(tripData.endDate + 'T00:00:00');
      while (current <= end) {
        allDates.push(toLocalDateStr(current));
        current = new Date(current.getTime() + oneDay);
      }
    }
    // Also include any event dates that fall outside start/end range
    for (const date of Object.keys(grouped)) {
      if (!allDates.includes(date)) allDates.push(date);
    }
    allDates.sort();

    // Sort events within each day: no-time first, then by time, then by type
    const typePriority = { 'hotel-checkout': 0, 'flight': 1, 'hotel-checkin': 2, 'hotel-stay': 3, 'activity': 4 };
    for (const date of allDates) {
      if (grouped[date]) {
        grouped[date].sort((a, b) => {
          const aHasTime = a.time !== null;
          const bHasTime = b.time !== null;
          // Activities without time go first
          if (aHasTime !== bHasTime) return aHasTime ? 1 : -1;
          // Both have time: sort by time
          if (aHasTime && bHasTime && a.time !== b.time) return a.time.localeCompare(b.time);
          // Same time or both no time: sort by type priority
          return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
        });
      }
    }

    const flightIcon = `<span class="material-symbols-outlined activity-icon-flight">travel</span>`;
    const hotelIcon = `<span class="material-symbols-outlined activity-icon-hotel">bed</span>`;
    const customActivityIcon = `<span class="material-symbols-outlined activity-icon-custom">event</span>`;

    // Render
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

  window.tripActivities = {
    render: renderActivities
  };
})();
