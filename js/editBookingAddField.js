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
   * @param {string} type - 'ferry' | 'flight' | 'hotel' | 'train' | 'bus' | 'rental'
   */
  function buildTriggerHTML(type) {
    return `<div class="add-field-section" data-booking-type="${type}">
      <button type="button" class="add-field-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Aggiungi campo
      </button>
      <div class="add-field-dropdown" style="display:none"></div>
    </div>`;
  }

  /**
   * Position a fixed dropdown relative to a trigger button.
   * Uses getBoundingClientRect() to avoid being clipped by overflow:hidden ancestors.
   * - Opens upward if not enough space below
   * - Aligns to right edge of trigger if dropdown overflows viewport right
   * - Caps max-height and enables internal scroll if content overflows
   */
  function positionDropdownFixed(dropdown, btn) {
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;
    const MAX_HEIGHT = 240;

    // Apply fixed positioning first so we can measure
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '9999';
    dropdown.style.maxHeight = MAX_HEIGHT + 'px';
    dropdown.style.overflowY = 'auto';

    // Measure dropdown dimensions after it becomes visible
    requestAnimationFrame(() => {
      const ddRect = dropdown.getBoundingClientRect();
      const ddWidth = ddRect.width;
      const ddHeight = Math.min(ddRect.height, MAX_HEIGHT);

      // Vertical: open downward by default, flip up if not enough room below
      const spaceBelow = vh - rect.bottom - MARGIN;
      if (spaceBelow >= ddHeight || spaceBelow >= 60) {
        // Enough space below (or at least 60px — render down and scroll)
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.bottom = 'auto';
      } else {
        // Open upward
        dropdown.style.top = 'auto';
        dropdown.style.bottom = (vh - rect.top + 4) + 'px';
      }

      // Horizontal: align to left edge of button, clamp to right viewport boundary
      let left = rect.left;
      if (left + ddWidth > vw - MARGIN) {
        // Align to right edge of button instead
        left = rect.right - ddWidth;
        // Final safety clamp
        if (left < MARGIN) left = MARGIN;
      }
      dropdown.style.left = left + 'px';
    });
  }

  /**
   * Attach event listener to the "+ Aggiungi campo" trigger inside formEl.
   * Must be called after formEl is in the DOM.
   */
  function attachTrigger(formEl, type) {
    const section = formEl.querySelector('.add-field-section');
    if (!section) return;
    const btn = section.querySelector('.add-field-btn');
    const dropdown = section.querySelector('.add-field-dropdown');
    if (!btn || !dropdown) return;

    // Detach from parent and append to body so it is never clipped by overflow:hidden
    document.body.appendChild(dropdown);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const missing = getMissingFields(formEl, type);
      if (missing.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      // Toggle dropdown
      if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = missing.map((def, i) =>
        `<div class="add-field-option" data-index="${i}">${def.label}</div>`
      ).join('');
      dropdown.style.display = 'block';
      positionDropdownFixed(dropdown, btn);

      dropdown.querySelectorAll('.add-field-option').forEach((el, i) => {
        el.addEventListener('click', () => {
          appendField(formEl, missing[i]);
          dropdown.style.display = 'none';
        });
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
      if (!section.contains(e.target) && e.target !== dropdown && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
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
