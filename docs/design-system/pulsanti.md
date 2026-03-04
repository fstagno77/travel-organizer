# Pulsanti

I pulsanti sono gli elementi interattivi principali di Travel Organizer. Ogni variante ha uno scopo specifico e regole precise di utilizzo.

## Pulsante Base `.btn`

Tutti i pulsanti condividono uno stile base comune.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);             /* 8px */
  padding: var(--spacing-3) var(--spacing-5); /* 12px 20px */
  font-size: var(--font-size-sm);    /* 14px */
  font-weight: var(--font-weight-medium); /* 500 */
  font-family: var(--font-family);
  line-height: var(--line-height-normal); /* 1.5 */
  border-radius: var(--radius-md);   /* 8px */
  border: 1px solid transparent;
  cursor: pointer;
  min-height: 44px;
  text-decoration: none;
  transition: all var(--transition-fast); /* 150ms */
  -webkit-user-select: none;
  user-select: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

**Specifiche chiave**:
- Altezza minima `44px` per rispettare le linee guida di accessibilita (target touch)
- `gap: 8px` tra icona e testo
- Transizione rapida (`150ms`) per feedback immediato

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid transparent; cursor: pointer; min-height: 44px; background: #e5e7eb; color: #374151;">Pulsante Base</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid transparent; cursor: pointer; min-height: 44px; background: #e5e7eb; color: #374151; opacity: 0.5; cursor: not-allowed;">Base Disabled</button>
</div>

---

## Varianti

### Primario `.btn-primary`

Il pulsante piu importante della pagina. Usato per azioni principali come "Salva", "Crea viaggio", "Carica PDF".

```css
.btn-primary {
  background: var(--color-primary);       /* #2163f6 */
  color: var(--color-white);              /* #ffffff */
  border-color: var(--color-primary);     /* #2163f6 */
}

.btn-primary:hover {
  background: var(--color-primary-dark);  /* #1a50c7 */
  border-color: var(--color-primary-dark);
}

.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-light); /* #e6f0fa */
}
```

| Stato | Background | Colore testo | Bordo |
|-------|-----------|-------------|-------|
| Default | `#2163f6` | `#ffffff` | `#2163f6` |
| Hover | `#1a50c7` | `#ffffff` | `#1a50c7` |
| Focus | `#2163f6` | `#ffffff` | ring `#e6f0fa` |
| Disabled | `#2163f6` (50% opacita) | `#ffffff` | `#2163f6` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 44px; background: #2163f6; color: #ffffff;">Primary Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #1a50c7; cursor: pointer; min-height: 44px; background: #1a50c7; color: #ffffff;">Primary Hover</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 44px; background: #2163f6; color: #ffffff; box-shadow: 0 0 0 3px #e6f0fa;">Primary Focus</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 44px; background: #2163f6; color: #ffffff; opacity: 0.5; cursor: not-allowed;">Primary Disabled</button>
</div>

---

### Secondario `.btn-secondary`

Per azioni secondarie, alternative o meno prominenti.

```css
.btn-secondary {
  background: var(--color-secondary);       /* #ff6b35 */
  color: var(--color-white);                /* #ffffff */
  border-color: var(--color-secondary);     /* #ff6b35 */
}

.btn-secondary:hover {
  background: var(--color-secondary-dark);  /* #e55a2b */
  border-color: var(--color-secondary-dark);
}
```

| Stato | Background | Colore testo | Bordo |
|-------|-----------|-------------|-------|
| Default | `#ff6b35` | `#ffffff` | `#ff6b35` |
| Hover | `#e55a2b` | `#ffffff` | `#e55a2b` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #ff6b35; cursor: pointer; min-height: 44px; background: #ff6b35; color: #ffffff;">Secondary Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #e55a2b; cursor: pointer; min-height: 44px; background: #e55a2b; color: #ffffff;">Secondary Hover</button>
</div>

---

### Outline con colore `.btn-outline`

Per azioni terziarie o quando il pulsante primario e gia presente nella stessa area.

```css
.btn-outline {
  background-color: transparent;
  color: var(--color-primary);           /* #2163f6 */
  border: 1.5px solid var(--color-primary); /* #2163f6 */
}

.btn-outline:hover {
  color: var(--color-primary-dark);      /* #1a50c7 */
  border-color: var(--color-primary-dark);
}
```

