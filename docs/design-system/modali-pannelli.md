# Modali e Pannelli

Travel Organizer utilizza diversi tipi di overlay per presentare contenuti sopra l'interfaccia principale: modali standard, modali di autenticazione, pannelli slide-in e la modale full-page del viaggio.

## Modal Overlay `.modal-overlay`

Il background scuro che copre il contenuto dietro la modale.

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Stato nascosto (default) */
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-normal);   /* 250ms */
}

/* Stato attivo */
.modal-overlay.active {
  opacity: 1;
  visibility: visible;
}
```

| Proprieta | Stato Nascosto | Stato Attivo |
|-----------|---------------|-------------|
| Opacity | `0` | `1` |
| Visibility | `hidden` | `visible` |
| Background | `rgba(0, 0, 0, 0.5)` | `rgba(0, 0, 0, 0.5)` |
| z-index | `1000` | `1000` |
| Transizione | 250ms | 250ms |

### Chiusura

L'overlay si chiude cliccando sullo sfondo scuro (fuori dalla modale) o premendo il tasto `Escape`.

---

## Modal Standard `.modal`

La modale standard per conferme, form brevi e messaggi.

```css
.modal {
  background: var(--color-white);             /* #ffffff */
  border-radius: var(--radius-lg);            /* 12px */
  box-shadow: var(--shadow-xl);               /* 0 20px 25px -5px rgba(0,0,0,0.1),
                                                  0 10px 10px -5px rgba(0,0,0,0.04) */
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;

  /* Animazione ingresso */
  transform: scale(0.95) translateY(-20px);
  transition: transform var(--transition-normal); /* 250ms */
}

.modal-overlay.active .modal {
  transform: scale(1) translateY(0);
}
```

| Proprieta | Stato Nascosto | Stato Attivo |
|-----------|---------------|-------------|
| Transform | `scale(0.95) translateY(-20px)` | `scale(1) translateY(0)` |
| Max width | 500px | 500px |
| Max height | 90vh | 90vh |

#### Anteprima visiva

<div style="margin: 16px 0; height: 300px; background: rgba(0,0,0,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 80%; max-width: 400px; overflow: hidden; font-family: Inter, sans-serif;">
    <div style="padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 18px; font-weight: 600; color: #111827;">Conferma</span>
      <span style="color: #9ca3af; cursor: pointer; font-size: 20px;">&#x2715;</span>
    </div>
    <div style="padding: 20px;">
      <p style="margin: 0; color: #374151; font-size: 14px;">Sei sicuro di voler eliminare questo elemento?</p>
    </div>
    <div style="padding: 12px 20px; border-top: 1px solid #f3f4f6; background: #f9fafb; display: flex; justify-content: flex-end; gap: 8px;">
      <button style="padding: 8px 16px; font-size: 14px; border: 1px solid #2163f6; color: #2163f6; background: transparent; border-radius: 8px; cursor: pointer;">Annulla</button>
      <button style="padding: 8px 16px; font-size: 14px; border: none; color: white; background: #ef4444; border-radius: 8px; cursor: pointer;">Elimina</button>
    </div>
  </div>
</div>

### Parti della Modal

#### Header `.modal-header`

```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5) var(--spacing-6); /* 20px 24px */
  border-bottom: 1px solid var(--color-gray-200); /* #e5e7eb */
}

.modal-header h2,
.modal-header h3 {
  font-size: var(--font-size-lg);             /* 18px */
  font-weight: var(--font-weight-semibold);   /* 600 */
  color: var(--color-gray-900);               /* #111827 */
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-gray-400);               /* #9ca3af */
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-gray-100);          /* #f3f4f6 */
  color: var(--color-gray-600);               /* #4b5563 */
}
```

#### Body `.modal-body`

```css
.modal-body {
  padding: var(--spacing-6);                  /* 24px */
}
```

#### Footer `.modal-footer`

```css
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);                      /* 12px */
  padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */
  border-top: 1px solid var(--color-gray-200); /* #e5e7eb */
}
```

### Struttura HTML

```html
<div class="modal-overlay" id="conferma-modal">
  <div class="modal">
    <div class="modal-header">
      <h3>Conferma eliminazione</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <p>Sei sicuro di voler eliminare questo elemento?</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline">Annulla</button>
      <button class="btn btn-danger">Elimina</button>
    </div>
  </div>
