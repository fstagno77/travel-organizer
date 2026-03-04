# Tipografia

Il sistema tipografico di Travel Organizer si basa sul font **Inter**, progettato specificamente per la leggibilita su schermo.

## Font Families

```css
:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', Consolas, monospace;
}
```

Inter viene caricato da Google Fonts con i pesi 400, 500, 600 e 700:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Il font monospace (`--font-mono`) viene utilizzato esclusivamente per codici di riferimento e numeri di biglietto.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div>
    <span style="font-size: 16px; font-weight: 500; color: #111827;">Inter (sans-serif)</span>
    <span style="font-size: 12px; color: #9ca3af; margin-left: 12px;">— Font principale</span>
  </div>
  <div style="font-size: 18px; font-weight: 400; color: #374151; line-height: 1.6;">
    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>
    abcdefghijklmnopqrstuvwxyz<br>
    0123456789 !@#$%&*()
  </div>
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
    <span style="font-size: 16px; font-weight: 500; color: #111827; font-family: 'SF Mono', 'Fira Code', Consolas, monospace;">SF Mono / Fira Code (monospace)</span>
    <span style="font-size: 12px; color: #9ca3af; margin-left: 12px;">— Codici e numeri biglietto</span>
  </div>
  <div style="font-size: 16px; font-weight: 400; color: #374151; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; line-height: 1.6;">
    TKT-0551234567890 &middot; PNR: ABC123 &middot; REF: 7X9K2M
  </div>
</div>

---

## Scala Dimensioni

La scala tipografica segue una progressione basata su `rem` per garantire accessibilita e scalabilita.

| Token | Valore | Pixel | Uso |
|-------|--------|-------|-----|
| `--font-size-xs` | `0.75rem` | 12px | Badge, hint, label secondari |
| `--font-size-sm` | `0.875rem` | 14px | Pulsanti, nav link, messaggi errore form |
| `--font-size-base` | `1rem` | 16px | Testo corpo, input |
| `--font-size-lg` | `1.125rem` | 18px | Logo, sottotitoli |
| `--font-size-xl` | `1.25rem` | 20px | Titoli sezione, titolo empty state |
| `--font-size-2xl` | `1.5rem` | 24px | Titoli pagina |
| `--font-size-3xl` | `1.875rem` | 30px | Titoli grandi |
| `--font-size-4xl` | `2.25rem` | 36px | Icone empty state |

