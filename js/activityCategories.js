/**
 * Activity Categories - Constants, SVG icons, colors, and auto-detection
 * Single source of truth for the category system used across the activities tab.
 */
(function() {
  'use strict';

  // SVG icons (16x16, stroke-based)
  const ICONS = {
    restaurant: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    flight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    hotel: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M9 16h.01"/><path d="M15 16h.01"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>`,
    museum: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-4 7 4v12"/><path d="M9 20v-4h6v4"/></svg>`,
    camera: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    train: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg>`,
    explore: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    // UI icons
    search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    filter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    plusCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    externalLink: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
  };

  // Material Symbols helper (font-size inherited from container CSS)
  const msIcon = (name) => `<span class="material-symbols-outlined">${name}</span>`;

  const CATEGORIES = {
    ristorante: {
      key: 'ristorante',
      labelIt: 'Ristorante',
      labelEn: 'Restaurant',
      svg: msIcon('restaurant'),
      gradient: 'linear-gradient(135deg, #fbbf24, #f97316)',
      gradientHover: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      color: '#f59e0b',
      hoverBg: '#fffbeb',
      cardBg: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
      cardBorder: '#fde68a'
    },
    volo: {
      key: 'volo',
      labelIt: 'Volo',
      labelEn: 'Flight',
      svg: ICONS.flight,
      gradient: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
      gradientHover: 'linear-gradient(135deg, #2563eb, #4338ca)',
      color: '#2563eb',
      hoverBg: '#eff6ff',
      cardBg: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
      cardBorder: '#bfdbfe'
    },
    hotel: {
      key: 'hotel',
      labelIt: 'Hotel',
      labelEn: 'Hotel',
      svg: msIcon('bed'),
      gradient: 'linear-gradient(135deg, #34d399, #14b8a6)',
      gradientHover: 'linear-gradient(135deg, #10b981, #0d9488)',
      color: '#10b981',
      hoverBg: '#ecfdf5',
      cardBg: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)',
      cardBorder: '#a7f3d0'
    },
    museo: {
      key: 'museo',
      labelIt: 'Museo',
      labelEn: 'Museum',
      svg: ICONS.museum,
      gradient: 'linear-gradient(135deg, #c084fc, #a855f7)',
      gradientHover: 'linear-gradient(135deg, #a855f7, #9333ea)',
      color: '#a855f7',
      hoverBg: '#faf5ff',
      cardBg: 'linear-gradient(135deg, #faf5ff, #faf5ff)',
      cardBorder: '#e9d5ff'
    },
    attrazione: {
      key: 'attrazione',
      labelIt: 'Attrazione',
      labelEn: 'Attraction',
      svg: ICONS.camera,
      gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
      gradientHover: 'linear-gradient(135deg, #ec4899, #db2777)',
      color: '#ec4899',
      hoverBg: '#fdf2f8',
      cardBg: 'linear-gradient(135deg, #fdf2f8, #fdf2f8)',
      cardBorder: '#fbcfe8'
    },
    treno: {
      key: 'treno',
      labelIt: 'Treno',
      labelEn: 'Train',
      svg: msIcon('train'),
      gradient: 'linear-gradient(135deg, #f87171, #ef4444)',
      gradientHover: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ef4444',
      hoverBg: '#fef2f2',
      cardBg: 'linear-gradient(135deg, #fef2f2, #fef2f2)',
      cardBorder: '#fecaca'
    },
    luogo: {
      key: 'luogo',
      labelIt: 'Luogo',
      labelEn: 'Place',
      svg: msIcon('location_on'),
      gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
      gradientHover: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      color: '#06b6d4',
      hoverBg: '#ecfeff',
      cardBg: 'linear-gradient(135deg, #ecfeff, #ecfeff)',
      cardBorder: '#a5f3fc'
    }
  };

  const CATEGORY_ORDER = ['ristorante', 'volo', 'hotel', 'museo', 'attrazione', 'treno', 'luogo'];

  const CATEGORY_KEYWORDS = {
    ristorante: [
      'ristorante', 'restaurant', 'trattoria', 'pizzeria', 'osteria',
      'ramen', 'sushi', 'bar ', 'café', 'cafe', 'bistro', 'food', 'cibo',
      'pranzo', 'cena', 'colazione', 'taverna', 'pub', 'gelateria',
      'pasticceria', 'bakery', 'brunch', 'lunch', 'dinner', 'breakfast',
      'izakaya', 'tapas', 'street food'
    ],
    museo: [
      'museo', 'museum', 'gallery', 'galleria', 'mostra', 'exhibition',
      'pinacoteca', 'art ', 'arte '
    ],
    attrazione: [
      'tempio', 'temple', 'chiesa', 'church', 'parco', 'park',
      'giardino', 'garden', 'castello', 'castle', 'torre', 'tower',
      'ponte', 'bridge', 'piazza', 'square', 'shrine', 'palazzo',
      'zoo', 'acquario', 'aquarium', 'monument', 'monumento', 'santuario',
      'basilica', 'cattedrale', 'cathedral', 'fortezza', 'fortress',
      'arena', 'colosseo', 'rovina', 'ruins', 'spiaggia', 'beach',
      'viewpoint', 'belvedere', 'panorama', 'market', 'mercato'
    ],
    treno: [
      'treno', 'train', 'shinkansen', 'ferrovia', 'railway', 'stazione',
      'station', 'eurostar', 'italo', 'trenitalia', 'tgv', 'bullet train'
    ]
  };

  function detectCategory(name, description) {
    const text = (' ' + ((name || '') + ' ' + (description || '')).toLowerCase() + ' ');
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) return category;
      }
    }
    return 'luogo';
  }

  function getCategoryForEvent(event) {
    if (event.type === 'flight') return CATEGORIES.volo;
    if (event.type.startsWith('hotel-')) return CATEGORIES.hotel;
    if (event.type === 'activity') {
      const cat = event.data.category || detectCategory(event.data.name, event.data.description);
      return CATEGORIES[cat] || CATEGORIES.luogo;
    }
    return CATEGORIES.luogo;
  }

  function eventToCategoryKey(event) {
    if (event.type === 'flight') return 'volo';
    if (event.type.startsWith('hotel-')) return 'hotel';
    if (event.type === 'activity') {
      return event.data.category || detectCategory(event.data.name, event.data.description);
    }
    return 'luogo';
  }

  function getCategoryLabel(categoryConfig) {
    const lang = typeof i18n !== 'undefined' ? i18n.getLang() : 'it';
    return lang === 'en' ? categoryConfig.labelEn : categoryConfig.labelIt;
  }

  window.activityCategories = {
    CATEGORIES,
    CATEGORY_ORDER,
    ICONS,
    detectCategory,
    getCategoryForEvent,
    eventToCategoryKey,
    getCategoryLabel
  };
})();