</div>
```

---

## Auth Modal `.auth-modal`

La modale di autenticazione (login/registrazione) ha dimensioni piu contenute.

```css
.auth-modal {
  background: var(--color-white);
  border-radius: var(--radius-lg);            /* 12px */
  box-shadow: var(--shadow-xl);
  max-width: 400px;
  width: 90%;
  padding: var(--spacing-6);                  /* 24px */
  text-align: center;
}
```

| Proprieta | Valore |
|-----------|--------|
| Max width | 400px |
| Padding | 24px |
| Border radius | 12px |
| Allineamento testo | centrato |

### Contenuto tipico

```
.auth-modal
  Logo
  Titolo ("Accedi" / "Registrati")
  .btn-google (pulsante Google)
  Divider "oppure"
  Form email/password
  Link switch (Accedi ↔ Registrati)
```

---

## Slide Panel

Il pannello slide-in viene usato per visualizzare e modificare i dettagli delle attivita personalizzate. Scorre dall'esterno destro verso l'interno.

### Overlay `.slide-panel-overlay`

```css
.slide-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;

  /* Stato nascosto */
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-normal);   /* 250ms */
}

.slide-panel-overlay.active {
  opacity: 1;
  visibility: visible;
}
```

### Pannello `.slide-panel`

```css
.slide-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background: var(--color-white);
  box-shadow: -10px 0 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1002;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  /* Animazione slide */
  transform: translateX(100%);
  transition: transform var(--transition-slow); /* 350ms */
}

.slide-panel-overlay.active .slide-panel {
  transform: translateX(0);
}
```

| Proprieta | Stato Nascosto | Stato Attivo |
|-----------|---------------|-------------|
| Transform | `translateX(100%)` | `translateX(0)` |
| Width (desktop) | 420px | 420px |
| Width (mobile) | 100% | 100% |
| Transizione | 350ms | 350ms |

#### Anteprima visiva

<div style="margin: 16px 0; height: 300px; background: rgba(0,0,0,0.08); border-radius: 12px; position: relative; overflow: hidden;">
  <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 280px; background: white; box-shadow: -10px 0 15px -3px rgba(0,0,0,0.1); font-family: Inter, sans-serif;">
    <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 16px; font-weight: 600; color: #111827;">Nuova attivit&#224;</span>
      <span style="color: #9ca3af; cursor: pointer;">&#x2715;</span>
    </div>
    <div style="padding: 20px;">
      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; font-weight: 500; color: #374151; display: block; margin-bottom: 4px;">Nome</label>
        <div style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; color: #9ca3af;">Es: Pranzo sushi</div>
      </div>
      <div>
        <label style="font-size: 12px; font-weight: 500; color: #374151; display: block; margin-bottom: 4px;">Data</label>
        <div style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; color: #9ca3af;">2026-03-15</div>
      </div>
    </div>
  </div>
</div>

### Responsive

```css
@media (max-width: 767px) {
  .slide-panel {
    width: 100%;
  }
}
```

Su dispositivi mobili il pannello occupa l'intera larghezza dello schermo.

### Struttura

```
.slide-panel-overlay
  .slide-panel
    .slide-panel__header     (titolo + pulsante chiudi)
    .slide-panel__body       (contenuto: form o vista dettaglio)
    .slide-panel__footer     (pulsanti azione)
```

### Header

```css
.slide-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5) var(--spacing-6); /* 20px 24px */
  border-bottom: 1px solid var(--color-gray-200);
  flex-shrink: 0;
}
```

### Body

```css
.slide-panel__body {
  flex: 1;
  padding: var(--spacing-6);                  /* 24px */
  overflow-y: auto;
}
```

### Footer

```css
.slide-panel__footer {
  padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);                      /* 12px */
  flex-shrink: 0;
}
```

### Tre Modalita

Il pannello slide-in opera in tre modalita distinte:

| Modalita | Descrizione | Header | Body | Footer |
|----------|-------------|--------|------|--------|
| **Crea** | Form vuoto per nuova attivita | "Nuova attivita" | Form campi | "Annulla" + "Salva" |
| **Visualizza** | Dettaglio in sola lettura | Nome attivita | Dettagli read-only | "Modifica" + "Elimina" |
| **Modifica** | Form precompilato | "Modifica attivita" | Form precompilato | "Annulla" + "Salva" |

---

## Trip Modal `.trip-modal-page`

La modale full-page del viaggio e il componente overlay piu complesso. Si presenta come un bottom sheet che scorre dal basso, lasciando visibile un sottile bordo di 30px (desktop) o 10px (mobile) dello sfondo scuro.

### Backdrop `.trip-modal-page`

```css
.trip-modal-page {
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  overflow: hidden;
  animation: tripBackdropIn 0.4s ease both;
}

