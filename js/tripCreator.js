/**
 * Trip Creator - Modal for creating new trips from PDF documents
 */

const tripCreator = {
  files: [],
  state: 'idle', // idle, uploading, processing, success, error

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
  },

  /**
   * Reset modal state
   */
  reset() {
    this.files = [];
    this.state = 'idle';
    this.renderUploadState();
    this.updateSubmitButton();
    this.showFooter(true);
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

      const response = await fetch('/.netlify/functions/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pdfs })
      });

      if (!response.ok) {
        throw new Error('Failed to process PDFs');
      }

      const result = await response.json();

      if (result.success) {
        this.state = 'success';
        const tripData = result.tripData;
        // Redirect to dynamic trip page
        this.renderSuccessState(`trip.html?id=${tripData.id}`);
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
  }
};

// Make available globally
window.tripCreator = tripCreator;
