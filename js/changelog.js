/**
 * Changelog - Changelog page initialization and rendering
 */
const changelog = (function() {
  'use strict';

  /**
   * Initialize changelog page
   */
  async function init() {
    const changelogList = document.getElementById('changelog-list');
    if (!changelogList) return;

    try {
      changelogList.innerHTML = `<div class="changelog-loading"><span class="spinner"></span></div>`;

      const changelogData = await utils.loadJSON('/data/changelog.json');

      renderChangelog(changelogList, changelogData.versions);
    } catch (error) {
      console.error('Error loading changelog:', error);
      changelogList.innerHTML = `
        <div class="changelog-error" data-i18n="common.error">An error occurred</div>
      `;
      i18n.apply(changelogList);
    }
  }

  /**
   * Render changelog entries
   * @param {HTMLElement} container
   * @param {Array} versions
   */
  function renderChangelog(container, versions) {
    const lang = i18n.getLang();

    const html = versions.map(version => {
      const changes = version.changes[lang] || version.changes.en || version.changes;
      const changesList = Array.isArray(changes) ? changes : [changes];

      return `
        <article class="changelog-card">
          <header class="changelog-card-header">
            <span class="changelog-version">v${version.version}</span>
            <span class="changelog-date">${utils.formatDate(version.date, lang)}</span>
          </header>
          <ul class="changelog-changes">
            ${changesList.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </article>
      `;
    }).join('');

    container.innerHTML = html;
  }

  return { init };
})();

// Make available globally (required for Vite bundling)
window.changelog = changelog;
