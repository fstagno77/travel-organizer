/**
 * Changelog - Shows latest version in a modal overlay
 */
const changelog = (function() {
  'use strict';

  let _data = null;

  /**
   * Load changelog data (cached)
   */
  async function loadData() {
    if (_data) return _data;
    _data = await utils.loadJSON('/data/changelog.json');
    return _data;
  }

  /**
   * Get current version string
   */
  async function getVersion() {
    try {
      const data = await loadData();
      return data.versions?.[0]?.version || '0.1.0';
    } catch (e) {
      return '0.1.0';
    }
  }

  /**
   * Show changelog modal with latest version
   */
  async function showModal() {
    // Remove existing modal
    document.getElementById('changelog-modal')?.remove();

    const lang = i18n.getLang();
    let content = '';

    try {
      const data = await loadData();
      const latest = data.versions?.[0];
      if (!latest) return;

      const changes = latest.changes[lang] || latest.changes.en || latest.changes;
      const changesList = Array.isArray(changes) ? changes : [changes];
      const date = utils.formatDate(latest.date, lang);

      content = `
        <div class="changelog-modal-header">
          <div>
            <span class="changelog-modal-version">v${latest.version}</span>
            <span class="changelog-modal-date">${date}</span>
          </div>
          <button class="changelog-modal-close" id="changelog-modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <ul class="changelog-modal-list">
          ${changesList.map(c => `<li>${c}</li>`).join('')}
        </ul>
      `;
    } catch (e) {
      content = `<p style="padding: 16px; color: var(--color-gray-500);">Could not load changelog.</p>`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'changelog-modal';
    overlay.className = 'changelog-modal-overlay';
    overlay.innerHTML = `<div class="changelog-modal">${content}</div>`;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Close handlers
    const close = () => {
      overlay.classList.remove('active');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    document.getElementById('changelog-modal-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    const onEsc = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    };
    document.addEventListener('keydown', onEsc);
  }

  return { getVersion, showModal };
})();

// Make available globally (required for Vite bundling)
window.changelog = changelog;
