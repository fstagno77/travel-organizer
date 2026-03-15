/**
 * Script automatico per catturare gli screenshot dell'app Travel Flow.
 *
 * UTILIZZO:
 *   1. Prima esecuzione (salva sessione di login):
 *      npm run screenshots:login
 *
 *   2. Esecuzioni successive (usa sessione salvata, headless):
 *      npm run screenshots
 *
 *   3. Solo uno screenshot specifico:
 *      node scripts/take-screenshots.js --only=DESK-01
 *
 * PREREQUISITI:
 *   - netlify dev in esecuzione su http://localhost:8888
 *
 * OUTPUT:
 *   docs/screenshots/desktop/DESK-XX-nome.png
 *   docs/screenshots/mobile/MOB-XX-nome.png
 *   docs/screenshots/components/COMP-XX-nome.png
 */

const { chromium } = require('@playwright/test');
const { existsSync, mkdirSync, writeFileSync, readFileSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const BASE_URL = 'http://localhost:8888';
const AUTH_STATE_FILE = join(__dirname, '.auth-state.json');
const OUTPUT_DIR = join(ROOT, 'docs', 'screenshots');

const DIRS = {
  desktop: join(OUTPUT_DIR, 'desktop'),
  mobile: join(OUTPUT_DIR, 'mobile'),
  components: join(OUTPUT_DIR, 'components'),
};

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

const LOGIN_MODE = process.argv.includes('--login');
const HELP_MODE  = process.argv.includes('--help');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '') || null;

// Cartella immagini help (pubbliche, usate da helpDetailPage.js)
const HELP_IMAGES_DIR = join(ROOT, 'public', 'assets', 'help-images');

// ─── Utility ──────────────────────────────────────────────────────────────────

function ensureDirs() {
  Object.values(DIRS).forEach(d => mkdirSync(d, { recursive: true }));
}

function ensureHelpDirs() {
  ['inizia-qui', 'voli', 'hotel', 'noleggio', 'attivita', 'collaborazione', 'notifiche'].forEach(sub => {
    mkdirSync(join(HELP_IMAGES_DIR, sub), { recursive: true });
  });
}

async function helpShot(page, relativePath) {
  await cleanupUI(page);
  const path = join(HELP_IMAGES_DIR, relativePath);
  await page.screenshot({ path, fullPage: false });
  log(`  ✓ help-images/${relativePath}`);
}

function log(msg) { console.log(`[screenshots] ${msg}`); }

async function waitForStable(page, timeout = 8000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
    await page.waitForTimeout(1000);
  }
}

async function cleanupUI(page) {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      .toast-container, .alert-temp { display: none !important; }
    `
  });
}

function loadAuthState() {
  if (existsSync(AUTH_STATE_FILE)) {
    return JSON.parse(readFileSync(AUTH_STATE_FILE, 'utf8'));
  }
  return null;
}

async function saveAuthState(context) {
  const state = await context.storageState();
  writeFileSync(AUTH_STATE_FILE, JSON.stringify(state, null, 2));
  log(`Sessione salvata in ${AUTH_STATE_FILE}`);
}

async function shot(page, filename, dir) {
  dir = dir || DIRS.desktop;
  await cleanupUI(page);
  const path = join(dir, `${filename}.png`);
  await page.screenshot({ path, fullPage: false });
  log(`  ✓ ${filename}.png`);
}

async function getFirstTripId(page) {
  try {
    const href = await page.evaluate(() => {
      const link = document.querySelector('a[href*="trip.html?id="]');
      return link ? link.getAttribute('href') : null;
    });
    if (href) {
      const match = href.match(/id=([^&]+)/);
      if (match) return match[1];
    }
  } catch { /* ignorato */ }
  return null;
}

// ─── Login interattivo ────────────────────────────────────────────────────────

async function doManualLogin() {
  log('=== MODALITÀ LOGIN ===');
  log('Si apre il browser. Fai login, poi torna qui e premi INVIO.');

  // Usa Chrome reale (Google blocca Chromium headless per OAuth)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    channel: 'chrome', // Chrome installato sul sistema
  });
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login.html`);

  log('In attesa... (premi INVIO quando sei loggato sulla home)');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
    process.stdin.resume();
  });

  await saveAuthState(context);
  await browser.close();
  log('✅ Login salvato. Ora esegui: npm run screenshots');
  process.exit(0);
}

// ─── Desktop ─────────────────────────────────────────────────────────────────

