/**
 * Trip Hotels - Hotels tab rendering and logic
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const escAttr = (val) => window.tripPage.escAttr(val);

  // SVG icons
  const ICONS = {
    calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    mapPin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    externalLink: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    bed: '<svg class="hotel-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"></path></svg>',
    users: '<svg class="hotel-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    wifi: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    coffee: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
    car: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg>',
    pool: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0"></path><path d="M2 16c2-1 4-1 6 0s4 1 6 0 4-1 6 0"></path><path d="M9 12V6a3 3 0 0 1 6 0v6"></path></svg>',
    dumbbell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><path d="M4 10V4.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V14"></path><path d="M20 10V4.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V14"></path><rect x="4" y="6.5" width="3" height="11" rx="0.5"></rect><rect x="17" y="6.5" width="3" height="11" rx="0.5"></rect></svg>'
  };

  // Map amenity names to icons
  const AMENITY_ICONS = {
    wifi: ICONS.wifi,
    'wi-fi': ICONS.wifi,
    breakfast: ICONS.coffee,
    colazione: ICONS.coffee,
    parking: ICONS.car,
    parcheggio: ICONS.car,
    pool: ICONS.pool,
    piscina: ICONS.pool,
    gym: ICONS.dumbbell,
    palestra: ICONS.dumbbell,
    fitness: ICONS.dumbbell
  };

  function getAmenityIcon(amenity) {
    const key = amenity.toLowerCase().trim();
    return AMENITY_ICONS[key] || '';
  }

  function formatPrice(price) {
    if (!price?.total?.value) return null;
    const val = Number(price.total.value);
    if (isNaN(val)) return null;
    const currency = price.total.currency || 'EUR';
    const symbol = currency === 'EUR' ? '\u20ac' : currency;
    return `${symbol} ${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

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
      const checkInDate = hotel.checkIn?.date ? new Date(hotel.checkIn.date) : null;
      const checkOutDate = hotel.checkOut?.date ? new Date(hotel.checkOut.date) : null;

      // Header date (formatted like flight: "mar 16 giu 2026")
      const headerDate = checkInDate
        ? checkInDate.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        : '-';

      // Check-in display
      const checkInDay = checkInDate ? checkInDate.getDate() : '-';
      const checkInMonth = checkInDate ? checkInDate.toLocaleDateString(lang, { month: 'short' }) : '';
      const checkInTime = hotel.checkIn?.time || '-';

      // Check-out display
      const checkOutDay = checkOutDate ? checkOutDate.getDate() : '-';
      const checkOutMonth = checkOutDate ? checkOutDate.toLocaleDateString(lang, { month: 'short' }) : '';
      const checkOutTime = hotel.checkOut?.time || '-';

      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');
      const nightsText = hotel.nights ? `${hotel.nights} ${nightsLabel}` : '-';

      const mapsUrl = hotel.address?.fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`
        : '#';

      const confirmationNumber = hotel.confirmationNumber || '-';

      return `
        <div class="hotel-card" data-id="${hotel.id}">
          <div class="hotel-card-header">
            <span class="hotel-header-date">${esc(headerDate)}</span>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-name-section">
              <h3>${esc(hotel.name || '-')}</h3>
              <span class="hotel-nights-badge">${esc(nightsText)}</span>
            </div>

            ${hotel.address?.fullAddress ? `
            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                ${ICONS.mapPin}
                <span class="hotel-address-text">${esc(hotel.address.fullAddress)}</span>
              </a>
            </div>
            ` : ''}

            <div class="hotel-checkin-grid">
              <div class="hotel-checkin-col">
                <div class="hotel-checkin-icon hotel-checkin-icon--in">
                  ${ICONS.calendar}
                </div>
                <div>
                  <div class="hotel-checkin-label" data-i18n="hotel.checkIn">CHECK-IN</div>
                  <div class="hotel-checkin-date">${esc(String(checkInDay))} ${esc(checkInMonth)}</div>
                  <div class="hotel-checkin-time">${esc(checkInTime)}</div>
                </div>
              </div>
              <div class="hotel-checkin-col">
                <div class="hotel-checkin-icon hotel-checkin-icon--out">
                  ${ICONS.calendar}
                </div>
                <div>
                  <div class="hotel-checkin-label" data-i18n="hotel.checkOut">CHECK-OUT</div>
                  <div class="hotel-checkin-date">${esc(String(checkOutDay))} ${esc(checkOutMonth)}</div>
                  <div class="hotel-checkin-time">${esc(checkOutTime)}</div>
                </div>
              </div>
            </div>
          </div>

          <button class="hotel-toggle-details" data-hotel-index="${index}">
            <span data-i18n="hotel.showDetails">Show details</span>
            ${ICONS.chevronDown}
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

    const plusSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;

    const sectionHeader = `
      <div class="section-header">
        <h2 class="section-header-title">I miei hotel</h2>
        <button class="section-header-cta btn btn-primary" id="hotels-add-booking-btn">
          ${plusSvg}
          <span class="section-header-cta-label-full">Aggiungi Prenotazione</span>
          <span class="section-header-cta-label-short">Prenotazione</span>
        </button>
      </div>
    `;

    container.innerHTML = sectionHeader + html + quickUploadCard;
    // Store sorted hotels for lazy detail rendering
    window.tripHotels._hotels = sortedHotels;
    i18n.apply(container);
    window.tripPage.initQuickUploadCard('quick-upload-hotels');

    // Connect CTA to add-booking modal
    const addBtn = document.getElementById('hotels-add-booking-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const tripId = window.tripPage.currentTripData?.id;
        if (tripId) window.tripPage.showAddBookingModal(tripId, 'hotel');
      });
    }
  }

  /**
   * Generate hotel details HTML (lazy — called on first expand)
   */
  function renderHotelDetails(hotel, index) {
    const lang = i18n.getLang();

    // Room type
    let roomType = '-';
    if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
      roomType = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
    } else if (hotel.roomType) {
      roomType = hotel.roomType[lang] || hotel.roomType.en || hotel.roomType;
    }

    // Guests
    const guestsText = utils.formatGuests(hotel.guests, lang);

    // Booking reference
    const bookingRef = hotel.bookingReference || hotel.id?.split('-')[0]?.toUpperCase() || '-';

    // Confirmation number
    const confirmNum = hotel.confirmationNumber || '-';

    // Price
    const priceFormatted = formatPrice(hotel.price);

    // Amenities
    const amenities = hotel.amenities || [];
    // Also check breakfast
    if (hotel.breakfast?.included && !amenities.some(a => a.toLowerCase().includes('colazione') || a.toLowerCase().includes('breakfast'))) {
      amenities.push(lang === 'it' ? 'Colazione' : 'Breakfast');
    }

    const copyIcon = ICONS.copy;

    return `
      <div class="hotel-details-box">
        <div class="hotel-details-grid">
          <div class="hotel-detail-item">
            <span class="hotel-detail-label" data-i18n="hotel.bookingReference">Riferimento prenotazione</span>
            <span class="hotel-detail-value">
              ${esc(bookingRef)}
              ${bookingRef !== '-' ? `<button class="btn-copy-value" data-copy="${esc(bookingRef)}" title="Copy">${copyIcon}</button>` : ''}
            </span>
          </div>
          <div class="hotel-detail-item">
            <span class="hotel-detail-label" data-i18n="hotel.confirmation">Numero di conferma</span>
            <span class="hotel-detail-value">
              ${esc(confirmNum)}
              ${confirmNum !== '-' ? `<button class="btn-copy-value" data-copy="${esc(confirmNum)}" title="Copy">${copyIcon}</button>` : ''}
            </span>
          </div>
        </div>
        <div class="hotel-details-grid">
          <div class="hotel-detail-item">
            <span class="hotel-detail-label" data-i18n="hotel.roomType">Tipo camera</span>
            <span class="hotel-detail-value">${ICONS.bed} ${esc(roomType)}</span>
          </div>
          <div class="hotel-detail-item">
            <span class="hotel-detail-label" data-i18n="hotel.guests">Ospiti</span>
            <span class="hotel-detail-value">${ICONS.users} ${esc(guestsText)}</span>
          </div>
        </div>
        <div class="hotel-details-grid">
          <div class="hotel-detail-item hotel-detail-item--full">
            <span class="hotel-detail-label" data-i18n="hotel.guestName">Nome ospite</span>
            <span class="hotel-detail-value">${esc(hotel.guestName || '-')}</span>
          </div>
        </div>
      </div>

      ${amenities.length > 0 ? `
      <div class="hotel-amenities">
        <div class="hotel-amenities-label" data-i18n="hotel.includedServices">Servizi inclusi</div>
        <div class="hotel-amenities-list">
          ${amenities.map(a => `
            <span class="hotel-amenity-badge">
              ${getAmenityIcon(a)}
              ${esc(a)}
            </span>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${priceFormatted ? `
      <div class="hotel-price-box">
        <span class="hotel-price-label" data-i18n="hotel.totalPrice">Totale prenotazione</span>
        <span class="hotel-price-value">${esc(priceFormatted)}</span>
      </div>
      ` : ''}

      <div class="hotel-actions">
        ${hotel.pdfPath ? `
        <button class="hotel-btn hotel-btn--primary btn-download-pdf" data-pdf-path="${hotel.pdfPath}">
          ${ICONS.download}
          <span data-i18n="hotel.voucher">Voucher</span>
        </button>
        ` : `<div></div>`}
        <button class="hotel-btn hotel-btn--outline btn-edit-item" data-type="hotel" data-id="${hotel.id}">
          ${ICONS.edit}
          <span data-i18n="hotel.edit">Modifica</span>
        </button>
        <button class="hotel-btn hotel-btn--danger btn-delete-item" data-type="hotel" data-id="${hotel.id}">
          ${ICONS.trash}
          <span data-i18n="hotel.delete">Elimina</span>
        </button>
      </div>
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