| Stato | Background | Colore testo | Bordo |
|-------|-----------|-------------|-------|
| Default | trasparente | `#2163f6` | `1.5px solid #2163f6` |
| Hover | trasparente | `#1a50c7` | `1.5px solid #1a50c7` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #2163f6; cursor: pointer; min-height: 44px; background: transparent; color: #2163f6;">Outline Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #1a50c7; cursor: pointer; min-height: 44px; background: transparent; color: #1a50c7;">Outline Hover</button>
</div>

---

### Pericolo `.btn-danger`

Per azioni distruttive come eliminare un viaggio, rimuovere un passeggero o cancellare una prenotazione.

```css
.btn-danger {
  background: var(--color-error);           /* #ef4444 */
  color: var(--color-white);                /* #ffffff */
  border-color: var(--color-error);         /* #ef4444 */
}

.btn-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}
```

| Stato | Background | Colore testo | Bordo |
|-------|-----------|-------------|-------|
| Default | `#ef4444` | `#ffffff` | `#ef4444` |
| Hover | `#dc2626` | `#ffffff` | `#dc2626` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; min-height: 44px; background: #ef4444; color: #ffffff;">Danger Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #dc2626; cursor: pointer; min-height: 44px; background: #dc2626; color: #ffffff;">Danger Hover</button>
</div>

---

## Dimensioni

### Piccolo `.btn-sm`

Per contesti con spazio limitato, come toolbar o azioni inline.

```css
.btn-sm {
  padding: var(--spacing-2) var(--spacing-3); /* 8px 12px */
  font-size: 0.75rem;                        /* 12px */
  min-height: 36px;
}
```

| Proprieta | Valore |
|-----------|--------|
| Altezza minima | 36px |
| Padding | 8px 12px |
| Font size | 12px |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 36px; background: #2163f6; color: #ffffff;">Small Primary</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #d1d5db; cursor: pointer; min-height: 36px; background: transparent; color: #2163f6;">Small Outline</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; min-height: 36px; background: #ef4444; color: #ffffff;">Small Danger</button>
</div>

### Grande `.btn-lg`

Per azioni in evidenza, come il pulsante principale in una modale o CTA.

```css
.btn-lg {
  padding: var(--spacing-4) var(--spacing-8); /* 16px 32px */
  font-size: var(--font-size-base);           /* 16px */
  min-height: 52px;
}
```

| Proprieta | Valore |
|-----------|--------|
| Altezza minima | 52px |
| Padding | 16px 32px |
| Font size | 16px |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 32px; font-size: 16px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 52px; background: #2163f6; color: #ffffff;">Large Primary</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 32px; font-size: 16px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #d1d5db; cursor: pointer; min-height: 52px; background: transparent; color: #2163f6;">Large Outline</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 32px; font-size: 16px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; min-height: 52px; background: #ef4444; color: #ffffff;">Large Danger</button>
</div>

---

## Pulsante Glass `.btn-icon-glass`

Pulsante circolare con effetto vetro (glassmorphism), usato sopra immagini e header con sfondo scuro. Tipicamente per azioni come chiudi, modifica o menu nell'header della trip modal.

```css
.btn-icon-glass {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 9999px;            /* cerchio perfetto */
  color: #ffffff;
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all var(--transition-fast); /* 150ms */
}

.btn-icon-glass:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
```

**Specifiche**:
| Proprieta | Valore |
|-----------|--------|
| Dimensione | 40px x 40px |
| Background | `rgba(255, 255, 255, 0.15)` |
| Bordo | `1.5px solid rgba(255, 255, 255, 0.35)` |
| Border radius | `9999px` (cerchio) |
| Colore icona | `#ffffff` |
| Backdrop filter | `blur(12px)` |
| Box shadow | `0 4px 12px rgba(0, 0, 0, 0.08)` |

<div style="margin: 16px 0; padding: 24px; background: linear-gradient(135deg, #1557E0, #2163F6); border-radius: 12px; display: flex; gap: 12px; align-items: center;">
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); cursor: pointer;">&#10005;</div>
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.25); border: 1.5px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); cursor: pointer;">&#9998;</div>
  <div style="width: 40px; height: 40px; border-radius: 9999px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); cursor: pointer;">&#8942;</div>
  <span style="color: rgba(255,255,255,0.7); font-family: Inter, sans-serif; font-size: 13px; margin-left: 8px;">Default &nbsp;|&nbsp; Hover &nbsp;|&nbsp; Menu</span>
</div>

