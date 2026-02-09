/**
 * Trip Slide Panel - Custom activity create/view/edit panel
 */
(function() {
  'use strict';

  const esc = (text) => utils.escapeHtml(text);

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
    if (activity.startTime) timeRange.push(activity.startTime);
    if (activity.endTime) timeRange.push(activity.endTime);

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

    return `
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.name">${i18n.t('activity.name') || 'Name'}</div>
        <div class="activity-view-value">${esc(activity.name)}</div>
      </div>
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.date">${i18n.t('activity.date') || 'Date'}</div>
        <div class="activity-view-value">${dateStr}</div>
      </div>
      ${timeRange.length > 0 ? `
        <div class="activity-view-field">
          <div class="activity-view-label">${i18n.t('activity.startTime') || 'Time'}</div>
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
   * Build a time select (hour:minute) with 15-min steps
   * @param {string} id - Element ID
   * @param {string} value - Current value "HH:MM" or ""
   * @returns {string} HTML
   */
  function buildTimeSelect(id, value) {
    const [selH, selM] = value ? value.split(':') : ['', ''];
    let hourOpts = '<option value="">--</option>';
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      hourOpts += `<option value="${hh}"${hh === selH ? ' selected' : ''}>${hh}</option>`;
    }
    let minOpts = '<option value="">--</option>';
    for (const m of ['00', '15', '30', '45']) {
      minOpts += `<option value="${m}"${m === selM ? ' selected' : ''}>${m}</option>`;
    }
    return `<div class="time-select-row" data-time-id="${id}">
      <select class="form-input time-select-hour" id="${id}-h">${hourOpts}</select>
      <span class="time-select-sep">:</span>
      <select class="form-input time-select-min" id="${id}-m">${minOpts}</select>
    </div>`;
  }

  /**
   * Get value from a time select pair
   * @param {string} id - Base ID
   * @returns {string|null} "HH:MM" or null
   */
  function getTimeSelectValue(id) {
    const h = document.getElementById(id + '-h')?.value;
    const m = document.getElementById(id + '-m')?.value;
    if (h && m) return h + ':' + m;
    return null;
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

    return `
      <div class="form-group">
        <label data-i18n="activity.name">${i18n.t('activity.name') || 'Name'}</label>
        <input type="text" class="form-input" id="activity-name" maxlength="100" required value="${esc(act.name || '')}" placeholder="${i18n.t('activity.namePlaceholder') || 'e.g. Museum visit, Restaurant...'}">
      </div>
      <div class="form-group">
        <label data-i18n="activity.date">${i18n.t('activity.date') || 'Date'}</label>
        <input type="date" class="form-input" id="activity-date" required value="${date || act.date || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label data-i18n="activity.startTime">${i18n.t('activity.startTime') || 'Start time'}</label>
          ${buildTimeSelect('activity-start-time', act.startTime || '')}
        </div>
        <div class="form-group">
          <label data-i18n="activity.endTime">${i18n.t('activity.endTime') || 'End time'}</label>
          ${buildTimeSelect('activity-end-time', act.endTime || '')}
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

  /**
   * Show the activity slide-in panel
   * @param {'create'|'view'|'edit'} mode
   * @param {string|null} date - YYYY-MM-DD for create mode
   * @param {Object|null} activity - Existing activity for view/edit
   */
  function showActivityPanel(mode, date, activity) {
    // Remove existing panel
    const existing = document.getElementById('activity-panel');
    if (existing) existing.remove();

    const isView = mode === 'view';
    const isCreate = mode === 'create';

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

    const panelHTML = `
      <div class="slide-panel-overlay" id="activity-panel">
        <div class="slide-panel">
          <div class="slide-panel-header">
            <h2 data-i18n="${titleKey}">${i18n.t(titleKey) || titleDefault}</h2>
            <button class="modal-close" id="activity-panel-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);
    const panel = document.getElementById('activity-panel');
    i18n.apply(panel);
    panel.offsetHeight; // force reflow
    panel.classList.add('active');

    // Close handlers
    const closePanel = () => {
      panel.classList.remove('active');
      setTimeout(() => panel.remove(), 250);
    };

    document.getElementById('activity-panel-close').addEventListener('click', closePanel);
    panel.addEventListener('click', (e) => {
      if (e.target === panel) closePanel();
    });

    // Mode-specific handlers
    if (isView) {
      initViewModeHandlers(activity, closePanel);
    } else {
      initFormModeHandlers(mode, date, activity, closePanel);
    }
  }

  /**
   * Initialize view mode handlers (edit, delete, attachment downloads)
   */
  function initViewModeHandlers(activity, closePanel) {
    // Edit button
    document.getElementById('activity-edit-btn').addEventListener('click', () => {
      closePanel();
      setTimeout(() => showActivityPanel('edit', null, activity), 300);
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

        closePanel();
        setTimeout(async () => {
          await window.tripPage.loadTripFromUrl();
          window.tripPage.switchToTab('activities');
          utils.showToast(i18n.t('activity.deleteSuccess') || 'Activity deleted', 'success');
        }, 300);
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
  function initFormModeHandlers(mode, date, activity, closePanel) {
    const isCreate = mode === 'create';
    let newFiles = []; // Track newly selected files
    let removedAttachmentPaths = []; // Track removed existing attachments

    // Cancel button
    document.getElementById('activity-cancel-btn').addEventListener('click', closePanel);

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

      const description = document.getElementById('activity-description').value.trim();
      const startTime = getTimeSelectValue('activity-start-time');
      const endTime = getTimeSelectValue('activity-end-time');
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
          activity: { name, description, date: activityDate, startTime, endTime, urls }
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

        closePanel();
        setTimeout(async () => {
          await window.tripPage.loadTripFromUrl();
          window.tripPage.switchToTab('activities');
          const msgKey = isCreate ? 'activity.createSuccess' : 'activity.updateSuccess';
          const msgDefault = isCreate ? 'Activity created' : 'Activity updated';
          utils.showToast(i18n.t(msgKey) || msgDefault, 'success');
        }, 300);

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
        const nameInput = document.getElementById('activity-name');
        if (nameInput) nameInput.focus();
      }, 300);
    }
  }

  window.tripSlidePanel = {
    show: showActivityPanel
  };
})();
