# Gradienti e Sfondi

Definizione di tutti i gradienti, sfondi e effetti di trasparenza utilizzati nell'applicazione.

## Background Pagina

Lo sfondo globale dell'applicazione utilizza un gradiente fisso che va dal bianco al blu chiaro.

```css
body {
  background: linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff) fixed;
}
```

<div style="margin: 16px 0; height: 100px; border-radius: 12px; background: linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff); border: 1px solid #e5e7eb;"></div>

Il valore `fixed` assicura che il gradiente resti ancorato alla viewport e non scorra con il contenuto della pagina.

## Header Home Page

L'header della home page usa un gradiente blu intenso verticale, dal tono piu' scuro in basso al piu' chiaro in alto.

```css
.header--home {
  background: linear-gradient(to top, #0D47A1, #1557E0, #2163F6);
}
```

<div style="margin: 16px 0; height: 80px; border-radius: 12px; background: linear-gradient(to top, #0D47A1, #1557E0, #2163F6);"></div>

| Stop | Colore | Posizione |
|------|--------|-----------|
| 1 | `#0D47A1` | Basso (scuro) |
| 2 | `#1557E0` | Centro |
| 3 | `#2163F6` | Alto (chiaro) |

## Trip Modal

Il modal del viaggio replica lo sfondo della pagina per mantenere continuita' visiva.

```css
.trip-modal {
  background: linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff);
}
```

## Overlay Immagine Trip Card

Le card dei viaggi con immagine di copertina usano un overlay gradiente scuro per garantire la leggibilita' del testo sovrapposto.

```css
.trip-card-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.2) 40%,
    transparent 70%
  );
}
```

<div style="margin: 16px 0; height: 120px; border-radius: 12px; background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, #93c5fd 70%); display: flex; align-items: flex-end; padding: 16px;">
  <span style="color: white; font-size: 18px; font-weight: 600; font-family: Inter, sans-serif;">Titolo del viaggio</span>
</div>

L'overlay e' piu' denso in basso (dove si trova il titolo) e sfuma verso la trasparenza in alto, permettendo di vedere l'immagine.

## Pulsante CTA

Il pulsante call-to-action principale usa un gradiente orizzontale blu-indaco.

```css
.cta-btn {
  background: linear-gradient(to right, #2563eb, #4f46e5);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-lg); /* 12px */
  padding: var(--spacing-3) var(--spacing-6); /* 12px 24px */
  font-weight: var(--font-weight-semibold); /* 600 */
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.cta-btn:hover {
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
}
```

<div style="margin: 16px 0;">
  <button style="padding: 12px 24px; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; font-family: Inter, sans-serif; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">Crea nuovo viaggio</button>
</div>

## Indicatori Status Viaggio

Piccoli indicatori colorati che segnalano lo stato temporale di un viaggio.

