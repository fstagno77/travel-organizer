/**
 * Edit Booking — Add Field Helper
 * Provides the "+ Aggiungi campo" mechanism for all booking edit forms.
 * Works by appending a new input (with data-field) to the form — the existing
 * collectUpdates() in each trip type module picks it up automatically.
 *
 * Usage (after rendering a form):
 *   window.AddFieldHelper.init(formContainer, 'ferry', ferryData);
 */
window.AddFieldHelper = (() => {
  'use strict';

  // Schema dei campi aggiuntivi per tipo (label → { field, inputType })
  const SCHEMAS = {
    ferry: [
      { label: 'Orario partenza',  field: 'departure.time',  inputType: 'time' },
      { label: 'Orario arrivo',    field: 'arrival.time',    inputType: 'time' },
      { label: 'Cabina',           field: 'cabin',           inputType: 'text' },
      { label: 'Ponte',            field: 'deck',            inputType: 'text' },
      { label: 'Nome nave',        field: 'ferryName',       inputType: 'text' },
      { label: 'Numero rotta',     field: 'routeNumber',     inputType: 'text' },
      { label: 'Durata',           field: 'duration',        inputType: 'text' }
    ],
    flight: [
      { label: 'Posto',              field: 'seat',                inputType: 'text' },
      { label: 'Bagaglio',           field: 'baggage',             inputType: 'text' },
      { label: 'Terminal partenza',  field: 'departure.terminal',  inputType: 'text' },
      { label: 'Terminal arrivo',    field: 'arrival.terminal',    inputType: 'text' },
      { label: 'Durata',             field: 'duration',            inputType: 'text' }
    ],
    hotel: [
      { label: 'Orario check-in',   field: 'checkIn.time',         inputType: 'time' },
      { label: 'Orario check-out',  field: 'checkOut.time',        inputType: 'time' },
      { label: 'Colazione inclusa', field: 'breakfast.included',   inputType: 'text' }
    ],
    train: [
      { label: 'Posto',     field: 'seat',     inputType: 'text' },
      { label: 'Carrozza',  field: 'coach',    inputType: 'text' },
      { label: 'Durata',    field: 'duration', inputType: 'text' }
    ],
    bus: [
      { label: 'Posto',   field: 'seat',     inputType: 'text' },
      { label: 'Durata',  field: 'duration', inputType: 'text' }
    ],
    rental: [
      { label: 'Marca veicolo',     field: 'vehicle.make',      inputType: 'text' },
      { label: 'Modello veicolo',   field: 'vehicle.model',     inputType: 'text' },
      { label: 'Assicurazione',     field: 'insurance',         inputType: 'text' }
    ]
  };

  /**
   * Get the current value of a (possibly nested) field from a data object.
   * e.g. 'departure.time' → dataObj.departure?.time
   */
  function getNestedValue(dataObj, field) {
    if (!dataObj || !field) return undefined;
    const parts = field.split('.');
    let val = dataObj;
    for (const p of parts) {
      if (val == null) return undefined;
      val = val[p];
    }
    return val;
  }

  /**
   * Returns the list of schema fields that are currently absent/empty in the form.
   * A field is "missing" if there is no input[data-field="..."] with a non-empty value
   * and no input[data-field="..."] already present in the form.
   */
  function getMissingFields(formEl, type) {
    const schema = SCHEMAS[type] || [];
    return schema.filter(def => {
      // Check if input already exists in form
      const existing = formEl.querySelector(`input[data-field="${def.field}"]`);
      return !existing;
    });
  }

  /**
   * Append a new field row to the form.
   */
  function appendField(formEl, def) {
    const esc = (v) => String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Find or create an "Aggiunto" section at bottom of form
    let addedSection = formEl.querySelector('.edit-booking-section--added');
    if (!addedSection) {
      addedSection = document.createElement('div');
      addedSection.className = 'edit-booking-section edit-booking-section--added';
      addedSection.innerHTML = `<div class="edit-booking-section-title">Campi aggiuntivi</div><div class="edit-booking-grid"></div>`;
      // Insert before the add-field-section trigger
      const trigger = formEl.querySelector('.add-field-section');
      formEl.insertBefore(addedSection, trigger || null);
    }
    const grid = addedSection.querySelector('.edit-booking-grid');

    const field = document.createElement('div');
    field.className = 'edit-booking-field';
    field.innerHTML = `<label>${esc(def.label)}</label><input type="${esc(def.inputType)}" data-field="${esc(def.field)}" value="">`;
    grid.appendChild(field);

    // Focus the new input
    const input = field.querySelector('input');
    if (input) setTimeout(() => input.focus(), 50);
  }

  /**
   * Build the "+ Aggiungi campo" section HTML.
   * Uses an inline <select> + button instead of a floating dropdown to avoid
   * clipping issues caused by modal transform containing blocks.
   * @param {string} type - 'ferry' | 'flight' | 'hotel' | 'train' | 'bus' | 'rental'
   */
  function buildTriggerHTML(type) {
    return `<div class="add-field-section" data-booking-type="${type}">
      <button type="button" class="add-field-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Aggiungi campo
      </button>
      <div class="add-field-inline-picker" style="display:none">
        <select class="add-field-select"></select>
        <button type="button" class="add-field-confirm-btn">Aggiungi</button>
        <button type="button" class="add-field-cancel-btn">✕</button>
      </div>
    </div>`;
  }

  /**
   * Attach event listener to the "+ Aggiungi campo" trigger inside formEl.
   * Uses an inline <select> + confirm button — no floating dropdown, no clipping.
   * Must be called after formEl is in the DOM.
   */
  function attachTrigger(formEl, type) {
    const section = formEl.querySelector('.add-field-section');
    if (!section) return;
    const btn = section.querySelector('.add-field-btn');
    const picker = section.querySelector('.add-field-inline-picker');
    const select = section.querySelector('.add-field-select');
    const confirmBtn = section.querySelector('.add-field-confirm-btn');
    const cancelBtn = section.querySelector('.add-field-cancel-btn');
    if (!btn || !picker || !select || !confirmBtn || !cancelBtn) return;

    btn.addEventListener('click', () => {
      const missing = getMissingFields(formEl, type);
      if (missing.length === 0) return;

      // Populate select options
      select.innerHTML = missing.map((def, i) =>
        `<option value="${i}">${def.label}</option>`
      ).join('');

      btn.style.display = 'none';
      picker.style.display = '';
      select.focus();
    });

    confirmBtn.addEventListener('click', () => {
      const missing = getMissingFields(formEl, type);
      const idx = parseInt(select.value, 10);
      if (!isNaN(idx) && missing[idx]) {
        appendField(formEl, missing[idx]);
      }
      picker.style.display = 'none';
      btn.style.display = '';
    });

    cancelBtn.addEventListener('click', () => {
      picker.style.display = 'none';
      btn.style.display = '';
    });
  }

  /**
   * Initialize add-field mechanism on a rendered form container.
   * Call this after the form HTML is in the DOM.
   * @param {HTMLElement} formEl - the .edit-booking-form element (or its parent)
   * @param {string} type - booking type
   */
  function init(formEl, type) {
    if (!formEl || !type) return;
    const schema = SCHEMAS[type];
    if (!schema) return;

    // Find the actual form div
    const form = formEl.querySelector('.edit-booking-form') || formEl;

    // Inject trigger if not already there
    if (!form.querySelector('.add-field-section')) {
      form.insertAdjacentHTML('beforeend', buildTriggerHTML(type));
    }

    attachTrigger(form, type);
  }

  return { init, buildTriggerHTML, SCHEMAS };
})();
