/**
 * DraftsPage - Pagina "In preparazione" — lista bozze dell'utente
 *
 * Ogni riga mostra: titolo, data creazione, numero prenotazioni, badge "Bozza", bottone elimina.
 * Query: trips WHERE status='draft' AND deleted_at IS NULL, ordinate per created_at DESC.
 */
const draftsPage = (function() {
  'use strict';

  // Icona cestino SVG
  const trashSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;

  /**
   * Conta il numero totale di prenotazioni in un viaggio bozza
   * (flights + hotels + trains + buses + ferries + rentals)
   * @param {Object} trip
   * @returns {number}
   */
  function countBookings(trip) {
    const d = trip.data || {};
    return (
      (d.flights?.length || 0) +
      (d.hotels?.length || 0) +
      (d.trains?.length || 0) +
      (d.buses?.length || 0) +
      (d.ferries?.length || 0) +
      (d.rentals?.length || 0)
    );
  }

  /**
   * Formato data creazione localizzato
   * @param {string} isoDate
   * @param {string} lang
   * @returns {string}
   */
  function formatCreatedAt(isoDate, lang) {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  }

  /**
   * Fetch bozze dell'utente autenticato
   * @returns {Promise<Array>}
   */
  async function fetchDrafts() {
    const supabaseClient = window.auth?.supabase;
    if (!supabaseClient) return [];
    const user = (await supabaseClient.auth.getUser()).data?.user;
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[draftsPage] fetchDrafts error:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Soft-delete di una bozza (imposta deleted_at = NOW())
   * @param {string} tripId
   * @returns {Promise<boolean>}
   */
  async function deleteDraft(tripId) {
    const { error } = await window.supabase
      .from('trips')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tripId);

    if (error) {
      console.error('[draftsPage] deleteDraft error:', error);
      return false;
    }
    return true;
  }

  /**
   * Render singola riga bozza
   * @param {Object} trip
   * @param {string} lang
   * @returns {string} HTML
   */
  function renderDraftItem(trip, lang) {
    const t = (k, fb) => (window.i18n?.t(k)) || fb;
    const esc = (v) => (window.utils?.escapeHtml(v)) || String(v || '');

    const title = (trip.data?.title && (trip.data.title[lang] || trip.data.title.it || trip.data.title.en))
      || (lang === 'it' ? 'Nuovo viaggio' : 'New trip');

    const createdAt = formatCreatedAt(trip.created_at, lang);
    const bookingCount = countBookings(trip);
    const activityCount = trip.data?.activities?.length || 0;

    const bookingLabel = bookingCount === 1
      ? (lang === 'it' ? '1 prenotazione' : '1 booking')
      : (lang === 'it' ? `${bookingCount} prenotazioni` : `${bookingCount} bookings`);
    const activityLabel = activityCount === 1
      ? (lang === 'it' ? '1 attività' : '1 activity')
      : (lang === 'it' ? `${activityCount} attività` : `${activityCount} activities`);

    const metaParts = [createdAt];
    if (bookingCount > 0) metaParts.push(bookingLabel);
    if (activityCount > 0) metaParts.push(activityLabel);
    const metaStr = metaParts.join(' · ');

    return `
      <div class="draft-list-item" data-draft-id="${esc(trip.id)}">
        <a href="/trip.html?id=${esc(trip.id)}" class="draft-list-item__link" aria-label="${esc(title)}">
          <span class="draft-list-item__title">${esc(title)}</span>
          <span class="draft-list-item__meta">${metaStr}</span>
        </a>
        <button
          class="draft-list-item__delete"
          data-draft-id="${esc(trip.id)}"
          data-draft-title="${esc(title)}"
          aria-label="Elimina bozza"
          title="Elimina"
        >${trashSvg}</button>
      </div>
    `;
  }

  /**
   * Render lista bozze nel container
   * @param {HTMLElement} container
   * @param {Array} drafts
   * @param {string} lang
   */
  function renderDrafts(container, drafts, lang) {
    const t = (k, fb) => (window.i18n?.t(k)) || fb;

    if (!drafts.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">${t('draft.empty', 'Nessuna bozza ancora.')}</h3>
          <p class="empty-state-text">${t('draft.emptyCta', 'Crea la tua prima bozza')}</p>
          <button class="btn btn-primary" id="drafts-create-cta">
            ${t('draft.emptyCta', 'Crea la tua prima bozza')}
          </button>
        </div>
      `;

      // CTA apre il modal TripCreator in modalità draft (toggle pre-attivato)
      const ctaBtn = container.querySelector('#drafts-create-cta');
      if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
          if (window.tripCreator && typeof window.tripCreator.openAsDraft === 'function') {
            window.tripCreator.openAsDraft();
          } else if (window.tripCreator && typeof window.tripCreator.open === 'function') {
            window.tripCreator.open();
          }
        });
      }

      if (window.i18n) window.i18n.apply(container);
      return;
    }

    const sectionTitle = t('draft.pageTitle', 'In preparazione');

    const itemsHtml = drafts.map(trip => renderDraftItem(trip, lang)).join('');

    container.innerHTML = `
      <section class="home-section">
        <div class="home-section-header">
          <h2 class="home-section-title">${sectionTitle} <span class="draft-count-inline">(${drafts.length})</span></h2>
        </div>
        <div class="draft-list" id="drafts-list">
          ${itemsHtml}
        </div>
      </section>
    `;

    if (window.i18n) window.i18n.apply(container);
    bindDraftEvents(container, drafts, lang);
  }

  /**
   * Attacca il listener di eliminazione (con conferma inline) a un singolo bottone cestino.
   * Estratto come funzione separata per poter essere richiamato dopo il ripristino della riga.
   *
   * @param {HTMLElement} btn        - Il bottone `.draft-list-item__delete`
   * @param {string}      tripId     - ID della bozza
   * @param {HTMLElement} container  - Container radice della pagina bozze
   * @param {Array}       drafts     - Array corrente delle bozze
   * @param {string}      lang       - Lingua attiva ('it' | 'en')
   * @param {Function}    t          - Helper traduzione
   */
  function bindDeleteButton(btn, tripId, container, drafts, lang, t) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = container.querySelector(`.draft-list-item[data-draft-id="${tripId}"]`);
      if (!row || row.classList.contains('is-confirming')) return;

      // Salva il contenuto originale per poterlo ripristinare
      const originalContent = row.innerHTML;

      // Mostra pannello di conferma inline
      row.classList.add('is-confirming');
      row.innerHTML = `
        <div class="draft-delete-confirm">
          <span>${t('draft.deleteConfirm', 'Eliminare questa bozza?')}</span>
          <button class="draft-delete-confirm__yes">Elimina</button>
          <button class="draft-delete-confirm__no">Annulla</button>
        </div>
      `;

      // Annulla — ripristina riga originale e riattacca listener
      row.querySelector('.draft-delete-confirm__no').addEventListener('click', (ev) => {
        ev.stopPropagation();
        row.classList.remove('is-confirming');
        row.innerHTML = originalContent;
        const newBtn = row.querySelector('.draft-list-item__delete');
        if (newBtn) bindDeleteButton(newBtn, tripId, container, drafts, lang, t);
      });

      // Conferma — procede con la cancellazione
      row.querySelector('.draft-delete-confirm__yes').addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const yesBtn = row.querySelector('.draft-delete-confirm__yes');
        if (yesBtn) yesBtn.disabled = true;

        const ok = await deleteDraft(tripId);
        if (ok) {
          row.remove();

          // Se non ci sono più bozze, ri-render empty state
          const remaining = container.querySelectorAll('.draft-list-item');
          if (!remaining.length) {
            const updatedDrafts = drafts.filter(d => d.id !== tripId);
            renderDrafts(container, updatedDrafts, lang);
          }

          // Aggiorna badge sidebar
          if (window.navigation?.updateDraftBadge) {
            window.navigation.updateDraftBadge();
          }

          if (window.utils?.showToast) {
            window.utils.showToast(lang === 'it' ? 'Bozza eliminata' : 'Draft deleted', 'success');
          }
        } else {
          // Ripristina riga in caso di errore e riattacca listener
          row.classList.remove('is-confirming');
          row.innerHTML = originalContent;
          const newBtn = row.querySelector('.draft-list-item__delete');
          if (newBtn) bindDeleteButton(newBtn, tripId, container, drafts, lang, t);

          if (window.utils?.showToast) {
            window.utils.showToast(window.i18n?.t('common.error') || 'Errore', 'error');
          }
        }
      });
    });
  }

  /**
   * Bind eventi su ogni riga (link click + delete)
   */
  function bindDraftEvents(container, drafts, lang) {
    const t = (k, fb) => (window.i18n?.t(k)) || fb;

    // Link navigazione — ogni riga è cliccabile (click su area non-button)
    container.querySelectorAll('.draft-list-item__link').forEach(link => {
      link.addEventListener('click', (e) => {
        // Navigazione standard href
      });
    });

    // Bottoni elimina — conferma inline (niente window.confirm)
    container.querySelectorAll('.draft-list-item__delete').forEach(btn => {
      const tripId = btn.dataset.draftId;
      bindDeleteButton(btn, tripId, container, drafts, lang, t);
    });
  }

  /**
   * Initialize drafts page
   */
  async function init() {
    const container = document.getElementById('drafts-container');
    if (!container) return;

    if (!window.auth?.isAuthenticated()) {
      window.location.href = './login.html';
      return;
    }

    try {
      const lang = window.i18n?.getLang() || 'it';
      const drafts = await fetchDrafts();
      renderDrafts(container, drafts, lang);
    } catch (error) {
      console.error('[draftsPage] init error:', error);
      container.innerHTML = `<div class="empty-state"><p>${window.i18n?.t('common.error') || 'Errore'}</p></div>`;
    }
  }

  // Esponi API pubblica
  window.draftsPage = {
    init,
    fetchDrafts,
    deleteDraft,
    countBookings,
    renderDraftItem,
    renderDrafts,
    formatCreatedAt,
  };

  return { init, fetchDrafts, deleteDraft, countBookings, renderDraftItem, renderDrafts, formatCreatedAt };
})();
