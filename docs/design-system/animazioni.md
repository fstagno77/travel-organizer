# Animazioni

Definizione di tutte le transizioni, animazioni keyframe e timing function utilizzate nell'applicazione.

## Transizioni CSS

Tre livelli di velocita' definiti come variabili CSS.

```css
--transition-fast: 150ms ease;   /* Hover, focus, toggle */
--transition-normal: 250ms ease; /* Modal, overlay, contenuti */
--transition-slow: 350ms ease;   /* Pannelli, slide, aperture */
```

| Token | Durata | Curva | Uso tipico |
|-------|--------|-------|------------|
| `--transition-fast` | 150ms | ease | Hover su pulsanti, cambio colore, focus |
| `--transition-normal` | 250ms | ease | Apertura modal, fade overlay |
| `--transition-slow` | 350ms | ease | Slide panel, transizioni di layout |

## Keyframe Animations

### Fade In generico

Transizione di opacita' da invisibile a visibile.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Utilizzata per l'apparizione di overlay, contenuti caricati dinamicamente e notifiche.

### Slide Up

Combinazione di fade e traslazione verso l'alto, usata per card e contenuti che entrano nella viewport.

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Spinner

Rotazione continua per l'indicatore di caricamento.

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

Applicata con `animation: spin 0.8s linear infinite`. La curva `linear` garantisce una rotazione uniforme senza accelerazioni.

#### Demo spinner

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 24px; align-items: center;">
  <div style="width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: docs-spin 0.8s linear infinite;"></div>
  <div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: docs-spin 0.8s linear infinite;"></div>
  <div style="width: 48px; height: 48px; border: 3px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: docs-spin 0.8s linear infinite;"></div>
</div>

<style>
@keyframes docs-spin { to { transform: rotate(360deg); } }
@keyframes docs-pulse-shadow { 0%, 100% { box-shadow: 0 1px 3px rgba(0,0,0,0.1); transform: translateY(0); } 50% { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transform: translateY(-4px); } }
</style>

### Trip Modal Slide In

Il modal del viaggio entra scorrendo dal basso verso l'alto.

