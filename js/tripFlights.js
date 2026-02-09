/**
 * Trip Flights - Flights tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

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
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">No flights</h3>
          <p class="empty-state-text" data-i18n="trip.noFlightsText">No flight information available</p>
        </div>
        <div class="quick-upload-card" id="quick-upload-flights">
          <input type="file" class="quick-upload-input" accept=".pdf" hidden>
          <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <div class="quick-upload-spinner"></div>
          <span class="quick-upload-text" data-i18n="${i18n.isTouchDevice() ? 'trip.quickUploadHintMobile' : 'trip.quickUploadHint'}">Drop a PDF here to add a booking</span>
        </div>
      `;
      i18n.apply(container);
      window.tripPage.initQuickUploadCard('quick-upload-flights');
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
            <div class="flight-route">
              <div class="flight-endpoint">
                <div class="flight-time">
                  <span class="material-icons-outlined flight-time-icon">flight_takeoff</span>
                  ${esc(flight.departureTime)}
                </div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${esc(flight.departure?.code || '')}</span>
                </div>
                <div class="flight-airport">${esc(flight.departure?.city || '')}</div>
                ${flight.departure?.terminal ? `<div class="flight-terminal">Terminal ${esc(flight.departure.terminal)}</div>` : ''}
              </div>

              <div class="flight-arrow">
                <div class="flight-duration">${esc(duration)}</div>
                <div class="flight-arrow-line"></div>
              </div>

              <div class="flight-endpoint">
                <div class="flight-time">
                  <span class="material-icons-outlined flight-time-icon">flight_land</span>
                  ${esc(flight.arrivalTime)}${flight.arrivalNextDay ? ' +1' : ''}
                </div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${esc(flight.arrival?.code || '')}</span>
                </div>
                <div class="flight-airport">${esc(flight.arrival?.city || '')}</div>
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

          <div class="flight-details" id="flight-details-${index}">
            ${flight.passengers && flight.passengers.length > 1 ? `
            <!-- Multiple passengers view -->
            <div class="flight-passengers-section">
              <span class="flight-detail-label" data-i18n="flight.passengers">Passengers</span>
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
                        ` : ''}
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
                          ` : ''}
                          ${p.pdfPath ? `<div class="passenger-menu-divider"></div>` : ''}
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
            <div class="flight-details-grid">
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
                  <span class="flight-detail-value">${esc(flight.ticketNumber || '-')}</span>
                  ${flight.ticketNumber ? `<button class="btn-copy-value" data-copy="${esc(flight.ticketNumber)}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${esc(flight.seat || '-')}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${esc(flight.class || '-')}</span>
              </div>
            </div>
            ${flight.pdfPath ? `
            <button class="btn-download-pdf" data-pdf-path="${flight.pdfPath}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span data-i18n="flight.downloadPdf">Download PDF</span>
            </button>
            ` : ''}
            `}
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
              <span data-i18n="flight.delete">Delete flight</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add quick upload card at the end
    const quickUploadCard = `
      <div class="quick-upload-card" id="quick-upload-flights">
        <input type="file" class="quick-upload-input" accept=".pdf" hidden>
        <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="quick-upload-spinner"></div>
        <span class="quick-upload-text" data-i18n="trip.quickUploadHint">Drop a PDF here to add a booking</span>
      </div>
    `;

    container.innerHTML = html + quickUploadCard;
    i18n.apply(container);
    initFlightToggleButtons();
    window.tripPage.initEditItemButtons();
    window.tripPage.initDeleteItemButtons();
    window.tripPage.initPdfDownloadButtons();
    initSmallPdfButtons();
    initDeletePassengerButtons();
    initPassengerMenus();
    initCopyValueButtons();
    window.tripPage.initQuickUploadCard('quick-upload-flights');
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
   * Initialize small PDF download buttons (for multi-passenger view)
   */
  function initSmallPdfButtons() {
    document.querySelectorAll('.btn-download-pdf-small').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pdfPath = newBtn.dataset.pdfPath;

        // Show loading state
        newBtn.disabled = true;
        const svg = newBtn.querySelector('svg');
        if (svg) svg.style.opacity = '0.5';

        // Pre-open window for Safari iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        let newWindow = null;
        if (isIOS) {
          newWindow = window.open('about:blank', '_blank');
        }

        try {
          const response = await utils.authFetch(`/.netlify/functions/get-pdf-url?path=${encodeURIComponent(pdfPath)}`);
          const result = await response.json();

          if (result.success && result.url) {
            if (newWindow) {
              newWindow.location.href = result.url;
            } else {
              window.open(result.url, '_blank');
            }
          } else {
            if (newWindow) newWindow.close();
            throw new Error(result.error || 'Failed to get PDF URL');
          }
        } catch (error) {
          console.error('Error downloading PDF:', error);
          if (newWindow) newWindow.close();
          alert(i18n.t('common.downloadError') || 'Error downloading PDF');
        } finally {
          newBtn.disabled = false;
          if (svg) svg.style.opacity = '1';
        }
      });
    });
  }

  /**
   * Initialize delete passenger buttons
   */
  function initDeletePassengerButtons() {
    document.querySelectorAll('.btn-delete-passenger').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const passengerName = newBtn.dataset.passengerName;
        const bookingRef = newBtn.dataset.bookingRef;
        showDeletePassengerModal(passengerName, bookingRef);
      });
    });
  }

  /**
   * Initialize 3-dot passenger menus (mobile only)
   */
  function initPassengerMenus() {
    document.querySelectorAll('.btn-passenger-menu').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = newBtn.nextElementSibling;
        const wasActive = dropdown.classList.contains('active');

        // Close all open passenger menus
        document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => {
          d.classList.remove('active');
        });

        if (!wasActive) {
          dropdown.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.passenger-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const dropdown = item.closest('.passenger-menu-dropdown');
        dropdown?.classList.remove('active');

        if (action === 'download-pdf') {
          const pdfPath = item.dataset.pdfPath;
          if (!pdfPath) return;

          item.style.opacity = '0.5';
          item.style.pointerEvents = 'none';

          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          let newWindow = null;
          if (isIOS) {
            newWindow = window.open('about:blank', '_blank');
          }

          try {
            const response = await utils.authFetch(`/.netlify/functions/get-pdf-url?path=${encodeURIComponent(pdfPath)}`);
            const result = await response.json();

            if (result.success && result.url) {
              if (newWindow) {
                newWindow.location.href = result.url;
              } else {
                window.open(result.url, '_blank');
              }
            } else {
              if (newWindow) newWindow.close();
              throw new Error(result.error || 'Failed to get PDF URL');
            }
          } catch (error) {
            console.error('Error downloading PDF:', error);
            if (newWindow) newWindow.close();
            alert(i18n.t('common.downloadError') || 'Error downloading PDF');
          } finally {
            item.style.opacity = '';
            item.style.pointerEvents = '';
          }
        } else if (action === 'delete-passenger') {
          showDeletePassengerModal(item.dataset.passengerName, item.dataset.bookingRef);
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => {
        d.classList.remove('active');
      });
    });
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

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await window.tripPage.loadTripFromUrl();
        if (activeTab) window.tripPage.switchToTab(activeTab);
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
   * Build flight edit form HTML
   */
  function buildFlightEditForm(flight) {
    const isMultiPax = flight.passengers && flight.passengers.length > 1;

    let passengersHTML = '';
    if (isMultiPax) {
      passengersHTML = flight.passengers.map((p, i) => `
        <div class="edit-booking-passenger">
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.passengerName') || 'Nome'}</label>
              <input type="text" data-field="passengers.${i}.name" value="${escAttr(p.name)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.passengerType') || 'Tipo'}</label>
              <input type="text" data-field="passengers.${i}.type" value="${escAttr(p.type)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.ticketNumber') || 'Biglietto'}</label>
              <input type="text" data-field="passengers.${i}.ticketNumber" value="${escAttr(p.ticketNumber)}">
            </div>
          </div>
        </div>
      `).join('');
    }

    return `
      <div class="edit-booking-form">
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
              <label>${i18n.t('flight.departureTime') || 'Partenza'}</label>
              <input type="time" data-field="departureTime" value="${escAttr(flight.departureTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.arrivalTime') || 'Arrivo'}</label>
              <input type="time" data-field="arrivalTime" value="${escAttr(flight.arrivalTime)}" required>
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

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.bookingInfo') || 'Prenotazione'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.bookingRef') || 'Riferimento'}</label>
              <input type="text" data-field="bookingReference" value="${escAttr(flight.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.class') || 'Classe'}</label>
              <input type="text" data-field="class" value="${escAttr(flight.class)}">
            </div>
            ${!isMultiPax ? `
            <div class="edit-booking-field">
              <label>${i18n.t('flight.seat') || 'Posto'}</label>
              <input type="text" data-field="seat" value="${escAttr(flight.seat)}" placeholder="es. 12A">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.ticketNumber') || 'Biglietto'}</label>
              <input type="text" data-field="ticketNumber" value="${escAttr(flight.ticketNumber)}">
            </div>
            ` : ''}
          </div>
          ${passengersHTML}
        </div>
      </div>
    `;
  }

  /**
   * Collect flight form values into an updates object
   */
  function collectFlightUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();

      if (field.startsWith('passengers.')) {
        // passengers.0.name → { passengers: [{ name: val }] }
        const parts = field.split('.');
        const idx = parseInt(parts[1], 10);
        const prop = parts[2];
        if (!updates.passengers) updates.passengers = [];
        while (updates.passengers.length <= idx) updates.passengers.push({});
        updates.passengers[idx][prop] = val;
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
    });
    return updates;
  }

  window.tripFlights = {
    render: renderFlights,
    buildEditForm: buildFlightEditForm,
    collectUpdates: collectFlightUpdates
  };
})();
