/**
 * City Autocomplete — Shared utility
 * Attaches a city search dropdown to a plain text input.
 * Uses /data/cities.json (same database as tripPage and tripCreator).
 *
 * Usage:
 *   await window.CityAutocomplete.attachToInput(inputEl, { onSelect(cityObj) {} });
 *
 * cityObj: { name, country, lat, lng }
 */
window.CityAutocomplete = (() => {
  'use strict';

  let _dbPromise = null;

  function loadCities() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = fetch('/data/cities.json')
      .then(r => r.json())
      .catch(() => []);
    return _dbPromise;
  }

  function searchCities(db, query) {
    if (!db || !db.length) return [];
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];

    const startsWith = [];
    const contains = [];

    for (const c of db) {
      const name = c.n.toLowerCase();
      if (name.startsWith(q)) {
        startsWith.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
        if (startsWith.length >= 8) break;
      } else if (name.includes(q)) {
        contains.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
      }
      if (startsWith.length + contains.length >= 30) break;
    }

    return [...startsWith, ...contains].slice(0, 8);
  }

  /**
   * Attach city autocomplete to an input element.
   * @param {HTMLInputElement} input
   * @param {Object} options
   * @param {Function} [options.onSelect] - called with cityObj when user picks a city
   */
  async function attachToInput(input, options = {}) {
    if (!input) return;

    const db = await loadCities();

    // Wrapper per positioning
    const wrapper = input.parentElement;
    if (!wrapper) return;
    const origPosition = getComputedStyle(wrapper).position;
    if (origPosition === 'static') wrapper.style.position = 'relative';

    const dropdown = document.createElement('div');
    dropdown.className = 'city-autocomplete-dropdown';
    wrapper.appendChild(dropdown);

    let activeIndex = -1;
    let currentResults = [];

    function hideDropdown() {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      activeIndex = -1;
      currentResults = [];
    }

    function setActiveItem(index) {
      dropdown.querySelectorAll('.city-autocomplete-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });
      activeIndex = index;
    }

    function selectCity(cityObj) {
      input.value = cityObj.name;
      hideDropdown();
      if (typeof options.onSelect === 'function') {
        options.onSelect(cityObj);
      }
      // Dispatch input event so any external listener picks up the change
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function showDropdown(results) {
      if (!results.length) { hideDropdown(); return; }
      activeIndex = -1;
      currentResults = results;

      dropdown.innerHTML = results.map((item, i) =>
        `<div class="city-autocomplete-item" data-index="${i}">
          <span class="city-autocomplete-name">${utils.escapeHtml(item.name)}</span>
          <span class="city-autocomplete-country">${utils.escapeHtml(item.country || '')}</span>
        </div>`
      ).join('');
      dropdown.classList.add('active');

      dropdown.querySelectorAll('.city-autocomplete-item').forEach((el, i) => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent blur before click
          selectCity(results[i]);
        });
        el.addEventListener('mouseenter', () => setActiveItem(i));
      });
    }

    input.addEventListener('input', () => {
      const val = input.value.trim();
      showDropdown(searchCities(db, val));
    });

    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.city-autocomplete-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveItem(Math.min(activeIndex + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveItem(Math.max(activeIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && currentResults[activeIndex]) {
          selectCity(currentResults[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    input.addEventListener('blur', () => {
      // Small delay to allow mousedown on dropdown items to fire first
      setTimeout(() => hideDropdown(), 200);
    });
  }

  /**
   * Init city autocomplete on all inputs matching a selector inside a container.
   * @param {HTMLElement} container
   * @param {string} selector - e.g. 'input[data-field="departure.city"]'
   * @param {Object} [options]
   */
  async function init(container, selector, options) {
    if (!container || !selector) return;
    const inputs = container.querySelectorAll(selector);
    for (const input of inputs) {
      await attachToInput(input, options);
    }
  }

  return { attachToInput, init, loadCities };
})();
