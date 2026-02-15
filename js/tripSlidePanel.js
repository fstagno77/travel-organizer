/**
 * Trip Slide Panel - Custom activity create/view/edit panel
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);
  const GMAPS_REGEX = /https?:\/\/(www\.)?(google\.\w+\/maps|maps\.google\.\w+|maps\.app\.goo\.gl|goo\.gl\/maps)\S*/i;

  /**
   * Check if a string contains a Google Maps URL
   */
  function extractGoogleMapsUrl(text) {
    const match = text.match(GMAPS_REGEX);
    return match ? match[0] : null;
  }

  /**
   * Render star rating like Google Maps
   * @param {number} rating - e.g. 4.5
   * @returns {string} star characters
   */
  function renderStars(rating) {
    if (!rating) return '';
    const full = Math.floor(rating);
    const half = rating - full >= 0.3 && rating - full < 0.8;
    const empty = 5 - full - (half ? 1 : 0);
    return '\u2605'.repeat(full) + (half ? '\u00BD' : '') + '\u2606'.repeat(empty);
  }

  /**
   * Format review count with locale separator (e.g. 2408 → "2.408")
   */
  function formatReviewCount(count) {
    if (!count) return '0';
    return count.toLocaleString('it-IT');
  }

  /**
   * Build place card HTML (used in both form and view modes)
   * @param {Object} loc - location data
   * @param {boolean} removable - show X button
   * @returns {string} HTML
   */
  function buildPlaceCardHtml(loc, removable) {
    const ratingHtml = loc.rating
      ? `<div class="place-card-rating">
          <span class="place-card-stars">${renderStars(loc.rating)}</span>
          <span class="place-card-rating-value">${loc.rating}</span>
          <span class="place-card-reviews">(${formatReviewCount(loc.reviewCount)} ${i18n.t('activity.reviews') || 'reviews'})</span>
        </div>`
      : '';

    const categoryHtml = loc.category
      ? `<div class="place-card-category">${esc(loc.category)}</div>`
      : '';

    const addressHtml = loc.address
      ? `<div class="place-card-address">${esc(loc.address)}</div>`
      : '';

    const navDest = loc.name
      ? encodeURIComponent(loc.name + (loc.address ? ', ' + loc.address : ''))
      : (loc.latitude && loc.longitude ? `${loc.latitude},${loc.longitude}` : null);
    const navigateHtml = navDest
      ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${navDest}" target="_blank" rel="noopener noreferrer" class="place-card-maps-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          ${i18n.t('activity.navigateTo') || 'Directions'}
        </a>`
      : '';

    const mapsLinkHtml = loc.mapsUrl
      ? `<a href="${encodeURI(loc.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="place-card-maps-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          ${i18n.t('activity.openInMaps') || 'Open in Google Maps'}
        </a>`
      : '';

    const removeHtml = removable
      ? `<button class="place-card-remove" type="button" id="place-card-remove-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`
      : '';

    return `<div class="place-card">
      ${removeHtml}
      <div class="place-card-name">${esc(loc.name || '')}</div>
      ${categoryHtml}
      ${addressHtml}
      ${ratingHtml}
      <div class="place-card-links">${mapsLinkHtml}${navigateHtml}</div>
    </div>`;
  }

  /**
   * Convert a File to base64 string
   * @param {File} file
   * @returns {Promise<string>} base64 data (without data: prefix)
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Format file size for display
   * @param {number} bytes
   * @returns {string}
   */
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Normalize a URL: prepend https:// if no protocol present
   */
  function normalizeUrl(url) {
    if (!url) return url;
    if (!/^https?:\/\//i.test(url)) {
      return 'https://' + url;
    }
    return url;
  }

  /**
   * Validate a URL string
   */
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Collect non-empty URLs from the form
   * @returns {string[]}
   */
  function collectUrls() {
    const inputs = document.querySelectorAll('#activity-urls-container .activity-url-input');
    const urls = [];
    inputs.forEach(input => {
      const val = input.value.trim();
      if (val) urls.push(normalizeUrl(val));
    });
    return urls;
  }

  /**
   * Render activity view mode (read-only)
   * @param {Object} activity
   * @returns {string} HTML
   */
  function renderActivityViewMode(activity) {
    const lang = i18n.getLang();
    const dateStr = activity.date ? utils.formatDate(activity.date, lang) : '-';
    const timeRange = [];
    if (activity.startTime) timeRange.push(formatTime24to12(activity.startTime));
    if (activity.endTime) timeRange.push(formatTime24to12(activity.endTime));

    const urlsHtml = activity.urls && activity.urls.length > 0
      ? activity.urls.map(url => {
          const safeUrl = isValidUrl(url) ? encodeURI(url) : '#';
          const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
          const escaped = displayUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          return `<div><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escaped}</a></div>`;
        }).join('')
      : `<span class="activity-view-value--muted" data-i18n="activity.noLinks">${i18n.t('activity.noLinks') || 'No links'}</span>`;

    const attachmentsHtml = activity.attachments && activity.attachments.length > 0
      ? `<div class="attachment-list">${activity.attachments.map(att => {
          const isImage = att.type && att.type.startsWith('image/');
          const icon = isImage
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
          return `<button class="attachment-item" data-path="${att.path}"><span class="attachment-icon">${icon}</span><span class="attachment-name">${esc(att.name)}</span></button>`;
        }).join('')}</div>`
      : `<span class="activity-view-value--muted" data-i18n="activity.noAttachments">${i18n.t('activity.noAttachments') || 'No attachments'}</span>`;

    const locationViewHtml = activity.location
      ? `<div class="activity-view-field">${buildPlaceCardHtml(activity.location, false)}</div>`
      : '';

    const addressText = activity.address || (activity.location ? activity.location.address : '');
    const addressViewHtml = addressText
      ? `<div class="activity-view-field">
           <div class="activity-view-label" data-i18n="activity.address">${i18n.t('activity.address') || 'Address'}</div>
           <div class="activity-view-value">${esc(addressText)}</div>
         </div>`
      : '';

    return `
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.name">${i18n.t('activity.name') || 'Name'}</div>
        <div class="activity-view-value">${esc(activity.name)}</div>
      </div>
      ${addressViewHtml}
      ${locationViewHtml}
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.date">${i18n.t('activity.date') || 'Date'}</div>
        <div class="activity-view-value">${dateStr}</div>
      </div>
      ${timeRange.length > 0 ? `
        <div class="activity-view-field">
          <div class="activity-view-label" data-i18n="activity.time">${i18n.t('activity.time') || 'Time'}</div>
          <div class="activity-view-value">${timeRange.join(' – ')}</div>
        </div>
      ` : ''}
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.description">${i18n.t('activity.description') || 'Description'}</div>
        <div class="activity-view-value">${activity.description ? esc(activity.description) : `<span class="activity-view-value--muted" data-i18n="activity.noDescription">${i18n.t('activity.noDescription') || 'No description'}</span>`}</div>
      </div>
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.urls">${i18n.t('activity.urls') || 'Links'}</div>
        <div class="activity-view-value">${urlsHtml}</div>
      </div>
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.attachments">${i18n.t('activity.attachments') || 'Attachments'}</div>
        <div class="activity-view-value">${attachmentsHtml}</div>
      </div>
    `;
  }

  /**
   * Format "HH:MM" (24h) to display string e.g. "4:30PM"
   */
  function formatTime24to12(time24) {
    if (!time24) return '';
    const [hh, mm] = time24.split(':');
    const h = parseInt(hh);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mm}${period}`;
  }

  /**
   * Generate all 96 time options (15-min intervals) as HTML
   */
  function generateTimeOptions() {
    let html = '';
    for (let h = 0; h < 24; h++) {
      for (const m of ['00', '15', '30', '45']) {
        const val = String(h).padStart(2, '0') + ':' + m;
        html += `<div class="time-picker-option" data-value="${val}">${formatTime24to12(val)}</div>`;
      }
    }
    return html;
  }

  // Cache generated options HTML (same for all pickers)
  let _timeOptionsHtml = null;
  function getTimeOptionsHtml() {
    if (!_timeOptionsHtml) _timeOptionsHtml = generateTimeOptions();
    return _timeOptionsHtml;
  }

  /**
   * Build a Google Calendar-style time picker
   * @param {string} id - Element ID
   * @param {string} value - Current value "HH:MM" or ""
   * @param {boolean} disabled - Whether the picker is disabled
   * @returns {string} HTML
   */
  /**
   * Parse a user-typed time string into "HH:MM" (24h) format.
   * Accepts: "14:30", "2:30PM", "2:30 pm", "14.30", "230pm", "9", "9pm", "930", etc.
   * @returns {string|null} "HH:MM" or null if invalid
   */
  function parseTimeInput(raw) {
    if (!raw) return null;
    const s = raw.trim().toLowerCase();
    if (!s) return null;

    let hours, minutes;
    const isPM = /p/.test(s);
    const isAM = /a/.test(s);
    const digits = s.replace(/[^0-9:.\-]/g, '');

    // Try "H:MM" or "HH:MM" or "H.MM" or "HH.MM"
    const colonMatch = digits.match(/^(\d{1,2})[:.](\d{2})$/);
    if (colonMatch) {
      hours = parseInt(colonMatch[1]);
      minutes = parseInt(colonMatch[2]);
    } else {
      // Pure digits: 1-4 digits
      const nums = digits.replace(/[^0-9]/g, '');
      if (nums.length === 1 || nums.length === 2) {
        // "9" → 9:00, "14" → 14:00
        hours = parseInt(nums);
        minutes = 0;
      } else if (nums.length === 3) {
        // "930" → 9:30
        hours = parseInt(nums[0]);
        minutes = parseInt(nums.substring(1));
      } else if (nums.length === 4) {
        // "1430" → 14:30
        hours = parseInt(nums.substring(0, 2));
        minutes = parseInt(nums.substring(2));
      } else {
        return null;
      }
    }

    // Apply AM/PM
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  function buildTimePicker(id, value, disabled) {
    const displayValue = value ? formatTime24to12(value) : '';
    const clearHidden = value ? '' : ' hidden';
    return `<div class="time-picker${disabled ? ' disabled' : ''}" id="${id}" data-value="${value || ''}">
      <input type="text" class="form-input time-picker-input"
             placeholder="--:--" value="${displayValue}"${disabled ? ' disabled' : ''}>
      <button type="button" class="time-picker-clear"${clearHidden} tabindex="-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="time-picker-dropdown">${getTimeOptionsHtml()}</div>
    </div>`;
  }

  /**
   * Get value from a time picker
   * @param {string} id - Element ID
   * @returns {string|null} "HH:MM" or null
   */
  function getTimePickerValue(id) {
    const picker = document.getElementById(id);
    return picker?.dataset.value || null;
  }

  /**
   * Initialize Google Calendar-style time pickers with start→end dependency
   */
  function initTimePickers() {
    const startPicker = document.getElementById('activity-start-time');
    const endPicker = document.getElementById('activity-end-time');
    if (!startPicker || !endPicker) return;

    function openDropdown(picker) {
      document.querySelectorAll('.time-picker-dropdown.open').forEach(d => d.classList.remove('open'));
      const dropdown = picker.querySelector('.time-picker-dropdown');
      dropdown.classList.add('open');
      const selected = dropdown.querySelector('.time-picker-option.selected')
        || dropdown.querySelector('[data-value="12:00"]');
      if (selected) {
        setTimeout(() => selected.scrollIntoView({ block: 'center' }), 0);
      }
    }

    function closeAllDropdowns() {
      document.querySelectorAll('.time-picker-dropdown.open').forEach(d => d.classList.remove('open'));
    }

    function setPickerValue(picker, value) {
      picker.dataset.value = value || '';
      const input = picker.querySelector('.time-picker-input');
      const clearBtn = picker.querySelector('.time-picker-clear');
      input.value = value ? formatTime24to12(value) : '';
      if (clearBtn) clearBtn.hidden = !value;
      picker.querySelectorAll('.time-picker-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
      });
    }

    function selectTime(picker, value) {
      setPickerValue(picker, value);
      closeAllDropdowns();

      if (picker === startPicker && value) {
        endPicker.classList.remove('disabled');
        endPicker.querySelector('.time-picker-input').disabled = false;
        if (!endPicker.dataset.value) {
          const [hh, mm] = value.split(':');
          const endH = (parseInt(hh) + 1) % 24;
          setPickerValue(endPicker, String(endH).padStart(2, '0') + ':' + mm);
        }
      }
    }

    function clearPicker(picker) {
      setPickerValue(picker, '');
      closeAllDropdowns();
      if (picker === startPicker) {
        setPickerValue(endPicker, '');
        endPicker.classList.add('disabled');
        endPicker.querySelector('.time-picker-input').disabled = true;
      }
    }

    [startPicker, endPicker].forEach(picker => {
      const input = picker.querySelector('.time-picker-input');
      const dropdown = picker.querySelector('.time-picker-dropdown');
      const clearBtn = picker.querySelector('.time-picker-clear');

      // Commit typed value: parse, validate, and apply
      function commitTypedValue() {
        const parsed = parseTimeInput(input.value);
        if (parsed) {
          selectTime(picker, parsed);
        } else if (input.value.trim() === '') {
          clearPicker(picker);
        } else {
          // Invalid input — revert to previous value
          input.value = picker.dataset.value ? formatTime24to12(picker.dataset.value) : '';
        }
      }

      input.addEventListener('focus', () => {
        if (input.disabled) return;
        input.select();
        openDropdown(picker);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          closeAllDropdowns();
          commitTypedValue();
          input.blur();
        } else if (e.key === 'Escape') {
          closeAllDropdowns();
          input.value = picker.dataset.value ? formatTime24to12(picker.dataset.value) : '';
          input.blur();
        }
      });

      input.addEventListener('blur', () => {
        // Small delay to allow dropdown click to fire first
        setTimeout(() => {
          if (!dropdown.classList.contains('open')) {
            commitTypedValue();
          }
        }, 150);
      });

      dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.time-picker-option');
        if (option) selectTime(picker, option.dataset.value);
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          clearPicker(picker);
        });
      }

      if (picker.dataset.value) {
        const opt = dropdown.querySelector(`[data-value="${picker.dataset.value}"]`);
        if (opt) opt.classList.add('selected');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.time-picker')) closeAllDropdowns();
    });
  }

  /**
   * Render activity form mode (create/edit)
   * @param {string} date - Pre-filled date
   * @param {Object} activity - Existing activity data (for edit) or empty
   * @returns {string} HTML
   */
  function renderActivityFormMode(date, activity) {
    const act = activity || {};
    const urls = act.urls && act.urls.length > 0 ? act.urls : [''];

    const existingAttachmentsHtml = act.attachments && act.attachments.length > 0
      ? act.attachments.map(att => `
          <div class="file-preview-item" data-path="${att.path}">
            <span class="file-preview-name">${esc(att.name)}</span>
            <span class="file-preview-size">${formatFileSize(att.size || 0)}</span>
            <button type="button" class="file-preview-remove existing-attachment-remove" data-path="${att.path}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('')
      : '';

    const urlRowsHtml = urls.map((url, i) => `
      <div class="url-row">
        <input type="url" class="form-input activity-url-input" placeholder="${i18n.t('activity.urlPlaceholder') || 'https://...'}" value="${url}">
        ${urls.length > 1 || url ? `
          <button type="button" class="url-remove-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        ` : ''}
      </div>
    `).join('');

    const existingLocationHtml = act.location
      ? buildPlaceCardHtml(act.location, true)
      : '';

    return `
      <div class="form-group">
        <label data-i18n="activity.name">${i18n.t('activity.name') || 'Name'}</label>
        <input type="text" class="form-input" id="activity-name" maxlength="100" required value="${esc(act.name || '')}" placeholder="${i18n.t('activity.namePlaceholder') || 'e.g. Museum visit, Restaurant...'}">
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <div class="activity-category-picker" id="activity-category-picker">
          ${window.activityCategories.CATEGORY_ORDER
            .filter(k => k !== 'volo' && k !== 'hotel')
            .map(key => {
              const cat = window.activityCategories.CATEGORIES[key];
              const label = window.activityCategories.getCategoryLabel(cat);
              const isActive = (act.category || '') === key;
              return `<button type="button" class="activity-category-chip ${isActive ? 'active' : ''}"
                              data-category="${key}" style="--chip-gradient: ${cat.gradient}; --chip-color: ${cat.color}">
                        <span class="activity-category-chip-icon">${cat.svg}</span>
                        ${label}
                      </button>`;
            }).join('')}
        </div>
      </div>
      <div class="form-group">
        <label data-i18n="activity.address">${i18n.t('activity.address') || 'Address'}</label>
        <input type="text" class="form-input" id="activity-address" value="${esc(act.address || (act.location ? act.location.address : '') || '')}" placeholder="${i18n.t('activity.addressPlaceholder') || 'e.g. Via Roma 1, or paste a Google Maps link'}">
        <div id="activity-place-card">${existingLocationHtml}</div>
      </div>
      <div class="form-group">
        <label data-i18n="activity.date">${i18n.t('activity.date') || 'Date'}</label>
        <input type="date" class="form-input" id="activity-date" required value="${date || act.date || ''}">
      </div>
      <div class="form-group">
        <label data-i18n="activity.time">${i18n.t('activity.time') || 'Time'}</label>
        <div class="time-picker-row">
          ${buildTimePicker('activity-start-time', act.startTime || '', false)}
          <span class="time-picker-sep">&ndash;</span>
          ${buildTimePicker('activity-end-time', act.endTime || '', !act.startTime)}
        </div>
      </div>
      <div class="form-group">
        <label data-i18n="activity.description">${i18n.t('activity.description') || 'Description'}</label>
        <textarea class="form-input form-textarea" id="activity-description" rows="3" placeholder="${i18n.t('activity.descriptionPlaceholder') || 'Additional details...'}">${esc(act.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label data-i18n="activity.urls">${i18n.t('activity.urls') || 'Links'}</label>
        <div id="activity-urls-container">${urlRowsHtml}</div>
        <button type="button" class="activity-add-url-btn" id="activity-add-url-btn" data-i18n="activity.addUrl">${i18n.t('activity.addUrl') || '+ Add link'}</button>
      </div>
      <div class="form-group">
        <label data-i18n="activity.attachments">${i18n.t('activity.attachments') || 'Attachments'}</label>
        <input type="file" class="activity-file-input" id="activity-files" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp">
        <div class="file-upload-zone" id="activity-upload-zone">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span class="file-upload-zone-text" data-i18n="activity.addFiles">${i18n.t('activity.addFiles') || 'Add files'}</span>
          <span class="file-upload-zone-hint">PDF, JPEG, PNG, GIF, WebP — max 10 MB</span>
        </div>
        <div id="existing-attachments" class="file-preview-list">${existingAttachmentsHtml}</div>
        <div id="new-files-preview" class="file-preview-list"></div>
      </div>
    `;
  }

  // Track active escape handler for cleanup
  let _escapeHandler = null;

  /**
   * Show the activity panel as an in-modal page (slides within the trip modal)
   * @param {'create'|'view'|'edit'} mode
   * @param {string|null} date - YYYY-MM-DD for create mode
   * @param {Object|null} activity - Existing activity for view/edit
   */
  function showActivityPanel(mode, date, activity) {
    const slider = document.getElementById('modal-page-slider');
    const mainPage = document.getElementById('modal-page-main');
    const activityPage = document.getElementById('modal-page-activity');

    if (!slider || !activityPage) return;

    const isView = mode === 'view';
    const isCreate = mode === 'create';

    // Save scroll position of main page (only on first navigation, not re-renders)
    const alreadyAtActivity = slider.classList.contains('at-activity');
    const savedScrollTop = alreadyAtActivity ? (slider._savedScrollTop || 0) : mainPage.scrollTop;
    if (!alreadyAtActivity) slider._savedScrollTop = savedScrollTop;

    const titleKey = isCreate ? 'activity.createTitle' : isView ? 'activity.viewTitle' : 'activity.editTitle';
    const titleDefault = isCreate ? 'New Activity' : isView ? 'Activity' : 'Edit Activity';

    let footerHtml;
    if (isView) {
      footerHtml = `
        <button class="btn btn-outline-danger" id="activity-delete-btn" data-i18n="activity.delete">${i18n.t('activity.delete') || 'Delete'}</button>
        <button class="btn btn-primary" id="activity-edit-btn" data-i18n="activity.edit">${i18n.t('activity.edit') || 'Edit'}</button>
      `;
    } else {
      footerHtml = `
        <button class="btn btn-secondary" id="activity-cancel-btn" data-i18n="modal.cancel">${i18n.t('modal.cancel') || 'Cancel'}</button>
        <button class="btn btn-primary" id="activity-save-btn" data-i18n="${isCreate ? 'activity.create' : 'modal.save'}">${i18n.t(isCreate ? 'activity.create' : 'modal.save') || (isCreate ? 'Create' : 'Save')}</button>
      `;
    }

    const bodyHtml = isView
      ? renderActivityViewMode(activity)
      : renderActivityFormMode(date, activity);

    // Render into the activity page slot (no overlay, no body append)
    activityPage.innerHTML = `
      <div class="slide-panel-header">
        <h2 data-i18n="${titleKey}">${i18n.t(titleKey) || titleDefault}</h2>
        <button class="activity-panel-close" id="activity-panel-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="slide-panel-body">
        ${bodyHtml}
      </div>
      <div class="slide-panel-footer">
        ${footerHtml}
      </div>
    `;

    i18n.apply(activityPage);

    // Slide to activity page
    requestAnimationFrame(() => {
      slider.classList.add('at-activity');
      activityPage.scrollTop = 0;
    });

    // Navigate back function
    const navigateBack = (onComplete) => {
      slider.classList.remove('at-activity');
      activityPage.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== activityPage) return;
        activityPage.removeEventListener('transitionend', onEnd);
        activityPage.innerHTML = '';
        delete slider._savedScrollTop;
        mainPage.scrollTop = savedScrollTop;
        if (onComplete) onComplete();
      }, { once: false });
    };

    // Close button handler
    document.getElementById('activity-panel-close').addEventListener('click', () => navigateBack());

    // Mode-specific handlers
    if (isView) {
      initViewModeHandlers(activity, navigateBack);
    } else {
      initFormModeHandlers(mode, date, activity, navigateBack);
    }
  }

  /**
   * Initialize view mode handlers (edit, delete, attachment downloads)
   */
  function initViewModeHandlers(activity, navigateBack) {
    // Edit button — re-render in place (no close+reopen needed)
    document.getElementById('activity-edit-btn').addEventListener('click', () => {
      showActivityPanel('edit', null, activity);
    });

    // Delete button
    document.getElementById('activity-delete-btn').addEventListener('click', async () => {
      const confirmed = await utils.showConfirm(
        i18n.t('activity.deleteConfirm') || 'Are you sure you want to delete this activity?',
        { confirmText: i18n.t('modal.delete') || 'Elimina', variant: 'danger' }
      );
      if (!confirmed) return;

      const deleteBtn = document.getElementById('activity-delete-btn');
      deleteBtn.disabled = true;

      try {
        const response = await utils.authFetch('/.netlify/functions/manage-activity', {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            tripId: window.tripPage.currentTripData.id,
            activityId: activity.id
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        navigateBack(async () => {
          await window.tripPage.loadTripFromUrl();
          window.tripPage.switchToTab('activities');
          utils.showToast(i18n.t('activity.deleteSuccess') || 'Activity deleted', 'success');
        });
      } catch (error) {
        console.error('Error deleting activity:', error);
        utils.showToast(i18n.t('activity.deleteError') || 'Error deleting activity', 'error');
        deleteBtn.disabled = false;
      }
    });

    // Attachment download links (activity-files bucket)
    document.querySelectorAll('.attachment-item').forEach(item => {
      item.addEventListener('click', async () => {
        const filePath = item.dataset.path;
        if (!filePath) return;

        try {
          const response = await utils.authFetch('/.netlify/functions/manage-activity', {
            method: 'POST',
            body: JSON.stringify({ action: 'get-url', filePath })
          });
          const result = await response.json();
          if (result.success && result.url) {
            window.open(result.url, '_blank');
          }
        } catch (error) {
          console.error('Error getting file URL:', error);
          utils.showToast(i18n.t('common.downloadError') || 'Error downloading file', 'error');
        }
      });
    });
  }

  /**
   * Initialize form mode handlers (save, URL management, file previews)
   */
  function initFormModeHandlers(mode, date, activity, navigateBack) {
    const isCreate = mode === 'create';
    let newFiles = []; // Track newly selected files
    let removedAttachmentPaths = []; // Track removed existing attachments
    let locationData = activity?.location || null; // Track Google Maps location

    // Cancel button
    document.getElementById('activity-cancel-btn').addEventListener('click', () => navigateBack());

    // Time pickers (Google Calendar-style)
    initTimePickers();

    // Category picker
    let selectedCategory = activity?.category || null;
    const categoryPicker = document.getElementById('activity-category-picker');

    if (categoryPicker) {
      categoryPicker.addEventListener('click', (e) => {
        const chip = e.target.closest('.activity-category-chip');
        if (!chip) return;
        // Toggle: if already active, deselect; otherwise select
        const wasActive = chip.classList.contains('active');
        categoryPicker.querySelectorAll('.activity-category-chip').forEach(c => c.classList.remove('active'));
        if (!wasActive) {
          chip.classList.add('active');
          selectedCategory = chip.dataset.category;
        } else {
          selectedCategory = null;
        }
      });
    }

    // Auto-categorize on name blur
    const nameInput = document.getElementById('activity-name');
    if (nameInput && categoryPicker) {
      nameInput.addEventListener('blur', () => {
        if (selectedCategory) return; // don't override manual selection
        const detected = window.activityCategories.detectCategory(nameInput.value);
        if (detected !== 'luogo') {
          categoryPicker.querySelectorAll('.activity-category-chip').forEach(c => c.classList.remove('active'));
          const chip = categoryPicker.querySelector(`[data-category="${detected}"]`);
          if (chip) {
            chip.classList.add('active');
            selectedCategory = detected;
          }
        }
      });
    }

    // Google Maps URL detection on address field
    const addressInput = document.getElementById('activity-address');
    const placeCardContainer = document.getElementById('activity-place-card');

    function showPlaceCard(loc) {
      locationData = loc;
      placeCardContainer.innerHTML = buildPlaceCardHtml(loc, true);
      // Wire up remove button
      const removeBtn = placeCardContainer.querySelector('#place-card-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          locationData = null;
          placeCardContainer.innerHTML = '';
          addressInput.value = '';
          addressInput.focus();
        });
      }
    }

    async function fetchGoogleMapsData(url) {
      // Show loading state
      placeCardContainer.innerHTML = `<div class="place-card-loading"><div class="spinner-sm"></div><span>${i18n.t('activity.locationLoading') || 'Loading place...'}</span></div>`;
      addressInput.value = '';

      try {
        const response = await utils.authFetch('/.netlify/functions/google-maps-proxy', {
          method: 'POST',
          body: JSON.stringify({ url })
        });
        const result = await response.json();

        if (!result.success) {
          placeCardContainer.innerHTML = '';
          utils.showToast(i18n.t('activity.locationError') || 'Could not fetch location data', 'error');
          return;
        }

        const data = result.data;
        if (!data.name && !data.address) {
          placeCardContainer.innerHTML = '';
          utils.showToast(i18n.t('activity.locationNotFound') || 'Place not found', 'error');
          return;
        }

        data.mapsUrl = url;
        addressInput.value = data.address || '';
        showPlaceCard(data);
      } catch (error) {
        console.error('Google Maps fetch error:', error);
        placeCardContainer.innerHTML = '';
        utils.showToast(i18n.t('activity.locationError') || 'Could not fetch location data', 'error');
      }
    }

    addressInput.addEventListener('input', () => {
      const val = addressInput.value.trim();
      const mapsUrl = extractGoogleMapsUrl(val);
      if (mapsUrl) {
        fetchGoogleMapsData(mapsUrl);
      } else if (locationData) {
        // User is typing plain text over a previously resolved location
        locationData = null;
        placeCardContainer.innerHTML = '';
      }
    });

    // Wire up existing place card remove button (edit mode with existing location)
    if (locationData) {
      const existingRemoveBtn = placeCardContainer.querySelector('#place-card-remove-btn');
      if (existingRemoveBtn) {
        existingRemoveBtn.addEventListener('click', () => {
          locationData = null;
          placeCardContainer.innerHTML = '';
          addressInput.value = '';
          addressInput.focus();
        });
      }
    }

    // URL management
    document.getElementById('activity-add-url-btn').addEventListener('click', () => {
      const container = document.getElementById('activity-urls-container');
      const row = document.createElement('div');
      row.className = 'url-row';
      row.innerHTML = `
        <input type="url" class="form-input activity-url-input" placeholder="${i18n.t('activity.urlPlaceholder') || 'https://...'}">
        <button type="button" class="url-remove-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      container.appendChild(row);
      row.querySelector('.url-remove-btn').addEventListener('click', () => row.remove());
      row.querySelector('.activity-url-input').focus();
    });

    // Wire up existing URL remove buttons
    document.querySelectorAll('.url-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.url-row').remove());
    });

    // Wire up existing attachment remove buttons (edit mode)
    document.querySelectorAll('.existing-attachment-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.path;
        removedAttachmentPaths.push(path);
        btn.closest('.file-preview-item').remove();
      });
    });

    // File handling
    const fileInput = document.getElementById('activity-files');
    const previewContainer = document.getElementById('new-files-preview');
    const uploadZone = document.getElementById('activity-upload-zone');
    const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // Process files from input or drag-and-drop
    function processFiles(fileList) {
      const existingCount = document.querySelectorAll('#existing-attachments .file-preview-item').length;
      const maxNew = 5 - existingCount - newFiles.length;

      let added = 0;
      for (let i = 0; i < fileList.length && added < maxNew; i++) {
        const file = fileList[i];

        if (!ACCEPTED_TYPES.includes(file.type)) {
          continue;
        }

        if (file.size > MAX_SIZE) {
          utils.showToast(i18n.t('activity.fileSizeError') || 'File too large. Maximum size is 10MB', 'error');
          continue;
        }

        newFiles.push(file);
        added++;

        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.innerHTML = `
          <span class="file-preview-name">${file.name}</span>
          <span class="file-preview-size">${formatFileSize(file.size)}</span>
          <button type="button" class="file-preview-remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        `;

        const removeBtn = item.querySelector('.file-preview-remove');
        const fileRef = file;
        removeBtn.addEventListener('click', () => {
          newFiles = newFiles.filter(f => f !== fileRef);
          item.remove();
        });

        previewContainer.appendChild(item);
      }

      if (fileList.length > maxNew && maxNew >= 0) {
        utils.showToast(i18n.t('activity.maxFilesError') || 'Maximum 5 files allowed', 'error');
      }
    }

    // File input change
    fileInput.addEventListener('change', () => {
      processFiles(fileInput.files);
      fileInput.value = '';
    });

    // Click on upload zone opens file picker
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    });

    // Save button
    document.getElementById('activity-save-btn').addEventListener('click', async () => {
      const name = document.getElementById('activity-name').value.trim();
      const activityDate = document.getElementById('activity-date').value;

      if (!name) {
        const nameInput = document.getElementById('activity-name');
        nameInput.style.borderColor = 'var(--color-error)';
        nameInput.focus();
        utils.showToast(i18n.t('activity.nameRequired') || 'Name is required', 'error');
        return;
      }

      if (!activityDate) {
        return;
      }

      const address = document.getElementById('activity-address').value.trim();
      const description = document.getElementById('activity-description').value.trim();
      const startTime = getTimePickerValue('activity-start-time');
      const endTime = getTimePickerValue('activity-end-time');
      const urls = collectUrls();

      // Validate URLs
      const invalidUrl = urls.find(u => !isValidUrl(u));
      if (invalidUrl) {
        utils.showToast('URL non valido: ' + invalidUrl, 'error');
        return;
      }

      // Convert new files to base64
      const attachmentData = [];
      for (const file of newFiles) {
        const base64 = await fileToBase64(file);
        attachmentData.push({
          name: file.name,
          data: base64,
          type: file.type
        });
      }

      const saveBtn = document.getElementById('activity-save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      try {
        const body = {
          action: isCreate ? 'create' : 'update',
          tripId: window.tripPage.currentTripData.id,
          activity: { name, address, description, date: activityDate, startTime, endTime, urls, location: locationData, category: selectedCategory }
        };

        if (!isCreate) {
          body.activityId = activity.id;
          body.removedAttachments = removedAttachmentPaths;
        }

        if (attachmentData.length > 0) {
          body.attachments = attachmentData;
        }

        const response = await utils.authFetch('/.netlify/functions/manage-activity', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        navigateBack(async () => {
          await window.tripPage.loadTripFromUrl();
          window.tripPage.switchToTab('activities');
          const msgKey = isCreate ? 'activity.createSuccess' : 'activity.updateSuccess';
          const msgDefault = isCreate ? 'Activity created' : 'Activity updated';
          utils.showToast(i18n.t(msgKey) || msgDefault, 'success');
        });

      } catch (error) {
        console.error('Error saving activity:', error);
        const errKey = isCreate ? 'activity.createError' : 'activity.updateError';
        const errDefault = isCreate ? 'Error creating activity' : 'Error updating activity';
        utils.showToast(i18n.t(errKey) || errDefault, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t(isCreate ? 'activity.create' : 'modal.save') || (isCreate ? 'Create' : 'Save');
      }
    });

    // Focus name input on create
    if (isCreate) {
      setTimeout(() => {
        if (nameInput) nameInput.focus();
      }, 300);
    }
  }

  window.tripSlidePanel = {
    show: showActivityPanel
  };
})();
