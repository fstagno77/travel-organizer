/**
 * Profile/Settings - Settings page functionality
 */

(async function() {
  'use strict';

  // Current active section
  let activeSection = 'profile';

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
            <li>
              <button class="settings-nav-item active" data-section="profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span data-i18n="settings.profile">Profilo</span>
              </button>
            </li>
            <li>
              <button class="settings-nav-item" data-section="preferences">
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

        // Render section
        activeSection = section;
        renderSection(section);
      });
    });
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

  /**
   * Render preferences section
   */
  function renderPreferencesSection(container) {
    const profile = auth.profile;
    const currentLang = profile.language_preference || 'it';
    const langFlag = currentLang === 'it' ? '🇮🇹' : '🇬🇧';
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
                  <span class="lang-dropdown-option-flag">🇮🇹</span>
                  <span>Italiano</span>
                </button>
                <button class="lang-dropdown-option ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
                  <span class="lang-dropdown-option-flag">🇬🇧</span>
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
        taken: 'Username già in uso',
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
