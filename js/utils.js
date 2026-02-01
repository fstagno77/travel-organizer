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
  }
};

// Make available globally
window.utils = utils;
