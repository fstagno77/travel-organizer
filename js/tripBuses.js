/**
 * Trip Buses - Buses tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

  const IT_LOWERCASE = new Set(['di','del','della','delle','dei','degli','dello','da','nel','nella','nelle','nei','negli','nello','al','alla','alle','agli','allo','sul','sulla','sulle','sui','sugli','in','a','e','le','la','il','lo','i','gli']);
  function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\S+/g, (word, offset) =>
      offset > 0 && IT_LOWERCASE.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    );
  }

  function isBusPast(bus) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (bus.date < today) return true;
    if (bus.date === today && bus.arrival?.time) {
      const [h, m] = bus.arrival.time.split(':').map(Number);
      return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
    }
    return bus.date < today;
  }

  function renderBuses(container, buses) {
    if (!container) return;
    if (!buses || buses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noBuses">Nessun bus</h3>
          <p class="empty-state-text" data-i18n="trip.noBusesText">Aggiungi una prenotazione per visualizzare i tuoi bus</p>
          <button class="btn btn-primary empty-state-cta" id="empty-add-bus">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span data-i18n="trip.addBooking">Aggiungi prenotazione</span>
          </button>
        </div>
      `;
      i18n.apply(container);
      const addBtn = container.querySelector('#empty-add-bus');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const tripId = new URLSearchParams(window.location.search).get('id');
          if (tripId) window.tripPage.showAddBookingModal(tripId);
        });
      }
      return;
    }

    const lang = i18n.getLang();

    const sortedBuses = [...buses].sort((a, b) => {
      const aPast = isBusPast(a);
      const bPast = isBusPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedBuses.map((bus, index) => {
      const formattedDate = utils.formatFlightDate(bus.date, lang);
      const isPast = isBusPast(bus);

      const depStation = toTitleCase(bus.departure?.station || bus.departure?.city || '');
      const arrStation = toTitleCase(bus.arrival?.station || bus.arrival?.city || '');
      const depCity = toTitleCase(bus.departure?.city || '');
      const arrCity = toTitleCase(bus.arrival?.city || '');

      return `
        <div class="bus-card${isPast ? ' past' : ''}" data-id="${bus.id}">
          <div class="bus-card-header">
            <span class="bus-date">${esc(formattedDate)}</span>
            ${bus.routeNumber ? `<span class="bus-route-number">${esc(bus.routeNumber)}</span>` : ''}
          </div>

          <div class="bus-card-body">
            <div class="bus-title-section">
              <h3 class="bus-title">Da ${esc(depCity || depStation)} a ${esc(arrCity || arrStation)}</h3>
              ${bus.operator ? `<span class="bus-operator">${esc(bus.operator)}</span>` : ''}
            </div>

            <div class="bus-route">
              <div class="bus-endpoint">
                <div class="bus-station-name">${esc(depStation)}</div>
                <div class="bus-time-sm">
                  <svg class="bus-time-icon-sm" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10m3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M18 11H6V6h12v5Z"/></svg>
                  ${esc(bus.departure?.time || '')}
                </div>
              </div>

              <div class="bus-arc">
                <div class="bus-arc-line">
                  <img class="bus-arc-img" src="/img/flight-arc.svg" alt="" />
                  <div class="bus-arc-vehicle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-bus-600)"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10m3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M18 11H6V6h12v5Z"/></svg>
                  </div>
                </div>
              </div>

              <div class="bus-endpoint">
                <div class="bus-station-name">${esc(arrStation)}</div>
                <div class="bus-time-sm">
                  ${esc(bus.arrival?.time || '')}
                  <svg class="bus-time-icon-sm" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10m3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M18 11H6V6h12v5Z"/></svg>
                </div>
              </div>
            </div>
          </div>

          <button class="bus-toggle-details" data-bus-index="${index}">
            <span data-i18n="flight.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="bus-details" id="bus-details-${index}" data-bus-index="${index}"></div>
        </div>
      `;
    }).join('');

    const quickUploadCard = `
      <div class="quick-upload-card" id="quick-upload-buses">
        <input type="file" class="quick-upload-input" accept=".pdf" hidden>
        <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="quick-upload-spinner"></div>
        <span class="quick-upload-text" data-i18n="trip.quickUploadHint">Trascina un PDF qui per aggiungere una prenotazione</span>
      </div>
    `;

    const plusSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei bus <span class="beta-badge">Beta</span></h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-primary" id="buses-add-booking-btn">
            ${plusSvg}
            <span class="section-header-cta-label-full">Aggiungi</span>
            <span class="section-header-cta-label-short">Aggiungi</span>
          </button>
          <button class="section-header-cta btn btn-outline" id="buses-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html + quickUploadCard;
    window.tripBuses._buses = sortedBuses;
    i18n.apply(container);
    window.tripPage.initQuickUploadCard('quick-upload-buses');

    const addBtn = document.getElementById('buses-add-booking-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showAddBookingModal(tripId, 'bus');
      });
    }

    const manageBtn = document.getElementById('buses-manage-booking-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showManageBookingPanel(tripId);
      });
    }
  }

  function renderBusDetails(bus, index) {
    const priceStr = bus.price?.value
      ? `${bus.price.value} ${bus.price.currency || '€'}`
      : '';

    return `
            <div class="bus-section-header">
              <svg class="bus-section-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2m-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.81-2.77-2-3.46V6h16v2.54z"/></svg>
              <span class="bus-detail-label" data-i18n="bus.bookingDetails">Dettagli Prenotazione</span>
            </div>
            <div class="bus-details-grid">
              <div class="bus-detail-item">
                <span class="bus-detail-label" data-i18n="bus.bookingRef">Riferimento</span>
                <span class="bus-detail-value-wrapper">
                  <span class="bus-detail-value">${esc(bus.bookingReference || '-')}</span>
                  ${bus.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(bus.bookingReference)}" title="Copia">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              ${bus.seat ? `
              <div class="bus-detail-item">
                <span class="bus-detail-label" data-i18n="bus.seat">Posto</span>
                <span class="bus-detail-value">${esc(bus.seat)}</span>
              </div>
              ` : ''}
              ${bus.passenger?.name ? `
              <div class="bus-detail-item">
                <span class="bus-detail-label" data-i18n="bus.passenger">Passeggero</span>
                <span class="bus-detail-value">${esc(bus.passenger.name)}</span>
              </div>
              ` : ''}
              ${priceStr ? `
              <div class="bus-detail-item">
                <span class="bus-detail-label" data-i18n="bus.price">Prezzo</span>
                <span class="bus-detail-value bus-price-value">${esc(priceStr)}</span>
              </div>
              ` : ''}
            </div>
            ${bus.pdfPath ? `
            <button class="btn-download-pdf" data-pdf-path="${bus.pdfPath}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span data-i18n="bus.booking">Prenotazione</span>
            </button>
            ` : ''}
            <div class="bus-detail-actions">
              <button class="btn-edit-item" data-type="bus" data-id="${bus.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span data-i18n="bus.edit">Modifica bus</span>
              </button>
              <button class="btn-delete-item" data-type="bus" data-id="${bus.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span data-i18n="bus.delete">Elimina bus</span>
              </button>
            </div>
    `;
  }

  function buildBusEditForm(bus) {
    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Bus</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Data</label>
              <input type="date" data-field="date" value="${escAttr(bus.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>Operatore</label>
              <input type="text" data-field="operator" value="${escAttr(bus.operator)}">
            </div>
            <div class="edit-booking-field">
              <label>Linea</label>
              <input type="text" data-field="routeNumber" value="${escAttr(bus.routeNumber)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Partenza</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Fermata</label>
              <input type="text" data-field="departure.station" value="${escAttr(bus.departure?.station)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="departure.city" value="${escAttr(bus.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="departure.time" value="${escAttr(bus.departure?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Arrivo</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Fermata</label>
              <input type="text" data-field="arrival.station" value="${escAttr(bus.departure?.station)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="arrival.city" value="${escAttr(bus.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="arrival.time" value="${escAttr(bus.arrival?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Prenotazione</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Riferimento</label>
              <input type="text" data-field="bookingReference" value="${escAttr(bus.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>Posto</label>
              <input type="text" data-field="seat" value="${escAttr(bus.seat)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function collectBusUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();
      if (field.startsWith('departure.')) {
        if (!updates.departure) updates.departure = {};
        updates.departure[field.split('.')[1]] = val;
      } else if (field.startsWith('arrival.')) {
        if (!updates.arrival) updates.arrival = {};
        updates.arrival[field.split('.')[1]] = val;
      } else {
        updates[field] = val;
      }
    });
    return updates;
  }

  window.tripBuses = {
    render: renderBuses,
    renderDetails: renderBusDetails,
    buildEditForm: buildBusEditForm,
    collectUpdates: collectBusUpdates,
    buildFullEditForm: buildBusEditForm,
    collectFullUpdates: collectBusUpdates
  };
})();
