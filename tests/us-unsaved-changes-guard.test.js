/**
 * US: Unsaved Changes Guard — showEditBookingPanel()
 * Verifica che il pattern SafeClose sia implementato correttamente
 * in js/tripPage.js per tutti i tipi di booking.
 */

const fs = require('fs');
const path = require('path');

const tripPageCode = fs.readFileSync(
  path.resolve(__dirname, '..', 'js/tripPage.js'),
  'utf8'
);

// ===========================
// Struttura: funzioni SafeClose locali presenti
// ===========================

describe('SafeClose — funzioni locali in showEditBookingPanel', () => {
  test('captureBookingSnapshot è definita', () => {
    expect(tripPageCode).toContain('captureBookingSnapshot');
  });

  test('isBookingFormDirty è definita', () => {
    expect(tripPageCode).toContain('isBookingFormDirty');
  });

  test('showBookingSafeCloseInterrupt è definita', () => {
    expect(tripPageCode).toContain('showBookingSafeCloseInterrupt');
  });

  test('requestClose è definita', () => {
    expect(tripPageCode).toContain('const requestClose');
  });

  test('bookingFormSnapshot viene inizializzato', () => {
    expect(tripPageCode).toContain('bookingFormSnapshot');
  });
});

// ===========================
// Snapshot: cattura campi data-field
// ===========================

describe('SafeClose — snapshot cattura campi data-field', () => {
  test('captureBookingSnapshot usa querySelectorAll con data-field', () => {
    expect(tripPageCode).toContain("querySelectorAll('input[data-field], select[data-field], textarea[data-field]')");
  });

  test('snapshot catturato con setTimeout 50ms (dopo inizializzazione form)', () => {
    // Verifica che il setTimeout(... 50) sia presente dopo la definizione di bookingFormSnapshot
    const snapshotBlock = tripPageCode.slice(
      tripPageCode.indexOf('bookingFormSnapshot = null'),
      tripPageCode.indexOf('bookingFormSnapshot = null') + 200
    );
    expect(snapshotBlock).toContain('setTimeout');
    expect(snapshotBlock).toContain('50');
  });
});

// ===========================
// Dirty check: logica corretta
// ===========================

describe('SafeClose — dirty check', () => {
  test('isBookingFormDirty confronta snapshot vs stato corrente', () => {
    const fnBlock = tripPageCode.slice(
      tripPageCode.indexOf('const isBookingFormDirty'),
      tripPageCode.indexOf('const isBookingFormDirty') + 300
    );
    expect(fnBlock).toContain('captureBookingSnapshot');
    expect(fnBlock).toContain('snapshot');
  });

  test('isBookingFormDirty controlla anche chiavi aggiunte (campo nuovo nel form)', () => {
    const fnBlock = tripPageCode.slice(
      tripPageCode.indexOf('const isBookingFormDirty'),
      tripPageCode.indexOf('const isBookingFormDirty') + 300
    );
    // Deve controllare sia le chiavi dello snapshot che quelle correnti
    expect(fnBlock).toContain('Object.keys(snapshot)');
    expect(fnBlock).toContain('Object.keys(current)');
  });
});

// ===========================
// Interrupt: UI e bottoni
// ===========================

describe('SafeClose — interrupt UI', () => {
  test('interrupt usa la classe safe-close-interrupt', () => {
    expect(tripPageCode).toContain('safe-close-interrupt');
  });

  test('interrupt ha il bottone "Continua a modificare" (booking-safe-close-stay)', () => {
    expect(tripPageCode).toContain('booking-safe-close-stay');
  });

  test('interrupt ha il bottone "Scarta modifiche" (booking-safe-close-discard)', () => {
    expect(tripPageCode).toContain('booking-safe-close-discard');
  });

  test('interrupt usa i18n key activity.unsavedChanges', () => {
    expect(tripPageCode).toContain("i18n.t('activity.unsavedChanges')");
  });

  test('interrupt usa i18n key activity.keepEditing', () => {
    expect(tripPageCode).toContain("i18n.t('activity.keepEditing')");
  });

  test('interrupt animato con classList.add active', () => {
    // Verifica che l'animazione sia gestita con requestAnimationFrame + active
    const startIdx = tripPageCode.indexOf('showBookingSafeCloseInterrupt');
    const endIdx = tripPageCode.indexOf('};', startIdx + 100) + 2; // chiude la funzione
    const interruptBlock = tripPageCode.slice(startIdx, endIdx + 600);
    expect(interruptBlock).toContain('requestAnimationFrame');
    expect(interruptBlock).toContain("classList.add('active')");
  });
});

// ===========================
// Wiring: backdrop, cancel, X usano requestClose
// ===========================

describe('SafeClose — wiring punti di chiusura', () => {
  test('backdrop click usa requestClose (non closePanel direttamente)', () => {
    // Cerca il pattern: backdrop.addEventListener('click', () => requestClose())
    expect(tripPageCode).toContain("backdrop.addEventListener('click', () => requestClose())");
  });

  test('edit-panel-close usa requestClose', () => {
    expect(tripPageCode).toContain("getElementById('edit-panel-close').addEventListener('click', () => requestClose())");
  });

  test('edit-panel-cancel usa requestClose', () => {
    expect(tripPageCode).toContain("getElementById('edit-panel-cancel').addEventListener('click', () => requestClose())");
  });

  test('il bottone Salva NON usa requestClose (salva e chiude direttamente)', () => {
    // performSave deve chiamare closePanel, non requestClose.
    // Isola il corpo di performSave: dalla sua dichiarazione fino a "};",
    // che chiude la funzione prima dei listener addEventListener che seguono.
    const startIdx = tripPageCode.indexOf('const performSave = async');
    // Trova il "    };" di chiusura di performSave (indentato con 6 spazi)
    const closingIdx = tripPageCode.indexOf('\n    };\n\n    document.getElementById(\'edit-panel-close\')', startIdx);
    const performSaveBlock = tripPageCode.slice(startIdx, closingIdx);
    expect(performSaveBlock).toContain('closePanel');
    expect(performSaveBlock).not.toContain('requestClose');
  });
});

// ===========================
// Guard applicata a tutti i tipi
// ===========================

describe('SafeClose — copertura tutti i tipi booking', () => {
  // La guard è in showEditBookingPanel che gestisce tutti i tipi tramite formBuilders
  const bookingTypes = ['flight', 'hotel', 'train', 'bus', 'rental', 'ferry'];

  bookingTypes.forEach(t => {
    test(`formBuilders include il tipo "${t}"`, () => {
      expect(tripPageCode).toContain(`${t}: window.trip`);
    });
  });
});
