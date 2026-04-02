/**
 * Trip Ferries - Ferries tab rendering and logic
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

  function isFerryPast(ferry) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (ferry.date < today) return true;
    if (ferry.date === today && ferry.arrival?.time) {
      const [h, m] = ferry.arrival.time.split(':').map(Number);
      return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
    }
    return ferry.date < today;
  }

  function renderFerries(container, ferries) {
    if (!container) return;
    if (!ferries || ferries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFerries">Nessun traghetto</h3>
          <p class="empty-state-text" data-i18n="trip.noFerriesText">Aggiungi una prenotazione per visualizzare i tuoi traghetti</p>
          <button class="btn btn-primary empty-state-cta" id="empty-add-ferry">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span data-i18n="trip.addBooking">Aggiungi prenotazione</span>
          </button>
        </div>
      `;
      i18n.apply(container);
      const addBtn = container.querySelector('#empty-add-ferry');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const tripId = new URLSearchParams(window.location.search).get('id');
          if (tripId) window.tripPage.showAddBookingModal(tripId);
        });
      }
      return;
    }

    const lang = i18n.getLang();

    const sortedFerries = [...ferries].sort((a, b) => {
      const aPast = isFerryPast(a);
      const bPast = isFerryPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedFerries.map((ferry, index) => {
      const formattedDate = utils.formatFlightDate(ferry.date, lang);
      const isPast = isFerryPast(ferry);

      const depPort = toTitleCase(ferry.departure?.port || ferry.departure?.city || '');
      const arrPort = toTitleCase(ferry.arrival?.port || ferry.arrival?.city || '');
      const depCity = toTitleCase(ferry.departure?.city || '');
      const arrCity = toTitleCase(ferry.arrival?.city || '');

      // Calcola durata dal tempo di partenza e arrivo
      const duration = ferry.duration || calcDuration(ferry.departure?.time, ferry.arrival?.time);
      const durationStr = duration ? utils.formatDuration(duration, lang) : '';

      return `
        <div class="ferry-card${isPast ? ' past' : ''}" data-id="${ferry.id}">
          <div class="ferry-card-header">
            <span class="ferry-header-date">${esc(formattedDate)}</span>
            ${ferry.routeNumber ? `<span class="ferry-header-route">${esc(ferry.routeNumber)}</span>` : ''}
          </div>

          <div class="ferry-card-body">
            <div class="ferry-title-section">
              <h3 class="ferry-title">Da ${esc(depCity || depPort)} a ${esc(arrCity || arrPort)}</h3>
              ${ferry.operator ? `<span class="ferry-operator">${esc(ferry.operator)}</span>` : ''}
              ${ferry.ferryName ? `<span class="ferry-name">${esc(ferry.ferryName)}</span>` : ''}
            </div>

            <div class="ferry-route">
              <div class="ferry-endpoint">
                ${ferry.departure?.time ? `<div class="ferry-time-lg">${esc(ferry.departure.time)}</div>` : ''}
                <div class="ferry-port-name">${esc(depPort)}</div>
              </div>

              <div class="ferry-arc">
                <div class="ferry-arc-line">
                  <svg class="ferry-arc-img" width="160" height="28" viewBox="0 0 160 28" fill="none">
                    <path d="M4 20 C20 20 20 8 40 8 C60 8 60 20 80 20 C100 20 100 8 120 8 C140 8 140 20 156 20" stroke="#0369a1" stroke-width="3" stroke-dasharray="10 6" stroke-linecap="round" fill="none"/>
                  </svg>
                  <div class="ferry-arc-vehicle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-ferry-600, #0369a1)"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.39 0 2.78-.47 4-1.32 2.44 1.71 5.56 1.71 8 0 1.22.85 2.61 1.32 4 1.32h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L19 10.62V6c0-1.1-.9-2-2-2h-3V1H10v3H7c-1.1 0-2 .9-2 2v4.62l-2.29.68c-.26.08-.48.26-.6.5s-.14.52-.06.78L3.95 19zM7 6h10v3.97L12 8 7 9.97V6z"/></svg>
                  </div>
                </div>
                ${durationStr ? `<div class="ferry-duration">${esc(durationStr)}</div>` : ''}
              </div>

              <div class="ferry-endpoint">
                ${ferry.arrival?.time ? `<div class="ferry-time-lg">${esc(ferry.arrival.time)}</div>` : ''}
                <div class="ferry-port-name">${esc(arrPort)}</div>
              </div>
            </div>
          </div>

          <button class="ferry-toggle-details" data-ferry-index="${index}">
            <span data-i18n="flight.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="ferry-details" id="ferry-details-${index}" data-ferry-index="${index}"></div>
        </div>
      `;
    }).join('');

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei traghetti <span class="beta-badge">Beta</span></h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-outline ferry-cta-outline" id="ferries-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html;
    window.tripFerries._ferries = sortedFerries;
    i18n.apply(container);

    const manageBtn = document.getElementById('ferries-manage-booking-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showManageBookingPanel(tripId);
      });
    }
  }

  function renderFerryDetails(ferry, index) {
    const priceStr = ferry.price?.value
      ? `${ferry.price.value} ${ferry.price.currency || '€'}`
      : '';

    const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const downloadIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    // Passeggeri: array o singolo oggetto
    const passengers = ferry.passengers?.length
      ? ferry.passengers
      : (ferry.passenger?.name ? [ferry.passenger] : []);

    // Veicoli
    const vehicles = ferry.vehicles?.length ? ferry.vehicles : [];

    return `
      <div class="ferry-details-box">
        <div class="ferry-details-grid">
          <div class="ferry-detail-item">
            <span class="ferry-detail-label" data-i18n="ferry.booking_reference">Riferimento</span>
            <span class="ferry-detail-value">
              ${esc(ferry.bookingReference || '-')}
              ${ferry.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(ferry.bookingReference)}" title="Copia">${copyIcon}</button>` : ''}
            </span>
          </div>
          ${ferry.ticketNumber ? `
          <div class="ferry-detail-item">
            <span class="ferry-detail-label">Biglietto</span>
            <span class="ferry-detail-value">
              ${esc(ferry.ticketNumber)}
              <button class="btn-copy-value" data-copy="${esc(ferry.ticketNumber)}" title="Copia">${copyIcon}</button>
            </span>
          </div>
          ` : ''}
        </div>
        ${ferry.cabin || ferry.deck ? `
        <div class="ferry-details-grid">
          ${ferry.cabin ? `
          <div class="ferry-detail-item">
            <span class="ferry-detail-label" data-i18n="ferry.cabin">Cabina</span>
            <span class="ferry-detail-value">${esc(ferry.cabin)}</span>
          </div>
          ` : ''}
          ${ferry.deck ? `
          <div class="ferry-detail-item">
            <span class="ferry-detail-label" data-i18n="ferry.deck">Ponte</span>
            <span class="ferry-detail-value">${esc(ferry.deck)}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
        ${passengers.length > 0 ? `
        <div class="ferry-details-grid">
          <div class="ferry-detail-item">
            <span class="ferry-detail-label">Passeggeri</span>
            <span class="ferry-detail-value">${passengers.map(p => esc(p.name || '')).filter(Boolean).join(', ')}</span>
          </div>
        </div>
        ` : ''}
        ${vehicles.length > 0 ? `
        <div class="ferry-details-grid">
          <div class="ferry-detail-item">
            <span class="ferry-detail-label" data-i18n="ferry.vehicle">Veicolo</span>
            <span class="ferry-detail-value">${vehicles.map(v => [v.type, v.plate].filter(Boolean).map(s => esc(s)).join(' ')).join(', ')}</span>
          </div>
        </div>
        ` : ''}
      </div>

      ${priceStr ? `
      <div class="ferry-price-box">
        <span class="ferry-price-label">Prezzo</span>
        <span class="ferry-price-amount">${esc(priceStr)}</span>
      </div>
      ` : ''}

      <div class="ferry-actions">
        ${ferry.pdfPath ? `
        <button class="ferry-btn ferry-btn--primary btn-download-pdf" data-pdf-path="${ferry.pdfPath}">
          ${downloadIcon}
          <span>Prenotazione</span>
        </button>
        ` : `<div></div>`}
        <button class="ferry-btn ferry-btn--outline btn-edit-item" data-type="ferry" data-id="${ferry.id}">
          ${editIcon}
          <span>Modifica</span>
        </button>
        <button class="ferry-btn ferry-btn--danger btn-delete-item" data-type="ferry" data-id="${ferry.id}">
          ${trashIcon}
          <span>Elimina</span>
        </button>
      </div>
    `;
  }

  const PASSENGER_TYPE_OPTIONS = [
    { value: 'ADT', label: 'ADT' },
    { value: 'CHD', label: 'CHD' },
    { value: 'INF', label: 'INF' }
  ];
  const VEHICLE_TYPE_OPTIONS = [
    { value: 'auto',    label: 'Auto' },
    { value: 'moto',    label: 'Moto' },
    { value: 'camper',  label: 'Camper' },
    { value: 'furgone', label: 'Furgone' }
  ];

  /**
   * Upgrade all cs-placeholder divs inside a container to CustomSelect instances.
   * Called after HTML is inserted into the DOM.
   */
  function upgradeCustomSelects(container) {
    container.querySelectorAll('[data-cs-pax-type]').forEach(ph => {
      const cs = window.CustomSelect.create({
        options: PASSENGER_TYPE_OPTIONS,
        selected: ph.dataset.csPaxType || 'ADT',
        className: 'cs-pax-type',
        dataAttrs: {
          paxField: 'type',
          paxIndex: ph.dataset.paxIndex || ''
        }
      });
      ph.replaceWith(cs);
    });
    container.querySelectorAll('[data-cs-veh-type]').forEach(ph => {
      const cs = window.CustomSelect.create({
        options: VEHICLE_TYPE_OPTIONS,
        selected: ph.dataset.csVehType || 'auto',
        className: 'cs-veh-type',
        dataAttrs: {
          vehField: 'type',
          vehIndex: ph.dataset.vehIndex || ''
        }
      });
      ph.replaceWith(cs);
    });
  }

  function buildPassengerRow(p, idx) {
    return `
      <div class="edit-booking-passenger-row" data-passenger-index="${idx}">
        <div class="edit-booking-field" style="flex:1">
          <label>Nome</label>
          <input type="text" data-pax-field="name" data-pax-index="${idx}" value="${escAttr(p.name)}">
        </div>
        <div class="edit-booking-field" style="width:90px">
          <label>Tipo</label>
          <div data-cs-pax-type="${escAttr(p.type || 'ADT')}" data-pax-index="${idx}"></div>
        </div>
        <button type="button" class="edit-booking-remove-row" title="Rimuovi passeggero">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }

  function buildVehicleRow(v, idx) {
    return `
      <div class="edit-booking-vehicle-row" data-vehicle-index="${idx}">
        <div class="edit-booking-field" style="width:110px">
          <label>Tipo</label>
          <div data-cs-veh-type="${escAttr(v.type || 'auto')}" data-veh-index="${idx}"></div>
        </div>
        <div class="edit-booking-field" style="flex:1">
          <label>Targa</label>
          <input type="text" data-veh-field="plate" data-veh-index="${idx}" value="${escAttr(v.plate)}">
        </div>
        <button type="button" class="edit-booking-remove-row" title="Rimuovi veicolo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }

  function buildFerryEditForm(ferry) {
    // Normalise passengers (may be array or single object)
    const passengers = ferry.passengers?.length
      ? ferry.passengers
      : (ferry.passenger?.name ? [ferry.passenger] : []);
    const vehicles = ferry.vehicles?.length ? ferry.vehicles : [];

    const passengerRowsHtml = passengers.map((p, idx) => buildPassengerRow(p, idx)).join('');
    const vehicleRowsHtml = vehicles.map((v, idx) => buildVehicleRow(v, idx)).join('');

    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Traghetto</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Data</label>
              <input type="date" data-field="date" value="${escAttr(ferry.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>Operatore</label>
              <input type="text" data-field="operator" value="${escAttr(ferry.operator)}">
            </div>
            <div class="edit-booking-field">
              <label>Nome nave</label>
              <input type="text" data-field="ferryName" value="${escAttr(ferry.ferryName)}">
            </div>
            <div class="edit-booking-field">
              <label>Numero rotta</label>
              <input type="text" data-field="routeNumber" value="${escAttr(ferry.routeNumber)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Partenza</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Porto</label>
              <input type="text" data-field="departure.port" value="${escAttr(ferry.departure?.port)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="departure.city" value="${escAttr(ferry.departure?.city)}">
            </div>
            <div class="edit-booking-field full-width">
              <label>Orario</label>
              <input type="time" data-field="departure.time" value="${escAttr(ferry.departure?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Arrivo</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Porto</label>
              <input type="text" data-field="arrival.port" value="${escAttr(ferry.arrival?.port)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="arrival.city" value="${escAttr(ferry.arrival?.city)}">
            </div>
            <div class="edit-booking-field full-width">
              <label>Orario</label>
              <input type="time" data-field="arrival.time" value="${escAttr(ferry.arrival?.time)}">
            </div>
          </div>
        </div>
        <!-- Pulsante Aggiungi ritorno -->
        <div class="edit-booking-section" style="margin-top:24px">
          <button type="button" class="btn btn-outline ferry-add-return-btn"
            style="display:flex;align-items:center;gap:6px;width:100%;justify-content:center;"
            data-add-return>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 96 960 960" fill="currentColor" style="flex-shrink:0">
              <path d="M280 896 80 696l200-200 57 57-103 103h526v80H234l103 103-57 57Zm400-344-57-57 103-103H200v-80h526L623 209l57-57 200 200-200 200Z"/>
            </svg>
            <span data-i18n="ferry.add_return">Aggiungi ritorno</span>
          </button>
        </div>

        <!-- Sezione ritorno (nascosta di default) -->
        <div class="edit-booking-section" style="display:none;margin-top:16px;background:var(--color-blue-50,#eff6ff);border:1px solid var(--color-blue-200,#bfdbfe);border-radius:10px;padding:16px;" data-return-section>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--color-blue-200,#bfdbfe);">
            <span class="edit-booking-section-title" style="margin:0;" data-i18n="ferry.return_trip">Viaggio di ritorno</span>
            <button type="button" class="ferry-remove-return-btn"
              style="background:none;border:none;cursor:pointer;color:var(--color-gray-500);padding:2px;display:flex;align-items:center;"
              aria-label="Rimuovi ritorno" data-remove-return>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Data <span style="color:var(--color-danger,#e53e3e)">*</span></label>
              <input type="date" data-return-field="date" value="">
            </div>
            <div class="edit-booking-field">
              <label>Operatore</label>
              <input type="text" data-return-field="operator" value="${escAttr(ferry.operator)}">
            </div>
            <div class="edit-booking-field">
              <label>Nome nave</label>
              <input type="text" data-return-field="ferryName" value="${escAttr(ferry.ferryName)}">
            </div>
          </div>
          <div class="edit-booking-section-title" style="font-size:var(--font-size-xs);margin-top:12px;">Partenza</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Porto</label>
              <input type="text" data-return-field="departure.port" value="${escAttr(ferry.arrival?.port)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-return-field="departure.city" value="${escAttr(ferry.arrival?.city)}">
            </div>
            <div class="edit-booking-field full-width">
              <label>Orario</label>
              <input type="time" data-return-field="departure.time" value="">
            </div>
          </div>
          <div class="edit-booking-section-title" style="font-size:var(--font-size-xs);margin-top:12px;">Arrivo</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Porto</label>
              <input type="text" data-return-field="arrival.port" value="${escAttr(ferry.departure?.port)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-return-field="arrival.city" value="${escAttr(ferry.departure?.city)}">
            </div>
            <div class="edit-booking-field full-width">
              <label>Orario</label>
              <input type="time" data-return-field="arrival.time" value="">
            </div>
          </div>
        </div>

        <div class="edit-booking-section" style="margin-top:24px">
          <div class="edit-booking-section-title">Prenotazione</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Riferimento</label>
              <input type="text" data-field="bookingReference" value="${escAttr(ferry.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>Cabina</label>
              <input type="text" data-field="cabin" value="${escAttr(ferry.cabin)}">
            </div>
            <div class="edit-booking-field">
              <label>Ponte</label>
              <input type="text" data-field="deck" value="${escAttr(ferry.deck)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section" style="margin-top:24px">
          <div class="edit-booking-section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span>Passeggeri</span>
            <button type="button" class="edit-booking-add-row" data-add-passenger style="margin:0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Aggiungi passeggero
            </button>
          </div>
          <div class="edit-booking-passengers-list" data-passengers>
            ${passengerRowsHtml}
          </div>
        </div>
        <div class="edit-booking-section" style="margin-top:24px">
          <div class="edit-booking-section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span>Veicoli a bordo</span>
            <button type="button" class="edit-booking-add-row" data-add-vehicle style="margin:0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Aggiungi veicolo
            </button>
          </div>
          <div class="edit-booking-vehicles-list" data-vehicles>
            ${vehicleRowsHtml}
          </div>
        </div>
        <div class="edit-booking-section" style="margin-top:24px" data-doc-section>
          <div class="edit-booking-section-title">Documento</div>
          ${(ferry.pdfPath || ferry.documentUrl) ? `
            <div class="ferry-doc-existing" data-existing-doc>
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--color-gray-200);border-radius:8px;background:var(--color-gray-50,#f9fafb)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <span style="font-size:var(--font-size-sm);color:var(--color-gray-700);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(ferry.pdfPath || ferry.documentUrl || '').split('/').pop().replace(/\.[^.]+$/, '') || 'documento.pdf'}</span>
                <a href="${escAttr(ferry.pdfPath || ferry.documentUrl)}" target="_blank" rel="noopener" title="Apri" style="display:flex;align-items:center;color:var(--color-primary);flex-shrink:0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <button type="button" class="ferry-doc-remove-btn" title="Rimuovi" style="display:flex;align-items:center;background:none;border:none;cursor:pointer;color:var(--color-gray-400);padding:0;flex-shrink:0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>
          ` : ''}
          <div class="ferry-doc-upload" data-doc-upload ${(ferry.pdfPath || ferry.documentUrl) ? 'style="display:none"' : ''}>
            <label class="file-upload-zone" data-doc-drop-zone style="cursor:pointer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span class="file-upload-zone-text">Carica PDF</span>
              <span class="file-upload-zone-hint">PDF — max 10 MB</span>
              <input type="file" accept="application/pdf" data-doc-input style="display:none">
            </label>
            <div class="ferry-doc-selected" data-doc-selected style="display:none"></div>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Attach add/remove row behaviour for ferry passengers and vehicles.
   * Must be called after the form HTML is inserted into the DOM.
   */
  function attachFerryFormListeners(formEl) {
    function attachRemoveListeners(list, rowClass) {
      list.querySelectorAll('.edit-booking-remove-row').forEach(btn => {
        const fresh = btn.cloneNode(true);
        btn.replaceWith(fresh);
        fresh.addEventListener('click', () => {
          fresh.closest('.' + rowClass).remove();
        });
      });
    }

    // Upgrade placeholder divs → CustomSelect for all existing rows
    upgradeCustomSelects(formEl);

    // Add passenger
    const addPaxBtn = formEl.querySelector('[data-add-passenger]');
    const paxList = formEl.querySelector('[data-passengers]');
    if (addPaxBtn && paxList) {
      attachRemoveListeners(paxList, 'edit-booking-passenger-row');
      addPaxBtn.addEventListener('click', () => {
        const idx = paxList.querySelectorAll('.edit-booking-passenger-row').length;
        const tmp = document.createElement('div');
        tmp.innerHTML = buildPassengerRow({ name: '', type: 'ADT' }, idx);
        const row = tmp.firstElementChild;
        // The placeholder div is in tmp — upgrade it before appending to DOM
        upgradeCustomSelects(row);
        paxList.appendChild(row);
        row.querySelector('.edit-booking-remove-row').addEventListener('click', () => row.remove());
        row.querySelector('input').focus();
      });
    }

    // Add vehicle
    const addVehBtn = formEl.querySelector('[data-add-vehicle]');
    const vehList = formEl.querySelector('[data-vehicles]');
    if (addVehBtn && vehList) {
      attachRemoveListeners(vehList, 'edit-booking-vehicle-row');
      addVehBtn.addEventListener('click', () => {
        const idx = vehList.querySelectorAll('.edit-booking-vehicle-row').length;
        const tmp = document.createElement('div');
        tmp.innerHTML = buildVehicleRow({ type: 'auto', plate: '' }, idx);
        const row = tmp.firstElementChild;
        // The placeholder div is in tmp — upgrade it before appending to DOM
        upgradeCustomSelects(row);
        vehList.appendChild(row);
        row.querySelector('.edit-booking-remove-row').addEventListener('click', () => row.remove());
        row.querySelector('input').focus();
      });
    }

    // Add return trip toggle
    const addReturnBtn = formEl.querySelector('[data-add-return]');
    const returnSection = formEl.querySelector('[data-return-section]');
    const removeReturnBtn = formEl.querySelector('[data-remove-return]');

    if (addReturnBtn && returnSection) {
      addReturnBtn.addEventListener('click', () => {
        addReturnBtn.closest('.edit-booking-section').style.display = 'none';
        returnSection.style.display = '';
        if (window.i18n) window.i18n.apply(returnSection);
      });
    }
    if (removeReturnBtn && returnSection && addReturnBtn) {
      removeReturnBtn.addEventListener('click', () => {
        returnSection.style.display = 'none';
        addReturnBtn.closest('.edit-booking-section').style.display = '';
        // Reset campi ritorno
        returnSection.querySelectorAll('input[data-return-field]').forEach(inp => {
          if (inp.type === 'date' || inp.type === 'time') inp.value = '';
        });
      });
    }

    // Document section
    const docSection = formEl.querySelector('[data-doc-section]');
    if (docSection) {
      const existingDocEl = docSection.querySelector('[data-existing-doc]');
      const uploadArea = docSection.querySelector('[data-doc-upload]');
      const docInput = docSection.querySelector('[data-doc-input]');
      const docSelected = docSection.querySelector('[data-doc-selected]');
      const dropZone = docSection.querySelector('[data-doc-drop-zone]');

      // Show selected file name
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

      // File input change
      if (docInput) {
        docInput.addEventListener('change', () => {
          if (docInput.files[0]) {
            // If user selects a new file, clear any removal sentinel
            const existingSentinel = formEl.querySelector('[data-doc-remove]');
            if (existingSentinel) existingSentinel.dataset.docRemove = '0';
            showSelectedFile(docInput.files[0]);
          }
        });
      }

      // Drag & drop
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

      // Remove existing document
      const removeBtn = existingDocEl ? existingDocEl.querySelector('.ferry-doc-remove-btn') : null;
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          // Mark as removed: hidden input with null sentinel
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

      // Replace existing document — show upload zone, keep existing visible until new file chosen
      const replaceBtn = existingDocEl ? existingDocEl.querySelector('.ferry-doc-replace-btn') : null;
      if (replaceBtn) {
        replaceBtn.addEventListener('click', () => {
          if (uploadArea) uploadArea.style.display = '';
          if (existingDocEl) existingDocEl.style.display = 'none';
        });
      }
    }
  }

  function collectFerryUpdates(formView) {
    const updates = {};

    // Standard input[data-field] fields
    formView.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      const field = el.dataset.field;
      const val = el.value.trim();
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

    // Document removal sentinel — if present and set, signal null to backend
    const removeSentinel = formView.querySelector('[data-doc-remove]');
    if (removeSentinel && removeSentinel.dataset.docRemove === '1') {
      updates.documentUrl = null;
      updates.pdfPath = null;
    }

    // Passengers
    const passengerRows = formView.querySelectorAll('.edit-booking-passenger-row');
    if (passengerRows.length > 0) {
      updates.passengers = Array.from(passengerRows).map(row => {
        const nameEl = row.querySelector('[data-pax-field="name"]');
        const typeCs = row.querySelector('.cs-pax-type');
        return {
          name: nameEl ? nameEl.value.trim() : '',
          type: typeCs ? window.CustomSelect.getValue(typeCs) : 'ADT'
        };
      }).filter(p => p.name);
    }

    // Vehicles
    const vehicleRows = formView.querySelectorAll('.edit-booking-vehicle-row');
    if (vehicleRows.length > 0) {
      updates.vehicles = Array.from(vehicleRows).map(row => {
        const typeCs = row.querySelector('.cs-veh-type');
        const plateEl = row.querySelector('[data-veh-field="plate"]');
        return {
          type: typeCs ? window.CustomSelect.getValue(typeCs) : 'auto',
          plate: plateEl ? plateEl.value.trim().toUpperCase() : ''
        };
      });
    }

    return updates;
  }

  /**
   * Raccoglie i dati della sezione "Viaggio di ritorno" dal pannello di modifica.
   * Restituisce null se la sezione non è visibile o la data non è compilata.
   * @param {HTMLElement} formView
   * @returns {Object|null}
   */
  function collectReturnValues(formView) {
    const returnSection = formView.querySelector('[data-return-section]');
    if (!returnSection || returnSection.style.display === 'none') return null;

    const dateEl = returnSection.querySelector('[data-return-field="date"]');
    if (!dateEl || !dateEl.value) return null;

    const get = (field) => {
      const el = returnSection.querySelector(`[data-return-field="${field}"]`);
      return el ? el.value.trim() : '';
    };

    return {
      date: dateEl.value,
      operator: get('operator') || undefined,
      ferryName: get('ferryName') || undefined,
      departure: {
        port: get('departure.port') || undefined,
        city: get('departure.city') || undefined,
        time: get('departure.time') || undefined,
      },
      arrival: {
        port: get('arrival.port') || undefined,
        city: get('arrival.city') || undefined,
        time: get('arrival.time') || undefined,
      },
    };
  }

  window.tripFerries = {
    render: renderFerries,
    renderFerries: renderFerries,
    renderDetails: renderFerryDetails,
    buildEditForm: buildFerryEditForm,
    attachFormListeners: attachFerryFormListeners,
    collectUpdates: collectFerryUpdates,
    collectReturnValues: collectReturnValues,
    buildFullEditForm: buildFerryEditForm,
    collectFullUpdates: collectFerryUpdates
  };
})();