async function shootDesktop(context) {
  const page = await context.newPage();
  await page.setViewportSize(DESKTOP);

  // DESK-01 — Home
  if (!ONLY || ONLY === 'DESK-01') {
    log('DESK-01 — Home lista viaggi...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    await shot(page, 'DESK-01-home-lista-viaggi');
  }

  // Recupera trip ID (serve per le pagine trip)
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  const tripId = await getFirstTripId(page);
  if (!tripId) log('⚠ Nessun viaggio trovato — screenshot trip saltati. Crea almeno un viaggio.');

  // DESK-03 — Tab Voli
  if (tripId && (!ONLY || ONLY === 'DESK-03')) {
    log('DESK-03 — Viaggio tab Voli...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    const tab = page.locator('button:has-text("Voli"), [data-tab="flights"]').first();
    if (await tab.isVisible()) await tab.click();
    await page.waitForTimeout(500);
    await shot(page, 'DESK-03-viaggio-tab-voli');
  }

  // DESK-04 — Tab Hotel
  if (tripId && (!ONLY || ONLY === 'DESK-04')) {
    log('DESK-04 — Viaggio tab Hotel...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    const tab = page.locator('button:has-text("Hotel"), [data-tab="hotels"]').first();
    if (await tab.isVisible()) await tab.click();
    await page.waitForTimeout(500);
    await shot(page, 'DESK-04-viaggio-tab-hotel');
  }

  // DESK-05 — Tab Attività
  if (tripId && (!ONLY || ONLY === 'DESK-05')) {
    log('DESK-05 — Viaggio tab Attività...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    const tab = page.locator('button:has-text("Attività"), [data-tab="activities"]').first();
    if (await tab.isVisible()) await tab.click();
    await page.waitForTimeout(500);
    await shot(page, 'DESK-05-viaggio-tab-attivita');
  }

  // DESK-06 — Slide panel attività
  if (tripId && (!ONLY || ONLY === 'DESK-06')) {
    log('DESK-06 — Slide panel nuova attività...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    const actTab = page.locator('button:has-text("Attività"), [data-tab="activities"]').first();
    if (await actTab.isVisible()) await actTab.click();
    await page.waitForTimeout(500);
    const addBtn = page.locator('[data-action="add-activity"], button:has-text("Aggiungi attività"), .fab').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await shot(page, 'DESK-06-slide-panel-attivita');
    } else {
      log('  ⚠ Pulsante aggiungi attività non trovato — skip DESK-06');
    }
  }

  // DESK-07 — Modale condivisione
  if (tripId && (!ONLY || ONLY === 'DESK-07')) {
    log('DESK-07 — Modale condivisione...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    const shareBtn = page.locator('[data-action="share"], button:has-text("Condividi"), .btn-share').first();
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      await page.waitForTimeout(800);
      await shot(page, 'DESK-07-modale-condivisione');
    } else {
      log('  ⚠ Pulsante condividi non trovato — skip DESK-07');
    }
  }

  // DESK-08 — Notifiche
  if (!ONLY || ONLY === 'DESK-08') {
    log('DESK-08 — Notifiche...');
    await page.goto(`${BASE_URL}/notifications.html`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    await shot(page, 'DESK-08-notifiche');
  }

  // DESK-09 — Profilo tab Viaggiatori
  if (!ONLY || ONLY === 'DESK-09') {
    log('DESK-09 — Profilo tab Viaggiatori...');
    await page.goto(`${BASE_URL}/profile.html`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    const tab = page.locator('button:has-text("Viaggiatori"), [data-tab="travelers"]').first();
    if (await tab.isVisible()) await tab.click();
    await page.waitForTimeout(500);
    await shot(page, 'DESK-09-profilo-viaggiatori');
  }

  // DESK-10 — Admin
  if (!ONLY || ONLY === 'DESK-10') {
    log('DESK-10 — Admin Dashboard...');
    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2500); // Chart.js lento
    await shot(page, 'DESK-10-admin-dashboard');
  }

  await page.close();
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

async function shootMobile(context) {
  const page = await context.newPage();
  await page.setViewportSize(MOBILE);

  // MOB-01 — Login (contesto non autenticato)
  if (!ONLY || ONLY === 'MOB-01') {
    log('MOB-01 — Login (mobile)...');
    const guestCtx = await context.browser().newContext({ viewport: MOBILE });
    const guestPage = await guestCtx.newPage();
    await guestPage.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
    await waitForStable(guestPage);
    await guestPage.waitForTimeout(1000);
    await shot(guestPage, 'MOB-01-login', DIRS.mobile);
    await guestCtx.close();
  }

  // MOB-03 — Home lista viaggi
  if (!ONLY || ONLY === 'MOB-03') {
    log('MOB-03 — Home lista viaggi (mobile)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    await shot(page, 'MOB-03-home-lista-viaggi', DIRS.mobile);
  }

  // MOB-04 — Sidebar mobile aperta
  if (!ONLY || ONLY === 'MOB-04') {
    log('MOB-04 — Menu sidebar aperto (mobile)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    const hamburger = page.locator('.hamburger, .menu-toggle, [aria-label*="menu" i], [aria-label*="Menu"]').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      await shot(page, 'MOB-04-menu-sidebar-aperto', DIRS.mobile);
    } else {
      log('  ⚠ Hamburger non trovato — skip MOB-04');
    }
  }

  // Recupera trip ID
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  const tripId = await getFirstTripId(page);

  // MOB-05 — Dettaglio viaggio tab Voli
  if (tripId && (!ONLY || ONLY === 'MOB-05')) {
    log('MOB-05 — Viaggio tab Voli (mobile)...');
    await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(2000);
    await shot(page, 'MOB-05-viaggio-tab-voli', DIRS.mobile);
  }

  // MOB-07 — Notifiche
  if (!ONLY || ONLY === 'MOB-07') {
    log('MOB-07 — Notifiche (mobile)...');
    await page.goto(`${BASE_URL}/notifications.html`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    await shot(page, 'MOB-07-notifiche', DIRS.mobile);
  }

  // MOB-08 — Share pubblica
  if (tripId && (!ONLY || ONLY === 'MOB-08')) {
    log('MOB-08 — Share pubblica (mobile)...');
    const shareCtx = await context.browser().newContext({ viewport: MOBILE });
    const sharePage = await shareCtx.newPage();
    await sharePage.goto(`${BASE_URL}/share.html?trip=${tripId}`, { waitUntil: 'domcontentloaded' });
    await waitForStable(sharePage);
    await sharePage.waitForTimeout(1500);
    await shot(sharePage, 'MOB-08-share-pubblica', DIRS.mobile);
    await shareCtx.close();
  }

  await page.close();
}

// ─── Componenti ───────────────────────────────────────────────────────────────

async function shootComponents(context) {
  // COMP-04 — Bottoni
  if (!ONLY || ONLY === 'COMP-04') {
    log('COMP-04 — Bottoni...');
    const page = await context.newPage();
    await page.setViewportSize({ width: 760, height: 120 });
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
    // Inietta HTML con bottoni usando le classi CSS reali dell'app
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:24px;background:#f9fafb">
          <button class="btn btn-primary">Salva</button>
          <button class="btn btn-secondary">Annulla</button>
          <button class="btn btn-outline">Condividi</button>
          <button class="btn btn-danger">Elimina</button>
          <button class="btn btn-primary" disabled style="opacity:.5;cursor:not-allowed">Disabilitato</button>
          <button class="btn btn-sm btn-primary">Piccolo</button>
        </div>
      `;
    });
    await page.waitForTimeout(300);
    await shot(page, 'COMP-04-bottoni', DIRS.components);
    await page.close();
  }
}

// ─── Help images ─────────────────────────────────────────────────────────────
// Genera le immagini usate in helpDetailPage.js → public/assets/help-images/

async function shootHelpImages(context) {
  // Viewport leggermente più stretto: le immagini vengono mostrate embedded negli articoli
  const VP = { width: 1280, height: 800 };
  const page = await context.newPage();
  await page.setViewportSize(VP);

  // Recupera il primo trip ID
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  const tripId = await getFirstTripId(page);

  // ── inizia-qui/01-nuovo-viaggio.png ────────────────────────────────────────
  // Home page: sidebar + FAB/pulsante Nuovo Viaggio ben visibile
  log('inizia-qui/01-nuovo-viaggio.png');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  // Evidenzia il pulsante Nuovo Viaggio con un ring CSS
  await page.addStyleTag({ content: `
    [data-action="new-trip"], .btn-new-trip, a[href*="nuovo"], button:has-text("Nuovo Viaggio") {
      outline: 3px solid #f59e0b !important;
      outline-offset: 3px !important;
    }
  `});
  await helpShot(page, 'inizia-qui/01-nuovo-viaggio.png');

  // ── inizia-qui/02-upload-area.png ──────────────────────────────────────────
  // Pannello di caricamento PDF (trip creator)
  log('inizia-qui/02-upload-area.png');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  // Apri il pannello Nuovo Viaggio
  const newTripBtn = page.locator('[data-action="new-trip"], button:has-text("Nuovo Viaggio"), .btn-new-trip, a:has-text("Nuovo Viaggio")').first();
  if (await newTripBtn.isVisible()) {
    await newTripBtn.click();
    await page.waitForTimeout(1000);
    await helpShot(page, 'inizia-qui/02-upload-area.png');
  } else {
    log('  ⚠ Pulsante Nuovo Viaggio non trovato — skip 02');
  }

  // ── inizia-qui/03-anteprima.png ────────────────────────────────────────────
  // Preview SmartParse — cattura la pagina parse-preview se disponibile,
  // altrimenti usa la stessa schermata upload (non automatizzabile senza PDF reale)
  log('inizia-qui/03-anteprima.png → usando screenshot upload come fallback');
  // Non possiamo caricare un PDF reale in modo automatico;
  // usiamo la schermata upload come placeholder (si può sostituire manualmente)
  // Se esiste già una screenshot valida, non sovrascrivere
  const previewPath = join(HELP_IMAGES_DIR, 'inizia-qui/03-anteprima.png');
  if (!existsSync(previewPath)) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-action="new-trip"], button:has-text("Nuovo Viaggio")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
    await helpShot(page, 'inizia-qui/03-anteprima.png');
    log('  ℹ Sostituire manualmente 03-anteprima.png con una vera anteprima SmartParse');
  } else {
    log('  → 03-anteprima.png già presente, non sovrascritta');
  }

  // ── inizia-qui/04-pending-booking.png ──────────────────────────────────────
  log('inizia-qui/04-pending-booking.png');
  await page.goto(`${BASE_URL}/pending-bookings.html`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  await helpShot(page, 'inizia-qui/04-pending-booking.png');

  if (!tripId) {
    log('⚠ Nessun viaggio — skip immagini voli/hotel/attività/collaborazione');
    await page.close();
    return;
  }

  // ── voli/01-card-volo.png ──────────────────────────────────────────────────
  log('voli/01-card-volo.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const voliTab = page.locator('button:has-text("Voli"), [data-tab="flights"]').first();
  if (await voliTab.isVisible()) await voliTab.click();
  await page.waitForTimeout(500);
  // Espandi la prima card volo se collapsed
  const firstCard = page.locator('.flight-card, .booking-card').first();
  if (await firstCard.isVisible()) {
    const expandBtn = firstCard.locator('.expand-btn, [data-action="expand"], button:has-text("Espandi")').first();
    if (await expandBtn.isVisible()) await expandBtn.click();
    await page.waitForTimeout(400);
    // Ritaglia sulla card invece di full page
    const box = await firstCard.boundingBox();
    if (box) {
      await page.screenshot({
        path: join(HELP_IMAGES_DIR, 'voli/01-card-volo.png'),
        clip: { x: box.x - 16, y: box.y - 8, width: Math.min(box.width + 32, VP.width), height: Math.min(box.height + 16, VP.height) },
      });
      log('  ✓ voli/01-card-volo.png (ritaglio card)');
    } else {
      await helpShot(page, 'voli/01-card-volo.png');
    }
  } else {
    await helpShot(page, 'voli/01-card-volo.png');
  }

  // ── hotel/01-card-hotel.png ────────────────────────────────────────────────
  log('hotel/01-card-hotel.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const hotelTab = page.locator('button:has-text("Hotel"), [data-tab="hotels"]').first();
  if (await hotelTab.isVisible()) await hotelTab.click();
  await page.waitForTimeout(500);
  const hotelCard = page.locator('.hotel-card, .booking-card').first();
  if (await hotelCard.isVisible()) {
    const box = await hotelCard.boundingBox();
    if (box) {
      await page.screenshot({
        path: join(HELP_IMAGES_DIR, 'hotel/01-card-hotel.png'),
        clip: { x: box.x - 16, y: box.y - 8, width: Math.min(box.width + 32, VP.width), height: Math.min(box.height + 16, VP.height) },
      });
      log('  ✓ hotel/01-card-hotel.png (ritaglio card)');
    } else {
      await helpShot(page, 'hotel/01-card-hotel.png');
    }
  } else {
    await helpShot(page, 'hotel/01-card-hotel.png');
  }

  // ── noleggio/01-card-noleggio.png ──────────────────────────────────────────
  // Cerca tab noleggio (potrebbe non esistere nel viaggio corrente)
  log('noleggio/01-card-noleggio.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const rentalCard = page.locator('.rental-card, .car-card, [data-type="rental"]').first();
  const hasRental = await rentalCard.isVisible().catch(() => false);
  if (hasRental) {
    const box = await rentalCard.boundingBox();
    if (box) {
      await page.screenshot({
        path: join(HELP_IMAGES_DIR, 'noleggio/01-card-noleggio.png'),
        clip: { x: box.x - 16, y: box.y - 8, width: Math.min(box.width + 32, VP.width), height: Math.min(box.height + 16, VP.height) },
      });
      log('  ✓ noleggio/01-card-noleggio.png (ritaglio card)');
    } else {
      await helpShot(page, 'noleggio/01-card-noleggio.png');
    }
  } else {
    log('  ⚠ Nessun noleggio nel viaggio — skip noleggio/01. Aggiungine uno e riesegui --help.');
  }

  // ── attivita/01-tab-attivita.png ───────────────────────────────────────────
  log('attivita/01-tab-attivita.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const actTab = page.locator('button:has-text("Attività"), [data-tab="activities"]').first();
  if (await actTab.isVisible()) await actTab.click();
  await page.waitForTimeout(500);
  await helpShot(page, 'attivita/01-tab-attivita.png');

  // ── attivita/02-aggiungi-attivita.png ──────────────────────────────────────
  // Slide panel "Nuova attività" aperto
  log('attivita/02-aggiungi-attivita.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const actTab2 = page.locator('button:has-text("Attività"), [data-tab="activities"]').first();
  if (await actTab2.isVisible()) await actTab2.click();
  await page.waitForTimeout(500);
  const addActBtn = page.locator('[data-action="add-activity"], button:has-text("Aggiungi attività"), button:has-text("+ Attività"), .fab').first();
  if (await addActBtn.isVisible()) {
    await addActBtn.click();
    await page.waitForTimeout(800);
  }
  await helpShot(page, 'attivita/02-aggiungi-attivita.png');

  // ── collaborazione/01-icona-share.png ──────────────────────────────────────
  // Trip page con modale condivisione aperta
  log('collaborazione/01-icona-share.png');
  await page.goto(`${BASE_URL}/trip.html?id=${tripId}`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(2000);
  const shareBtn = page.locator('[data-action="share"], button:has-text("Condividi"), .btn-share, [aria-label*="condividi" i]').first();
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await page.waitForTimeout(800);
  }
  await helpShot(page, 'collaborazione/01-icona-share.png');

  // ── notifiche/01-campanella.png ────────────────────────────────────────────
  // Header con badge campanella visibile + pagina notifiche
  log('notifiche/01-campanella.png');
  await page.goto(`${BASE_URL}/notifications.html`, { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await page.waitForTimeout(1500);
  await helpShot(page, 'notifiche/01-campanella.png');

  await page.close();
  log('✅ Help images completate → public/assets/help-images/');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (LOGIN_MODE) {
    await doManualLogin();
    return;
  }

  const authState = loadAuthState();
  if (!authState) {
    console.error('❌ Nessuna sessione salvata.');
    console.error('   Esegui prima: npm run screenshots:login');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: DESKTOP,
    storageState: authState,
  });

  try {
    if (HELP_MODE) {
      ensureHelpDirs();
      log('Output → public/assets/help-images/');
      log('─────────────────────────');
      await shootHelpImages(context);
    } else {
      ensureDirs();
      log(`Output → ${OUTPUT_DIR}`);
      if (ONLY) log(`Filtro: ${ONLY}`);
      log('─────────────────────────');
      if (!ONLY || ONLY.startsWith('DESK')) {
        log('── Desktop ──');
        await shootDesktop(context);
      }
      if (!ONLY || ONLY.startsWith('MOB')) {
        log('── Mobile ──');
        await shootMobile(context);
      }
      if (!ONLY || ONLY.startsWith('COMP')) {
        log('── Componenti ──');
        await shootComponents(context);
      }
      log('─────────────────────────');
      log(`✅ Tutto completato → ${OUTPUT_DIR}`);
    }
  } catch (err) {
    console.error('❌ Errore durante screenshot:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
