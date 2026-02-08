/**
 * Profile/Settings - Settings page functionality
 */

(async function() {
  'use strict';

  // Current active section (from URL hash or default)
  const validSections = ['profile', 'travelers', 'preferences'];
  const hashSection = window.location.hash.replace('#', '');
  let activeSection = validSections.includes(hashSection) ? hashSection : 'profile';

  // Travelers state
  let selectedTravelerId = null;
  let airlinesData = null; // lazy-loaded
  let passportRevealed = false;

  /**
   * Initialize the settings page
   */
  async function init() {
    try {
      // Initialize i18n first
      await i18n.init();

      // Initialize auth
      await auth.init();

      // Apply language preference from profile if available
      if (auth.profile?.language_preference) {
        await i18n.setLang(auth.profile.language_preference);
      }

      // Initialize navigation (header, footer)
      await navigation.init();

      // Re-apply translations
      i18n.apply();

      // Require authentication
      if (!auth.requireAuth()) {
        return;
      }

      // Render settings page
      renderSettingsPage();

    } catch (error) {
      console.error('Error initializing settings page:', error);
    }
  }

  /**
   * Render the settings page with sidebar
   */
  function renderSettingsPage() {
    const container = document.getElementById('settings-page');
    if (!container) return;

    const profile = auth.profile;
    if (!profile) {
      container.innerHTML = `
        <div class="empty-state">
          <p data-i18n="auth.notLoggedIn">Not logged in</p>
        </div>
      `;
      i18n.apply();
      return;
    }

    container.innerHTML = `
      <div class="settings-layout">
        <nav class="settings-sidebar">
          <ul class="settings-nav">
            <div class="settings-nav-indicator"></div>
            <li>
              <button class="settings-nav-item ${activeSection === 'profile' ? 'active' : ''}" data-section="profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span data-i18n="settings.profile">Profilo</span>
              </button>
            </li>
            <li>
              <button class="settings-nav-item ${activeSection === 'travelers' ? 'active' : ''}" data-section="travelers">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span data-i18n="settings.travelers">Viaggiatori</span>
              </button>
            </li>
            <li>
              <button class="settings-nav-item ${activeSection === 'preferences' ? 'active' : ''}" data-section="preferences">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span data-i18n="settings.preferences">Preferenze</span>
              </button>
            </li>
          </ul>
        </nav>

        <div class="settings-content" id="settings-content">
          <!-- Content will be rendered here -->
        </div>
      </div>
    `;

    i18n.apply();
    bindSidebarEvents();
    renderSection(activeSection);
  }

  /**
   * Position the vertical sliding indicator on the active nav item
   */
  function updateSettingsNavIndicator(activeItem) {
    const indicator = document.querySelector('.settings-nav-indicator');
    if (!indicator || !activeItem) return;
    const nav = activeItem.closest('.settings-nav');
    if (!nav) return;
    const li = activeItem.parentElement;
    indicator.style.height = li.offsetHeight + 'px';
    indicator.style.transform = 'translateY(' + li.offsetTop + 'px)';
  }

  /**
   * Bind sidebar navigation events
   */
  function bindSidebarEvents() {
    const navItems = document.querySelectorAll('.settings-nav-item[data-section]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;

        // Update active state
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        updateSettingsNavIndicator(item);

        // Render section
        activeSection = section;
        window.history.replaceState(null, '', `#${section}`);
        renderSection(section);
      });
    });

    // Position indicator on the initially active item (no animation)
    const indicator = document.querySelector('.settings-nav-indicator');
    const activeItem = document.querySelector('.settings-nav-item.active');
    if (indicator && activeItem) {
      indicator.style.transition = 'none';
      updateSettingsNavIndicator(activeItem);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          indicator.style.transition = '';
        });
      });
    }
  }

  /**
   * Render a specific section
   */
  function renderSection(section) {
    const content = document.getElementById('settings-content');
    if (!content) return;

    switch (section) {
      case 'profile':
        renderProfileSection(content);
        break;
      case 'travelers':
        renderTravelersSection(content);
        break;
      case 'preferences':
        renderPreferencesSection(content);
        break;
      default:
        renderProfileSection(content);
    }
  }

  /**
   * Render profile section
   */
  function renderProfileSection(container) {
    const profile = auth.profile;
    const initial = profile.username.charAt(0).toUpperCase();

    container.innerHTML = `
      <div class="settings-section-header">
        <h2 class="settings-section-title" data-i18n="settings.profile">Profilo</h2>
      </div>

      <div class="settings-card">
        <div class="profile-header">
          <div class="profile-avatar-large">
            <span class="profile-avatar-text">${initial}</span>
          </div>
          <div class="profile-header-info">
            <div class="profile-username-row">
              <span class="profile-username">@${profile.username}</span>
              <button class="profile-edit-btn" id="edit-username-btn" title="${i18n.t('profile.changeUsername') || 'Modifica username'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
              </button>
            </div>
            <span class="profile-email">${profile.email}</span>
          </div>
        </div>
      </div>

      <div class="settings-card settings-card-danger">
        <button class="btn btn-danger-outline btn-full" id="logout-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span data-i18n="profile.logout">Disconnetti</span>
        </button>
      </div>
    `;

    i18n.apply();
    bindProfileEvents();
  }

  // =========================================================================
  // TRAVELERS SECTION
  // =========================================================================

  /**
   * Render travelers section
   */
  async function renderTravelersSection(container) {
    container.innerHTML = `
      <div class="settings-section-header">
        <h2 class="settings-section-title" data-i18n="settings.travelers">Viaggiatori</h2>
      </div>
      <div class="settings-card" style="text-align:center; padding: var(--spacing-6);">
        <span class="form-hint">${i18n.t('common.loading')}</span>
      </div>
    `;
    i18n.apply();

    // Ensure owner traveler exists
    await auth.getOrCreateOwnerTraveler();

    // Auto-select first traveler if none selected
    if (!selectedTravelerId && auth.travelers.length > 0) {
      selectedTravelerId = auth.travelers[0].id;
    }

    renderTravelersContent(container);
  }

  /**
   * Render the travelers content (after data is loaded)
   */
  function renderTravelersContent(container) {
    const travelers = auth.travelers;
    const selected = travelers.find(t => t.id === selectedTravelerId) || travelers[0];
    if (!selected) return;

    selectedTravelerId = selected.id;
    passportRevealed = false;

    const displayName = `${selected.first_name} ${selected.last_name}`.trim();
    const youBadge = selected.is_owner ? `<span class="travelers-select-badge">${i18n.t('travelers.you')}</span>` : '';

    // Build traveler dropdown options
    const optionsHTML = travelers.map(t => {
      const name = `${t.first_name} ${t.last_name}`.trim() || '—';
      const badge = t.is_owner ? ` <span class="travelers-select-badge">${i18n.t('travelers.you')}</span>` : '';
      return `<button class="travelers-select-option ${t.id === selected.id ? 'active' : ''}" data-traveler-id="${t.id}">${name}${badge}</button>`;
    }).join('');

    // Passport fields
    const passportNumber = selected.passport_number || '';
    const maskedPassport = passportNumber ? maskValue(passportNumber) : '';
    const issueDate = selected.passport_issue_date ? formatDate(selected.passport_issue_date) : '';
    const expiryDate = selected.passport_expiry_date ? formatDate(selected.passport_expiry_date) : '';
    const hasPassportData = passportNumber || issueDate || expiryDate;

    // Loyalty programs
    const programs = selected.loyalty_programs || [];

    container.innerHTML = `
      <div class="settings-section-header">
        <h2 class="settings-section-title" data-i18n="settings.travelers">Viaggiatori</h2>
      </div>

      <!-- Traveler selector -->
      <div class="travelers-header">
        <div class="travelers-select-wrapper">
          <button class="travelers-select-btn" id="travelers-select-btn">
            <span class="travelers-select-name">${displayName || '—'}${youBadge ? ' ' : ''}${youBadge}</span>
            <svg class="travelers-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="travelers-select-menu" id="travelers-select-menu">
            ${optionsHTML}
          </div>
        </div>
        <button class="travelers-add-btn" id="add-companion-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          ${i18n.t('travelers.addCompanion')}
        </button>
      </div>

      <!-- Name display with edit -->
      <div class="settings-card travelers-card">
        <div class="travelers-name-display">
          <span class="travelers-name-text">${displayName || '—'}</span>
          <button class="profile-edit-btn" id="edit-name-btn" title="${i18n.t('travelers.edit')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Passport -->
      <div class="settings-card travelers-card" id="passport-card">
        <div class="travelers-section-label">${i18n.t('travelers.passport')}</div>
        ${hasPassportData ? renderPassportFields(passportNumber, maskedPassport, issueDate, expiryDate) : ''}
        <button class="travelers-add-program-btn" id="edit-passport-btn">
          ${hasPassportData ? `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
          ${i18n.t('travelers.editData')}` : `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          ${i18n.t('travelers.passport')}`}
        </button>
      </div>

      <!-- Loyalty Programs -->
      <div class="settings-card travelers-card" id="loyalty-card">
        <div class="travelers-section-label">${i18n.t('travelers.loyaltyPrograms')}</div>
        ${programs.length > 0 ? renderLoyaltyPrograms(programs) : `<div class="travelers-field-empty">${i18n.t('travelers.noPrograms')}</div>`}
        <button class="travelers-add-program-btn" id="add-program-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          ${i18n.t('travelers.addProgram')}
        </button>
      </div>

      ${!selected.is_owner ? `
      <div class="travelers-delete-section">
        <button class="travelers-delete-btn" id="delete-companion-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          ${i18n.t('travelers.deleteCompanion')}
        </button>
      </div>` : ''}
    `;

    i18n.apply();
    bindTravelersEvents();
  }

  /**
   * Render passport fields in view mode
   */
  function renderPassportFields(passportNumber, maskedPassport, issueDate, expiryDate) {
    const emptyLabel = '—';
    return `
      <div class="travelers-fields">
        ${passportNumber ? `
        <div class="travelers-field">
          <span class="travelers-field-label">${i18n.t('travelers.passportNumber')}</span>
          <span class="travelers-field-value ${passportRevealed ? '' : 'masked'}" id="passport-value">${passportRevealed ? escapeHtml(passportNumber) : maskedPassport}</span>
          <div class="travelers-field-actions">
            <button class="travelers-icon-btn" id="toggle-passport-btn" title="${passportRevealed ? i18n.t('travelers.hide') : i18n.t('travelers.show')}">
              ${passportRevealed ? eyeOffIcon() : eyeIcon()}
            </button>
            <button class="travelers-icon-btn" data-copy="${escapeAttr(passportNumber)}" title="${i18n.t('travelers.copied')}">
              ${copyIcon()}
            </button>
          </div>
        </div>` : ''}
        ${issueDate ? `
        <div class="travelers-field">
          <span class="travelers-field-label">${i18n.t('travelers.issueDate')}</span>
          <span class="travelers-field-value">${issueDate}</span>
          <div class="travelers-field-actions">
            <button class="travelers-icon-btn" data-copy="${escapeAttr(issueDate)}" title="${i18n.t('travelers.copied')}">
              ${copyIcon()}
            </button>
          </div>
        </div>` : ''}
        ${expiryDate ? `
        <div class="travelers-field">
          <span class="travelers-field-label">${i18n.t('travelers.expiryDate')}</span>
          <span class="travelers-field-value">${expiryDate}</span>
          <div class="travelers-field-actions">
            <button class="travelers-icon-btn" data-copy="${escapeAttr(expiryDate)}" title="${i18n.t('travelers.copied')}">
              ${copyIcon()}
            </button>
          </div>
        </div>` : ''}
      </div>
    `;
  }

  /**
   * Render empty passport state
   */
  function renderEmptyPassport() {
    return `<div class="travelers-field-empty">${i18n.t('travelers.noData')}</div>`;
  }

  /**
   * Render loyalty programs list
   */
  function renderLoyaltyPrograms(programs) {
    return `<div class="travelers-fields">
      ${programs.map((p, idx) => `
        <div class="travelers-loyalty-item">
          <div class="travelers-loyalty-info">
            <div class="travelers-loyalty-airline">${escapeHtml(p.airline)}</div>
            <div class="travelers-loyalty-program">${escapeHtml(p.program)}</div>
          </div>
          <span class="travelers-loyalty-number">${escapeHtml(p.number)}</span>
          <div class="travelers-field-actions">
            <button class="travelers-icon-btn" data-copy="${escapeAttr(p.number)}" title="${i18n.t('travelers.copied')}">
              ${copyIcon()}
            </button>
            <button class="travelers-icon-btn" data-edit-program="${idx}" title="${i18n.t('travelers.edit')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
            <button class="travelers-loyalty-remove" data-remove-program="${idx}" title="${i18n.t('common.cancel')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  /**
   * Bind travelers section events
   */
  function bindTravelersEvents() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    // Dropdown toggle
    const selectBtn = document.getElementById('travelers-select-btn');
    const selectMenu = document.getElementById('travelers-select-menu');
    if (selectBtn && selectMenu) {
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMenu.classList.toggle('active');
        selectBtn.classList.toggle('active');
      });

      document.addEventListener('click', function closeDropdown() {
        selectMenu.classList.remove('active');
        selectBtn.classList.remove('active');
      });

      // Traveler selection
      selectMenu.querySelectorAll('.travelers-select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedTravelerId = opt.dataset.travelerId;
          selectMenu.classList.remove('active');
          selectBtn.classList.remove('active');
          renderTravelersContent(content);
        });
      });
    }

    // Add companion
    const addBtn = document.getElementById('add-companion-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => showAddCompanionModal());
    }

    // Edit name
    const editNameBtn = document.getElementById('edit-name-btn');
    if (editNameBtn) {
      editNameBtn.addEventListener('click', () => showEditNameModal());
    }

    // Toggle passport visibility
    const togglePassportBtn = document.getElementById('toggle-passport-btn');
    if (togglePassportBtn) {
      togglePassportBtn.addEventListener('click', () => {
        passportRevealed = !passportRevealed;
        renderTravelersContent(content);
      });
    }

    // Edit passport
    const editPassportBtn = document.getElementById('edit-passport-btn');
    if (editPassportBtn) {
      editPassportBtn.addEventListener('click', () => showEditPassportModal());
    }

    // Add loyalty program
    const addProgramBtn = document.getElementById('add-program-btn');
    if (addProgramBtn) {
      addProgramBtn.addEventListener('click', () => showAirlineSearchModal());
    }

    // Copy buttons
    content.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(() => {
          btn.classList.add('copied');
          const origHTML = btn.innerHTML;
          btn.innerHTML = checkIcon();
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origHTML;
          }, 1500);
        });
      });
    });

    // Edit loyalty program
    content.querySelectorAll('[data-edit-program]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.editProgram);
        const selected = auth.travelers.find(t => t.id === selectedTravelerId);
        if (!selected) return;
        const program = (selected.loyalty_programs || [])[idx];
        if (program) showEditLoyaltyModal(program, idx);
      });
    });

    // Remove loyalty program
    content.querySelectorAll('[data-remove-program]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.removeProgram);
        const selected = auth.travelers.find(t => t.id === selectedTravelerId);
        if (!selected) return;

        const programs = [...(selected.loyalty_programs || [])];
        programs.splice(idx, 1);

        try {
          await auth.saveTraveler({ id: selected.id, loyalty_programs: programs });
          renderTravelersContent(content);
        } catch (error) {
          console.error('Error removing program:', error);
        }
      });
    });

    // Delete companion
    const deleteBtn = document.getElementById('delete-companion-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => showDeleteCompanionConfirm());
    }
  }

  // =========================================================================
  // TRAVELERS MODALS
  // =========================================================================

  /**
   * Show add companion modal
   */
  function showAddCompanionModal() {
    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="16" y1="11" x2="22" y2="11"></line>
              </svg>
            </div>
            <h2 class="auth-modal-title">${i18n.t('travelers.addCompanionTitle')}</h2>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <input type="text" id="companion-first-name" class="form-input" placeholder="${i18n.t('travelers.firstName')}" autocomplete="off">
            </div>
            <div class="form-group">
              <input type="text" id="companion-last-name" class="form-input" placeholder="${i18n.t('travelers.lastName')}" autocomplete="off">
            </div>
            <div class="form-error" id="companion-error"></div>
            <button class="btn btn-primary btn-full" id="save-companion-btn">${i18n.t('travelers.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const firstNameInput = document.getElementById('companion-first-name');
    const lastNameInput = document.getElementById('companion-last-name');
    const errorDiv = document.getElementById('companion-error');
    const saveBtn = document.getElementById('save-companion-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    firstNameInput.focus();

    saveBtn.addEventListener('click', async () => {
      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();

      if (!firstName || !lastName) {
        errorDiv.textContent = i18n.t('travelers.noData');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      try {
        const newTraveler = await auth.saveTraveler({
          first_name: firstName,
          last_name: lastName,
          sort_order: auth.travelers.length
        });
        selectedTravelerId = newTraveler.id;
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
        utils.showToast(i18n.t('travelers.saved'), 'success');
      } catch (error) {
        console.error('Error adding companion:', error);
        errorDiv.textContent = error?.message || String(error);
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('travelers.save');
      }
    });

    // Enter key support
    lastNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
  }

  /**
   * Show edit name modal
   */
  function showEditNameModal() {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </div>
            <h2 class="auth-modal-title">${i18n.t('travelers.edit')}</h2>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <input type="text" id="edit-first-name" class="form-input" placeholder="${i18n.t('travelers.firstName')}" value="${escapeAttr(selected.first_name)}" autocomplete="off">
            </div>
            <div class="form-group">
              <input type="text" id="edit-last-name" class="form-input" placeholder="${i18n.t('travelers.lastName')}" value="${escapeAttr(selected.last_name)}" autocomplete="off">
            </div>
            <div class="form-error" id="edit-name-error"></div>
            <button class="btn btn-primary btn-full" id="save-name-btn">${i18n.t('travelers.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const firstNameInput = document.getElementById('edit-first-name');
    const lastNameInput = document.getElementById('edit-last-name');
    const errorDiv = document.getElementById('edit-name-error');
    const saveBtn = document.getElementById('save-name-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    firstNameInput.focus();
    firstNameInput.select();

    saveBtn.addEventListener('click', async () => {
      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();

      if (!firstName || !lastName) {
        errorDiv.textContent = i18n.t('travelers.noData');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      try {
        await auth.saveTraveler({ id: selected.id, first_name: firstName, last_name: lastName });
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
        utils.showToast(i18n.t('travelers.saved'), 'success');
      } catch (error) {
        console.error('Error updating name:', error);
        errorDiv.textContent = error?.message || String(error);
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('travelers.save');
      }
    });

    lastNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
  }

  /**
   * Show edit passport modal
   */
  function showEditPassportModal() {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2"/>
                <circle cx="12" cy="11" r="3"/>
                <path d="M7 17h10"/>
              </svg>
            </div>
            <h2 class="auth-modal-title">${i18n.t('travelers.passport')}</h2>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <label class="form-hint">${i18n.t('travelers.passportNumber')}</label>
              <input type="text" id="edit-passport-number" class="form-input" placeholder="AA1234567" value="${escapeAttr(selected.passport_number || '')}" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-hint">${i18n.t('travelers.issueDate')}</label>
              <input type="date" id="edit-passport-issue" class="form-input" value="${selected.passport_issue_date || ''}">
            </div>
            <div class="form-group">
              <label class="form-hint">${i18n.t('travelers.expiryDate')}</label>
              <input type="date" id="edit-passport-expiry" class="form-input" value="${selected.passport_expiry_date || ''}">
            </div>
            <div class="form-error" id="edit-passport-error"></div>
            <button class="btn btn-primary btn-full" id="save-passport-btn">${i18n.t('travelers.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const passportInput = document.getElementById('edit-passport-number');
    const issueInput = document.getElementById('edit-passport-issue');
    const expiryInput = document.getElementById('edit-passport-expiry');
    const errorDiv = document.getElementById('edit-passport-error');
    const saveBtn = document.getElementById('save-passport-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    passportInput.focus();

    saveBtn.addEventListener('click', async () => {
      const passportVal = passportInput.value.trim();
      const issueVal = issueInput.value;
      const expiryVal = expiryInput.value;

      if (!passportVal || !issueVal || !expiryVal) {
        errorDiv.textContent = i18n.t('travelers.noData');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      try {
        await auth.saveTraveler({
          id: selected.id,
          passport_number: passportVal,
          passport_issue_date: issueVal,
          passport_expiry_date: expiryVal
        });
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
        utils.showToast(i18n.t('travelers.saved'), 'success');
      } catch (error) {
        console.error('Error updating passport:', error);
        errorDiv.textContent = error?.message || String(error);
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('travelers.save');
      }
    });
  }

  /**
   * Show airline search modal
   */
  async function showAirlineSearchModal() {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    // Lazy-load airlines data
    if (!airlinesData) {
      try {
        const response = await fetch('./data/airlines.json');
        airlinesData = await response.json();
      } catch (error) {
        console.error('Error loading airlines data:', error);
        airlinesData = [];
      }
    }

    // Filter out airlines already added
    const existingIata = (selected.loyalty_programs || []).map(p => p.iata);

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
              </svg>
            </div>
            <h2 class="auth-modal-title">${i18n.t('travelers.selectAirline')}</h2>
          </div>

          <div class="auth-modal-body">
            <div class="airline-search-container">
              <input type="text" id="airline-search-input" class="airline-search-input" placeholder="${i18n.t('travelers.searchAirline')}" autocomplete="off">
            </div>
            <div class="airline-search-results" id="airline-search-results">
              ${renderAirlineList(airlinesData, existingIata, '')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const searchInput = document.getElementById('airline-search-input');
    const resultsDiv = document.getElementById('airline-search-results');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    searchInput.focus();

    // Search filtering
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      resultsDiv.innerHTML = renderAirlineList(airlinesData, existingIata, query);
      bindAirlineResultEvents(resultsDiv, closeModal);
    });

    bindAirlineResultEvents(resultsDiv, closeModal);
  }

  /**
   * Render airline search results list
   */
  function renderAirlineList(airlines, existingIata, query) {
    let filtered = airlines.filter(a => !existingIata.includes(a.codice_iata));

    if (query) {
      filtered = filtered.filter(a =>
        a.nome_compagnia.toLowerCase().includes(query) ||
        a.codice_iata.toLowerCase().includes(query) ||
        (a.programma_fedelta && a.programma_fedelta.toLowerCase().includes(query))
      );
    }

    if (filtered.length === 0) {
      return `<div class="airline-search-empty">${i18n.t('travelers.noResults')}</div>`;
    }

    return filtered.map(a => `
      <button class="airline-search-item" data-airline='${escapeAttr(JSON.stringify(a))}'>
        <span class="airline-search-iata">${escapeHtml(a.codice_iata)}</span>
        <span class="airline-search-name">${escapeHtml(a.nome_compagnia)}</span>
        <span class="airline-search-program">${escapeHtml(a.programma_fedelta)}</span>
      </button>
    `).join('');
  }

  /**
   * Bind click events on airline search results
   */
  function bindAirlineResultEvents(resultsDiv, closeModal) {
    resultsDiv.querySelectorAll('.airline-search-item').forEach(item => {
      item.addEventListener('click', async () => {
        const airline = JSON.parse(item.dataset.airline);
        closeModal();
        showLoyaltyNumberModal(airline);
      });
    });
  }

  /**
   * Show modal to enter loyalty number after selecting airline
   */
  function showLoyaltyNumberModal(airline) {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
              </svg>
            </div>
            <h2 class="auth-modal-title">${escapeHtml(airline.nome_compagnia)}</h2>
            <p class="auth-modal-subtitle">${escapeHtml(airline.programma_fedelta)}</p>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <label class="form-hint">${i18n.t('travelers.memberNumber')}</label>
              <input type="text" id="loyalty-number-input" class="form-input" placeholder="${i18n.t('travelers.memberNumber')}" autocomplete="off" style="font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
            </div>
            <div class="form-error" id="loyalty-number-error"></div>
            <button class="btn btn-primary btn-full" id="save-loyalty-btn">${i18n.t('travelers.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const numberInput = document.getElementById('loyalty-number-input');
    const errorDiv = document.getElementById('loyalty-number-error');
    const saveBtn = document.getElementById('save-loyalty-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    numberInput.focus();

    saveBtn.addEventListener('click', async () => {
      const number = numberInput.value.trim();
      if (!number) {
        errorDiv.textContent = i18n.t('travelers.noData');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      const programs = [...(selected.loyalty_programs || [])];
      programs.push({
        airline: airline.nome_compagnia,
        iata: airline.codice_iata,
        program: airline.programma_fedelta,
        number: number
      });

      try {
        await auth.saveTraveler({ id: selected.id, loyalty_programs: programs });
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
        utils.showToast(i18n.t('travelers.saved'), 'success');
      } catch (error) {
        console.error('Error saving loyalty program:', error);
        errorDiv.textContent = error?.message || String(error);
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('travelers.save');
      }
    });

    numberInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
  }

  /**
   * Show modal to edit an existing loyalty program number
   */
  function showEditLoyaltyModal(program, idx) {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
              </svg>
            </div>
            <h2 class="auth-modal-title">${escapeHtml(program.airline)}</h2>
            <p class="auth-modal-subtitle">${escapeHtml(program.program)}</p>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <label class="form-hint">${i18n.t('travelers.memberNumber')}</label>
              <input type="text" id="edit-loyalty-number-input" class="form-input" value="${escapeAttr(program.number)}" autocomplete="off" style="font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
            </div>
            <div class="form-error" id="edit-loyalty-error"></div>
            <button class="btn btn-primary btn-full" id="save-edit-loyalty-btn">${i18n.t('travelers.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const numberInput = document.getElementById('edit-loyalty-number-input');
    const errorDiv = document.getElementById('edit-loyalty-error');
    const saveBtn = document.getElementById('save-edit-loyalty-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    numberInput.focus();
    numberInput.select();

    saveBtn.addEventListener('click', async () => {
      const number = numberInput.value.trim();
      if (!number) {
        errorDiv.textContent = i18n.t('travelers.noData');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      const programs = [...(selected.loyalty_programs || [])];
      programs[idx] = { ...programs[idx], number: number };

      try {
        await auth.saveTraveler({ id: selected.id, loyalty_programs: programs });
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
        utils.showToast(i18n.t('travelers.saved'), 'success');
      } catch (error) {
        console.error('Error updating loyalty program:', error);
        errorDiv.textContent = error?.message || String(error);
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t('travelers.save');
      }
    });

    numberInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
  }

  /**
   * Show delete companion confirmation
   */
  function showDeleteCompanionConfirm() {
    const selected = auth.travelers.find(t => t.id === selectedTravelerId);
    if (!selected || selected.is_owner) return;

    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const displayName = `${selected.first_name} ${selected.last_name}`.trim();

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${i18n.t('travelers.cancel')}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo" style="background: var(--color-error);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h2 class="auth-modal-title">${i18n.t('travelers.deleteCompanion')}</h2>
            <p class="auth-modal-subtitle">${escapeHtml(displayName)}</p>
          </div>

          <div class="auth-modal-body">
            <p style="text-align: center; color: var(--color-text-secondary); font-size: var(--font-size-sm);">${i18n.t('travelers.deleteConfirm')}</p>
            <button class="btn btn-full" id="confirm-delete-btn" style="background: var(--color-error); color: white; border: none;">${i18n.t('travelers.deleteCompanion')}</button>
            <button class="btn btn-full travelers-btn-cancel" id="cancel-delete-btn">${i18n.t('travelers.cancel')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '...';

      try {
        await auth.deleteTraveler(selected.id);
        selectedTravelerId = auth.travelers[0]?.id || null;
        closeModal();
        renderTravelersContent(document.getElementById('settings-content'));
      } catch (error) {
        console.error('Error deleting companion:', error);
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n.t('travelers.deleteCompanion');
      }
    });
  }

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  /**
   * Mask a sensitive value, showing only last 4 chars
   */
  function maskValue(value) {
    if (!value || value.length <= 4) return value;
    return '\u2022'.repeat(value.length - 4) + value.slice(-4);
  }

  /**
   * Format a date string (YYYY-MM-DD) to dd/mm/yyyy
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Escape HTML entities
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Escape for HTML attribute
   */
  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // SVG Icons
  function copyIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  function checkIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  function eyeIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  function eyeOffIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  }

  // =========================================================================
  // EXISTING SECTIONS (unchanged)
  // =========================================================================

  /**
   * Render preferences section
   */
  function renderPreferencesSection(container) {
    const profile = auth.profile;
    const currentLang = profile.language_preference || 'it';
    const langFlag = currentLang === 'it' ? '\u{1F1EE}\u{1F1F9}' : '\u{1F1EC}\u{1F1E7}';
    const langName = currentLang === 'it' ? 'Italiano' : 'English';

    container.innerHTML = `
      <div class="settings-section-header">
        <h2 class="settings-section-title" data-i18n="settings.preferences">Preferenze</h2>
      </div>

      <div class="settings-card">
        <div class="settings-item">
          <div class="settings-item-label">
            <span class="settings-item-title" data-i18n="profile.language">Lingua</span>
            <span class="settings-item-desc" data-i18n="settings.languageDesc">Seleziona la lingua dell'interfaccia</span>
          </div>
          <div class="settings-item-control">
            <div class="lang-dropdown-wrapper">
              <button class="lang-dropdown-btn" id="lang-dropdown-btn">
                <span class="lang-dropdown-flag">${langFlag}</span>
                <span class="lang-dropdown-name">${langName}</span>
                <svg class="lang-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="lang-dropdown-menu" id="lang-dropdown-menu">
                <button class="lang-dropdown-option ${currentLang === 'it' ? 'active' : ''}" data-lang="it">
                  <span class="lang-dropdown-option-flag">\u{1F1EE}\u{1F1F9}</span>
                  <span>Italiano</span>
                </button>
                <button class="lang-dropdown-option ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
                  <span class="lang-dropdown-option-flag">\u{1F1EC}\u{1F1E7}</span>
                  <span>English</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    i18n.apply();
    bindPreferencesEvents();
  }

  /**
   * Bind profile section events
   */
  function bindProfileEvents() {
    // Edit username - open modal
    const editUsernameBtn = document.getElementById('edit-username-btn');
    if (editUsernameBtn) {
      editUsernameBtn.addEventListener('click', () => {
        showEditUsernameModal();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        try {
          await auth.signOut();
        } catch (error) {
          console.error('Error logging out:', error);
          logoutBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Show edit username modal (similar to creation modal)
   */
  function showEditUsernameModal() {
    // Remove existing modal if any
    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const lang = i18n.getLang();
    const texts = {
      it: {
        title: 'Modifica username',
        subtitle: 'Scegli un nuovo username',
        hint: '5-12 caratteri, solo lettere e numeri',
        placeholder: 'Il tuo username',
        save: 'Salva',
        cancel: 'Annulla',
        taken: 'Username gi\u00e0 in uso',
        invalid: 'Username non valido'
      },
      en: {
        title: 'Edit username',
        subtitle: 'Choose a new username',
        hint: '5-12 characters, letters and numbers only',
        placeholder: 'Your username',
        save: 'Save',
        cancel: 'Cancel',
        taken: 'Username already taken',
        invalid: 'Invalid username'
      }
    };
    const t = texts[lang] || texts.it;
    const currentUsername = auth.profile.username;

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${t.cancel}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-modal-header">
            <div class="auth-modal-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2 class="auth-modal-title">${t.title}</h2>
            <p class="auth-modal-subtitle">${t.subtitle}</p>
          </div>

          <div class="auth-modal-body">
            <div class="form-group">
              <input
                type="text"
                id="edit-username-input"
                class="form-input"
                placeholder="${t.placeholder}"
                value="${currentUsername}"
                maxlength="12"
                autocomplete="off"
              >
              <small class="form-hint">${t.hint}</small>
              <div class="form-error" id="edit-username-error"></div>
            </div>

            <button class="btn btn-primary btn-full" id="save-username-btn">
              ${t.save}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const input = document.getElementById('edit-username-input');
    const errorDiv = document.getElementById('edit-username-error');
    const saveBtn = document.getElementById('save-username-btn');

    // Close modal
    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

    // Focus and select input
    input.focus();
    input.select();

    // Validate on input
    input.addEventListener('input', () => {
      const username = input.value.trim();
      errorDiv.textContent = '';

      if (username.length > 0 && !auth.isValidUsername(username)) {
        errorDiv.textContent = t.invalid;
      }
    });

    // Save username
    saveBtn.addEventListener('click', async () => {
      const username = input.value.trim().toLowerCase();

      if (!auth.isValidUsername(username)) {
        errorDiv.textContent = t.invalid;
        return;
      }

      // Check if same as current
      if (username === currentUsername) {
        closeModal();
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '...';

      // Check availability
      const available = await auth.checkUsernameAvailable(username);
      if (!available) {
        errorDiv.textContent = t.taken;
        saveBtn.disabled = false;
        saveBtn.textContent = t.save;
        return;
      }

      try {
        await auth.updateProfile({ username });
        closeModal();
        // Re-render
        renderSection('profile');
        await navigation.init();
        i18n.apply();
      } catch (error) {
        console.error('Error updating username:', error);
        errorDiv.textContent = error.message;
        saveBtn.disabled = false;
        saveBtn.textContent = t.save;
      }
    });

    // Enter key to save
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });
  }

  /**
   * Bind preferences section events
   */
  function bindPreferencesEvents() {
    const dropdownBtn = document.getElementById('lang-dropdown-btn');
    const dropdownMenu = document.getElementById('lang-dropdown-menu');

    if (dropdownBtn && dropdownMenu) {
      // Toggle dropdown
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
        dropdownBtn.classList.toggle('active');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        dropdownBtn.classList.remove('active');
      });

      // Language selection
      const options = dropdownMenu.querySelectorAll('.lang-dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', async (e) => {
          e.stopPropagation();
          const lang = option.dataset.lang;

          // Close dropdown
          dropdownMenu.classList.remove('active');
          dropdownBtn.classList.remove('active');

          try {
            await auth.updateProfile({ language_preference: lang });
            await i18n.setLang(lang);
            // Re-render navigation and settings page
            await navigation.init();
            renderSettingsPage();
          } catch (error) {
            console.error('Error updating language:', error);
          }
        });
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
