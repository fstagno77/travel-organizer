/**
 * Trip Page - Handles dynamic trip display from localStorage
 */

(async function() {
  'use strict';

  let currentTripData = null;

  /**
   * Initialize the trip page
   */
  async function init() {
    try {
      // Initialize i18n first
      await i18n.init();

      // Initialize auth
      if (typeof auth !== 'undefined') {
        await auth.init();

        // Apply language preference from profile if available
        if (auth.profile?.language_preference) {
          await i18n.setLang(auth.profile.language_preference);
        }
      }

      // Initialize navigation (header, footer)
      await navigation.init();

      // Re-apply translations after navigation is loaded
      i18n.apply();

      // Load trip data from URL parameter (requires auth)
      if (!auth?.requireAuth()) {
        return;
      }
      await loadTripFromUrl();

    } catch (error) {
      console.error('Error initializing trip page:', error);
      showError('Could not load trip data');
    }
  }

  /**
   * Load trip from URL parameter
   */
  async function loadTripFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
      showError('No trip ID provided');
      return;
    }

    try {
      // Load trip from Supabase via Netlify Function (authenticated)
      console.log('Fetching trip:', tripId);
      const response = await utils.authFetch(`/.netlify/functions/get-trip?id=${encodeURIComponent(tripId)}`);
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Result:', result);

      if (!result.success || !result.tripData) {
        showError('Trip not found');
        return;
      }

      currentTripData = result.tripData;
      console.log('Rendering trip...');
      renderTrip(result.tripData);
      console.log('Trip rendered successfully');
    } catch (error) {
      console.error('Error loading trip:', error);
      console.error('Error stack:', error.stack);
      showError('Could not load trip data');
    }
  }

  /**
   * Show error message
   * @param {string} message
   */
  function showError(message) {
    const content = document.getElementById('trip-content');
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3 class="empty-state-title" data-i18n="common.error">Error</h3>
        <p class="empty-state-text">${message}</p>
        <a href="./" class="btn btn-primary" data-i18n="common.backHome">Back to home</a>
      </div>
    `;
    i18n.apply();
  }

  /**
   * Render trip data
   * @param {Object} tripData
   */
  function renderTrip(tripData) {
    const lang = i18n.getLang();

    // Update page title
    const title = tripData.title[lang] || tripData.title.en || tripData.title.it;
    document.title = `${title} - Travel Flow`;
    document.getElementById('trip-title').textContent = title;

    // Update dates
    if (tripData.startDate && tripData.endDate) {
      const start = utils.formatDate(tripData.startDate, lang, { month: 'short', day: 'numeric' });
      const end = utils.formatDate(tripData.endDate, lang, { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('trip-dates').textContent = `${start} - ${end}`;
    }

    // Render content
    renderTripContent(document.getElementById('trip-content'), tripData);
  }

  /**
   * Render trip content with segmented control
   * @param {HTMLElement} container
   * @param {Object} tripData
   */
  function renderTripContent(container, tripData) {
    const html = `
      <div class="trip-content-header mb-6">
        <div class="segmented-control">
          <button class="segmented-control-btn active" data-tab="flights">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
            <span data-i18n="trip.flights">Flights</span>
          </button>
          <button class="segmented-control-btn" data-tab="hotels">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
              <path d="M9 9v.01"></path>
              <path d="M9 12v.01"></path>
              <path d="M9 15v.01"></path>
              <path d="M9 18v.01"></path>
            </svg>
            <span data-i18n="trip.hotels">Hotels</span>
          </button>
        </div>
        <div class="section-menu" id="content-menu">
          <button class="section-menu-btn" id="content-menu-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="section-dropdown" id="content-dropdown">
            <button class="section-dropdown-item" data-action="add-booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span data-i18n="trip.addBooking">Add booking</span>
            </button>
            <button class="section-dropdown-item" data-action="share">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span data-i18n="trip.share">Share</span>
            </button>
            <button class="section-dropdown-item" data-action="rename">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="trip.rename">Rename</span>
            </button>
            <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span data-i18n="trip.delete">Delete</span>
            </button>
          </div>
        </div>
      </div>

      <div id="flights-tab" class="tab-content active">
        <div id="flights-container"></div>
      </div>

      <div id="hotels-tab" class="tab-content">
        <div id="hotels-container"></div>
      </div>
    `;

    container.innerHTML = html;

    // Render content
    renderFlights(document.getElementById('flights-container'), tripData.flights);
    renderHotels(document.getElementById('hotels-container'), tripData.hotels);

    // Initialize tab switching
    initTabSwitching();

    // Determine initial tab: show hotels if no flights, otherwise flights
    const hasFlights = tripData.flights && tripData.flights.length > 0;
    const hasHotels = tripData.hotels && tripData.hotels.length > 0;
    if (!hasFlights && hasHotels) {
      switchToTab('hotels');
    }

    // Initialize menu
    initMenu(tripData.id);

    // Apply translations
    i18n.apply();
  }

  /**
   * Initialize tab switching
   */
  function initTabSwitching() {
    const tabs = document.querySelectorAll('.segmented-control-btn');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchToTab(targetTab);
      });
    });
  }

  /**
   * Switch to a specific tab
   * @param {string} tabName - 'flights' or 'hotels'
   */
  function switchToTab(tabName) {
    const tabs = document.querySelectorAll('.segmented-control-btn');

    tabs.forEach(t => t.classList.remove('active'));
    const targetBtn = document.querySelector(`.segmented-control-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) targetContent.classList.add('active');
  }

  /**
   * Initialize menu
   * @param {string} tripId
   */
  function initMenu(tripId) {
    const menuBtn = document.getElementById('content-menu-btn');
    const dropdown = document.getElementById('content-dropdown');

    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });
    }

    document.querySelectorAll('.section-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        dropdown?.classList.remove('active');

        if (action === 'delete') {
          deleteTrip(tripId);
        } else if (action === 'add-booking') {
          showAddBookingModal(tripId);
        } else if (action === 'share') {
          showShareModal(tripId);
        } else if (action === 'rename') {
          showRenameModal(tripId);
        }
      });
    });

    document.addEventListener('click', () => {
      dropdown?.classList.remove('active');
    });
  }

  /**
   * Show modal to add booking
   * @param {string} tripId
   */
  function showAddBookingModal(tripId) {
    const existingModal = document.getElementById('add-booking-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay" id="add-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.addBooking">Add booking</h2>
            <button class="modal-close" id="add-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-zone" id="add-booking-upload-zone">
              <input type="file" id="add-booking-file-input" accept=".pdf" multiple hidden>
              <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="upload-zone-text" data-i18n="trip.uploadHint">Drag PDFs here or click to select</div>
              <div class="upload-zone-hint">PDF</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="add-booking-cancel" data-i18n="modal.cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('add-booking-modal');
    const closeBtn = document.getElementById('add-booking-close');
    const cancelBtn = document.getElementById('add-booking-cancel');
    const uploadZone = document.getElementById('add-booking-upload-zone');
    const fileInput = document.getElementById('add-booking-file-input');

    let files = [];

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const addFiles = (fileListInput) => {
      const pdfFiles = Array.from(fileListInput).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 0) {
        files = pdfFiles;
        submitBooking();
      }
    };

    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    };

    const submitBooking = async () => {
      if (files.length === 0) return;

      // Show processing state with rotating phrases
      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');
      const originalBodyContent = modalBody.innerHTML;

      modalBody.innerHTML = `
        <div class="processing-state">
          <div class="spinner"></div>
          <p class="processing-phrase loading-phrase"></p>
        </div>
      `;
      modalFooter.style.display = 'none';

      // Start rotating phrases
      const phraseElement = modalBody.querySelector('.processing-phrase');
      const phraseController = utils.startLoadingPhrases(phraseElement, 3000);

      try {
        const pdfs = await Promise.all(
          files.map(async file => ({
            filename: file.name,
            content: await fileToBase64(file)
          }))
        );

        const response = await utils.authFetch('/.netlify/functions/add-booking', {
          method: 'POST',
          body: JSON.stringify({ pdfs, tripId })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Check for rate limit error
          if (response.status === 429 || result.errorType === 'rate_limit') {
            throw new Error('rate_limit');
          }
          // Check for duplicate booking error
          if (response.status === 409 || result.errorType === 'duplicate') {
            const error = new Error('duplicate');
            error.tripName = result.tripName;
            throw error;
          }
          throw new Error(result.error || 'Failed to add booking');
        }

        phraseController.stop();
        closeModal();
        // Reload trip data
        await loadTripFromUrl();

        // Switch to the appropriate tab based on what was added
        if (result.added) {
          if (result.added.hotels > 0) {
            switchToTab('hotels');
          } else if (result.added.flights > 0) {
            switchToTab('flights');
          }
        }
      } catch (error) {
        console.error('Error adding booking:', error);
        phraseController.stop();

        // Show error in modal
        let errorMessage;
        if (error.message === 'rate_limit') {
          errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
        } else if (error.message === 'duplicate') {
          errorMessage = `${i18n.t('trip.duplicateError') || 'This booking is already in'} "${error.tripName}"`;
        } else {
          errorMessage = i18n.t('trip.addError') || 'Error adding booking';
        }

        modalBody.innerHTML = `
          <div class="error-state">
            <div class="error-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p class="error-state-message">${errorMessage}</p>
            <button class="btn btn-secondary" id="error-retry-btn" data-i18n="modal.retry">Try again</button>
          </div>
        `;
        modalFooter.style.display = 'none';
        i18n.apply();

        // Retry button - restore upload zone
        document.getElementById('error-retry-btn').addEventListener('click', () => {
          modalBody.innerHTML = originalBodyContent;
          modalFooter.style.display = '';
          i18n.apply();

          // Re-attach event listeners
          const newUploadZone = document.getElementById('add-booking-upload-zone');
          const newFileInput = document.getElementById('add-booking-file-input');
          newUploadZone.addEventListener('click', () => newFileInput.click());
          newFileInput.addEventListener('change', (e) => {
            addFiles(e.target.files);
            newFileInput.value = '';
          });
          newUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            newUploadZone.classList.add('dragover');
          });
          newUploadZone.addEventListener('dragleave', () => {
            newUploadZone.classList.remove('dragover');
          });
          newUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            newUploadZone.classList.remove('dragover');
            addFiles(e.dataTransfer.files);
          });
        });
      }
    };

    // Upload zone events
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      addFiles(e.target.files);
      fileInput.value = '';
    });
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      addFiles(e.dataTransfer.files);
    });

    // Modal events
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Delete trip - shows confirmation modal
   * @param {string} tripId
   */
  function deleteTrip(tripId) {
    showDeleteModal(tripId);
  }

  /**
   * Show delete confirmation modal
   * @param {string} tripId
   */
  function showDeleteModal(tripId) {
    const existingModal = document.getElementById('delete-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    const tripTitle = currentTripData?.title?.[lang] || currentTripData?.title?.en || currentTripData?.title?.it || '';

    const modalHTML = `
      <div class="modal-overlay" id="delete-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteTitle">Delete trip</h2>
            <button class="modal-close" id="delete-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="trip.deleteConfirm">Are you sure you want to delete this trip?</p>
            <p class="text-muted mt-2"><strong>${tripTitle}</strong></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-confirm" data-i18n="trip.delete">Delete</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-modal');
    const closeBtn = document.getElementById('delete-close');
    const cancelBtn = document.getElementById('delete-cancel');
    const confirmBtn = document.getElementById('delete-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(tripId)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete trip');
        }

        closeModal();
        // Redirect to home
        window.location.href = './';
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert(i18n.t('trip.deleteError') || 'Error deleting trip');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.delete') || 'Delete';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Show share modal
   * @param {string} tripId
   */
  function showShareModal(tripId) {
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    const shareUrl = `${window.location.origin}/share.html?id=${encodeURIComponent(tripId)}`;

    const modalHTML = `
      <div class="modal-overlay" id="share-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.share">Share</h2>
            <button class="modal-close" id="share-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="mb-4" data-i18n="trip.shareDescription">Share this trip with others using the link below:</p>
            <div class="share-url-container">
              <input type="text" class="share-url-input" id="share-url-input" value="${shareUrl}" readonly>
              <button class="btn btn-primary" id="copy-url-btn" data-i18n="trip.copyLink">Copy link</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('share-modal');
    const closeBtn = document.getElementById('share-close');
    const copyBtn = document.getElementById('copy-url-btn');
    const urlInput = document.getElementById('share-url-input');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyBtn.textContent = i18n.t('trip.copied') || 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = i18n.t('trip.copyLink') || 'Copy link';
        }, 2000);
      } catch (err) {
        urlInput.select();
        document.execCommand('copy');
      }
    });

    urlInput.addEventListener('click', () => urlInput.select());

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Show rename modal
   * @param {string} tripId
   */
  function showRenameModal(tripId) {
    const existingModal = document.getElementById('rename-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    const currentTitle = currentTripData?.title?.[lang] || currentTripData?.title?.en || currentTripData?.title?.it || '';

    const modalHTML = `
      <div class="modal-overlay" id="rename-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.rename">Rename</h2>
            <button class="modal-close" id="rename-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label" data-i18n="trip.newName">New name</label>
            <input type="text" class="form-input" id="rename-input" value="${currentTitle}">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="rename-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-primary" id="rename-submit" data-i18n="modal.save">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('rename-modal');
    const closeBtn = document.getElementById('rename-close');
    const cancelBtn = document.getElementById('rename-cancel');
    const submitBtn = document.getElementById('rename-submit');
    const input = document.getElementById('rename-input');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const submitRename = async () => {
      const newName = input.value.trim();
      if (!newName) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/rename-trip', {
          method: 'POST',
          body: JSON.stringify({ tripId, title: newName })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to rename trip');
        }

        closeModal();
        // Reload trip data
        await loadTripFromUrl();
      } catch (error) {
        console.error('Error renaming trip:', error);
        alert(i18n.t('trip.renameError') || 'Error renaming trip');
        submitBtn.disabled = false;
        submitBtn.textContent = i18n.t('modal.save') || 'Save';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    submitBtn.addEventListener('click', submitRename);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitRename();
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    input.focus();
    input.select();
    i18n.apply();
  }

  /**
   * Check if a flight is in the past (based on arrival time)
   * @param {Object} flight
   * @returns {boolean}
   */
  function isFlightPast(flight) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const flightDate = flight.date;

    // Calculate arrival date (might be next day if arrivalNextDay)
    let arrivalDate = flightDate;
    if (flight.arrivalNextDay) {
      const d = new Date(flightDate);
      d.setDate(d.getDate() + 1);
      arrivalDate = d.toISOString().split('T')[0];
    }

    // If arrival date is before today, it's definitely past
    if (arrivalDate < today) {
      return true;
    }

    // If arrival date is today, check the arrival time
    if (arrivalDate === today) {
      const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);
      const arrivalMinutes = arrH * 60 + arrM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // If arrival time has passed, flight is past
      return currentMinutes > arrivalMinutes;
    }

    // If arrival date is in the future, not past
    return false;
  }

  /**
   * Render flights
   * @param {HTMLElement} container
   * @param {Array} flights
   */
  function renderFlights(container, flights) {
    if (!flights || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noFlights">No flights</h3>
          <p class="empty-state-text" data-i18n="trip.noFlightsText">No flight information available</p>
        </div>
        <div class="quick-upload-card" id="quick-upload-flights">
          <input type="file" class="quick-upload-input" accept=".pdf" hidden>
          <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <div class="quick-upload-spinner"></div>
          <span class="quick-upload-text" data-i18n="${i18n.isTouchDevice() ? 'trip.quickUploadHintMobile' : 'trip.quickUploadHint'}">Drop a PDF here to add a booking</span>
        </div>
      `;
      i18n.apply();
      initQuickUploadCard('quick-upload-flights');
      return;
    }

    const lang = i18n.getLang();

    const sortedFlights = [...flights].sort((a, b) => {
      const aPast = isFlightPast(a);
      const bPast = isFlightPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });

    const html = sortedFlights.map((flight, index) => {
      const trackingUrl = utils.getFlightTrackingUrl(flight.flightNumber);
      const formattedDate = utils.formatFlightDate(flight.date, lang);
      const duration = flight.duration ? utils.formatDuration(flight.duration, lang) : '';
      const isPast = isFlightPast(flight);

      return `
        <div class="flight-card${isPast ? ' past' : ''}" data-id="${flight.id}">
          <div class="flight-card-header">
            <span class="flight-date">${formattedDate}</span>
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="flight-number-link">
              ${flight.flightNumber}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div class="flight-card-body">
            <div class="flight-route">
              <div class="flight-endpoint">
                <div class="flight-time">
                  <span class="material-icons-outlined flight-time-icon">flight_takeoff</span>
                  ${flight.departureTime}
                </div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${flight.departure?.code || ''}</span>
                </div>
                <div class="flight-airport">${flight.departure?.city || ''}</div>
                ${flight.departure?.terminal ? `<div class="flight-terminal">Terminal ${flight.departure.terminal}</div>` : ''}
              </div>

              <div class="flight-arrow">
                <div class="flight-duration">${duration}</div>
                <div class="flight-arrow-line"></div>
              </div>

              <div class="flight-endpoint">
                <div class="flight-time">
                  <span class="material-icons-outlined flight-time-icon">flight_land</span>
                  ${flight.arrivalTime}${flight.arrivalNextDay ? ' +1' : ''}
                </div>
                <div class="flight-airport">
                  <span class="flight-airport-code">${flight.arrival?.code || ''}</span>
                </div>
                <div class="flight-airport">${flight.arrival?.city || ''}</div>
                ${flight.arrival?.terminal ? `<div class="flight-terminal">Terminal ${flight.arrival.terminal}</div>` : ''}
              </div>
            </div>
          </div>

          <button class="flight-toggle-details" data-flight-index="${index}">
            <span data-i18n="flight.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="flight-details" id="flight-details-${index}">
            ${flight.passengers && flight.passengers.length > 1 ? `
            <!-- Multiple passengers view -->
            <div class="flight-passengers-section">
              <span class="flight-detail-label" data-i18n="flight.passengers">Passengers</span>
              <div class="flight-passengers-list">
                ${flight.passengers.map((p, pIndex) => `
                  <div class="flight-passenger-item" data-passenger-index="${pIndex}">
                    <div class="flight-passenger-header">
                      <div class="flight-passenger-info">
                        <span class="flight-passenger-name">${p.name || '-'}</span>
                        <span class="flight-passenger-type">${p.type || ''}</span>
                      </div>
                      <div class="flight-passenger-actions">
                        ${p.pdfPath ? `
                        <button class="btn-download-pdf-small" data-pdf-path="${p.pdfPath}" title="Download PDF">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span data-i18n="flight.downloadPdf">PDF</span>
                        </button>
                        ` : ''}
                        <button class="btn-delete-passenger" data-passenger-name="${p.name}" data-booking-ref="${flight.bookingReference}" title="Remove passenger">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div class="flight-passenger-details">
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.bookingRef">Booking</span>
                        <span class="flight-passenger-detail-value-wrapper">
                          <span class="flight-passenger-detail-value">${flight.bookingReference || '-'}</span>
                          ${flight.bookingReference ? `<button class="btn-copy-value btn-copy-small" data-copy="${flight.bookingReference}" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>` : ''}
                        </span>
                      </div>
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.class">Class</span>
                        <span class="flight-passenger-detail-value">${flight.class || '-'}</span>
                      </div>
                      <div class="flight-passenger-detail">
                        <span class="flight-passenger-detail-label" data-i18n="flight.ticketNumber">Ticket</span>
                        <span class="flight-passenger-detail-value-wrapper">
                          <span class="flight-passenger-detail-value">${p.ticketNumber || '-'}</span>
                          ${p.ticketNumber ? `<button class="btn-copy-value btn-copy-small" data-copy="${p.ticketNumber}" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : `
            <!-- Single passenger view -->
            <div class="flight-details-grid">
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.bookingRef">Booking Reference</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${flight.bookingReference || '-'}</span>
                  ${flight.bookingReference ? `<button class="btn-copy-value" data-copy="${flight.bookingReference}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.ticketNumber">Ticket Number</span>
                <span class="flight-detail-value-wrapper">
                  <span class="flight-detail-value">${flight.ticketNumber || '-'}</span>
                  ${flight.ticketNumber ? `<button class="btn-copy-value" data-copy="${flight.ticketNumber}" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>` : ''}
                </span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.seat">Seat</span>
                <span class="flight-detail-value">${flight.seat || '-'}</span>
              </div>
              <div class="flight-detail-item">
                <span class="flight-detail-label" data-i18n="flight.class">Class</span>
                <span class="flight-detail-value">${flight.class || '-'}</span>
              </div>
            </div>
            ${flight.pdfPath ? `
            <button class="btn-download-pdf" data-pdf-path="${flight.pdfPath}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span data-i18n="flight.downloadPdf">Download PDF</span>
            </button>
            ` : ''}
            `}
            <button class="btn-delete-item" data-type="flight" data-id="${flight.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span data-i18n="flight.delete">Delete flight</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add quick upload card at the end
    const quickUploadCard = `
      <div class="quick-upload-card" id="quick-upload-flights">
        <input type="file" class="quick-upload-input" accept=".pdf" hidden>
        <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="quick-upload-spinner"></div>
        <span class="quick-upload-text" data-i18n="trip.quickUploadHint">Drop a PDF here to add a booking</span>
      </div>
    `;

    container.innerHTML = html + quickUploadCard;
    i18n.apply();
    initFlightToggleButtons();
    initDeleteItemButtons();
    initPdfDownloadButtons();
    initSmallPdfButtons();
    initDeletePassengerButtons();
    initCopyValueButtons();
    initQuickUploadCard('quick-upload-flights');
  }

  /**
   * Render hotels
   * @param {HTMLElement} container
   * @param {Array} hotels
   */
  function renderHotels(container, hotels) {
    if (!hotels || hotels.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noHotels">No hotels</h3>
          <p class="empty-state-text" data-i18n="trip.noHotelsText">No hotel information available</p>
        </div>
        <div class="quick-upload-card" id="quick-upload-hotels">
          <input type="file" class="quick-upload-input" accept=".pdf" hidden>
          <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <div class="quick-upload-spinner"></div>
          <span class="quick-upload-text" data-i18n="${i18n.isTouchDevice() ? 'trip.quickUploadHintMobile' : 'trip.quickUploadHint'}">Drop a PDF here to add a booking</span>
        </div>
      `;
      i18n.apply();
      initQuickUploadCard('quick-upload-hotels');
      return;
    }

    const lang = i18n.getLang();

    // Sort hotels by check-in date
    const sortedHotels = [...hotels].sort((a, b) => {
      const dateA = new Date(a.checkIn?.date || '9999-12-31');
      const dateB = new Date(b.checkIn?.date || '9999-12-31');
      return dateA - dateB;
    });

    const html = sortedHotels.map((hotel, index) => {
      const checkInDate = new Date(hotel.checkIn?.date);
      const checkOutDate = new Date(hotel.checkOut?.date);
      const checkInDay = checkInDate.getDate();
      const checkOutDay = checkOutDate.getDate();
      const checkInMonth = checkInDate.toLocaleDateString(lang, { month: 'short' });
      const checkOutMonth = checkOutDate.toLocaleDateString(lang, { month: 'short' });

      const mapsUrl = hotel.address?.fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address.fullAddress)}`
        : '#';
      const nightsLabel = hotel.nights === 1 ? i18n.t('hotel.night') : i18n.t('hotel.nights');
      // Support both roomType (single) and roomTypes (array) formats
      let roomType = '-';
      if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
        roomType = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
      } else if (hotel.roomType) {
        roomType = hotel.roomType[lang] || hotel.roomType.en || hotel.roomType;
      }

      return `
        <div class="hotel-card" data-id="${hotel.id}">
          <div class="hotel-card-header">
            <h3>${hotel.name}</h3>
          </div>

          <div class="hotel-card-body">
            <div class="hotel-dates">
              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkIn">Check-in</div>
                <div class="hotel-date-day">${checkInDay}</div>
                <div class="hotel-date-month">${checkInMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.from')} ${hotel.checkIn?.time || ''}</div>
              </div>

              <div class="hotel-nights">
                <div class="hotel-nights-count">${hotel.nights || '-'}</div>
                <div class="hotel-nights-label">${nightsLabel}</div>
              </div>

              <div class="hotel-date-block">
                <div class="hotel-date-label" data-i18n="hotel.checkOut">Check-out</div>
                <div class="hotel-date-day">${checkOutDay}</div>
                <div class="hotel-date-month">${checkOutMonth}</div>
                <div class="hotel-date-time">${i18n.t('common.until')} ${hotel.checkOut?.time || ''}</div>
              </div>
            </div>

            ${hotel.address?.fullAddress ? `
            <div class="hotel-address">
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="hotel-address-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="hotel-address-text">${hotel.address.fullAddress}</span>
              </a>
            </div>
            ` : ''}
          </div>

          <button class="hotel-toggle-details" data-hotel-index="${index}">
            <span data-i18n="hotel.showDetails">Show details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="hotel-details" id="hotel-details-${index}">
            <div class="hotel-details-grid">
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.roomType">Room type</span>
                <span class="hotel-detail-value">${roomType}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guests">Guests</span>
                <span class="hotel-detail-value">${utils.formatGuests(hotel.guests, lang)}</span>
              </div>
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.guestName">Guest name</span>
                <span class="hotel-detail-value">${hotel.guestName || '-'}</span>
              </div>
              ${hotel.phone ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.phone">Phone</span>
                <span class="hotel-detail-value"><a href="tel:${hotel.phone}">${hotel.phone}</a></span>
              </div>
              ` : ''}
              ${hotel.price?.total ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.price">Total price</span>
                <span class="hotel-detail-value">~${hotel.price.total.currency} ${hotel.price.total.value}</span>
              </div>
              ` : ''}
              ${hotel.confirmationNumber ? `
              <div class="hotel-detail-item">
                <span class="hotel-detail-label" data-i18n="hotel.confirmation">Confirmation</span>
                <span class="hotel-detail-value">${hotel.confirmationNumber}</span>
              </div>
              ` : ''}
            </div>
            ${hotel.pdfPath ? `
            <button class="btn-download-pdf" data-pdf-path="${hotel.pdfPath}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span data-i18n="hotel.downloadPdf">Download PDF</span>
            </button>
            ` : ''}
            <button class="btn-delete-item" data-type="hotel" data-id="${hotel.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span data-i18n="hotel.delete">Delete hotel</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add quick upload card at the end
    const quickUploadCard = `
      <div class="quick-upload-card" id="quick-upload-hotels">
        <input type="file" class="quick-upload-input" accept=".pdf" hidden>
        <svg class="quick-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="quick-upload-spinner"></div>
        <span class="quick-upload-text" data-i18n="trip.quickUploadHint">Drop a PDF here to add a booking</span>
      </div>
    `;

    container.innerHTML = html + quickUploadCard;
    i18n.apply();
    initHotelToggleButtons();
    initDeleteItemButtons();
    initPdfDownloadButtons();
    initQuickUploadCard('quick-upload-hotels');
  }

  /**
   * Initialize delete item buttons
   */
  function initDeleteItemButtons() {
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = newBtn.dataset.type;
        const id = newBtn.dataset.id;
        showDeleteItemModal(type, id);
      });
    });
  }

  /**
   * Initialize PDF download buttons
   */
  function initPdfDownloadButtons() {
    document.querySelectorAll('.btn-download-pdf').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pdfPath = newBtn.dataset.pdfPath;

        // Show loading state
        const originalContent = newBtn.innerHTML;
        newBtn.disabled = true;
        newBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

        // Pre-open window for Safari iOS (must be synchronous with user click)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        let newWindow = null;
        if (isIOS) {
          newWindow = window.open('about:blank', '_blank');
        }

        try {
          const response = await utils.authFetch(`/.netlify/functions/get-pdf-url?path=${encodeURIComponent(pdfPath)}`);
          const result = await response.json();

          if (result.success && result.url) {
            if (newWindow) {
              // iOS: redirect the pre-opened window
              newWindow.location.href = result.url;
            } else {
              // Other browsers: open normally
              window.open(result.url, '_blank');
            }
          } else {
            if (newWindow) newWindow.close();
            throw new Error(result.error || 'Failed to get PDF URL');
          }
        } catch (error) {
          console.error('Error downloading PDF:', error);
          if (newWindow) newWindow.close();
          alert(i18n.t('common.downloadError') || 'Error downloading PDF');
        } finally {
          // Restore button state
          newBtn.disabled = false;
          newBtn.innerHTML = originalContent;
        }
      });
    });
  }

  /**
   * Initialize small PDF download buttons (for multi-passenger view)
   */
  function initSmallPdfButtons() {
    document.querySelectorAll('.btn-download-pdf-small').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pdfPath = newBtn.dataset.pdfPath;

        // Show loading state
        newBtn.disabled = true;
        const svg = newBtn.querySelector('svg');
        if (svg) svg.style.opacity = '0.5';

        // Pre-open window for Safari iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        let newWindow = null;
        if (isIOS) {
          newWindow = window.open('about:blank', '_blank');
        }

        try {
          const response = await utils.authFetch(`/.netlify/functions/get-pdf-url?path=${encodeURIComponent(pdfPath)}`);
          const result = await response.json();

          if (result.success && result.url) {
            if (newWindow) {
              newWindow.location.href = result.url;
            } else {
              window.open(result.url, '_blank');
            }
          } else {
            if (newWindow) newWindow.close();
            throw new Error(result.error || 'Failed to get PDF URL');
          }
        } catch (error) {
          console.error('Error downloading PDF:', error);
          if (newWindow) newWindow.close();
          alert(i18n.t('common.downloadError') || 'Error downloading PDF');
        } finally {
          newBtn.disabled = false;
          if (svg) svg.style.opacity = '1';
        }
      });
    });
  }

  /**
   * Initialize delete passenger buttons
   */
  function initDeletePassengerButtons() {
    document.querySelectorAll('.btn-delete-passenger').forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const passengerName = newBtn.dataset.passengerName;
        const bookingRef = newBtn.dataset.bookingRef;
        showDeletePassengerModal(passengerName, bookingRef);
      });
    });
  }

  /**
   * Show delete passenger confirmation modal
   * @param {string} passengerName
   * @param {string} bookingRef
   */
  function showDeletePassengerModal(passengerName, bookingRef) {
    const existingModal = document.getElementById('delete-passenger-modal');
    if (existingModal) existingModal.remove();

    // Count how many flights this passenger is on with this booking
    const flightsWithPassenger = (currentTripData?.flights || []).filter(f =>
      f.bookingReference?.toLowerCase()?.trim() === bookingRef?.toLowerCase()?.trim() &&
      f.passengers?.some(p => p.name?.toLowerCase()?.trim() === passengerName?.toLowerCase()?.trim())
    );

    const modalHTML = `
      <div class="modal-overlay" id="delete-passenger-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="passenger.deleteTitle">Remove passenger</h2>
            <button class="modal-close" id="delete-passenger-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="passenger.deleteConfirm">Are you sure you want to remove this passenger?</p>
            <p class="text-muted mt-2"><strong>${passengerName}</strong></p>
            <p class="text-muted text-sm mt-2" data-i18n="passenger.deleteInfo">This will remove the passenger from ${flightsWithPassenger.length} flight(s) with booking ${bookingRef}.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-passenger-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-passenger-confirm" data-i18n="passenger.delete">Remove</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-passenger-modal');
    const closeBtn = document.getElementById('delete-passenger-close');
    const cancelBtn = document.getElementById('delete-passenger-cancel');
    const confirmBtn = document.getElementById('delete-passenger-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/delete-passenger', {
          method: 'POST',
          body: JSON.stringify({
            tripId: currentTripData.id,
            passengerName: passengerName,
            bookingReference: bookingRef
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to remove passenger');
        }

        closeModal();

        // Reload trip data
        await loadTripFromUrl();
      } catch (error) {
        console.error('Error removing passenger:', error);
        alert(i18n.t('common.deleteError') || 'Error removing passenger');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('passenger.delete') || 'Remove';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Show delete item confirmation modal
   * @param {string} type - 'flight' or 'hotel'
   * @param {string} itemId
   */
  function showDeleteItemModal(type, itemId) {
    const existingModal = document.getElementById('delete-item-modal');
    if (existingModal) existingModal.remove();

    const lang = i18n.getLang();
    let itemDescription = '';

    if (type === 'flight') {
      const flight = currentTripData?.flights?.find(f => f.id === itemId);
      if (flight) {
        const date = utils.formatFlightDate(flight.date, lang);
        itemDescription = `${flight.flightNumber} - ${flight.departure?.code} → ${flight.arrival?.code} (${date})`;
      }
    } else if (type === 'hotel') {
      const hotel = currentTripData?.hotels?.find(h => h.id === itemId);
      if (hotel) {
        itemDescription = hotel.name;
      }
    }

    const titleKey = type === 'flight' ? 'flight.deleteTitle' : 'hotel.deleteTitle';
    const confirmKey = type === 'flight' ? 'flight.deleteConfirm' : 'hotel.deleteConfirm';
    const deleteKey = type === 'flight' ? 'flight.delete' : 'hotel.delete';

    const modalHTML = `
      <div class="modal-overlay" id="delete-item-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="${titleKey}">${type === 'flight' ? 'Delete flight' : 'Delete hotel'}</h2>
            <button class="modal-close" id="delete-item-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p data-i18n="${confirmKey}">${type === 'flight' ? 'Are you sure you want to delete this flight?' : 'Are you sure you want to delete this hotel?'}</p>
            <p class="text-muted mt-2"><strong>${itemDescription}</strong></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-item-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-item-confirm" data-i18n="${deleteKey}">${type === 'flight' ? 'Delete flight' : 'Delete hotel'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-item-modal');
    const closeBtn = document.getElementById('delete-item-close');
    const cancelBtn = document.getElementById('delete-item-cancel');
    const confirmBtn = document.getElementById('delete-item-confirm');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    const performDelete = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const response = await utils.authFetch('/.netlify/functions/delete-booking', {
          method: 'POST',
          body: JSON.stringify({
            tripId: currentTripData.id,
            type: type,
            itemId: itemId
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to delete');
        }

        closeModal();

        // Check if this was the last booking
        const remainingFlights = (currentTripData.flights || []).filter(f => f.id !== itemId);
        const remainingHotels = (currentTripData.hotels || []).filter(h => h.id !== itemId);

        if (remainingFlights.length === 0 && remainingHotels.length === 0) {
          // No more bookings - delete the trip and redirect to home
          try {
            await utils.authFetch(`/.netlify/functions/delete-trip?id=${encodeURIComponent(currentTripData.id)}`, {
              method: 'DELETE'
            });
          } catch (tripDeleteError) {
            console.error('Error deleting empty trip:', tripDeleteError);
          }
          window.location.href = 'index.html';
          return;
        }

        // Get current tab to restore after reload
        const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';

        // Animate card removal
        const card = document.querySelector(`.${type}-card[data-id="${itemId}"]`);
        if (card) {
          card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Reload trip data
        await loadTripFromUrl();

        // Restore tab
        switchToTab(currentTab);
      } catch (error) {
        console.error('Error deleting item:', error);
        utils.showToast(i18n.t('common.error') || 'Error deleting', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t(deleteKey) || 'Delete';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performDelete);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Initialize flight toggle buttons
   */
  function initFlightToggleButtons() {
    document.querySelectorAll('.flight-toggle-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.flightIndex;
        const details = document.getElementById(`flight-details-${index}`);
        const isActive = details.classList.toggle('active');
        btn.classList.toggle('active', isActive);

        const textSpan = btn.querySelector('span[data-i18n]');
        if (textSpan) {
          textSpan.dataset.i18n = isActive ? 'flight.hideDetails' : 'flight.showDetails';
          textSpan.textContent = i18n.t(textSpan.dataset.i18n);
        }
      });
    });
  }

  /**
   * Initialize copy value buttons
   */
  function initCopyValueButtons() {
    document.querySelectorAll('.btn-copy-value').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.copy;
        if (!value) return;

        try {
          await navigator.clipboard.writeText(value);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        } catch (err) {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = value;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        }
      });
    });
  }

  /**
   * Initialize quick upload card
   * @param {string} cardId - The ID of the quick upload card
   */
  function initQuickUploadCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const input = card.querySelector('.quick-upload-input');

    // Click to select file
    card.addEventListener('click', (e) => {
      if (e.target !== input) {
        input.click();
      }
    });

    // File selected
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        handleQuickUpload(file);
      }
      input.value = ''; // Reset for next upload
    });

    // Drag & drop
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('dragover');
    });

    card.addEventListener('dragleave', (e) => {
      e.preventDefault();
      card.classList.remove('dragover');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        handleQuickUpload(file);
      }
    });
  }

  /**
   * Handle quick upload - process file immediately
   * @param {File} file - The PDF file to upload
   */
  async function handleQuickUpload(file) {
    // Show loading state on all quick upload cards
    const cards = document.querySelectorAll('.quick-upload-card');
    const phraseControllers = [];

    cards.forEach(card => {
      card.classList.add('uploading');
      const text = card.querySelector('.quick-upload-text');
      if (text) {
        text.dataset.originalText = text.textContent;
        text.classList.add('loading-phrase');
        // Start rotating phrases
        const controller = utils.startLoadingPhrases(text, 3000);
        phraseControllers.push(controller);
      }
    });

    try {
      // Convert file to base64
      const content = await fileToBase64(file);
      const pdfs = [{ filename: file.name, content }];

      const response = await utils.authFetch('/.netlify/functions/add-booking', {
        method: 'POST',
        body: JSON.stringify({ pdfs, tripId: currentTripData.id })
      });

      const result = await response.json();

      // Check for rate limit error
      if (response.status === 429 || result.errorType === 'rate_limit') {
        throw new Error('rate_limit');
      }

      // Check for duplicate booking error
      if (response.status === 409 || result.errorType === 'duplicate') {
        const error = new Error('duplicate');
        error.tripName = result.tripName;
        throw error;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add booking');
      }

      // Reload trip data
      await loadTripFromUrl();

      // Switch to the appropriate tab based on what was added
      if (result.added) {
        if (result.added.hotels > 0) {
          switchToTab('hotels');
        } else if (result.added.flights > 0) {
          switchToTab('flights');
        }
      }
    } catch (error) {
      let errorMessage;
      if (error.message === 'rate_limit') {
        console.log('Rate limit reached');
        errorMessage = i18n.t('common.rateLimitError') || 'Rate limit reached. Please wait a minute.';
      } else if (error.message === 'duplicate') {
        console.log('Duplicate booking detected');
        errorMessage = `${i18n.t('trip.duplicateError') || 'This booking is already in'} "${error.tripName}"`;
      } else {
        console.error('Error in quick upload:', error);
        errorMessage = i18n.t('trip.addError') || 'Error adding booking';
      }
      utils.showToast(errorMessage, 'error');
    } finally {
      // Stop rotating phrases
      phraseControllers.forEach(controller => controller.stop());

      // Reset loading state
      cards.forEach(card => {
        card.classList.remove('uploading');
        const text = card.querySelector('.quick-upload-text');
        if (text) {
          text.classList.remove('loading-phrase', 'phrase-visible');
          if (text.dataset.originalText) {
            text.textContent = text.dataset.originalText;
          }
        }
      });
    }
  }

  /**
   * Convert file to base64
   * @param {File} file
   * @returns {Promise<string>}
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Initialize hotel toggle buttons
   */
  function initHotelToggleButtons() {
    document.querySelectorAll('.hotel-toggle-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.hotelIndex;
        const details = document.getElementById(`hotel-details-${index}`);
        const isActive = details.classList.toggle('active');
        btn.classList.toggle('active', isActive);

        const textSpan = btn.querySelector('span[data-i18n]');
        if (textSpan) {
          textSpan.dataset.i18n = isActive ? 'hotel.hideDetails' : 'hotel.showDetails';
          textSpan.textContent = i18n.t(textSpan.dataset.i18n);
        }
      });
    });
  }

  // Listen for language changes
  window.addEventListener('languageChanged', () => {
    if (currentTripData) {
      renderTrip(currentTripData);
    }
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
