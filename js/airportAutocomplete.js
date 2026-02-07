/**
 * Airport Autocomplete
 * - IATA field: type letters → dropdown with matching codes, selecting fills city too
 * - City field: type 2+ chars → dropdown with matching cities, selecting fills IATA code too
 * Both dropdowns appear below their respective input fields.
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

  function searchByCode(query) {
    const q = query.toUpperCase();
    const index = getSearchIndex();
    const results = [];
    for (let i = 0; i < index.length && results.length < 8; i++) {
      if (index[i].code.startsWith(q)) results.push(index[i]);
    }
    return results;
  }

  function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function searchByCity(query) {
    const q = query.toLowerCase();
    const qUpper = query.toUpperCase();
    const index = getSearchIndex();
    const exact = [];
    const startsWith = [];
    const codeMatch = [];
    const prefixMatch = [];
    const contains = [];
    for (let i = 0; i < index.length; i++) {
      const a = index[i];
      if (a._cityLower === q) {
        exact.push(a);
      } else if (a._cityLower.startsWith(q)) {
        startsWith.push(a);
      } else if (q.length >= 2 && a.code.startsWith(qUpper)) {
        codeMatch.push(a);
      } else if (q.length >= 3 && commonPrefixLen(a._cityLower, q) >= 3) {
        prefixMatch.push(a);
      } else if (a._cityLower.includes(q) || a._nameLower.includes(q)) {
        contains.push(a);
      }
      if (exact.length + startsWith.length + codeMatch.length + prefixMatch.length + contains.length >= 30) break;
    }
    return [...exact, ...startsWith, ...codeMatch, ...prefixMatch, ...contains].slice(0, 8);
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

  function attachDropdown(input, searchFn, onSelect) {
    const field = input.closest('.edit-booking-field');
    if (!field) return;
    field.style.position = 'relative';

    const dropdown = createDropdown();
    field.appendChild(dropdown);

    let results = [];
    let skipNextInput = false;

    function select(airport) {
      skipNextInput = true;
      onSelect(airport);
      dropdown.style.display = 'none';
    }

    input.addEventListener('input', () => {
      if (skipNextInput) { skipNextInput = false; return; }
      const val = input.value.trim();
      if (val.length < 1) {
        dropdown.style.display = 'none';
        results = [];
        return;
      }
      results = searchFn(val);
      renderResults(dropdown, results, select);
    });

    input.addEventListener('keydown', (e) => {
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
        if (airport) select(airport);
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    });

    return { setSkip: () => { skipNextInput = true; } };
  }

  function attach(codeInput, cityInput) {
    if (!codeInput || !cityInput) return;
    if (typeof AIRPORTS === 'undefined') return;

    const cityCtrl = attachDropdown(cityInput, searchByCity, (airport) => {
      codeInput.value = airport.code;
      cityInput.value = airport.city;
    });

    const codeCtrl = attachDropdown(codeInput, searchByCode, (airport) => {
      codeInput.value = airport.code;
      cityInput.value = airport.city;
      if (cityCtrl) cityCtrl.setSkip();
    });

    // Also auto-fill city silently when typing exact 3-letter IATA match
    codeInput.addEventListener('input', () => {
      const val = codeInput.value.trim().toUpperCase();
      if (val.length === 3 && AIRPORTS[val]) {
        cityInput.value = AIRPORTS[val][0];
        if (cityCtrl) cityCtrl.setSkip();
      }
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
