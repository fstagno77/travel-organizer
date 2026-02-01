/**
 * Auth - Authentication module using Supabase Auth with Google OAuth
 */

const auth = {
  supabase: null,
  session: null,
  profile: null,
  needsUsername: false,
  initialized: false,

  /**
   * Initialize Supabase client and check session
   */
  async init() {
    if (this.initialized) return this;

    // Initialize Supabase client
    // Note: These values should be configured in a config file or env
    this.supabase = supabase.createClient(
      'https://ftivlqthgsziuljruiqo.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aXZscXRoZ3N6aXVsanJ1aXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MTkzMjYsImV4cCI6MjA1MzI5NTMyNn0.sb_publishable_dSUUZC21OaUAFD4az9DKQg_OMM8exnN'
    );

    // Check for existing session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.session = session;

    if (session) {
      await this.loadProfile();
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;

      if (event === 'SIGNED_IN') {
        await this.loadProfile();
        this.handlePostLogin();
      } else if (event === 'SIGNED_OUT') {
        this.profile = null;
        this.needsUsername = false;
        window.location.href = '/';
      }
    });

    this.initialized = true;
    return this;
  },

  /**
   * Load user profile from database
   */
  async loadProfile() {
    if (!this.session) return null;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', this.session.user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile - user needs to create username
        this.needsUsername = true;
        return null;
      }

      if (error) {
        console.error('Error loading profile:', error);
        return null;
      }

      this.profile = data;
      this.needsUsername = false;
      return data;
    } catch (error) {
      console.error('Error in loadProfile:', error);
      return null;
    }
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  },

  /**
   * Sign out
   */
  async signOut() {
    await this.supabase.auth.signOut();
  },

  /**
   * Check if username is available
   */
  async checkUsernameAvailable(username) {
    try {
      const response = await fetch('/.netlify/functions/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const result = await response.json();
      return result.available === true;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  },

  /**
   * Validate username format
   */
  isValidUsername(username) {
    return /^[a-zA-Z0-9]{5,12}$/.test(username);
  },

  /**
   * Create user profile with username
   */
  async createProfile(username) {
    if (!this.session) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('profiles')
      .insert({
        id: this.session.user.id,
        email: this.session.user.email,
        username: username.toLowerCase()
      });

    if (error) throw error;

    this.needsUsername = false;
    await this.loadProfile();
    return this.profile;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    if (!this.session) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', this.session.user.id)
      .select()
      .single();

    if (error) throw error;
    this.profile = data;
    return data;
  },

  /**
   * Handle post-login flow
   */
  handlePostLogin() {
    if (this.needsUsername) {
      this.showUsernameModal();
    } else {
      window.dispatchEvent(new CustomEvent('authStateChanged'));
      // Reload page to refresh data with authenticated user
      window.location.reload();
    }
  },

  /**
   * Get access token for API calls
   */
  getAccessToken() {
    return this.session?.access_token || null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.session && !!this.profile;
  },

  /**
   * Check if user is logged in (has session but may not have profile)
   */
  isLoggedIn() {
    return !!this.session;
  },

  /**
   * Require authentication - shows login modal if not authenticated
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      this.showLoginModal();
      return false;
    }
    if (this.needsUsername) {
      this.showUsernameModal();
      return false;
    }
    return true;
  },

  /**
   * Show login modal
   */
  showLoginModal() {
    // Remove existing modal if any
    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const lang = typeof i18n !== 'undefined' ? i18n.getLang() : 'it';
    const texts = {
      it: {
        title: 'Accedi a Travel Organizer',
        subtitle: 'Gestisci i tuoi viaggi in un unico posto',
        google: 'Continua con Google',
        close: 'Chiudi'
      },
      en: {
        title: 'Login to Travel Organizer',
        subtitle: 'Manage your trips in one place',
        google: 'Continue with Google',
        close: 'Close'
      }
    };
    const t = texts[lang] || texts.it;

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
          <button class="auth-modal-close" aria-label="${t.close}">
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
            <h2 class="auth-modal-title">${t.title}</h2>
            <p class="auth-modal-subtitle">${t.subtitle}</p>
          </div>

          <div class="auth-modal-body">
            <button class="btn-google" id="google-login-btn">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              ${t.google}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const closeBtn = overlay.querySelector('.auth-modal-close');
    const googleBtn = document.getElementById('google-login-btn');

    // Close modal
    const closeModal = () => overlay.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    }, { once: true });

    // Google login
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      try {
        await this.signInWithGoogle();
      } catch (error) {
        console.error('Login error:', error);
        googleBtn.disabled = false;
      }
    });
  },

  /**
   * Show username selection modal
   */
  showUsernameModal() {
    // Remove existing modal if any
    const existing = document.querySelector('.auth-modal-overlay');
    if (existing) existing.remove();

    const lang = typeof i18n !== 'undefined' ? i18n.getLang() : 'it';
    const texts = {
      it: {
        title: 'Scegli un username',
        subtitle: 'Questo nome ti identificherà nell\'app',
        hint: '5-12 caratteri, solo lettere e numeri',
        placeholder: 'Il tuo username',
        continue: 'Continua',
        taken: 'Username già in uso',
        invalid: 'Username non valido'
      },
      en: {
        title: 'Choose a username',
        subtitle: 'This name will identify you in the app',
        hint: '5-12 characters, letters and numbers only',
        placeholder: 'Your username',
        continue: 'Continue',
        taken: 'Username already taken',
        invalid: 'Invalid username'
      }
    };
    const t = texts[lang] || texts.it;

    const modalHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal">
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
                id="username-input"
                class="form-input"
                placeholder="${t.placeholder}"
                maxlength="12"
                autocomplete="off"
              >
              <small class="form-hint">${t.hint}</small>
              <div class="form-error" id="username-error"></div>
            </div>

            <button class="btn btn-primary btn-full" id="submit-username-btn" disabled>
              ${t.continue}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.querySelector('.auth-modal-overlay');
    const input = document.getElementById('username-input');
    const errorDiv = document.getElementById('username-error');
    const submitBtn = document.getElementById('submit-username-btn');

    // Validate on input
    input.addEventListener('input', () => {
      const username = input.value.trim();
      const isValid = this.isValidUsername(username);
      submitBtn.disabled = !isValid;
      errorDiv.textContent = '';

      if (username.length > 0 && !isValid) {
        errorDiv.textContent = t.invalid;
      }
    });

    // Submit username
    submitBtn.addEventListener('click', async () => {
      const username = input.value.trim().toLowerCase();

      if (!this.isValidUsername(username)) {
        errorDiv.textContent = t.invalid;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '...';

      // Check availability
      const available = await this.checkUsernameAvailable(username);
      if (!available) {
        errorDiv.textContent = t.taken;
        submitBtn.disabled = false;
        submitBtn.textContent = t.continue;
        return;
      }

      try {
        await this.createProfile(username);
        overlay.remove();
        window.dispatchEvent(new CustomEvent('authStateChanged'));
        window.location.reload();
      } catch (error) {
        console.error('Error creating profile:', error);
        errorDiv.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = t.continue;
      }
    });

    // Focus input
    input.focus();
  }
};

// Make available globally
window.auth = auth;
