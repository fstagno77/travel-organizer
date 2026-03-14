/**
 * Trip Rentals - Car rentals tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

  function isRentalPast(rental) {
    const today = new Date().toISOString().split('T')[0];
    const endDate = rental.endDate || rental.date;
    return endDate < today;
  }

  /**
   * Formatta il prezzo da un oggetto { value, currency }
   */
  function formatPrice(priceObj) {
    if (!priceObj?.value) return '';
    const val = priceObj.value;
    const cur = priceObj.currency || 'EUR';
    const sym = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur;
    return `${sym}${Number(val).toFixed(2)}`;
  }

  /**
   * Render car rentals
   * @param {HTMLElement} container
   * @param {Array} rentals
   */
  function renderRentals(container, rentals) {
    if (!container) return;
    if (!rentals || rentals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noRentals">Nessun noleggio</h3>
          <p class="empty-state-text" data-i18n="trip.noRentalsText">Aggiungi una prenotazione per visualizzare i tuoi noleggi</p>
          <button class="btn btn-primary empty-state-cta" id="empty-add-rental">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span data-i18n="trip.addBooking">Aggiungi prenotazione</span>
          </button>
        </div>
      `;
      i18n.apply(container);
      const addBtn = container.querySelector('#empty-add-rental');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const tripId = new URLSearchParams(window.location.search).get('id');
          if (tripId) window.tripPage.showAddBookingModal(tripId);
        });
      }
      return;
    }

    const lang = i18n.getLang();

    const sortedRentals = [...rentals].sort((a, b) => {
      const aPast = isRentalPast(a);
      const bPast = isRentalPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedRentals.map((rental, index) => {
      const isPast = isRentalPast(rental);
      const formattedPickup = utils.formatFlightDate(rental.date, lang);
      const formattedDropoff = rental.endDate ? utils.formatFlightDate(rental.endDate, lang) : '';
      const pickupCity = rental.pickupLocation?.city || rental.pickupLocation?.address || '';
      const dropoffCity = rental.dropoffLocation?.city || rental.dropoffLocation?.address || '';
      const pickupTime = rental.pickupLocation?.time || '';
      const dropoffTime = rental.dropoffLocation?.time || '';
      const vehicle = [rental.vehicle?.category, rental.vehicle?.make, rental.vehicle?.model].filter(Boolean).join(' ');
      const priceStr = formatPrice(rental.totalAmount) || formatPrice(rental.price);

      return `
        <div class="rental-card${isPast ? ' past' : ''}" data-id="${rental.id}">
          <div class="rental-card-header">
            <div class="rental-provider">
              <svg class="rental-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.8L18 11l-2-4H8L6 11l-2.5.2C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
              <span class="rental-provider-name">${esc(rental.provider || 'Noleggio Auto')}</span>
            </div>
            <span class="rental-dates">${esc(formattedPickup)}${formattedDropoff && formattedDropoff !== formattedPickup ? ' → ' + esc(formattedDropoff) : ''}</span>
          </div>

          <div class="rental-card-body">
            <div class="rental-route">
              <div class="rental-endpoint">
                <div class="rental-endpoint-label">Ritiro</div>
                <div class="rental-endpoint-city">${esc(pickupCity || '—')}</div>
                ${pickupTime ? `<div class="rental-endpoint-time">${esc(pickupTime)}</div>` : ''}
              </div>
              <div class="rental-arc">
                <div class="rental-arc-line">
                  <svg class="rental-arc-img" width="120" height="28" viewBox="0 0 120 28" fill="none">
                    <line x1="14" y1="14" x2="106" y2="14" stroke="var(--color-rental-400)" stroke-width="2.5" stroke-dasharray="8 5" stroke-linecap="round"/>
                  </svg>
                  <div class="rental-arc-building rental-arc-building--left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-rental-600)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="17"/><path d="M3 11h18"/><path d="M9 11V5"/><path d="M15 11V5"/><rect x="10" y="15" width="4" height="7"/></svg>
                  </div>
                  <div class="rental-arc-building rental-arc-building--right">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-rental-600)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="17"/><path d="M3 11h18"/><path d="M9 11V5"/><path d="M15 11V5"/><rect x="10" y="15" width="4" height="7"/></svg>
                  </div>
                </div>
              </div>
              <div class="rental-endpoint rental-endpoint--right">
                <div class="rental-endpoint-label">Riconsegna</div>
                <div class="rental-endpoint-city">${esc(dropoffCity || '—')}</div>
                ${dropoffTime ? `<div class="rental-endpoint-time">${esc(dropoffTime)}</div>` : ''}
              </div>
            </div>
            ${vehicle ? `<div class="rental-vehicle-badge">${esc(vehicle)}</div>` : ''}
          </div>

          <button class="rental-toggle-details" data-rental-index="${index}">
            <span data-i18n="flight.showDetails">Dettagli</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="rental-details" id="rental-details-${index}" data-rental-index="${index}"></div>
        </div>
      `;
    }).join('');

    const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei noleggi</h2>
        <div class="section-header-actions">
          <button class="section-header-cta btn btn-outline rental-cta-outline" id="rentals-manage-booking-btn">
            ${editSvg}
            <span class="section-header-cta-label-full">Modifica</span>
            <span class="section-header-cta-label-short">Modifica</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = sectionHeader + html;
    window.tripRentals._rentals = sortedRentals;
    i18n.apply(container);

    const manageBtn = document.getElementById('rentals-manage-booking-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showManageBookingPanel(tripId);
      });
    }
  }

  /**
   * Genera l'HTML dei dettagli del noleggio (lazy — chiamato alla prima espansione)
   */
  function renderRentalDetails(rental, index) {
    const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    const ref = rental.bookingReference || rental.confirmationNumber;
    const priceStr = [formatPrice(rental.price), formatPrice(rental.totalAmount)].filter(Boolean).join(' / ') || '-';
    const insuranceStr = formatPrice(rental.insurance) || '-';
    const driverName = rental.driverName || (rental.passenger?.name) || '-';
    const vehicle = [rental.vehicle?.category, rental.vehicle?.make, rental.vehicle?.model].filter(Boolean).join(' ') || '-';
    const plate = rental.vehicle?.licensePlate || '-';
    const rentalDays = rental.rentalDays ? `${rental.rentalDays} giorni` : '-';
    const pickupAddress = rental.pickupLocation?.address || '-';
    const dropoffAddress = rental.dropoffLocation?.address || '-';

    return `
      <div class="rental-details-box">
        <div class="rental-details-grid">
          <div class="rental-detail-item">
            <span class="rental-detail-label">Riferimento</span>
            <span class="rental-detail-value">
              ${esc(ref || '-')}
              ${ref ? `<button class="btn-copy-value" data-copy="${esc(ref)}" title="Copia">${copyIcon}</button>` : ''}
            </span>
          </div>
          <div class="rental-detail-item">
            <span class="rental-detail-label">Conducente</span>
            <span class="rental-detail-value">${esc(driverName)}</span>
          </div>
          <div class="rental-detail-item">
            <span class="rental-detail-label">Veicolo</span>
            <span class="rental-detail-value">${esc(vehicle)}</span>
          </div>
          <div class="rental-detail-item">
            <span class="rental-detail-label">Targa</span>
            <span class="rental-detail-value">${esc(plate)}</span>
          </div>
          <div class="rental-detail-item">
            <span class="rental-detail-label">Durata</span>
            <span class="rental-detail-value">${esc(rentalDays)}</span>
          </div>
          <div class="rental-detail-item">
            <span class="rental-detail-label">Prezzo</span>
            <span class="rental-detail-value">${esc(priceStr)}</span>
          </div>
          ${insuranceStr !== '-' ? `
          <div class="rental-detail-item">
            <span class="rental-detail-label">Assicurazione</span>
            <span class="rental-detail-value">${esc(insuranceStr)}</span>
          </div>` : ''}
          ${pickupAddress !== '-' ? `
          <div class="rental-detail-item">
            <span class="rental-detail-label">Luogo ritiro</span>
            <span class="rental-detail-value">${esc(pickupAddress)}</span>
          </div>` : ''}
          ${dropoffAddress !== '-' ? `
          <div class="rental-detail-item">
            <span class="rental-detail-label">Luogo riconsegna</span>
            <span class="rental-detail-value">${esc(dropoffAddress)}</span>
          </div>` : ''}
        </div>
        <div class="rental-actions">
          ${rental.pdfPath ? `
          <button class="rental-btn rental-btn--primary btn-download-pdf" data-pdf-path="${rental.pdfPath}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Voucher</span>
          </button>
          ` : `<div></div>`}
          <button class="rental-btn rental-btn--outline btn-edit-item" data-type="rental" data-id="${rental.id}">
            ${editIcon}
            <span>Modifica noleggio</span>
          </button>
          <button class="rental-btn rental-btn--danger btn-delete-item" data-type="rental" data-id="${rental.id}">
            ${trashIcon}
            <span>Elimina noleggio</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Build rental edit form (per manage booking panel)
   */
  function buildEditForm(rental) {
    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Noleggio</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Fornitore</label>
              <input type="text" data-field="provider" value="${escAttr(rental.provider)}">
            </div>
            <div class="edit-booking-field">
              <label>Data ritiro</label>
              <input type="date" data-field="date" value="${escAttr(rental.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>Data riconsegna</label>
              <input type="date" data-field="endDate" value="${escAttr(rental.endDate)}">
            </div>
            <div class="edit-booking-field">
              <label>Conducente</label>
              <input type="text" data-field="driverName" value="${escAttr(rental.driverName)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Ritiro</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="pickupLocation.city" value="${escAttr(rental.pickupLocation?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="pickupLocation.time" value="${escAttr(rental.pickupLocation?.time)}">
            </div>
            <div class="edit-booking-field">
              <label>Indirizzo</label>
              <input type="text" data-field="pickupLocation.address" value="${escAttr(rental.pickupLocation?.address)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Riconsegna</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Città</label>
              <input type="text" data-field="dropoffLocation.city" value="${escAttr(rental.dropoffLocation?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>Orario</label>
              <input type="time" data-field="dropoffLocation.time" value="${escAttr(rental.dropoffLocation?.time)}">
            </div>
            <div class="edit-booking-field">
              <label>Indirizzo</label>
              <input type="text" data-field="dropoffLocation.address" value="${escAttr(rental.dropoffLocation?.address)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">Prenotazione</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>Riferimento</label>
              <input type="text" data-field="bookingReference" value="${escAttr(rental.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>Categoria veicolo</label>
              <input type="text" data-field="vehicle.category" value="${escAttr(rental.vehicle?.category)}">
            </div>
            <div class="edit-booking-field">
              <label>Marca</label>
              <input type="text" data-field="vehicle.make" value="${escAttr(rental.vehicle?.make)}">
            </div>
            <div class="edit-booking-field">
              <label>Modello</label>
              <input type="text" data-field="vehicle.model" value="${escAttr(rental.vehicle?.model)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Raccoglie i valori del form di modifica in un oggetto updates
   */
  function collectUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();

      if (field.startsWith('pickupLocation.')) {
        const prop = field.split('.')[1];
        if (!updates.pickupLocation) updates.pickupLocation = {};
        updates.pickupLocation[prop] = val;
      } else if (field.startsWith('dropoffLocation.')) {
        const prop = field.split('.')[1];
        if (!updates.dropoffLocation) updates.dropoffLocation = {};
        updates.dropoffLocation[prop] = val;
      } else if (field.startsWith('vehicle.')) {
        const prop = field.split('.')[1];
        if (!updates.vehicle) updates.vehicle = {};
        updates.vehicle[prop] = val;
      } else {
        updates[field] = val;
      }
    });
    return updates;
  }

  window.tripRentals = {
    render: renderRentals,
    renderDetails: renderRentalDetails,
    buildEditForm: buildEditForm,
    collectUpdates: collectUpdates,
    _rentals: []
  };
})();
