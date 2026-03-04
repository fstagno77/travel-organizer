# Responsive

Strategia responsive dell'applicazione, basata su un approccio mobile-first con breakpoint progressivi.

## Breakpoints

| Token | Valore | Uso |
|-------|--------|-----|
| `--breakpoint-sm` | `576px` | Small devices (telefoni grandi) |
| `--breakpoint-md` | `768px` | Tablet / breakpoint principale mobile-desktop |
| `--breakpoint-lg` | `992px` | Desktop |
| `--breakpoint-xl` | `1200px` | Large desktop |

Il breakpoint **768px** e' il punto di separazione principale tra layout mobile e desktop. La maggior parte degli adattamenti significativi avviene a questa soglia.

### Anteprima visiva: Mobile vs Desktop

<div style="margin: 16px 0; display: flex; gap: 24px; flex-wrap: wrap;">
  <!-- Mobile -->
  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
    <span style="font-size: 13px; font-weight: 500; color: #374151;">Mobile (&lt;768px)</span>
    <div style="width: 180px; height: 320px; border: 2px solid #d1d5db; border-radius: 16px; overflow: hidden; background: white; font-family: Inter, sans-serif;">
      <div style="height: 40px; background: #2163f6; display: flex; align-items: center; padding: 0 8px;">
        <span style="color: white; font-size: 11px; font-weight: 600;">Travel Org.</span>
      </div>
      <div style="padding: 8px;">
        <div style="background: #f3f4f6; border-radius: 8px; padding: 4px; display: flex; gap: 2px; margin-bottom: 8px;">
          <div style="flex: 1; text-align: center; padding: 6px 0; font-size: 9px; background: white; border-radius: 6px; color: #2163f6; font-weight: 500;">Attivit&#224;</div>
          <div style="flex: 1; text-align: center; padding: 6px 0; font-size: 9px; color: #4b5563;">Voli</div>
          <div style="flex: 1; text-align: center; padding: 6px 0; font-size: 9px; color: #4b5563;">Hotel</div>
        </div>
        <div style="height: 50px; background: #f9fafb; border-radius: 8px; margin-bottom: 6px; border: 1px solid #e5e7eb;"></div>
        <div style="height: 50px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;"></div>
      </div>
    </div>
  </div>
  <!-- Desktop -->
  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
    <span style="font-size: 13px; font-weight: 500; color: #374151;">Desktop (&gt;768px)</span>
    <div style="width: 360px; height: 320px; border: 2px solid #d1d5db; border-radius: 8px; overflow: hidden; background: white; font-family: Inter, sans-serif;">
      <div style="height: 40px; background: #2163f6; display: flex; align-items: center; justify-content: space-between; padding: 0 16px;">
        <span style="color: white; font-size: 12px; font-weight: 600;">Travel Organizer</span>
        <div style="display: flex; gap: 8px;">
          <span style="color: rgba(255,255,255,0.8); font-size: 10px;">Viaggi</span>
          <span style="color: rgba(255,255,255,0.8); font-size: 10px;">Profilo</span>
        </div>
      </div>
      <div style="padding: 12px 16px;">
        <div style="display: inline-flex; background: #f3f4f6; border-radius: 8px; padding: 3px; gap: 3px; margin-bottom: 12px;">
          <div style="padding: 6px 16px; font-size: 10px; background: white; border-radius: 6px; color: #2163f6; font-weight: 500;">Attivit&#224;</div>
          <div style="padding: 6px 16px; font-size: 10px; color: #4b5563;">Voli</div>
          <div style="padding: 6px 16px; font-size: 10px; color: #4b5563;">Hotel</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="height: 80px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;"></div>
          <div style="height: 80px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;"></div>
        </div>
      </div>
    </div>
  </div>
</div>

## Media Query principali

```css
/* Mobile-first: gli stili base sono per mobile */

/* Tablet e superiori */
@media (min-width: 768px) {
  /* Layout desktop, pannelli laterali, grid multi-colonna */
}

/* Desktop */
@media (min-width: 992px) {
  /* Contenuti piu' ampi, margini maggiori */
}

/* Large desktop */
@media (min-width: 1200px) {
  /* Max-width contenitore, layout extra-large */
}

/* Solo mobile */
@media (max-width: 768px) {
  /* Override per mobile: full-width, stack verticale */
}

/* Mobile medio */
@media (max-width: 640px) {
  /* Riduzioni font, padding compressi */
}

/* Mobile piccolo */
@media (max-width: 480px) {
  /* Layout minimo, font ridotti ulteriormente */
}
```