::: warning Nota
Il `backdrop-filter` necessita del prefisso `-webkit-` per compatibilita con Safari.
:::

---

## Pulsanti Hotel

I pulsanti nel contesto hotel usano la palette verde/smeraldo.

### Hotel Primario `.hotel-btn--primary`

```css
.hotel-btn--primary {
  background: var(--color-hotel-600);       /* #2e9568 */
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);          /* 8px */
}

.hotel-btn--primary:hover {
  background: var(--color-hotel-700);       /* #257a56 */
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; min-height: 44px; background: #2e9568; color: #ffffff;">Hotel Primary Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; min-height: 44px; background: #257a56; color: #ffffff;">Hotel Primary Hover</button>
</div>

### Hotel Outline `.hotel-btn--outline`

```css
.hotel-btn--outline {
  background: transparent;
  color: var(--color-hotel-600);            /* #2e9568 */
  border: 1px solid var(--color-hotel-200); /* #a3d7bf */
}

.hotel-btn--outline:hover {
  background: var(--color-hotel-50);        /* #edf7f2 */
  border-color: var(--color-hotel-600);
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #a3d7bf; cursor: pointer; min-height: 44px; background: transparent; color: #2e9568;">Hotel Outline Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2e9568; cursor: pointer; min-height: 44px; background: #edf7f2; color: #2e9568;">Hotel Outline Hover</button>
</div>

### Hotel Pericolo `.hotel-btn--danger`

```css
.hotel-btn--danger {
  background: var(--color-error);           /* #ef4444 */
  color: var(--color-white);
  border: none;
}

.hotel-btn--danger:hover {
  background: #dc2626;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; min-height: 44px; background: #ef4444; color: #ffffff;">Hotel Danger Default</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; min-height: 44px; background: #dc2626; color: #ffffff;">Hotel Danger Hover</button>
</div>

---

## Pulsante Google `.btn-google`

Usato per l'autenticazione con Google nella pagina di login.

```css
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);             /* 12px */
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
  background: var(--color-white);
  color: var(--color-gray-700);      /* #374151 */
  border: 1px solid var(--color-gray-300); /* #d1d5db */
  border-radius: var(--radius-md);   /* 8px */
  font-size: var(--font-size-base);  /* 16px */
  font-weight: var(--font-weight-medium); /* 500 */
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-google:hover {
  background: var(--color-gray-50);  /* #f9fafb */
  border-color: var(--color-gray-400);
  box-shadow: var(--shadow-sm);
}
```

**Specifiche**:
- Larghezza piena (`width: 100%`)
- Background bianco con bordo grigio
- Icona Google SVG a sinistra

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="max-width: 360px;">
    <button style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 12px 16px; background: #ffffff; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; font-weight: 500; font-family: Inter, sans-serif; cursor: pointer; min-height: 44px;">
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
      Accedi con Google
    </button>
  </div>
  <div style="max-width: 360px; margin-top: 12px;">
    <button style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 12px 16px; background: #f9fafb; color: #374151; border: 1px solid #9ca3af; border-radius: 8px; font-size: 16px; font-weight: 500; font-family: Inter, sans-serif; cursor: pointer; min-height: 44px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
      Accedi con Google (Hover)
    </button>
  </div>
</div>

---

## Pulsante Download PDF `.btn-download-pdf`

Usato per scaricare i PDF dei biglietti nelle card volo.

```css
.btn-download-pdf {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);             /* 8px */
  padding: var(--spacing-2) var(--spacing-4); /* 8px 16px */
  background: var(--color-primary);  /* #2163f6 */
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);   /* 8px */
  font-size: var(--font-size-sm);    /* 14px */
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(33, 99, 246, 0.3);
  transition: all var(--transition-fast);
}

.btn-download-pdf:hover {
  background: var(--color-primary-dark); /* #1a50c7 */
  box-shadow: 0 4px 8px rgba(33, 99, 246, 0.4);
  transform: translateY(-1px);
}
```

**Specifiche**:
- Ombra blu tematica (`rgba(33, 99, 246, 0.3)`)
- Leggero sollevamento al hover (`translateY(-1px)`)

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; background: #2163f6; color: #ffffff; box-shadow: 0 2px 4px rgba(33,99,246,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Scarica PDF
  </button>
  <button style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; background: #1a50c7; color: #ffffff; box-shadow: 0 4px 8px rgba(33,99,246,0.4); transform: translateY(-1px);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Scarica PDF (Hover)
  </button>
</div>

---

## Pulsante Outline Danger `.btn-outline-danger`

Per azioni distruttive secondarie, come "Elimina" nel pannello di gestione prenotazioni. Meno invasivo del `.btn-danger` ma comunica comunque pericolo.

```css
.btn-outline-danger {
  background-color: transparent;
  color: var(--color-danger);            /* #dc2626 */
  border: 1.5px solid var(--color-danger);
}

