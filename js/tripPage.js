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
    const titleEl = document.getElementById('trip-title');
    titleEl.textContent = title;

    // Add rename icon next to title
    const renameBtn = document.createElement('button');
    renameBtn.className = 'trip-title-edit-btn';
    renameBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>`;
    renameBtn.addEventListener('click', () => showRenameModal(tripData.id));
    titleEl.appendChild(renameBtn);

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
          <button class="segmented-control-btn active" data-tab="activities">
            <span class="material-symbols-outlined" style="font-size: 20px;">calendar_today</span>
            <span data-i18n="trip.activities">Activities</span>
          </button>
          <button class="segmented-control-btn" data-tab="flights">
            <span class="material-symbols-outlined" style="font-size: 20px;">travel</span>
            <span data-i18n="trip.flights">Flights</span>
          </button>
          <button class="segmented-control-btn" data-tab="hotels">
            <span class="material-symbols-outlined" style="font-size: 20px;">bed</span>
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
              <span data-i18n="modal.add">Add</span>
            </button>
            <button class="section-dropdown-item" data-action="edit-booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span data-i18n="trip.editBookingMenu">Modifica prenotazione</span>
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
            <div class="section-dropdown-divider"></div>
            <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete-booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span data-i18n="trip.deleteBookingMenu">Delete booking</span>
            </button>
            <button class="section-dropdown-item section-dropdown-item--danger" data-action="delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span data-i18n="trip.deleteTrip">Delete trip</span>
            </button>
          </div>
        </div>
      </div>

      <div id="activities-tab" class="tab-content active">
        <div id="activities-container"></div>
      </div>

      <div id="flights-tab" class="tab-content">
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
    renderActivities(document.getElementById('activities-container'), tripData);

    // Initialize tab switching
    initTabSwitching();

    // Restore last active tab (or default to activities)
    const savedTab = sessionStorage.getItem('tripActiveTab') || 'activities';
    switchToTab(savedTab);

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

    // Persist active tab for page refresh
    try { sessionStorage.setItem('tripActiveTab', tabName); } catch(e) {}

    // Show/hide menu items based on active tab
    const addBookingItem = document.querySelector('[data-action="add-booking"]');
    const editBookingItem = document.querySelector('[data-action="edit-booking"]');
    const deleteBookingItem = document.querySelector('[data-action="delete-booking"]');
    const menuDivider = deleteBookingItem?.previousElementSibling;
    const isActivities = tabName === 'activities';

    if (addBookingItem) addBookingItem.style.display = '';
    if (editBookingItem) editBookingItem.style.display = isActivities ? 'none' : '';
    if (deleteBookingItem) deleteBookingItem.style.display = isActivities ? 'none' : '';
    if (menuDivider?.classList.contains('section-dropdown-divider')) {
      menuDivider.style.display = isActivities ? 'none' : '';
    }
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
        } else if (action === 'delete-booking') {
          showDeleteBookingModal(tripId);
        } else if (action === 'add-booking') {
          const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
          if (activeTab === 'activities') {
            showAddChoiceModal(tripId);
          } else if (activeTab === 'flights') {
            showAddBookingModal(tripId, 'flight');
          } else if (activeTab === 'hotels') {
            showAddBookingModal(tripId, 'hotel');
          } else {
            showAddBookingModal(tripId);
          }
        } else if (action === 'edit-booking') {
          showEditBookingModal(tripId);
        } else if (action === 'share') {
          showShareModal(tripId);
        }
      });
    });

    document.addEventListener('click', () => {
      dropdown?.classList.remove('active');
    });
  }

  /**
   * Show choice modal (Volo / Hotel / Attività) from Activities tab
   * @param {string} tripId
   */
  function showAddChoiceModal(tripId) {
    const existingModal = document.getElementById('add-choice-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal-overlay" id="add-choice-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="modal.add">Add</h2>
            <button class="modal-close" id="add-choice-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="add-choice-grid">
              <button class="add-choice-block" data-choice="flight">
                <span class="material-symbols-outlined add-choice-icon">travel</span>
                <span data-i18n="trip.addFlight">Flights</span>
              </button>
              <button class="add-choice-block" data-choice="hotel">
                <span class="material-symbols-outlined add-choice-icon">bed</span>
                <span data-i18n="trip.addHotel">Hotel</span>
              </button>
              <button class="add-choice-block" data-choice="activity">
                <span class="material-symbols-outlined add-choice-icon">event</span>
                <span data-i18n="trip.activities">Activities</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    i18n.apply();

    const modal = document.getElementById('add-choice-modal');
    const closeBtn = document.getElementById('add-choice-close');

    // Trigger reflow then add active class for CSS transition
    modal.offsetHeight;
    modal.classList.add('active');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll('.add-choice-block').forEach(block => {
      block.addEventListener('click', () => {
        const choice = block.dataset.choice;
        if (choice === 'flight' || choice === 'hotel') {
          closeModal();
          showAddBookingModal(tripId, choice);
        } else if (choice === 'activity') {
          closeModal();
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const defaultDate = (currentTripData && todayStr >= currentTripData.startDate && todayStr <= currentTripData.endDate)
            ? todayStr
            : (currentTripData?.startDate || todayStr);
          showActivityPanel('create', defaultDate, null);
        }
      });
    });
  }

  /**
   * Show modal to add booking
   * @param {string} tripId
   * @param {string} [type] - 'flight' or 'hotel' to customize title
   */
  function showAddBookingModal(tripId, type) {
    const existingModal = document.getElementById('add-booking-modal');
    if (existingModal) existingModal.remove();

    // Remember which tab was active when modal opened
    const originTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;

    let titleKey = 'trip.addBookingTitle';
    if (type === 'flight') titleKey = 'trip.addFlightTitle';
    else if (type === 'hotel') titleKey = 'trip.addHotelTitle';

    const modalHTML = `
      <div class="modal-overlay" id="add-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="${titleKey}">Add booking</h2>
            <button class="modal-close" id="add-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-zone" id="add-booking-upload-zone">
              <input type="file" id="add-booking-file-input" accept=".pdf" hidden>
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
      if (pdfFiles.length > 1) {
        utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
        return;
      }
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

        let result;
        try {
          result = await response.json();
        } catch {
          throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
        }

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
          throw Object.assign(
            new Error(result.error || 'Failed to add booking'),
            { errorCode: result.errorCode }
          );
        }

        phraseController.stop();
        closeModal();
        // Reload trip data
        await loadTripFromUrl();

        // Switch tab: if added from Flights/Hotels, stay on that tab;
        // if added from Activities, navigate to the corresponding tab
        if (originTab === 'activities' && result.added) {
          if (result.added.hotels > 0) {
            switchToTab('hotels');
          } else if (result.added.flights > 0) {
            switchToTab('flights');
          }
        } else if (originTab) {
          switchToTab(originTab);
        }

        utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
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
        const errorCode = error.errorCode || '';

        modalBody.innerHTML = `
          <div class="error-state">
            <div class="error-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p class="error-state-message">${errorMessage}</p>
            ${errorCode ? `<p class="error-state-code">${errorCode}</p>` : ''}
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
   * Show delete booking modal with checkbox list
   * @param {string} tripId
   */
  function showDeleteBookingModal(tripId) {
    const existingModal = document.getElementById('delete-booking-modal');
    if (existingModal) existingModal.remove();

    const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';
    const type = currentTab === 'hotels' ? 'hotel' : 'flight';
    const items = type === 'flight'
      ? (currentTripData?.flights || [])
      : (currentTripData?.hotels || []);

    // Build single-items list
    let singleListHTML = '';
    if (items.length === 0) {
      singleListHTML = `<p class="text-muted">${i18n.t('trip.noBookings') || 'No bookings to delete'}</p>`;
    } else {
      singleListHTML = '<div class="delete-booking-list">';
      for (const item of items) {
        let label = '';
        if (type === 'flight') {
          const dep = item.departure?.code || '???';
          const arr = item.arrival?.code || '???';
          const date = item.date || '';
          label = `${item.flightNumber || ''} ${dep} → ${arr}` + (date ? ` &middot; ${date}` : '');
        } else {
          const checkIn = item.checkIn?.date || '';
          const checkOut = item.checkOut?.date || '';
          label = item.name || 'Hotel';
          if (checkIn) label += ` &middot; ${checkIn}`;
          if (checkOut) label += ` → ${checkOut}`;
        }
        singleListHTML += `
          <label class="delete-booking-item">
            <input type="checkbox" value="${item.id}" data-type="${type}">
            <span class="delete-booking-item-label">${label}</span>
          </label>`;
      }
      singleListHTML += '</div>';
    }

    // Build by-booking list (grouped by bookingReference/confirmation)
    let bookingListHTML = '';
    if (items.length === 0) {
      bookingListHTML = `<p class="text-muted">${i18n.t('trip.noBookings') || 'No bookings to delete'}</p>`;
    } else {
      const groups = {};
      for (const item of items) {
        const key = type === 'flight'
          ? (item.bookingReference || item.id)
          : (item.confirmation || item.id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      bookingListHTML = '<div class="delete-booking-list">';
      for (const [ref, groupItems] of Object.entries(groups)) {
        const itemIds = groupItems.map(g => g.id).join(',');
        let sublabel = '';
        if (type === 'flight') {
          sublabel = groupItems.map(f => {
            const dep = f.departure?.code || '???';
            const arr = f.arrival?.code || '???';
            return `${f.flightNumber || ''} ${dep} → ${arr}`;
          }).join(', ');
          // Collect unique passenger names across all flights in this booking
          const nameSet = new Set();
          for (const f of groupItems) {
            if (f.passengers?.length) {
              f.passengers.forEach(p => p.name && nameSet.add(p.name));
            } else if (f.passenger?.name) {
              nameSet.add(f.passenger.name);
            }
          }
          const passengerNames = [...nameSet];
          if (passengerNames.length > 1) {
            // Multiple passengers: one row per passenger
            for (const name of passengerNames) {
              bookingListHTML += `
                <label class="delete-booking-item">
                  <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking" data-passenger="${name}">
                  <span class="delete-booking-item-label">
                    <span><strong>${ref}</strong> &middot; ${name}</span>
                    <span class="delete-booking-item-sub">${sublabel}</span>
                  </span>
                </label>`;
            }
          } else {
            const name = passengerNames[0] || '';
            bookingListHTML += `
              <label class="delete-booking-item">
                <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking">
                <span class="delete-booking-item-label">
                  <span><strong>${ref}</strong>${name ? ` &middot; ${name}` : ''}</span>
                  <span class="delete-booking-item-sub">${sublabel}</span>
                </span>
              </label>`;
          }
        } else {
          sublabel = groupItems.map(h => h.name || 'Hotel').join(', ');
          const nameSet = new Set();
          for (const h of groupItems) {
            if (h.guestName) nameSet.add(h.guestName);
          }
          const guestNames = [...nameSet];
          const names = guestNames.length ? guestNames.join(', ') : '';
          bookingListHTML += `
            <label class="delete-booking-item">
              <input type="checkbox" value="${itemIds}" data-type="${type}" data-mode="booking">
              <span class="delete-booking-item-label">
                <span><strong>${ref}</strong>${names ? ` &middot; ${names}` : ''}</span>
                <span class="delete-booking-item-sub">${sublabel}</span>
              </span>
            </label>`;
        }
      }
      bookingListHTML += '</div>';
    }

    const modalHTML = `
      <div class="modal-overlay" id="delete-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.deleteBookingTitle">Delete booking</h2>
            <button class="modal-close" id="delete-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="segmented-control delete-mode-control">
              <button class="segmented-control-btn active" data-delete-mode="single" data-i18n="trip.deleteModeSingle">Individual</button>
              <button class="segmented-control-btn" data-delete-mode="booking" data-i18n="trip.deleteModeBooking">By booking</button>
            </div>
            <div id="delete-single-view">${singleListHTML}</div>
            <div id="delete-booking-view" style="display:none">${bookingListHTML}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="delete-booking-cancel" data-i18n="modal.cancel">Cancel</button>
            <button class="btn btn-danger" id="delete-booking-confirm" disabled data-i18n="trip.deleteSelected">Delete selected</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('delete-booking-modal');
    const closeBtn = document.getElementById('delete-booking-close');
    const cancelBtn = document.getElementById('delete-booking-cancel');
    const confirmBtn = document.getElementById('delete-booking-confirm');
    const singleView = document.getElementById('delete-single-view');
    const bookingView = document.getElementById('delete-booking-view');
    const modeButtons = modal.querySelectorAll('[data-delete-mode]');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Enable/disable confirm button based on active view's checkboxes
    const updateConfirmState = () => {
      const activeView = modal.querySelector('[data-delete-mode].active').dataset.deleteMode === 'single' ? singleView : bookingView;
      const anyChecked = [...activeView.querySelectorAll('input[type="checkbox"]')].some(cb => cb.checked);
      confirmBtn.disabled = !anyChecked;
    };

    // Attach checkbox listeners
    modal.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateConfirmState));

    // Segmented control switching
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.deleteMode;
        singleView.style.display = mode === 'single' ? '' : 'none';
        bookingView.style.display = mode === 'booking' ? '' : 'none';
        // Uncheck all and reset confirm
        modal.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        confirmBtn.disabled = true;
      });
    });

    const performDelete = async () => {
      const activeMode = modal.querySelector('[data-delete-mode].active').dataset.deleteMode;
      const activeView = activeMode === 'single' ? singleView : bookingView;
      const selected = [...activeView.querySelectorAll('input[type="checkbox"]')].filter(cb => cb.checked);
      if (selected.length === 0) return;

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        // Separate passenger-level deletions from item-level deletions
        for (const cb of selected) {
          const passengerName = cb.dataset.passenger;
          if (passengerName) {
            // Per-passenger deletion: find the bookingReference from the flights
            const ids = cb.value.split(',');
            const flight = (currentTripData?.flights || []).find(f => f.id === ids[0]);
            const bookingRef = flight?.bookingReference || '';
            const response = await utils.authFetch('/.netlify/functions/delete-passenger', {
              method: 'POST',
              body: JSON.stringify({
                tripId,
                passengerName,
                bookingReference: bookingRef
              })
            });
            if (!response.ok) {
              throw new Error('Failed to delete passenger');
            }
          } else {
            // Delete entire items
            const ids = cb.value.split(',');
            for (const id of ids) {
              const response = await utils.authFetch('/.netlify/functions/delete-booking', {
                method: 'POST',
                body: JSON.stringify({
                  tripId,
                  type: cb.dataset.type,
                  itemId: id
                })
              });
              if (!response.ok) {
                throw new Error('Failed to delete booking');
              }
            }
          }
        }

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
        utils.showToast(i18n.t('trip.deleteBookingSuccess') || 'Bookings deleted', 'success');
      } catch (error) {
        console.error('Error deleting bookings:', error);
        utils.showToast(i18n.t('trip.deleteError') || 'Error deleting', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('trip.deleteSelected') || 'Delete selected';
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
   * Show edit booking modal with selection + edit form
   * @param {string} tripId
   */
  function showEditBookingModal(tripId) {
    const existingModal = document.getElementById('edit-booking-modal');
    if (existingModal) existingModal.remove();

    const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab || 'flights';
    const type = currentTab === 'hotels' ? 'hotel' : 'flight';
    const items = type === 'flight'
      ? (currentTripData?.flights || [])
      : (currentTripData?.hotels || []);

    if (items.length === 0) {
      utils.showToast(i18n.t('trip.noBookings') || 'No bookings', 'error');
      return;
    }

    // Build selection list grouped by booking reference (same logic as delete modal "Prenotazioni" tab)
    const groups = {};
    for (const item of items) {
      const key = type === 'flight'
        ? (item.bookingReference || item.id)
        : (item.confirmation || item.id);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    let listHTML = '<div class="edit-booking-list">';
    for (const [ref, groupItems] of Object.entries(groups)) {
      const itemIds = groupItems.map(g => g.id).join(',');
      let sublabel = '';
      if (type === 'flight') {
        sublabel = groupItems.map(f => {
          const dep = f.departure?.code || '???';
          const arr = f.arrival?.code || '???';
          return `${f.flightNumber || ''} ${dep} → ${arr}`;
        }).join(', ');
        const nameSet = new Set();
        for (const f of groupItems) {
          if (f.passengers?.length) {
            f.passengers.forEach(p => p.name && nameSet.add(p.name));
          } else if (f.passenger?.name) {
            nameSet.add(f.passenger.name);
          }
        }
        const passengerNames = [...nameSet];
        const name = passengerNames.join(', ');
        listHTML += `
          <label class="edit-booking-item">
            <input type="radio" name="edit-item" value="${itemIds}" data-type="${type}">
            <span class="edit-booking-item-label">
              <span><strong>${ref}</strong>${name ? ` &middot; ${name}` : ''}</span>
              <span class="edit-booking-item-sub">${sublabel}</span>
            </span>
          </label>`;
      } else {
        sublabel = groupItems.map(h => h.name || 'Hotel').join(', ');
        const nameSet = new Set();
        for (const h of groupItems) {
          if (h.guestName) nameSet.add(h.guestName);
        }
        const names = [...nameSet].join(', ');
        listHTML += `
          <label class="edit-booking-item">
            <input type="radio" name="edit-item" value="${itemIds}" data-type="${type}">
            <span class="edit-booking-item-label">
              <span><strong>${ref}</strong>${names ? ` &middot; ${names}` : ''}</span>
              <span class="edit-booking-item-sub">${sublabel}</span>
            </span>
          </label>`;
      }
    }
    listHTML += '</div>';

    const modalHTML = `
      <div class="modal-overlay" id="edit-booking-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 data-i18n="trip.editBookingTitle">Modifica prenotazione</h2>
            <button class="modal-close" id="edit-booking-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div id="edit-selection-view">${listHTML}</div>
            <div id="edit-form-view" style="display:none"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="edit-booking-cancel" data-i18n="modal.cancel">Annulla</button>
            <button class="btn btn-primary" id="edit-booking-confirm" disabled data-i18n="modal.save">Salva</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('edit-booking-modal');
    const closeBtn = document.getElementById('edit-booking-close');
    const cancelBtn = document.getElementById('edit-booking-cancel');
    const confirmBtn = document.getElementById('edit-booking-confirm');
    const selectionView = document.getElementById('edit-selection-view');
    const formView = document.getElementById('edit-form-view');

    let selectedItemIds = null;

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Handle radio selection → show edit form
    modal.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        selectedItemIds = radio.value.split(',');
        // Highlight selected
        modal.querySelectorAll('.edit-booking-item').forEach(el => el.classList.remove('selected'));
        radio.closest('.edit-booking-item').classList.add('selected');
        // Build and show edit form for the first item of the group
        const item = items.find(i => i.id === selectedItemIds[0]);
        if (item) {
          selectionView.style.display = 'none';
          formView.style.display = '';
          formView.innerHTML = type === 'flight' ? buildFlightEditForm(item) : buildHotelEditForm(item);
          if (type === 'flight' && typeof AirportAutocomplete !== 'undefined') {
            AirportAutocomplete.init(formView);
          }
          confirmBtn.disabled = false;
        }
      });
    });

    const performSave = async () => {
      if (!selectedItemIds || selectedItemIds.length === 0) return;

      // Validate required fields and patterns
      const invalidInput = formView.querySelector('input:invalid');
      if (invalidInput) {
        invalidInput.focus();
        invalidInput.reportValidity();
        return;
      }

      // Validate IATA codes are uppercase 3 letters if provided
      formView.querySelectorAll('input[data-field$=".code"]').forEach(input => {
        if (input.value.trim()) input.value = input.value.trim().toUpperCase();
      });

      // Validate hotel: check-out must be after check-in
      if (type === 'hotel') {
        const checkInDate = formView.querySelector('[data-field="checkIn.date"]')?.value;
        const checkOutDate = formView.querySelector('[data-field="checkOut.date"]')?.value;
        if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
          const field = formView.querySelector('[data-field="checkOut.date"]');
          field.focus();
          field.setCustomValidity(i18n.t('hotel.checkOut') + ' > ' + i18n.t('hotel.checkIn'));
          field.reportValidity();
          field.setCustomValidity('');
          return;
        }
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner-sm"></span>';

      try {
        const updates = type === 'flight'
          ? collectFlightUpdates(formView)
          : collectHotelUpdates(formView);

        // Apply updates to each item in the booking group
        for (const itemId of selectedItemIds) {
          const response = await utils.authFetch('/.netlify/functions/edit-booking', {
            method: 'POST',
            body: JSON.stringify({ tripId, type, itemId, updates })
          });

          if (!response.ok) {
            throw new Error('Failed to save');
          }
        }

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
        utils.showToast(i18n.t('trip.editBookingSuccess') || 'Booking updated', 'success');
      } catch (error) {
        console.error('Error editing booking:', error);
        utils.showToast(i18n.t('trip.editError') || 'Error updating', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('modal.save') || 'Salva';
      }
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', () => {
      // If in form view, go back to selection
      if (formView.style.display !== 'none') {
        formView.style.display = 'none';
        selectionView.style.display = '';
        confirmBtn.disabled = true;
        selectedItemIds = null;
        modal.querySelectorAll('.edit-booking-item').forEach(el => el.classList.remove('selected'));
        modal.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
      } else {
        closeModal();
      }
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    confirmBtn.addEventListener('click', performSave);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    i18n.apply();
  }

  /**
   * Build flight edit form HTML
   */
  function buildFlightEditForm(flight) {
    const isMultiPax = flight.passengers && flight.passengers.length > 1;

    let passengersHTML = '';
    if (isMultiPax) {
      passengersHTML = flight.passengers.map((p, i) => `
        <div class="edit-booking-passenger">
          <div class="edit-booking-passenger-title">${p.name || `Passenger ${i + 1}`}</div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.passengerName') || 'Nome'}</label>
              <input type="text" data-field="passengers.${i}.name" value="${escAttr(p.name)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.passengerType') || 'Tipo'}</label>
              <input type="text" data-field="passengers.${i}.type" value="${escAttr(p.type)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.ticketNumber') || 'Biglietto'}</label>
              <input type="text" data-field="passengers.${i}.ticketNumber" value="${escAttr(p.ticketNumber)}">
            </div>
          </div>
        </div>
      `).join('');
    }

    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.flightInfo') || 'Volo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.date') || 'Data'}</label>
              <input type="date" data-field="date" value="${escAttr(flight.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.flightNumber') || 'Numero volo'}</label>
              <input type="text" data-field="flightNumber" value="${escAttr(flight.flightNumber)}" pattern="[A-Za-z0-9]{2,8}" placeholder="es. AZ1154">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.departureTime') || 'Partenza'}</label>
              <input type="time" data-field="departureTime" value="${escAttr(flight.departureTime)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.arrivalTime') || 'Arrivo'}</label>
              <input type="time" data-field="arrivalTime" value="${escAttr(flight.arrivalTime)}" required>
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.departureInfo') || 'Partenza'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="departure.code" value="${escAttr(flight.departure?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. FCO">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="departure.city" value="${escAttr(flight.departure?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="departure.terminal" value="${escAttr(flight.departure?.terminal)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.arrivalInfo') || 'Arrivo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.iataCode') || 'IATA'}</label>
              <input type="text" data-field="arrival.code" value="${escAttr(flight.arrival?.code)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" placeholder="es. NRT">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.city') || 'Città'}</label>
              <input type="text" data-field="arrival.city" value="${escAttr(flight.arrival?.city)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.terminal') || 'Terminal'}</label>
              <input type="text" data-field="arrival.terminal" value="${escAttr(flight.arrival?.terminal)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('flight.bookingInfo') || 'Prenotazione'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('flight.bookingRef') || 'Riferimento'}</label>
              <input type="text" data-field="bookingReference" value="${escAttr(flight.bookingReference)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.class') || 'Classe'}</label>
              <input type="text" data-field="class" value="${escAttr(flight.class)}">
            </div>
            ${!isMultiPax ? `
            <div class="edit-booking-field">
              <label>${i18n.t('flight.seat') || 'Posto'}</label>
              <input type="text" data-field="seat" value="${escAttr(flight.seat)}" placeholder="es. 12A">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('flight.ticketNumber') || 'Biglietto'}</label>
              <input type="text" data-field="ticketNumber" value="${escAttr(flight.ticketNumber)}">
            </div>
            ` : ''}
          </div>
          ${passengersHTML}
        </div>
      </div>
    `;
  }

  /**
   * Build hotel edit form HTML
   */
  function buildHotelEditForm(hotel) {
    // Resolve roomType to a simple string for editing
    const lang = i18n.getLang();
    let roomTypeVal = '';
    if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
      roomTypeVal = hotel.roomTypes.map(rt => rt[lang] || rt.en || rt).join(', ');
    } else if (hotel.roomType && typeof hotel.roomType === 'object') {
      roomTypeVal = hotel.roomType[lang] || hotel.roomType.en || '';
    } else if (hotel.roomType) {
      roomTypeVal = hotel.roomType;
    }

    return `
      <div class="edit-booking-form">
        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.hotelInfo') || 'Hotel'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field full-width">
              <label>${i18n.t('hotel.hotelInfo') || 'Nome'}</label>
              <input type="text" data-field="name" value="${escAttr(hotel.name)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkIn') || 'Check-in'}</label>
              <input type="date" data-field="checkIn.date" value="${escAttr(hotel.checkIn?.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkIn') || 'Check-in'} - ${i18n.t('common.from') || 'Orario'}</label>
              <input type="time" data-field="checkIn.time" value="${escAttr(hotel.checkIn?.time)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkOut') || 'Check-out'}</label>
              <input type="date" data-field="checkOut.date" value="${escAttr(hotel.checkOut?.date)}" required>
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.checkOut') || 'Check-out'} - ${i18n.t('common.until') || 'Orario'}</label>
              <input type="time" data-field="checkOut.time" value="${escAttr(hotel.checkOut?.time)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.detailsInfo') || 'Dettagli'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.roomType') || 'Tipo camera'}</label>
              <input type="text" data-field="roomType" value="${escAttr(roomTypeVal)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.guestName') || 'Nome ospite'}</label>
              <input type="text" data-field="guestName" value="${escAttr(hotel.guestName)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.phone') || 'Telefono'}</label>
              <input type="tel" data-field="phone" value="${escAttr(hotel.phone)}">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.confirmation') || 'N. Conferma'}</label>
              <input type="text" data-field="confirmationNumber" value="${escAttr(hotel.confirmationNumber)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.addressInfo') || 'Indirizzo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field full-width">
              <label>${i18n.t('hotel.fullAddress') || 'Indirizzo completo'}</label>
              <input type="text" data-field="address.fullAddress" value="${escAttr(hotel.address?.fullAddress)}">
            </div>
          </div>
        </div>

        <div class="edit-booking-section">
          <div class="edit-booking-section-title">
            ${i18n.t('hotel.priceInfo') || 'Prezzo'}
          </div>
          <div class="edit-booking-grid">
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.currency') || 'Valuta'}</label>
              <input type="text" data-field="price.total.currency" value="${escAttr(hotel.price?.total?.currency)}" maxlength="3" placeholder="es. EUR" style="text-transform:uppercase">
            </div>
            <div class="edit-booking-field">
              <label>${i18n.t('hotel.amount') || 'Importo'}</label>
              <input type="number" data-field="price.total.value" value="${escAttr(hotel.price?.total?.value)}" min="0" step="0.01">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Escape attribute value for safe HTML insertion
   */
  function escAttr(val) {
    if (val == null) return '';
    return String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Collect flight form values into an updates object
   */
  function collectFlightUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();

      if (field.startsWith('passengers.')) {
        // passengers.0.name → { passengers: [{ name: val }] }
        const parts = field.split('.');
        const idx = parseInt(parts[1], 10);
        const prop = parts[2];
        if (!updates.passengers) updates.passengers = [];
        while (updates.passengers.length <= idx) updates.passengers.push({});
        updates.passengers[idx][prop] = val;
      } else if (field.startsWith('departure.')) {
        const prop = field.split('.')[1];
        if (!updates.departure) updates.departure = {};
        updates.departure[prop] = val;
      } else if (field.startsWith('arrival.')) {
        const prop = field.split('.')[1];
        if (!updates.arrival) updates.arrival = {};
        updates.arrival[prop] = val;
      } else {
        updates[field] = val;
      }
    });
    return updates;
  }

  /**
   * Collect hotel form values into an updates object
   */
  function collectHotelUpdates(formView) {
    const updates = {};
    formView.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      const val = input.value.trim();

      if (field.startsWith('checkIn.')) {
        const prop = field.split('.')[1];
        if (!updates.checkIn) updates.checkIn = {};
        updates.checkIn[prop] = val;
      } else if (field.startsWith('checkOut.')) {
        const prop = field.split('.')[1];
        if (!updates.checkOut) updates.checkOut = {};
        updates.checkOut[prop] = val;
      } else if (field.startsWith('address.')) {
        const prop = field.split('.')[1];
        if (!updates.address) updates.address = {};
        updates.address[prop] = val;
      } else if (field.startsWith('price.total.')) {
        const prop = field.split('.')[2];
        if (!updates.price) updates.price = {};
        if (!updates.price.total) updates.price.total = {};
        updates.price.total[prop] = val;
      } else {
        updates[field] = val;
      }
    });
    return updates;
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

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
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
                      <div class="passenger-menu-wrapper">
                        <button class="btn-passenger-menu" aria-label="Actions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                            <circle cx="12" cy="19" r="2"></circle>
                          </svg>
                        </button>
                        <div class="passenger-menu-dropdown">
                          ${p.pdfPath ? `
                          <button class="passenger-menu-item" data-action="download-pdf" data-pdf-path="${p.pdfPath}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span data-i18n="flight.downloadPdf">Scarica PDF</span>
                          </button>
                          ` : ''}
                          ${p.pdfPath ? `<div class="passenger-menu-divider"></div>` : ''}
                          <button class="passenger-menu-item passenger-menu-item--danger" data-action="delete-passenger" data-passenger-name="${p.name}" data-booking-ref="${flight.bookingReference}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span data-i18n="passenger.delete">Rimuovi</span>
                          </button>
                        </div>
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
    initPassengerMenus();
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

  // ===========================
  // Custom Activities - Slide-in Panel
  // ===========================

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
          return `<button class="attachment-item" data-path="${att.path}"><span class="attachment-icon">${icon}</span><span class="attachment-name">${att.name}</span></button>`;
        }).join('')}</div>`
      : `<span class="activity-view-value--muted" data-i18n="activity.noAttachments">${i18n.t('activity.noAttachments') || 'No attachments'}</span>`;

    return `
      <div class="activity-view-field">
        <div class="activity-view-label" data-i18n="activity.name">${i18n.t('activity.name') || 'Name'}</div>
        <div class="activity-view-value">${activity.name}</div>
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
        <div class="activity-view-value">${activity.description || `<span class="activity-view-value--muted" data-i18n="activity.noDescription">${i18n.t('activity.noDescription') || 'No description'}</span>`}</div>
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
            <span class="file-preview-name">${att.name}</span>
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
        <input type="text" class="form-input" id="activity-name" maxlength="100" required value="${act.name || ''}" placeholder="${i18n.t('activity.namePlaceholder') || 'e.g. Museum visit, Restaurant...'}">
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
        <textarea class="form-input form-textarea" id="activity-description" rows="3" placeholder="${i18n.t('activity.descriptionPlaceholder') || 'Additional details...'}">${act.description || ''}</textarea>
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
   * Collect non-empty URLs from the form
   * @returns {string[]}
   */
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
    i18n.apply();

    const panel = document.getElementById('activity-panel');
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
      if (!confirm(i18n.t('activity.deleteConfirm') || 'Are you sure you want to delete this activity?')) return;

      const deleteBtn = document.getElementById('activity-delete-btn');
      deleteBtn.disabled = true;

      try {
        const response = await utils.authFetch('/.netlify/functions/manage-activity', {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            tripId: currentTripData.id,
            activityId: activity.id
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        closePanel();
        setTimeout(async () => {
          await loadTripFromUrl();
          switchToTab('activities');
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
          tripId: currentTripData.id,
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
          await loadTripFromUrl();
          switchToTab('activities');
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

  /**
   * Initialize "New activity" button click handlers
   */
  function initNewActivityButtons() {
    document.querySelectorAll('.activity-new-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        showActivityPanel('create', date, null);
      });
    });
  }

  /**
   * Initialize custom activity click handlers (opens view panel)
   */
  function initCustomActivityClicks() {
    document.querySelectorAll('.activity-item-link--custom').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const activityId = link.dataset.activityId;
        const activity = currentTripData.activities?.find(a => a.id === activityId);
        if (activity) {
          showActivityPanel('view', null, activity);
        }
      });
    });
  }

  /**
   * Render activities timeline (day-by-day view)
   * @param {HTMLElement} container
   * @param {Object} tripData
   */
  function renderActivities(container, tripData) {
    const flights = tripData.flights || [];
    const hotels = tripData.hotels || [];
    const customActivities = tripData.activities || [];

    if (flights.length === 0 && hotels.length === 0 && customActivities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" data-i18n="trip.noActivities">No activities</h3>
          <p class="empty-state-text" data-i18n="trip.noActivitiesText">Add a booking to see your activities here</p>
        </div>
      `;
      i18n.apply();
      return;
    }

    const lang = i18n.getLang();
    const oneDay = 24 * 60 * 60 * 1000;
    // Format date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
    const toLocalDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Build events list
    const events = [];

    // Add flight events
    for (const flight of flights) {
      events.push({
        date: flight.date,
        time: flight.departureTime || null,
        type: 'flight',
        data: flight
      });
    }

    // Add hotel events (check-in, stay, check-out are mutually exclusive per day)
    for (const hotel of hotels) {
      const checkInDate = hotel.checkIn?.date;
      const checkOutDate = hotel.checkOut?.date;

      if (checkInDate) {
        events.push({
          date: checkInDate,
          time: hotel.checkIn?.time || null,
          type: 'hotel-checkin',
          data: hotel
        });
      }

      // Stay days: only intermediate days (excludes check-in and check-out)
      if (checkInDate && checkOutDate) {
        const start = new Date(checkInDate + 'T00:00:00');
        const end = new Date(checkOutDate + 'T00:00:00');
        let current = new Date(start.getTime() + oneDay);
        while (current < end) {
          const dateStr = toLocalDateStr(current);
          events.push({
            date: dateStr,
            time: null,
            type: 'hotel-stay',
            data: hotel
          });
          current = new Date(current.getTime() + oneDay);
        }
      }

      if (checkOutDate) {
        events.push({
          date: checkOutDate,
          time: hotel.checkOut?.time || null,
          type: 'hotel-checkout',
          data: hotel
        });
      }
    }

    // Add custom activity events
    for (const activity of customActivities) {
      events.push({
        date: activity.date,
        time: activity.startTime || null,
        type: 'activity',
        data: activity
      });
    }

    // Group by date
    const grouped = {};
    for (const event of events) {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }

    // Generate all trip days from startDate to endDate
    const allDates = [];
    if (tripData.startDate && tripData.endDate) {
      let current = new Date(tripData.startDate + 'T00:00:00');
      const end = new Date(tripData.endDate + 'T00:00:00');
      while (current <= end) {
        allDates.push(toLocalDateStr(current));
        current = new Date(current.getTime() + oneDay);
      }
    }
    // Also include any event dates that fall outside start/end range
    for (const date of Object.keys(grouped)) {
      if (!allDates.includes(date)) allDates.push(date);
    }
    allDates.sort();

    // Sort events within each day: no-time first, then by time, then by type
    const typePriority = { 'hotel-checkout': 0, 'flight': 1, 'hotel-checkin': 2, 'hotel-stay': 3, 'activity': 4 };
    for (const date of allDates) {
      if (grouped[date]) {
        grouped[date].sort((a, b) => {
          const aHasTime = a.time !== null;
          const bHasTime = b.time !== null;
          // Activities without time go first
          if (aHasTime !== bHasTime) return aHasTime ? 1 : -1;
          // Both have time: sort by time
          if (aHasTime && bHasTime && a.time !== b.time) return a.time.localeCompare(b.time);
          // Same time or both no time: sort by type priority
          return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
        });
      }
    }

    const flightIcon = `<span class="material-symbols-outlined activity-icon-flight">travel</span>`;
    const hotelIcon = `<span class="material-symbols-outlined activity-icon-hotel">bed</span>`;
    const customActivityIcon = `<span class="material-symbols-outlined activity-icon-custom">event</span>`;

    // Render
    const html = allDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayNumber = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase().replace('.', '');
      const weekdayShort = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase().replace('.', '');
      const dayEvents = grouped[date] || [];

      const itemsHtml = dayEvents.map(event => {
        let icon = '';
        let text = '';
        let tab = '';
        let itemId = '';
        let isCustom = false;

        if (event.type === 'flight') {
          const dep = event.data.departure?.city || event.data.departure?.code || '';
          const dest = event.data.arrival?.city || event.data.arrival?.code || '';
          text = `${i18n.t('trip.flightFromTo') || 'Flight from'} ${dep} → ${dest}`;
          icon = flightIcon;
          tab = 'flights';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkin') {
          text = `Check-in ${event.data.name || 'Hotel'}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-stay') {
          text = `${i18n.t('hotel.stay') || 'Stay'} ${event.data.name || 'Hotel'}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'hotel-checkout') {
          text = `Check-out ${event.data.name || 'Hotel'}`;
          icon = hotelIcon;
          tab = 'hotels';
          itemId = event.data.id;
        } else if (event.type === 'activity') {
          text = event.data.name;
          icon = customActivityIcon;
          isCustom = true;
          itemId = event.data.id;
        }

        let timeStr = '';
        if (event.time) {
          if (event.type === 'activity' && event.data.endTime) {
            timeStr = `<span class="activity-item-time">${event.time} – ${event.data.endTime}</span>`;
          } else {
            timeStr = `<span class="activity-item-time">${event.time}</span>`;
          }
        }

        const eyeIcon = `<svg class="activity-detail-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

        if (isCustom) {
          return `
            <a class="activity-item activity-item--clickable activity-item-link--custom" href="#" data-activity-id="${itemId}">
              <div class="activity-item-icon">${icon}</div>
              <div class="activity-item-content">
                ${timeStr}
                <span class="activity-item-text">${text}</span>
              </div>
              <span class="activity-item-detail">${eyeIcon}</span>
            </a>
          `;
        }

        return `
          <a class="activity-item activity-item--clickable activity-item-link" href="#" data-tab="${tab}" data-item-id="${itemId}">
            <div class="activity-item-icon">${icon}</div>
            <div class="activity-item-content">
              ${timeStr}
              <span class="activity-item-text">${text}</span>
            </div>
            <span class="activity-item-detail">${eyeIcon}</span>
          </a>
        `;
      }).join('');

      const newActivityBtn = `
        <button class="activity-new-btn" data-date="${date}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span data-i18n="trip.newActivity">${i18n.t('trip.newActivity') || 'New activity'}</span>
        </button>
      `;

      return `
        <div class="activity-day">
          <div class="activity-day-header">
            <div class="activity-day-number">${dayNumber}</div>
            <div class="activity-day-meta">${monthShort}, ${weekdayShort}</div>
          </div>
          <div class="activity-list">
            ${itemsHtml}
            ${newActivityBtn}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    i18n.apply();
    initActivityLinks();
    initNewActivityButtons();
    initCustomActivityClicks();
  }

  /**
   * Initialize activity link click handlers
   */
  function initActivityLinks() {
    document.querySelectorAll('.activity-item-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        const itemId = link.dataset.itemId;
        if (tab) {
          switchToTab(tab);
          if (itemId) {
            setTimeout(() => {
              const card = document.querySelector(`[data-id="${itemId}"]`);
              if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('highlight-card');
                setTimeout(() => card.classList.remove('highlight-card'), 1500);
              }
            }, 100);
          }
        }
      });
    });
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
   * Initialize 3-dot passenger menus (mobile only)
   */
  function initPassengerMenus() {
    document.querySelectorAll('.btn-passenger-menu').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = newBtn.nextElementSibling;
        const wasActive = dropdown.classList.contains('active');

        // Close all open passenger menus
        document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => {
          d.classList.remove('active');
        });

        if (!wasActive) {
          dropdown.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.passenger-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const dropdown = item.closest('.passenger-menu-dropdown');
        dropdown?.classList.remove('active');

        if (action === 'download-pdf') {
          const pdfPath = item.dataset.pdfPath;
          if (!pdfPath) return;

          item.style.opacity = '0.5';
          item.style.pointerEvents = 'none';

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
            item.style.opacity = '';
            item.style.pointerEvents = '';
          }
        } else if (action === 'delete-passenger') {
          showDeletePassengerModal(item.dataset.passengerName, item.dataset.bookingRef);
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.passenger-menu-dropdown.active').forEach(d => {
        d.classList.remove('active');
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

        const activeTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
        closeModal();
        await loadTripFromUrl();
        if (activeTab) switchToTab(activeTab);
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

      const pdfFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 1) {
        utils.showToast(i18n.t('trip.maxFilesReached') || 'You can only upload one file at a time', 'error');
        return;
      }
      if (pdfFiles.length === 1) {
        handleQuickUpload(pdfFiles[0]);
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

      let result;
      try {
        result = await response.json();
      } catch {
        throw Object.assign(new Error('server_error'), { errorCode: `HTTP${response.status}` });
      }

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
        throw Object.assign(
          new Error(result.error || 'Failed to add booking'),
          { errorCode: result.errorCode }
        );
      }

      // Remember current tab, reload, then stay on same tab
      const currentTab = document.querySelector('.segmented-control-btn.active')?.dataset.tab;
      await loadTripFromUrl();
      if (currentTab) switchToTab(currentTab);

      utils.showToast(i18n.t('trip.addSuccess') || 'Booking added', 'success');
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
        if (error.errorCode) errorMessage += ` [${error.errorCode}]`;
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
