# Colori

La palette colori di Travel Organizer si basa su variabili CSS definite nel `:root`. Ogni colore ha un ruolo specifico nell'interfaccia e deve essere utilizzato in modo coerente.

## Colori Primari

La famiglia primaria (blu) rappresenta l'identita visiva principale dell'applicazione.

| Token | Valore | Anteprima | Uso |
|-------|--------|-----------|-----|
| `--color-primary` | `#2163f6` | ![#2163f6](https://via.placeholder.com/16/2163f6/2163f6) | Colore principale: pulsanti, link, header voli |
| `--color-primary-dark` | `#1a50c7` | ![#1a50c7](https://via.placeholder.com/16/1a50c7/1a50c7) | Stato hover su elementi primari |
| `--color-primary-light` | `#e6f0fa` | ![#e6f0fa](https://via.placeholder.com/16/e6f0fa/e6f0fa) | Background leggero, focus ring su input |

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #2163f6; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primary</span>
    <code style="font-size: 11px;">#2163f6</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #1a50c7; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primary Dark</span>
    <code style="font-size: 11px;">#1a50c7</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #e6f0fa; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primary Light</span>
    <code style="font-size: 11px;">#e6f0fa</code>
  </div>
</div>

```css
:root {
  --color-primary: #2163f6;
  --color-primary-dark: #1a50c7;
  --color-primary-light: #e6f0fa;
}
```

### Esempi d'uso

- **Pulsanti principali**: `background: var(--color-primary)`
- **Hover pulsanti**: `background: var(--color-primary-dark)`
- **Focus ring input**: `box-shadow: 0 0 0 3px var(--color-primary-light)`
- **Header flight card**: `background: var(--color-primary)`

---

## Colori Secondari

La famiglia secondaria (arancione) viene usata per accenti e azioni alternative.

| Token | Valore | Anteprima | Uso |
|-------|--------|-----------|-----|
| `--color-secondary` | `#ff6b35` | ![#ff6b35](https://via.placeholder.com/16/ff6b35/ff6b35) | Accento arancione |
| `--color-secondary-dark` | `#e55a2b` | ![#e55a2b](https://via.placeholder.com/16/e55a2b/e55a2b) | Hover secondario |
| `--color-secondary-light` | `#fff0eb` | ![#fff0eb](https://via.placeholder.com/16/fff0eb/fff0eb) | Background secondario leggero |

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ff6b35; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Secondary</span>
    <code style="font-size: 11px;">#ff6b35</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #e55a2b; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Secondary Dark</span>
    <code style="font-size: 11px;">#e55a2b</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fff0eb; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Secondary Light</span>
    <code style="font-size: 11px;">#fff0eb</code>
  </div>
</div>

```css
:root {
  --color-secondary: #ff6b35;
  --color-secondary-dark: #e55a2b;
  --color-secondary-light: #fff0eb;
}
```

---

## Hotel (Tema Verde/Smeraldo)

Le card hotel utilizzano una palette verde/smeraldo dedicata, con diverse sfumature per creare gerarchia visiva.

| Token | Valore | Anteprima | Uso |
|-------|--------|-----------|-----|
| `--color-hotel-50` | `#edf7f2` | ![#edf7f2](https://via.placeholder.com/16/edf7f2/edf7f2) | Background molto leggero |
| `--color-hotel-100` | `#d1ebdf` | ![#d1ebdf](https://via.placeholder.com/16/d1ebdf/d1ebdf) | Background leggero |
| `--color-hotel-200` | `#a3d7bf` | ![#a3d7bf](https://via.placeholder.com/16/a3d7bf/a3d7bf) | Bordi leggeri, decorazioni |
| `--color-hotel-300` | `#6bbf9a` | ![#6bbf9a](https://via.placeholder.com/16/6bbf9a/6bbf9a) | Elementi decorativi |
| `--color-hotel-600` | `#2e9568` | ![#2e9568](https://via.placeholder.com/16/2e9568/2e9568) | Header hotel card, pulsanti hotel |
| `--color-hotel-700` | `#257a56` | ![#257a56](https://via.placeholder.com/16/257a56/257a56) | Hover pulsanti hotel |
| `--color-hotel-800` | `#1c5f43` | ![#1c5f43](https://via.placeholder.com/16/1c5f43/1c5f43) | Testo su background chiaro hotel |

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #edf7f2; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 50</span>
    <code style="font-size: 11px;">#edf7f2</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #d1ebdf; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 100</span>
    <code style="font-size: 11px;">#d1ebdf</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #a3d7bf; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 200</span>
    <code style="font-size: 11px;">#a3d7bf</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #6bbf9a; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 300</span>
    <code style="font-size: 11px;">#6bbf9a</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #2e9568; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 600</span>
    <code style="font-size: 11px;">#2e9568</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #257a56; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 700</span>
    <code style="font-size: 11px;">#257a56</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #1c5f43; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel 800</span>
    <code style="font-size: 11px;">#1c5f43</code>
  </div>
</div>

```css
:root {
  --color-hotel-50: #edf7f2;
  --color-hotel-100: #d1ebdf;
  --color-hotel-200: #a3d7bf;
  --color-hotel-300: #6bbf9a;
  --color-hotel-600: #2e9568;
  --color-hotel-700: #257a56;
  --color-hotel-800: #1c5f43;
}
```

### Esempio: Header Hotel Card

```css
.hotel-card__header {
  background: var(--color-hotel-600); /* #2e9568 */
  color: var(--color-white);
}

.hotel-btn--primary:hover {
  background: var(--color-hotel-700); /* #257a56 */
}
```

---

## Scala di Grigi

La scala di grigi fornisce i colori neutri per testo, bordi, background e stati disabilitati.

| Token | Valore | Anteprima | Uso |
|-------|--------|-----------|-----|
| `--color-white` | `#ffffff` | ![#ffffff](https://via.placeholder.com/16/ffffff/ffffff) | Background card, modali |
| `--color-gray-50` | `#f9fafb` | ![#f9fafb](https://via.placeholder.com/16/f9fafb/f9fafb) | Background footer card |
| `--color-gray-100` | `#f3f4f6` | ![#f3f4f6](https://via.placeholder.com/16/f3f4f6/f3f4f6) | Background segmented control, separatori |
| `--color-gray-200` | `#e5e7eb` | ![#e5e7eb](https://via.placeholder.com/16/e5e7eb/e5e7eb) | Bordi, divisori |
| `--color-gray-300` | `#d1d5db` | ![#d1d5db](https://via.placeholder.com/16/d1d5db/d1d5db) | Bordi input |
| `--color-gray-400` | `#9ca3af` | ![#9ca3af](https://via.placeholder.com/16/9ca3af/9ca3af) | Icone disabilitate, header voli passati |
| `--color-gray-500` | `#566378` | ![#566378](https://via.placeholder.com/16/566378/566378) | Testo secondario |
| `--color-gray-600` | `#4b5563` | ![#4b5563](https://via.placeholder.com/16/4b5563/4b5563) | Testo nav link |
| `--color-gray-700` | `#374151` | ![#374151](https://via.placeholder.com/16/374151/374151) | Testo label form |
| `--color-gray-800` | `#1f2937` | ![#1f2937](https://via.placeholder.com/16/1f2937/1f2937) | Testo corpo |
| `--color-gray-900` | `#111827` | ![#111827](https://via.placeholder.com/16/111827/111827) | Titoli, testo scuro |

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ffffff; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">White</span>
    <code style="font-size: 11px;">#ffffff</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 50</span>
    <code style="font-size: 11px;">#f9fafb</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 100</span>
    <code style="font-size: 11px;">#f3f4f6</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #e5e7eb; border: 1px solid #d1d5db;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 200</span>
    <code style="font-size: 11px;">#e5e7eb</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #d1d5db; border: 1px solid #9ca3af;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 300</span>
    <code style="font-size: 11px;">#d1d5db</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #9ca3af; border: 1px solid #6b7280;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 400</span>
    <code style="font-size: 11px;">#9ca3af</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #566378; border: 1px solid #4b5563;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 500</span>
    <code style="font-size: 11px;">#566378</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #4b5563; border: 1px solid #374151;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 600</span>
    <code style="font-size: 11px;">#4b5563</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #374151; border: 1px solid #1f2937;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 700</span>
    <code style="font-size: 11px;">#374151</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #1f2937; border: 1px solid #111827;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 800</span>
    <code style="font-size: 11px;">#1f2937</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #111827; border: 1px solid #111827;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gray 900</span>
    <code style="font-size: 11px;">#111827</code>
  </div>
</div>

```css
:root {
  --color-white: #ffffff;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #566378;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}
```

### Gerarchia Testo

```css
/* Titoli principali */
h1, h2 { color: var(--color-gray-900); }

/* Testo corpo */
body { color: var(--color-gray-800); }

/* Testo secondario, descrizioni */
.text-secondary { color: var(--color-gray-500); }

/* Nav link */
.nav-link { color: var(--color-gray-600); }

/* Label form */
.form-label { color: var(--color-gray-700); }
```

---

## Colori Semantici

Colori riservati a stati e feedback dell'interfaccia.

| Token | Valore | Anteprima | Uso |
|-------|--------|-----------|-----|
| `--color-success` | `#10b981` | ![#10b981](https://via.placeholder.com/16/10b981/10b981) | Conferme, stati positivi |
| `--color-warning` | `#f59e0b` | ![#f59e0b](https://via.placeholder.com/16/f59e0b/f59e0b) | Avvisi, attenzione |
| `--color-error` | `#ef4444` | ![#ef4444](https://via.placeholder.com/16/ef4444/ef4444) | Errori, azioni di eliminazione |
| `--color-info` | `#3b82f6` | ![#3b82f6](https://via.placeholder.com/16/3b82f6/3b82f6) | Informazioni |

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #10b981; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Success</span>
    <code style="font-size: 11px;">#10b981</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #f59e0b; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Warning</span>
    <code style="font-size: 11px;">#f59e0b</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ef4444; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Error</span>
    <code style="font-size: 11px;">#ef4444</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #3b82f6; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Info</span>
    <code style="font-size: 11px;">#3b82f6</code>
  </div>
</div>

```css
:root {
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Esempio: Messaggio di Errore

```css
.form-error {
  color: var(--color-error); /* #ef4444 */
  font-size: var(--font-size-sm);
}

.btn-danger {
  background: var(--color-error);
  color: var(--color-white);
}
```

---

## Colori Categorie Attivita

Ogni categoria di attivita ha una palette dedicata composta da gradiente, colore primario, background card e bordo.

### Ristorante

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#fbbf24 → #f97316` |
| Colore primario | `#f59e0b` |
| Card background | `linear-gradient(135deg, #fffbeb, #fff7ed)` |
| Bordo | `#fde68a` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #fbbf24, #f97316); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #f59e0b; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#f59e0b</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #fffbeb, #fff7ed); border: 1px solid #fde68a;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fde68a; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#fde68a</code>
  </div>
</div>

```css
.activity-card[data-category="restaurant"] {
  background: linear-gradient(135deg, #fffbeb, #fff7ed);
  border: 1px solid #fde68a;
}

.activity-card[data-category="restaurant"] .activity-icon {
  background: linear-gradient(135deg, #fbbf24, #f97316);
}
```

### Volo

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#3b82f6 → #4f46e5` |
| Colore primario | `#2563eb` |
| Card background | `linear-gradient(135deg, #eff6ff, #eef2ff)` |
| Bordo | `#bfdbfe` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #4f46e5); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #2563eb; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#2563eb</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #eff6ff, #eef2ff); border: 1px solid #bfdbfe;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #bfdbfe; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#bfdbfe</code>
  </div>
</div>

```css
.activity-card[data-category="flight"] {
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  border: 1px solid #bfdbfe;
}

.activity-card[data-category="flight"] .activity-icon {
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
}
```

### Hotel

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#34d399 → #14b8a6` |
| Colore primario | `#10b981` |
| Card background | `linear-gradient(135deg, #ecfdf5, #f0fdfa)` |
| Bordo | `#a7f3d0` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #34d399, #14b8a6); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #10b981; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#10b981</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #ecfdf5, #f0fdfa); border: 1px solid #a7f3d0;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #a7f3d0; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#a7f3d0</code>
  </div>
</div>

```css
.activity-card[data-category="hotel"] {
  background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
  border: 1px solid #a7f3d0;
}

.activity-card[data-category="hotel"] .activity-icon {
  background: linear-gradient(135deg, #34d399, #14b8a6);
}
```

### Museo

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#c084fc → #a855f7` |
| Colore primario | `#a855f7` |
| Card background | `#faf5ff` |
| Bordo | `#e9d5ff` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #c084fc, #a855f7); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #a855f7; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#a855f7</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #faf5ff; border: 1px solid #e9d5ff;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
    <code style="font-size: 11px;">#faf5ff</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #e9d5ff; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#e9d5ff</code>
  </div>
</div>

```css
.activity-card[data-category="museum"] {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
}

.activity-card[data-category="museum"] .activity-icon {
  background: linear-gradient(135deg, #c084fc, #a855f7);
}
```

### Attrazione

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#f472b6 → #ec4899` |
| Colore primario | `#ec4899` |
| Card background | `#fdf2f8` |
| Bordo | `#fbcfe8` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #f472b6, #ec4899); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ec4899; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#ec4899</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fdf2f8; border: 1px solid #fbcfe8;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
    <code style="font-size: 11px;">#fdf2f8</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fbcfe8; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#fbcfe8</code>
  </div>
</div>

```css
.activity-card[data-category="attraction"] {
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
}

.activity-card[data-category="attraction"] .activity-icon {
  background: linear-gradient(135deg, #f472b6, #ec4899);
}
```

### Treno

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#f87171 → #ef4444` |
| Colore primario | `#ef4444` |
| Card background | `#fef2f2` |
| Bordo | `#fecaca` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #f87171, #ef4444); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ef4444; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#ef4444</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
    <code style="font-size: 11px;">#fef2f2</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #fecaca; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#fecaca</code>
  </div>
</div>

```css
.activity-card[data-category="train"] {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.activity-card[data-category="train"] .activity-icon {
  background: linear-gradient(135deg, #f87171, #ef4444);
}
```

### Luogo

| Proprieta | Valore |
|-----------|--------|
| Gradiente | `#22d3ee → #06b6d4` |
| Colore primario | `#06b6d4` |
| Card background | `#ecfeff` |
| Bordo | `#a5f3fc` |

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #22d3ee, #06b6d4); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Gradiente</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #06b6d4; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Primario</span>
    <code style="font-size: 11px;">#06b6d4</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #ecfeff; border: 1px solid #a5f3fc;"></div>
    <span style="font-size: 11px; color: #6b7280;">Card BG</span>
    <code style="font-size: 11px;">#ecfeff</code>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 64px; height: 64px; border-radius: 8px; background: #a5f3fc; border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Bordo</span>
    <code style="font-size: 11px;">#a5f3fc</code>
  </div>
</div>

```css
.activity-card[data-category="place"] {
  background: #ecfeff;
  border: 1px solid #a5f3fc;
}

.activity-card[data-category="place"] .activity-icon {
  background: linear-gradient(135deg, #22d3ee, #06b6d4);
}
```

---

## Tabella Riassuntiva Categorie

| Categoria | Gradiente | Colore primario | Card background | Bordo |
|-----------|-----------|-----------------|-----------------|-------|
| Ristorante | `#fbbf24 → #f97316` | `#f59e0b` | `#fffbeb → #fff7ed` | `#fde68a` |
| Volo | `#3b82f6 → #4f46e5` | `#2563eb` | `#eff6ff → #eef2ff` | `#bfdbfe` |
| Hotel | `#34d399 → #14b8a6` | `#10b981` | `#ecfdf5 → #f0fdfa` | `#a7f3d0` |
| Museo | `#c084fc → #a855f7` | `#a855f7` | `#faf5ff` | `#e9d5ff` |
| Attrazione | `#f472b6 → #ec4899` | `#ec4899` | `#fdf2f8` | `#fbcfe8` |
| Treno | `#f87171 → #ef4444` | `#ef4444` | `#fef2f2` | `#fecaca` |
| Luogo | `#22d3ee → #06b6d4` | `#06b6d4` | `#ecfeff` | `#a5f3fc` |

<div style="display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #fbbf24, #f97316); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Ristorante</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #4f46e5); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Volo</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #34d399, #14b8a6); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Hotel</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #c084fc, #a855f7); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Museo</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #f472b6, #ec4899); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Attrazione</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #f87171, #ef4444); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Treno</span>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #22d3ee, #06b6d4); border: 1px solid #e5e7eb;"></div>
    <span style="font-size: 11px; color: #6b7280;">Luogo</span>
  </div>
</div>

---

## Linee Guida

1. **Utilizzare sempre le variabili CSS** invece dei valori hex diretti nel codice.
2. **Non inventare nuovi colori**: ogni colore deve provenire dalla palette definita.
3. **Rispettare la gerarchia**: i colori primari sono per le azioni principali, i secondari per accenti.
4. **Contrasto**: assicurarsi che il testo su background colorato abbia un rapporto di contrasto sufficiente (WCAG AA minimo 4.5:1).
5. **Stato disabilitato**: usare `--color-gray-400` per elementi non interattivi o voli passati.