.btn-outline-danger:hover {
  background-color: var(--color-danger);
  color: var(--color-white);
}
```

| Stato | Background | Colore testo | Bordo |
|-------|-----------|-------------|-------|
| Default | trasparente | `#dc2626` | `1.5px solid #dc2626` |
| Hover | `#dc2626` | `#ffffff` | `1.5px solid #dc2626` |

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #dc2626; cursor: pointer; min-height: 44px; background: transparent; color: #dc2626;">Elimina</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #dc2626; cursor: pointer; min-height: 44px; background: #dc2626; color: #ffffff;">Elimina (Hover)</button>
</div>

---

## Pulsanti Section Header

Usati negli header delle sezioni Voli, Hotel e Attivita per i pulsanti di azione contestuali (es. "Aggiungi volo", "Aggiungi hotel"). Disponibili in versione piena (`.btn-primary`, `.btn-hotel`) e outline (`.btn-outline`, `.btn-hotel-outline`).

### Voli: `.btn-primary` + `.btn-outline`

I pulsanti nella sezione Voli usano la palette blu primaria.

```css
/* Gia documentato sopra, vedi sezione Primario e Outline */
```

### Hotel: `.btn-hotel` + `.btn-hotel-outline`

I pulsanti nella sezione Hotel usano la palette verde/smeraldo.

```css
.btn-hotel {
  background-color: var(--color-hotel-600); /* #2e9568 */
  color: var(--color-white);
}

.btn-hotel:hover {
  background-color: var(--color-hotel-700); /* #257a56 */
}

.btn-hotel-outline {
  background-color: transparent;
  color: var(--color-hotel-600);
  border: 1.5px solid var(--color-hotel-600);
}

.btn-hotel-outline:hover {
  color: var(--color-hotel-700);
  border-color: var(--color-hotel-700);
}
```

**Visual Preview - Voli (Primary + Outline):**

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1px solid #2163f6; cursor: pointer; min-height: 44px; background: #2163f6; color: #ffffff;">Aggiungi volo</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #2163f6; cursor: pointer; min-height: 44px; background: transparent; color: #2163f6;">Aggiungi volo</button>
</div>

**Visual Preview - Hotel (Hotel + Hotel Outline):**

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: none; cursor: pointer; min-height: 44px; background: #2e9568; color: #ffffff;">Aggiungi hotel</button>
  <button style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; font-family: Inter, sans-serif; border-radius: 8px; border: 1.5px solid #2e9568; cursor: pointer; min-height: 44px; background: transparent; color: #2e9568;">Aggiungi hotel</button>
</div>

### Label Responsive

I pulsanti negli header delle sezioni utilizzano label responsive per ottimizzare lo spazio su mobile:

```css
.section-header-cta-label-full {
  /* Mostrato su desktop (>= 768px) */
}

.section-header-cta-label-short {
  display: none; /* Nascosto di default */
}

@media (max-width: 767px) {
  .section-header-cta-label-full {
    display: none;
  }
  .section-header-cta-label-short {
    display: inline; /* Mostrato su mobile */
  }
}
```

**Esempio**:
- Desktop: "Aggiungi volo" (label completa)
- Mobile: "+ Volo" (label abbreviata)

---

## Linee Guida

1. **Un solo pulsante primario per sezione**: evitare di affiancare due `.btn-primary`.
2. **Gerarchia chiara**: primario per l'azione principale, outline per secondaria, danger solo per eliminazioni.
3. **Icona + testo**: preferire la combinazione icona + testo rispetto a sola icona (eccezione: `.btn-icon-glass`).
4. **Altezza minima 44px**: rispettare sempre il target touch minimo per accessibilita.
5. **Focus visibile**: ogni pulsante deve avere uno stato `:focus-visible` chiaro per la navigazione da tastiera.
6. **Non usare `.btn-danger` per azioni non distruttive**: il rosso comunica pericolo, usarlo solo quando appropriato.
