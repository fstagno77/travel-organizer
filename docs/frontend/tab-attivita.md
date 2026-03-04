# Tab Attivita

Il tab Attivita offre una vista cronologica completa del viaggio, organizzata come una **timeline giornaliera** che copre ogni singolo giorno dalla data di partenza (`startDate`) alla data di ritorno (`endDate`).

## Header e azioni

L'header del tab contiene il titolo, i pulsanti di ricerca/filtro, il view switcher e il pulsante di aggiunta attivita.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
    <div style="font-size: 20px; font-weight: 700; color: #1e293b; white-space: nowrap;">Le mie attivita</div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <!-- Search button -->
      <div style="position: relative; background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 0.25rem;">
        <button style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: #0f172a; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </div>
      <!-- Filter button -->
      <div style="position: relative; background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 0.25rem;">
        <button style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; color: #2163f6; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </button>
      </div>
      <!-- View switcher -->
      <div style="display: flex; align-items: center; gap: 2px; background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 0.25rem;">
        <button style="width: 2.25rem; height: 2.25rem; background: #f1f5f9; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </button>
        <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      </div>
      <!-- Add button -->
      <button style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; background: #2163f6; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 500; font-size: 0.875rem; box-shadow: 0 4px 6px -1px rgba(147,197,253,0.4); margin-left: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <span>Aggiungi Attivita</span>
      </button>
    </div>
  </div>
</div>

### Struttura CSS

```css
.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

/* Contenitori pulsante (pill bianca con ombra) */
.activity-btn-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid rgb(226 232 240);
  padding: 0.25rem;
}

.activity-header-btn {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  background: transparent;
  border: none;
}

.activity-header-btn:hover {
  background: rgb(241 245 249);
  color: var(--color-primary);
}

.activity-header-btn.active {
  background: rgb(241 245 249);
  color: var(--color-primary);
}
```

## Pannello filtro

