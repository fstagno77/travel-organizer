/**
 * PastTripsPage - Pagina dedicata ai viaggi passati
 */
const pastTripsPage = (function() {
  'use strict';

  const PAGE_SIZE = 6;

  async function init() {
    const container = document.getElementById('past-trips-container');
    if (!container) return;

    if (!auth?.isAuthenticated()) {
      window.location.href = './login.html';
      return;
    }

    await loadPastTrips(container);
  }

  async function loadPastTrips(container) {
    try {
      const response = await utils.authFetch('/.netlify/functions/get-trips');
      const result = await response.json();

      if (!result.success) {
        container.innerHTML = `<div class="empty-state"><p>${i18n.t('common.error') || 'Si è verificato un errore'}</p></div>`;
        return;
      }

      const pastTrips = result.trips
        .filter(t => t.status !== 'draft')
        .filter(t => tripCardUtils.isTripPast(t))
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      renderPastTrips(container, pastTrips);
    } catch (error) {
      console.error('[pastTripsPage] Error loading trips:', error);
      container.innerHTML = `<div class="empty-state"><p>${i18n.t('common.error') || 'Si è verificato un errore'}</p></div>`;
    }
  }

  function renderPastTrips(container, pastTrips) {
    const lang = i18n.getLang();

    if (!pastTrips.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="home.noPastTrips">${i18n.t('home.noPastTrips') || 'Nessun viaggio passato'}</h3>
          <p class="empty-state-text" data-i18n="home.noPastTripsText">${i18n.t('home.noPastTripsText') || 'I viaggi completati appariranno qui'}</p>
        </div>
      `;
      i18n.apply(container);
      return;
    }

    let cardIndex = 0;
    const headerHtml = tripCardUtils.renderSectionHeader(
      i18n.t('home.pastTrips') || 'Viaggi Passati',
      `${pastTrips.length} ${pastTrips.length === 1 ? (i18n.t('home.tripCompleted') || 'viaggio completato') : (i18n.t('home.tripsCompleted') || 'viaggi completati')}`,
      'past'
    );

    const initialTrips = pastTrips.slice(0, PAGE_SIZE);
    const cardsHtml = initialTrips.map(trip => tripCardUtils.renderTripCard(trip, lang, true, cardIndex++)).join('');
    const remaining = pastTrips.length - PAGE_SIZE;

    container.innerHTML = `
      <section class="home-section">
        ${headerHtml}
        <div class="grid md:grid-cols-2 lg:grid-cols-3" id="past-trips-grid">${cardsHtml}</div>
        ${remaining > 0 ? `
          <div class="past-trips-load-more">
            <button class="btn btn-secondary" id="load-more-past-trips">
              <span data-i18n="home.loadMoreTrips">${i18n.t('home.loadMoreTrips') || 'Mostra altri viaggi'}</span> (${remaining})
            </button>
          </div>
        ` : ''}
      </section>
    `;

    tripCardUtils.initCoverLazyLoad(container);
    initMenus();
    i18n.apply(container);

    // Paginazione "Mostra altri"
    if (remaining > 0) {
      let shown = PAGE_SIZE;
      const loadMoreBtn = document.getElementById('load-more-past-trips');
      const grid = document.getElementById('past-trips-grid');

      if (loadMoreBtn && grid) {
        loadMoreBtn.addEventListener('click', () => {
          const nextBatch = pastTrips.slice(shown, shown + PAGE_SIZE);
          const fragment = document.createDocumentFragment();
          const tempDiv = document.createElement('div');

          nextBatch.forEach(trip => {
            tempDiv.innerHTML = tripCardUtils.renderTripCard(trip, lang, true, cardIndex++);
            fragment.appendChild(tempDiv.firstElementChild);
          });

          grid.appendChild(fragment);
          shown += nextBatch.length;

          tripCardUtils.initCoverLazyLoad(grid);
          initMenus();
          i18n.apply(grid);

          const newRemaining = pastTrips.length - shown;
          if (newRemaining > 0) {
            loadMoreBtn.innerHTML = `<span data-i18n="home.loadMoreTrips">${i18n.t('home.loadMoreTrips') || 'Mostra altri viaggi'}</span> (${newRemaining})`;
          } else {
            loadMoreBtn.closest('.past-trips-load-more').remove();
          }
        });
      }
    }
  }

  function initMenus() {
    const onSuccess = () => loadPastTrips(document.getElementById('past-trips-container'));
    tripCardUtils.initTripCardMenus({
      onChangePhoto: (tripId, dest) => tripCardUtils.changePhoto(tripId, dest),
      onShare: (tripId, role, name) => shareModal.show(tripId, role, name),
      onRename: (tripId, name) => tripCardUtils.showRenameModal(tripId, name, onSuccess),
      onDelete: (tripId, name) => tripCardUtils.showDeleteModal(tripId, name, onSuccess)
    });
  }

  return { init };
})();

window.pastTripsPage = pastTripsPage;
