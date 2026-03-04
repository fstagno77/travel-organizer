# Form

I componenti form di Travel Organizer seguono regole precise per garantire coerenza, accessibilita e leggibilita in tutti i contesti: dalla creazione di un viaggio alla modifica di un'attivita.

## Input `.form-input`

L'elemento input base utilizzato per campi di testo, email, date e numeri.

```css
.form-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
  font-size: var(--font-size-base);           /* 16px */
  font-family: var(--font-family);
  line-height: var(--line-height-normal);      /* 1.5 */
  color: var(--color-gray-800);               /* #1f2937 */
  background: var(--color-white);             /* #ffffff */
  border: 1px solid var(--color-gray-300);    /* #d1d5db */
  border-radius: var(--radius-md);            /* 8px */
  transition: all var(--transition-fast);      /* 150ms */
  -webkit-appearance: none;
  appearance: none;
}
```

### Stati

#### Focus

```css
.form-input:focus {
  outline: none;
  border-color: var(--color-primary);         /* #2163f6 */
  box-shadow: 0 0 0 3px var(--color-primary-light); /* #e6f0fa */
}
```

#### Placeholder

```css
.form-input::placeholder {
  color: var(--color-gray-400);               /* #9ca3af */
}
```

#### Errore

```css
.form-input.error,
.form-input:invalid {
  border-color: var(--color-error);           /* #ef4444 */
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

#### Disabilitato

```css
.form-input:disabled {
  background: var(--color-gray-100);          /* #f3f4f6 */
  color: var(--color-gray-400);               /* #9ca3af */
  cursor: not-allowed;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
  <div>
    <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Default</label>
    <input type="text" placeholder="Placeholder..." style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #d1d5db; border-radius: 8px; outline: none; font-family: Inter, sans-serif;" />
  </div>
  <div>
    <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Focus</label>
    <input type="text" value="Valore inserito" style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #2163f6; border-radius: 8px; outline: none; box-shadow: 0 0 0 3px #e6f0fa; font-family: Inter, sans-serif;" />
  </div>
  <div>
    <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Errore</label>
    <input type="text" value="Email non valida" style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #ef4444; border-radius: 8px; outline: none; font-family: Inter, sans-serif;" />
    <span style="font-size: 14px; color: #ef4444; margin-top: 4px; display: block;">Inserisci un indirizzo email valido</span>
  </div>
  <div>
    <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Disabilitato</label>
    <input type="text" value="Campo disabilitato" disabled style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #d1d5db; border-radius: 8px; outline: none; background: #f3f4f6; color: #9ca3af; cursor: not-allowed; font-family: Inter, sans-serif;" />
  </div>
</div>

### Tabella Riassuntiva Stati

| Stato | Bordo | Background | Box Shadow | Colore testo |
|-------|-------|-----------|------------|-------------|
| Default | `#d1d5db` | `#ffffff` | nessuna | `#1f2937` |
| Focus | `#2163f6` | `#ffffff` | `0 0 0 3px #e6f0fa` | `#1f2937` |
| Errore | `#ef4444` | `#ffffff` | nessuna | `#1f2937` |
| Errore + Focus | `#ef4444` | `#ffffff` | `0 0 0 3px rgba(239,68,68,0.1)` | `#1f2937` |
| Disabilitato | `#d1d5db` | `#f3f4f6` | nessuna | `#9ca3af` |
| Placeholder | `#d1d5db` | `#ffffff` | nessuna | `#9ca3af` |

---

## Select `.form-select`

L'elemento select condivide lo stile dell'input con l'aggiunta di un cursore pointer.

```css
.form-select {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
  font-size: var(--font-size-base);           /* 16px */
  font-family: var(--font-family);
  color: var(--color-gray-800);               /* #1f2937 */
  background: var(--color-white);
  border: 1px solid var(--color-gray-300);    /* #d1d5db */
  border-radius: var(--radius-md);            /* 8px */
  cursor: pointer;
  transition: all var(--transition-fast);
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* freccia personalizzata */
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: var(--spacing-10);           /* 40px per icona freccia */
}

.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; max-width: 400px;">
  <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Seleziona opzione</label>
  <div style="position: relative;">
    <select style="width: 100%; box-sizing: border-box; padding: 12px 40px 12px 16px; font-size: 16px; color: #1f2937; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; outline: none; -webkit-appearance: none; appearance: none; font-family: Inter, sans-serif;">
      <option>Economia</option>
      <option>Business</option>
      <option>Prima classe</option>
    </select>
    <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #6b7280;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </div>
  </div>
</div>

**Differenze rispetto a `.form-input`**:
- `cursor: pointer`
- Freccia dropdown personalizzata via `background-image`
- `padding-right` maggiore per la freccia

---

## Textarea `.form-textarea`

Per campi di testo multi-riga come descrizioni di attivita.

```css
.form-textarea {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
  font-size: var(--font-size-base);           /* 16px */
  font-family: var(--font-family);
  color: var(--color-gray-800);
  background: var(--color-white);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);            /* 8px */
  resize: vertical;
  min-height: 100px;
  transition: border-color var(--transition-fast);
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; max-width: 400px;">
  <label style="font-size: 14px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">Descrizione attivita</label>
  <textarea placeholder="Inserisci una descrizione..." style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; color: #1f2937; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; outline: none; resize: vertical; min-height: 100px; font-family: Inter, sans-serif;"></textarea>
</div>

---

## Form Group `.form-group`

Il contenitore che raggruppa label, input e messaggio di errore/hint.

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);                      /* 8px */
  margin-bottom: var(--spacing-4);            /* 16px */
}
```

### Struttura HTML

```html
<div class="form-group">
  <label class="form-label" for="nome">Nome attivita</label>
  <input class="form-input" id="nome" type="text" placeholder="Inserisci il nome...">
  <span class="form-error">Il nome e obbligatorio</span>
