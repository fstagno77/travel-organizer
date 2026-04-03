/**
 * manualBookingForm.js
 * Gestisce i form di creazione manuale prenotazione.
 * Espone window.manualBookingForm.open(type, modal, tripId, { onSaved })
 */
window.manualBookingForm = (() => {
  'use strict';

  // Opzioni classe volo per CustomSelect
  const FLIGHT_CLASS_OPTIONS = [
    { value: '', label: '— Seleziona classe —' },
    { value: 'economy', label: 'Economy' },
    { value: 'premium_economy', label: 'Premium Economy' },
    { value: 'business', label: 'Business' },
    { value: 'first', label: 'First' },
  ];

  /**
   * Mostra un errore inline sotto un campo.
   * @param {HTMLElement} input
   * @param {string} msg
   */
  function showFieldError(input, msg) {
    input.classList.add('input-error');
    let err = input.parentElement.querySelector('.field-error-msg');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error-msg';
      err.style.cssText = 'color:var(--color-danger,#e53e3e);font-size:var(--font-size-sm);margin:4px 0 0;';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  /**
   * Rimuove l'errore inline da un campo.
   * @param {HTMLElement} input
   */
  function clearFieldError(input) {
    input.classList.remove('input-error');
    const err = input.parentElement?.querySelector('.field-error-msg');
    if (err) err.remove();
  }

  /**
   * Aggiorna lo stato del pulsante Salva.
   * Disabilitato finché tutti i campi obbligatori non hanno un valore.
   * @param {HTMLElement} form
   * @param {HTMLButtonElement} saveBtn
   */
  function updateSaveBtn(form, saveBtn) {
    const requiredInputs = form.querySelectorAll('[data-required]');
    let allFilled = true;
    requiredInputs.forEach(input => {
      if (!input.value || input.value.trim() === '') allFilled = false;
    });
    saveBtn.disabled = !allFilled;
  }

  /**
   * Costruisce un <div class="form-group"> con label + input.
   * @param {Object} opts
   * @returns {{wrapper: HTMLElement, input: HTMLInputElement}}
   */
  function buildField({ id, label, type = 'text', placeholder = '', required = false, value = '' }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.innerHTML = required
      ? `${label} <span style="color:var(--color-danger,#e53e3e)">*</span>`
      : label;
    wrapper.appendChild(lbl);

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.className = 'form-input';
    input.placeholder = placeholder;
    if (value) input.value = value;
    if (required) input.dataset.required = '1';
    wrapper.appendChild(input);

    return { wrapper, input };
  }

  /**
   * Costruisce un wrapper a due colonne per due form-group affiancati.
   * @param {HTMLElement} leftGroup
   * @param {HTMLElement} rightGroup
   * @returns {HTMLElement}
   */
  function buildRow(leftGroup, rightGroup) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:var(--spacing-3);';
    leftGroup.style.flex = '1';
    rightGroup.style.flex = '1';
    row.appendChild(leftGroup);
    row.appendChild(rightGroup);
    return row;
  }

  /**
   * Costruisce una sezione con titolo, usando le classi del form di edit.
   * @param {string} title
   * @returns {{ section: HTMLElement, grid: HTMLElement }}
   */
  function buildSection(title) {
    const section = document.createElement('div');
    section.className = 'edit-booking-section';

    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'edit-booking-section-title';
      titleEl.textContent = title;
      section.appendChild(titleEl);
    }

    const grid = document.createElement('div');
    grid.className = 'edit-booking-grid';
    section.appendChild(grid);

    return { section, grid };
  }

  /**
   * Costruisce un campo nel formato edit-booking-field.
   * @param {Object} opts
   * @returns {{ wrapper: HTMLElement, input: HTMLInputElement }}
   */
  function buildEditField({ id, label, type = 'text', placeholder = '', required = false, value = '', fullWidth = false }) {
    const wrapper = document.createElement('div');
    wrapper.className = fullWidth ? 'edit-booking-field full-width' : 'edit-booking-field';

    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.innerHTML = required
      ? `${label} <span style="color:var(--color-danger,#e53e3e)">*</span>`
      : label;
    wrapper.appendChild(lbl);

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.placeholder = placeholder;
    if (value) input.value = value;
    if (required) input.dataset.required = '1';
    wrapper.appendChild(input);

    return { wrapper, input };
  }

  /**
   * Costruisce la sezione passeggeri con header + bottone "+ Aggiungi" + lista dinamica.
   * Pattern identico al form di edit ferry.
   * @param {Array} initialPassengers - array di passeggeri da pre-popolare
   * @param {Array} passengerTypeOptions - opzioni per CustomSelect tipo passeggero
   * @returns {{ section: HTMLElement, getPassengers: function }}
   */
  function buildPassengersSection(initialPassengers = [], passengerTypeOptions) {
    const section = document.createElement('div');
    section.className = 'edit-booking-section';
    section.style.marginTop = '16px';

    // Header con bottone aggiungi
    const header = document.createElement('div');
    header.className = 'edit-booking-section-title';
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Passeggeri';
    header.appendChild(titleSpan);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'edit-booking-add-row';
    addBtn.style.margin = '0';
    addBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi passeggero`;
    header.appendChild(addBtn);
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'edit-booking-passengers-list';
    section.appendChild(list);

    const removeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    function addPassengerRow(pax = { name: '', type: '' }) {
      const idx = list.querySelectorAll('.edit-booking-passenger-row').length;
      const row = document.createElement('div');
      row.className = 'edit-booking-passenger-row';
      row.dataset.passengerIndex = idx;

      // Nome
      const nameField = document.createElement('div');
      nameField.className = 'edit-booking-field';
      nameField.style.flex = '1';
      const nameLbl = document.createElement('label');
      nameLbl.textContent = 'Nome';
      nameField.appendChild(nameLbl);
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.dataset.paxField = 'name';
      nameInput.dataset.paxIndex = idx;
      nameInput.value = pax.name || '';
      nameField.appendChild(nameInput);
      row.appendChild(nameField);

      // Tipo (CustomSelect)
      const typeField = document.createElement('div');
      typeField.className = 'edit-booking-field';
      typeField.style.width = '130px';
      const typeLbl = document.createElement('label');
      typeLbl.textContent = 'Tipo';
      typeField.appendChild(typeLbl);
      if (window.CustomSelect) {
        const cs = window.CustomSelect.create({
          options: passengerTypeOptions,
          selected: pax.type || (passengerTypeOptions[0]?.value || ''),
          className: 'cs-pax-type',
          dataAttrs: { paxField: 'type', paxIndex: String(idx) }
        });
        typeField.appendChild(cs);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.dataset.paxField = 'type';
        inp.dataset.paxIndex = idx;
        inp.value = pax.type || '';
        typeField.appendChild(inp);
      }
      row.appendChild(typeField);

      // Rimuovi
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'edit-booking-remove-row';
      removeBtn.title = 'Rimuovi passeggero';
      removeBtn.innerHTML = removeIcon;
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      list.appendChild(row);
      return nameInput;
    }

    // Pre-popola
    initialPassengers.forEach(p => addPassengerRow(p));

    addBtn.addEventListener('click', () => {
      const inp = addPassengerRow({ name: '', type: '' });
      inp.focus();
    });

    const getPassengers = () => {
      const rows = list.querySelectorAll('.edit-booking-passenger-row');
      const result = [];
      rows.forEach(row => {
        const nameInput = row.querySelector('input[data-pax-field="name"]');
        const name = nameInput?.value.trim() || '';
        let type = '';
        const csWrapper = row.querySelector('.cs-wrapper');
        if (csWrapper && window.CustomSelect) {
          type = window.CustomSelect.getValue(csWrapper) || '';
        } else {
          const typeInput = row.querySelector('input[data-pax-field="type"]');
          type = typeInput?.value.trim() || '';
        }
        if (name) result.push({ name, type: type || undefined });
      });
      return result;
    };

    return { section, getPassengers };
  }

  /**
   * Costruisce la sezione veicoli con header + bottone "+ Aggiungi" + lista dinamica.
   * Pattern identico al form di edit ferry.
   * @param {Array} initialVehicles - array di veicoli da pre-popolare
   * @param {Array} vehicleTypeOptions - opzioni per CustomSelect tipo veicolo
   * @returns {{ section: HTMLElement, getVehicles: function }}
   */
  function buildVehiclesSection(initialVehicles = [], vehicleTypeOptions) {
    const section = document.createElement('div');
    section.className = 'edit-booking-section';
    section.style.marginTop = '16px';

    const header = document.createElement('div');
    header.className = 'edit-booking-section-title';
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Veicoli a bordo';
    header.appendChild(titleSpan);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'edit-booking-add-row';
    addBtn.style.margin = '0';
    addBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi veicolo`;
    header.appendChild(addBtn);
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'edit-booking-vehicles-list';
    section.appendChild(list);

    const removeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    function addVehicleRow(veh = { type: '', plate: '' }) {
      const idx = list.querySelectorAll('.edit-booking-vehicle-row').length;
      const row = document.createElement('div');
      row.className = 'edit-booking-vehicle-row';
      row.dataset.vehicleIndex = idx;

      // Tipo (CustomSelect)
      const typeField = document.createElement('div');
      typeField.className = 'edit-booking-field';
      typeField.style.width = '130px';
      const typeLbl = document.createElement('label');
      typeLbl.textContent = 'Tipo';
      typeField.appendChild(typeLbl);
      if (window.CustomSelect) {
        const cs = window.CustomSelect.create({
          options: vehicleTypeOptions,
          selected: veh.type || (vehicleTypeOptions[0]?.value || ''),
          className: 'cs-veh-type',
          dataAttrs: { vehField: 'type', vehIndex: String(idx) }
        });
        typeField.appendChild(cs);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.dataset.vehField = 'type';
        inp.dataset.vehIndex = idx;
        inp.value = veh.type || '';
        typeField.appendChild(inp);
      }
      row.appendChild(typeField);

      // Targa
      const plateField = document.createElement('div');
      plateField.className = 'edit-booking-field';
      plateField.style.flex = '1';
      const plateLbl = document.createElement('label');
      plateLbl.textContent = 'Targa';
      plateField.appendChild(plateLbl);
      const plateInput = document.createElement('input');
      plateInput.type = 'text';
      plateInput.dataset.vehField = 'plate';
      plateInput.dataset.vehIndex = idx;
      plateInput.value = veh.plate || '';
      plateField.appendChild(plateInput);
      row.appendChild(plateField);

      // Rimuovi
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'edit-booking-remove-row';
      removeBtn.title = 'Rimuovi veicolo';
      removeBtn.innerHTML = removeIcon;
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      list.appendChild(row);
      return plateInput;
    }

    // Pre-popola
    initialVehicles.forEach(v => addVehicleRow(v));

    addBtn.addEventListener('click', () => {
      const inp = addVehicleRow({ type: '', plate: '' });
      inp.focus();
    });

    const getVehicles = () => {
      const rows = list.querySelectorAll('.edit-booking-vehicle-row');
      const result = [];
      rows.forEach(row => {
        let type = '';
        const csWrapper = row.querySelector('.cs-wrapper');
        if (csWrapper && window.CustomSelect) {
          type = window.CustomSelect.getValue(csWrapper) || '';
        } else {
          const typeInput = row.querySelector('input[data-veh-field="type"]');
          type = typeInput?.value.trim() || '';
        }
        const plateInput = row.querySelector('input[data-veh-field="plate"]');
        const plate = plateInput?.value.trim() || '';
        if (type || plate) result.push({ type: type || undefined, plate: plate || undefined });
      });
      return result;
    };

    return { section, getVehicles };
  }

  /**
   * Costruisce la sezione upload documento opzionale.
   * @returns {{wrapper: HTMLElement, getFile: function(): File|null}}
   */
  function buildDocumentUpload() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group manual-booking-doc-upload';

    const lbl = document.createElement('label');
    lbl.textContent = 'Documento allegato (opzionale)';
    wrapper.appendChild(lbl);

    const zone = document.createElement('div');
    zone.className = 'manual-booking-upload-zone';
    zone.style.cssText = `
      border: 1.5px dashed var(--color-gray-300);
      border-radius: var(--radius-md);
      padding: var(--spacing-4);
      text-align: center;
      cursor: pointer;
      background: var(--color-gray-50,#f9fafb);
      transition: border-color 0.15s;
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,image/*';
    fileInput.hidden = true;
    fileInput.id = 'manual-booking-doc-input';

    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-gray-500);margin:0;pointer-events:none;';
    hint.textContent = 'Clicca o trascina un PDF o immagine';

    zone.appendChild(hint);
    wrapper.appendChild(fileInput);
    wrapper.appendChild(zone);

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.style.borderColor = 'var(--color-primary)';
    });
    zone.addEventListener('dragleave', () => {
      zone.style.borderColor = 'var(--color-gray-300)';
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = 'var(--color-gray-300)';
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        hint.textContent = e.dataTransfer.files[0].name;
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        hint.textContent = fileInput.files[0].name;
      }
    });

    return {
      wrapper,
      getFile: () => (fileInput.files.length > 0 ? fileInput.files[0] : null)
    };
  }

  /**
   * Costruisce il form volo.
   * @param {Object} prefill - dati da pre-popolare (es. da SmartParse parziale)
   * @returns {{ form: HTMLElement, getValues: function, saveBtn: HTMLButtonElement }}
   */
  function buildFlightForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--flight edit-booking-form';
    form.dataset.bookingType = 'flight';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Volo ---
    const { section: sVolo, grid: gVolo } = buildSection('Volo');

    const { wrapper: wFlightNum, input: iFlightNum } = buildEditField({
      id: 'mbf-flight-number', label: 'Codice volo', required: true,
      placeholder: 'es. AZ0610', value: prefill.flightNumber || ''
    });
    const { wrapper: wAirline, input: iAirline } = buildEditField({
      id: 'mbf-airline', label: 'Compagnia aerea', required: true,
      placeholder: 'es. ITA Airways', value: prefill.airline || ''
    });
    const { wrapper: wDate, input: iDate } = buildEditField({
      id: 'mbf-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildEditField({
      id: 'mbf-departure-time', label: 'Orario partenza', type: 'time', required: true,
      value: prefill.departureTime || ''
    });
    const { wrapper: wArrTime, input: iArrTime } = buildEditField({
      id: 'mbf-arrival-time', label: 'Orario arrivo', type: 'time',
      value: prefill.arrivalTime || ''
    });
    gVolo.appendChild(wFlightNum);
    gVolo.appendChild(wAirline);
    gVolo.appendChild(wDate);
    gVolo.appendChild(wDepTime);
    gVolo.appendChild(wArrTime);
    scroll.appendChild(sVolo);

    // --- SEZIONE: Partenza ---
    const { section: sDep, grid: gDep } = buildSection('Partenza');

    const { wrapper: wDepCity, input: iDepCity } = buildEditField({
      id: 'mbf-departure-city', label: 'Città / Aeroporto', required: true,
      placeholder: 'es. Roma Fiumicino (FCO)', value: prefill.departureCity || (prefill.departure?.city || '')
    });
    const { wrapper: wDepCode, input: iDepCode } = buildEditField({
      id: 'mbf-departure-code', label: 'IATA',
      placeholder: 'es. FCO', value: prefill.departure?.code || ''
    });
    const { wrapper: wDepTerminal, input: iDepTerminal } = buildEditField({
      id: 'mbf-departure-terminal', label: 'Terminal',
      placeholder: 'es. T1', value: prefill.departure?.terminal || ''
    });
    gDep.appendChild(wDepCity);
    gDep.appendChild(wDepCode);
    gDep.appendChild(wDepTerminal);
    scroll.appendChild(sDep);

    // --- SEZIONE: Arrivo ---
    const { section: sArr, grid: gArr } = buildSection('Arrivo');

    const { wrapper: wArrCity, input: iArrCity } = buildEditField({
      id: 'mbf-arrival-city', label: 'Città / Aeroporto', required: true,
      placeholder: 'es. New York (JFK)', value: prefill.arrivalCity || (prefill.arrival?.city || '')
    });
    const { wrapper: wArrCode, input: iArrCode } = buildEditField({
      id: 'mbf-arrival-code', label: 'IATA',
      placeholder: 'es. JFK', value: prefill.arrival?.code || ''
    });
    const { wrapper: wArrTerminal, input: iArrTerminal } = buildEditField({
      id: 'mbf-arrival-terminal', label: 'Terminal',
      placeholder: 'es. T4', value: prefill.arrival?.terminal || ''
    });
    gArr.appendChild(wArrCity);
    gArr.appendChild(wArrCode);
    gArr.appendChild(wArrTerminal);
    scroll.appendChild(sArr);

    // --- SEZIONE: Prenotazione ---
    const { section: sBook, grid: gBook } = buildSection('Prenotazione');

    const { wrapper: wPnr, input: iPnr } = buildEditField({
      id: 'mbf-pnr', label: 'Riferimento / PNR', placeholder: 'es. ABC123',
      value: prefill.bookingReference || prefill.pnr || ''
    });

    // Classe volo (CustomSelect — no <select> nativo)
    const wClass = document.createElement('div');
    wClass.className = 'edit-booking-field';
    const lblClass = document.createElement('label');
    lblClass.textContent = 'Classe';
    wClass.appendChild(lblClass);
    let classSelect = null;
    if (window.CustomSelect) {
      classSelect = window.CustomSelect.create({
        options: FLIGHT_CLASS_OPTIONS,
        selected: prefill.class || '',
      });
      wClass.appendChild(classSelect);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'mbf-class';
      inp.placeholder = 'economy, business…';
      inp.value = prefill.class || '';
      wClass.appendChild(inp);
    }

    const { wrapper: wSeat, input: iSeat } = buildEditField({
      id: 'mbf-seat', label: 'Posto', placeholder: 'es. 12A', value: prefill.seat || ''
    });
    const { wrapper: wBaggage, input: iBaggage } = buildEditField({
      id: 'mbf-baggage', label: 'Bagaglio', placeholder: 'es. 23kg', value: prefill.baggage || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    gBook.appendChild(wPnr);
    gBook.appendChild(wClass);
    gBook.appendChild(wSeat);
    gBook.appendChild(wBaggage);
    gBook.appendChild(wPrice);
    scroll.appendChild(sBook);

    // Upload documento
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva volo';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone al cambio dei required
    const requiredInputs = [iFlightNum, iAirline, iDate, iDepTime, iDepCity, iArrCity];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => {
        clearFieldError(inp);
        updateSaveBtn(form, saveBtn);
      });
    });

    const getValues = () => {
      const flightClass = classSelect ? window.CustomSelect.getValue(classSelect) : (form.querySelector('#mbf-class')?.value || '');

      return {
        flightNumber: iFlightNum.value.trim(),
        airline: iAirline.value.trim(),
        date: iDate.value,
        departureTime: iDepTime.value,
        arrivalTime: iArrTime.value || undefined,
        departure: {
          city: iDepCity.value.trim(),
          code: iDepCode.value.trim().toUpperCase() || undefined,
          terminal: iDepTerminal.value.trim() || undefined,
        },
        arrival: {
          city: iArrCity.value.trim(),
          code: iArrCode.value.trim().toUpperCase() || undefined,
          terminal: iArrTerminal.value.trim() || undefined,
        },
        class: flightClass || undefined,
        seat: iSeat.value.trim() || undefined,
        baggage: iBaggage.value.trim() || undefined,
        bookingReference: iPnr.value.trim() || undefined,
        price: iPrice.value ? parseFloat(iPrice.value) : undefined,
      };
    };

    const validate = () => {
      let valid = true;
      const checks = [
        { input: iFlightNum, msg: 'Inserisci il codice volo' },
        { input: iAirline,   msg: 'Inserisci la compagnia aerea' },
        { input: iDate,      msg: 'Inserisci la data del volo' },
        { input: iDepTime,   msg: 'Inserisci l\'orario di partenza' },
        { input: iDepCity,   msg: 'Inserisci la città/aeroporto di partenza' },
        { input: iArrCity,   msg: 'Inserisci la città/aeroporto di arrivo' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else {
          clearFieldError(input);
        }
      });
      return valid;
    };

    return { form, getValues, validate, saveBtn, getFile };
  }

  /**
   * Calcola il numero di notti tra due date in formato YYYY-MM-DD.
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {number|null}
   */
  function calcNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return null;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }

  /**
   * Costruisce il form hotel.
   * @param {Object} prefill - dati da pre-popolare
   * @returns {{ form: HTMLElement, getValues: function, validate: function, saveBtn: HTMLButtonElement, getFile: function }}
   */
  function buildHotelForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--hotel edit-booking-form';
    form.dataset.bookingType = 'hotel';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Hotel ---
    const { section: sHotel, grid: gHotel } = buildSection('Hotel');

    const { wrapper: wName, input: iName } = buildEditField({
      id: 'mbf-hotel-name', label: 'Nome hotel', required: true, fullWidth: true,
      placeholder: 'es. Hotel Excelsior', value: prefill.name || ''
    });
    const { wrapper: wCheckIn, input: iCheckIn } = buildEditField({
      id: 'mbf-hotel-checkin', label: 'Data check-in', type: 'date', required: true,
      value: prefill.checkIn?.date || prefill.checkInDate || ''
    });
    const { wrapper: wCheckInTime, input: iCheckInTime } = buildEditField({
      id: 'mbf-hotel-checkin-time', label: 'Check-in — Orario', type: 'time',
      value: prefill.checkIn?.time || ''
    });
    const { wrapper: wCheckOut, input: iCheckOut } = buildEditField({
      id: 'mbf-hotel-checkout', label: 'Data check-out', type: 'date', required: true,
      value: prefill.checkOut?.date || prefill.checkOutDate || ''
    });
    const { wrapper: wCheckOutTime, input: iCheckOutTime } = buildEditField({
      id: 'mbf-hotel-checkout-time', label: 'Check-out — Orario', type: 'time',
      value: prefill.checkOut?.time || ''
    });

    // Notti — campo read-only calcolato automaticamente
    const nightsWrapper = document.createElement('div');
    nightsWrapper.className = 'edit-booking-field';
    const nightsLbl = document.createElement('label');
    nightsLbl.textContent = 'Notti';
    nightsWrapper.appendChild(nightsLbl);
    const nightsInput = document.createElement('input');
    nightsInput.type = 'text';
    nightsInput.id = 'mbf-hotel-nights';
    nightsInput.readOnly = true;
    nightsInput.placeholder = '— calcolato —';
    nightsWrapper.appendChild(nightsInput);

    const updateNights = () => {
      const n = calcNights(iCheckIn.value, iCheckOut.value);
      nightsInput.value = n !== null ? `${n} nott${n === 1 ? 'e' : 'i'}` : '';
    };
    iCheckIn.addEventListener('change', updateNights);
    iCheckOut.addEventListener('change', updateNights);
    updateNights();

    gHotel.appendChild(wName);
    gHotel.appendChild(wCheckIn);
    gHotel.appendChild(wCheckInTime);
    gHotel.appendChild(wCheckOut);
    gHotel.appendChild(wCheckOutTime);
    gHotel.appendChild(nightsWrapper);
    scroll.appendChild(sHotel);

    // --- SEZIONE: Dettagli ---
    const { section: sDetail, grid: gDetail } = buildSection('Dettagli');

    const { wrapper: wRoomType, input: iRoomType } = buildEditField({
      id: 'mbf-hotel-room-type', label: 'Tipo camera',
      placeholder: 'es. Doppia, Suite', value: prefill.roomType || ''
    });
    const { wrapper: wGuest, input: iGuest } = buildEditField({
      id: 'mbf-hotel-guest', label: 'Nome ospite',
      placeholder: 'es. Mario Rossi', value: prefill.guestName || ''
    });
    const { wrapper: wConfirm, input: iConfirm } = buildEditField({
      id: 'mbf-hotel-confirmation', label: 'N. Conferma',
      placeholder: 'es. BK123456789', value: prefill.confirmationNumber || ''
    });

    // Colazione inclusa (CustomSelect — no <select> nativo)
    const wBreakfast = document.createElement('div');
    wBreakfast.className = 'edit-booking-field';
    const lblBreakfast = document.createElement('label');
    lblBreakfast.textContent = 'Colazione inclusa';
    wBreakfast.appendChild(lblBreakfast);
    let breakfastSelect = null;
    if (window.CustomSelect) {
      breakfastSelect = window.CustomSelect.create({
        options: [
          { value: '', label: '— Seleziona —' },
          { value: 'yes', label: 'Sì' },
          { value: 'no', label: 'No' },
        ],
        selected: prefill.breakfastIncluded ? 'yes' : (prefill.breakfastIncluded === false ? 'no' : ''),
      });
      wBreakfast.appendChild(breakfastSelect);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'mbf-hotel-breakfast';
      inp.placeholder = 'Sì / No';
      wBreakfast.appendChild(inp);
    }

    gDetail.appendChild(wRoomType);
    gDetail.appendChild(wGuest);
    gDetail.appendChild(wConfirm);
    gDetail.appendChild(wBreakfast);
    scroll.appendChild(sDetail);

    // --- SEZIONE: Indirizzo ---
    const { section: sAddr, grid: gAddr } = buildSection('Indirizzo');

    const { wrapper: wAddress, input: iAddress } = buildEditField({
      id: 'mbf-hotel-address', label: 'Indirizzo completo', fullWidth: true,
      placeholder: 'es. Via Roma 1, Roma', value: prefill.address?.fullAddress || (typeof prefill.address === 'string' ? prefill.address : '') || ''
    });
    gAddr.appendChild(wAddress);
    scroll.appendChild(sAddr);

    // --- SEZIONE: Note ---
    const { section: sNote, grid: gNote } = buildSection('Note');

    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-hotel-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    const { wrapper: wPolicy, input: iPolicy } = buildEditField({
      id: 'mbf-hotel-cancellation', label: 'Cancellation policy',
      placeholder: 'es. Gratuita fino a 24h prima', value: prefill.cancellationPolicy || ''
    });
    gNote.appendChild(wPrice);
    gNote.appendChild(wPolicy);
    scroll.appendChild(sNote);

    // Upload documento
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva hotel';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone
    const requiredInputs = [iName, iCheckIn, iCheckOut];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
      inp.addEventListener('change', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
    });

    const getValues = () => {
      const breakfastVal = breakfastSelect
        ? window.CustomSelect.getValue(breakfastSelect)
        : (form.querySelector('#mbf-hotel-breakfast')?.value || '');

      return {
        name: iName.value.trim(),
        checkIn: { date: iCheckIn.value, time: iCheckInTime.value || undefined },
        checkOut: { date: iCheckOut.value, time: iCheckOutTime.value || undefined },
        address: iAddress.value.trim() ? { fullAddress: iAddress.value.trim() } : undefined,
        roomType: iRoomType.value.trim() || undefined,
        guestName: iGuest.value.trim() || undefined,
        confirmationNumber: iConfirm.value.trim() || undefined,
        breakfastIncluded: breakfastVal === 'yes' ? true : (breakfastVal === 'no' ? false : undefined),
        price: iPrice.value ? parseFloat(iPrice.value) : undefined,
        cancellationPolicy: iPolicy.value.trim() || undefined,
      };
    };

    const validate = () => {
      let valid = true;

      if (iCheckIn.value && iCheckOut.value) {
        const nights = calcNights(iCheckIn.value, iCheckOut.value);
        if (nights === null || nights <= 0) {
          showFieldError(iCheckOut, 'La data di check-out deve essere successiva al check-in');
          valid = false;
        }
      }

      const checks = [
        { input: iName,     msg: 'Inserisci il nome dell\'hotel' },
        { input: iCheckIn,  msg: 'Inserisci la data di check-in' },
        { input: iCheckOut, msg: 'Inserisci la data di check-out' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else if (input !== iCheckOut) {
          clearFieldError(input);
        }
      });
      return valid;
    };

    return { form, getValues, validate, saveBtn, getFile };
  }

  /**
   * Costruisce il form treno.
   * @param {Object} prefill - dati da pre-popolare
   * @returns {{ form: HTMLElement, getValues: function, validate: function, saveBtn: HTMLButtonElement, getFile: function }}
   */
  function buildTrainForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--train edit-booking-form';
    form.dataset.bookingType = 'train';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Treno ---
    const { section: sTreno, grid: gTreno } = buildSection('Treno');

    const { wrapper: wDate, input: iDate } = buildEditField({
      id: 'mbf-train-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wTrainNum, input: iTrainNum } = buildEditField({
      id: 'mbf-train-number', label: 'Numero treno', required: true,
      placeholder: 'es. FR 9619', value: prefill.trainNumber || ''
    });
    const { wrapper: wOperator, input: iOperator } = buildEditField({
      id: 'mbf-train-operator', label: 'Operatore', required: true,
      placeholder: 'es. Trenitalia', value: prefill.operator || ''
    });
    gTreno.appendChild(wDate);
    gTreno.appendChild(wTrainNum);
    gTreno.appendChild(wOperator);
    scroll.appendChild(sTreno);

    // --- SEZIONE: Partenza ---
    const { section: sDep, grid: gDep } = buildSection('Partenza');

    const { wrapper: wDepStation, input: iDepStation } = buildEditField({
      id: 'mbf-train-departure-station', label: 'Stazione', required: true,
      placeholder: 'es. Roma Termini', value: prefill.departure?.station || prefill.departureStation || ''
    });
    const { wrapper: wDepCity, input: iDepCity } = buildEditField({
      id: 'mbf-train-departure-city', label: 'Città', required: true,
      placeholder: 'es. Roma', value: prefill.departure?.city || prefill.departureCity || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildEditField({
      id: 'mbf-train-departure-time', label: 'Orario', type: 'time', required: true,
      value: prefill.departureTime || (prefill.departure?.time || '')
    });
    gDep.appendChild(wDepStation);
    gDep.appendChild(wDepCity);
    gDep.appendChild(wDepTime);
    scroll.appendChild(sDep);

    // --- SEZIONE: Arrivo ---
    const { section: sArr, grid: gArr } = buildSection('Arrivo');

    const { wrapper: wArrStation, input: iArrStation } = buildEditField({
      id: 'mbf-train-arrival-station', label: 'Stazione', required: true,
      placeholder: 'es. Milano Centrale', value: prefill.arrival?.station || prefill.arrivalStation || ''
    });
    const { wrapper: wArrCity, input: iArrCity } = buildEditField({
      id: 'mbf-train-arrival-city', label: 'Città', required: true,
      placeholder: 'es. Milano', value: prefill.arrival?.city || prefill.arrivalCity || ''
    });
    const { wrapper: wArrTime, input: iArrTime } = buildEditField({
      id: 'mbf-train-arrival-time', label: 'Orario', type: 'time',
      value: prefill.arrivalTime || (prefill.arrival?.time || '')
    });
    gArr.appendChild(wArrStation);
    gArr.appendChild(wArrCity);
    gArr.appendChild(wArrTime);
    scroll.appendChild(sArr);

    // --- SEZIONE: Prenotazione ---
    const { section: sBook, grid: gBook } = buildSection('Prenotazione');

    const { wrapper: wPnr, input: iPnr } = buildEditField({
      id: 'mbf-train-pnr', label: 'Riferimento / PNR',
      placeholder: 'es. ABC123', value: prefill.bookingReference || prefill.pnr || ''
    });
    const { wrapper: wClass, input: iClass } = buildEditField({
      id: 'mbf-train-class', label: 'Classe',
      placeholder: 'es. 1ª, 2ª', value: prefill.class || ''
    });
    const { wrapper: wSeat, input: iSeat } = buildEditField({
      id: 'mbf-train-seat', label: 'Posto',
      placeholder: 'es. 45', value: prefill.seat || ''
    });
    const { wrapper: wCoach, input: iCoach } = buildEditField({
      id: 'mbf-train-coach', label: 'Carrozza',
      placeholder: 'es. 3', value: prefill.coach || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-train-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    gBook.appendChild(wPnr);
    gBook.appendChild(wClass);
    gBook.appendChild(wSeat);
    gBook.appendChild(wCoach);
    gBook.appendChild(wPrice);
    scroll.appendChild(sBook);

    // Upload documento
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva treno';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone
    const requiredInputs = [iDepStation, iDepCity, iArrStation, iArrCity, iDate, iDepTime, iTrainNum, iOperator];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
    });

    const getValues = () => ({
      departure: {
        station: iDepStation.value.trim(),
        city: iDepCity.value.trim(),
        time: iDepTime.value || undefined,
      },
      arrival: {
        station: iArrStation.value.trim(),
        city: iArrCity.value.trim(),
        time: iArrTime.value || undefined,
      },
      date: iDate.value,
      trainNumber: iTrainNum.value.trim(),
      operator: iOperator.value.trim(),
      class: iClass.value.trim() || undefined,
      seat: iSeat.value.trim() || undefined,
      coach: iCoach.value.trim() || undefined,
      bookingReference: iPnr.value.trim() || undefined,
      price: iPrice.value ? parseFloat(iPrice.value) : undefined,
    });

    const validate = () => {
      let valid = true;
      const checks = [
        { input: iDepStation, msg: 'Inserisci la stazione di partenza' },
        { input: iDepCity,    msg: 'Inserisci la città di partenza' },
        { input: iArrStation, msg: 'Inserisci la stazione di arrivo' },
        { input: iArrCity,    msg: 'Inserisci la città di arrivo' },
        { input: iDate,       msg: 'Inserisci la data del treno' },
        { input: iDepTime,    msg: 'Inserisci l\'orario di partenza' },
        { input: iTrainNum,   msg: 'Inserisci il numero del treno' },
        { input: iOperator,   msg: 'Inserisci l\'operatore' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else {
          clearFieldError(input);
        }
      });
      return valid;
    };

    return { form, getValues, validate, saveBtn, getFile };
  }

  /**
   * Costruisce il form bus.
   * @param {Object} prefill - dati da pre-popolare
   * @returns {{ form: HTMLElement, getValues: function, validate: function, saveBtn: HTMLButtonElement, getFile: function }}
   */
  function buildBusForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--bus edit-booking-form';
    form.dataset.bookingType = 'bus';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Bus ---
    const { section: sBus, grid: gBus } = buildSection('Bus');

    const { wrapper: wDate, input: iDate } = buildEditField({
      id: 'mbf-bus-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wOperator, input: iOperator } = buildEditField({
      id: 'mbf-bus-operator', label: 'Operatore', required: true,
      placeholder: 'es. FlixBus', value: prefill.operator || ''
    });
    const { wrapper: wRoute, input: iRoute } = buildEditField({
      id: 'mbf-bus-route', label: 'Linea / Rotta',
      placeholder: 'es. 001', value: prefill.routeNumber || ''
    });
    gBus.appendChild(wDate);
    gBus.appendChild(wOperator);
    gBus.appendChild(wRoute);
    scroll.appendChild(sBus);

    // --- SEZIONE: Partenza ---
    const { section: sDep, grid: gDep } = buildSection('Partenza');

    const { wrapper: wDepCity, input: iDepCity } = buildEditField({
      id: 'mbf-bus-departure-city', label: 'Città', required: true,
      placeholder: 'es. Roma', value: prefill.departureCity || (prefill.departure?.city || '')
    });
    const { wrapper: wDepStation, input: iDepStation } = buildEditField({
      id: 'mbf-bus-departure-station', label: 'Stazione / Terminal',
      placeholder: 'es. Tiburtina', value: prefill.departureStation || (prefill.departure?.station || '')
    });
    const { wrapper: wDepTime, input: iDepTime } = buildEditField({
      id: 'mbf-bus-departure-time', label: 'Orario', type: 'time', required: true,
      value: prefill.departureTime || (prefill.departure?.time || '')
    });
    gDep.appendChild(wDepCity);
    gDep.appendChild(wDepStation);
    gDep.appendChild(wDepTime);
    scroll.appendChild(sDep);

    // --- SEZIONE: Arrivo ---
    const { section: sArr, grid: gArr } = buildSection('Arrivo');

    const { wrapper: wArrCity, input: iArrCity } = buildEditField({
      id: 'mbf-bus-arrival-city', label: 'Città', required: true,
      placeholder: 'es. Napoli', value: prefill.arrivalCity || (prefill.arrival?.city || '')
    });
    const { wrapper: wArrStation, input: iArrStation } = buildEditField({
      id: 'mbf-bus-arrival-station', label: 'Stazione / Terminal',
      placeholder: 'es. Metropark', value: prefill.arrivalStation || (prefill.arrival?.station || '')
    });
    const { wrapper: wArrTime, input: iArrTime } = buildEditField({
      id: 'mbf-bus-arrival-time', label: 'Orario', type: 'time',
      value: prefill.arrival?.time || ''
    });
    gArr.appendChild(wArrCity);
    gArr.appendChild(wArrStation);
    gArr.appendChild(wArrTime);
    scroll.appendChild(sArr);

    // --- SEZIONE: Prenotazione ---
    const { section: sBook, grid: gBook } = buildSection('Prenotazione');

    const { wrapper: wSeat, input: iSeat } = buildEditField({
      id: 'mbf-bus-seat', label: 'Posto',
      placeholder: 'es. 12', value: prefill.seat || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-bus-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    gBook.appendChild(wSeat);
    gBook.appendChild(wPrice);
    scroll.appendChild(sBook);

    // Upload documento
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva bus';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone
    const requiredInputs = [iDepCity, iArrCity, iDate, iDepTime, iOperator];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
    });

    const getValues = () => ({
      departure: {
        city: iDepCity.value.trim(),
        station: iDepStation.value.trim() || undefined,
        time: iDepTime.value || undefined,
      },
      arrival: {
        city: iArrCity.value.trim(),
        station: iArrStation.value.trim() || undefined,
        time: iArrTime.value || undefined,
      },
      date: iDate.value,
      operator: iOperator.value.trim(),
      routeNumber: iRoute.value.trim() || undefined,
      seat: iSeat.value.trim() || undefined,
      price: iPrice.value ? parseFloat(iPrice.value) : undefined,
    });

    const validate = () => {
      let valid = true;
      const checks = [
        { input: iDepCity,  msg: 'Inserisci la città di partenza' },
        { input: iArrCity,  msg: 'Inserisci la città di arrivo' },
        { input: iDate,     msg: 'Inserisci la data del bus' },
        { input: iDepTime,  msg: 'Inserisci l\'orario di partenza' },
        { input: iOperator, msg: 'Inserisci l\'operatore' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else {
          clearFieldError(input);
        }
      });
      return valid;
    };

    return { form, getValues, validate, saveBtn, getFile };
  }

  /**
   * Calcola il numero di giorni tra due date in formato YYYY-MM-DD.
   * @param {string} dateStart
   * @param {string} dateEnd
   * @returns {number|null}
   */
  function calcDays(dateStart, dateEnd) {
    if (!dateStart || !dateEnd) return null;
    const d1 = new Date(dateStart);
    const d2 = new Date(dateEnd);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }

  /**
   * Costruisce il form noleggio auto.
   * @param {Object} prefill - dati da pre-popolare
   * @returns {{ form: HTMLElement, getValues: function, validate: function, saveBtn: HTMLButtonElement, getFile: function }}
   */
  function buildRentalForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--rental edit-booking-form';
    form.dataset.bookingType = 'rental';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Noleggio ---
    const { section: sNol, grid: gNol } = buildSection('Noleggio');

    const { wrapper: wProvider, input: iProvider } = buildEditField({
      id: 'mbf-rental-provider', label: 'Fornitore', required: true,
      placeholder: 'es. Hertz, Avis', value: prefill.provider || ''
    });
    const { wrapper: wPickupDate, input: iPickupDate } = buildEditField({
      id: 'mbf-rental-date', label: 'Data ritiro', type: 'date', required: true,
      value: prefill.date || prefill.pickupDate || ''
    });
    const { wrapper: wDropoffDate, input: iDropoffDate } = buildEditField({
      id: 'mbf-rental-end-date', label: 'Data riconsegna', type: 'date', required: true,
      value: prefill.endDate || prefill.dropoffDate || ''
    });

    // Giorni noleggio — campo read-only calcolato automaticamente
    const daysWrapper = document.createElement('div');
    daysWrapper.className = 'edit-booking-field';
    const daysLbl = document.createElement('label');
    daysLbl.textContent = 'Giorni noleggio';
    daysWrapper.appendChild(daysLbl);
    const daysInput = document.createElement('input');
    daysInput.type = 'text';
    daysInput.id = 'mbf-rental-days';
    daysInput.readOnly = true;
    daysInput.placeholder = '— calcolato —';
    daysWrapper.appendChild(daysInput);

    const updateDays = () => {
      const d = calcDays(iPickupDate.value, iDropoffDate.value);
      daysInput.value = d !== null ? `${d} giorn${d === 1 ? 'o' : 'i'}` : '';
    };
    iPickupDate.addEventListener('change', updateDays);
    iDropoffDate.addEventListener('change', updateDays);
    updateDays();

    gNol.appendChild(wProvider);
    gNol.appendChild(wPickupDate);
    gNol.appendChild(wDropoffDate);
    gNol.appendChild(daysWrapper);
    scroll.appendChild(sNol);

    // --- SEZIONE: Ritiro ---
    const { section: sPickup, grid: gPickup } = buildSection('Ritiro');

    const { wrapper: wPickupCity, input: iPickupCity } = buildEditField({
      id: 'mbf-rental-pickup-city', label: 'Città', required: true,
      placeholder: 'es. Roma', value: prefill.pickupLocation?.city || prefill.pickupCity || ''
    });
    const { wrapper: wPickupTime, input: iPickupTime } = buildEditField({
      id: 'mbf-rental-pickup-time', label: 'Orario', type: 'time', required: true,
      value: prefill.pickupLocation?.time || prefill.pickupTime || ''
    });
    const { wrapper: wPickupAddress, input: iPickupAddress } = buildEditField({
      id: 'mbf-rental-pickup-address', label: 'Indirizzo',
      placeholder: 'es. Via Roma 1', value: prefill.pickupLocation?.address || ''
    });
    gPickup.appendChild(wPickupCity);
    gPickup.appendChild(wPickupTime);
    gPickup.appendChild(wPickupAddress);
    scroll.appendChild(sPickup);

    // --- SEZIONE: Riconsegna ---
    const { section: sDropoff, grid: gDropoff } = buildSection('Riconsegna');

    const { wrapper: wDropoffCity, input: iDropoffCity } = buildEditField({
      id: 'mbf-rental-dropoff-city', label: 'Città',
      placeholder: 'es. Milano', value: prefill.dropoffLocation?.city || ''
    });
    const { wrapper: wDropoffTime, input: iDropoffTime } = buildEditField({
      id: 'mbf-rental-dropoff-time', label: 'Orario', type: 'time', required: true,
      value: prefill.dropoffLocation?.time || prefill.dropoffTime || ''
    });
    const { wrapper: wDropoffAddress, input: iDropoffAddress } = buildEditField({
      id: 'mbf-rental-dropoff-address', label: 'Indirizzo',
      placeholder: 'es. Via Milano 1', value: prefill.dropoffLocation?.address || ''
    });
    gDropoff.appendChild(wDropoffCity);
    gDropoff.appendChild(wDropoffTime);
    gDropoff.appendChild(wDropoffAddress);
    scroll.appendChild(sDropoff);

    // --- SEZIONE: Prenotazione / Veicolo ---
    const { section: sBook, grid: gBook } = buildSection('Prenotazione');

    const { wrapper: wConfirm, input: iConfirm } = buildEditField({
      id: 'mbf-rental-confirmation', label: 'Riferimento / N. Conferma',
      placeholder: 'es. HZ123456', value: prefill.confirmationNumber || ''
    });
    const { wrapper: wCategory, input: iCategory } = buildEditField({
      id: 'mbf-rental-category', label: 'Categoria veicolo',
      placeholder: 'es. Compatta, SUV', value: prefill.vehicleCategory || ''
    });
    const { wrapper: wMake, input: iMake } = buildEditField({
      id: 'mbf-rental-make', label: 'Marca',
      placeholder: 'es. Fiat', value: prefill.vehicleMake || ''
    });
    const { wrapper: wModel, input: iModel } = buildEditField({
      id: 'mbf-rental-model', label: 'Modello',
      placeholder: 'es. 500', value: prefill.vehicleModel || ''
    });
    const { wrapper: wInsurance, input: iInsurance } = buildEditField({
      id: 'mbf-rental-insurance', label: 'Assicurazione',
      placeholder: 'es. CDW, Full Coverage', value: prefill.insurance || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-rental-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    gBook.appendChild(wConfirm);
    gBook.appendChild(wCategory);
    gBook.appendChild(wMake);
    gBook.appendChild(wModel);
    gBook.appendChild(wInsurance);
    gBook.appendChild(wPrice);
    scroll.appendChild(sBook);

    // Upload documento
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva noleggio';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone
    const requiredInputs = [iProvider, iPickupCity, iPickupDate, iPickupTime, iDropoffDate, iDropoffTime];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
      inp.addEventListener('change', () => { clearFieldError(inp); updateSaveBtn(form, saveBtn); });
    });

    const getValues = () => ({
      provider: iProvider.value.trim(),
      pickupLocation: {
        city: iPickupCity.value.trim(),
        time: iPickupTime.value,
        address: iPickupAddress.value.trim() || undefined,
      },
      date: iPickupDate.value,
      endDate: iDropoffDate.value,
      dropoffLocation: {
        city: iDropoffCity.value.trim() || undefined,
        time: iDropoffTime.value,
        address: iDropoffAddress.value.trim() || undefined,
      },
      vehicleCategory: iCategory.value.trim() || undefined,
      vehicleMake: iMake.value.trim() || undefined,
      vehicleModel: iModel.value.trim() || undefined,
      confirmationNumber: iConfirm.value.trim() || undefined,
      insurance: iInsurance.value.trim() || undefined,
      price: iPrice.value ? parseFloat(iPrice.value) : undefined,
    });

    const validate = () => {
      let valid = true;

      if (iPickupDate.value && iDropoffDate.value) {
        const days = calcDays(iPickupDate.value, iDropoffDate.value);
        if (days === null || days <= 0) {
          showFieldError(iDropoffDate, 'La data di riconsegna deve essere successiva alla data di ritiro');
          valid = false;
        }
      }

      const checks = [
        { input: iProvider,    msg: 'Inserisci il fornitore' },
        { input: iPickupCity,  msg: 'Inserisci la città di ritiro' },
        { input: iPickupDate,  msg: 'Inserisci la data di ritiro' },
        { input: iPickupTime,  msg: 'Inserisci l\'ora di ritiro' },
        { input: iDropoffDate, msg: 'Inserisci la data di riconsegna' },
        { input: iDropoffTime, msg: 'Inserisci l\'ora di riconsegna' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else if (input !== iDropoffDate) {
          clearFieldError(input);
        }
      });
      return valid;
    };

    return { form, getValues, validate, saveBtn, getFile };
  }

  /**
   * Costruisce il form traghetto.
   * @param {Object} prefill - dati da pre-popolare
   * @returns {{ form: HTMLElement, getValues: function, validate: function, saveBtn: HTMLButtonElement, getFile: function }}
   */
  function buildFerryForm(prefill = {}) {
    const form = document.createElement('div');
    form.className = 'manual-booking-form manual-booking-form--ferry edit-booking-form';
    form.dataset.bookingType = 'ferry';

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- SEZIONE: Traghetto ---
    const { section: sTratta, grid: gTratta } = buildSection('Traghetto');

    const { wrapper: wOperator, input: iOperator } = buildEditField({
      id: 'mbf-ferry-operator', label: 'Operatore', required: true,
      placeholder: 'es. Grimaldi, Tirrenia', value: prefill.operator || ''
    });
    const { wrapper: wDate, input: iDate } = buildEditField({
      id: 'mbf-ferry-date', label: 'Data andata', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wShipName, input: iShipName } = buildEditField({
      id: 'mbf-ferry-ship-name', label: 'Nome nave',
      placeholder: 'es. Moby Wonder', value: prefill.shipName || prefill.ferryName || ''
    });
    const { wrapper: wRoute, input: iRoute } = buildEditField({
      id: 'mbf-ferry-route', label: 'Numero rotta',
      placeholder: 'es. GR201', value: prefill.routeNumber || ''
    });
    gTratta.appendChild(wOperator);
    gTratta.appendChild(wDate);
    gTratta.appendChild(wShipName);
    gTratta.appendChild(wRoute);
    scroll.appendChild(sTratta);

    // --- SEZIONE: Partenza ---
    const { section: sDep, grid: gDep } = buildSection('Partenza');

    const { wrapper: wDepPort, input: iDepPort } = buildEditField({
      id: 'mbf-ferry-dep-port', label: 'Porto', required: true,
      placeholder: 'es. Porto di Civitavecchia', value: prefill.departure?.port || prefill.departurePort || ''
    });
    const { wrapper: wDepCity, input: iDepCity } = buildEditField({
      id: 'mbf-ferry-dep-city', label: 'Città', required: true,
      placeholder: 'es. Civitavecchia', value: prefill.departure?.city || prefill.departureCity || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildEditField({
      id: 'mbf-ferry-dep-time', label: 'Orario', type: 'time', required: true,
      value: prefill.departure?.time || prefill.departureTime || ''
    });
    gDep.appendChild(wDepPort);
    gDep.appendChild(wDepCity);
    gDep.appendChild(wDepTime);
    scroll.appendChild(sDep);

    // --- SEZIONE: Arrivo ---
    const { section: sArr, grid: gArr } = buildSection('Arrivo');

    const { wrapper: wArrPort, input: iArrPort } = buildEditField({
      id: 'mbf-ferry-arr-port', label: 'Porto', required: true,
      placeholder: 'es. Porto di Palermo', value: prefill.arrival?.port || prefill.arrivalPort || ''
    });
    const { wrapper: wArrCity, input: iArrCity } = buildEditField({
      id: 'mbf-ferry-arr-city', label: 'Città', required: true,
      placeholder: 'es. Palermo', value: prefill.arrival?.city || prefill.arrivalCity || ''
    });
    const { wrapper: wArrTime, input: iArrTime } = buildEditField({
      id: 'mbf-ferry-arr-time', label: 'Orario (opzionale)', type: 'time',
      value: prefill.arrival?.time || prefill.arrivalTime || ''
    });
    gArr.appendChild(wArrPort);
    gArr.appendChild(wArrCity);
    gArr.appendChild(wArrTime);
    scroll.appendChild(sArr);

    // --- SEZIONE RITORNO: bottone + sezione espandibile ---
    // Pulsante "Aggiungi ritorno"
    const addReturnWrapper = document.createElement('div');
    addReturnWrapper.className = 'edit-booking-section';
    addReturnWrapper.style.marginTop = '16px';

    const addReturnBtn = document.createElement('button');
    addReturnBtn.type = 'button';
    addReturnBtn.className = 'btn btn-outline ferry-add-return-btn';
    addReturnBtn.style.cssText = 'display:flex;align-items:center;gap:6px;width:100%;justify-content:center;';
    addReturnBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 96 960 960" fill="currentColor" style="flex-shrink:0">
        <path d="M280 896 80 696l200-200 57 57-103 103h526v80H234l103 103-57 57Zm400-344-57-57 103-103H200v-80h526L623 209l57-57 200 200-200 200Z"/>
      </svg>
      <span data-i18n="ferry.add_return">Aggiungi ritorno</span>
    `;
    addReturnWrapper.appendChild(addReturnBtn);
    scroll.appendChild(addReturnWrapper);

    // Sezione ritorno (nascosta, stile identico al form di edit)
    const returnSection = document.createElement('div');
    returnSection.className = 'edit-booking-section';
    returnSection.style.cssText = 'display:none;margin-top:16px;background:var(--color-blue-50,#eff6ff);border:1px solid var(--color-blue-200,#bfdbfe);border-radius:10px;padding:16px;';

    const returnSectionHeader = document.createElement('div');
    returnSectionHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--color-blue-200,#bfdbfe);';
    const returnSectionTitle = document.createElement('span');
    returnSectionTitle.className = 'edit-booking-section-title';
    returnSectionTitle.style.margin = '0';
    returnSectionTitle.setAttribute('data-i18n', 'ferry.return_trip');
    returnSectionTitle.textContent = 'Viaggio di ritorno';
    const removeReturnBtn = document.createElement('button');
    removeReturnBtn.type = 'button';
    removeReturnBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--color-gray-500);padding:2px;display:flex;align-items:center;';
    removeReturnBtn.setAttribute('aria-label', 'Rimuovi ritorno');
    removeReturnBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    returnSectionHeader.appendChild(returnSectionTitle);
    returnSectionHeader.appendChild(removeReturnBtn);
    returnSection.appendChild(returnSectionHeader);

    const returnGrid = document.createElement('div');
    returnGrid.className = 'edit-booking-grid';
    const { wrapper: wReturnDate, input: iReturnDate } = buildEditField({
      id: 'mbf-ferry-return-date', label: 'Data', type: 'date',
      placeholder: '', value: ''
    });
    iReturnDate.dataset.returnRequired = '1';
    returnGrid.appendChild(wReturnDate);
    returnSection.appendChild(returnGrid);

    const returnDepTitle = document.createElement('div');
    returnDepTitle.className = 'edit-booking-section-title';
    returnDepTitle.style.cssText = 'font-size:var(--font-size-xs);margin-top:12px;';
    returnDepTitle.textContent = 'Partenza';
    returnSection.appendChild(returnDepTitle);

    const returnDepGrid = document.createElement('div');
    returnDepGrid.className = 'edit-booking-grid';
    const { wrapper: wReturnDepPort, input: iReturnDepPort } = buildEditField({
      id: 'mbf-ferry-return-dep-port', label: 'Porto', placeholder: 'es. Porto di Palermo', value: ''
    });
    const { wrapper: wReturnDepCity, input: iReturnDepCity } = buildEditField({
      id: 'mbf-ferry-return-dep-city', label: 'Città', placeholder: 'es. Palermo', value: ''
    });
    const { wrapper: wReturnDepTime, input: iReturnDepTime } = buildEditField({
      id: 'mbf-ferry-return-dep-time', label: 'Orario (opzionale)', type: 'time', value: ''
    });
    returnDepGrid.appendChild(wReturnDepPort);
    returnDepGrid.appendChild(wReturnDepCity);
    returnDepGrid.appendChild(wReturnDepTime);
    returnSection.appendChild(returnDepGrid);

    const returnArrTitle = document.createElement('div');
    returnArrTitle.className = 'edit-booking-section-title';
    returnArrTitle.style.cssText = 'font-size:var(--font-size-xs);margin-top:12px;';
    returnArrTitle.textContent = 'Arrivo';
    returnSection.appendChild(returnArrTitle);

    const returnArrGrid = document.createElement('div');
    returnArrGrid.className = 'edit-booking-grid';
    const { wrapper: wReturnArrPort, input: iReturnArrPort } = buildEditField({
      id: 'mbf-ferry-return-arr-port', label: 'Porto', placeholder: 'es. Porto di Civitavecchia', value: ''
    });
    const { wrapper: wReturnArrCity, input: iReturnArrCity } = buildEditField({
      id: 'mbf-ferry-return-arr-city', label: 'Città', placeholder: 'es. Civitavecchia', value: ''
    });
    const { wrapper: wReturnArrTime, input: iReturnArrTime } = buildEditField({
      id: 'mbf-ferry-return-arr-time', label: 'Orario (opzionale)', type: 'time', value: ''
    });
    returnArrGrid.appendChild(wReturnArrPort);
    returnArrGrid.appendChild(wReturnArrCity);
    returnArrGrid.appendChild(wReturnArrTime);
    returnSection.appendChild(returnArrGrid);
    scroll.appendChild(returnSection);

    // --- SEZIONE: Prenotazione ---
    const { section: sBook, grid: gBook } = buildSection('Prenotazione');

    const { wrapper: wPnr, input: iPnr } = buildEditField({
      id: 'mbf-ferry-pnr', label: 'Riferimento / PNR',
      placeholder: 'es. GR12345', value: prefill.bookingReference || prefill.pnr || ''
    });
    const { wrapper: wCabin, input: iCabin } = buildEditField({
      id: 'mbf-ferry-cabin', label: 'Cabina',
      placeholder: 'es. C12', value: prefill.cabin || ''
    });
    const { wrapper: wDeck, input: iDeck } = buildEditField({
      id: 'mbf-ferry-deck', label: 'Ponte',
      placeholder: 'es. Ponte 5', value: prefill.deck || ''
    });
    gBook.appendChild(wPnr);
    gBook.appendChild(wCabin);
    gBook.appendChild(wDeck);
    scroll.appendChild(sBook);

    // --- SEZIONE: Passeggeri (lista dinamica) ---
    // Pre-popola: se arriva prefill.passengers come array usalo; se è testo libero, converti
    const initialPassengers = Array.isArray(prefill.passengers)
      ? prefill.passengers.map(p => typeof p === 'string' ? { name: p, type: '' } : { name: p.name || '', type: p.type || '' })
      : [];

    const FERRY_PAX_OPTIONS_FOR_FORM = [
      { value: 'ADT', label: 'Adulto' },
      { value: 'CHD', label: 'Bambino' },
      { value: 'INF', label: 'Infante' },
    ];
    const { section: sPax, getPassengers } = buildPassengersSection(initialPassengers, FERRY_PAX_OPTIONS_FOR_FORM);
    scroll.appendChild(sPax);

    // --- SEZIONE: Veicoli (lista dinamica) ---
    const initialVehicles = Array.isArray(prefill.vehicles)
      ? prefill.vehicles.map(v => ({ type: v.type || '', plate: v.plate || '' }))
      : [];

    const FERRY_VEH_OPTIONS_FOR_FORM = [
      { value: 'auto',    label: 'Auto' },
      { value: 'moto',    label: 'Moto' },
      { value: 'camper',  label: 'Camper' },
      { value: 'furgone', label: 'Furgone' },
    ];
    const { section: sVeh, getVehicles } = buildVehiclesSection(initialVehicles, FERRY_VEH_OPTIONS_FOR_FORM);
    scroll.appendChild(sVeh);

    // --- SEZIONE: Note ---
    const { section: sNote, grid: gNote } = buildSection('Note');

    const { wrapper: wPrice, input: iPrice } = buildEditField({
      id: 'mbf-ferry-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    gNote.appendChild(wPrice);
    scroll.appendChild(sNote);

    // Upload documento
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    const docSection = document.createElement('div');
    docSection.className = 'edit-booking-section';
    docSection.style.marginTop = '16px';
    docSection.appendChild(wDoc);
    scroll.appendChild(docSection);

    form.appendChild(scroll);

    // Logica toggle sezione ritorno
    addReturnBtn.addEventListener('click', () => {
      iReturnDepPort.value = iArrPort.value || '';
      iReturnDepCity.value = iArrCity.value || '';
      iReturnArrPort.value = iDepPort.value || '';
      iReturnArrCity.value = iDepCity.value || '';

      addReturnWrapper.style.display = 'none';
      returnSection.style.display = '';
    });

    removeReturnBtn.addEventListener('click', () => {
      returnSection.style.display = 'none';
      addReturnWrapper.style.display = '';
      // Reset campi ritorno
      iReturnDate.value = '';
      iReturnDepTime.value = '';
      iReturnArrTime.value = '';
    });

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva prenotazione';
    saveBtn.disabled = true;

    // Collega aggiornamento stato save btn a ogni required input
    [iOperator, iDate, iDepPort, iDepCity, iDepTime, iArrPort, iArrCity].forEach(inp => {
      inp.addEventListener('input', () => updateSaveBtn(form, saveBtn));
      inp.addEventListener('change', () => updateSaveBtn(form, saveBtn));
    });

    const getValues = () => {
      const passengers = getPassengers();
      const vehicles = getVehicles();
      return {
        operator: iOperator.value.trim(),
        date: iDate.value,
        departure: {
          port: iDepPort.value.trim(),
          city: iDepCity.value.trim(),
          time: iDepTime.value,
        },
        arrival: {
          port: iArrPort.value.trim(),
          city: iArrCity.value.trim(),
          time: iArrTime.value || undefined,
        },
        ferryName: iShipName.value.trim() || undefined,
        routeNumber: iRoute.value.trim() || undefined,
        cabin: iCabin.value.trim() || undefined,
        deck: iDeck.value.trim() || undefined,
        bookingReference: iPnr.value.trim() || undefined,
        passengers: passengers.length > 0 ? passengers : undefined,
        vehicles: vehicles.length > 0 ? vehicles : undefined,
        price: iPrice.value ? parseFloat(iPrice.value) : undefined,
      };
    };

    /**
     * Restituisce i valori del viaggio di ritorno se la sezione è visibile e la data è compilata.
     * @returns {Object|null}
     */
    const getReturnValues = () => {
      if (returnSection.style.display === 'none') return null;
      if (!iReturnDate.value) return null;
      return {
        operator: iOperator.value.trim(),
        date: iReturnDate.value,
        departure: {
          port: iReturnDepPort.value.trim(),
          city: iReturnDepCity.value.trim(),
          time: iReturnDepTime.value || undefined,
        },
        arrival: {
          port: iReturnArrPort.value.trim(),
          city: iReturnArrCity.value.trim(),
          time: iReturnArrTime.value || undefined,
        },
        ferryName: iShipName.value.trim() || undefined,
        _isReturn: true,
      };
    };

    const validate = () => {
      let valid = true;
      const checks = [
        { input: iOperator, msg: 'Inserisci l\'operatore' },
        { input: iDepPort,  msg: 'Inserisci il porto di partenza' },
        { input: iDepCity,  msg: 'Inserisci la città di partenza' },
        { input: iArrPort,  msg: 'Inserisci il porto di arrivo' },
        { input: iArrCity,  msg: 'Inserisci la città di arrivo' },
        { input: iDate,     msg: 'Inserisci la data' },
        { input: iDepTime,  msg: 'Inserisci l\'orario di partenza' },
      ];
      checks.forEach(({ input, msg }) => {
        if (!input.value || input.value.trim() === '') {
          showFieldError(input, msg);
          valid = false;
        } else {
          clearFieldError(input);
        }
      });

      // Valida data ritorno se la sezione è aperta
      if (returnSection.style.display !== 'none' && !iReturnDate.value) {
        showFieldError(iReturnDate, 'Inserisci la data del viaggio di ritorno');
        valid = false;
      } else if (returnSection.style.display !== 'none') {
        clearFieldError(iReturnDate);
      }

      return valid;
    };

    return { form, getValues, getReturnValues, validate, saveBtn, getFile };
  }

  /**
   * Ripristina il contenuto originale della modale.
   * @param {HTMLElement} modal
   * @param {string} origBody
   * @param {string} origFooter
   */
  function restoreModal(modal, origBody, origFooter) {
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalBody) modalBody.innerHTML = origBody;
    if (modalFooter) modalFooter.innerHTML = origFooter;
    // Ri-applica i18n
    if (window.i18n) i18n.apply(modal);
    // Ri-collega gli eventi della modale originale
    if (window.tripPage && typeof window.tripPage._rebindAddBookingModal === 'function') {
      window.tripPage._rebindAddBookingModal(modal);
    }
  }

  /**
   * Salva una prenotazione manuale via API.
   * @param {string} tripId
   * @param {string} type
   * @param {Object} manualData
   * @param {File|null} docFile
   * @returns {Promise<Object>}
   */
  async function saveManualBooking(tripId, type, manualData, docFile, fallbackDocStoragePath = null) {
    let documentUrl = undefined;

    // Upload opzionale del documento
    if (docFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(docFile);
        });
        documentUrl = base64;
      } catch {
        // Upload documento non critico — continua senza
      }
    } else if (fallbackDocStoragePath) {
      // US-009: PDF già in storage (da SmartParse fallback) — usa il percorso direttamente
      documentUrl = fallbackDocStoragePath;
    }

    const payload = { action: 'manual-booking', tripId, type, manualData };
    if (documentUrl) payload.documentUrl = documentUrl;

    const response = await utils.authFetch('/.netlify/functions/add-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Errore durante il salvataggio');
    }
    return result;
  }

  /**
   * Apre il form manuale per il tipo specificato nella modale.
   * @param {string} type - 'flight'|'hotel'|'train'|'bus'|'rental'|'ferry'
   * @param {HTMLElement} modal - l'elemento modale (#add-booking-modal)
   * @param {string} tripId
   * @param {{ onSaved?: function, prefill?: Object }} opts
   */
  function open(type, modal, tripId, opts = {}) {
    const { onSaved, prefill = {}, prefillDocStoragePath = null } = opts;
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    if (!modalBody || !modalFooter) return;

    // Salva contenuto originale per il tasto "Indietro"
    const origBody = modalBody.innerHTML;
    const origFooter = modalFooter.innerHTML;

    let formModule;
    if (type === 'flight') {
      formModule = buildFlightForm(prefill);
    } else if (type === 'hotel') {
      formModule = buildHotelForm(prefill);
    } else if (type === 'train') {
      formModule = buildTrainForm(prefill);
    } else if (type === 'bus') {
      formModule = buildBusForm(prefill);
    } else if (type === 'rental') {
      formModule = buildRentalForm(prefill);
    } else if (type === 'ferry') {
      formModule = buildFerryForm(prefill);
    } else {
      // Tipi non ancora implementati: placeholder
      modalBody.innerHTML = `
        <div style="padding:var(--spacing-8);text-align:center;color:var(--color-gray-500);">
          <p>Form per <strong>${type}</strong> in arrivo.</p>
        </div>`;
      modalFooter.innerHTML = '';
      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-secondary';
      backBtn.textContent = 'Indietro';
      backBtn.addEventListener('click', () => restoreModal(modal, origBody, origFooter));
      modalFooter.appendChild(backBtn);
      return;
    }

    const { form, getValues, getReturnValues, validate, saveBtn, getFile } = formModule;

    // Aggiorna lo stato del Save btn con la funzione pubblica
    updateSaveBtn(form, saveBtn);

    // Sostituisce contenuto modale
    modalBody.innerHTML = '';
    modalBody.appendChild(form);

    // Footer: Indietro + Salva
    modalFooter.innerHTML = '';
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.id = 'manual-booking-back';
    backBtn.textContent = 'Indietro';
    backBtn.addEventListener('click', () => restoreModal(modal, origBody, origFooter));
    modalFooter.appendChild(backBtn);
    modalFooter.appendChild(saveBtn);

    // Gestione submit
    const saveBtnOriginalText = saveBtn.textContent;
    saveBtn.addEventListener('click', async () => {
      if (!validate()) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvataggio…';

      try {
        const manualData = getValues();
        const docFile = getFile ? getFile() : null;
        await saveManualBooking(tripId, type, manualData, docFile, prefillDocStoragePath);

        // Se è un ferry con viaggio di ritorno compilato, salva anche il secondo booking
        if (typeof getReturnValues === 'function') {
          const returnData = getReturnValues();
          if (returnData) {
            await saveManualBooking(tripId, type, returnData, null, null);
          }
        }

        utils.showToast('Prenotazione aggiunta', 'success');
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        utils.showToast(err.message || 'Errore durante il salvataggio', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtnOriginalText;
      }
    });
  }

  return { open };
})();
