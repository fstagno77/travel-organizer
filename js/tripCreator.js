/**
 * Trip Creator - Modal for creating new trips from PDF documents
 */

const tripCreator = {
  files: [],
  state: 'idle', // idle, uploading, processing, photoSelection, success, error
  pendingTripData: null, // Trip data waiting for photo selection
  pendingDestination: null, // Destination for photo selection
  photoOptions: [], // Available photo options
  currentPage: 1, // Current Unsplash page
  hasMorePhotos: true, // Whether more photos are available
  isLoadingMore: false, // Loading more photos flag
  isChangingPhoto: false, // True when changing photo for existing trip

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
    i18n.apply();
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
      window.location.reload();
    }
  },

  /**
   * Reset modal state
   */
  reset() {
    this.files = [];
    this.state = 'idle';
    this.pendingTripData = null;
    this.pendingDestination = null;
    this.photoOptions = [];
    this.currentPage = 1;
    this.hasMorePhotos = true;
    this.isLoadingMore = false;
    this.isChangingPhoto = false;
    this.renderUploadState();
    this.updateSubmitButton();
    this.showFooter(true);

    // Reset modal title
    const modal = document.getElementById('trip-modal');
    const modalHeader = modal?.querySelector('.modal-header h2');
    if (modalHeader) {
      modalHeader.setAttribute('data-i18n', 'trip.createTitle');
      modalHeader.textContent = i18n.t('trip.createTitle') || 'Crea nuovo viaggio';
    }
  },

  /**
   * Render upload state (drag & drop zone)
   */
  renderUploadState() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="upload-zone" id="upload-zone">
        <input type="file" id="file-input" accept=".pdf" multiple hidden>
        <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="upload-zone-text" data-i18n="trip.uploadHint">Trascina qui i PDF o clicca per selezionare</div>
        <div class="upload-zone-hint">PDF</div>
      </div>
      <div class="file-list" id="file-list"></div>
    `;

    this.bindUploadEvents();
    i18n.apply();
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
  addFiles(fileList) {
    const pdfFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
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
          <div class="file-item-name">${file.name}</div>
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
    btn.disabled = this.files.length === 0;
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
   * Convert file to base64
   * @param {File} file
   * @returns {Promise<string>}
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:application/pdf;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  },

  /**
   * Submit files for processing
   */
  async submit() {
    if (this.files.length === 0) return;

    this.state = 'processing';
    this.renderProcessingState();
    this.showFooter(false);

    try {
      // Convert files to base64
      const pdfs = await Promise.all(
        this.files.map(async file => ({
          filename: file.name,
          content: await this.fileToBase64(file)
        }))
      );

      const response = await utils.authFetch('/.netlify/functions/process-pdf', {
        method: 'POST',
        body: JSON.stringify({ pdfs })
      });

      if (!response.ok) {
        throw new Error('Failed to process PDFs');
      }

      const result = await response.json();

      if (result.success) {
        const tripData = result.tripData;

        // Always show photo selection when there's a destination
        if (result.needsPhotoSelection && result.destination) {
          this.state = 'photoSelection';
          this.pendingTripData = tripData;
          this.pendingDestination = result.destination;
          this.renderPhotoSelectionState(result.destination);
        } else {
          this.state = 'success';
          this.renderSuccessState(`trip.html?id=${tripData.id}`);
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing trip:', error);
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
        <div class="processing-state-text" data-i18n="trip.processing">Elaborazione in corso...</div>
      </div>
    `;
    i18n.apply();
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
    i18n.apply();
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
        <div class="result-state-text">${message}</div>
        <button class="btn btn-secondary" id="retry-btn" data-i18n="modal.retry">Riprova</button>
      </div>
    `;

    document.getElementById('retry-btn').addEventListener('click', () => {
      this.reset();
    });

    i18n.apply();
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
          <span class="photo-selection-destination">${destination}</span>
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
    i18n.apply();

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
        ${photo.attribution ? `<div class="photo-option-attribution">${photo.attribution.photographerName || ''}</div>` : ''}
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

    i18n.apply();
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
      i18n.apply();
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
    i18n.apply();

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
    i18n.apply();
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
    i18n.apply();

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
