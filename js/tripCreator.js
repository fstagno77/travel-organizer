/**
 * Trip Creator - Modal for creating new trips from PDF documents or manual input
 */

const tripCreator = {
  files: [],
  state: 'idle', // idle, uploading, parsing, preview, saving, photoSelection, success, error
  pendingTripData: null, // Trip data waiting for photo selection
  pendingDestination: null, // Destination for photo selection
  _parsedResults: null, // SmartParse results for two-step flow
  _uploadedPdfs: null, // Uploaded PDF references for two-step flow
  manualData: null, // Manual trip data: { name, startDate, endDate, cities }
  _citiesDbPromise: null, // Lazy-loaded cities database
  _cityDropdownItems: [], // Current dropdown items for city search
  _cityActiveIndex: -1, // Active dropdown index for keyboard nav
  photoOptions: [], // Available photo options
  currentPage: 1, // Current Unsplash page
  hasMorePhotos: true, // Whether more photos are available
  isLoadingMore: false, // Loading more photos flag
  isChangingPhoto: false, // True when changing photo for existing trip
  phraseController: null, // Controller for rotating loading phrases

  /**
   * Initialize trip creator
   */
  init() {
    this.createModal();
    this.bindEvents();
  },

  /**
   * Create modal HTML and append to body
   */
  createModal() {
    const modalHTML = `
      <div class="modal-overlay" id="trip-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.createTitle">Crea nuovo viaggio</h2>
            <button class="modal-close" id="modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body" id="modal-body">
            <!-- Content will be rendered based on state -->
          </div>
          <div class="modal-footer" id="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="modal-submit" disabled data-i18n="modal.create">Crea Viaggio</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.renderUploadState();
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Open modal
    const newTripBtn = document.getElementById('new-trip-btn');
    if (newTripBtn) {
      newTripBtn.addEventListener('click', () => this.open());
    }

    // Close modal
    const modal = document.getElementById('trip-modal');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        this.close();
      }
    });

    // Submit
    const submitBtn = document.getElementById('modal-submit');
    submitBtn.addEventListener('click', () => this.submit());
  },

  /**
   * Open modal
   */
  open() {
    this.reset();
    const modal = document.getElementById('trip-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
  },

  /**
   * Close modal
   */
  close() {
    const modal = document.getElementById('trip-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // If a trip was created (during photo selection or success state),
    // refresh the page so the new trip appears
    const tripCreatedStates = ['photoSelection', 'success'];
    if (tripCreatedStates.includes(this.state) && this.pendingTripData) {
      if (window.homePage) homePage.invalidateCache();
      window.location.reload();
    }
  },

  /**
   * Reset modal state
   */
  reset() {
    this.stopLoadingPhrases();
    this.files = [];
    this.state = 'idle';
    this.pendingTripData = null;
    this.pendingDestination = null;
    this._parsedResults = null;
    this._uploadedPdfs = null;
    this.manualData = { name: '', startDate: '', endDate: '', cities: [] };
    this._cityDropdownItems = [];
    this._cityActiveIndex = -1;
    this.photoOptions = [];
    this.currentPage = 1;
    this.hasMorePhotos = true;
    this.isLoadingMore = false;
    this.isChangingPhoto = false;
    this.renderUploadState();
    this.updateSubmitButton();
    this.showFooter(true);

    // Reset modal title and subtitle
    const modal = document.getElementById('trip-modal');
    const modalHeader = modal?.querySelector('.modal-header h2');
    if (modalHeader) {
      modalHeader.setAttribute('data-i18n', 'trip.createTitle');
      modalHeader.textContent = i18n.t('trip.createTitle') || 'Crea nuovo viaggio';
    }
  },

  /**
   * Render upload state — manual form + upload zone
   */
  renderUploadState() {
    const body = document.getElementById('modal-body');
    const esc = utils.escapeHtml;
    const t = (k, fb) => i18n.t(k) || fb;

    body.innerHTML = `
      <div class="manual-trip-form">
        <div class="form-group">
          <label class="form-label">${esc(t('trip.manualName', 'Trip name'))}</label>
          <input type="text" class="form-input" id="manual-trip-name"
                 maxlength="100" autocomplete="off"
                 placeholder="${esc(t('trip.manualNamePlaceholder', 'e.g. Japan 2026'))}">
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label class="form-label">${esc(t('trip.manualStartDate', 'Start date'))}</label>
            <input type="date" class="form-input" id="manual-start-date">
          </div>
          <div class="form-group form-group-half">
            <label class="form-label">${esc(t('trip.manualEndDate', 'End date'))}</label>
            <input type="date" class="form-input" id="manual-end-date">
            <div class="date-error" id="date-error">${esc(t('trip.endDateError', 'End date must be after start date'))}</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${esc(t('trip.manualCities', 'Cities (optional)'))}</label>
          <div class="city-input-wrapper">
            <input type="text" class="form-input" id="manual-city-input"
                   maxlength="100" autocomplete="off"
                   placeholder="${esc(t('trip.citySearchPlaceholder', 'Search a city...'))}">
            <div class="city-autocomplete-dropdown" id="manual-city-dropdown"></div>
          </div>
          <div class="cities-list" id="manual-cities-list"></div>
        </div>
      </div>

      <div class="draft-toggle-row" id="draft-toggle-row">
        <label class="draft-toggle-label" for="draft-mode-toggle">
          <span class="draft-toggle-text">${esc(t('draft.toggleLabel', 'Salva come bozza'))}</span>
          <span class="draft-toggle-hint">${esc(t('draft.toggleHint', 'Senza date — potrai completarla in seguito'))}</span>
        </label>
        <div class="toggle-switch">
          <input type="checkbox" id="draft-mode-toggle" class="toggle-input">
          <span class="toggle-slider"></span>
        </div>
      </div>

      <div class="manual-trip-divider">
        <span class="manual-trip-divider-line"></span>
        <span class="manual-trip-divider-text">${esc(t('trip.orUploadPdf', 'or add a booking document'))}</span>
        <span class="manual-trip-divider-line"></span>
      </div>

      <div class="upload-zone upload-zone--compact" id="upload-zone">
        <input type="file" id="file-input" accept=".pdf" hidden>
        <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="upload-zone-text" data-i18n="${i18n.isTouchDevice() ? 'trip.uploadHintMobile' : 'trip.uploadHint'}">Trascina qui i PDF o clicca per selezionare</div>
        <div class="upload-zone-hint">${esc(t('trip.pdfHint', 'Upload a flight or hotel confirmation to get started'))}</div>
      </div>
      <div class="file-list" id="file-list"></div>
    `;

    this.bindManualFormEvents();
    this.bindUploadEvents();
    i18n.apply(body);
  },

  /**
   * Get cities database (lazy-loaded)
   */
  getCitiesDatabase() {
    if (!this._citiesDbPromise) {
      this._citiesDbPromise = fetch('/data/cities.json')
        .then(r => r.json())
        .catch(() => []);
    }
    return this._citiesDbPromise;
  },

  /**
   * Bind manual form events (name, dates, city search)
   */
  bindManualFormEvents() {
    const nameInput = document.getElementById('manual-trip-name');
    const startInput = document.getElementById('manual-start-date');
    const endInput = document.getElementById('manual-end-date');
    const cityInput = document.getElementById('manual-city-input');
    const dropdown = document.getElementById('manual-city-dropdown');
    const dateError = document.getElementById('date-error');

    // Sync form → manualData
    const syncAndUpdate = () => {
      this.manualData.name = nameInput.value;
      this.manualData.startDate = startInput.value;
      this.manualData.endDate = endInput.value;

      // Date validation
      if (this.manualData.startDate && this.manualData.endDate && this.manualData.endDate < this.manualData.startDate) {
        dateError.classList.add('visible');
      } else {
        dateError.classList.remove('visible');
      }

      this.updateSubmitButton();
    };

    nameInput.addEventListener('input', syncAndUpdate);
    startInput.addEventListener('change', syncAndUpdate);
    endInput.addEventListener('change', syncAndUpdate);

    // City search
    let searchTimeout = null;
    cityInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this._searchCities(cityInput.value), 150);
    });

    cityInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.city-autocomplete-item');
      if (!items.length) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const name = cityInput.value.trim();
          if (name) this._addCity({ name });
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._cityActiveIndex = Math.min(this._cityActiveIndex + 1, items.length - 1);
        this._highlightCityItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._cityActiveIndex = Math.max(this._cityActiveIndex - 1, 0);
        this._highlightCityItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this._cityActiveIndex >= 0) {
          items[this._cityActiveIndex].click();
        } else {
          const name = cityInput.value.trim();
          if (name) this._addCity({ name });
        }
      } else if (e.key === 'Escape') {
        this._hideCityDropdown();
      }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.city-input-wrapper')) {
        this._hideCityDropdown();
      }
    }, { once: false });

    // Pre-load cities database
    this.getCitiesDatabase();

    // Toggle "Salva come bozza"
    const draftToggle = document.getElementById('draft-mode-toggle');
    if (draftToggle) {
      draftToggle.addEventListener('change', () => this._applyDraftToggle());
    }
  },

  /**
   * Applica la logica del toggle "Salva come bozza":
   * - ON  → nasconde date/città/upload, rimuove required dalle date, bottone = "Crea bozza"
   * - OFF → mostra tutto, ripristina required, bottone = "Crea Viaggio"
   */
  _applyDraftToggle() {
    const toggle = document.getElementById('draft-mode-toggle');
    const isDraft = toggle?.checked || false;
    const t = (k, fb) => i18n.t(k) || fb;

    // Wrapper date (la form-row che contiene start e end)
    const datesRow = document.getElementById('manual-start-date')?.closest('.form-row');
    // Wrapper città
    const cityGroup = document.getElementById('manual-city-input')?.closest('.form-group');
    // Upload zone + divider
    const uploadZone = document.getElementById('upload-zone');
    const fileList = document.getElementById('file-list');
    const divider = document.querySelector('.manual-trip-divider');

    if (isDraft) {
      if (datesRow) datesRow.style.display = 'none';
      if (cityGroup) cityGroup.style.display = 'none';
      if (uploadZone) uploadZone.style.display = 'none';
      if (fileList) fileList.style.display = 'none';
      if (divider) divider.style.display = 'none';
      // Rimuovi required dai campi data (nessun attributo required nativo,
      // ma aggiorniamo la validazione in updateSubmitButton tramite flag)
      const startInput = document.getElementById('manual-start-date');
      const endInput = document.getElementById('manual-end-date');
      if (startInput) startInput.removeAttribute('required');
      if (endInput) endInput.removeAttribute('required');
    } else {
      if (datesRow) datesRow.style.display = '';
      if (cityGroup) cityGroup.style.display = '';
      if (uploadZone) uploadZone.style.display = '';
      if (fileList) fileList.style.display = '';
      if (divider) divider.style.display = '';
    }

    // Aggiorna testo bottone submit
    const submitBtn = document.getElementById('modal-submit');
    if (submitBtn) {
      submitBtn.textContent = isDraft
        ? t('draft.createBtn', 'Crea bozza')
        : t('modal.create', 'Crea Viaggio');
    }

    this.updateSubmitButton();
  },

  /**
   * Search cities and show dropdown
   */
  async _searchCities(query) {
    const dropdown = document.getElementById('manual-city-dropdown');
    if (!dropdown) return;

    if (query.length < 2) {
      this._hideCityDropdown();
      return;
    }

    const q = query.toLowerCase();
    const citiesDb = await this.getCitiesDatabase();
    if (!citiesDb.length) { this._hideCityDropdown(); return; }

    const results = [];

    // Prioritize startsWith matches
    for (const c of citiesDb) {
      if (c.n.toLowerCase().startsWith(q)) {
        results.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
        if (results.length >= 8) break;
      }
    }

    // Then contains matches
    if (results.length < 8) {
      for (const c of citiesDb) {
        if (!c.n.toLowerCase().startsWith(q) && c.n.toLowerCase().includes(q)) {
          results.push({ name: c.n, country: c.c, lat: c.lat, lng: c.lng });
          if (results.length >= 8) break;
        }
      }
    }

    if (results.length === 0) {
      this._hideCityDropdown();
      return;
    }

    this._cityDropdownItems = results;
    this._cityActiveIndex = -1;

    dropdown.innerHTML = results.map((item, i) => `
      <div class="city-autocomplete-item" data-index="${i}">
        <span class="city-autocomplete-name">${utils.escapeHtml(item.name)}</span>
        <span class="city-autocomplete-country">${utils.escapeHtml(item.country || '')}</span>
      </div>
    `).join('');
    dropdown.classList.add('active');

    dropdown.querySelectorAll('.city-autocomplete-item').forEach((el, i) => {
      el.addEventListener('click', () => this._addCity(results[i]));
      el.addEventListener('mouseenter', () => {
        this._cityActiveIndex = i;
        this._highlightCityItem(dropdown.querySelectorAll('.city-autocomplete-item'));
      });
    });
  },

  _highlightCityItem(items) {
    items.forEach((el, i) => {
      el.classList.toggle('active', i === this._cityActiveIndex);
    });
  },

  _hideCityDropdown() {
    const dropdown = document.getElementById('manual-city-dropdown');
    if (dropdown) {
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
    }
    this._cityActiveIndex = -1;
  },

  /**
   * Add a city to the manual form
   */
  _addCity(cityObj) {
    const duplicate = this.manualData.cities.some(c => c.name.toLowerCase() === cityObj.name.toLowerCase());
    if (duplicate) {
      utils.showToast(i18n.t('trip.cityAlreadyAdded') || 'City already added', 'error');
      return;
    }
    this.manualData.cities.push(cityObj);
    const cityInput = document.getElementById('manual-city-input');
    if (cityInput) { cityInput.value = ''; cityInput.focus(); }
    this._hideCityDropdown();
    this._renderManualCities();
  },

  /**
   * Render manual cities list
   */
  _renderManualCities() {
    const list = document.getElementById('manual-cities-list');
    if (!list) return;

    if (this.manualData.cities.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = this.manualData.cities.map(c => `
      <div class="city-item">
        <div class="city-item-info">
          <span class="city-name">${utils.escapeHtml(c.name)}</span>
          ${c.country ? `<span class="city-country">${utils.escapeHtml(c.country)}</span>` : ''}
        </div>
        <button class="city-remove-btn" data-city="${utils.escapeHtml(c.name.toLowerCase())}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');

    list.querySelectorAll('.city-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cityName = btn.dataset.city;
        const idx = this.manualData.cities.findIndex(c => c.name.toLowerCase() === cityName);
        if (idx !== -1) {
          this.manualData.cities.splice(idx, 1);
          this._renderManualCities();
        }
      });
    });
  },

  /**
   * Bind upload zone events
   */
  bindUploadEvents() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');

    // Click to upload
    zone.addEventListener('click', () => input.click());

    // File input change
    input.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
      input.value = '';
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      this.addFiles(e.dataTransfer.files);
    });
  },

  /**
   * Add files to the list
   * @param {FileList} fileList
   */
  maxFiles: 1,

  addFiles(fileList) {
    const pdfFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');

    if (pdfFiles.length > 1 || (pdfFiles.length === 1 && this.files.length > 0)) {
      utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
      return;
    }

    if (pdfFiles.length === 0) return;

    this.files.push(...pdfFiles);
    this.renderFileList();
    this.updateSubmitButton();
  },

  /**
   * Remove file from list
   * @param {number} index
   */
  removeFile(index) {
    this.files.splice(index, 1);
    this.renderFileList();
    this.updateSubmitButton();
  },

  /**
   * Render file list
   */
  renderFileList() {
    const list = document.getElementById('file-list');
    if (!list) return;

    if (this.files.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = this.files.map((file, index) => `
      <div class="file-item">
        <div class="file-item-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="file-item-info">
          <div class="file-item-name">${utils.escapeHtml(file.name)}</div>
          <div class="file-item-size">${this.formatFileSize(file.size)}</div>
        </div>
        <button class="file-item-remove" data-index="${index}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');

    // Bind remove buttons
    list.querySelectorAll('.file-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.removeFile(index);
      });
    });
  },

  /**
   * Format file size
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  /**
   * Update submit button state
   */
  updateSubmitButton() {
    const btn = document.getElementById('modal-submit');
    const hasFiles = this.files.length > 0;
    const m = this.manualData;
    const isDraft = document.getElementById('draft-mode-toggle')?.checked || false;

    let enabled;
    if (isDraft) {
      // In modalità bozza basta il nome (o anche vuoto — verrà usato default)
      enabled = true;
    } else {
      const hasManual = m && m.name.trim().length > 0 && m.startDate && m.endDate && m.endDate >= m.startDate;
      enabled = hasFiles || hasManual;
    }
    btn.disabled = !enabled;
  },

  /**
   * Show/hide footer
   * @param {boolean} show
   */
  showFooter(show) {
    const footer = document.getElementById('modal-footer');
    footer.style.display = show ? 'flex' : 'none';
  },

  /**
   * Step 1: Upload PDFs and parse with SmartParse (no save yet), or create manual trip
   */
  async submit() {
    // Se il toggle bozza è attivo, delega direttamente a submitDraft
    const isDraft = document.getElementById('draft-mode-toggle')?.checked || false;
    if (isDraft) return this.submitDraft();

    const hasFiles = this.files.length > 0;
    const m = this.manualData;
    const hasManual = m && m.name.trim().length > 0 && m.startDate && m.endDate;

    if (!hasFiles && !hasManual) return;

    // Manual-only path (no PDF)
    if (!hasFiles && hasManual) {
      return this.submitManual();
    }

    this.state = 'parsing';
    this.renderProcessingState();
    this.showFooter(false);

    try {
      // Upload files directly to Storage
      const pdfs = await pdfUpload.uploadFiles(this.files);
      this._uploadedPdfs = pdfs;

      // Call parse-pdf (SmartParse) — no save
      const response = await utils.authFetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        body: JSON.stringify({ pdfs })
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`${i18n.t('trip.addError') || 'Error processing file'} [HTTP${response.status}]`);
      }

      if (response.status === 429 || result.errorType === 'rate_limit') {
        throw new Error(i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.');
      }

      if (!response.ok || !result.success) {
        const code = result.errorCode ? ` [${result.errorCode}]` : '';
        throw new Error((result.error || 'Failed to process PDFs') + code);
      }

      this.stopLoadingPhrases();
      this._parsedResults = result.parsedResults;
      this.state = 'preview';
      this.renderPreviewState();

    } catch (error) {
      console.error('Error parsing PDFs:', error);
      this.stopLoadingPhrases();
      this.state = 'error';
      this.renderErrorState(error.message);
    }
  },

  /**
   * Manual trip creation — no PDF, just name + dates + optional cities
   */
  async submitManual() {
    this.state = 'saving';
    this.renderProcessingState();
    this.showFooter(false);

    try {
      const response = await utils.authFetch('/.netlify/functions/create-trip', {
        method: 'POST',
        body: JSON.stringify({
          name: this.manualData.name.trim(),
          startDate: this.manualData.startDate,
          endDate: this.manualData.endDate,
          cities: this.manualData.cities
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create trip');
      }

      this.stopLoadingPhrases();
      const tripData = result.tripData;
      const destination = this.manualData.cities[0]?.name || '';

      if (destination) {
        this.state = 'photoSelection';
        this.pendingTripData = tripData;
        this.pendingDestination = destination;
        this.renderPhotoSelectionState(destination);
      } else {
        this.state = 'success';
        this.pendingTripData = tripData;
        this.renderSuccessState(`trip.html?id=${tripData.id}`);
      }
    } catch (error) {
      console.error('Error creating manual trip:', error);
      this.stopLoadingPhrases();
      this.state = 'error';
      this.renderErrorState(error.message);
    }
  },

  /**
   * Apri modale in modalità diretta per creazione bozza (legacy — mantenuto per retrocompatibilità)
   * Usa openAsDraft per il nuovo comportamento con toggle.
   */
  openDraft() {
    this.openAsDraft();
  },

  /**
   * Apri il modal con il toggle "Salva come bozza" già attivo.
   * Chiamato da draftsPage.js e da openDraft().
   */
  openAsDraft() {
    this.reset();
    const modal = document.getElementById('trip-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply(modal);
    // Attiva il toggle subito dopo il render
    setTimeout(() => {
      const toggle = document.getElementById('draft-mode-toggle');
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        this._applyDraftToggle();
      }
    }, 0);
  },

  /**
   * Crea un viaggio bozza (status='draft') senza date né destinazione obbligatorie.
   * Dopo la creazione, redirect a trip.html?id=<newId>.
   */
  async submitDraft() {
    this.state = 'saving';
    this.renderProcessingState();
    this.showFooter(false);

    const t = (k, fb) => i18n.t(k) || fb;
    const nameInput = document.getElementById('manual-trip-name');
    const titleValue = nameInput?.value?.trim() || '';

    try {
      const response = await utils.authFetch('/.netlify/functions/create-trip', {
        method: 'POST',
        body: JSON.stringify({
          name: titleValue || (i18n.getLang() === 'it' ? 'Nuovo viaggio' : 'New trip'),
          status: 'draft',
          cities: [],
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create draft');
      }

      this.stopLoadingPhrases();
      const tripData = result.tripData;

      // Chiudi modale e redirect alla pagina del viaggio bozza
      const modal = document.getElementById('trip-modal');
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';

      window.location.href = `trip.html?id=${tripData.id}`;
    } catch (error) {
      console.error('[tripCreator] submitDraft error:', error);
      this.stopLoadingPhrases();
      this.state = 'error';
      this.renderErrorState(error.message);
    }
  },

  /**
   * Render SmartParse extraction preview
   */
  renderPreviewState() {
    const body = document.getElementById('modal-body');

    // Update modal title
    const modal = document.getElementById('trip-modal');
    const modalHeader = modal?.querySelector('.modal-header h2');
    if (modalHeader) {
      const hasFlights = this._parsedResults.some(pr => pr.result?.flights?.length);
      const hasHotels = this._parsedResults.some(pr => pr.result?.hotels?.length);
      let title = 'Nuovo Viaggio';
      if (hasFlights && hasHotels) title = 'Nuovo Viaggio';
      else if (hasFlights) title = 'Voli';
      else if (hasHotels) title = 'Hotel';
      modalHeader.textContent = title;
    }

    parsePreview.render(body, this._parsedResults, {
      onConfirm: (feedback, updatedResults, editedFields) => {
        if (updatedResults) this._parsedResults = updatedResults;
        this.confirmSave(feedback, editedFields);
      },
      onCancel: () => this.reset()
    });
  },

  /**
   * Step 2: Confirm and save — sends parsedData to process-pdf
   */
  async confirmSave(feedback, editedFields) {
    this.state = 'saving';
    this.renderProcessingState();

    try {
      // Build manual overrides if user entered data
      const reqBody = {
        pdfs: this._uploadedPdfs,
        parsedData: this._parsedResults,
        feedback
      };
      if (editedFields?.length) reqBody.editedFields = editedFields;
      const m = this.manualData;
      if (m) {
        const mo = {};
        if (m.name.trim()) mo.name = m.name.trim();
        if (m.startDate) mo.startDate = m.startDate;
        if (m.endDate) mo.endDate = m.endDate;
        if (m.cities.length > 0) mo.cities = m.cities;
        if (Object.keys(mo).length > 0) reqBody.manualOverrides = mo;
      }

      const response = await utils.authFetch('/.netlify/functions/process-pdf', {
        method: 'POST',
        body: JSON.stringify(reqBody)
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`${i18n.t('trip.addError') || 'Error processing file'} [HTTP${response.status}]`);
      }

      if (response.status === 429 || result.errorType === 'rate_limit') {
        throw new Error(i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.');
      }

      if (!response.ok || !result.success) {
        const code = result.errorCode ? ` [${result.errorCode}]` : '';
        throw new Error((result.error || 'Failed to save trip') + code);
      }

      const tripData = result.tripData;
      this.stopLoadingPhrases();

      if (result.needsPhotoSelection && result.destination) {
        this.state = 'photoSelection';
        this.pendingTripData = tripData;
        this.pendingDestination = result.destination;
        this.renderPhotoSelectionState(result.destination);
      } else {
        this.state = 'success';
        this.renderSuccessState(`trip.html?id=${tripData.id}`);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      this.stopLoadingPhrases();
      this.state = 'error';
      this.renderErrorState(error.message);
    }
  },

  /**
   * Render processing state
   */
  renderProcessingState() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="processing-state">
        <span class="spinner"></span>
        <p class="processing-phrase loading-phrase"></p>
      </div>
    `;

    // Start rotating phrases
    const phraseElement = body.querySelector('.processing-phrase');
    this.phraseController = utils.startLoadingPhrases(phraseElement, 3000);
  },

  /**
   * Stop loading phrases
   */
  stopLoadingPhrases() {
    if (this.phraseController) {
      this.phraseController.stop();
      this.phraseController = null;
    }
  },

  /**
   * Render success state
   * @param {string} tripUrl
   */
  renderSuccessState(tripUrl) {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="result-state">
        <div class="result-state-icon success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="result-state-title" data-i18n="trip.success">Viaggio creato con successo!</div>
        <a href="${tripUrl}" class="btn btn-primary" data-i18n="trip.viewTrip">Vai al viaggio</a>
      </div>
    `;
    i18n.apply(body);
  },

  /**
   * Render error state
   * @param {string} message
   */
  renderErrorState(message) {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="result-state">
        <div class="result-state-icon error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="result-state-title" data-i18n="trip.error">Errore durante l'elaborazione</div>
        <div class="result-state-text">${utils.escapeHtml(message)}</div>
        <button class="btn btn-secondary" id="retry-btn" data-i18n="modal.retry">Riprova</button>
      </div>
    `;

    document.getElementById('retry-btn').addEventListener('click', () => {
      this.reset();
    });

    i18n.apply(body);
  },

  /**
   * Render photo selection state
   * @param {string} destination
   */
  async renderPhotoSelectionState(destination) {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="photo-selection-state">
        <h3 class="photo-selection-title">
          <span data-i18n="trip.selectPhoto">Scegli una foto per</span>
          <span class="photo-selection-destination">${utils.escapeHtml(destination)}</span>
        </h3>
        <div class="photo-selection-loading" id="photo-loading">
          <span class="spinner"></span>
          <span data-i18n="trip.loadingPhotos">Caricamento foto...</span>
        </div>
        <div class="photo-selection-grid" id="photo-grid"></div>
        <div class="photo-selection-actions" id="photo-actions" style="display: none;">
          <input type="file" id="custom-photo-input" accept="image/jpeg,image/png,image/webp" hidden>
          <button class="btn btn-secondary btn-sm" id="upload-custom-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span data-i18n="trip.uploadCustomPhoto">Carica foto</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="load-more-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span data-i18n="trip.loadMorePhotos">Altre foto</span>
          </button>
        </div>
        <div class="photo-selection-skip">
          <button class="btn btn-text" id="skip-photo-btn" data-i18n="trip.skipPhoto">Salta</button>
        </div>
      </div>
    `;
    i18n.apply(body);

    // Bind skip button
    document.getElementById('skip-photo-btn').addEventListener('click', () => {
      this.skipPhotoSelection();
    });

    // Fetch photos
    await this.loadPhotos(destination, 1);
  },

  /**
   * Load photos from API
   * @param {string} destination
   * @param {number} page
   */
  async loadPhotos(destination, page) {
    try {
      const response = await utils.authFetch('/.netlify/functions/get-city-photos', {
        method: 'POST',
        body: JSON.stringify({
          city: destination,
          page,
          currentTripId: this.pendingTripData?.id
        })
      });

      const result = await response.json();

      // Hide initial loading
      const loading = document.getElementById('photo-loading');
      if (loading) loading.style.display = 'none';

      // Show actions
      const actions = document.getElementById('photo-actions');
      if (actions) actions.style.display = 'flex';

      if (result.success && result.options && result.options.length > 0) {
        // Add new photos to options
        if (page === 1) {
          this.photoOptions = result.options;
        } else {
          this.photoOptions.push(...result.options);
        }

        this.currentPage = page;
        this.hasMorePhotos = result.hasMore;

        this.renderPhotoGrid();
        this.bindPhotoActions();
      } else if (page === 1) {
        // No photos found on first page
        this.renderNoPhotosState();
        this.bindPhotoActions();
      }

      this.isLoadingMore = false;
      this.updateLoadMoreButton();

    } catch (error) {
      console.error('Error fetching photos:', error);
      // Hide loading, show actions so user can still upload custom photo
      const loading = document.getElementById('photo-loading');
      if (loading) loading.style.display = 'none';
      const actions = document.getElementById('photo-actions');
      if (actions) actions.style.display = 'flex';

      if (this.currentPage === 1) {
        this.renderNoPhotosState();
        this.bindPhotoActions();
      }
      this.isLoadingMore = false;
    }
  },

  /**
   * Render photo grid
   */
  renderPhotoGrid() {
    const grid = document.getElementById('photo-grid');
    if (!grid) return;

    grid.innerHTML = this.photoOptions.map((photo, index) => `
      <button class="photo-option ${photo.isLastUsed ? 'photo-option--last-used' : ''}"
              data-photo-id="${photo.id}"
              data-index="${index}"
              data-is-last-used="${photo.isLastUsed || false}">
        <img src="${photo.previewUrl}" alt="Option ${index + 1}" loading="lazy">
        ${photo.isLastUsed ? `<span class="photo-option-badge" data-i18n="trip.lastUsedPhoto">Ultima usata</span>` : ''}
        ${photo.attribution ? `<div class="photo-option-attribution">${utils.escapeHtml(photo.attribution.photographerName || '')}</div>` : ''}
      </button>
    `).join('');

    // Bind click events
    grid.querySelectorAll('.photo-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const photoId = btn.dataset.photoId;
        const index = parseInt(btn.dataset.index);
        const isLastUsed = btn.dataset.isLastUsed === 'true';
        this.selectPhoto(photoId, index, isLastUsed);
      });
    });

    i18n.apply(grid);
  },

  /**
   * Bind photo action buttons
   */
  bindPhotoActions() {
    // Upload custom photo
    const uploadBtn = document.getElementById('upload-custom-btn');
    const uploadInput = document.getElementById('custom-photo-input');

    if (uploadBtn && uploadInput) {
      uploadBtn.onclick = () => uploadInput.click();
      uploadInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          this.uploadCustomPhoto(e.target.files[0]);
        }
      };
    }

    // Load more photos
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => this.loadMorePhotos();
    }
  },

  /**
   * Load more photos from Unsplash
   */
  async loadMorePhotos() {
    if (this.isLoadingMore || !this.hasMorePhotos) return;

    this.isLoadingMore = true;
    this.updateLoadMoreButton();

    await this.loadPhotos(this.pendingDestination, this.currentPage + 1);
  },

  /**
   * Update load more button state
   */
  updateLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;

    if (this.isLoadingMore) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner spinner-sm"></span>`;
    } else if (!this.hasMorePhotos) {
      btn.style.display = 'none';
    } else {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span data-i18n="trip.loadMorePhotos">Altre foto</span>
      `;
      i18n.apply(btn);
    }
  },

  /**
   * Upload custom photo
   * @param {File} file
   */
  async uploadCustomPhoto(file) {
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(i18n.t('trip.photoTooLarge') || 'File too large. Maximum size is 2MB');
      return;
    }

    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="processing-state">
        <span class="spinner"></span>
        <div class="processing-state-text" data-i18n="trip.uploadingPhoto">Caricamento foto...</div>
      </div>
    `;
    i18n.apply(body);

    try {
      // Convert to base64
      const reader = new FileReader();
      const imageData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to server
      const response = await utils.authFetch('/.netlify/functions/upload-trip-photo', {
        method: 'POST',
        body: JSON.stringify({
          tripId: this.pendingTripData.id,
          imageData,
          fileName: file.name,
          destination: this.pendingTripData.destination
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update trip with custom photo
      await this.updateTripWithPhoto(result.photo);

    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(i18n.t('trip.uploadError') || 'Error uploading photo');
      // Go back to photo selection
      this.renderPhotoSelectionState(this.pendingDestination);
    }
  },

  /**
   * Render no photos state
   */
  renderNoPhotosState() {
    const grid = document.getElementById('photo-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="photo-selection-empty">
        <p data-i18n="trip.noPhotosFound">Nessuna foto trovata per questa destinazione</p>
      </div>
    `;
    i18n.apply(grid);
  },

  /**
   * Select a photo
   * @param {string} photoId
   * @param {number} index
   * @param {boolean} isLastUsed
   */
  async selectPhoto(photoId, index, isLastUsed) {
    const photo = this.photoOptions[index];
    if (!photo) return;

    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="processing-state">
        <span class="spinner"></span>
        <div class="processing-state-text" data-i18n="trip.savingPhoto">Salvataggio foto...</div>
      </div>
    `;
    i18n.apply(body);

    try {
      if (isLastUsed) {
        // Copy the last used photo to this trip's storage
        const copyResponse = await utils.authFetch('/.netlify/functions/copy-trip-photo', {
          method: 'POST',
          body: JSON.stringify({
            tripId: this.pendingTripData.id,
            sourceUrl: photo.fullUrl || photo.previewUrl,
            attribution: photo.attribution,
            isCustom: photo.isCustom || false,
            destination: this.pendingTripData.destination
          })
        });

        const copyResult = await copyResponse.json();

        if (!copyResult.success) {
          throw new Error('Failed to copy photo');
        }

        await this.updateTripWithPhoto(copyResult.photo);
      } else {
        // Download from Unsplash and save to trip storage
        const saveResponse = await utils.authFetch('/.netlify/functions/save-city-photo', {
          method: 'POST',
          body: JSON.stringify({
            tripId: this.pendingTripData.id,
            unsplashPhotoId: photoId,
            destination: this.pendingTripData.destination
          })
        });

        const saveResult = await saveResponse.json();

        if (!saveResult.success) {
          throw new Error('Failed to save photo');
        }

        await this.updateTripWithPhoto(saveResult.photo);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      this.showSuccess();
    }
  },

  /**
   * Update trip with cover photo
   * @param {Object} photo
   */
  async updateTripWithPhoto(photo) {
    try {
      const response = await utils.authFetch('/.netlify/functions/update-trip-photo', {
        method: 'POST',
        body: JSON.stringify({
          tripId: this.pendingTripData.id,
          coverPhoto: {
            url: photo.url,
            attribution: photo.attribution || null,
            isCustom: photo.isCustom || false
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        this.pendingTripData = result.tripData;
      }
    } catch (error) {
      console.error('Error updating trip photo:', error);
    }

    this.showSuccess();
  },

  /**
   * Skip photo selection
   */
  skipPhotoSelection() {
    if (this.isChangingPhoto) {
      // Just close modal when skipping during photo change
      this.close();
      this.reset();
    } else {
      this.showSuccess();
    }
  },

  /**
   * Show success state
   */
  showSuccess() {
    if (this.isChangingPhoto) {
      // Close modal and refresh page when changing photo
      if (window.homePage) homePage.invalidateCache();
      this.close();
      this.reset();
      window.location.reload();
    } else {
      this.state = 'success';
      const tripUrl = `trip.html?id=${this.pendingTripData.id}`;
      this.renderSuccessState(tripUrl);
    }
  },

  /**
   * Open photo selection for existing trip (for "Change photo" feature)
   * @param {string} tripId
   * @param {string} destination
   * @param {Object} tripData
   */
  openPhotoSelection(tripId, destination, tripData) {
    this.state = 'photoSelection';
    this.pendingTripData = tripData;
    this.pendingDestination = destination;
    this.photoOptions = [];
    this.currentPage = 1;
    this.hasMorePhotos = true;
    this.isChangingPhoto = true;

    const modal = document.getElementById('trip-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update modal title
    const modalHeader = modal.querySelector('.modal-header h2');
    if (modalHeader) {
      modalHeader.setAttribute('data-i18n', 'trip.changePhotoTitle');
      modalHeader.textContent = i18n.t('trip.changePhotoTitle') || 'Cambia foto';
    }

    this.showFooter(false);
    this.renderPhotoSelectionState(destination);
  }
};

// Make available globally
window.tripCreator = tripCreator;