<div style="margin: 16px 0; display: flex; gap: 24px; align-items: center;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(to bottom, #4ade80, #10b981);"></div>
    <span style="font-size: 14px; font-family: Inter, sans-serif; color: #374151;">In corso</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(to bottom, #60a5fa, #6366f1);"></div>
    <span style="font-size: 14px; font-family: Inter, sans-serif; color: #374151;">Futuro</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(to bottom, #cbd5e1, #94a3b8);"></div>
    <span style="font-size: 14px; font-family: Inter, sans-serif; color: #374151;">Passato</span>
  </div>
</div>

### Viaggio Corrente (in corso)

```css
.trip-status-current {
  background: linear-gradient(to bottom, #4ade80, #10b981);
}
```

Gradiente verde, dal verde chiaro (`#4ade80`) al verde medio (`#10b981`).

### Viaggio Futuro

```css
.trip-status-future {
  background: linear-gradient(to bottom, #60a5fa, #6366f1);
}
```

Gradiente blu-indaco, dal blu chiaro (`#60a5fa`) all'indaco (`#6366f1`).

### Viaggio Passato

```css
.trip-status-past {
  background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
}
```

Gradiente grigio, dal grigio chiaro (`#cbd5e1`) al grigio medio (`#94a3b8`).

### Tabella riassuntiva

| Stato | Colore inizio | Colore fine | Significato |
|-------|--------------|-------------|-------------|
| Corrente | `#4ade80` | `#10b981` | Viaggio in corso |
| Futuro | `#60a5fa` | `#6366f1` | Viaggio pianificato |
| Passato | `#cbd5e1` | `#94a3b8` | Viaggio concluso |

## Glassmorphism

Effetto vetro smerigliato usato per i pulsanti nell'header della home page, dove lo sfondo e' un gradiente blu.

```css
.btn-icon-glass,
.header-glass-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-lg); /* 12px */
  color: var(--color-white);
  transition: all var(--transition-fast); /* 150ms ease */
}

.btn-icon-glass:hover,
.header-glass-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.btn-icon-glass:active,
.header-glass-btn:active {
  transform: scale(0.95);
}
```

<div style="margin: 16px 0; padding: 24px; background: linear-gradient(135deg, #1557E0, #2163F6); border-radius: 12px; display: flex; gap: 12px;">
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; backdrop-filter: blur(12px);">&#8592;</div>
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; backdrop-filter: blur(12px);">&#8942;</div>
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; backdrop-filter: blur(12px);">&#10005;</div>
</div>

### Proprieta' chiave del glassmorphism

| Proprieta' | Valore | Scopo |
|-----------|--------|-------|
| `background` | `rgba(255, 255, 255, 0.15)` | Sfondo semi-trasparente bianco |
| `border` | `1.5px solid rgba(255, 255, 255, 0.35)` | Bordo sottile per definizione |
| `backdrop-filter` | `blur(12px)` | Sfocatura dello sfondo sottostante |
| `box-shadow` | `0 4px 12px rgba(0, 0, 0, 0.08)` | Ombra leggera per profondita' |

## Gradienti Categorie Attivita'

Ogni categoria di attivita' ha un set di gradienti dedicato, usato per il badge dell'icona, lo stato hover e lo sfondo della card.

<div style="margin: 16px 0; display: flex; gap: 12px; flex-wrap: wrap;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Ristorante</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Volo</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M9 16h.01"/><path d="M15 16h.01"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ec4899, #db2777); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-4 7 4v12"/><path d="M9 20v-4h6v4"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Museo</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #14b8a6, #0d9488); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Attrazione</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Treno</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #4f46e5); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></div>
    <span style="font-size: 11px; color: #6b7280;">Luogo</span>
  </div>
</div>

### Ristorante

```css
/* Badge icona */
background: linear-gradient(135deg, #f97316, #ea580c);
/* Hover card */
background: linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(234, 88, 12, 0.04));
/* Bordo hover */
border-color: rgba(249, 115, 22, 0.2);
```

### Volo

```css
/* Badge icona */
background: linear-gradient(135deg, #3b82f6, #2563eb);
/* Hover card */
background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.04));
/* Bordo hover */
border-color: rgba(59, 130, 246, 0.2);
```

### Hotel

```css
/* Badge icona */
background: linear-gradient(135deg, #8b5cf6, #7c3aed);
/* Hover card */
background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(124, 58, 237, 0.04));
/* Bordo hover */
border-color: rgba(139, 92, 246, 0.2);
```

### Museo

```css
/* Badge icona */
background: linear-gradient(135deg, #ec4899, #db2777);
/* Hover card */
background: linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(219, 39, 119, 0.04));
/* Bordo hover */
border-color: rgba(236, 72, 153, 0.2);
```

### Attrazione

```css
/* Badge icona */
background: linear-gradient(135deg, #14b8a6, #0d9488);
/* Hover card */
background: linear-gradient(135deg, rgba(20, 184, 166, 0.08), rgba(13, 148, 136, 0.04));
/* Bordo hover */
border-color: rgba(20, 184, 166, 0.2);
```

### Treno

```css
/* Badge icona */
background: linear-gradient(135deg, #f59e0b, #d97706);
/* Hover card */
background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.04));
/* Bordo hover */
border-color: rgba(245, 158, 11, 0.2);
```

### Luogo

```css
/* Badge icona */
background: linear-gradient(135deg, #6366f1, #4f46e5);
/* Hover card */
background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.04));
/* Bordo hover */
border-color: rgba(99, 102, 241, 0.2);
```

### Tabella riassuntiva categorie

| Categoria | Colore primario | Colore secondario | Direzione |
|-----------|----------------|-------------------|-----------|
| Ristorante | `#f97316` | `#ea580c` | 135deg |
| Volo | `#3b82f6` | `#2563eb` | 135deg |
| Hotel | `#8b5cf6` | `#7c3aed` | 135deg |
| Museo | `#ec4899` | `#db2777` | 135deg |
| Attrazione | `#14b8a6` | `#0d9488` | 135deg |
| Treno | `#f59e0b` | `#d97706` | 135deg |
| Luogo | `#6366f1` | `#4f46e5` | 135deg |

Tutti i gradienti delle categorie usano la direzione `135deg` per coerenza visiva. L'opacita' negli hover e' mantenuta bassa (0.04-0.08) per un effetto sottile.
