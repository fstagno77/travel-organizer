/**
 * Utils - Utility functions
 */

const utils = {
  /**
   * Format date from ISO string to localized format
   * @param {string} dateStr - ISO date string (YYYY-MM-DD)
   * @param {string} lang - Language code
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  formatDate(dateStr, lang = 'en', options = {}) {
    const date = new Date(dateStr + 'T00:00:00');
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    return date.toLocaleDateString(lang, defaultOptions);
  },

  /**
   * Format date for flight display (shorter format)
   * @param {string} dateStr - Date string
   * @param {string} lang - Language code
   * @returns {string} Formatted date
   */
  formatFlightDate(dateStr, lang = 'en') {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Format time (HH:MM)
   * @param {string} time - Time string
   * @returns {string} Formatted time
   */
  formatTime(time) {
    return time;
  },

  /**
   * Format guests count - handles both number and object formats
   * @param {number|object} guests - Guests count or object with adults/children
   * @param {string} lang - Language code
   * @returns {string} Formatted guests string
   */
  formatGuests(guests, lang = 'en') {
    if (!guests) return '-';

    // If it's a simple number, return it
    if (typeof guests === 'number') return String(guests);

    // If it's an object with adults/children
    if (typeof guests === 'object') {
      const adults = guests.adults || 0;
      const children = guests.children;

      // Handle children as number or array
      let childCount = 0;
      let childAges = [];
      if (Array.isArray(children)) {
        childCount = children.length;
        childAges = children.map(c => c.age).filter(a => a);
      } else if (typeof children === 'number') {
        childCount = children;
      }

      const parts = [];
      if (adults > 0) {
        parts.push(`${adults} ${lang === 'it' ? (adults === 1 ? 'adulto' : 'adulti') : (adults === 1 ? 'adult' : 'adults')}`);
      }
      if (childCount > 0) {
        let childStr = `${childCount} ${lang === 'it' ? (childCount === 1 ? 'bambino' : 'bambini') : (childCount === 1 ? 'child' : 'children')}`;
        if (childAges.length > 0) {
          childStr += ` (${childAges.join(', ')} ${lang === 'it' ? 'anni' : 'y/o'})`;
        }
        parts.push(childStr);
      }

      return parts.length > 0 ? parts.join(', ') : (guests.total ? String(guests.total) : '-');
    }

    return String(guests);
  },

  /**
   * Parse flight duration from format like "01:15" or "10:00"
   * @param {string} duration - Duration string (HH:MM)
   * @param {string} lang - Language code
   * @returns {string} Human-readable duration
   */
  formatDuration(duration, lang = 'en') {
    const [hours, minutes] = duration.split(':').map(Number);

    if (lang === 'it') {
      if (hours === 0) return `${minutes}min`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}min`;
    }

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  },

  /**
   * Generate Google Flight tracking URL
   * @param {string} flightNumber - Flight number (e.g., "AZ1154")
   * @returns {string} Google search URL for flight tracking
   */
  getFlightTrackingUrl(flightNumber) {
    return `https://www.google.com/search?q=${flightNumber}`;
  },

  /**
   * Get airport display name
   * @param {object} airport - Airport object with code and name
   * @returns {string} Display string
   */
  formatAirport(airport) {
    return `${airport.code} - ${airport.city}`;
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Load JSON file
   * @param {string} path - Path to JSON file
   * @returns {Promise<object>} Parsed JSON
   */
  async loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading JSON from ${path}:`, error);
      throw error;
    }
  },

  /**
   * Get relative path prefix based on current page depth
   * @returns {string} Path prefix (e.g., "../" or "")
   */
  getPathPrefix() {
    const depth = window.location.pathname.split('/').filter(p => p).length;
    if (depth <= 1) return './';
    return '../'.repeat(depth - 1);
  },

  /**
   * Check if we're on a specific page
   * @param {string} pageName - Page name to check
   * @returns {boolean}
   */
  isPage(pageName) {
    return window.location.pathname.includes(pageName);
  },

  /**
   * Loading phrase rotator - shows entertaining messages during processing
   * @param {HTMLElement} textElement - Element to update with rotating phrases
   * @param {number} interval - Interval in ms between phrases (default 3000)
   * @returns {object} Controller with stop() method
   */
  startLoadingPhrases(textElement, interval = 3000) {
    const phrases = window.i18n?.translations?.loadingPhrases || [];
    if (phrases.length === 0 || !textElement) {
      return { stop: () => {} };
    }

    // Shuffle array to get random order
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    let index = 0;
    let intervalId = null;

    // Show first phrase immediately
    textElement.textContent = shuffled[index];
    textElement.classList.add('phrase-visible');

    // Rotate through phrases
    intervalId = setInterval(() => {
      // Fade out
      textElement.classList.remove('phrase-visible');

      setTimeout(() => {
        // Change text and fade in
        index = (index + 1) % shuffled.length;
        textElement.textContent = shuffled[index];
        textElement.classList.add('phrase-visible');
      }, 300); // Wait for fade out
    }, interval);

    return {
      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
  },

  /**
   * Authenticated fetch - adds Authorization header with JWT token
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async authFetch(url, options = {}) {
    const token = window.auth?.getAccessToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  },

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - 'error' or 'success' (default: 'error')
   * @param {number} duration - Duration in ms (default: 4000)
   */
  showToast(message, type = 'error', duration = 4000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${type === 'error'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        }
      </div>
      <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Auto-hide
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Make available globally
window.utils = utils;
