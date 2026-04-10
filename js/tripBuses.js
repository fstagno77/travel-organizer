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

  function calcDuration(depTime, arrTime) {
    if (!depTime || !arrTime) return '';
    const [dH, dM] = depTime.split(':').map(Number);
    const [aH, aM] = arrTime.split(':').map(Number);
    let diff = (aH * 60 + aM) - (dH * 60 + dM);
    if (diff <= 0) return '';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

      // Calcola durata dal tempo di partenza e arrivo
      const duration = calcDuration(bus.departure?.time, bus.arrival?.time);
      const durationStr = duration ? utils.formatDuration(duration, lang) : '';

      return `
        <div class="bus-card${isPast ? ' past' : ''}" data-id="${bus.id}">
          <div class="bus-card-header">
            <span class="bus-header-date">${esc(formattedDate)}</span>
            ${bus.routeNumber ? `<span class="bus-header-route">${esc(bus.routeNumber)}</span>` : ''}
          </div>

          <div class="bus-card-body">
            <div class="bus-title-section">
              <h3 class="bus-title">Da ${esc(depCity || depStation)} a ${esc(arrCity || arrStation)}</h3>
              ${bus.operator ? `<span class="bus-operator">${esc(bus.operator)}</span>` : ''}
            </div>

            <div class="bus-route">
              <div class="bus-endpoint">
                ${bus.departure?.time ? `<div class="bus-time-lg">${esc(bus.departure.time)}</div>` : ''}
                <div class="bus-station-name">${esc(depStation)}</div>
              </div>

              <div class="bus-arc">
                <div class="bus-arc-line">
                  <svg class="bus-arc-img" width="160" height="28" viewBox="0 0 160 28" fill="none">
                    <path d="M4 18 C16 6 24 24 42 8 C56 -2 62 26 80 20 C94 16 100 4 118 10 C132 14 140 24 156 12" stroke="#22c55e" stroke-width="3" stroke-dasharray="10 6" stroke-linecap="round" fill="none"/>
                  </svg>
                  <div class="bus-arc-vehicle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-bus-600)"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10m3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M18 11H6V6h12v5Z"/></svg>
                  </div>
                </div>
                ${durationStr ? `<div class="bus-duration">${esc(durationStr)}</div>` : ''}
              </div>

              <div class="bus-endpoint">
                ${bus.arrival?.time ? `<div class="bus-time-lg">${esc(bus.arrival.time)}</div>` : ''}
                <div class="bus-station-name">${esc(arrStation)}</div>
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

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei bus</h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-outline bus-cta-outline" id="buses-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html;
    window.tripBuses._buses = sortedBuses;
    i18n.apply(container);

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

    const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const downloadIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    return `
      <div class="bus-details-box">
        <div class="bus-details-grid">
          <div class="bus-detail-item">
            <span class="bus-detail-label" data-i18n="bus.bookingRef">Riferimento</span>
            <span class="bus-detail-value">
              ${esc(bus.bookingReference || '-')}
              ${bus.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(bus.bookingReference)}" title="Copia">${copyIcon}</button>` : ''}
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
        </div>
      </div>

      ${priceStr ? `
      <div class="bus-price-box">
        <span class="bus-price-label" data-i18n="bus.price">Prezzo</span>
        <span class="bus-price-amount">${esc(priceStr)}</span>
      </div>
      ` : ''}

      <div class="bus-actions">
        ${bus.pdfPath ? `
        <button class="bus-btn bus-btn--primary btn-download-pdf" data-pdf-path="${bus.pdfPath}">
          ${downloadIcon}
          <span data-i18n="bus.booking">Prenotazione</span>
        </button>
        ` : `<div></div>`}
        <button class="bus-btn bus-btn--outline btn-edit-item" data-type="bus" data-id="${bus.id}">
          ${editIcon}
          <span data-i18n="bus.edit">Modifica</span>
        </button>
        <button class="bus-btn bus-btn--danger btn-delete-item" data-type="bus" data-id="${bus.id}">
          ${trashIcon}
          <span data-i18n="bus.delete">Elimina</span>
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
    formView.querySelectorAll('input[data-field], textarea[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();
      if (field.startsWith('departure.')) {
        if (!updates.departure) updates.departure = {};
        updates.departure[field.split('.')[1]] = val;
      } else if (field.startsWith('arrival.')) {
        if (!updates.arrival) updates.arrival = {};
        updates.arrival[field.split('.')[1]] = val;
      } else if (field.startsWith('price.')) {
        if (!updates.price) updates.price = {};
        const sub = field.split('.')[1];
        const numVal = parseFloat(val);
        updates.price[sub] = isNaN(numVal) ? val : numVal;
      } else {
        updates[field] = val;
      }
    });

    // Raccolta passeggeri dinamici
    const passengerRows = formView.querySelectorAll('.bus-passenger-row');
    if (passengerRows.length > 0) {
      const passengers = [];
      passengerRows.forEach(row => {
        const firstName = row.querySelector('[data-pax-field="firstName"]')?.value?.trim() || '';
        const lastName = row.querySelector('[data-pax-field="lastName"]')?.value?.trim() || '';
        const seat = row.querySelector('[data-pax-field="seat"]')?.value?.trim() || '';
        if (firstName || lastName) {
          const p = { name: [firstName, lastName].filter(Boolean).join(' ') };
          if (seat) p.seat = seat;
          passengers.push(p);
        }
      });
      if (passengers.length > 0) updates.passengers = passengers;
    }

    return updates;
  }

  /**
   * Build structured form sections for bus — used by parsePreview and full edit panel.
   * @param {Object} bus  — existing bus data object (may be partial from parser)
   * @param {boolean} full — if true, renders all fields including cancellation policy
   * @returns {string} HTML string
   */
  function buildBusFormSections(bus, full) {
    bus = bus || {};

    // Normalize passengers list
    let passengers = [];
    if (Array.isArray(bus.passengers) && bus.passengers.length) {
      passengers = bus.passengers;
    } else if (bus.passenger?.name) {
      passengers = [{ name: bus.passenger.name, seat: bus.seat || '' }];
    }

    // Build passenger rows HTML
    const passengerRowsHtml = passengers.map((p, i) => buildBusPassengerRow(p, i)).join('');

    const priceVal = bus.price?.value != null ? bus.price.value : '';
    const priceCur = bus.price?.currency || 'EUR';

    return `
      <!-- Sezione 1: Tratta -->
      <div class="edit-booking-section">
        <div class="edit-booking-section-title">Tratta</div>
        <div class="edit-booking-grid">
          <div class="edit-booking-field">
            <label>Operatore</label>
            <input type="text" data-field="operator" value="${escAttr(bus.operator)}" placeholder="es. FlixBus">
          </div>
          <div class="edit-booking-field">
            <label>Linea / Numero corsa</label>
            <input type="text" data-field="routeNumber" value="${escAttr(bus.routeNumber)}" placeholder="es. 001">
          </div>
        </div>
        <div class="edit-booking-grid" style="margin-top:10px">
          <div class="edit-booking-field">
            <label>Città partenza</label>
            <input type="text" data-field="departure.city" value="${escAttr(bus.departure?.city)}" placeholder="es. Roma">
          </div>
          <div class="edit-booking-field">
            <label>Fermata / Stazione partenza</label>
            <input type="text" data-field="departure.station" value="${escAttr(bus.departure?.station)}" placeholder="es. Tiburtina">
          </div>
          <div class="edit-booking-field">
            <label>Città arrivo</label>
            <input type="text" data-field="arrival.city" value="${escAttr(bus.arrival?.city)}" placeholder="es. Napoli">
          </div>
          <div class="edit-booking-field">
            <label>Fermata / Stazione arrivo</label>
            <input type="text" data-field="arrival.station" value="${escAttr(bus.arrival?.station)}" placeholder="es. Metropark">
          </div>
        </div>
      </div>

      <!-- Sezione 2: Orario -->
      <div class="edit-booking-section">
        <div class="edit-booking-section-title">Orario</div>
        <div class="edit-booking-grid">
          <div class="edit-booking-field">
            <label>Data</label>
            <input type="date" data-field="date" value="${escAttr(bus.date)}" required>
          </div>
          <div class="edit-booking-field">
            <label>Ora partenza</label>
            <input type="time" data-field="departure.time" value="${escAttr(bus.departure?.time)}">
          </div>
          <div class="edit-booking-field">
            <label>Ora arrivo</label>
            <input type="time" data-field="arrival.time" value="${escAttr(bus.arrival?.time)}">
          </div>
        </div>
      </div>

      <!-- Sezione 3: Prenotazione -->
      <div class="edit-booking-section">
        <div class="edit-booking-section-title">Prenotazione</div>
        <div class="edit-booking-grid">
          <div class="edit-booking-field">
            <label>N. prenotazione / PNR</label>
            <input type="text" data-field="bookingReference" value="${escAttr(bus.bookingReference)}">
          </div>
          <div class="edit-booking-field">
            <label>Stato</label>
            <input type="text" data-field="status" value="${escAttr(bus.status)}" placeholder="es. Confermato">
          </div>
          ${full ? `
          <div class="edit-booking-field full-width">
            <label>Note</label>
            <textarea data-field="notes" rows="2" placeholder="Aggiungi note...">${escAttr(bus.notes)}</textarea>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Sezione 4: Passeggeri -->
      <div class="edit-booking-section">
        <div class="edit-booking-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Passeggeri</span>
          <button type="button" class="bus-add-passenger-btn" style="font-size:12px;color:var(--primary);background:none;border:none;cursor:pointer;padding:0">+ Aggiungi passeggero</button>
        </div>
        <div class="bus-passengers-list">
          ${passengerRowsHtml || buildBusPassengerRow({ name: '', seat: '' }, 0)}
        </div>
      </div>

      <!-- Sezione 5: Prezzo -->
      <div class="edit-booking-section">
        <div class="edit-booking-section-title">Prezzo</div>
        <div class="edit-booking-grid">
          <div class="edit-booking-field">
            <label>Totale</label>
            <input type="number" data-field="price.value" value="${priceVal}" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="edit-booking-field">
            <label>Valuta</label>
            <input type="text" data-field="price.currency" value="${escAttr(priceCur)}" placeholder="EUR" maxlength="3" style="text-transform:uppercase">
          </div>
          ${full ? `
          <div class="edit-booking-field full-width">
            <label>Policy cancellazione</label>
            <input type="text" data-field="cancellationPolicy" value="${escAttr(bus.cancellationPolicy)}" placeholder="es. Non rimborsabile">
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function buildBusPassengerRow(pax, index) {
    pax = pax || {};
    const parts = (pax.name || '').trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return `
      <div class="bus-passenger-row edit-booking-grid" style="margin-top:8px;position:relative">
        <div class="edit-booking-field">
          <label>Nome</label>
          <input type="text" data-pax-field="firstName" value="${escAttr(firstName)}" placeholder="Nome">
        </div>
        <div class="edit-booking-field">
          <label>Cognome</label>
          <input type="text" data-pax-field="lastName" value="${escAttr(lastName)}" placeholder="Cognome">
        </div>
        <div class="edit-booking-field">
          <label>Posto</label>
          <input type="text" data-pax-field="seat" value="${escAttr(pax.seat || '')}" placeholder="es. 12A">
        </div>
        ${index > 0 ? `<button type="button" class="bus-remove-passenger-btn" style="position:absolute;top:0;right:0;background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:16px;padding:0 4px" title="Rimuovi">×</button>` : ''}
      </div>
    `;
  }

  /**
   * Collect updates from bus form sections (used by parsePreview _applyEdits).
   * @param {HTMLElement} formView
   * @returns {Object}
   */
  function collectBusFormUpdates(formView) {
    return collectBusUpdates(formView);
  }

  /**
   * Attach event listeners for dynamic passenger list in bus form.
   * @param {HTMLElement} formEl
   */
  function attachBusFormListeners(formEl) {
    const addBtn = formEl.querySelector('.bus-add-passenger-btn');
    const list = formEl.querySelector('.bus-passengers-list');
    if (!addBtn || !list) return;

    addBtn.addEventListener('click', () => {
      const rows = list.querySelectorAll('.bus-passenger-row');
      const newRow = document.createElement('div');
      newRow.innerHTML = buildBusPassengerRow({}, rows.length);
      const rowEl = newRow.firstElementChild;
      list.appendChild(rowEl);

      // Bind remove button
      const removeBtn = rowEl.querySelector('.bus-remove-passenger-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => rowEl.remove());
      }
    });

    // Bind existing remove buttons (index > 0)
    list.querySelectorAll('.bus-remove-passenger-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.bus-passenger-row').remove());
    });
  }

  window.tripBuses = {
    render: renderBuses,
    renderDetails: renderBusDetails,
    buildEditForm: buildBusEditForm,
    collectUpdates: collectBusUpdates,
    buildFullEditForm: buildBusEditForm,
    collectFullUpdates: collectBusUpdates,
    // Exposed for parse preview integration (same pattern as tripHotels)
    buildFormSections: buildBusFormSections,
    collectFormUpdates: collectBusFormUpdates,
    attachFormListeners: attachBusFormListeners
  };
})();