```css
@keyframes tripModalSlideIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### Trip Modal Slide Out

Animazione di chiusura del modal, inversa rispetto alla slide in.

```css
@keyframes tripModalSlideOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
```

### Backdrop Fade In

Comparsa graduale dello sfondo scuro dietro al modal.

```css
@keyframes tripBackdropIn {
  from {
    background-color: transparent;
  }
  to {
    background-color: rgba(0, 0, 0, 0.5);
  }
}
```

### Backdrop Fade Out

Scomparsa dello sfondo scuro alla chiusura del modal.

```css
@keyframes tripBackdropOut {
  from {
    background-color: rgba(0, 0, 0, 0.5);
  }
  to {
    background-color: transparent;
  }
}
```

### Highlight Pulse

Pulsazione luminosa usata per evidenziare una card quando l'utente naviga ad essa dalla tab Attivita' (tramite il link "Dettagli").

```css
@keyframes highlightPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
```

L'ombra blu si espande e sfuma, attirando l'attenzione dell'utente sulla card di destinazione.

## Timing Functions

### Panoramica delle curve di temporizzazione

| Curva | Valore | Utilizzo |
|-------|--------|----------|
| `ease` | predefinita | Transizioni semplici (hover, colori, opacita') |
| `linear` | `linear` | Spinner (rotazione uniforme) |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Segmented indicator, transizioni di pulsanti |
| `spring-like` | `cubic-bezier(0.16, 1, 0.3, 1)` | Trip modal slide (effetto rimbalzo) |

#### Confronto visivo delle curve

<div style="margin: 16px 0; padding: 20px; background: #f9fafb; border-radius: 12px; font-family: Inter, sans-serif;">
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="font-size: 12px; min-width: 90px; color: #374151;">ease</code>
      <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60%; background: linear-gradient(90deg, #2163f6, #60a5fa); border-radius: 4px;"></div>
      </div>
      <span style="font-size: 11px; color: #6b7280; min-width: 100px;">Hover, focus</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="font-size: 12px; min-width: 90px; color: #374151;">linear</code>
      <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60%; background: linear-gradient(90deg, #10b981, #6ee7b7); border-radius: 4px;"></div>
      </div>
      <span style="font-size: 11px; color: #6b7280; min-width: 100px;">Spinner</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="font-size: 12px; min-width: 90px; color: #374151;">ease-in-out</code>
      <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60%; background: linear-gradient(90deg, #f59e0b, #fcd34d); border-radius: 4px;"></div>
      </div>
      <span style="font-size: 11px; color: #6b7280; min-width: 100px;">Segmented ctrl</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="font-size: 12px; min-width: 90px; color: #374151;">spring-like</code>
      <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60%; background: linear-gradient(90deg, #ef4444, #fca5a5); border-radius: 4px;"></div>
      </div>
      <span style="font-size: 11px; color: #6b7280; min-width: 100px;">Trip modal</span>
    </div>
  </div>
</div>

### Dettaglio: `cubic-bezier(0.4, 0, 0.2, 1)`

Curva standard di Material Design per transizioni enfatizzate. Partenza lenta, accelerazione rapida, decelerazione morbida.

```css
/* Usata per il segmented indicator */
.segmented-indicator {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Dettaglio: `cubic-bezier(0.16, 1, 0.3, 1)`

Curva "spring-like" con leggero overshoot. Crea un effetto elastico naturale, particolarmente adatto per elementi che entrano dallo schermo.

```css
/* Usata per il trip modal */
.trip-modal {
  animation: tripModalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

## Transizioni per Componente

### Pulsanti

```css
.btn {
  transition: all 150ms ease;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: translateY(0);
}
```

#### Demo effetto hover

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-family: Inter, sans-serif;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Default</span>
    <button style="padding: 10px 20px; font-size: 14px; border: none; color: white; background: #2163f6; border-radius: 8px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 500;">Salva</button>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Hover</span>
    <button style="padding: 10px 20px; font-size: 14px; border: none; color: white; background: #1a53d6; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); font-weight: 500; transform: translateY(-1px);">Salva</button>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Active</span>
    <button style="padding: 10px 20px; font-size: 14px; border: none; color: white; background: #1a53d6; border-radius: 8px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 500; transform: translateY(0);">Salva</button>
  </div>
</div>

### Glass Button (stato active)

```css
.btn-icon-glass:active,
.header-glass-btn:active {
  transform: scale(0.95);
}
```

L'effetto `scale(0.95)` fornisce feedback tattile immediato al tocco.

### Modal apertura/chiusura

```css
.modal {
  transition: opacity 250ms ease;
}

.trip-modal {
  animation: tripModalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.trip-modal.closing {
  animation: tripModalSlideOut 0.3s ease forwards;
}
```

La chiusura (0.3s) e' leggermente piu' veloce dell'apertura (0.4s) per dare una sensazione di reattivita'.

### Segmented Indicator

```css
.segmented-indicator {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

Le proprieta' `transform` e `width` sono animate separatamente per gestire tab di dimensioni diverse. La posizione viene calcolata via JavaScript.

### Trip Card hover

```css
.trip-card {
  transition: all 300ms ease;
}

.trip-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

### Activity Card hover

```css
.activity-card {
  transition: all 0.2s ease;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

Le activity card hanno un'animazione piu' sottile (200ms, -2px) rispetto alle trip card (300ms, -4px) data la loro dimensione minore.

#### Demo card hover

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; font-family: Inter, sans-serif;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Trip card - default</span>
    <div style="width: 160px; height: 100px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 12px;">
      <div style="font-size: 13px; font-weight: 600; color: #111827;">Giappone</div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">15 Mar - 28 Mar</div>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Trip card - hover</span>
    <div style="width: 160px; height: 100px; background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); padding: 12px; transform: translateY(-4px);">
      <div style="font-size: 13px; font-weight: 600; color: #111827;">Giappone</div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">15 Mar - 28 Mar</div>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <span style="font-size: 11px; color: #6b7280;">Activity card - hover</span>
    <div style="width: 160px; height: 100px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); padding: 12px; transform: translateY(-2px);">
      <div style="font-size: 13px; font-weight: 600; color: #111827;">Pranzo sushi</div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">12:30</div>
    </div>
  </div>
</div>

### Slide Panel

Il pannello laterale per le attivita' scorre da destra con una transizione.

```css
.slide-panel-overlay {
  opacity: 0;
  transition: opacity var(--transition-normal); /* 250ms ease */
}

.slide-panel-overlay.active {
  opacity: 1;
}

.slide-panel {
  transform: translateX(100%);
  transition: transform var(--transition-slow); /* 350ms ease */
}

.slide-panel.active {
  transform: translateX(0);
}
```

L'overlay e il pannello animano in parallelo ma con durate diverse: l'overlay si mostra piu' rapidamente (250ms) mentre il pannello scorre piu' lentamente (350ms) per un effetto stratificato.

## Prestazioni

### Proprieta' animate ottimizzate

Le animazioni utilizzano esclusivamente proprieta' che possono essere gestite dal compositor GPU:

- `transform` (translateX, translateY, scale, rotate)
- `opacity`
- `box-shadow` (solo per hover, non in loop)

Non vengono mai animate proprieta' che causano reflow come `width`, `height`, `margin` o `padding`.

### Riduzione movimento

Per gli utenti che preferiscono ridurre le animazioni (impostazione di sistema):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Questa media query rispetta l'impostazione di accessibilita' del sistema operativo, disattivando tutte le animazioni per chi ne ha necessita'.
