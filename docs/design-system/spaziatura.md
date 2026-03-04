# Spaziatura

Il sistema di spaziatura di Travel Organizer si basa su una griglia a **multipli di 4px**, garantendo coerenza e ritmo visivo in tutta l'interfaccia.

## Sistema Spacing

Tutte le spaziature sono definite come variabili CSS in unita `rem` (dove `1rem = 16px`).

| Token | Valore | Pixel | Uso comune |
|-------|--------|-------|------------|
| `--spacing-1` | `0.25rem` | 4px | Gap minimo, padding badge |
| `--spacing-2` | `0.5rem` | 8px | Gap tra icona e testo, padding piccoli elementi |
| `--spacing-3` | `0.75rem` | 12px | Padding verticale pulsanti, padding input |
| `--spacing-4` | `1rem` | 16px | Padding orizzontale input, gap form, container mobile |
| `--spacing-5` | `1.25rem` | 20px | Padding orizzontale pulsanti, padding card body |
| `--spacing-6` | `1.5rem` | 24px | Padding sezioni, container desktop, gap tra card |
| `--spacing-8` | `2rem` | 32px | Margine tra sezioni, padding modale |
| `--spacing-10` | `2.5rem` | 40px | Padding grande, spaziatura sezioni principali |
| `--spacing-12` | `3rem` | 48px | Margine sezioni grandi |
| `--spacing-16` | `4rem` | 64px | Padding top/bottom pagina |
| `--spacing-20` | `5rem` | 80px | Spaziatura extra large |

### Scala Visiva

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; font-family: Inter, sans-serif;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 4px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-1</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">4px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 8px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-2</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">8px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 12px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-3</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">12px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 16px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-4</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">16px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 20px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-5</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">20px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 24px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-6</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">24px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 32px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-8</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">32px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 40px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-10</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">40px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 48px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-12</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">48px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 64px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-16</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">64px</span>
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 80px; height: 24px; background: #2163f6; border-radius: 2px; flex-shrink: 0;"></div>
    <span style="font-size: 13px; color: #374151; min-width: 100px; font-weight: 500;">--spacing-20</span>
    <span style="font-size: 12px; color: #9ca3af; min-width: 40px;">80px</span>
  </div>
</div>

```css
:root {
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
}
```

### Esempi Pratici

```css
/* Pulsante standard */
.btn {
  padding: var(--spacing-3) var(--spacing-5); /* 12px 20px */
  gap: var(--spacing-2); /* 8px tra icona e testo */
}

/* Input form */
.form-input {
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
}

/* Card body */
.flight-card__body {
  padding: var(--spacing-5); /* 20px */
}

/* Hotel card body */
.hotel-card__body {
  padding: var(--spacing-6); /* 24px */
}
```

---

## Border Radius

I raggi degli angoli definiscono il livello di arrotondamento degli elementi.

| Token | Valore | Pixel | Uso |
|-------|--------|-------|-----|
| `--radius-sm` | `0.25rem` | 4px | Piccoli elementi, tag inline |
| `--radius-md` | `0.5rem` | 8px | Pulsanti, input, corpo modale |
| `--radius-lg` | `0.75rem` | 12px | Card, modale, segmented control |
| `--radius-xl` | `1rem` | 16px | Hotel card, elementi arrotondati |
| `--radius-full` | `9999px` | Cerchio | Badge, avatar, pulsante glass |

### Anteprima

<div style="margin: 16px 0; display: flex; gap: 20px; flex-wrap: wrap; align-items: end; font-family: Inter, sans-serif;">
  <div style="text-align: center;">
    <div style="width: 72px; height: 72px; background: #2163f6; border-radius: 4px;"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 8px; font-weight: 500;">--radius-sm</div>
    <div style="font-size: 11px; color: #9ca3af;">4px</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 72px; height: 72px; background: #2163f6; border-radius: 8px;"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 8px; font-weight: 500;">--radius-md</div>
    <div style="font-size: 11px; color: #9ca3af;">8px</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 72px; height: 72px; background: #2163f6; border-radius: 12px;"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 8px; font-weight: 500;">--radius-lg</div>
    <div style="font-size: 11px; color: #9ca3af;">12px</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 72px; height: 72px; background: #2163f6; border-radius: 16px;"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 8px; font-weight: 500;">--radius-xl</div>
    <div style="font-size: 11px; color: #9ca3af;">16px</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 72px; height: 72px; background: #2163f6; border-radius: 9999px;"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 8px; font-weight: 500;">--radius-full</div>
    <div style="font-size: 11px; color: #9ca3af;">9999px</div>
  </div>
</div>

```css
:root {
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-full: 9999px;   /* cerchio */
}
```

### Gerarchia Visiva dei Raggi

