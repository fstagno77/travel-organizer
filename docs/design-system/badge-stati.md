# Badge e Stati

Componenti per indicare stati, feedback e condizioni vuote nell'interfaccia.

## Badge `.badge`

Etichetta compatta per indicare stati, categorie o conteggi.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2); /* 4px 8px */
  font-size: var(--font-size-xs); /* 12px */
  font-weight: var(--font-weight-medium); /* 500 */
  border-radius: var(--radius-full); /* 9999px */
  line-height: 1;
  white-space: nowrap;
}
```

### Varianti di colore

Ogni variante utilizza una combinazione di sfondo chiaro e testo scuro per garantire leggibilita' e contrasto.

```css
/* Primario — informazioni generali, categorie */
.badge-primary {
  background: #e6f0fa;
  color: #2163f6;
}

/* Successo — completato, confermato, attivo */
.badge-success {
  background: #d1fae5;
  color: #10b981;
}

/* Avviso — in attesa, attenzione richiesta */
.badge-warning {
  background: #fef3c7;
  color: #f59e0b;
}

/* Errore — cancellato, scaduto, problema */
.badge-error {
  background: #fee2e2;
  color: #ef4444;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
  <span style="display: inline-flex; align-items: center; padding: 4px 8px; font-size: 12px; font-weight: 500; border-radius: 9999px; background: #e6f0fa; color: #2163f6;">Primary</span>
  <span style="display: inline-flex; align-items: center; padding: 4px 8px; font-size: 12px; font-weight: 500; border-radius: 9999px; background: #d1fae5; color: #10b981;">Success</span>
  <span style="display: inline-flex; align-items: center; padding: 4px 8px; font-size: 12px; font-weight: 500; border-radius: 9999px; background: #fef3c7; color: #f59e0b;">Warning</span>
  <span style="display: inline-flex; align-items: center; padding: 4px 8px; font-size: 12px; font-weight: 500; border-radius: 9999px; background: #fee2e2; color: #ef4444;">Error</span>
</div>

### Tabella riassuntiva

| Variante | Background | Colore testo | Uso tipico |
|----------|-----------|-------------|------------|
| `.badge-primary` | `#e6f0fa` | `#2163f6` | Informazioni, categorie |
| `.badge-success` | `#d1fae5` | `#10b981` | Completato, confermato |
| `.badge-warning` | `#fef3c7` | `#f59e0b` | In attesa, attenzione |
| `.badge-error` | `#fee2e2` | `#ef4444` | Cancellato, errore |

## Empty State `.empty-state`

Stato vuoto mostrato quando non ci sono dati da visualizzare (nessun viaggio, nessun volo, nessuna attivita').

```css
.empty-state {
  text-align: center;
  padding: 48px 16px;
}

.empty-state-icon {
  font-size: 36px;
  color: var(--color-gray-400); /* #9ca3af */
  margin-bottom: 16px;
}

.empty-state-title {
  font-size: var(--font-size-lg); /* 20px */
  font-weight: var(--font-weight-semibold); /* 600 */
  color: var(--color-gray-900); /* #111827 */
  margin-bottom: 8px;
}

.empty-state-text {
  color: var(--color-gray-500); /* #6b7280 */
  font-size: var(--font-size-sm); /* 14px */
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
```

### Struttura

Un empty state tipico e' composto da:
1. **Icona** — emoji o icona Material che rappresenta il contenuto mancante
2. **Titolo** — messaggio breve (es. "Nessun viaggio")
3. **Testo** — descrizione o suggerimento per l'utente
4. **Azione** (opzionale) — pulsante CTA per creare il primo elemento

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="text-align: center; padding: 48px 16px; background: #ffffff; border-radius: 12px; border: 1px dashed #d1d5db;">
    <div style="font-size: 36px; color: #9ca3af; margin-bottom: 16px;">&#9992;</div>
    <div style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 8px;">Nessun viaggio</div>
    <div style="color: #6b7280; font-size: 14px; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">Crea il tuo primo viaggio caricando un PDF di prenotazione o aggiungendolo manualmente.</div>
    <div style="display: inline-flex; align-items: center; padding: 10px 20px; font-size: 14px; font-weight: 500; border-radius: 8px; background: #2163f6; color: #ffffff; cursor: pointer;">Crea viaggio</div>
  </div>
</div>

## Spinner `.spinner`

Indicatore di caricamento circolare, usato durante le operazioni asincrone.

```css
.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-gray-200); /* #e5e7eb */
  border-top-color: var(--color-primary); /* #2163f6 */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

<style>
@keyframes doc-spin { to { transform: rotate(360deg); } }
</style>

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 32px; align-items: center; justify-content: center;">
  <div style="text-align: center;">
    <div style="display: inline-block; width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: doc-spin 0.8s linear infinite;"></div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Small (16px)</div>
  </div>
  <div style="text-align: center;">
    <div style="display: inline-block; width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: doc-spin 0.8s linear infinite;"></div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Default (24px)</div>
  </div>
  <div style="text-align: center;">
    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #2163f6; border-radius: 50%; animation: doc-spin 0.8s linear infinite;"></div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Large (40px)</div>
  </div>
</div>

### Varianti dimensionali

| Dimensione | Width/Height | Border | Uso |
|-----------|-------------|--------|-----|
| Small | 16px | 2px | Inline nei pulsanti |
| Default | 24px | 2px | Caricamento contenuti |
| Large | 40px | 3px | Caricamento pagina intera |

Lo spinner viene centrato nel suo contenitore padre. Per il caricamento a schermo intero, viene posizionato al centro della viewport.

## Toast Notifications

Notifiche temporanee che appaiono in basso a destra dello schermo per dare feedback all'utente su operazioni completate o fallite.

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
  border-radius: var(--radius-lg); /* 12px */
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm); /* 14px */
  font-weight: var(--font-weight-medium); /* 500 */
  animation: slideUp 0.3s ease;
  max-width: 360px;
}

.toast-success {
  background: var(--color-white);
  color: #10b981;
  border: 1px solid #d1fae5;
}

.toast-error {
  background: var(--color-white);
  color: #ef4444;
  border: 1px solid #fee2e2;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; align-items: flex-end;">
  <div style="padding: 12px 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 14px; font-weight: 500; max-width: 360px; background: #ffffff; color: #10b981; border: 1px solid #d1fae5;">Attivita salvata con successo</div>
  <div style="padding: 12px 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 14px; font-weight: 500; max-width: 360px; background: #ffffff; color: #ef4444; border: 1px solid #fee2e2;">Errore durante il salvataggio</div>
</div>

### Comportamento

- **Durata**: il toast viene rimosso automaticamente dopo circa 3 secondi
- **Animazione**: entra dal basso con `slideUp`, esce con fade out
- **Posizione mobile**: su schermi piccoli (max-width 768px) il toast si espande a tutta larghezza con margini laterali

```css
@media (max-width: 768px) {
  .toast {
    left: 16px;
    right: 16px;
    bottom: 16px;
    max-width: none;
  }
}
```
