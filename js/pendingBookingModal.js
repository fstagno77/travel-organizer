/**
 * Pending Booking Modal
 * Modale per rivedere e aggiungere a un viaggio una prenotazione ricevuta via email.
 * Riusa parsePreview per mostrare i dati estratti, con selettore viaggio e azione rifiuta.
 */
const pendingBookingModal = (() => {
  'use strict';

  /**
   * Apre la modale per un pending booking.
   * @param {string} bookingId - ID del pending booking
   * @param {HTMLElement} [sourceItem] - Elemento notifica sorgente (per rimuoverlo dopo)
   */
  async function show(bookingId, sourceItem) {
    document.getElementById('pending-booking-modal')?.remove();

    // Carica booking e viaggi in parallelo
    let booking, trips;
    try {
      const [bookingRes, tripsRes] = await Promise.all([
        utils.authFetch(`/.netlify/functions/pending-bookings?id=${bookingId}`),
        utils.authFetch('/.netlify/functions/get-trips')
      ]);
      const bookingData = await bookingRes.json();
      const tripsData = await tripsRes.json();

      if (!bookingData.success || !bookingData.booking) {
        throw new Error(bookingData.error || 'Booking non trovato');
      }
      booking = bookingData.booking;
      trips = tripsData.trips || [];
    } catch (err) {
      console.error('Errore caricamento pending booking:', err);
      utils.showToast('Errore nel caricamento della prenotazione', 'error');
      return;
    }

    const lang = window.i18n?.getLang() || 'it';

    // Opzioni viaggio nel select (più recenti prima)
    const tripOptionsHTML = [...trips]
      .sort((a, b) => new Date(b.startDate || b.created_at || 0) - new Date(a.startDate || a.created_at || 0))
      .map(t => {
        const title = (typeof t.title === 'object')
          ? (t.title[lang] || t.title.it || t.title.en || 'Viaggio')
          : (t.title || 'Viaggio');
        return `<option value="${t.id}">${utils.escapeHtml(title)}</option>`;
      })
      .join('');
    const bookingLabel = booking.booking_type === 'flight'
      ? (lang === 'it' ? 'Volo' : 'Flight')
      : booking.booking_type === 'hotel'
        ? 'Hotel'
        : (lang === 'it' ? 'Prenotazione' : 'Booking');

    const modalHTML = `
      <div class="modal-overlay active" id="pending-booking-modal">
        <div class="modal modal--pending-booking">
          <div class="modal-header">
            <div class="modal-header-content">
              <span class="modal-subtitle">${lang === 'it' ? 'Ricevuta via email' : 'Received via email'}</span>
              <h2>${utils.escapeHtml(booking.summary_title || booking.email_subject || bookingLabel)}</h2>
            </div>
            <button class="modal-close" id="pb-close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="pb-trip-selector">
              <label class="pb-trip-label" for="pb-trip-select">
                ${lang === 'it' ? 'Aggiungi a viaggio:' : 'Add to trip:'}
              </label>
              <select id="pb-trip-select" class="form-select pb-trip-select">
                <option value="">${lang === 'it' ? 'Seleziona un viaggio…' : 'Select a trip…'}</option>
                ${tripOptionsHTML}
                <option value="__new__">${lang === 'it' ? '+ Crea nuovo viaggio' : '+ Create new trip'}</option>
              </select>
            </div>
            <div id="pb-preview-container" class="pb-preview-container"></div>
          </div>
          <div class="modal-footer pb-modal-footer">
            <button class="btn btn-ghost btn--danger" id="pb-reject-btn">
              ${lang === 'it' ? 'Rifiuta' : 'Reject'}
            </button>
            <button class="btn btn-primary" id="pb-confirm-btn" disabled>
              ${lang === 'it' ? 'Aggiungi al viaggio' : 'Add to trip'}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('pending-booking-modal');
    const tripSelect = document.getElementById('pb-trip-select');
    const confirmBtn = document.getElementById('pb-confirm-btn');
    const rejectBtn = document.getElementById('pb-reject-btn');
    const previewContainer = document.getElementById('pb-preview-container');

    // Renderizza parsePreview con i dati estratti
    const parsedResults = [{ result: booking.extracted_data || {} }];
    parsePreview.render(previewContainer, parsedResults, {
      onConfirm: () => handleConfirm(),
      onCancel: () => closeModal()
    });
    // Rimuovi il footer di parsePreview — usiamo il nostro
    previewContainer.querySelector('.parse-actions')?.remove();

    // ── Chiusura ──
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    document.getElementById('pb-close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // ── Selettore viaggio ──
    tripSelect.addEventListener('change', () => {
      const val = tripSelect.value;
      confirmBtn.disabled = !val;
      if (val === '__new__') {
        confirmBtn.textContent = lang === 'it' ? 'Crea viaggio' : 'Create trip';
      } else {
        confirmBtn.textContent = lang === 'it' ? 'Aggiungi al viaggio' : 'Add to trip';
      }
    });

    // ── Rifiuta ──
    rejectBtn.addEventListener('click', async () => {
      const confirmed = await utils.showConfirm(
        lang === 'it' ? 'Rifiutare questa prenotazione?' : 'Reject this booking?',
        { confirmText: lang === 'it' ? 'Rifiuta' : 'Reject', variant: 'danger' }
      );
      if (!confirmed) return;

      rejectBtn.disabled = true;
      try {
        const res = await utils.authFetch('/.netlify/functions/pending-bookings/dismiss', {
          method: 'POST',
          body: JSON.stringify({ pendingBookingId: bookingId })
        });
        const data = await res.json();
        if (data.success) {
          utils.showToast(lang === 'it' ? 'Prenotazione rifiutata' : 'Booking rejected', 'success');
          closeModal();
          _removeFromList(bookingId, sourceItem);
          if (window.navigation) navigation.refreshPendingCount();
        } else {
          utils.showToast(data.error || 'Errore', 'error');
          rejectBtn.disabled = false;
        }
      } catch (err) {
        utils.showToast('Errore', 'error');
        rejectBtn.disabled = false;
      }
    });

    // ── Conferma ──
    async function handleConfirm() {
      const tripId = tripSelect.value;
      if (!tripId) return;

      // Applica eventuali edit in corso
      if (parsePreview._editing) {
        parsePreview._applyEdits(previewContainer);
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        if (tripId === '__new__') {
          await _createTrip(bookingId, closeModal, sourceItem, lang);
        } else {
          await _associateTrip(bookingId, tripId, closeModal, sourceItem, lang);
        }
      } catch (err) {
        console.error('Errore conferma:', err);
        utils.showToast('Errore', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = tripId === '__new__'
          ? (lang === 'it' ? 'Crea viaggio' : 'Create trip')
          : (lang === 'it' ? 'Aggiungi al viaggio' : 'Add to trip');
      }
    }

    confirmBtn.addEventListener('click', handleConfirm);

    if (window.i18n) i18n.apply(modal);
  }

  // ── Helpers ──

  async function _associateTrip(bookingId, tripId, closeModal, sourceItem, lang) {
    const res = await utils.authFetch('/.netlify/functions/pending-bookings/associate', {
      method: 'POST',
      body: JSON.stringify({ pendingBookingId: bookingId, tripId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Errore associazione');

    utils.showToast(lang === 'it' ? 'Aggiunto al viaggio!' : 'Added to trip!', 'success');
    closeModal();
    _removeFromList(bookingId, sourceItem);
    if (window.navigation) navigation.refreshPendingCount();

    // Chiede se andare al viaggio
    const goToTrip = await utils.showConfirm(
      lang === 'it' ? 'Vuoi aprire il viaggio?' : 'Open the trip?',
      { confirmText: lang === 'it' ? 'Vai al viaggio' : 'Go to trip', cancelText: lang === 'it' ? 'Resta qui' : 'Stay here' }
    );
    if (goToTrip) window.location.href = `/trip.html?id=${tripId}`;
  }

  async function _createTrip(bookingId, closeModal, sourceItem, lang) {
    const res = await utils.authFetch('/.netlify/functions/pending-bookings/create-trip', {
      method: 'POST',
      body: JSON.stringify({ pendingBookingId: bookingId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Errore creazione viaggio');

    closeModal();
    _removeFromList(bookingId, sourceItem);
    if (window.navigation) navigation.refreshPendingCount();

    if (data.needsPhotoSelection && data.destination && window.tripCreator) {
      window.tripCreator.openPhotoSelection(data.tripId, data.destination, data.tripData);
    } else {
      window.location.href = `/trip.html?id=${data.tripId}`;
    }
  }

  function _removeFromList(bookingId, sourceItem) {
    const el = sourceItem || document.querySelector(`[data-booking-id="${bookingId}"]`);
    el?.remove();
  }

  return { show };
})();

window.pendingBookingModal = pendingBookingModal;