Al click sul pulsante filtro, si apre un dropdown con le pill delle categorie. Ogni pill attiva mostra il gradiente della categoria corrispondente; quando inattiva e bianca con bordo grigio.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="background: white; border-radius: 0.75rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; padding: 1rem; max-width: 320px; position: relative;">
    <div style="position: absolute; top: -0.5rem; right: 0.75rem; width: 1rem; height: 1rem; background: white; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; transform: rotate(45deg);"></div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <span style="font-size: 14px; font-weight: 600; color: #374151;">Filtra per tipo:</span>
      <button style="margin-left: auto; padding: 4px 12px; font-size: 14px; font-weight: 500; color: #64748b; background: transparent; border: none; border-radius: 6px; cursor: pointer;">Deseleziona tutti</button>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: none; background: linear-gradient(135deg, #fbbf24, #f97316); color: white; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
        Ristorante
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: none; background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
        Volo
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: none; background: linear-gradient(135deg, #34d399, #14b8a6); color: white; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 0V4h6v3m0 0v1a3 3 0 006 0V7M3 7h18"/></svg>
        Hotel
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: #94a3b8; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M2 7l10-4 10 4M4 9v9a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M9 21V12h6v9"/></svg>
        Museo
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: #94a3b8; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Attrazione
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: none; background: linear-gradient(135deg, #f87171, #ef4444); color: white; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Treno
      </button>
      <button style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 14px; border-radius: 6px; border: none; background: linear-gradient(135deg, #22d3ee, #06b6d4); color: white; cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Luogo
      </button>
    </div>
  </div>
</div>

### Classi filter pill

```css
/* Pill inattiva — bordo grigio, testo chiaro */
.activity-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(148 163 184);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

/* Pill attiva — gradiente della categoria, testo bianco */
.activity-filter-pill.active {
  color: white;
  border-color: transparent;
  /* background impostato inline via JS con il gradiente della categoria */
}
```

## Pannello ricerca

Il dropdown di ricerca contiene un campo input con placeholder "Cerca attivita..." e un pulsante di clear.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="background: white; border-radius: 0.75rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; padding: 1rem; max-width: 320px; position: relative;">
    <div style="position: absolute; top: -0.5rem; right: 0.75rem; width: 1rem; height: 1rem; background: white; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; transform: rotate(45deg);"></div>
    <div style="position: relative;">
      <input type="text" placeholder="Cerca attivita..." value="Sushi" style="width: 100%; padding: 8px 32px 8px 12px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;" />
      <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #94a3b8; cursor: pointer; font-size: 18px;">×</span>
    </div>
  </div>
</div>

```css
.activity-search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.activity-search-input:focus {
  box-shadow: 0 0 0 2px rgb(59 130 246);
  border-color: transparent;
}
```

## Timeline giornaliera

La timeline mostra **tutti i giorni** del viaggio, anche quelli senza eventi programmati. Per ogni giorno vengono elencati tutti gli eventi pertinenti:

- **Voli**: partenze e arrivi programmati per quel giorno
- **Hotel check-in**: giorno di ingresso nella struttura
- **Hotel stay** (pernottamento): giorni intermedi di permanenza
- **Hotel check-out**: giorno di uscita dalla struttura
- **Attivita custom**: attivita personalizzate create dall'utente

### Vista lista (default)

Ogni giorno mostra a sinistra il numero del giorno e il giorno/mese, e a destra la lista di eventi come righe cliccabili.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <!-- Day 1 -->
  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex-shrink: 0; width: 96px; text-align: center; padding-top: 12px;">
      <div style="font-size: 2.25rem; font-weight: 700; color: #1e293b; line-height: 1;">15</div>
      <div style="font-size: 12px; color: #6b7280; font-weight: 500; letter-spacing: 0.03em; margin-top: 4px; text-transform: capitalize;">sab, feb</div>
    </div>
    <div style="flex: 1; display: flex; flex-direction: column; padding-top: 12px;">
      <!-- Hotel checkout -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
        <span style="flex-shrink: 0; color: #10b981;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 0V4h6v3m0 0v1a3 3 0 006 0V7M3 7h18"/></svg>
        </span>
        <span style="font-size: 14px; font-weight: 600; color: #374151; white-space: nowrap;">—</span>
        <span style="flex: 1; font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Check-out <strong>Hotel Sakura</strong></span>
        <span style="flex-shrink: 0; color: #d1d5db; opacity: 0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
      </div>
      <!-- Flight -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
        <span style="flex-shrink: 0; color: #2563eb;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
        </span>
        <span style="font-size: 14px; font-weight: 600; color: #374151; white-space: nowrap;">14:30</span>
        <span style="flex: 1; font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Volo da <strong>Tokyo NRT</strong> → <strong>Roma FCO</strong></span>
        <span style="flex-shrink: 0; color: #2563eb; opacity: 1;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
      </div>
      <!-- Custom activity -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
        <span style="flex-shrink: 0; color: #f59e0b;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
        </span>
        <span style="font-size: 14px; font-weight: 600; color: #374151; white-space: nowrap;">19:00</span>
        <span style="flex: 1; font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Cena da Gucci Osteria</span>
        <span style="flex-shrink: 0; color: #d1d5db; opacity: 0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
      </div>
      <!-- Add button -->
      <button style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: transparent; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; cursor: pointer; font-size: 14px; width: 100%; justify-content: center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <span>Aggiungi attivita</span>
      </button>
    </div>
  </div>
  <!-- Day 2 (empty day) -->
  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex-shrink: 0; width: 96px; text-align: center; padding-top: 12px;">
      <div style="font-size: 2.25rem; font-weight: 700; color: #1e293b; line-height: 1;">16</div>
      <div style="font-size: 12px; color: #6b7280; font-weight: 500; letter-spacing: 0.03em; margin-top: 4px; text-transform: capitalize;">dom, feb</div>
    </div>
    <div style="flex: 1; display: flex; flex-direction: column; padding-top: 12px;">
      <!-- Hotel stay -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 8px;">
        <span style="flex-shrink: 0; color: #10b981;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 0V4h6v3m0 0v1a3 3 0 006 0V7M3 7h18"/></svg>
        </span>
        <span style="font-size: 14px; font-weight: 600; color: #374151; white-space: nowrap;">—</span>
        <span style="flex: 1; font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Pernottamento <strong>Hotel Principe</strong></span>
      </div>
      <button style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: transparent; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; cursor: pointer; font-size: 14px; width: 100%; justify-content: center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <span>Aggiungi attivita</span>
      </button>
    </div>
  </div>
</div>

### Classi CSS lista

```css
.activity-day {
  display: flex;
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-5);
}

.activity-day-sidebar {
  flex-shrink: 0;
  width: 96px;
}

.activity-day-number {
  font-size: 2.25rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-800);
}

.activity-day-meta {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  text-transform: capitalize;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-2);
}

/* Freccia esterna visibile solo al hover */
.activity-item-arrow {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.activity-item--clickable:hover .activity-item-arrow {
  opacity: 1;
  color: var(--cat-color);
}
```

## Ordinamento eventi nel giorno

All'interno di ciascun giorno, gli eventi seguono un ordinamento a tre livelli:

1. **Senza orario prima**: gli eventi privi di orario specifico vengono posizionati in cima
2. **Per orario** (crescente): gli eventi con orario vengono ordinati dal piu mattiniero al piu tardo
3. **Per priorita tipo**: a parita di orario (o assenza di orario), si applica la seguente scala di priorita:

| Tipo | Priorita | Descrizione |
|------|----------|-------------|
| Check-out | 0 | Massima priorita (prima azione della giornata) |
| Volo | 1 | Spostamenti aerei |
| Check-in | 2 | Arrivo in struttura |
| Stay | 3 | Pernottamento in corso |
| Attivita | 4 | Attivita personalizzate |

Questa logica riflette l'ordine naturale delle operazioni in una giornata di viaggio: prima si lascia l'alloggio, poi si prende il volo, poi si fa il check-in nella nuova struttura.

## Vista card

La vista card mostra gli eventi come card orizzontali scrollabili per ogni giorno. Ogni card ha dimensioni fisse `256×140px` con gradiente di sfondo della categoria.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex-shrink: 0; width: 96px; text-align: center; padding-top: 12px;">
      <div style="font-size: 2.25rem; font-weight: 700; color: #1e293b; line-height: 1;">15</div>
      <div style="font-size: 12px; color: #6b7280; font-weight: 500; letter-spacing: 0.03em; margin-top: 4px;">sab, feb</div>
    </div>
    <div style="flex: 1; display: flex; gap: 12px; overflow-x: auto; padding-top: 12px;">
      <!-- Flight card -->
      <div style="flex-shrink: 0; width: 256px; min-width: 256px; height: 140px; padding: 16px; border: 1px solid #bfdbfe; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: linear-gradient(135deg, #eff6ff, #eef2ff); display: flex; flex-direction: column; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
          </div>
          <span style="font-size: 12px; font-weight: 600; color: #3b82f6; background: #dbeafe; padding: 2px 8px; border-radius: 4px;">NH104</span>
          <span style="display: flex; align-items: center; gap: 6px; padding: 0 8px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; font-size: 12px; font-weight: 600; margin-left: auto; white-space: nowrap;">14:30</span>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Tokyo</div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Narita International Airport</div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; margin-top: 4px;">
          <span style="font-weight: 600;">NRT</span>
          <span style="flex: 1; height: 1px; background: #cbd5e1; position: relative;"></span>
          <span style="font-weight: 600;">FCO</span>
        </div>
      </div>
      <!-- Restaurant card -->
      <div style="flex-shrink: 0; width: 256px; min-width: 256px; height: 140px; padding: 16px; border: 1px solid #fde68a; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: linear-gradient(135deg, #fffbeb, #fff7ed); display: flex; flex-direction: column; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; background: linear-gradient(135deg, #fbbf24, #f97316); color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          </div>
          <span style="display: flex; align-items: center; gap: 6px; padding: 0 8px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #fbbf24, #f97316); color: white; font-size: 12px; font-weight: 600; margin-left: auto; white-space: nowrap;">19:00</span>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Cena da Gucci Osteria</div>
        <div style="font-size: 12px; color: #64748b; flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">Ristorante stellato, prenotazione per 2</div>
      </div>
      <!-- Add card -->
      <div style="flex-shrink: 0; width: 40px; min-width: 40px; max-width: 40px; min-height: 140px; border: 2px dashed #cbd5e1; border-radius: 12px; background: transparent; display: flex; align-items: center; justify-content: center; color: #94a3b8; cursor: pointer;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      </div>
    </div>
  </div>
</div>

### Colori per categoria

Ogni categoria di evento ha un **gradiente di sfondo**, un **colore di bordo** e un **gradiente icona** specifici:

| Categoria | Card background | Bordo | Gradiente icona |
|-----------|----------------|-------|-----------------|
| **Ristorante** | `#fffbeb` → `#fff7ed` | `#fde68a` | `#fbbf24` → `#f97316` |
| **Volo** | `#eff6ff` → `#eef2ff` | `#bfdbfe` | `#3b82f6` → `#4f46e5` |
| **Hotel** | `#ecfdf5` → `#f0fdfa` | `#a7f3d0` | `#34d399` → `#14b8a6` |
| **Museo** | `#faf5ff` | `#e9d5ff` | `#c084fc` → `#a855f7` |
| **Attrazione** | `#fdf2f8` | `#fbcfe8` | `#f472b6` → `#ec4899` |
| **Treno** | `#fef2f2` | `#fecaca` | `#f87171` → `#ef4444` |
| **Luogo** | `#ecfeff` | `#a5f3fc` | `#22d3ee` → `#06b6d4` |

### Card CSS

```css
.activity-card {
  width: 16rem;       /* 256px */
  min-width: 16rem;
  height: 140px;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  scroll-snap-align: start;
}

/* Esempio: categoria volo */
.activity-card[data-category="volo"] {
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  border-color: #bfdbfe;
}

.activity-card[data-category="volo"]:hover {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
}

/* Card aggiunta (+) — colonna stretta con bordo tratteggiato */
.activity-card--add {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  border: 2px dashed rgb(203 213 225);
  background: transparent;
}

.activity-card--add:hover {
  border-color: #60a5fa;
  color: var(--color-primary);
  background-color: #eff6ff;
}
```

## Vista calendario

La vista calendario mostra i giorni del viaggio in formato griglia mensile. I giorni del viaggio hanno sfondo blu chiaro, e ciascun evento e rappresentato da un indicatore verticale colorato con testo.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 24px; max-width: 700px;">
    <!-- Calendar header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: 700; color: #0f172a;">Febbraio 2026</div>
      <div style="display: flex; gap: 8px;">
        <button style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #334155; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #334155; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
    <!-- Week headers -->
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 8px;">
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Lun</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Mar</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Mer</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Gio</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Ven</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Sab</div>
      <div style="text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Dom</div>
    </div>
    <!-- Week row -->
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
      <!-- Empty cells -->
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: #f8fafc;"><span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">9</span></div>
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: #f8fafc;"><span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">10</span></div>
      <!-- Trip days -->
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: linear-gradient(to bottom right, #eff6ff, #e0e7ff); cursor: pointer;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 700; color: #2163f6;">11</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 2px 4px; border-radius: 4px; cursor: pointer;">
            <span style="width: 4px; border-radius: 9999px; flex-shrink: 0; min-height: 14px; background: #2563eb; align-self: stretch;"></span>
            <span style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">14:30 · Volo</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 2px 4px; border-radius: 4px; cursor: pointer;">
            <span style="width: 4px; border-radius: 9999px; flex-shrink: 0; min-height: 14px; background: #10b981; align-self: stretch;"></span>
            <span style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Check-in Hotel</span>
          </div>
        </div>
      </div>
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: linear-gradient(to bottom right, #eff6ff, #e0e7ff); cursor: pointer;">
        <div style="margin-bottom: 8px;"><span style="font-size: 14px; font-weight: 700; color: #2163f6;">12</span></div>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 2px 4px;">
            <span style="width: 4px; border-radius: 9999px; flex-shrink: 0; min-height: 14px; background: #10b981; align-self: stretch;"></span>
            <span style="color: #475569;">Pernottamento</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 2px 4px;">
            <span style="width: 4px; border-radius: 9999px; flex-shrink: 0; min-height: 14px; background: #f59e0b; align-self: stretch;"></span>
            <span style="color: #475569;">19:00 · Cena</span>
          </div>
        </div>
      </div>
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: linear-gradient(to bottom right, #eff6ff, #e0e7ff); cursor: pointer;">
        <div style="margin-bottom: 8px;"><span style="font-size: 14px; font-weight: 700; color: #2163f6;">13</span></div>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 2px 4px;">
            <span style="width: 4px; border-radius: 9999px; flex-shrink: 0; min-height: 14px; background: #a855f7; align-self: stretch;"></span>
            <span style="color: #475569;">10:00 · Museo</span>
          </div>
        </div>
      </div>
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: #f8fafc;"><span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">14</span></div>
      <div style="border-radius: 8px; padding: 12px; min-height: 100px; background: #f8fafc;"><span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">15</span></div>
    </div>
  </div>
</div>

### Indicatori colore nel calendario

Ogni evento nel calendario e preceduto da un indicatore verticale colorato (`4px` di larghezza, `border-radius: 9999px`) il cui colore corrisponde alla categoria:

| Indicatore | Colore | Categoria |
|------------|--------|-----------|
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#f59e0b;vertical-align:middle;"></span> | `#f59e0b` | Ristorante |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#2563eb;vertical-align:middle;"></span> | `#2563eb` | Volo |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#10b981;vertical-align:middle;"></span> | `#10b981` | Hotel |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#a855f7;vertical-align:middle;"></span> | `#a855f7` | Museo |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#ec4899;vertical-align:middle;"></span> | `#ec4899` | Attrazione |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#ef4444;vertical-align:middle;"></span> | `#ef4444` | Treno |
| <span style="display:inline-block;width:4px;height:14px;border-radius:9999px;background:#06b6d4;vertical-align:middle;"></span> | `#06b6d4` | Luogo |

### Classi CSS calendario

```css
.calendar-container {
  background-color: white;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid rgb(226 232 240);
  padding: 1.5rem;
}

.calendar-cell {
  border-radius: 0.5rem;
  padding: 0.75rem;
  min-height: 100px;
}

/* Giorno del viaggio — sfondo blu chiaro */
.calendar-cell-trip {
  background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
  cursor: pointer;
}

/* Indicatore colorato verticale */
.activity-indicator {
  width: 0.25rem;          /* 4px */
  border-radius: 9999px;
  flex-shrink: 0;
  min-height: 14px;
  align-self: stretch;
}
```

## View switcher

Il passaggio tra le tre viste (lista, card, calendario) avviene tramite un selettore con tre pulsanti icona racchiusi in un contenitore pill bianco con ombra.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 32px; align-items: center; justify-content: center;">
  <!-- Active: List -->
  <div style="text-align: center;">
    <div style="display: flex; align-items: center; gap: 2px; background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 0.25rem;">
      <button style="width: 2.25rem; height: 2.25rem; background: #f1f5f9; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
    </div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Lista attiva</div>
  </div>
  <!-- Active: Cards -->
  <div style="text-align: center;">
    <div style="display: flex; align-items: center; gap: 2px; background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 0.25rem;">
      <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <button style="width: 2.25rem; height: 2.25rem; background: #f1f5f9; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button style="width: 2.25rem; height: 2.25rem; background: transparent; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
    </div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Card attiva</div>
  </div>
</div>

```css
.activity-view-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid rgb(226 232 240);
  padding: 0.25rem;
}

.activity-view-btn {
  width: 2.25rem;
  height: 2.25rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  transition: all 0.2s;
  color: rgb(71 85 105);
}

.activity-view-btn.active {
  background: rgb(241 245 249);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  color: rgb(15 23 42);
}
```

## Navigazione e interazioni

### Link "Dettagli" per voli e hotel

Le righe (lista) e card relative a voli e hotel mostrano una **freccia esterna** al hover che, al click:

1. Passa automaticamente al tab corrispondente (Voli o Hotel)
2. Scorre fino alla card specifica
3. **Evidenzia** la card con un effetto visivo temporaneo per facilitarne l'individuazione

### Click su attivita custom

Cliccando su una riga o card di attivita personalizzata si apre il **pannello laterale** in modalita **view** (sola lettura), mostrando tutti i dettagli dell'attivita.

## Pulsante "Aggiungi Attivita"

Il pulsante CTA per la creazione e visibile **solo quando il tab Attivita e attivo**. Si trova nell'header a destra, separato dal view switcher da una linea verticale sottile.

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 32px; align-items: center; justify-content: center;">
  <!-- Desktop -->
  <div style="text-align: center;">
    <button style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; background: #2163f6; color: white; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(147,197,253,0.4);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <span>Aggiungi Attivita</span>
    </button>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Desktop</div>
  </div>
  <!-- Mobile -->
  <div style="text-align: center;">
    <button style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; background: #2163f6; color: white; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(147,197,253,0.4);">
      <span>+ Attivita</span>
    </button>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Mobile</div>
  </div>
</div>

```css
.activity-header-add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  background: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  box-shadow: 0 4px 6px -1px rgba(147, 197, 253, 0.4);
  margin-left: var(--spacing-2);
}

/* Separatore verticale a sinistra del pulsante */
.activity-header-add-btn::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--spacing-2) - var(--spacing-2) / 2);
  top: 15%;
  height: 70%;
  width: 1px;
  background: rgb(203 213 225);
}

/* Mobile: etichetta breve */
@media (max-width: 640px) {
  .activity-header-add-btn .activity-header-add-label {
    display: none;
  }
  .activity-header-add-btn .activity-header-add-label-short {
    display: inline; /* Mostra "+ Attivita" */
  }
}
```

### Pulsanti inline "Aggiungi attivita" per giorno

Ogni giorno nella timeline ha un pulsante con bordo tratteggiato per aggiungere un'attivita direttamente a quella data. Il pulsante pre-compila la data nel pannello di creazione.

```css
.activity-new-btn--dashed {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: transparent;
  color: #94a3b8;
}

.activity-new-btn--dashed:hover {
  border-color: #60a5fa;
  color: var(--color-primary);
  background-color: #eff6ff;
}
```