```css
:root {
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 14px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 12px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">xs — 12px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 14px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">sm — 14px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 16px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">base — 16px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 18px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">lg — 18px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 20px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">xl — 20px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 24px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">2xl — 24px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 30px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">3xl — 30px</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-size: 36px; color: #111827;">Testo di esempio</span>
    <span style="font-size: 11px; color: #9ca3af;">4xl — 36px</span>
  </div>
</div>

---

## Pesi

I pesi del font definiscono la gerarchia visiva del testo.

| Token | Valore | Uso |
|-------|--------|-----|
| `--font-weight-normal` | `400` | Testo corpo, descrizioni, paragrafi |
| `--font-weight-medium` | `500` | Label, pulsanti, nav link, testo form |
| `--font-weight-semibold` | `600` | Titoli sezione, titolo empty state, sottotitoli card |
| `--font-weight-bold` | `700` | Logo, titoli principali, numeri importanti |

```css
:root {
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 14px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; font-size: 18px;">
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-weight: 400; color: #111827;">Travel Organizer</span>
    <span style="font-size: 11px; color: #9ca3af;">400 normal</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-weight: 500; color: #111827;">Travel Organizer</span>
    <span style="font-size: 11px; color: #9ca3af;">500 medium</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-weight: 600; color: #111827;">Travel Organizer</span>
    <span style="font-size: 11px; color: #9ca3af;">600 semibold</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px;">
    <span style="font-weight: 700; color: #111827;">Travel Organizer</span>
    <span style="font-size: 11px; color: #9ca3af;">700 bold</span>
  </div>
</div>

### Abbinamenti Consigliati

| Elemento | Dimensione | Peso | Colore |
|----------|------------|------|--------|
| Titolo pagina (h1) | `--font-size-2xl` (24px) | `--font-weight-bold` (700) | `--color-gray-900` |
| Titolo sezione (h2) | `--font-size-xl` (20px) | `--font-weight-semibold` (600) | `--color-gray-900` |
| Sottotitolo (h3) | `--font-size-lg` (18px) | `--font-weight-semibold` (600) | `--color-gray-800` |
| Testo corpo | `--font-size-base` (16px) | `--font-weight-normal` (400) | `--color-gray-800` |
| Testo secondario | `--font-size-sm` (14px) | `--font-weight-normal` (400) | `--color-gray-500` |
| Label form | `--font-size-sm` (14px) | `--font-weight-medium` (500) | `--color-gray-700` |
| Pulsante | `--font-size-sm` (14px) | `--font-weight-medium` (500) | variabile |
| Badge | `--font-size-xs` (12px) | `--font-weight-medium` (500) | variabile |
| Logo | `--font-size-lg` (18px) | `--font-weight-bold` (700) | `--color-gray-900` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 20px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 24px; font-weight: 700; color: #111827; line-height: 1.25;">I miei viaggi</span>
    <span style="font-size: 11px; color: #9ca3af;">Titolo pagina — 24px / 700</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 20px; font-weight: 600; color: #111827; line-height: 1.25;">Voli prenotati</span>
    <span style="font-size: 11px; color: #9ca3af;">Titolo sezione — 20px / 600</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 18px; font-weight: 600; color: #1f2937; line-height: 1.25;">Milano &rarr; Tokyo</span>
    <span style="font-size: 11px; color: #9ca3af;">Sottotitolo — 18px / 600</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.5;">Partenza prevista alle ore 10:30 dal Terminal 1.</span>
    <span style="font-size: 11px; color: #9ca3af;">Testo corpo — 16px / 400</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">Aggiornato 2 ore fa</span>
    <span style="font-size: 11px; color: #9ca3af;">Testo secondario — 14px / 400</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 14px; font-weight: 500; color: #374151; line-height: 1.5;">Nome passeggero</span>
    <span style="font-size: 11px; color: #9ca3af;">Label form — 14px / 500</span>
  </div>
  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 14px; font-weight: 500; color: #ffffff; background: #2563eb; padding: 6px 16px; border-radius: 8px; line-height: 1.5;">Aggiungi volo</span>
    <span style="font-size: 11px; color: #9ca3af;">Pulsante — 14px / 500</span>
  </div>
  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 12px; font-weight: 500; color: #059669; background: #ecfdf5; padding: 2px 10px; border-radius: 9999px; line-height: 1.5;">Confermato</span>
    <span style="font-size: 11px; color: #9ca3af;">Badge — 12px / 500</span>
  </div>
  <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;">
    <span style="font-size: 18px; font-weight: 700; color: #111827; line-height: 1.25;">Travel Organizer</span>
    <span style="font-size: 11px; color: #9ca3af;">Logo — 18px / 700</span>
  </div>
</div>

---

## Line Heights

L'altezza di riga (line-height) controlla la spaziatura verticale del testo.

| Token | Valore | Uso |
|-------|--------|-----|
| `--line-height-tight` | `1.25` | Titoli, elementi compatti, badge |
| `--line-height-normal` | `1.5` | Testo corpo, paragrafi, form |
| `--line-height-relaxed` | `1.75` | Testo con spaziatura ampia, descrizioni lunghe |

```css
:root {
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 24px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div>
    <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
      <span style="font-size: 13px; font-weight: 600; color: #374151;">tight</span>
      <span style="font-size: 11px; color: #9ca3af;">line-height: 1.25</span>
    </div>
    <div style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.25; background: #eef2ff; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #6366f1;">
      Il viaggio verso Tokyo include due scali intermedi, uno a Dubai e uno a Singapore. I passeggeri sono pregati di verificare i documenti necessari per il transito.
    </div>
  </div>
  <div>
    <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
      <span style="font-size: 13px; font-weight: 600; color: #374151;">normal</span>
      <span style="font-size: 11px; color: #9ca3af;">line-height: 1.5</span>
    </div>
    <div style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.5; background: #f0fdf4; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #22c55e;">
      Il viaggio verso Tokyo include due scali intermedi, uno a Dubai e uno a Singapore. I passeggeri sono pregati di verificare i documenti necessari per il transito.
    </div>
  </div>
  <div>
    <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
      <span style="font-size: 13px; font-weight: 600; color: #374151;">relaxed</span>
      <span style="font-size: 11px; color: #9ca3af;">line-height: 1.75</span>
    </div>
    <div style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.75; background: #fefce8; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #eab308;">
      Il viaggio verso Tokyo include due scali intermedi, uno a Dubai e uno a Singapore. I passeggeri sono pregati di verificare i documenti necessari per il transito.
    </div>
  </div>
</div>

### Esempio d'uso

```css
/* Titoli con line-height compatto */
h1, h2, h3 {
  line-height: var(--line-height-tight); /* 1.25 */
}

/* Testo corpo con line-height standard */
body, p, .form-input {
  line-height: var(--line-height-normal); /* 1.5 */
}

/* Descrizioni e testi lunghi */
.description, .activity-description {
  line-height: var(--line-height-relaxed); /* 1.75 */
}
```

---

## Troncamento Testo

Per gestire testo che potrebbe eccedere lo spazio disponibile, vengono usati pattern CSS standard.

### Troncamento a Riga Singola

```css
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Troncamento Multi-Riga (Clamp)

```css
.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Usato nelle card attivita per limitare la descrizione a 2 righe visibili.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 20px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div>
    <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;">Troncamento a riga singola</div>
    <div style="font-size: 14px; color: #1f2937; background: white; padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e7eb; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
      Volo AZ1234 Milano Malpensa &rarr; Tokyo Narita con scalo a Dubai International
    </div>
  </div>
  <div>
    <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;">Troncamento multi-riga (2 righe)</div>
    <div style="font-size: 14px; color: #1f2937; background: white; padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e7eb; max-width: 320px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
      Visita guidata al tempio Senso-ji nel quartiere di Asakusa, seguita da una passeggiata nel mercato Nakamise-dori con degustazione di street food tradizionale giapponese.
    </div>
  </div>
</div>

---

## Responsive

Su dispositivi mobili (sotto 768px), alcune dimensioni si adattano:

| Elemento | Desktop | Mobile |
|----------|---------|--------|
| Titolo pagina | 24px (`--font-size-2xl`) | 20px (`--font-size-xl`) |
| Titolo sezione | 20px (`--font-size-xl`) | 18px (`--font-size-lg`) |
| Testo corpo | 16px (`--font-size-base`) | 16px (invariato) |
| Pulsanti | 14px (`--font-size-sm`) | 14px (invariato) |

<div style="margin: 16px 0; display: flex; gap: 16px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 280px; padding: 24px; background: #f9fafb; border-radius: 12px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <div style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Desktop</div>
    <div style="font-size: 24px; font-weight: 700; color: #111827; line-height: 1.25; margin-bottom: 12px;">Viaggio in Giappone</div>
    <div style="font-size: 20px; font-weight: 600; color: #111827; line-height: 1.25; margin-bottom: 8px;">Voli prenotati</div>
    <div style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.5; margin-bottom: 8px;">Partenza il 15 marzo dal Terminal 1 di Milano Malpensa.</div>
    <div style="display: inline-block; font-size: 14px; font-weight: 500; color: #ffffff; background: #2563eb; padding: 6px 16px; border-radius: 8px;">Aggiungi volo</div>
  </div>
  <div style="flex: 1; min-width: 220px; max-width: 320px; padding: 24px; background: #f9fafb; border-radius: 12px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; border: 2px dashed #d1d5db;">
    <div style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Mobile</div>
    <div style="font-size: 20px; font-weight: 700; color: #111827; line-height: 1.25; margin-bottom: 12px;">Viaggio in Giappone</div>
    <div style="font-size: 18px; font-weight: 600; color: #111827; line-height: 1.25; margin-bottom: 8px;">Voli prenotati</div>
    <div style="font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.5; margin-bottom: 8px;">Partenza il 15 marzo dal Terminal 1 di Milano Malpensa.</div>
    <div style="display: inline-block; font-size: 14px; font-weight: 500; color: #ffffff; background: #2563eb; padding: 6px 16px; border-radius: 8px;">Aggiungi volo</div>
  </div>
</div>

::: tip Nota
La dimensione base del corpo (`16px`) non viene mai ridotta sotto i `14px` per garantire la leggibilita su tutti i dispositivi.
:::

---

## Linee Guida

1. **Usare sempre le variabili CSS** per dimensioni e pesi, mai valori hardcoded.
2. **Non scendere sotto 12px** (`--font-size-xs`) per qualsiasi testo visibile.
3. **Privilegiare `--font-weight-medium`** (500) rispetto al bold per la maggior parte dei testi interattivi.
4. **Inter e basta**: non introdurre font aggiuntivi senza una ragione specifica.
5. **Testare sempre la leggibilita** del testo su sfondi colorati (es. header card, badge).
