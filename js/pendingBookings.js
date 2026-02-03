/**
 * Pending Bookings Page
 * Lists and manages pending bookings from email forwarding
 */

(async function() {
  'use strict';

  let currentBookingId = null;
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
        renderEmptyState(container);
        return;
      }

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
      createTripBtn.addEventListener('click', () => {
        if (currentBookingId) {
          createNewTrip(currentBookingId);
        }
      });
    }

    // Delegate events for booking cards
    const container = document.getElementById('pending-bookings-container');
    console.log('[pendingBookings] Adding click listener to container:', container);
    container.addEventListener('click', handleBookingAction);
  }

  /**
   * Handle booking card actions
   */
  async function handleBookingAction(e) {
    console.log('[pendingBookings] Click detected on:', e.target);
    const btn = e.target.closest('[data-action]');
    console.log('[pendingBookings] Found button with data-action:', btn);
    if (!btn) return;

    const action = btn.dataset.action;
    const bookingId = btn.dataset.id;
    console.log('[pendingBookings] Action:', action, 'BookingId:', bookingId);

    if (action === 'associate') {
      console.log('[pendingBookings] Calling showAssociateModal...');
      await showAssociateModal(bookingId);
    } else if (action === 'dismiss') {
      await dismissBooking(bookingId);
    }
  }

  /**
   * Show associate modal with trip selection
   */
  async function showAssociateModal(bookingId) {
    console.log('[pendingBookings] showAssociateModal called with:', bookingId);
    currentBookingId = bookingId;

    // Fetch booking details with suggested trips
    try {
      console.log('[pendingBookings] Fetching booking details...');
      const response = await utils.authFetch(`/.netlify/functions/pending-bookings?id=${bookingId}`);
      console.log('[pendingBookings] Response status:', response.status);
      const data = await response.json();
      console.log('[pendingBookings] Response data:', data);

      if (!data.success) {
        throw new Error('Failed to load booking details');
      }

      suggestedTrips = data.suggestedTrips || [];
      console.log('[pendingBookings] Suggested trips:', suggestedTrips);
      renderTripsSelection(suggestedTrips);

      // Show modal
      console.log('[pendingBookings] Showing modal...');
      document.getElementById('associate-modal').style.display = 'flex';
    } catch (error) {
      console.error('[pendingBookings] Error loading booking details:', error);
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
            <div class="trip-selection-meta">
              ${trip.destination ? `<span>${escapeHtml(trip.destination)}</span>` : ''}
              ${trip.startDate ? `<span>${trip.startDate} - ${trip.endDate}</span>` : ''}
            </div>
          </div>
          ${matchBadge}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply();

    // Add click handlers
    container.querySelectorAll('.trip-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        const tripId = item.dataset.tripId;
        associateWithTrip(currentBookingId, tripId);
      });
    });
  }

  /**
   * Close modal
   */
  function closeModal() {
    document.getElementById('associate-modal').style.display = 'none';
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

      // Close modal and redirect to new trip
      closeModal();
      await navigation.refreshPendingCount();
      window.location.href = `trip.html?id=${data.tripId}`;
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