.trip-modal-page.closing {
  animation: tripBackdropOut 0.3s ease both;
}

@keyframes tripBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes tripBackdropOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

### Modal Container `.trip-modal`

```css
.trip-modal {
  background: linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff);
  border-radius: 1rem 1rem 0 0;
  height: calc(100% - 30px);
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  animation: tripModalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Shift left quando si apre il slide panel (solo desktop) */
body.slide-panel-open .trip-modal {
  translate: -210px 0;
}

.trip-modal.closing {
  animation: tripModalSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1) both;
}

@keyframes tripModalSlideIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes tripModalSlideOut {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
```

| Proprieta | Valore |
|-----------|--------|
| Margin top (desktop) | 30px |
| Margin top (mobile) | 10px |
| Height | `calc(100% - 30px)` desktop, `calc(100% - 10px)` mobile |
| Border radius | `1rem 1rem 0 0` (solo angoli superiori) |
| Background | Gradiente `#f8fafc` → `#eff6ff` → `#eef2ff` |
| Animazione ingresso | `0.4s cubic-bezier(0.16, 1, 0.3, 1)` |
| Animazione uscita | `0.3s cubic-bezier(0.4, 0, 1, 1)` |
| Translate (panel aperto) | `-210px` (solo desktop) |

### Hero `.trip-hero`

L'hero della trip modal contiene l'immagine di copertina, il titolo del viaggio, il pulsante close glass e la tab bar fluttuante.

```css
.trip-hero {
  position: relative;
  min-height: 260px;
  background-size: cover;
  background-position: center;
  border-radius: var(--radius-xl);           /* 16px */
  overflow: hidden;
}

/* Dark overlay per leggibilita */
.trip-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}

/* Pulsante close glassmorphism (top-right) */
.trip-hero__close {
  position: absolute;
  top: var(--spacing-4);                     /* 16px */
  right: var(--spacing-4);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.trip-hero__close:hover {
  background: white;
  color: var(--color-primary);
}

/* Contenuto centrato */
.trip-hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 260px;
  padding: var(--spacing-6);                 /* 24px */
}

.trip-hero__title {
  font-size: 3rem;                           /* 48px */
  font-weight: var(--font-weight-bold);      /* 700 */
  color: white;
  text-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  margin: 0;
}

.trip-hero__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);                     /* 8px */
  color: white;
  font-size: var(--font-size-sm);            /* 14px */
  margin-top: var(--spacing-2);
  opacity: 0.95;
}

/* Tab bar fluttuante (posizionata in basso, centrata, sfora sotto l'hero) */
.trip-tabs {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%);
  z-index: 2;
  background: white;
  border-radius: var(--radius-lg);           /* 12px */
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  gap: 4px;
}
```

### Responsive (Mobile)

```css
@media (max-width: 575px) {
  .trip-modal {
    height: calc(100% - 10px);
    margin-top: 10px;
  }

  /* No translate quando si apre il panel su mobile */
  body.slide-panel-open .trip-modal {
    translate: 0;
  }

  .trip-hero {
    min-height: 200px;
  }

  .trip-hero__content {
    min-height: 200px;
  }

  .trip-hero__title {
    font-size: 2.25rem;                      /* 36px */
  }
}
```

#### Anteprima visiva

<div style="margin: 16px 0; height: 400px; background: rgba(0,0,0,0.5); border-radius: 12px; position: relative; overflow: hidden; display: flex; flex-direction: column; padding-top: 30px;">
  <div style="background: linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff); border-radius: 16px 16px 0 0; flex: 1; overflow: hidden; display: flex; flex-direction: column;">
    <div style="position: relative; min-height: 180px; background: linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0.35)), linear-gradient(135deg, #60a5fa, #818cf8); background-size: cover; border-radius: 16px; margin: 16px 16px 0; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif;">
      <div style="position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">&#x2715;</div>
      <div style="text-align: center; color: white; padding: 0 24px;">
        <div style="font-size: 28px; font-weight: 700; text-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-bottom: 8px;">Giappone 2026</div>
        <div style="font-size: 13px; opacity: 0.95; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>&#128197;</span>
          <span>15 Mar - 28 Mar</span>
        </div>
      </div>
      <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 4px; display: flex; gap: 4px;">
        <div style="padding: 10px 18px; font-size: 13px; font-weight: 500; color: #2163f6; background: #eff6ff; border-radius: 8px;">Attivit&#224;</div>
        <div style="padding: 10px 18px; font-size: 13px; font-weight: 500; color: #4b5563; border-radius: 8px;">Voli</div>
        <div style="padding: 10px 18px; font-size: 13px; font-weight: 500; color: #4b5563; border-radius: 8px;">Hotel</div>
      </div>
    </div>
    <div style="padding: 40px 20px 20px; font-family: Inter, sans-serif; font-size: 14px; color: #6b7280;">
      [Contenuto del viaggio...]
    </div>
  </div>