```
Piccoli elementi (tag, chip)      → --radius-sm (4px)
Elementi interattivi (btn, input) → --radius-md (8px)
Contenitori (card, modal)         → --radius-lg (12px)
Elementi premium (hotel card)     → --radius-xl (16px)
Cerchi (badge, avatar, glass btn) → --radius-full (9999px)
```

### Esempi

```css
/* Pulsante */
.btn { border-radius: var(--radius-md); }

/* Card volo */
.flight-card { border-radius: var(--radius-lg); }

/* Card hotel */
.hotel-card { border-radius: var(--radius-xl); }

/* Pulsante glass circolare */
.btn-icon-glass { border-radius: var(--radius-full); }

/* Badge */
.badge { border-radius: var(--radius-full); }
```

---

## Box Shadow

Le ombre definiscono la profondita visiva degli elementi e la loro gerarchia.

| Token | Valore | Uso |
|-------|--------|-----|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Indicatore segmented control, hover leggero |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | Card standard |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Card hover, dropdown |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)` | Modale, trip card hover |

### Anteprima

<div style="margin: 16px 0; display: flex; gap: 28px; flex-wrap: wrap; align-items: start; font-family: Inter, sans-serif;">
  <div style="text-align: center;">
    <div style="width: 120px; height: 80px; background: white; border-radius: 12px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 10px; font-weight: 500;">--shadow-sm</div>
    <div style="font-size: 11px; color: #9ca3af;">Piano</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 120px; height: 80px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 10px; font-weight: 500;">--shadow-md</div>
    <div style="font-size: 11px; color: #9ca3af;">Elevato</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 120px; height: 80px; background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 10px; font-weight: 500;">--shadow-lg</div>
    <div style="font-size: 11px; color: #9ca3af;">In primo piano</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 120px; height: 80px; background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);"></div>
    <div style="font-size: 12px; color: #374151; margin-top: 10px; font-weight: 500;">--shadow-xl</div>
    <div style="font-size: 11px; color: #9ca3af;">Overlay</div>
  </div>
</div>

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
               0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
               0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
               0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### Livelli di Profondita

| Livello | Shadow | Elementi |
|---------|--------|----------|
| Piano (riposo) | nessuna o `--shadow-sm` | Segmented indicator, elementi piatti |
| Elevato | `--shadow-md` | Card standard (flight, hotel) |
| In primo piano | `--shadow-lg` | Card in hover, dropdown menu |
| Overlay | `--shadow-xl` | Modali, trip card hover, pannelli slide |

### Transizione Hover

Un pattern comune e elevare le card al passaggio del mouse:

```css
.flight-card {
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}

.flight-card:hover {
  box-shadow: var(--shadow-lg);
}

.trip-card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-4px);
}
```

---

## Container

Il container principale limita la larghezza dei contenuti e fornisce padding responsive.

| Proprieta | Valore |
|-----------|--------|
| `--container-max-width` | `1200px` |
| `--container-padding` (mobile) | `16px` |
| `--container-padding` (desktop >= 768px) | `24px` |

```css
:root {
  --container-max-width: 1200px;
  --container-padding: 16px;
}

@media (min-width: 768px) {
  :root {
    --container-padding: 24px;
  }
}

.container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}
```

---

## Transizioni

Le durate delle transizioni sono standardizzate per garantire coerenza nelle animazioni.

| Token | Valore | Uso |
|-------|--------|-----|
| `--transition-fast` | `150ms ease` | Hover pulsanti, cambi colore |
| `--transition-normal` | `250ms ease` | Apertura modali, transizioni card |
| `--transition-slow` | `350ms ease` | Animazioni pannello slide, page transition |

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

---

## Pattern Spaziatura Comuni

### Card Flight

```css
.flight-card {
  border-radius: var(--radius-lg);           /* 12px */
  box-shadow: var(--shadow-md);
}

.flight-card__header {
  padding: var(--spacing-3) var(--spacing-5); /* 12px 20px */
}

.flight-card__body {
  padding: var(--spacing-5);                  /* 20px */
}
```

### Card Hotel

```css
.hotel-card {
  border-radius: var(--radius-xl);            /* 16px */
  box-shadow: var(--shadow-md);
}

.hotel-card__header {
  padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */
}

.hotel-card__body {
  padding: var(--spacing-6);                  /* 24px */
}
```

### Form Group

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);                      /* 8px */
  margin-bottom: var(--spacing-4);            /* 16px */
}
```

---

## Linee Guida

1. **Usare solo i token definiti**: non inventare spaziature intermedie come `10px` o `18px`.
2. **Multipli di 4px**: ogni spaziatura deve essere un multiplo di 4px per mantenere il ritmo visivo.
3. **Coerenza tra elementi simili**: tutti i pulsanti devono avere lo stesso padding, tutte le card lo stesso raggio.
4. **Mobile-first**: partire con spaziature piu compatte e aumentarle per schermi piu grandi.
5. **Transizioni coerenti**: usare `--transition-fast` per micro-interazioni, `--transition-normal` per aperture/chiusure.
