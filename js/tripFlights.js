/**
 * Trip Flights - Flights tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

  /** Convert "REGGIO DI CALABRIA" → "Reggio di Calabria" */
  const IT_LOWERCASE = new Set(['di','del','della','delle','dei','degli','dello','da','nel','nella','nelle','nei','negli','nello','al','alla','alle','agli','allo','sul','sulla','sulle','sui','sugli','in','a','e','le','la','il','lo','i','gli']);
  function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\S+/g, (word, offset) =>
      offset > 0 && IT_LOWERCASE.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    );
  }

  /**
   * Check if a flight is in the past (based on arrival time)
   * @param {Object} flight
   * @returns {boolean}
   */
  function isFlightPast(flight) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const flightDate = flight.date;

    // Calculate arrival date (might be next day if arrivalNextDay)
    let arrivalDate = flightDate;
    if (flight.arrivalNextDay) {
      const d = new Date(flightDate);
      d.setDate(d.getDate() + 1);
      arrivalDate = d.toISOString().split('T')[0];
    }

    // If arrival date is before today, it's definitely past
    if (arrivalDate < today) {
      return true;
    }

    // If arrival date is today, check the arrival time
    if (arrivalDate === today) {
      const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);
      const arrivalMinutes = arrH * 60 + arrM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // If arrival time has passed, flight is past
      return currentMinutes > arrivalMinutes;
    }

    // If arrival date is in the future, not past
    return false;
  }

  /**
   * Render flights
   * @param {HTMLElement} container
   * @param {Array} flights
   */
  function renderFlights(container, flights) {
    if (!container) return;
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">No flights</h3>
          <p class="empty-state-text" data-i18n="trip.noFlightsText">No flight information available</p>
          <button class="btn btn-primary empty-state-cta" id="empty-add-flight">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span data-i18n="trip.addBooking">Add booking</span>
          </button>
        </div>
      `;
      i18n.apply(container);
      const addBtn = container.querySelector('#empty-add-flight');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const tripId = new URLSearchParams(window.location.search).get('id');
          if (tripId) window.tripPage.showAddBookingModal(tripId);
        });
      }
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
      const duration = flight.duration ? utils.formatDuration(flight.duration, lang) : '';
      const isPast = isFlightPast(flight);

      const depCity = toTitleCase(flight.departure?.city || '');
      const arrCity = toTitleCase(flight.arrival?.city || '');
      const depCode = flight.departure?.code || '';
      const arrCode = flight.arrival?.code || '';
      const depAirportRaw = flight.departure?.airport || window.AirportAutocomplete?.getAirportName(depCode) || '';
      const depAirport = toTitleCase(depAirportRaw);
      const depMapsUrl = depAirportRaw
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(depAirportRaw)}`
        : '#';

      return `
        <div class="flight-card${isPast ? ' past' : ''}" data-id="${flight.id}">
          <div class="flight-card-header">
            <span class="flight-date">${esc(formattedDate)}</span>
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="flight-number-link">
              ${esc(flight.flightNumber)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div class="flight-card-body">
            <div class="flight-title-section">
              <h3 class="flight-title">Da ${esc(depCity)} a ${esc(arrCity)}</h3>
            </div>

            ${depAirport ? `
            <div class="flight-departure-location">
              <a href="${depMapsUrl}" target="_blank" rel="noopener" class="flight-location-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${esc(depAirport)}</span>
              </a>
            </div>
            ` : ''}

            <div class="flight-route">
              <div class="flight-endpoint">
                <div class="flight-airport-code-lg">${esc(depCode)}</div>
                ${flight.departureTime ? `<div class="flight-time-sm">
                  <span class="material-icons-outlined flight-time-icon-sm">flight_takeoff</span>
                  ${esc(flight.departureTime)}
                </div>` : ''}
                ${flight.departure?.terminal ? `<div class="flight-terminal">Terminal ${esc(flight.departure.terminal)}</div>` : ''}
              </div>

              <div class="flight-arc">
                <div class="flight-arc-line">
                  <img class="flight-arc-img" src="/img/flight-arc.svg" alt="" />
                  <div class="flight-arc-plane">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-primary)">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
                ${duration ? `<div class="flight-duration">${esc(duration)}</div>` : ''}
              </div>

              <div class="flight-endpoint">
                <div class="flight-airport-code-lg">${esc(arrCode)}</div>
                ${flight.arrivalTime ? `<div class="flight-time-sm">
                  ${esc(flight.arrivalTime)}${flight.arrivalNextDay ? ' <span class="flight-next-day">+1</span>' : ''}
                  <span class="material-icons-outlined flight-time-icon-sm">flight_land</span>
                </div>` : ''}
                ${flight.arrival?.terminal ? `<div class="flight-terminal">Terminal ${esc(flight.arrival.terminal)}</div>` : ''}
              </div>
            </div>
          </div>

          <button class="flight-toggle-details" data-flight-index="${index}">
            <span data-i18n="flight.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="flight-details" id="flight-details-${index}" data-flight-index="${index}"></div>
        </div>
      `;
    }).join('');

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei voli</h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-outline" id="flights-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html;
    // Store sorted flights for lazy detail rendering
    window.tripFlights._flights = sortedFlights;
    i18n.apply(container);

    // Connect CTA to manage-booking panel
    const manageBtn = document.getElementById('flights-manage-booking-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showManageBookingPanel(tripId);
      });
    }
  }

  /**
   * Generate flight details HTML (lazy — called on first expand)
   */
  function renderFlightDetails(flight, index) {
    return `
            ${flight.passengers && flight.passengers.length > 1 ? `
            <!-- Multiple passengers view -->
            <div class="flight-passengers-section">
              <div class="flight-section-header">
                <span class="material-icons-outlined flight-section-icon">person_outline</span>
                <span class="flight-detail-label" data-i18n="flight.passengers">Passeggeri</span>
              </div>
              <div class="flight-passengers-list">
                ${flight.passengers.map((p, pIndex) => `
                  <div class="flight-passenger-item" data-passenger-index="${pIndex}">
                    <div class="flight-passenger-header">
                      <div class="flight-passenger-info">
                        <span class="flight-passenger-name">${esc(p.name || '-')}</span>
                        <span class="flight-passenger-type">${esc(p.type || '')}</span>
                      </div>
                      <div class="flight-passenger-actions">
                        ${p.pdfPath ? `
                        <button class="btn-download-pdf-small" data-pdf-path="${p.pdfPath}" title="Download PDF">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span data-i18n="flight.downloadPdf">PDF</span>
                        </button>
                        ` : `
                        <button class="btn-upload-pdf-small" data-flight-id="${flight.id}" data-passenger-index="${pIndex}" data-passenger-name="${esc(p.name)}" title="Carica PDF">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          <span data-i18n="flight.uploadPdf">Carica PDF</span>
                        </button>
                        `}
                        <button class="btn-delete-passenger" data-passenger-name="${esc(p.name)}" data-booking-ref="${esc(flight.bookingReference)}" title="Remove passenger">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                      <div class="passenger-menu-wrapper">
                        <button class="btn-passenger-menu" aria-label="Actions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                            <circle cx="12" cy="19" r="2"></circle>
                          </svg>
                        </button>
                        <div class="passenger-menu-dropdown">
                          ${p.pdfPath ? `
                          <button class="passenger-menu-item" data-action="download-pdf" data-pdf-path="${p.pdfPath}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span data-i18n="flight.downloadPdf">Scarica PDF</span>
                          </button>
                          ` : `
                          <button class="passenger-menu-item" data-action="upload-pdf" data-flight-id="${flight.id}" data-passenger-index="${pIndex}" data-passenger-name="${esc(p.name)}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span data-i18n="flight.uploadPdf">Carica PDF</span>
                          </button>
                          `}
                          <div class="passenger-menu-divider"></div>
                          <button class="passenger-menu-item passenger-menu-item--danger" data-action="delete-passenger" data-passenger-name="${esc(p.name)}" data-booking-ref="${esc(flight.bookingReference)}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span data-i18n="passenger.delete">Rimuovi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="flight-passenger-details">
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.bookingRef">Booking</span>
                        <span class="flight-passenger-detail-value-wrapper">
                          <span class="flight-passenger-detail-value">${esc(flight.bookingReference || '-')}</span>
                          ${flight.bookingReference ? `<button class="btn-copy-value btn-copy-small" data-copy="${esc(flight.bookingReference)}" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>` : ''}
                        </span>
                      </div>
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.class">Class</span>
                        <span class="flight-passenger-detail-value">${esc(flight.class || '-')}</span>
                      </div>
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.ticketNumber">Ticket</span>
                        <span class="flight-passenger-detail-value-wrapper">
                          <span class="flight-passenger-detail-value">${esc(p.ticketNumber || '-')}</span>
                          ${p.ticketNumber ? `<button class="btn-copy-value btn-copy-small" data-copy="${esc(p.ticketNumber)}" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : `
            <!-- Single passenger view -->
            <div class="flight-section-header">
              <span class="material-icons-outlined flight-section-icon">person_outline</span>
              <span class="flight-detail-label" data-i18n="flight.bookingDetails">Dettagli Prenotazione</span>
            </div>
            <div class="flight-details-grid">
              ${(() => {
                // Legge i dati dal passeggero singolo (passengers[0] o passenger singolare) con fallback a livello volo
                const pax = flight.passengers?.[0] || (typeof flight.passenger === 'object' ? flight.passenger : null);
                const passengerName = pax?.name || (typeof flight.passenger === 'string' ? flight.passenger : null);
                const ticketNumber = pax?.ticketNumber || flight.ticketNumber;
                const seat = pax?.seat || flight.seat;
                return `
              ${passengerName ? `
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.passengerName">Passeggero</span>
                <span class="flight-detail-value">${esc(passengerName)}</span>
              </div>` : ''}
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.bookingRef">Booking Reference</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${esc(flight.bookingReference || '-')}</span>
                  ${flight.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(flight.bookingReference)}" title="Copy">
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
                  <span class="flight-detail-value">${esc(ticketNumber || '-')}</span>
                  ${ticketNumber ? `<button class="btn-copy-value" data-copy="${esc(ticketNumber)}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${esc(seat || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${esc(flight.class || '-')}</span>
              </div>`;
              })()}
            </div>
            `}
            ${(() => {
              const singlePdfPath = flight.pdfPath || flight.passengers?.[0]?.pdfPath;
              return `<div class="flight-detail-actions${singlePdfPath ? ' flight-detail-actions--3' : ''}">
              ${singlePdfPath ? `
              <button class="btn-download-pdf flight-detail-pdf-btn" data-pdf-path="${singlePdfPath}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span data-i18n="flight.booking">Prenotazione</span>
              </button>
              ` : ''}
              <button class="btn-edit-item" data-type="flight" data-id="${flight.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span data-i18n="flight.edit">Modifica volo</span>
              </button>
              <button class="btn-delete-item" data-type="flight" data-id="${flight.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span data-i18n="flight.delete">Elimina volo</span>
              </button>
            </div>`;
            })()}
    `;
  }

  /**
   * Show delete passenger confirmation modal
   * @param {string} passengerName
   * @param {string} bookingRef
   */
  function showDeletePassengerModal(passengerName, bookingRef) {
    const existingModal = document.getElementById('delete-passenger-modal');
    if (existingModal) existingModal.remove();

    const currentTripData = window.tripPage.currentTripData;

    // Count how many flights this passenger is on with this booking
    const flightsWithPassenger = (currentTripData?.flights || []).filter(f =>
      f.bookingReference?.toLowerCase()?.trim() === bookingRef?.toLowerCase()?.trim() &&
      f.passengers?.some(p => p.name?.toLowerCase()?.trim() === passengerName?.toLowerCase()?.trim())
    );

    const modalHTML = `
      <div class="modal-overlay" id="delete-passenger-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="passenger.deleteTitle">Remove passenger</h2>
            <button class="modal-close" id="delete-passenger-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="passenger.deleteConfirm">Are you sure you want to remove this passenger?</p>
            <p class="text-muted mt-2"><strong>${esc(passengerName)}</strong></p>
            <p class="text-muted text-sm mt-2" data-i18n="passenger.deleteInfo">This will remove the passenger from ${flightsWithPassenger.length} flight(s) with booking ${bookingRef}.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-passenger-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-passenger-confirm" data-i18n="passenger.delete">Remove</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-passenger-modal');
    const closeBtn = document.getElementById('delete-passenger-close');
    const cancelBtn = document.getElementById('delete-passenger-cancel');
    const confirmBtn = document.getElementById('delete-passenger-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/delete-passenger', {
          method: 'POST',
          body: JSON.stringify({
            tripId: currentTripData.id,
            passengerName: passengerName,
            bookingReference: bookingRef
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to remove passenger');
        }

        closeModal();

        // Optimistic update: remove passenger from local data
        for (const f of (currentTripData.flights || [])) {
          if (f.bookingReference?.toLowerCase()?.trim() === bookingRef?.toLowerCase()?.trim()) {
            f.passengers = (f.passengers || []).filter(p =>
              p.name?.toLowerCase()?.trim() !== passengerName?.toLowerCase()?.trim()
            );
          }
        }
        // Remove flights with 0 passengers
        currentTripData.flights = (currentTripData.flights || []).filter(f =>
          !f.passengers || f.passengers.length > 0
        );
        window.tripPage.currentTripData = currentTripData;

        window.tripPage.rerenderCurrentTab();
      } catch (error) {
        console.error('Error removing passenger:', error);
        alert(i18n.t('common.deleteError') || 'Error removing passenger');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('passenger.delete') || 'Remove';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  }

  // ── Shared HTML helpers ───────────────────────────────────────────────────

  const FLIGHT_CLASS_OPTIONS = [
    { value: '', label: '— Seleziona classe —' },
    { value: 'economy', label: 'Economy' },
    { value: 'premium_economy', label: 'Premium Economy' },
    { value: 'business', label: 'Business' },
    { value: 'first', label: 'First' },
  ];

  const FLIGHT_PAX_TYPES = [
    { value: 'ADT', label: 'Adulto' },
    { value: 'CHD', label: 'Bambino' },
    { value: 'INF', label: 'Infante' },
  ];

  const FLIGHT_CURRENCIES = [
    { value: 'EUR', label: 'EUR €' },
    { value: 'USD', label: 'USD $' },
    { value: 'GBP', label: 'GBP £' },
    { value: 'CHF', label: 'CHF Fr' },
  ];

  function buildBookingSectionHTML(flight, opts = {}) {
    const classOptHTML = FLIGHT_CLASS_OPTIONS.map(o =>
      `<option value="${o.value}"${(flight.class || '') === o.value ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    const currOptHTML = FLIGHT_CURRENCIES.map(o =>
      `<option value="${o.value}"${(flight.currency || 'EUR') === o.value ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    const priceVal = flight.price != null ? String(flight.price) : '';
    return `
      <div class="edit-booking-section">
        <div class="edit-booking-section-title">Prenotazione</div>
        <div class="edit-booking-grid">
          <div class="edit-booking-field">
            <label>Riferimento / PNR</label>
            <input type="text" data-field="bookingReference" value="${escAttr(flight.bookingReference)}" placeholder="es. ABC123">
          </div>
          <div class="edit-booking-field">
            <label>Classe</label>
            <select data-field="class">${classOptHTML}</select>
          </div>
          <div class="edit-booking-field">
            <label>Bagaglio</label>
            <input type="text" data-field="baggage" value="${escAttr(flight.baggage)}" placeholder="es. 23kg">
          </div>
          <div class="edit-booking-field">
            <label>Prezzo</label>
            <div style="display:flex;gap:8px">
              <input type="number" data-field="price" value="${escAttr(priceVal)}" placeholder="0.00" min="0" step="0.01" style="flex:1;min-width:0">
              <select data-field="currency" style="width:90px">${currOptHTML}</select>
            </div>
          </div>
          ${opts.includeStatus ? `
          <div class="edit-booking-field">
            <label>Stato</label>
            <input type="text" data-field="status" value="${escAttr(flight.status)}" placeholder="es. OK">
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function buildPaxRowHTML(p = {}) {
    const typeOptHTML = FLIGHT_PAX_TYPES.map(o =>
      `<option value="${o.value}"${(p.type || 'ADT') === o.value ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    const removeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    return `
      <div class="edit-booking-passenger-row" style="flex-direction:column;align-items:stretch;gap:4px">
        <div style="display:flex;align-items:flex-end;gap:8px">
          <div class="edit-booking-field" style="flex:1">
            <label>Nome</label>
            <input type="text" data-pax-field="name" value="${escAttr(p.name)}">
          </div>
          <button type="button" class="edit-booking-remove-row" data-remove-pax title="Rimuovi" style="margin-bottom:4px;flex-shrink:0">${removeIcon}</button>
        </div>
        <div class="edit-booking-field">
          <label>Tipo</label>
          <select data-pax-field="type">${typeOptHTML}</select>
        </div>
      </div>
    `;
  }

  function buildPassengersSectionHTML(passengers) {
    const plusIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    const rowsHTML = passengers.map(p => buildPaxRowHTML(p)).join('');
    return `
      <div class="edit-booking-section" data-pax-section>
        <div class="edit-booking-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Passeggeri</span>
          <button type="button" class="edit-booking-add-row" data-add-pax style="margin:0">
            ${plusIcon} Aggiungi passeggero
          </button>
        </div>
        <div class="edit-booking-passengers-list" data-pax-list>
          ${rowsHTML}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build shared booking-level section HTML (used once for multi-leg edit)
   */
  function buildFlightSharedSectionHTML(flight) {
    const passengers = (flight.passengers && flight.passengers.length > 0)
      ? flight.passengers
      : [{ name: '', type: 'ADT' }];
    return `
      <div class="manage-booking-shared edit-booking-form" data-booking-shared>
        ${buildBookingSectionHTML(flight, { includeStatus: true })}
        ${buildPassengersSectionHTML(passengers)}
        ${buildFlightDocSectionHTML(flight)}
      </div>
    `;
  }

  /**
   * Build leg-only edit form (Volo + Partenza + Arrivo, no booking/pax fields)
   */
  function buildFlightLegOnlyForm(flight) {
    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">${i18n.t('flight.flightInfo') || 'Volo'}</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.date') || 'Data'}</label>
              <input type="date" data-field="date" value="${escAttr(flight.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.flightNumber') || 'Numero volo'}</label>
              <input type="text" data-field="flightNumber" value="${escAttr(flight.flightNumber)}" pattern="[A-Za-z0-9]{2,8}" placeholder="es. AZ1154">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airline') || 'Compagnia'}</label>
              <input type="text" data-field="airline" value="${escAttr(flight.airline)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.operatedBy') || 'Operato da'}</label>
              <input type="text" data-field="operatedBy" value="${escAttr(flight.operatedBy)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.departureTime') || 'Ora partenza'}</label>
              <input type="time" data-field="departureTime" value="${escAttr(flight.departureTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.arrivalTime') || 'Ora arrivo'}</label>
              <input type="time" data-field="arrivalTime" value="${escAttr(flight.arrivalTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.duration') || 'Durata'}</label>
              <input type="text" data-field="duration" value="${escAttr(flight.duration)}" placeholder="es. 09:30">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.seat') || 'Posto'}</label>
              <input type="text" data-field="seat" value="${escAttr(flight.seat)}" placeholder="es. 12A">
            </div>
            <div class="edit-booking-field edit-booking-field--checkbox">
              <label>
                <input type="checkbox" data-field="arrivalNextDay" ${flight.arrivalNextDay ? 'checked' : ''}>
                ${i18n.t('flight.arrivalNextDay') || 'Arrivo giorno dopo (+1)'}
              </label>
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">${i18n.t('flight.departureInfo') || 'Partenza'}</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="departure.code" value="${escAttr(flight.departure?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. FCO">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="departure.city" value="${escAttr(flight.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airport') || 'Aeroporto'}</label>
              <input type="text" data-field="departure.airport" value="${escAttr(flight.departure?.airport)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="departure.terminal" value="${escAttr(flight.departure?.terminal)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">${i18n.t('flight.arrivalInfo') || 'Arrivo'}</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="arrival.code" value="${escAttr(flight.arrival?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. NRT">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="arrival.city" value="${escAttr(flight.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airport') || 'Aeroporto'}</label>
              <input type="text" data-field="arrival.airport" value="${escAttr(flight.arrival?.airport)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="arrival.terminal" value="${escAttr(flight.arrival?.terminal)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build multi-leg edit form: shared booking fields once, then per-leg Volo/Partenza/Arrivo
   */
  function buildMultiLegEditForm(flights) {
    const firstFlight = flights[0];
    const sharedHTML = buildFlightSharedSectionHTML(firstFlight);
    const legsHTML = flights.map(f => {
      const header = `${esc(f.flightNumber || '')} ${esc(f.departure?.code || '')} → ${esc(f.arrival?.code || '')}`.trim();
      return `
        <div class="manage-edit-item" data-item-id="${escAttr(f.id)}">
          <div class="manage-edit-item-header">${header}</div>
          ${buildFlightLegOnlyForm(f)}
        </div>
      `;
    }).join('');
    return sharedHTML + legsHTML;
  }

  /**
   * Build document section HTML for flight edit forms
   */
  function buildFlightDocSectionHTML(flight) {
    const existingPath = flight.pdfPath || flight.passengers?.[0]?.pdfPath || '';
    const fileName = existingPath ? (existingPath.split('/').pop().replace(/\.[^.]+$/, '') || 'documento.pdf') : '';
    return `
      <div class="edit-booking-section" data-doc-section>
        <div class="edit-booking-section-title">Ricevuta</div>
        ${existingPath ? `
          <div class="ferry-doc-existing" data-existing-doc>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--color-gray-200);border-radius:8px;background:var(--color-gray-50,#f9fafb)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span style="font-size:var(--font-size-sm);color:var(--color-gray-700);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escAttr(fileName)}</span>
              <a href="${escAttr(existingPath)}" target="_blank" rel="noopener" title="Apri" class="ferry-doc-action-btn" style="display:flex;align-items:center;color:var(--color-primary);flex-shrink:0;padding:4px;border-radius:4px;transition:background .15s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <button type="button" class="ferry-doc-remove-btn ferry-doc-action-btn" title="Rimuovi" style="display:flex;align-items:center;background:none;border:none;cursor:pointer;color:var(--color-danger,#e53e3e);padding:4px;border-radius:4px;flex-shrink:0;transition:background .15s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        ` : ''}
        <div class="ferry-doc-upload" data-doc-upload ${existingPath ? 'style="display:none"' : ''}>
          <label class="file-upload-zone" data-doc-drop-zone style="cursor:pointer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span class="file-upload-zone-text">Carica PDF</span>
            <span class="file-upload-zone-hint">PDF — max 10 MB</span>
            <input type="file" accept="application/pdf" data-doc-input style="display:none">
          </label>
          <div class="ferry-doc-selected" data-doc-selected style="display:none"></div>
        </div>
      </div>
    `;
  }

  /**
   * Build flight edit form HTML
   */
  function buildFlightEditForm(flight, opts = {}) {
    const showDoc = opts.showDoc !== false;
    const passengers = (flight.passengers && flight.passengers.length > 0)
      ? flight.passengers
      : [{ name: '', type: 'ADT' }];

    return `
      <div class="edit-booking-form">
        ${buildBookingSectionHTML(flight)}
        ${buildPassengersSectionHTML(passengers)}

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.flightInfo') || 'Volo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.date') || 'Data'}</label>
              <input type="date" data-field="date" value="${escAttr(flight.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.flightNumber') || 'Numero volo'}</label>
              <input type="text" data-field="flightNumber" value="${escAttr(flight.flightNumber)}" pattern="[A-Za-z0-9]{2,8}" placeholder="es. AZ1154">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airline') || 'Compagnia'}</label>
              <input type="text" data-field="airline" value="${escAttr(flight.airline)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.departureTime') || 'Ora partenza'}</label>
              <input type="time" data-field="departureTime" value="${escAttr(flight.departureTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.arrivalTime') || 'Ora arrivo'}</label>
              <input type="time" data-field="arrivalTime" value="${escAttr(flight.arrivalTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.seat') || 'Posto'}</label>
              <input type="text" data-field="seat" value="${escAttr(flight.seat)}" placeholder="es. 12A">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.departureInfo') || 'Partenza'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="departure.code" value="${escAttr(flight.departure?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. FCO">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="departure.city" value="${escAttr(flight.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="departure.terminal" value="${escAttr(flight.departure?.terminal)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.arrivalInfo') || 'Arrivo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="arrival.code" value="${escAttr(flight.arrival?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. NRT">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="arrival.city" value="${escAttr(flight.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="arrival.terminal" value="${escAttr(flight.arrival?.terminal)}">
            </div>
          </div>
        </div>

        ${showDoc ? buildFlightDocSectionHTML(flight) : ''}
      </div>
    `;
  }

  /**
   * Attach doc section interactive events (remove / file select / drag-drop)
   */
  function _upgradeSelectToCS(parentEl, selector, options, dataAttrs) {
    if (!window.CustomSelect) return;
    parentEl.querySelectorAll(selector).forEach(sel => {
      const cs = window.CustomSelect.create({
        options,
        selected: sel.value,
        dataAttrs
      });
      sel.replaceWith(cs);
    });
  }

  function attachFlightFormListeners(formEl) {
    // Upgrade native selects to CustomSelect (no OS dialog)
    if (window.CustomSelect) {
      _upgradeSelectToCS(formEl, 'select[data-field="class"]', FLIGHT_CLASS_OPTIONS, { field: 'class' });
      _upgradeSelectToCS(formEl, 'select[data-field="currency"]', FLIGHT_CURRENCIES, { field: 'currency' });
      // Apply fixed width to currency CS wrappers (native select had width:90px)
      formEl.querySelectorAll('.cs-wrapper[data-field="currency"]').forEach(w => {
        w.style.width = '100px';
        w.style.flexShrink = '0';
      });
      _upgradeSelectToCS(formEl, 'select[data-pax-field="type"]', FLIGHT_PAX_TYPES, { paxField: 'type' });
    }

    // Passenger add / remove
    const paxList = formEl.querySelector('[data-pax-list]');
    const addPaxBtn = formEl.querySelector('[data-add-pax]');
    if (paxList && addPaxBtn) {
      const bindRemove = (row) => {
        row.querySelector('[data-remove-pax]')?.addEventListener('click', () => row.remove());
      };
      paxList.querySelectorAll('.edit-booking-passenger-row').forEach(bindRemove);
      addPaxBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.innerHTML = buildPaxRowHTML({ name: '', type: 'ADT' }).trim();
        const row = div.firstElementChild;
        // Upgrade type select on new row
        if (window.CustomSelect) {
          _upgradeSelectToCS(row, 'select[data-pax-field="type"]', FLIGHT_PAX_TYPES, { paxField: 'type' });
        }
        paxList.appendChild(row);
        bindRemove(row);
        row.querySelector('[data-pax-field="name"]')?.focus();
      });
    }

    const docSection = formEl.querySelector('[data-doc-section]');
    if (!docSection) return;

    const existingDocEl = docSection.querySelector('[data-existing-doc]');
    const uploadArea = docSection.querySelector('[data-doc-upload]');
    const docInput = docSection.querySelector('[data-doc-input]');
    const docSelected = docSection.querySelector('[data-doc-selected]');
    const dropZone = docSection.querySelector('[data-doc-drop-zone]');

    const showSelectedFile = (file) => {
      if (!file || !docSelected) return;
      docSelected.innerHTML = `
        <div class="file-preview-item" style="justify-content:space-between;margin-top:8px">
          <span style="font-size:var(--font-size-sm);color:var(--color-gray-700)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            ${utils.escapeHtml(file.name)}
          </span>
          <button type="button" class="ferry-doc-deselect-btn" style="font-size:var(--font-size-sm);color:var(--color-danger,#e53e3e);background:none;border:none;cursor:pointer;padding:0">✕</button>
        </div>`;
      docSelected.style.display = '';
      docSelected.querySelector('.ferry-doc-deselect-btn').addEventListener('click', () => {
        if (docInput) docInput.value = '';
        docSelected.innerHTML = '';
        docSelected.style.display = 'none';
      });
    };

    if (docInput) {
      docInput.addEventListener('change', () => {
        if (docInput.files[0]) {
          const sentinel = formEl.querySelector('[data-doc-remove]');
          if (sentinel) sentinel.dataset.docRemove = '0';
          showSelectedFile(docInput.files[0]);
        }
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
          if (docInput) {
            const dt = new DataTransfer();
            dt.items.add(file);
            docInput.files = dt.files;
          }
          showSelectedFile(file);
        }
      });
    }

    const removeBtn = existingDocEl ? existingDocEl.querySelector('.ferry-doc-remove-btn') : null;
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const sentinel = formEl.querySelector('[data-doc-remove]') || (() => {
          const inp = document.createElement('input');
          inp.type = 'hidden';
          inp.dataset.docRemove = '1';
          formEl.appendChild(inp);
          return inp;
        })();
        sentinel.dataset.docRemove = '1';
        if (existingDocEl) existingDocEl.style.display = 'none';
        if (uploadArea) uploadArea.style.display = '';
      });
    }
  }

  /**
   * Collect flight form values into an updates object
   */
  function _setField(updates, field, val) {
    if (field === 'price') {
      if (val !== '') { const n = parseFloat(val); if (!isNaN(n)) updates.price = n; }
    } else if (field.startsWith('departure.')) {
      const prop = field.split('.')[1];
      if (!updates.departure) updates.departure = {};
      updates.departure[prop] = val;
    } else if (field.startsWith('arrival.')) {
      const prop = field.split('.')[1];
      if (!updates.arrival) updates.arrival = {};
      updates.arrival[prop] = val;
    } else {
      updates[field] = val;
    }
  }

  function _collectFlightFields(formView, updates, checkboxes = false) {
    // Native inputs + selects (not replaced by CustomSelect)
    formView.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      const field = el.dataset.field;
      if (field.startsWith('passengers.')) return;
      let val;
      if (el.type === 'checkbox') val = checkboxes ? el.checked : undefined;
      else val = el.value.trim();
      if (val === undefined) return;
      _setField(updates, field, val);
    });

    // CustomSelect wrappers (replace native selects after upgrade)
    formView.querySelectorAll('.cs-wrapper[data-field]').forEach(cs => {
      const field = cs.dataset.field;
      if (!field || field.startsWith('passengers.')) return;
      _setField(updates, field, cs.dataset.value || '');
    });

    // Passengers: collect positionally from rows
    const paxRows = formView.querySelectorAll('.edit-booking-passenger-row');
    if (paxRows.length > 0) {
      updates.passengers = Array.from(paxRows).map(row => ({
        name: (row.querySelector('[data-pax-field="name"]')?.value || '').trim(),
        // type: from CustomSelect wrapper or native select fallback
        type: row.querySelector('.cs-wrapper[data-pax-field="type"]')?.dataset.value
          || row.querySelector('select[data-pax-field="type"]')?.value
          || 'ADT',
      })).filter(p => p.name);
    }

    // Remove sentinel
    const removeSentinel = formView.querySelector('[data-doc-remove]');
    if (removeSentinel && removeSentinel.dataset.docRemove === '1') {
      updates.pdfPath = null;
    }
  }

  function collectFlightUpdates(formView) {
    const updates = {};
    _collectFlightFields(formView, updates, false);
    return updates;
  }

  /**
   * Build full edit form with ALL flight fields (for manage booking panel)
   */
  function buildFullFlightEditForm(flight) {
    const passengers = (flight.passengers && flight.passengers.length > 0)
      ? flight.passengers
      : [{ name: '', type: 'ADT' }];

    return `
      <div class="edit-booking-form">
        ${buildBookingSectionHTML(flight, { includeStatus: true })}
        ${buildPassengersSectionHTML(passengers)}

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.flightInfo') || 'Volo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.date') || 'Data'}</label>
              <input type="date" data-field="date" value="${escAttr(flight.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.flightNumber') || 'Numero volo'}</label>
              <input type="text" data-field="flightNumber" value="${escAttr(flight.flightNumber)}" pattern="[A-Za-z0-9]{2,8}" placeholder="es. AZ1154">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airline') || 'Compagnia'}</label>
              <input type="text" data-field="airline" value="${escAttr(flight.airline)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.operatedBy') || 'Operato da'}</label>
              <input type="text" data-field="operatedBy" value="${escAttr(flight.operatedBy)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.departureTime') || 'Ora partenza'}</label>
              <input type="time" data-field="departureTime" value="${escAttr(flight.departureTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.arrivalTime') || 'Ora arrivo'}</label>
              <input type="time" data-field="arrivalTime" value="${escAttr(flight.arrivalTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.duration') || 'Durata'}</label>
              <input type="text" data-field="duration" value="${escAttr(flight.duration)}" placeholder="es. 09:30">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.seat') || 'Posto'}</label>
              <input type="text" data-field="seat" value="${escAttr(flight.seat)}" placeholder="es. 12A">
            </div>
            <div class="edit-booking-field edit-booking-field--checkbox">
              <label>
                <input type="checkbox" data-field="arrivalNextDay" ${flight.arrivalNextDay ? 'checked' : ''}>
                ${i18n.t('flight.arrivalNextDay') || 'Arrivo giorno dopo (+1)'}
              </label>
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.departureInfo') || 'Partenza'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="departure.code" value="${escAttr(flight.departure?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. FCO">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="departure.city" value="${escAttr(flight.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airport') || 'Aeroporto'}</label>
              <input type="text" data-field="departure.airport" value="${escAttr(flight.departure?.airport)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="departure.terminal" value="${escAttr(flight.departure?.terminal)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.arrivalInfo') || 'Arrivo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="arrival.code" value="${escAttr(flight.arrival?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. NRT">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="arrival.city" value="${escAttr(flight.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.airport') || 'Aeroporto'}</label>
              <input type="text" data-field="arrival.airport" value="${escAttr(flight.arrival?.airport)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="arrival.terminal" value="${escAttr(flight.arrival?.terminal)}">
            </div>
          </div>
        </div>

        ${buildFlightDocSectionHTML(flight)}
      </div>
    `;
  }

  /**
   * Collect full flight form values (handles checkboxes too)
   */
  function collectFullFlightUpdates(formView) {
    const updates = {};
    _collectFlightFields(formView, updates, true); // true = collect checkboxes
    return updates;
  }

  window.tripFlights = {
    render: renderFlights,
    renderDetails: renderFlightDetails,
    showDeletePassengerModal: showDeletePassengerModal,
    buildEditForm: buildFlightEditForm,
    collectUpdates: collectFlightUpdates,
    buildFullEditForm: buildFullFlightEditForm,
    buildMultiLegEditForm: buildMultiLegEditForm,
    collectFullUpdates: collectFullFlightUpdates,
    attachFormListeners: attachFlightFormListeners
  };
})();