</div>

### Curva di Animazione

La curva `cubic-bezier(0.16, 1, 0.3, 1)` produce un effetto "ease-out" marcato: l'elemento parte veloce e decelera dolcemente, dando una sensazione di naturalezza. Per l'uscita si usa `cubic-bezier(0.4, 0, 1, 1)` per un movimento piu rapido.

### Interazione con Slide Panel

Quando si apre il slide panel (attivita custom), su desktop la trip modal si sposta a sinistra di `210px` (meta larghezza del pannello) per mantenere visibile il contenuto centrale. Su mobile non c'e shift perche il pannello occupa il 100% della larghezza.

---

### Manage Booking Panel

Il **Manage Booking Panel** e una variante del slide panel, usato per il workflow di modifica/eliminazione delle prenotazioni. Riutilizza le stesse classi `.slide-panel-overlay` e `.slide-panel`, ma con contenuto specializzato:

```css
.manage-booking-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);                     /* 12px */
}

.manage-booking-item {
  padding: var(--spacing-4);                 /* 16px */
  background: var(--color-gray-50);          /* #f9fafb */
  border: 2px solid var(--color-gray-200);   /* #e5e7eb */
  border-radius: var(--radius-lg);           /* 12px */
  cursor: pointer;
  transition: all var(--transition-fast);
}

.manage-booking-item:hover {
  border-color: var(--color-gray-300);       /* #d1d5db */
}

.manage-booking-item.selected {
  background: var(--color-primary-light);    /* #eff6ff */
  border-color: var(--color-primary);        /* #2163f6 */
}

.manage-booking-actions {
  margin-top: var(--spacing-4);              /* 16px */
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  gap: var(--spacing-3);                     /* 12px */
  justify-content: flex-end;
}
```

**Workflow:**
1. Lista di prenotazioni (voli o hotel) come card selezionabili
2. Click su card → stato `.selected` (primary border + light bg)
3. Pulsanti "Modifica" e "Elimina" appaiono sotto la lista selezionata
4. Click Modifica → apre form di modifica inline o modal
5. Click Elimina → conferma ed elimina prenotazione

---

## Confronto Overlay

| Componente | Max Width | Posizione | Animazione | Gap/Margin | z-index |
|------------|-----------|-----------|------------|------------|---------|
| Modal standard | 500px | Centro | Scale + translateY | - | 1000 |
| Auth modal | 400px | Centro | Scale + translateY | - | 1000 |
| Slide panel | 420px / 100% mobile | Destra | translateX | - | 1002 |
| Trip modal | 100% | Bottom sheet | translateY + backdrop fade | 30px desktop / 10px mobile | 1000 |

---

## Gestione z-index

| Livello | z-index | Elementi |
|---------|---------|----------|
| Base | `auto` | Contenuto pagina |
| Sticky | `100` | Header, nav |
| Dropdown | `500` | Menu dropdown, tooltip |
| Modal backdrop | `999–1000` | Overlay scuro |
| Modal/Panel | `1000–1002` | Contenuto modale/pannello |
| Toast/Notifiche | `2000` | Messaggi temporanei |

---

## Linee Guida

1. **Una sola modale alla volta**: non aprire mai una modale sopra un'altra modale.
2. **Chiusura con Escape**: tutte le modali devono chiudersi premendo `Escape`.
3. **Chiusura cliccando fuori**: cliccando sull'overlay scuro si chiude la modale.
4. **Focus trap**: quando una modale e aperta, il focus della tastiera deve restare confinato al suo interno.
5. **Scroll bloccato**: quando una modale e aperta, il body sottostante non deve scrollare (`overflow: hidden` sul body).
6. **Animazioni fluide**: utilizzare sempre le transizioni definite, mai aperture/chiusure istantanee.
7. **Slide panel solo da destra**: il pannello entra sempre dal lato destro dello schermo.
8. **Trip modal gap superiore**: i 20px di margine superiore sono intenzionali e mostrano il backdrop scuro dietro gli angoli arrotondati.
