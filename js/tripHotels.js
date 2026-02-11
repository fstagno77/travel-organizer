/**
 * Trip Hotels - Hotels tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

  /**
   * Render hotels
   * @param {HTMLElement} container
   * @param {Array} hotels
   */
  function renderHotels(container, hotels) {
    if (!hotels || hotels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noHotels">No hotels</h3>
          <p class="empty-state-text" data-i18n="trip.noHotelsText">No hotel information available</p>
        </div>
        <div class="quick-upload-card" id="quick-upload-hotels">
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
      window.tripPage.initQuickUploadCard('quick-upload-hotels');
      return;
    }

    const lang = i18n.getLang();

    // Sort hotels by check-in date
    const sortedHotels = [...hotels].sort((a, b) => {
      const dateA = new Date(a.checkIn?.date || '9999-12-31');
      const dateB = new Date(b.checkIn?.date || '9999-12-31');
      return dateA - dateB;
    });

    const html = sortedHotels.map((hotel, index) => {
      const checkInDate = new Date(hotel.checkIn?.date);
      const checkOutDate = new Date(hotel.checkOut?.date);
      const checkInDay = checkInDate.getDate();
      const checkOutDay = checkOutDate.getDate();
      const checkInMonth = checkInDate.toLocaleDateString(lang, { month: 'short' });
      const checkOutMonth = checkOutDate.toLocaleDateString(lang, { month: 'short' });

      const mapsUrl = hotel.address?.fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`
        : '#';
      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');

      return `
        <div class="hotel-card" data-id="${hotel.id}">
          <div class="hotel-card-header">
            <h3>${esc(hotel.name)}</h3>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-dates">
              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkIn">Check-in</div>
                <div class="hotel-date-day">${checkInDay}</div>
                <div class="hotel-date-month">${checkInMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.from')} ${esc(hotel.checkIn?.time || '')}</div>
              </div>

              <div class="hotel-nights">
                <div class="hotel-nights-count">${hotel.nights || '-'}</div>
                <div class="hotel-nights-label">${nightsLabel}</div>
              </div>

              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkOut">Check-out</div>
                <div class="hotel-date-day">${checkOutDay}</div>
                <div class="hotel-date-month">${checkOutMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.until')} ${esc(hotel.checkOut?.time || '')}</div>
              </div>
            </div>

            ${hotel.address?.fullAddress ? `
            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="hotel-address-text">${esc(hotel.address.fullAddress)}</span>
              </a>
            </div>
            ` : ''}
          </div>

          <button class="hotel-toggle-details" data-hotel-index="${index}">
            <span data-i18n="hotel.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="hotel-details" id="hotel-details-${index}" data-hotel-index="${index}"></div>
        </div>
      `;
    }).join('');

    // Add quick upload card at the end
    const quickUploadCard = `
      <div class="quick-upload-card" id="quick-upload-hotels">
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
    // Store sorted hotels for lazy detail rendering
    window.tripHotels._hotels = sortedHotels;
    i18n.apply(container);
    window.tripPage.initQuickUploadCard('quick-upload-hotels');
  }

  /**
   * Generate hotel details HTML (lazy — called on first expand)
   */
  function renderHotelDetails(hotel, index) {
    const lang = i18n.getLang();
    // Support both roomType (single) and roomTypes (array) formats
    let roomType = '-';
    if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
      roomType = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
    } else if (hotel.roomType) {
      roomType = hotel.roomType[lang] || hotel.roomType.en || hotel.roomType;
    }

    return `
            <div class="hotel-details-grid">
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.roomType">Room type</span>
                <span class="hotel-detail-value">${esc(roomType)}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guests">Guests</span>
                <span class="hotel-detail-value">${esc(utils.formatGuests(hotel.guests, lang))}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guestName">Guest name</span>
                <span class="hotel-detail-value">${esc(hotel.guestName || '-')}</span>
              </div>
              ${hotel.phone ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.phone">Phone</span>
                <span class="hotel-detail-value"><a href="tel:${esc(hotel.phone)}">${esc(hotel.phone)}</a></span>
              </div>
              ` : ''}
              ${hotel.price?.total ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.price">Total price</span>
                <span class="hotel-detail-value">~${esc(hotel.price.total.currency)} ${esc(hotel.price.total.value)}</span>
              </div>
              ` : ''}
              ${hotel.confirmationNumber ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.confirmation">Confirmation</span>
                <span class="hotel-detail-value">${esc(hotel.confirmationNumber)}</span>
              </div>
              ` : ''}
            </div>
            ${hotel.pdfPath ? `
            <button class="btn-download-pdf" data-pdf-path="${hotel.pdfPath}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span data-i18n="hotel.downloadPdf">Download PDF</span>
            </button>
            ` : ''}
            <button class="btn-edit-item" data-type="hotel" data-id="${hotel.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="hotel.edit">Modifica hotel</span>
            </button>
            <button class="btn-delete-item" data-type="hotel" data-id="${hotel.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span data-i18n="hotel.delete">Delete hotel</span>
            </button>
    `;
  }

  /**
   * Build hotel edit form HTML
   */
  function buildHotelEditForm(hotel) {
    // Resolve roomType to a simple string for editing
    const lang = i18n.getLang();
    let roomTypeVal = '';
    if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
      roomTypeVal = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
    } else if (hotel.roomType && typeof hotel.roomType === 'object') {
      roomTypeVal = hotel.roomType[lang] || hotel.roomType.en || '';
    } else if (hotel.roomType) {
      roomTypeVal = hotel.roomType;
    }

    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.hotelInfo') || 'Hotel'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field full-width">
              <label>${i18n.t('hotel.hotelInfo') || 'Nome'}</label>
              <input type="text" data-field="name" value="${escAttr(hotel.name)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkIn') || 'Check-in'}</label>
              <input type="date" data-field="checkIn.date" value="${escAttr(hotel.checkIn?.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkIn') || 'Check-in'} - ${i18n.t('common.from') || 'Orario'}</label>
              <input type="time" data-field="checkIn.time" value="${escAttr(hotel.checkIn?.time)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkOut') || 'Check-out'}</label>
              <input type="date" data-field="checkOut.date" value="${escAttr(hotel.checkOut?.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkOut') || 'Check-out'} - ${i18n.t('common.until') || 'Orario'}</label>
              <input type="time" data-field="checkOut.time" value="${escAttr(hotel.checkOut?.time)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.detailsInfo') || 'Dettagli'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.roomType') || 'Tipo camera'}</label>
              <input type="text" data-field="roomType" value="${escAttr(roomTypeVal)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.guestName') || 'Nome ospite'}</label>
              <input type="text" data-field="guestName" value="${escAttr(hotel.guestName)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.phone') || 'Telefono'}</label>
              <input type="tel" data-field="phone" value="${escAttr(hotel.phone)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.confirmation') || 'N. Conferma'}</label>
              <input type="text" data-field="confirmationNumber" value="${escAttr(hotel.confirmationNumber)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.addressInfo') || 'Indirizzo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field full-width">
              <label>${i18n.t('hotel.fullAddress') || 'Indirizzo completo'}</label>
              <input type="text" data-field="address.fullAddress" value="${escAttr(hotel.address?.fullAddress)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.priceInfo') || 'Prezzo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.currency') || 'Valuta'}</label>
              <input type="text" data-field="price.total.currency" value="${escAttr(hotel.price?.total?.currency)}" maxlength="3" placeholder="es. EUR" style="text-transform:uppercase">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.amount') || 'Importo'}</label>
              <input type="number" data-field="price.total.value" value="${escAttr(hotel.price?.total?.value)}" min="0" step="0.01">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Collect hotel form values into an updates object
   */
  function collectHotelUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();

      if (field.startsWith('checkIn.')) {
        const prop = field.split('.')[1];
        if (!updates.checkIn) updates.checkIn = {};
        updates.checkIn[prop] = val;
      } else if (field.startsWith('checkOut.')) {
        const prop = field.split('.')[1];
        if (!updates.checkOut) updates.checkOut = {};
        updates.checkOut[prop] = val;
      } else if (field.startsWith('address.')) {
        const prop = field.split('.')[1];
        if (!updates.address) updates.address = {};
        updates.address[prop] = val;
      } else if (field.startsWith('price.total.')) {
        const prop = field.split('.')[2];
        if (!updates.price) updates.price = {};
        if (!updates.price.total) updates.price.total = {};
        updates.price.total[prop] = val;
      } else {
        updates[field] = val;
      }
    });
    return updates;
  }

  window.tripHotels = {
    render: renderHotels,
    renderDetails: renderHotelDetails,
    buildEditForm: buildHotelEditForm,
    collectUpdates: collectHotelUpdates
  };
})();
