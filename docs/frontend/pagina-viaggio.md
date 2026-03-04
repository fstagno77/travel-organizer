# Pagina Viaggio - Bottom Sheet Modal

La pagina di dettaglio del viaggio è implementata come **bottom sheet modal** che si apre dal basso con un effetto di scorrimento fluido e backdrop scuro.

## Struttura Bottom Sheet Modal

Il modal occupa l'intera viewport come overlay fisso con backdrop scuro, mentre il contenuto principale scorre verso l'alto con animazione fluida.

### Layout Base

```css
body.trip-modal-page {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  animation: tripBackdropIn 0.4s;
  overflow: hidden;
}

.trip-modal {
  background: linear-gradient(to bottom, #f8fafc, #eff6ff, #eef2ff);
  border-radius: 1rem 1rem 0 0;
  height: calc(100% - 30px);
  margin-top: 30px;
  animation: tripModalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
}

@keyframes tripBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes tripModalSlideIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

### Animazione di Chiusura

Quando l'utente chiude il modal, viene aggiunta la classe `.closing` al body per attivare l'animazione di uscita:

```css
body.trip-modal-page.closing .trip-modal {
  animation: tripModalSlideOut 0.3s;
}

@keyframes tripModalSlideOut {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
```

### Comportamento Desktop con Slide Panel

Quando si apre il pannello laterale di gestione prenotazione, il modal si sposta verso sinistra di 210px per lasciare spazio:

```css
/* Desktop: modal shifts left when panel opens */
@media (min-width: 576px) {
  body.trip-modal-page.panel-open .trip-modal {
    transform: translateX(-210px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
```

### Comportamento Mobile

Su mobile il modal occupa quasi l'intera altezza con un gap minimo dal top, e non si sposta quando il pannello si apre (il pannello copre l'intero schermo):

```css
@media (max-width: 575px) {
  .trip-modal {
    height: calc(100% - 10px);
    margin-top: 10px;
  }
}
```

### Preview Visuale - Bottom Sheet Modal

<div style="background: #1a1a1a; padding: 40px; border-radius: 12px; margin: 20px 0;">
  <div style="position: relative; max-width: 400px; margin: 0 auto; height: 600px; background: rgba(0,0,0,0.5); border-radius: 12px; overflow: hidden;">
    <!-- Dark backdrop -->
    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.5);"></div>

    <!-- Bottom sheet modal -->
    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: calc(100% - 30px); background: linear-gradient(to bottom, #f8fafc, #eff6ff, #eef2ff); border-radius: 1rem 1rem 0 0; padding: 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.1);">
      <!-- Gap showing dark backdrop at top -->
      <div style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px;">
        Gap di 30px mostra il backdrop scuro
      </div>

      <!-- Sample content -->
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 10px; color: #1e293b; font-size: 18px;">Contenuto Modal</h3>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Il modal scorre verso l'alto con animazione fluida (cubic-bezier)</p>
      </div>
    </div>
  </div>
</div>

---

## Hero Section

La sezione hero mostra l'immagine di copertina del viaggio con overlay scuro, titolo e metadati sovrapposti, e la tab bar flottante posizionata a metà tra hero e contenuto.

### Struttura Hero

```css
.trip-hero {
  background-image: url('...');
  background-size: cover;
  background-position: center;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 0.75rem;
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

.trip-hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
  border-radius: 0.75rem;
}
```

### Pulsante Chiudi (Glass Morphism)

Il pulsante di chiusura utilizza l'effetto glass morphism con sfondo semi-trasparente, blur e bordo sottile:

```css
.trip-hero-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.trip-hero-close:hover {
  background: white;
  color: var(--primary-color);
}
```

### Contenuto Hero

```css
.trip-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 1.5rem 3rem;
}

.trip-hero-content h1 {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.trip-hero-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
```

### Tab Bar Flottante

La tab bar è posizionata in modo assoluto sul bordo inferiore dell'hero, centrata e spostata del 50% verso il basso per creare l'effetto flottante:

```css
.trip-hero-tabs {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%);
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 4px;
  display: flex;
  gap: 4px;
}

.trip-hero-tabs button {
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.trip-hero-tabs button.active {
  background: var(--primary-color);
  color: white;
}
```

### Responsive Mobile

```css
@media (max-width: 575px) {
  .trip-hero {
    min-height: 200px;
  }

  .trip-hero-content h1 {
    font-size: 2.25rem;
  }

  .trip-hero-tabs button {
    min-height: 44px;
    font-size: 0.875rem;
  }
}
```

### Preview Visuale - Hero Section

<div style="background: #1a1a1a; padding: 40px; border-radius: 12px; margin: 20px 0;">
  <div style="position: relative; max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; overflow: hidden; min-height: 260px; display: flex; flex-direction: column; justify-content: flex-end;">

    <!-- Overlay scuro -->
    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.35); border-radius: 12px;"></div>

    <!-- Pulsante chiudi (glass morphism) -->
    <div style="position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.15); backdrop-filter: blur(12px); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </div>

    <!-- Contenuto hero -->
    <div style="position: relative; z-index: 2; text-align: center; padding: 0 24px 48px;">
      <h1 style="font-size: 3rem; font-weight: 700; color: white; margin: 0 0 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Giappone 2025
      </h1>
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.125rem; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>15 marzo - 30 marzo 2025</span>
      </div>
    </div>

    <!-- Tab bar flottante -->
    <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); padding: 4px; display: flex; gap: 4px;">
      <button style="padding: 8px 24px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 500; cursor: pointer;">
        Voli
      </button>
      <button style="padding: 8px 24px; border-radius: 8px; border: none; background: transparent; color: #64748b; font-weight: 500; cursor: pointer;">
        Hotel
      </button>
      <button style="padding: 8px 24px; border-radius: 8px; border: none; background: transparent; color: #64748b; font-weight: 500; cursor: pointer;">
        Attività
      </button>
    </div>

  </div>
</div>

---

## Sistema Tab

Il sistema di tab utilizza un controllo segmentato con sfondo bianco e pill animata che scorre tra le sezioni attive. Le tab utilizzano lazy rendering: il contenuto viene renderizzato solo al primo accesso.

### Tab Disponibili

1. **Voli**: mostra tutte le carte volo del viaggio
2. **Hotel**: mostra tutte le prenotazioni hotel
3. **Attività**: timeline giornaliera con tutti gli eventi (voli, hotel, attività custom)

### Implementazione

```javascript
// Lazy rendering: render content only on first access
const tabs = {
  flights: { rendered: false, element: document.getElementById('flights-tab') },
  hotels: { rendered: false, element: document.getElementById('hotels-tab') },
  activities: { rendered: false, element: document.getElementById('activities-tab') }
};

function switchTab(tabName) {
  if (!tabs[tabName].rendered) {
    renderTabContent(tabName);
    tabs[tabName].rendered = true;
  }

  // Show/hide tab content
  Object.keys(tabs).forEach(name => {
    tabs[name].element.style.display = name === tabName ? 'block' : 'none';
  });
}
```

---

## Menu Azioni

Menu a tre punti posizionato nell'header del modal con le seguenti azioni:

1. **Rinomina viaggio**: apre modal per modificare il nome del viaggio
2. **Gestisci prenotazione**: apre il pannello laterale di gestione
3. **Elimina viaggio**: mostra conferma ed elimina il viaggio

### Comportamento Condizionale

Quando l'utente è sulla tab **Attività**, le azioni relative alle prenotazioni (Gestisci prenotazione) vengono nascoste dal menu.

```javascript
function updateMenuActions() {
  const currentTab = getCurrentTab();
  const manageBookingAction = document.querySelector('[data-action="manage-booking"]');

  if (currentTab === 'activities') {
    manageBookingAction.style.display = 'none';
  } else {
    manageBookingAction.style.display = 'block';
  }
}
```

---

## Pannello Gestisci Prenotazione

Pannello laterale slide-in per la gestione delle prenotazioni esistenti. Si apre da destra con animazione fluida e supporta tre modalità: lista, modifica, eliminazione.

### Dimensioni e Posizione

```css
.slide-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s;
}

.slide-panel-overlay.active {
  opacity: 1;
}

.slide-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100%;
  background: white;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.slide-panel.active {
  transform: translateX(0);
}

@media (max-width: 575px) {
  .slide-panel {
    width: 100%;
  }
}
```

### Modalità Lista

Mostra tutte le prenotazioni raggruppate per riferimento. Ogni elemento visualizza:
- Riferimento prenotazione in grassetto + nome passeggero
- Righe volo: numero volo, rotta (DEP → ARR), data e ora
- Click per selezionare (bordo blu evidenziato)
- Sotto l'elemento selezionato: pulsanti Modifica + Elimina

```css
.manage-booking-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.manage-booking-item:hover {
  background: #f3f4f6;
}

.manage-booking-item.selected {
  border-color: var(--primary-color);
  background: #eff6ff;
}

.manage-booking-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.manage-booking-actions button {
  flex: 1;
  padding: 8px 16px;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
```

### Modalità Modifica

Quando l'utente clicca "Modifica", appare un pulsante freccia indietro nell'header, il form sostituisce la lista, e un pulsante "Salva" appare nel footer.

```css
.manage-back-btn {
  background: transparent;
  border: none;
  color: #4b5563;
  padding: 4px;
  margin-right: 8px;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.manage-back-btn:hover {
  background: #f3f4f6;
}
```

### Modalità Eliminazione

Conferma inline sotto l'elemento selezionato con il messaggio "Confermi l'eliminazione?" e due pulsanti: Annulla + Elimina.

```css
.manage-booking-delete-confirm {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 12px 16px;
  margin-top: 12px;
}

.manage-booking-delete-confirm p {
  margin: 0 0 12px;
  color: #991b1b;
  font-weight: 500;
}

.manage-booking-delete-actions {
  display: flex;
  gap: 8px;
}

.manage-booking-delete-actions button {
  flex: 1;
  padding: 8px 16px;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
}
```

### Preview Visuale - Pannello Gestisci Prenotazione

<div style="background: #1a1a1a; padding: 40px; border-radius: 12px; margin: 20px 0;">
  <div style="position: relative; max-width: 420px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">

    <!-- Header -->
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #1e293b;">Gestisci Prenotazione</h2>
    </div>

    <!-- Content -->
    <div style="padding: 20px; max-height: 500px; overflow-y: auto;">

      <!-- Booking Item 1 -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; cursor: pointer;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">
          ABC123 • Mario Rossi
        </div>
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 4px;">
          AZ123 • FCO → NRT
        </div>
        <div style="font-size: 0.875rem; color: #64748b;">
          15 mar 2025, 10:30
        </div>
      </div>

      <!-- Booking Item 2 (Selected) -->
      <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">
          DEF456 • Laura Bianchi
        </div>
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 4px;">
          AZ456 • NRT → FCO
        </div>
        <div style="font-size: 0.875rem; color: #64748b;">
          30 mar 2025, 14:00
        </div>
      </div>

      <!-- Action buttons for selected item -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button style="flex: 1; padding: 10px 16px; border-radius: 6px; border: 1px solid #e5e7eb; background: white; color: #374151; font-weight: 500; cursor: pointer;">
          Modifica
        </button>
        <button style="flex: 1; padding: 10px 16px; border-radius: 6px; border: none; background: #ef4444; color: white; font-weight: 500; cursor: pointer;">
          Elimina
        </button>
      </div>

      <!-- Booking Item 3 -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; cursor: pointer;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">
          GHI789 • Paolo Verdi
        </div>
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 4px;">
          AZ789 • FCO → KIX
        </div>
        <div style="font-size: 0.875rem; color: #64748b;">
          20 mar 2025, 09:15
        </div>
      </div>

    </div>

  </div>
</div>

---

## Interazione Desktop/Mobile

### Desktop (min-width: 576px)

- Modal: `height: calc(100% - 30px)`, gap 30px dal top
- Quando il pannello si apre: modal shift left di 210px
- Pannello: larghezza fissa 420px

### Mobile (max-width: 575px)

- Modal: `height: calc(100% - 10px)`, gap 10px dal top
- Pannello: occupa 100% larghezza, nessuno shift del modal
- Hero: altezza minima 200px, titolo 2.25rem
- Tab buttons: min-height 44px (touch-friendly)

---

## File Correlati

- `/js/tripPage.js`: logica principale della pagina viaggio
- `/js/slidePanel.js`: gestione pannello laterale
- `/css/trip-modal.css`: stili bottom sheet modal
- `/css/trip-hero.css`: stili sezione hero
- `/css/slide-panel.css`: stili pannello laterale
