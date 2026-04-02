/**
 * Custom Select Component
 * Replaces native <select> elements with a fully custom div-based dropdown.
 * No OS panel — click shows a styled list anchored below the trigger.
 *
 * Usage (imperative, returns a wrapper element):
 *   const el = window.CustomSelect.create({
 *     options: [{ value: 'ADT', label: 'ADT' }, ...],
 *     selected: 'ADT',
 *     onChange: (value) => { ... },
 *     className: 'optional-extra-class',    // added to wrapper
 *     dataAttrs: { field: 'passengers[0].type', original: 'ADT' }  // data-* on wrapper
 *   });
 *   parentEl.appendChild(el);
 *
 * Read the current value:
 *   el.dataset.value  or  window.CustomSelect.getValue(el)
 *
 * Update selected value programmatically:
 *   window.CustomSelect.setValue(el, 'CHD');
 */
window.CustomSelect = (() => {
  'use strict';

  // Close all open dropdowns except the given one
  function closeAll(except) {
    document.querySelectorAll('.cs-wrapper.cs-open').forEach(w => {
      if (w !== except) w.classList.remove('cs-open');
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cs-wrapper')) closeAll(null);
  }, true);

  /**
   * Create a custom select element.
   * @param {Object} opts
   * @param {Array<{value:string, label:string}>} opts.options
   * @param {string} [opts.selected]
   * @param {function(string):void} [opts.onChange]
   * @param {string} [opts.className]
   * @param {Object} [opts.dataAttrs]  — key→value pairs for data-* attributes on wrapper
   * @returns {HTMLElement}  the .cs-wrapper div
   */
  function create({ options = [], selected, onChange, className = '', dataAttrs = {} } = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cs-wrapper' + (className ? ' ' + className : '');

    // data-value tracks the current selection
    const currentSelected = selected !== undefined && selected !== null ? String(selected) : (options[0]?.value ?? '');
    wrapper.dataset.value = currentSelected;

    // Apply extra data-* attrs
    Object.entries(dataAttrs).forEach(([k, v]) => {
      wrapper.dataset[k] = v;
    });

    const trigger = document.createElement('div');
    trigger.className = 'cs-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('tabindex', '0');

    const label = document.createElement('span');
    label.className = 'cs-label';
    const currentOpt = options.find(o => String(o.value) === currentSelected);
    label.textContent = currentOpt ? currentOpt.label : (options[0]?.label ?? '');

    const arrow = document.createElement('span');
    arrow.className = 'cs-arrow';
    arrow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    trigger.appendChild(label);
    trigger.appendChild(arrow);

    const list = document.createElement('ul');
    list.className = 'cs-list';
    list.setAttribute('role', 'listbox');

    options.forEach(opt => {
      const li = document.createElement('li');
      li.className = 'cs-option' + (String(opt.value) === currentSelected ? ' cs-option--selected' : '');
      li.setAttribute('role', 'option');
      li.dataset.value = opt.value;
      li.textContent = opt.label;

      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.value;
        wrapper.dataset.value = val;
        label.textContent = opt.label;
        list.querySelectorAll('.cs-option').forEach(el => el.classList.remove('cs-option--selected'));
        li.classList.add('cs-option--selected');
        trigger.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('cs-open');
        if (typeof onChange === 'function') onChange(val);
      });

      list.appendChild(li);
    });

    // Toggle open/close on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('cs-open');
      closeAll(wrapper);
      if (!isOpen) {
        wrapper.classList.add('cs-open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        wrapper.classList.remove('cs-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
      const isOpen = wrapper.classList.contains('cs-open');
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) {
          closeAll(wrapper);
          wrapper.classList.add('cs-open');
          trigger.setAttribute('aria-expanded', 'true');
        } else {
          wrapper.classList.remove('cs-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      } else if (e.key === 'Escape') {
        wrapper.classList.remove('cs-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const opts = Array.from(list.querySelectorAll('.cs-option'));
        const currentIdx = opts.findIndex(o => o.dataset.value === wrapper.dataset.value);
        let nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, opts.length - 1)
          : Math.max(currentIdx - 1, 0);
        opts[nextIdx]?.click();
      }
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(list);

    return wrapper;
  }

  /**
   * Get the current value of a .cs-wrapper element.
   */
  function getValue(wrapperEl) {
    return wrapperEl?.dataset?.value ?? '';
  }

  /**
   * Programmatically set the selected value on a .cs-wrapper element.
   */
  function setValue(wrapperEl, value) {
    if (!wrapperEl) return;
    const val = String(value);
    wrapperEl.dataset.value = val;
    const label = wrapperEl.querySelector('.cs-label');
    const opts = wrapperEl.querySelectorAll('.cs-option');
    opts.forEach(o => {
      o.classList.toggle('cs-option--selected', o.dataset.value === val);
      if (o.dataset.value === val && label) label.textContent = o.textContent;
    });
  }

  return { create, getValue, setValue };
})();
