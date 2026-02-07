/**
 * Airport Autocomplete
 * Attaches autocomplete to IATA code and city inputs in the flight edit form.
 * - Type in IATA field → suggests by code, auto-fills city
 * - Type in City field → suggests by city/airport name, auto-fills IATA code
 */
const AirportAutocomplete = (() => {
  // Pre-build search array once on first use (lazy)
  let _searchIndex = null;

  function getSearchIndex() {
    if (_searchIndex) return _searchIndex;
    if (typeof AIRPORTS === 'undefined') return [];
    _searchIndex = Object.entries(AIRPORTS).map(([code, [city, name, country]]) => ({
      code,
      city,
      name,
      country,
      // Pre-compute lowercase for fast search
      _cityLower: city.toLowerCase(),
      _nameLower: name.toLowerCase(),
      _codeLower: code.toLowerCase()
    }));
    return _searchIndex;
  }

  function searchByCode(query) {
    const q = query.toUpperCase();
    const index = getSearchIndex();
    const results = [];
    for (let i = 0; i < index.length && results.length < 8; i++) {
      if (index[i].code.startsWith(q)) results.push(index[i]);
    }
    return results;
  }

  function searchByCity(query) {
    const q = query.toLowerCase();
    const index = getSearchIndex();
    const exact = [];
    const startsWith = [];
    const contains = [];
    for (let i = 0; i < index.length; i++) {
      const a = index[i];
      if (a._cityLower === q) {
        exact.push(a);
      } else if (a._cityLower.startsWith(q)) {
        startsWith.push(a);
      } else if (a._cityLower.includes(q) || a._nameLower.includes(q)) {
        contains.push(a);
      }
      if (exact.length + startsWith.length + contains.length >= 30) break;
    }
    return [...exact, ...startsWith, ...contains].slice(0, 8);
  }

  function createDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'airport-autocomplete-dropdown';
    return dropdown;
  }

  function renderResults(dropdown, results, onSelect) {
    dropdown.innerHTML = '';
    if (results.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    results.forEach((airport, i) => {
      const item = document.createElement('div');
      item.className = 'airport-autocomplete-item';
      if (i === 0) item.classList.add('active');
      item.dataset.index = i;
      item.innerHTML = `<span class="ac-code">${airport.code}</span>` +
        `<span class="ac-detail">${airport.city}${airport.country ? ' <span class="ac-country">' + airport.country + '</span>' : ''}</span>` +
        `<span class="ac-name">${airport.name}</span>`;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur
        onSelect(airport);
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
  }

  function navigateDropdown(dropdown, direction) {
    const items = dropdown.querySelectorAll('.airport-autocomplete-item');
    if (!items.length) return null;
    let activeIdx = -1;
    items.forEach((item, i) => {
      if (item.classList.contains('active')) activeIdx = i;
    });
    if (activeIdx >= 0) items[activeIdx].classList.remove('active');
    let newIdx = activeIdx + direction;
    if (newIdx < 0) newIdx = items.length - 1;
    if (newIdx >= items.length) newIdx = 0;
    items[newIdx].classList.add('active');
    items[newIdx].scrollIntoView({ block: 'nearest' });
    return parseInt(items[newIdx].dataset.index);
  }

  function getActiveIndex(dropdown) {
    const active = dropdown.querySelector('.airport-autocomplete-item.active');
    return active ? parseInt(active.dataset.index) : -1;
  }

  /**
   * Attach autocomplete to a pair of IATA code + city inputs.
   * @param {HTMLInputElement} codeInput - The IATA code input
   * @param {HTMLInputElement} cityInput - The city input
   */
  function attach(codeInput, cityInput) {
    if (!codeInput || !cityInput) return;
    if (typeof AIRPORTS === 'undefined') return;

    // Wrap each input's parent (.edit-booking-field) for relative positioning
    [codeInput, cityInput].forEach(input => {
      const field = input.closest('.edit-booking-field');
      if (field) field.style.position = 'relative';
    });

    const codeDropdown = createDropdown();
    const cityDropdown = createDropdown();
    codeInput.closest('.edit-booking-field').appendChild(codeDropdown);
    cityInput.closest('.edit-booking-field').appendChild(cityDropdown);

    let codeResults = [];
    let cityResults = [];

    function selectFromCode(airport) {
      codeInput.value = airport.code;
      cityInput.value = airport.city;
      codeDropdown.style.display = 'none';
      // Trigger change events so form picks up values
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function selectFromCity(airport) {
      codeInput.value = airport.code;
      cityInput.value = airport.city;
      cityDropdown.style.display = 'none';
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // IATA code input
    codeInput.addEventListener('input', () => {
      const val = codeInput.value.trim();
      if (val.length === 0) {
        codeDropdown.style.display = 'none';
        return;
      }
      codeResults = searchByCode(val);
      renderResults(codeDropdown, codeResults, selectFromCode);
      // If exact 3-letter match, auto-fill city
      if (val.length === 3) {
        const upper = val.toUpperCase();
        if (AIRPORTS[upper]) {
          cityInput.value = AIRPORTS[upper][0];
          cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    codeInput.addEventListener('keydown', (e) => {
      if (codeDropdown.style.display !== 'block') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateDropdown(codeDropdown, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateDropdown(codeDropdown, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const idx = getActiveIndex(codeDropdown);
        if (idx >= 0 && codeResults[idx]) selectFromCode(codeResults[idx]);
      } else if (e.key === 'Escape') {
        codeDropdown.style.display = 'none';
      }
    });

    codeInput.addEventListener('blur', () => {
      setTimeout(() => { codeDropdown.style.display = 'none'; }, 150);
    });

    // City input
    cityInput.addEventListener('input', () => {
      const val = cityInput.value.trim();
      if (val.length < 2) {
        cityDropdown.style.display = 'none';
        return;
      }
      cityResults = searchByCity(val);
      renderResults(cityDropdown, cityResults, selectFromCity);
    });

    cityInput.addEventListener('keydown', (e) => {
      if (cityDropdown.style.display !== 'block') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateDropdown(cityDropdown, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateDropdown(cityDropdown, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const idx = getActiveIndex(cityDropdown);
        if (idx >= 0 && cityResults[idx]) selectFromCity(cityResults[idx]);
      } else if (e.key === 'Escape') {
        cityDropdown.style.display = 'none';
      }
    });

    cityInput.addEventListener('blur', () => {
      setTimeout(() => { cityDropdown.style.display = 'none'; }, 150);
    });
  }

  /**
   * Scan a container for departure/arrival code+city pairs and attach autocomplete.
   * Call this after the edit form HTML is inserted into the DOM.
   */
  function init(container) {
    if (!container) return;
    const depCode = container.querySelector('input[data-field="departure.code"]');
    const depCity = container.querySelector('input[data-field="departure.city"]');
    const arrCode = container.querySelector('input[data-field="arrival.code"]');
    const arrCity = container.querySelector('input[data-field="arrival.city"]');
    attach(depCode, depCity);
    attach(arrCode, arrCity);
  }

  return { init, attach };
})();
