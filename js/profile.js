/**
 * Profile - Profile page functionality
 */

(async function() {
  'use strict';

  /**
   * Initialize the profile page
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

      // Render profile
      renderProfile();

    } catch (error) {
      console.error('Error initializing profile page:', error);
    }
  }

  /**
   * Render profile content
   */
  function renderProfile() {
    const container = document.getElementById('profile-content');
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

    const initial = profile.username.charAt(0).toUpperCase();
    const lang = i18n.getLang();

    container.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar-large">
          <span class="profile-avatar-text">${initial}</span>
        </div>
        <div class="profile-info">
          <h2 class="profile-username">@${profile.username}</h2>
          <p class="profile-email">${profile.email}</p>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-title" data-i18n="profile.settings">Settings</h3>

        <div class="setting-item">
          <label class="setting-label" data-i18n="profile.language">Language</label>
          <select id="language-select" class="form-select">
            <option value="it" ${profile.language_preference === 'it' ? 'selected' : ''}>Italiano</option>
            <option value="en" ${profile.language_preference === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>

        <div class="setting-item">
          <label class="setting-label" data-i18n="profile.username">Username</label>
          <div class="setting-input-group">
            <input
              type="text"
              id="username-input"
              class="form-input"
              value="${profile.username}"
              maxlength="12"
            >
            <button class="btn btn-secondary" id="change-username-btn" data-i18n="profile.changeUsername">Change</button>
          </div>
          <small class="setting-hint" data-i18n="profile.usernameHint">5-12 characters, alphanumeric only</small>
          <div class="setting-error" id="username-error"></div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="btn btn-danger" id="logout-btn" data-i18n="profile.logout">Logout</button>
      </div>
    `;

    i18n.apply();
    bindProfileEvents();
  }

  /**
   * Bind event listeners for profile actions
   */
  function bindProfileEvents() {
    // Language change
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.addEventListener('change', async (e) => {
        const lang = e.target.value;
        try {
          await auth.updateProfile({ language_preference: lang });
          await i18n.setLang(lang);
          // Re-render navigation to apply translations
          await navigation.init();
          i18n.apply();
        } catch (error) {
          console.error('Error updating language:', error);
        }
      });
    }

    // Username change
    const usernameBtn = document.getElementById('change-username-btn');
    const usernameInput = document.getElementById('username-input');
    const usernameError = document.getElementById('username-error');

    if (usernameBtn && usernameInput && usernameError) {
      usernameBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim().toLowerCase();
        usernameError.textContent = '';

        // Validate format
        if (!auth.isValidUsername(username)) {
          usernameError.textContent = i18n.t('profile.usernameInvalid') || 'Invalid username format';
          return;
        }

        // Check if same as current
        if (username === auth.profile.username) {
          return;
        }

        usernameBtn.disabled = true;

        // Check availability
        const available = await auth.checkUsernameAvailable(username);
        if (!available) {
          usernameError.textContent = i18n.t('profile.usernameTaken') || 'Username already taken';
          usernameBtn.disabled = false;
          return;
        }

        try {
          await auth.updateProfile({ username });
          usernameError.textContent = '';
          // Re-render profile
          renderProfile();
          // Re-render navigation to update avatar
          await navigation.init();
          i18n.apply();
        } catch (error) {
          usernameError.textContent = error.message;
          usernameBtn.disabled = false;
        }
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

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
