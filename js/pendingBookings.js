/**
 * Pending Bookings Page
 * Lists and manages pending bookings from email forwarding
 */

(async function() {
  'use strict';

  let currentBookingId = null;
  let currentBookingData = null;
  let allBookings = [];
  let suggestedTrips = [];

  // Icons for booking types
  const flightIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
  </svg>`;

  const hotelIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
    <path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/>
    <path d="M8 7h.01"/>
    <path d="M16 7h.01"/>
    <path d="M12 7h.01"/>
    <path d="M12 11h.01"/>
    <path d="M16 11h.01"/>
    <path d="M8 11h.01"/>
  </svg>`;

  const unknownIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <path d="M12 17h.01"/>
  </svg>`;

  /**
   * Initialize the page
   */
  async function init() {
    await i18n.init();
    await auth.init();

    if (auth.profile?.language_preference) {
      await i18n.setLang(auth.profile.language_preference);
    }

    await navigation.init();
    i18n.apply();

    // Require authentication
    if (!auth.requireAuth()) return;

    // Initialize trip creator for photo selection
    if (window.tripCreator) {
      window.tripCreator.init();
    }

    // Load pending bookings
    await loadPendingBookings();

    // Bind events
    bindEvents();
  }

  /**
   * Load pending bookings from API
   */
  async function loadPendingBookings() {
    const container = document.getElementById('pending-bookings-container');

    try {
      const response = await utils.authFetch('/.netlify/functions/pending-bookings');
      const data = await response.json();

      if (!data.success || !data.bookings?.length) {
        allBookings = [];
        renderEmptyState(container);
        return;
      }

      allBookings = data.bookings;
      renderPendingBookings(container, data.bookings);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
      container.innerHTML = `
        <div class="error-state">
          <p data-i18n="pendingBookings.loadError">Failed to load pending bookings</p>
          <button class="btn btn-secondary" onclick="location.reload()">
            <span data-i18n="common.retry">Retry</span>
          </button>
        </div>
      `;
      i18n.apply();
    }
  }

  /**
   * Render the list of pending bookings
   */
  function renderPendingBookings(container, bookings) {
    const html = bookings.map(booking => {
      const icon = booking.booking_type === 'flight' ? flightIcon :
                   booking.booking_type === 'hotel' ? hotelIcon : unknownIcon;
      const typeClass = booking.booking_type;
      const title = booking.summary_title || booking.email_subject || i18n.t('pendingBookings.unknownBooking');
      const dates = booking.summary_dates || '';
      const receivedAt = formatRelativeDate(booking.email_received_at || booking.created_at);

      return `
        <div class="pending-booking-card" data-id="${booking.id}">
          <div class="pending-booking-icon ${typeClass}">
            ${icon}
          </div>
          <div class="pending-booking-content">
            <div class="pending-booking-title">${escapeHtml(title)}</div>
            ${dates ? `<div class="pending-booking-dates">${escapeHtml(dates)}</div>` : ''}
            <div class="pending-booking-meta">
              <span class="pending-booking-received">${receivedAt}</span>
            </div>
          </div>
          <div class="pending-booking-actions">
            <button class="btn btn-secondary btn-sm" data-action="details" data-id="${booking.id}">
              <span data-i18n="pendingBookings.details">Details</span>
            </button>
            <button class="btn btn-primary btn-sm" data-action="associate" data-id="${booking.id}">
              <span data-i18n="pendingBookings.addToTrip">Add to trip</span>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="dismiss" data-id="${booking.id}" title="${i18n.t('pendingBookings.dismiss')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="pending-bookings-list">${html}</div>`;
    i18n.apply();
  }

  /**
   * Render empty state
   */
  function renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <h3 class="empty-state-title" data-i18n="pendingBookings.noBookings">No pending bookings</h3>
        <p class="empty-state-text" data-i18n="pendingBookings.noBookingsText">Forward your booking confirmation emails to see them here</p>
      </div>
    `;
    i18n.apply();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Copy email button
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const email = document.getElementById('forward-email').textContent;
        try {
          await navigator.clipboard.writeText(email);
          copyBtn.classList.add('copied');
          setTimeout(() => copyBtn.classList.remove('copied'), 1500);
        } catch (e) {
          console.error('Failed to copy:', e);
        }
      });
    }

    // Modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }

    // Modal overlay click to close
    const modalOverlay = document.getElementById('associate-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          closeModal();
        }
      });
    }

    // Create new trip button
    const createTripBtn = document.getElementById('create-trip-btn');
    if (createTripBtn) {
      createTripBtn.addEventListener('click', async () => {
        if (currentBookingId && !createTripBtn.disabled) {
          setButtonLoading(createTripBtn, true);
          try {
            await createNewTrip(currentBookingId);
          } finally {
            setButtonLoading(createTripBtn, false);
          }
        }
      });
    }

    // Delegate events for booking cards
    const container = document.getElementById('pending-bookings-container');
    container.addEventListener('click', handleBookingAction);
  }

  /**
   * Set button loading state
   */
  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
        delete btn.dataset.originalHtml;
      }
    }
  }

  /**
   * Handle booking card actions
   */
  async function handleBookingAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;

    const action = btn.dataset.action;
    const bookingId = btn.dataset.id;

    if (action === 'associate') {
      setButtonLoading(btn, true);
      try {
        await showAssociateModal(bookingId);
      } finally {
        setButtonLoading(btn, false);
      }
    } else if (action === 'dismiss') {
      setButtonLoading(btn, true);
      try {
        await dismissBooking(bookingId);
      } finally {
        setButtonLoading(btn, false);
      }
    } else if (action === 'details') {
      setButtonLoading(btn, true);
      try {
        await showDetailsModal(bookingId);
      } finally {
        setButtonLoading(btn, false);
      }
    }
  }

  /**
   * Show details modal for a booking
   */
  async function showDetailsModal(bookingId) {
    // Fetch full booking details
    try {
      const response = await utils.authFetch(`/.netlify/functions/pending-bookings?id=${bookingId}`);
      const data = await response.json();

      if (!data.success || !data.booking) {
        throw new Error('Failed to load booking details');
      }

      currentBookingId = bookingId;
      currentBookingData = data.booking;

      // Remove existing modal if any
      const existingModal = document.getElementById('details-modal');
      if (existingModal) existingModal.remove();

      // Create details modal
      const modalHTML = createDetailsModalHTML(data.booking);
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Bind modal events
      const modal = document.getElementById('details-modal');
      const closeBtn = document.getElementById('details-modal-close');
      const closeBtnFooter = document.getElementById('details-close-btn');
      const addBtn = document.getElementById('details-add-btn');
      const deleteBtn = document.getElementById('details-delete-btn');

      const closeDetailsModal = () => {
        modal.remove();
        document.body.style.overflow = '';
      };

      closeBtn.addEventListener('click', closeDetailsModal);
      closeBtnFooter.addEventListener('click', closeDetailsModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDetailsModal();
      });

      addBtn.addEventListener('click', async () => {
        if (addBtn.disabled) return;
        setButtonLoading(addBtn, true);
        closeDetailsModal();
        await showAssociateModal(bookingId);
      });

      deleteBtn.addEventListener('click', async () => {
        if (deleteBtn.disabled) return;
        closeDetailsModal();
        await dismissBooking(bookingId);
      });

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      i18n.apply();

    } catch (error) {
      console.error('Error loading booking details:', error);
      alert(i18n.t('pendingBookings.loadError'));
    }
  }

  /**
   * Create details modal HTML
   */
  function createDetailsModalHTML(booking) {
    const lang = i18n.getLang();
    const type = booking.booking_type;
    const extracted = booking.extracted_data || {};

    let detailsContent = '';

    if (type === 'flight' && extracted.flights?.length) {
      const flight = extracted.flights[0];
      detailsContent = `
        <div class="details-section">
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Volo' : 'Flight'}</span>
            <span class="details-value">${flight.airline || ''} ${flight.flightNumber || ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Data' : 'Date'}</span>
            <span class="details-value">${formatDateShort(flight.date)}</span>
          </div>
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Partenza' : 'Departure'}</span>
            <span class="details-value">${flight.departure?.city || flight.departure?.code || '—'} ${flight.departureTime ? `(${flight.departureTime})` : ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Arrivo' : 'Arrival'}</span>
            <span class="details-value">${flight.arrival?.city || flight.arrival?.code || '—'} ${flight.arrivalTime ? `(${flight.arrivalTime})` : ''}</span>
          </div>
          ${flight.bookingReference ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Riferimento' : 'Reference'}</span>
            <span class="details-value">${flight.bookingReference}</span>
          </div>` : ''}
          ${flight.passenger ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Passeggero' : 'Passenger'}</span>
            <span class="details-value">${flight.passenger}</span>
          </div>` : ''}
        </div>
      `;
    } else if (type === 'hotel' && extracted.hotels?.length) {
      const hotel = extracted.hotels[0];
      detailsContent = `
        <div class="details-section">
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Hotel' : 'Hotel'}</span>
            <span class="details-value">${hotel.name || '—'}</span>
          </div>
          ${hotel.address?.fullAddress || hotel.address?.city ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Indirizzo' : 'Address'}</span>
            <span class="details-value">${hotel.address?.fullAddress || hotel.address?.city || '—'}</span>
          </div>` : ''}
          ${hotel.phone ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Telefono' : 'Phone'}</span>
            <span class="details-value">${hotel.phone}</span>
          </div>` : ''}
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Check-in' : 'Check-in'}</span>
            <span class="details-value">${formatDateShort(hotel.checkIn?.date)} ${hotel.checkIn?.time ? `(${hotel.checkIn.time})` : ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Check-out' : 'Check-out'}</span>
            <span class="details-value">${formatDateShort(hotel.checkOut?.date)} ${hotel.checkOut?.time ? `(${hotel.checkOut.time})` : ''}</span>
          </div>
          ${hotel.nights ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Notti' : 'Nights'}</span>
            <span class="details-value">${hotel.nights}</span>
          </div>` : ''}
          ${hotel.rooms ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Camere' : 'Rooms'}</span>
            <span class="details-value">${hotel.rooms}</span>
          </div>` : ''}
          ${hotel.guests ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Ospiti' : 'Guests'}</span>
            <span class="details-value">${hotel.guests.adults || 0} ${lang === 'it' ? 'adulti' : 'adults'}${hotel.guests.children ? `, ${hotel.guests.children} ${lang === 'it' ? 'bambini' : 'children'}` : ''}</span>
          </div>` : ''}
          ${hotel.confirmationNumber ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Conferma' : 'Confirmation'}</span>
            <span class="details-value">${hotel.confirmationNumber}</span>
          </div>` : ''}
          ${hotel.guestName ? `
          <div class="details-row">
            <span class="details-label">${lang === 'it' ? 'Intestatario' : 'Guest'}</span>
            <span class="details-value">${hotel.guestName}</span>
          </div>` : ''}
        </div>
      `;
    } else {
      detailsContent = `
        <div class="details-section">
          <p class="text-muted">${lang === 'it' ? 'Nessun dettaglio disponibile' : 'No details available'}</p>
        </div>
      `;
    }

    const title = booking.summary_title || booking.email_subject || (lang === 'it' ? 'Prenotazione' : 'Booking');

    return `
      <div class="modal-overlay" id="details-modal">
        <div class="modal modal-details">
          <div class="modal-header">
            <h3 class="modal-title">${escapeHtml(title)}</h3>
            <button class="modal-close" id="details-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            ${detailsContent}
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn btn-secondary" id="details-close-btn" data-i18n="pendingBookings.close">Close</button>
            <div class="modal-footer-right">
              <button class="btn-text btn-text-danger" id="details-delete-btn" data-i18n="pendingBookings.deleteBooking">Delete booking</button>
              <button class="btn btn-primary" id="details-add-btn" data-i18n="pendingBookings.addToTrip">Add to trip</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show associate modal with trip selection
   */
  async function showAssociateModal(bookingId) {
    currentBookingId = bookingId;

    // Fetch booking details with suggested trips
    try {
      const response = await utils.authFetch(`/.netlify/functions/pending-bookings?id=${bookingId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to load booking details');
      }

      suggestedTrips = data.suggestedTrips || [];
      renderTripsSelection(suggestedTrips);

      // Show modal
      document.getElementById('associate-modal').classList.add('active');
    } catch (error) {
      console.error('Error loading booking details:', error);
      alert(i18n.t('pendingBookings.loadError'));
    }
  }

  /**
   * Render trips selection in modal
   */
  function renderTripsSelection(trips) {
    const container = document.getElementById('trips-list');

    if (!trips.length) {
      container.innerHTML = `
        <div class="no-trips-message">
          <p data-i18n="pendingBookings.noTripsYet">No trips yet. Create a new trip with this booking.</p>
        </div>
      `;
      i18n.apply();
      return;
    }

    const html = trips.map(trip => {
      const matchBadge = trip.dateMatch ?
        `<span class="match-badge" data-i18n="pendingBookings.datesMatch">Dates match</span>` : '';

      return `
        <div class="trip-selection-item" data-trip-id="${trip.id}">
          <div class="trip-selection-info">
            <div class="trip-selection-title">${escapeHtml(trip.title)}</div>
            ${trip.startDate ? `<div class="trip-selection-meta">${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}</div>` : ''}
          </div>
          ${matchBadge}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply();

    // Add click handlers
    container.querySelectorAll('.trip-selection-item').forEach(item => {
      item.addEventListener('click', async () => {
        if (item.classList.contains('loading')) return;
        item.classList.add('loading');
        const tripId = item.dataset.tripId;
        await associateWithTrip(currentBookingId, tripId);
        item.classList.remove('loading');
      });
    });
  }

  /**
   * Close modal
   */
  function closeModal() {
    document.getElementById('associate-modal').classList.remove('active');
    currentBookingId = null;
  }

  /**
   * Associate booking with an existing trip
   */
  async function associateWithTrip(bookingId, tripId) {
    try {
      const response = await utils.authFetch('/.netlify/functions/pending-bookings/associate', {
        method: 'POST',
        body: JSON.stringify({ pendingBookingId: bookingId, tripId })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to associate');
      }

      // Close modal and refresh
      closeModal();
      await loadPendingBookings();
      await navigation.refreshPendingCount();

      // Optionally redirect to the trip
      if (confirm(i18n.t('pendingBookings.viewTrip'))) {
        window.location.href = `trip.html?id=${tripId}`;
      }
    } catch (error) {
      console.error('Error associating booking:', error);
      alert(i18n.t('pendingBookings.associateError'));
    }
  }

  /**
   * Create a new trip from pending booking
   */
  async function createNewTrip(bookingId) {
    try {
      const response = await utils.authFetch('/.netlify/functions/pending-bookings/create-trip', {
        method: 'POST',
        body: JSON.stringify({ pendingBookingId: bookingId })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create trip');
      }

      // Close pending bookings modal
      closeModal();
      await navigation.refreshPendingCount();

      // Show photo selection if destination available and tripCreator is available
      if (data.needsPhotoSelection && data.destination && window.tripCreator) {
        // Use tripCreator to show photo selection
        window.tripCreator.openPhotoSelection(data.tripId, data.destination, data.tripData);
      } else {
        // Redirect to new trip directly
        window.location.href = `trip.html?id=${data.tripId}`;
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      alert(i18n.t('pendingBookings.createTripError'));
    }
  }

  /**
   * Dismiss a pending booking
   */
  async function dismissBooking(bookingId) {
    if (!confirm(i18n.t('pendingBookings.dismissConfirm'))) {
      return;
    }

    try {
      const response = await utils.authFetch('/.netlify/functions/pending-bookings/dismiss', {
        method: 'POST',
        body: JSON.stringify({ pendingBookingId: bookingId })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to dismiss');
      }

      // Refresh list
      await loadPendingBookings();
      await navigation.refreshPendingCount();
    } catch (error) {
      console.error('Error dismissing booking:', error);
      alert(i18n.t('pendingBookings.dismissError'));
    }
  }

  /**
   * Format date as "dd mon yyyy" (e.g., "17 feb 2026")
   */
  function formatDateShort(dateString) {
    if (!dateString) return '';

    const lang = i18n.getLang();
    const monthsIt = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = lang === 'it' ? monthsIt : monthsEn;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  /**
   * Format date as relative (e.g., "2 hours ago")
   */
  function formatRelativeDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const lang = i18n.getLang();

    if (diffMins < 1) {
      return lang === 'it' ? 'Adesso' : 'Just now';
    } else if (diffMins < 60) {
      return lang === 'it' ? `${diffMins} min fa` : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return lang === 'it' ? `${diffHours} ore fa` : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return lang === 'it' ? `${diffDays} giorni fa` : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
