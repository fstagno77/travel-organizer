/**
 * TripCardUtils - Funzioni condivise per rendering trip cards
 * Usato da homePage.js e pastTripsPage.js
 */
const tripCardUtils = (function() {
  'use strict';

  let documentClickBound = false;

  /**
   * Ottieni la data odierna, con supporto per override via ?testDate=YYYY-MM-DD
   */
  function getToday() {
    const params = new URLSearchParams(window.location.search);
    const testDate = params.get('testDate');
    if (testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
      const d = new Date(testDate + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  /**
   * Calcola la durata del viaggio in giorni
   */
  function getTripDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Verifica se un viaggio è passato
   */
  function isTripPast(trip) {
    const today = getToday();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  /**
   * Verifica se un viaggio è in corso
   */
  function isTripCurrent(trip) {
    const today = getToday();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return startDate <= today && today <= endDate;
  }

  /**
   * Render dell'header di sezione
   */
  function renderSectionHeader(title, subtitle, variant) {
    return `
      <div class="home-section-header">
        <div class="home-section-bar home-section-bar--${variant}"></div>
        <div>
          <h2 class="home-section-title">${utils.escapeHtml(title)}</h2>
          <p class="home-section-subtitle">${utils.escapeHtml(subtitle)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render di una singola trip card
   * @param {object} trip
   * @param {string} lang
   * @param {boolean} isPast
   * @param {number} index
   * @param {object|null} nextEvent - Primo evento del viaggio (per card upcoming vicine)
   */
  function renderTripCard(trip, lang, isPast, index, nextEvent) {
    const title = trip.title[lang] || trip.title.en || trip.title.it;
    const startDate = utils.formatDate(trip.startDate, lang, { month: 'short', day: 'numeric' });
    const endDate = utils.formatDate(trip.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
    const cardClass = isPast ? 'trip-card trip-card--past' : 'trip-card';
    const bgColor = isPast ? 'var(--color-gray-400)' : (trip.color || 'var(--color-primary)');

    const days = getTripDuration(trip.startDate, trip.endDate);
    const dayLabel = days === 1
      ? (i18n.t('home.day') || 'giorno')
      : (i18n.t('home.days') || 'giorni');
    const durationText = `${days} ${dayLabel}`;

    const tripUrl = `trip.html?id=${trip.id}`;

    // Cover photo: prime 3 card eager, resto lazy via data-bg
    const coverPhoto = trip.coverPhoto;
    let imageStyle = `background-color: ${coverPhoto?.color || bgColor}`;
    let dataBg = '';
    if (coverPhoto?.url) {
      if (index < 3) {
        imageStyle = `background-image: url('${coverPhoto.url}'); background-color: ${coverPhoto.color || bgColor}`;
      } else {
        dataBg = ` data-bg="${utils.escapeHtml(coverPhoto.url)}"`;
      }
    }

    // Role badge per viaggi condivisi
    const roleBadge = trip.role && trip.role !== 'proprietario'
      ? `<span class="trip-role-badge trip-role-badge--${trip.role}">${trip.role === 'viaggiatore' ? (i18n.t('share.roleViaggiatore') || 'Viaggiatore') : (i18n.t('share.roleOspite') || 'Ospite')}</span>`
      : '';

    // Strip prossimo evento (solo per upcoming vicini)
    let nextEventHtml = '';
    if (nextEvent) {
      const cat = nextEvent.category;
      const bg = cat?.cardBg || 'linear-gradient(135deg, #eff6ff, #eef2ff)';
      const border = cat?.cardBorder || '#bfdbfe';
      const iconGradient = cat?.gradient || 'linear-gradient(135deg, #3b82f6, #4f46e5)';
      const iconHtml = cat?.svg || '<span class="material-symbols-outlined" style="font-size:16px;color:white">event</span>';
      nextEventHtml = `
        <div class="trip-card-next-event" style="margin-top:8px;padding:8px 10px;border-radius:8px;background:${bg};border:1px solid ${border};display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:6px;background:${iconGradient};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${iconHtml}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--color-gray-500);margin-bottom:1px">${utils.escapeHtml(nextEvent.dateLabel || '')}</div>
            <div style="font-size:13px;font-weight:600;color:var(--color-gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${utils.escapeHtml(nextEvent.title)}</div>
            ${nextEvent.description ? `<div style="font-size:12px;color:var(--color-gray-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${utils.escapeHtml(nextEvent.description)}</div>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="trip-card-wrapper">
        <a href="${tripUrl}" class="${cardClass}">
          <div class="trip-card-image" style="${imageStyle}"${dataBg}>
            ${roleBadge}
            <div class="trip-card-overlay">
              <h3 class="trip-card-destination">${utils.escapeHtml(title)}</h3>
              ${trip.cities && trip.cities.length > 0 ? `
                <div class="trip-card-cities">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${trip.cities.map(c => utils.escapeHtml(typeof c === 'string' ? c : (c.name || ''))).filter(Boolean).join(', ')}</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="trip-card-content">
            <div class="trip-card-info">
              <svg class="trip-card-calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="trip-card-dates">${startDate} - ${endDate}</span>
            </div>
            <svg class="trip-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
          ${nextEventHtml}
        </a>
      </div>
    `;
  }

  /**
   * Lazy load immagini cover con IntersectionObserver
   */
  function initCoverLazyLoad(container) {
    const lazyCards = container.querySelectorAll('.trip-card-image[data-bg]');
    if (lazyCards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.backgroundImage = `url('${el.dataset.bg}')`;
          el.removeAttribute('data-bg');
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '200px' });

    lazyCards.forEach(card => observer.observe(card));
  }

  /**
   * Inizializza menu dropdown delle trip card
   * @param {object} callbacks - { onChangePhoto, onShare, onRename, onDelete }
   */
  function initTripCardMenus(callbacks) {
    document.querySelectorAll('.trip-card-menu-btn:not([data-menu-init])').forEach(btn => {
      btn.setAttribute('data-menu-init', '1');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const tripId = btn.dataset.tripId;
        const dropdown = document.querySelector(`.trip-card-dropdown[data-trip-id="${tripId}"]`);

        document.querySelectorAll('.trip-card-dropdown.active').forEach(d => {
          if (d !== dropdown) d.classList.remove('active');
        });

        dropdown.classList.toggle('active');
      });
    });

    document.querySelectorAll('.trip-card-dropdown-item:not([data-menu-init])').forEach(item => {
      item.setAttribute('data-menu-init', '1');
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const action = item.dataset.action;
        const tripId = item.dataset.tripId;
        const tripName = item.dataset.tripName;
        const tripDestination = item.dataset.tripDestination;

        item.closest('.trip-card-dropdown').classList.remove('active');

        if (action === 'changePhoto' && callbacks?.onChangePhoto) {
          callbacks.onChangePhoto(tripId, tripDestination);
        } else if (action === 'share' && callbacks?.onShare) {
          const tripRole = item.dataset.tripRole || 'proprietario';
          callbacks.onShare(tripId, tripRole, tripName);
        } else if (action === 'rename' && callbacks?.onRename) {
          callbacks.onRename(tripId, tripName);
        } else if (action === 'delete' && callbacks?.onDelete) {
          callbacks.onDelete(tripId, tripName);
        }
      });
    });

    if (!documentClickBound) {
      documentClickBound = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.trip-card-dropdown.active').forEach(d => {
          d.classList.remove('active');
        });
      });
    }
  }

  /**
   * Modale rinomina viaggio
   */
  function showRenameModal(tripId, currentName, onSuccess) {
    const existingModal = document.getElementById('rename-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay active" id="rename-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.renameTitle">Rinomina viaggio</h2>
            <button class="modal-close" id="rename-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="rename-input" data-i18n="trip.newName">Nuovo nome</label>
              <input type="text" id="rename-input" class="form-input" value="${utils.escapeHtml(currentName)}" autofocus>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="rename-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="rename-submit" data-i18n="modal.save">Salva</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-input');
    const closeBtn = document.getElementById('rename-modal-close');
    const cancelBtn = document.getElementById('rename-cancel');
    const submitBtn = document.getElementById('rename-submit');

    input.select();

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const submitRename = async () => {
      const newName = input.value.trim();
      if (!newName) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/rename-trip', {
          method: 'POST',
          body: JSON.stringify({ tripId, title: newName })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to rename trip');
        }

        closeModal();
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error('Error renaming trip:', error);
        alert(i18n.t('trip.renameError') || 'Errore durante la rinomina');
        submitBtn.disabled = false;
        submitBtn.textContent = i18n.t('modal.save') || 'Salva';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitRename();
    });
    submitBtn.addEventListener('click', submitRename);

    i18n.apply(modal);
  }

  /**
   * Modale eliminazione viaggio
   */
  function showDeleteModal(tripId, tripName, onSuccess) {
    const existingModal = document.getElementById('delete-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay active" id="delete-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteTitle">Elimina viaggio</h2>
            <button class="modal-close" id="delete-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="trip.deleteConfirm">Sei sicuro di voler eliminare questo viaggio?</p>
            <p class="text-muted mt-2"><strong>${utils.escapeHtml(tripName || '')}</strong></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-danger" id="delete-confirm" data-i18n="trip.delete">Elimina</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('delete-modal');
    const closeBtn = document.getElementById('delete-modal-close');
    const cancelBtn = document.getElementById('delete-cancel');
    const confirmBtn = document.getElementById('delete-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(tripId)}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to delete trip');
        }

        closeModal();
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert(i18n.t('trip.deleteError') || 'Errore durante l\'eliminazione');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.delete') || 'Elimina';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    confirmBtn.addEventListener('click', performDelete);

    i18n.apply(modal);
  }

  /**
   * Cambia foto viaggio
   */
  async function changePhoto(tripId, destination) {
    if (!destination) {
      console.error('No destination for trip');
      return;
    }

    try {
      const response = await utils.authFetch(`/.netlify/functions/get-trip?id=${tripId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to load trip data');
      }

      if (window.tripCreator) {
        window.tripCreator.openPhotoSelection(tripId, destination, result.tripData);
      }
    } catch (error) {
      console.error('Error loading trip for photo change:', error);
    }
  }

  return {
    getToday,
    getTripDuration,
    isTripPast,
    isTripCurrent,
    renderSectionHeader,
    renderTripCard,
    initCoverLazyLoad,
    initTripCardMenus,
    showRenameModal,
    showDeleteModal,
    changePhoto
  };
})();

window.tripCardUtils = tripCardUtils;