## Adattamenti principali

### Container e padding

```css
/* Mobile */
.container {
  padding-left: 16px;
  padding-right: 16px;
}

/* Desktop (min-width: 768px) */
.container {
  padding-left: 24px;
  padding-right: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
```

### Card body

```css
/* Mobile */
.card-body {
  padding: 20px;
}

/* Desktop (min-width: 768px) */
.card-body {
  padding: 24px;
}
```

### Slide Panel

Il pannello laterale per la creazione/modifica delle attivita'.

```css
/* Mobile: pannello a schermo intero */
.slide-panel {
  width: 100%;
}

/* Desktop (min-width: 768px): pannello fisso a destra */
.slide-panel {
  width: 420px;
}
```

### Segmented Control

```css
/* Mobile: espanso a tutta larghezza */
.segmented-control {
  width: 100%;
}
.segmented-control-btn {
  flex: 1;
  text-align: center;
}

/* Desktop: inline, dimensione naturale */
.segmented-control {
  width: auto;
  display: inline-flex;
}
```

### Grid Trip Cards

```css
/* Mobile: colonna singola */
.trip-grid {
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet (min-width: 768px): due colonne */
.trip-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

/* Desktop (min-width: 1200px): tre colonne */
.trip-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
```

### Activity Cards

Su mobile le card attivita' possono scorrere orizzontalmente per risparmiare spazio verticale.

```css
/* Mobile */
.activity-cards-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}

.activity-card {
  scroll-snap-align: start;
  min-width: 280px;
}

/* Desktop: layout verticale normale */
@media (min-width: 768px) {
  .activity-cards-container {
    overflow-x: visible;
  }

  .activity-card {
    min-width: auto;
  }
}
```

### Header Actions

```css
/* Mobile: azioni compresse */
@media (max-width: 768px) {
  .header-actions {
    gap: var(--spacing-1); /* 4px */
  }

  .header-actions .btn-text {
    display: none; /* nasconde il testo, mostra solo icone */
  }
}
```

### Modal

```css
/* Mobile: quasi a schermo intero */
.modal-content {
  width: 100%;
  height: 95vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0; /* 16px top */
  margin-top: auto;
}

/* Desktop: dimensione fissa centrata */
@media (min-width: 768px) {
  .modal-content {
    max-width: 600px;
    height: auto;
    max-height: 85vh;
    border-radius: var(--radius-xl); /* 16px */
    margin: auto;
  }
}
```

### Font sizes su mobile piccolo

```css
@media (max-width: 480px) {
  .trip-card-title {
    font-size: var(--font-size-base); /* 16px invece di 18px */
  }

  .section-title {
    font-size: var(--font-size-lg); /* 20px invece di 24px */
  }

  .empty-state-title {
    font-size: var(--font-size-base); /* 16px invece di 20px */
  }
}
```

## Touch Targets

Tutti gli elementi interattivi rispettano la dimensione minima di **44x44px** su mobile, conforme alle linee guida WCAG 2.1 (criterio 2.5.5 Target Size).

```css
/* Pulsanti e link su mobile */
@media (max-width: 768px) {
  .btn,
  .segmented-control-btn,
  .nav-link,
  .icon-btn {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Elementi con touch target esplicito

| Componente | Dimensione touch target | Note |
|-----------|------------------------|------|
| Segmented control btn | 44px altezza | Full width su mobile |
| Activity view switcher btn | 36x36px (desktop), 44x44px (mobile) | Area di padding estesa |
| Header action buttons | 44x44px | Solo icona su mobile |
| Card link/actions | 44px altezza minima | Area cliccabile espansa |
| Slide panel close button | 44x44px | Angolo in alto a destra |

## Riepilogo breakpoint per componente

| Componente | Mobile (<768px) | Tablet (768-992px) | Desktop (>992px) |
|-----------|-----------------|-------------------|-----------------|
| Container padding | 16px | 24px | 24px |
| Trip card grid | 1 colonna | 2 colonne | 2-3 colonne |
| Slide panel | 100% width | 420px | 420px |
| Segmented control | Full width | Inline | Inline |
| Modal | 95vh, bottom-sheet | Centrato, max 600px | Centrato, max 600px |
| Header actions | Solo icone | Icone + testo | Icone + testo |
| Font sizes | Ridotti (480px) | Standard | Standard |
