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
    form.className = 'manual-booking-form manual-booking-form--flight';
    form.dataset.bookingType = 'flight';

    // Intestazione
    const heading = document.createElement('p');
    heading.className = 'manual-form-heading';
    heading.style.cssText = 'font-weight:var(--font-weight-semibold);margin-bottom:var(--spacing-4);color:var(--color-gray-700);';
    heading.textContent = 'Inserisci i dettagli del volo';
    form.appendChild(heading);

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- Campi obbligatori ---
    const { wrapper: wFlightNum, input: iFlightNum } = buildField({
      id: 'mbf-flight-number', label: 'Codice volo', required: true,
      placeholder: 'es. AZ0610', value: prefill.flightNumber || ''
    });
    const { wrapper: wAirline, input: iAirline } = buildField({
      id: 'mbf-airline', label: 'Compagnia aerea', required: true,
      placeholder: 'es. ITA Airways', value: prefill.airline || ''
    });
    scroll.appendChild(buildRow(wFlightNum, wAirline));

    const { wrapper: wDate, input: iDate } = buildField({
      id: 'mbf-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildField({
      id: 'mbf-departure-time', label: 'Orario partenza', type: 'time', required: true,
      value: prefill.departureTime || ''
    });
    scroll.appendChild(buildRow(wDate, wDepTime));

    const { wrapper: wDepCity, input: iDepCity } = buildField({
      id: 'mbf-departure-city', label: 'Città/aeroporto partenza', required: true,
      placeholder: 'es. Roma Fiumicino (FCO)', value: prefill.departureCity || (prefill.departure?.city || '')
    });
    const { wrapper: wArrCity, input: iArrCity } = buildField({
      id: 'mbf-arrival-city', label: 'Città/aeroporto arrivo', required: true,
      placeholder: 'es. New York (JFK)', value: prefill.arrivalCity || (prefill.arrival?.city || '')
    });
    scroll.appendChild(buildRow(wDepCity, wArrCity));

    // --- Campi opzionali ---
    const { wrapper: wArrTime, input: iArrTime } = buildField({
      id: 'mbf-arrival-time', label: 'Orario arrivo', type: 'time',
      value: prefill.arrivalTime || ''
    });

    // Classe volo (CustomSelect, nessun <select> nativo)
    const wClass = document.createElement('div');
    wClass.className = 'form-group';
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
      // Fallback solo per ambienti test senza CustomSelect
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'form-input';
      inp.id = 'mbf-class';
      inp.placeholder = 'economy, business…';
      inp.value = prefill.class || '';
      wClass.appendChild(inp);
    }

    scroll.appendChild(buildRow(wArrTime, wClass));

    const { wrapper: wSeat, input: iSeat } = buildField({
      id: 'mbf-seat', label: 'Posto', placeholder: 'es. 12A', value: prefill.seat || ''
    });
    const { wrapper: wBaggage, input: iBaggage } = buildField({
      id: 'mbf-baggage', label: 'Bagaglio', placeholder: 'es. 23kg', value: prefill.baggage || ''
    });
    scroll.appendChild(buildRow(wSeat, wBaggage));

    const { wrapper: wPnr, input: iPnr } = buildField({
      id: 'mbf-pnr', label: 'PNR / Codice prenotazione', placeholder: 'es. ABC123',
      value: prefill.bookingReference || prefill.pnr || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildField({
      id: 'mbf-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    scroll.appendChild(buildRow(wPnr, wPrice));

    // Passeggeri (testo libero)
    const { wrapper: wPax, input: iPax } = buildField({
      id: 'mbf-passengers', label: 'Passeggeri (nomi separati da virgola)',
      placeholder: 'es. Mario Rossi, Anna Bianchi',
      value: Array.isArray(prefill.passengers) ? prefill.passengers.map(p => p.name || p).join(', ') : (prefill.passengers || '')
    });
    scroll.appendChild(wPax);

    // Upload documento
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    scroll.appendChild(wDoc);

    form.appendChild(scroll);

    // Pulsante Salva (gestito dal chiamante, qui solo creato)
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

    // Restituisce valori del form
    const getValues = () => {
      const flightClass = classSelect ? window.CustomSelect.getValue(classSelect) : (form.querySelector('#mbf-class')?.value || '');
      const paxRaw = iPax.value.trim();
      const passengers = paxRaw
        ? paxRaw.split(',').map(n => n.trim()).filter(Boolean).map(name => ({ name }))
        : [];

      return {
        flightNumber: iFlightNum.value.trim(),
        airline: iAirline.value.trim(),
        date: iDate.value,
        departureTime: iDepTime.value,
        departureCity: iDepCity.value.trim(),
        arrivalCity: iArrCity.value.trim(),
        arrivalTime: iArrTime.value || undefined,
        class: flightClass || undefined,
        seat: iSeat.value.trim() || undefined,
        baggage: iBaggage.value.trim() || undefined,
        bookingReference: iPnr.value.trim() || undefined,
        price: iPrice.value ? parseFloat(iPrice.value) : undefined,
        passengers: passengers.length > 0 ? passengers : undefined,
      };
    };

    /**
     * Valida i campi obbligatori e mostra gli errori.
     * @returns {boolean} true se tutto valido
     */
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
    form.className = 'manual-booking-form manual-booking-form--hotel';
    form.dataset.bookingType = 'hotel';

    // Intestazione
    const heading = document.createElement('p');
    heading.className = 'manual-form-heading';
    heading.style.cssText = 'font-weight:var(--font-weight-semibold);margin-bottom:var(--spacing-4);color:var(--color-gray-700);';
    heading.textContent = 'Inserisci i dettagli dell\'hotel';
    form.appendChild(heading);

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- Campi obbligatori ---
    const { wrapper: wName, input: iName } = buildField({
      id: 'mbf-hotel-name', label: 'Nome hotel', required: true,
      placeholder: 'es. Hotel Excelsior', value: prefill.name || ''
    });
    const { wrapper: wCity, input: iCity } = buildField({
      id: 'mbf-hotel-city', label: 'Città', required: true,
      placeholder: 'es. Roma', value: prefill.city || (prefill.address?.city || '')
    });
    scroll.appendChild(buildRow(wName, wCity));

    const { wrapper: wCheckIn, input: iCheckIn } = buildField({
      id: 'mbf-hotel-checkin', label: 'Data check-in', type: 'date', required: true,
      value: prefill.checkIn?.date || prefill.checkInDate || ''
    });
    const { wrapper: wCheckOut, input: iCheckOut } = buildField({
      id: 'mbf-hotel-checkout', label: 'Data check-out', type: 'date', required: true,
      value: prefill.checkOut?.date || prefill.checkOutDate || ''
    });
    scroll.appendChild(buildRow(wCheckIn, wCheckOut));

    // Notti — campo read-only calcolato automaticamente
    const nightsWrapper = document.createElement('div');
    nightsWrapper.className = 'form-group';
    const nightsLbl = document.createElement('label');
    nightsLbl.textContent = 'Notti';
    nightsWrapper.appendChild(nightsLbl);
    const nightsInput = document.createElement('input');
    nightsInput.type = 'text';
    nightsInput.id = 'mbf-hotel-nights';
    nightsInput.className = 'form-input';
    nightsInput.readOnly = true;
    nightsInput.placeholder = '— calcolato automaticamente —';
    nightsWrapper.appendChild(nightsInput);

    const updateNights = () => {
      const n = calcNights(iCheckIn.value, iCheckOut.value);
      nightsInput.value = n !== null ? `${n} nott${n === 1 ? 'e' : 'i'}` : '';
    };

    iCheckIn.addEventListener('change', updateNights);
    iCheckOut.addEventListener('change', updateNights);
    updateNights();

    // --- Campi opzionali ---
    const { wrapper: wAddress, input: iAddress } = buildField({
      id: 'mbf-hotel-address', label: 'Indirizzo',
      placeholder: 'es. Via Roma 1', value: prefill.address?.fullAddress || prefill.address || ''
    });
    scroll.appendChild(buildRow(nightsWrapper, wAddress));

    const { wrapper: wRooms, input: iRooms } = buildField({
      id: 'mbf-hotel-rooms', label: 'Numero camere', type: 'number',
      placeholder: '1', value: prefill.rooms || ''
    });
    const { wrapper: wRoomType, input: iRoomType } = buildField({
      id: 'mbf-hotel-room-type', label: 'Tipo camera',
      placeholder: 'es. Doppia, Suite', value: prefill.roomType || ''
    });
    scroll.appendChild(buildRow(wRooms, wRoomType));

    const { wrapper: wGuest, input: iGuest } = buildField({
      id: 'mbf-hotel-guest', label: 'Nome ospite',
      placeholder: 'es. Mario Rossi', value: prefill.guestName || ''
    });
    const { wrapper: wConfirm, input: iConfirm } = buildField({
      id: 'mbf-hotel-confirmation', label: 'Numero conferma',
      placeholder: 'es. BK123456789', value: prefill.confirmationNumber || ''
    });
    scroll.appendChild(buildRow(wGuest, wConfirm));

    // Colazione inclusa (CustomSelect — no <select> nativo)
    const wBreakfast = document.createElement('div');
    wBreakfast.className = 'form-group';
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
      inp.className = 'form-input';
      inp.id = 'mbf-hotel-breakfast';
      inp.placeholder = 'Sì / No';
      wBreakfast.appendChild(inp);
    }

    const { wrapper: wPrice, input: iPrice } = buildField({
      id: 'mbf-hotel-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    scroll.appendChild(buildRow(wBreakfast, wPrice));

    const { wrapper: wPolicy, input: iPolicy } = buildField({
      id: 'mbf-hotel-cancellation', label: 'Cancellation policy',
      placeholder: 'es. Gratuita fino a 24h prima', value: prefill.cancellationPolicy || ''
    });
    scroll.appendChild(wPolicy);

    // Upload documento
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    scroll.appendChild(wDoc);

    form.appendChild(scroll);

    // Pulsante Salva
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'manual-booking-save';
    saveBtn.textContent = 'Salva hotel';
    saveBtn.disabled = true;

    // Aggiornamento stato bottone
    const requiredInputs = [iName, iCity, iCheckIn, iCheckOut];
    requiredInputs.forEach(inp => {
      inp.addEventListener('input', () => {
        clearFieldError(inp);
        updateSaveBtn(form, saveBtn);
      });
      inp.addEventListener('change', () => {
        clearFieldError(inp);
        updateSaveBtn(form, saveBtn);
      });
    });

    const getValues = () => {
      const breakfastVal = breakfastSelect
        ? window.CustomSelect.getValue(breakfastSelect)
        : (form.querySelector('#mbf-hotel-breakfast')?.value || '');

      return {
        name: iName.value.trim(),
        city: iCity.value.trim(),
        checkIn: { date: iCheckIn.value },
        checkOut: { date: iCheckOut.value },
        address: iAddress.value.trim() ? { fullAddress: iAddress.value.trim(), city: iCity.value.trim() } : undefined,
        rooms: iRooms.value ? parseInt(iRooms.value, 10) : undefined,
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

      // Validazione check-out non antecedente check-in
      if (iCheckIn.value && iCheckOut.value) {
        const nights = calcNights(iCheckIn.value, iCheckOut.value);
        if (nights === null || nights <= 0) {
          showFieldError(iCheckOut, 'La data di check-out deve essere successiva al check-in');
          valid = false;
        }
      }

      const checks = [
        { input: iName,     msg: 'Inserisci il nome dell\'hotel' },
        { input: iCity,     msg: 'Inserisci la città' },
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
    form.className = 'manual-booking-form manual-booking-form--train';
    form.dataset.bookingType = 'train';

    // Intestazione
    const heading = document.createElement('p');
    heading.className = 'manual-form-heading';
    heading.style.cssText = 'font-weight:var(--font-weight-semibold);margin-bottom:var(--spacing-4);color:var(--color-gray-700);';
    heading.textContent = 'Inserisci i dettagli del treno';
    form.appendChild(heading);

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- Campi obbligatori ---
    const { wrapper: wDepStation, input: iDepStation } = buildField({
      id: 'mbf-train-departure-station', label: 'Stazione partenza', required: true,
      placeholder: 'es. Roma Termini', value: prefill.departure?.station || prefill.departureStation || ''
    });
    const { wrapper: wDepCity, input: iDepCity } = buildField({
      id: 'mbf-train-departure-city', label: 'Città partenza', required: true,
      placeholder: 'es. Roma', value: prefill.departure?.city || prefill.departureCity || ''
    });
    scroll.appendChild(buildRow(wDepStation, wDepCity));

    const { wrapper: wArrStation, input: iArrStation } = buildField({
      id: 'mbf-train-arrival-station', label: 'Stazione arrivo', required: true,
      placeholder: 'es. Milano Centrale', value: prefill.arrival?.station || prefill.arrivalStation || ''
    });
    const { wrapper: wArrCity, input: iArrCity } = buildField({
      id: 'mbf-train-arrival-city', label: 'Città arrivo', required: true,
      placeholder: 'es. Milano', value: prefill.arrival?.city || prefill.arrivalCity || ''
    });
    scroll.appendChild(buildRow(wArrStation, wArrCity));

    const { wrapper: wDate, input: iDate } = buildField({
      id: 'mbf-train-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildField({
      id: 'mbf-train-departure-time', label: 'Orario partenza', type: 'time', required: true,
      value: prefill.departureTime || (prefill.departure?.time || '')
    });
    scroll.appendChild(buildRow(wDate, wDepTime));

    const { wrapper: wTrainNum, input: iTrainNum } = buildField({
      id: 'mbf-train-number', label: 'Numero treno', required: true,
      placeholder: 'es. FR 9619', value: prefill.trainNumber || ''
    });
    const { wrapper: wOperator, input: iOperator } = buildField({
      id: 'mbf-train-operator', label: 'Operatore', required: true,
      placeholder: 'es. Trenitalia', value: prefill.operator || ''
    });
    scroll.appendChild(buildRow(wTrainNum, wOperator));

    // --- Campi opzionali ---
    const { wrapper: wArrTime, input: iArrTime } = buildField({
      id: 'mbf-train-arrival-time', label: 'Orario arrivo', type: 'time',
      value: prefill.arrivalTime || (prefill.arrival?.time || '')
    });
    const { wrapper: wClass, input: iClass } = buildField({
      id: 'mbf-train-class', label: 'Classe',
      placeholder: 'es. 1ª, 2ª', value: prefill.class || ''
    });
    scroll.appendChild(buildRow(wArrTime, wClass));

    const { wrapper: wSeat, input: iSeat } = buildField({
      id: 'mbf-train-seat', label: 'Posto',
      placeholder: 'es. 45', value: prefill.seat || ''
    });
    const { wrapper: wCoach, input: iCoach } = buildField({
      id: 'mbf-train-coach', label: 'Carrozza',
      placeholder: 'es. 3', value: prefill.coach || ''
    });
    scroll.appendChild(buildRow(wSeat, wCoach));

    const { wrapper: wPnr, input: iPnr } = buildField({
      id: 'mbf-train-pnr', label: 'PNR / Codice prenotazione',
      placeholder: 'es. ABC123', value: prefill.bookingReference || prefill.pnr || ''
    });
    const { wrapper: wPrice, input: iPrice } = buildField({
      id: 'mbf-train-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    scroll.appendChild(buildRow(wPnr, wPrice));

    // Upload documento
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    scroll.appendChild(wDoc);

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
      inp.addEventListener('input', () => {
        clearFieldError(inp);
        updateSaveBtn(form, saveBtn);
      });
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
    form.className = 'manual-booking-form manual-booking-form--bus';
    form.dataset.bookingType = 'bus';

    // Intestazione
    const heading = document.createElement('p');
    heading.className = 'manual-form-heading';
    heading.style.cssText = 'font-weight:var(--font-weight-semibold);margin-bottom:var(--spacing-4);color:var(--color-gray-700);';
    heading.textContent = 'Inserisci i dettagli del bus';
    form.appendChild(heading);

    // Scrollable body
    const scroll = document.createElement('div');
    scroll.style.cssText = 'overflow-y:auto;max-height:55vh;padding-right:4px;';

    // --- Campi obbligatori ---
    const { wrapper: wDepCity, input: iDepCity } = buildField({
      id: 'mbf-bus-departure-city', label: 'Città partenza', required: true,
      placeholder: 'es. Roma', value: prefill.departureCity || (prefill.departure?.city || '')
    });
    const { wrapper: wArrCity, input: iArrCity } = buildField({
      id: 'mbf-bus-arrival-city', label: 'Città arrivo', required: true,
      placeholder: 'es. Napoli', value: prefill.arrivalCity || (prefill.arrival?.city || '')
    });
    scroll.appendChild(buildRow(wDepCity, wArrCity));

    const { wrapper: wDate, input: iDate } = buildField({
      id: 'mbf-bus-date', label: 'Data', type: 'date', required: true,
      value: prefill.date || ''
    });
    const { wrapper: wDepTime, input: iDepTime } = buildField({
      id: 'mbf-bus-departure-time', label: 'Orario partenza', type: 'time', required: true,
      value: prefill.departureTime || (prefill.departure?.time || '')
    });
    scroll.appendChild(buildRow(wDate, wDepTime));

    const { wrapper: wOperator, input: iOperator } = buildField({
      id: 'mbf-bus-operator', label: 'Operatore', required: true,
      placeholder: 'es. FlixBus', value: prefill.operator || ''
    });
    scroll.appendChild(wOperator);

    // --- Campi opzionali ---
    const { wrapper: wDepStation, input: iDepStation } = buildField({
      id: 'mbf-bus-departure-station', label: 'Stazione/terminal partenza',
      placeholder: 'es. Tiburtina', value: prefill.departureStation || (prefill.departure?.station || '')
    });
    const { wrapper: wArrStation, input: iArrStation } = buildField({
      id: 'mbf-bus-arrival-station', label: 'Stazione/terminal arrivo',
      placeholder: 'es. Metropark', value: prefill.arrivalStation || (prefill.arrival?.station || '')
    });
    scroll.appendChild(buildRow(wDepStation, wArrStation));

    const { wrapper: wRoute, input: iRoute } = buildField({
      id: 'mbf-bus-route', label: 'Numero rotta',
      placeholder: 'es. 001', value: prefill.routeNumber || ''
    });
    const { wrapper: wSeat, input: iSeat } = buildField({
      id: 'mbf-bus-seat', label: 'Posto',
      placeholder: 'es. 12', value: prefill.seat || ''
    });
    scroll.appendChild(buildRow(wRoute, wSeat));

    const { wrapper: wPrice, input: iPrice } = buildField({
      id: 'mbf-bus-price', label: 'Prezzo (€)', type: 'number', placeholder: '0.00',
      value: prefill.price || ''
    });
    scroll.appendChild(wPrice);

    // Upload documento
    const { wrapper: wDoc, getFile } = buildDocumentUpload();
    scroll.appendChild(wDoc);

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
      inp.addEventListener('input', () => {
        clearFieldError(inp);
        updateSaveBtn(form, saveBtn);
      });
    });

    const getValues = () => ({
      departureCity: iDepCity.value.trim(),
      arrivalCity: iArrCity.value.trim(),
      date: iDate.value,
      departureTime: iDepTime.value,
      operator: iOperator.value.trim(),
      departureStation: iDepStation.value.trim() || undefined,
      arrivalStation: iArrStation.value.trim() || undefined,
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
  async function saveManualBooking(tripId, type, manualData, docFile) {
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
    const { onSaved, prefill = {} } = opts;
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
    } else {
      // Tipi non ancora implementati (US-007+): placeholder
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

    const { form, getValues, validate, saveBtn, getFile } = formModule;

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
        const docFile = getFile();
        await saveManualBooking(tripId, type, manualData, docFile);
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