</div>
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; max-width: 400px;">
  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
    <label style="font-size: 14px; font-weight: 500; color: #374151;">Nome attivita <span style="color: #ef4444;">*</span></label>
    <input type="text" placeholder="Inserisci il nome..." style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #d1d5db; border-radius: 8px; outline: none; font-family: Inter, sans-serif;" />
    <span style="font-size: 14px; color: #ef4444; min-height: 1.25rem; line-height: 1.25;">&nbsp;</span>
  </div>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <label style="font-size: 14px; font-weight: 500; color: #374151;">Email <span style="color: #ef4444;">*</span></label>
    <input type="text" value="nome@" style="width: 100%; box-sizing: border-box; padding: 12px 16px; font-size: 16px; border: 1px solid #ef4444; border-radius: 8px; outline: none; font-family: Inter, sans-serif;" />
    <span style="font-size: 14px; color: #ef4444; min-height: 1.25rem; line-height: 1.25;">Inserisci un indirizzo email valido</span>
  </div>
</div>

| Proprieta | Valore |
|-----------|--------|
| Layout | Flex column |
| Gap (label → input) | 8px (`--spacing-2`) |
| Margin bottom | 16px (`--spacing-4`) |

---

## Label `.form-label`

```css
.form-label {
  font-size: var(--font-size-sm);             /* 14px */
  font-weight: var(--font-weight-medium);     /* 500 */
  color: var(--color-gray-700);               /* #374151 */
  line-height: var(--line-height-normal);      /* 1.5 */
}
```

| Proprieta | Valore |
|-----------|--------|
| Font size | 14px |
| Font weight | 500 (medium) |
| Colore | `#374151` (`--color-gray-700`) |

### Label Obbligatorio

Per i campi obbligatori, l'asterisco rosso viene aggiunto via CSS o inline:

