# Icone

Il sistema di icone utilizza tre fonti: font icon di Google (Material Icons e Material Symbols), icone SVG inline per le categorie attivita' e icone SVG inline per elementi UI.

## Font Icon Libraries

### Material Icons (Filled)

Icone filled caricate da Google Fonts tramite `css/fonts.css`.

```css
@font-face {
  font-family: 'Material Icons';
  src: url('https://fonts.gstatic.com/...') format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-size: 24px;
  direction: ltr;
  display: inline-block;
  -webkit-font-smoothing: antialiased;
}
```

### Material Symbols Outlined

Icone outlined, utilizzate principalmente per le categorie delle attivita'. Caricate da Google Fonts in `css/fonts.css`.

```css
@font-face {
  font-family: 'Material Symbols Outlined';
  src: url('https://fonts.gstatic.com/...') format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-size: 24px;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

## Icone SVG per Categorie Attivita'

Definite in `js/activityCategories.js`. Tutte le icone hanno viewBox `0 0 16 16`, sono stroke-based (senza fill) e usano `stroke-width="1.5"` con `stroke-linecap="round"` e `stroke-linejoin="round"`.

```html
<!-- Esempio: icona ristorante -->
<svg viewBox="0 0 16 16" width="16" height="16" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <!-- paths specifici della categoria -->
</svg>
```

### Catalogo categorie

| Icona | ID Categoria | Nome | Descrizione visiva |
|-------|-------------|------|--------------------|
| `restaurant` | `restaurant` | Ristorante | Forchetta e coltello incrociati |
| `flight` | `flight` | Volo | Aeroplano stilizzato |
| `hotel` | `hotel` | Hotel | Edificio / struttura ricettiva |
| `museum` | `museum` | Museo | Edificio con colonne classiche |
| `camera` | `attraction` | Attrazione | Macchina fotografica |
| `train` | `train` | Treno | Treno / locomotiva |
| `explore` | `place` | Luogo | Bussola / rosa dei venti |

Queste icone vengono renderizzate all'interno dei badge delle categorie attivita', ereditando il colore dalla proprieta' CSS `color` del contenitore tramite `stroke="currentColor"`.

### Badge categorie attivita'

Ogni categoria viene visualizzata come un badge con gradiente colorato e icona bianca:

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

## Icone SVG UI

Icone definite direttamente inline nei componenti HTML/JS per elementi dell'interfaccia.

### Catalogo icone UI

| Nome | Dimensione | Utilizzo | Descrizione |
|------|-----------|----------|-------------|
| `search` | 20x20 | Barra di ricerca | Lente di ingrandimento |
| `filter` | 20x20 | Filtro categorie | Imbuto / linee di filtro |
| `close` | 20x20 | Chiusura panel e modal | Croce (X) |
| `plusCircle` | 20x20 | Aggiunta elementi | Cerchio con segno + |
| `externalLink` | 16x16 | Link esterni (URL attivita') | Freccia verso l'esterno |
| `airplane` | 24x24 | Logo nell'header | Aeroplano inclinato |
| `bell` | 20x20 | Notifiche nell'header | Campanella |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 16px; text-align: center; font-family: Inter, sans-serif;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
    <span style="font-size: 11px; color: #6b7280;">flight</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    <span style="font-size: 11px; color: #6b7280;">restaurant</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M9 16h.01"/><path d="M15 16h.01"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>
    <span style="font-size: 11px; color: #6b7280;">hotel</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-4 7 4v12"/><path d="M9 20v-4h6v4"/></svg>
    <span style="font-size: 11px; color: #6b7280;">museum</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg>
    <span style="font-size: 11px; color: #6b7280;">train</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    <span style="font-size: 11px; color: #6b7280;">camera</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    <span style="font-size: 11px; color: #6b7280;">location</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <span style="font-size: 11px; color: #6b7280;">search</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    <span style="font-size: 11px; color: #6b7280;">close</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    <span style="font-size: 11px; color: #6b7280;">plus</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    <span style="font-size: 11px; color: #6b7280;">link</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    <span style="font-size: 11px; color: #6b7280;">bell</span>
  </div>
</div>

### Esempio di utilizzo

```html
<!-- Icona di chiusura (close) -->
<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
     stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <line x1="5" y1="5" x2="15" y2="15" />
  <line x1="15" y1="5" x2="5" y2="15" />
</svg>
```

Le icone UI usano `stroke="currentColor"` per ereditare il colore dal contesto CSS. Questo permette di cambiare colore nelle transizioni hover semplicemente modificando la proprieta' `color` dell'elemento padre.

## Material Symbols usati nell'applicazione

Elenco dei simboli Material utilizzati nei vari componenti:

| Simbolo | Contesto | Componente |
|---------|----------|-----------|
| `restaurant` | Categoria ristorante | Badge attivita' |
| `bed` | Categoria hotel | Badge attivita' |
| `train` | Categoria treno | Badge attivita' |
| `location_on` | Categoria luogo | Badge attivita' |
| `calendar_today` | Selezione date | Form attivita' |
| `event` | Eventi nel calendario | Vista calendario |
| `flight` | Voli | Card voli |
| `hotel` | Hotel | Card hotel |
| `edit` | Modifica | Pulsanti azione |
| `delete` | Eliminazione | Pulsanti azione |
| `add` | Aggiunta | Pulsanti azione |
| `close` | Chiusura | Modal e pannelli |

## Linee guida

- Preferire le icone SVG inline per icone specifiche dell'applicazione (categorie, UI custom)
- Usare Material Symbols Outlined per icone generiche e di sistema
- Mantenere dimensioni coerenti: 16px per icone piccole inline, 20px per icone UI standard, 24px per icone prominenti
- Usare sempre `stroke="currentColor"` o `fill="currentColor"` per permettere la tematizzazione via CSS
- Per le icone nelle aree di tocco mobile, assicurarsi che il contenitore abbia almeno 44x44px
