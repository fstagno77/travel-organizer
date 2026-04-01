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
                <div class="ferry-time-lg">${esc(ferry.departure?.time || '')}</div>
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
                <div class="ferry-time-lg">${esc(ferry.arrival?.time || '')}</div>
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

  function buildFerryEditForm(ferry) {
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
            <div class="edit-booking-field">
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
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="arrival.time" value="${escAttr(ferry.arrival?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
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
      </div>
    `;
  }

  function collectFerryUpdates(formView) {
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

  window.tripFerries = {
    render: renderFerries,
    renderFerries: renderFerries,
    renderDetails: renderFerryDetails,
    buildEditForm: buildFerryEditForm,
    collectUpdates: collectFerryUpdates,
    buildFullEditForm: buildFerryEditForm,
    collectFullUpdates: collectFerryUpdates
  };
})();
