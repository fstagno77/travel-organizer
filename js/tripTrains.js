/**
 * Trip Trains - Trains tab rendering and logic
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

  function isTrainPast(train) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (train.date < today) return true;
    if (train.date === today && train.arrival?.time) {
      const [h, m] = train.arrival.time.split(':').map(Number);
      return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
    }
    return train.date < today;
  }

  function renderTrains(container, trains) {
    if (!container) return;
    if (!trains || trains.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noTrains">Nessun treno</h3>
          <p class="empty-state-text" data-i18n="trip.noTrainsText">Aggiungi una prenotazione per visualizzare i tuoi treni</p>
          <button class="btn btn-primary empty-state-cta" id="empty-add-train">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span data-i18n="trip.addBooking">Aggiungi prenotazione</span>
          </button>
        </div>
      `;
      i18n.apply(container);
      const addBtn = container.querySelector('#empty-add-train');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const tripId = new URLSearchParams(window.location.search).get('id');
          if (tripId) window.tripPage.showAddBookingModal(tripId);
        });
      }
      return;
    }

    const lang = i18n.getLang();

    const sortedTrains = [...trains].sort((a, b) => {
      const aPast = isTrainPast(a);
      const bPast = isTrainPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedTrains.map((train, index) => {
      const formattedDate = utils.formatFlightDate(train.date, lang);
      const isPast = isTrainPast(train);

      const depStation = toTitleCase(train.departure?.station || train.departure?.city || '');
      const arrStation = toTitleCase(train.arrival?.station || train.arrival?.city || '');
      const depCity = toTitleCase(train.departure?.city || '');
      const arrCity = toTitleCase(train.arrival?.city || '');

      // Calcola durata dal tempo di partenza e arrivo
      const duration = calcDuration(train.departure?.time, train.arrival?.time);
      const durationStr = duration ? utils.formatDuration(duration, lang) : '';

      return `
        <div class="train-card${isPast ? ' past' : ''}" data-id="${train.id}">
          <div class="train-card-header">
            <span class="train-header-date">${esc(formattedDate)}</span>
            <span class="train-header-number">${esc(train.trainNumber || '')}</span>
          </div>

          <div class="train-card-body">
            <div class="train-title-section">
              <h3 class="train-title">Da ${esc(depCity || depStation)} a ${esc(arrCity || arrStation)}</h3>
              ${train.operator ? `<span class="train-operator">${esc(train.operator)}</span>` : ''}
            </div>

            <div class="train-route">
              <div class="train-endpoint">
                <div class="train-time-lg">${esc(train.departure?.time || '')}</div>
                <div class="train-station-name">${esc(depStation)}</div>
              </div>

              <div class="train-arc">
                <div class="train-arc-line">
                  <svg class="train-arc-img" width="160" height="28" viewBox="0 0 160 28" fill="none">
                    <line x1="4" y1="14" x2="156" y2="14" stroke="#22c55e" stroke-width="3" stroke-dasharray="10 6" stroke-linecap="round"/>
                  </svg>
                  <div class="train-arc-vehicle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-train-600)"><path d="M12 2C8 2 4 3 4 7v9.5C4 18.43 5.57 20 7.5 20L6 21.5v.5h2l2-2h4l2 2h2v-.5L16.5 20c1.93 0 3.5-1.57 3.5-3.5V7c0-4-4-5-8-5m-1.5 16h-3C6.67 18 6 17.33 6 16.5S6.67 15 7.5 15h3v3m5.5 0h-3v-3h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5M18 13H6V7h12v6Z"/></svg>
                  </div>
                </div>
                ${durationStr ? `<div class="train-duration">${esc(durationStr)}</div>` : ''}
              </div>

              <div class="train-endpoint">
                <div class="train-time-lg">${esc(train.arrival?.time || '')}</div>
                <div class="train-station-name">${esc(arrStation)}</div>
              </div>
            </div>
          </div>

          <button class="train-toggle-details" data-train-index="${index}">
            <span data-i18n="flight.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="train-details" id="train-details-${index}" data-train-index="${index}"></div>
        </div>
      `;
    }).join('');

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei treni <span class="beta-badge">Beta</span></h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-outline train-cta-outline" id="trains-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html;
    window.tripTrains._trains = sortedTrains;
    i18n.apply(container);

    const manageBtn = document.getElementById('trains-manage-booking-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showManageBookingPanel(tripId);
      });
    }
  }

  function renderTrainDetails(train, index) {
    const priceStr = train.price?.value
      ? `${train.price.value} ${train.price.currency || '€'}`
      : '';

    const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const downloadIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    return `
      <div class="train-details-box">
        <div class="train-details-grid">
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.bookingRef">Riferimento</span>
            <span class="train-detail-value">
              ${esc(train.bookingReference || '-')}
              ${train.bookingReference ? `<button class="btn-copy-value" data-copy="${esc(train.bookingReference)}" title="Copia">${copyIcon}</button>` : ''}
            </span>
          </div>
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.ticketNumber">Biglietto</span>
            <span class="train-detail-value">
              ${esc(train.ticketNumber || '-')}
              ${train.ticketNumber ? `<button class="btn-copy-value" data-copy="${esc(train.ticketNumber)}" title="Copia">${copyIcon}</button>` : ''}
            </span>
          </div>
        </div>
        <div class="train-details-grid">
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.class">Classe</span>
            <span class="train-detail-value">${esc(train.class || '-')}</span>
          </div>
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.seat">Posto</span>
            <span class="train-detail-value">${esc(train.seat || '-')}</span>
          </div>
        </div>
        <div class="train-details-grid">
          ${train.coach ? `
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.coach">Carrozza</span>
            <span class="train-detail-value">${esc(train.coach)}</span>
          </div>
          ` : ''}
          ${train.passenger?.name ? `
          <div class="train-detail-item">
            <span class="train-detail-label" data-i18n="train.passenger">Passeggero</span>
            <span class="train-detail-value">${esc(train.passenger.name)}</span>
          </div>
          ` : ''}
        </div>
      </div>

      ${priceStr ? `
      <div class="train-price-box">
        <span class="train-price-label" data-i18n="train.price">Prezzo</span>
        <span class="train-price-amount">${esc(priceStr)}</span>
      </div>
      ` : ''}

      <div class="train-actions">
        ${train.pdfPath ? `
        <button class="train-btn train-btn--primary btn-download-pdf" data-pdf-path="${train.pdfPath}">
          ${downloadIcon}
          <span data-i18n="train.booking">Prenotazione</span>
        </button>
        ` : `<div></div>`}
        <button class="train-btn train-btn--outline btn-edit-item" data-type="train" data-id="${train.id}">
          ${editIcon}
          <span data-i18n="train.edit">Modifica</span>
        </button>
        <button class="train-btn train-btn--danger btn-delete-item" data-type="train" data-id="${train.id}">
          ${trashIcon}
          <span data-i18n="train.delete">Elimina</span>
        </button>
      </div>
    `;
  }

  function buildTrainEditForm(train) {
    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Treno</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Data</label>
              <input type="date" data-field="date" value="${escAttr(train.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>Numero treno</label>
              <input type="text" data-field="trainNumber" value="${escAttr(train.trainNumber)}">
            </div>
            <div class="edit-booking-field">
              <label>Operatore</label>
              <input type="text" data-field="operator" value="${escAttr(train.operator)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Partenza</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Stazione</label>
              <input type="text" data-field="departure.station" value="${escAttr(train.departure?.station)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="departure.city" value="${escAttr(train.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="departure.time" value="${escAttr(train.departure?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Arrivo</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Stazione</label>
              <input type="text" data-field="arrival.station" value="${escAttr(train.arrival?.station)}">
            </div>
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="arrival.city" value="${escAttr(train.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="arrival.time" value="${escAttr(train.arrival?.time)}">
            </div>
          </div>
        </div>
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Prenotazione</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Riferimento</label>
              <input type="text" data-field="bookingReference" value="${escAttr(train.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>Classe</label>
              <input type="text" data-field="class" value="${escAttr(train.class)}">
            </div>
            <div class="edit-booking-field">
              <label>Posto</label>
              <input type="text" data-field="seat" value="${escAttr(train.seat)}">
            </div>
            <div class="edit-booking-field">
              <label>Carrozza</label>
              <input type="text" data-field="coach" value="${escAttr(train.coach)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function collectTrainUpdates(formView) {
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

  window.tripTrains = {
    render: renderTrains,
    renderDetails: renderTrainDetails,
    buildEditForm: buildTrainEditForm,
    collectUpdates: collectTrainUpdates,
    buildFullEditForm: buildTrainEditForm,
    collectFullUpdates: collectTrainUpdates
  };
})();
