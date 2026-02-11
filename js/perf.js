/**
 * Performance metrics (RUM - Real User Monitoring)
 *
 * Performance budget (trip page):
 * - TTI < 2000ms on fast 4G
 * - Tab render < 100ms
 * - Total JS bundle < 100KB gzipped
 * - No blocking requests to external CDNs
 */
(function() {
  'use strict';

  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  const metrics = {};

  // TTFB
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      metrics['TTFB (ms)'] = Math.round(nav.responseStart);
    }
  } catch (e) { /* Performance API not available */ }

  // FCP
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics['FCP (ms)'] = Math.round(entry.startTime);
          fcpObserver.disconnect();
          reportIfReady();
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) { /* PerformanceObserver not available */ }

  // JS bundle size
  try {
    const resources = performance.getEntriesByType('resource');
    let jsSize = 0;
    for (const r of resources) {
      if (r.initiatorType === 'script' && r.transferSize > 0) {
        jsSize += r.transferSize;
      }
    }
    if (jsSize > 0) {
      metrics['JS bundle (KB)'] = Math.round(jsSize / 1024 * 10) / 10;
    }
  } catch (e) { /* Resource timing not available */ }

  // Custom TTI: time from navigationStart to trip loaded
  // Exposed as window.__perfMarkTripLoaded() for tripPage.js to call
  window.__perfMarkTripLoaded = function() {
    metrics['Trip loaded (ms)'] = Math.round(performance.now());
    reportIfReady();
  };

  // Tab render time: exposed for tripPage.js
  window.__perfMarkTabRender = function(ms) {
    metrics['Tab render (ms)'] = Math.round(ms);
  };

  let reported = false;
  function reportIfReady() {
    if (reported) return;
    // Wait for both FCP and trip loaded (if on trip page)
    const isTripPage = location.pathname.includes('trip');
    if (isTripPage && !metrics['Trip loaded (ms)']) return;

    reported = true;

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => logMetrics());
    } else {
      setTimeout(() => logMetrics(), 100);
    }
  }

  function logMetrics() {
    if (isDev) {
      console.table(metrics);
    }
  }

  // For non-trip pages, report after load
  window.addEventListener('load', () => {
    if (!location.pathname.includes('trip')) {
      setTimeout(() => {
        reported = true;
        if (isDev) logMetrics();
      }, 1000);
    }
  });
})();
