/**
 * Airport Autocomplete
 * - IATA field: type 3 letters → auto-fills city (no dropdown)
 * - City field: type 2+ chars → dropdown with alternatives, selecting fills both city and IATA code
 */
const AirportAutocomplete = (() => {
  let _searchIndex = null;

  function getSearchIndex() {
    if (_searchIndex) return _searchIndex;
    if (typeof AIRPORTS === 'undefined') return [];
    _searchIndex = Object.entries(AIRPORTS).map(([code, [city, name, country]]) => ({
      code,
      city,
      name,
      country,
      _cityLower: city.toLowerCase(),
      _nameLower: name.toLowerCase()
    }));
    return _searchIndex;
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
        e.preventDefault();
        onSelect(airport);
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
  }

  function navigateDropdown(dropdown, direction) {
    const items = dropdown.querySelectorAll('.airport-autocomplete-item');
    if (!items.length) return;
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
  }

  function getActiveAirport(dropdown, results) {
    const active = dropdown.querySelector('.airport-autocomplete-item.active');
    if (!active) return null;
    return results[parseInt(active.dataset.index)] || null;
  }

  /**
   * Attach autocomplete to a pair of IATA code + city inputs.
   */
  function attach(codeInput, cityInput) {
    if (!codeInput || !cityInput) return;
    if (typeof AIRPORTS === 'undefined') return;

    // --- IATA field: no dropdown, just auto-fill city on exact match ---
    function autoFillFromCode() {
      const val = codeInput.value.trim().toUpperCase();
      if (val.length === 3 && AIRPORTS[val]) {
        cityInput.value = AIRPORTS[val][0];
      }
    }

    codeInput.addEventListener('input', autoFillFromCode);
    codeInput.addEventListener('change', autoFillFromCode);

    // --- City field: dropdown with alternatives ---
    const cityField = cityInput.closest('.edit-booking-field');
    if (cityField) cityField.style.position = 'relative';

    const dropdown = createDropdown();
    cityField.appendChild(dropdown);

    let results = [];
    let skipNextInput = false;

    function selectAirport(airport) {
      skipNextInput = true;
      codeInput.value = airport.code;
      cityInput.value = airport.city;
      dropdown.style.display = 'none';
    }

    cityInput.addEventListener('input', () => {
      if (skipNextInput) { skipNextInput = false; return; }
      const val = cityInput.value.trim();
      if (val.length < 2) {
        dropdown.style.display = 'none';
        results = [];
        return;
      }
      results = searchByCity(val);
      renderResults(dropdown, results, selectAirport);
    });

    cityInput.addEventListener('keydown', (e) => {
      if (dropdown.style.display !== 'block') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateDropdown(dropdown, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateDropdown(dropdown, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const airport = getActiveAirport(dropdown, results);
        if (airport) selectAirport(airport);
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });

    cityInput.addEventListener('blur', () => {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    });
  }

  function init(container) {
    if (!container) return;
    attach(
      container.querySelector('input[data-field="departure.code"]'),
      container.querySelector('input[data-field="departure.city"]')
    );
    attach(
      container.querySelector('input[data-field="arrival.code"]'),
      container.querySelector('input[data-field="arrival.city"]')
    );
  }

  return { init };
})();