```css
.form-label.required::after {
  content: ' *';
  color: var(--color-error);                  /* #ef4444 */
}
```

---

## Messaggio di Errore `.form-error`

```css
.form-error {
  font-size: var(--font-size-sm);             /* 14px */
  color: var(--color-error);                  /* #ef4444 */
  min-height: 1.25rem;                        /* 20px — previene layout shift */
  line-height: var(--line-height-tight);       /* 1.25 */
}
```

| Proprieta | Valore |
|-----------|--------|
| Font size | 14px |
| Colore | `#ef4444` (`--color-error`) |
| Min height | 1.25rem (20px) |

La `min-height` di `1.25rem` garantisce che lo spazio per il messaggio di errore sia sempre riservato, evitando salti di layout quando l'errore appare o scompare.

---

## Hint `.form-hint`

Testo di aiuto sotto un campo per fornire informazioni aggiuntive.

```css
.form-hint {
  font-size: var(--font-size-xs);             /* 12px */
  color: var(--color-gray-500);               /* #566378 */
  line-height: var(--line-height-normal);      /* 1.5 */
}
```

| Proprieta | Valore |
|-----------|--------|
| Font size | 12px |
| Colore | `#566378` (`--color-gray-500`) |

---

## Form Row (Campi Affiancati)

Per posizionare piu campi sulla stessa riga.

```css
.form-row {
  display: flex;
  gap: var(--spacing-4);                      /* 16px */
}

.form-row > .form-group {
  flex: 1;
}

/* Mobile: stack verticale */
@media (max-width: 767px) {
  .form-row {
    flex-direction: column;
  }
}
```

Esempio: data di inizio e data di fine sulla stessa riga su desktop, in colonna su mobile.

---

## Form Actions

L'area dei pulsanti alla fine del form.

```css
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);                      /* 12px */
  padding-top: var(--spacing-6);              /* 24px */
  border-top: 1px solid var(--color-gray-200); /* #e5e7eb */
  margin-top: var(--spacing-4);               /* 16px */
}
```

Tipicamente contiene un pulsante "Annulla" (`.btn-outline`) e un pulsante "Salva" (`.btn-primary`).

---

## Checkbox e Radio

```css
.form-checkbox,
.form-radio {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);                      /* 8px */
  cursor: pointer;
}

.form-checkbox input[type="checkbox"],
.form-radio input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);         /* #2163f6 */
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Checkbox</div>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #1f2937;">
      <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #2163f6;" /> Notifiche email
    </label>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #1f2937;">
      <input type="checkbox" style="width: 18px; height: 18px; accent-color: #2163f6;" /> Promemoria viaggio
    </label>
  </div>
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Radio</div>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #1f2937;">
      <input type="radio" name="doc-classe" checked style="width: 18px; height: 18px; accent-color: #2163f6;" /> Economia
    </label>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #1f2937;">
      <input type="radio" name="doc-classe" style="width: 18px; height: 18px; accent-color: #2163f6;" /> Business
    </label>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #1f2937;">
      <input type="radio" name="doc-classe" style="width: 18px; height: 18px; accent-color: #2163f6;" /> Prima classe
    </label>
  </div>
</div>

---

## Linee Guida

1. **Font size 16px sugli input**: necessario per prevenire lo zoom automatico su iOS Safari.
2. **Larghezza piena**: tutti gli input devono avere `width: 100%` e adattarsi al contenitore.
3. **Focus ring visibile**: ogni campo interattivo deve avere uno stato `:focus` chiaro per la navigazione da tastiera.
4. **Min-height sugli errori**: usare sempre `min-height: 1.25rem` sui `.form-error` per prevenire layout shift.
5. **Validation on blur**: mostrare gli errori quando l'utente esce dal campo, non durante la digitazione.
6. **Label sempre visibili**: non usare solo placeholder come sostituto delle label.
7. **Responsive**: su mobile, i campi affiancati (`.form-row`) si impilano in colonna.
