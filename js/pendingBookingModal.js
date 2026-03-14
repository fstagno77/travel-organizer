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

    // Opzioni viaggio nel select (solo viaggi non passati, più recenti prima)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripOptionsHTML = [...trips]
      .filter(t => {
        if (!t.endDate) return true;
        return new Date(t.endDate) >= today;
      })
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
              <select id="pb-trip-select" class="form-select pb-trip-select">
                <option value="">${lang === 'it' ? 'Aggiungi a viaggio…' : 'Add to trip…'}</option>
                ${tripOptionsHTML}
                <option value="__new__">${lang === 'it' ? '+ Crea nuovo viaggio' : '+ Create new trip'}</option>
              </select>
              <div class="pb-inline-error" id="pb-inline-error" hidden></div>
            </div>
            <div id="pb-preview-container" class="pb-preview-container"></div>
          </div>
          <div class="modal-footer pb-modal-footer">
            <div class="parse-preview-feedback">
              <span class="parse-feedback-label">${lang === 'it' ? 'Estrazione corretta?' : 'Correct extraction?'}</span>
              <button class="parse-feedback-btn" id="pb-feedback-up" data-value="up" title="${lang === 'it' ? 'Corretta' : 'Correct'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              </button>
              <button class="parse-feedback-btn" id="pb-feedback-down" data-value="down" title="${lang === 'it' ? 'Non corretta' : 'Incorrect'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
              </button>
            </div>
            <div class="parse-preview-actions">
              <button class="btn btn-ghost btn--danger" id="pb-reject-btn">
                ${lang === 'it' ? 'Rifiuta' : 'Reject'}
              </button>
              <div class="parse-actions-right">
                <button class="btn btn-outline" id="pb-edit-btn">
                  ${lang === 'it' ? 'Modifica' : 'Edit'}
                </button>
                <button class="btn btn-primary" id="pb-confirm-btn">
                  ${lang === 'it' ? 'Aggiungi al viaggio' : 'Add to trip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('pending-booking-modal');
    const tripSelect = document.getElementById('pb-trip-select');
    const confirmBtn = document.getElementById('pb-confirm-btn');
    const editBtn = document.getElementById('pb-edit-btn');
    const rejectBtn = document.getElementById('pb-reject-btn');
    const inlineError = document.getElementById('pb-inline-error');
    const previewContainer = document.getElementById('pb-preview-container');

    const showInlineError = (msg) => {
      inlineError.textContent = msg;
      inlineError.hidden = false;
    };
    const hideInlineError = () => { inlineError.hidden = true; };

    // ── Feedback ──
    let currentFeedback = null;
    const feedbackUpBtn = document.getElementById('pb-feedback-up');
    const feedbackDownBtn = document.getElementById('pb-feedback-down');
    [feedbackUpBtn, feedbackDownBtn].forEach(btn => {
      btn?.addEventListener('click', () => {
        const val = btn.dataset.value;
        currentFeedback = currentFeedback === val ? null : val;
        feedbackUpBtn?.classList.toggle('active', currentFeedback === 'up');
        feedbackDownBtn?.classList.toggle('active', currentFeedback === 'down');
      });
    });

    const saveFeedback = async () => {
      if (!currentFeedback) return;
      try {
        await utils.authFetch('/.netlify/functions/pending-bookings/feedback', {
          method: 'POST',
          body: JSON.stringify({ pendingBookingId: bookingId, feedback: currentFeedback })
        });
      } catch (e) {
        console.warn('Feedback save failed (non-fatal):', e);
      }
    };

    // Renderizza parsePreview con i dati estratti
    const parsedResults = [{ result: booking.extracted_data || {} }];
    parsePreview.render(previewContainer, parsedResults, {
      onConfirm: () => {},
      onCancel: () => closeModal()
    });
    // Rimuovi l'intero footer di parsePreview — usiamo il nostro
    previewContainer.querySelector('.parse-preview-footer')?.remove();

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
      hideInlineError();
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
      await saveFeedback();
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

    // ── Aggiungi al viaggio ──
    async function handleConfirm() {
      const tripId = tripSelect.value;
      if (!tripId) {
        showInlineError(lang === 'it' ? 'Seleziona un viaggio prima di continuare.' : 'Select a trip to continue.');
        return;
      }
      hideInlineError();

      confirmBtn.disabled = true;
      editBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      await saveFeedback();

      try {
        if (tripId === '__new__') {
          await _createTrip(bookingId, closeModal, sourceItem, lang);
        } else {
          const tripTitle = tripSelect.options[tripSelect.selectedIndex].text;
          const bookingTitle = booking.summary_title || booking.email_subject || bookingLabel;
          await _associateTrip(bookingId, tripId, tripTitle, bookingTitle, closeModal, sourceItem, lang);
        }
      } catch (err) {
        console.error('Errore conferma:', err);
        utils.showToast('Errore', 'error');
        confirmBtn.disabled = false;
        editBtn.disabled = false;
        confirmBtn.textContent = tripId === '__new__'
          ? (lang === 'it' ? 'Crea viaggio' : 'Create trip')
          : (lang === 'it' ? 'Aggiungi al viaggio' : 'Add to trip');
      }
    }

    // ── Modifica ──
    async function handleEdit() {
      const tripId = tripSelect.value;
      if (!tripId || tripId === '__new__') {
        showInlineError(lang === 'it' ? 'Seleziona un viaggio esistente per modificare.' : 'Select an existing trip to edit.');
        return;
      }
      hideInlineError();

      confirmBtn.disabled = true;
      editBtn.disabled = true;
      editBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      await saveFeedback();

      try {
        const res = await utils.authFetch('/.netlify/functions/pending-bookings/associate', {
          method: 'POST',
          body: JSON.stringify({ pendingBookingId: bookingId, tripId })
        });
        const data = await res.json();
        if (!data.success) {
          if (res.status === 409) {
            utils.showToast(
              lang === 'it' ? 'Prenotazione già presente in questo viaggio.' : 'Booking already exists in this trip.',
              'warning'
            );
            confirmBtn.disabled = false;
            editBtn.disabled = false;
            editBtn.textContent = lang === 'it' ? 'Modifica' : 'Edit';
            return;
          }
          throw new Error(data.error || 'Errore associazione');
        }

        // Salva hint in sessionStorage per aprire il pannello edit al caricamento della pagina
        if (data.newItemId && data.itemType) {
          sessionStorage.setItem('pendingBookingEdit', JSON.stringify({
            type: data.itemType,
            id: data.newItemId
          }));
        }

        closeModal();
        _removeFromList(bookingId, sourceItem);
        if (window.navigation) navigation.refreshPendingCount();
        window.location.href = `/trip.html?id=${tripId}`;
      } catch (err) {
        console.error('Errore modifica:', err);
        utils.showToast('Errore', 'error');
        confirmBtn.disabled = false;
        editBtn.disabled = false;
        editBtn.textContent = lang === 'it' ? 'Modifica' : 'Edit';
      }
    }

    confirmBtn.addEventListener('click', handleConfirm);
    editBtn.addEventListener('click', handleEdit);

    if (window.i18n) i18n.apply(modal);
  }

  // ── Helpers ──

  async function _associateTrip(bookingId, tripId, tripTitle, bookingTitle, closeModal, sourceItem, lang) {
    const res = await utils.authFetch('/.netlify/functions/pending-bookings/associate', {
      method: 'POST',
      body: JSON.stringify({ pendingBookingId: bookingId, tripId })
    });
    const data = await res.json();
    if (!data.success) {
      if (res.status === 409) {
        utils.showToast(
          lang === 'it' ? 'Prenotazione già presente in questo viaggio.' : 'Booking already exists in this trip.',
          'warning'
        );
        return;
      }
      throw new Error(data.error || 'Errore associazione');
    }

    const msg = lang === 'it'
      ? `"${bookingTitle}" aggiunto a "${tripTitle}"`
      : `"${bookingTitle}" added to "${tripTitle}"`;
    utils.showToast(msg, 'success');
    closeModal();
    _removeFromList(bookingId, sourceItem);
    if (window.navigation) navigation.refreshPendingCount();
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
    window.location.href = `/trip.html?id=${data.tripId}`;
  }

  function _removeFromList(bookingId, sourceItem) {
    const el = sourceItem || document.querySelector(`[data-booking-id="${bookingId}"]`);
    el?.remove();
  }

  return { show };
})();

window.pendingBookingModal = pendingBookingModal;
