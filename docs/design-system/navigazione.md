# Navigazione

Componenti di navigazione principali dell'applicazione: header, controlli segmentati e switcher per le viste.

## Header `.header`

L'header principale dell'applicazione utilizza una barra sticky con sfondo bianco.

```css
.header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200); /* #e5e7eb */
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: var(--font-weight-bold); /* 700 */
  color: var(--color-gray-900); /* #111827 */
}
```

Il logo include un'icona SVG dell'aeroplano (24x24) seguita dal nome dell'applicazione.

<div style="margin: 16px 0; padding: 0; background: #f9fafb; border-radius: 12px; overflow: hidden;">
  <div style="background: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; height: 64px;">
    <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; color: #111827;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2163f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
      Travel Organizer
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 14px; font-weight: 500; color: #2163f6; cursor: pointer;">I miei viaggi</span>
      <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #ffffff; background: #2163f6; font-size: 14px;">F</div>
    </div>
  </div>
</div>

### Header Actions `.header-actions`

Contiene i pulsanti d'azione e l'avatar del profilo, allineati con flex e gap.

```css
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2); /* 8px */
}
```

## Header Home `.header--home`

Variante dell'header usata esclusivamente nella home page, con sfondo gradiente blu e testo bianco.

```css
.header--home {
  background: linear-gradient(to top, #0D47A1, #1557E0, #2163F6);
  border-bottom: none;
  color: var(--color-white);
}
```

In questa variante, i pulsanti utilizzano lo stile **glassmorphism** (`.header-glass-btn`) al posto dei pulsanti standard, per mantenere leggibilità sullo sfondo colorato.

<div style="margin: 16px 0; padding: 0; background: #f9fafb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(to top, #0D47A1, #1557E0, #2163F6); padding: 0 24px; display: flex; justify-content: space-between; align-items: center; height: 64px;">
    <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; color: #ffffff;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
      Travel Organizer
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="padding: 8px 16px; border-radius: 8px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); color: #ffffff; font-size: 14px; font-weight: 500; cursor: pointer;">Nuovo viaggio</div>
      <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #2163f6; background: #ffffff; font-size: 14px;">F</div>
    </div>
  </div>
</div>

## Nav Link `.header-nav-link`

Link di navigazione nell'header.

```css
.header-nav-link {
  font-size: var(--font-size-sm); /* 14px */
  font-weight: var(--font-weight-medium); /* 500 */
  color: var(--color-gray-600); /* #6b7280 */
  text-decoration: none;
  transition: color var(--transition-fast); /* 150ms ease */
}

.header-nav-link:hover,
.header-nav-link.active {
  color: var(--color-primary); /* #2163f6 */
}
```

## Avatar Profilo `.header-profile-avatar`

Avatar circolare che mostra l'iniziale dell'utente. Funziona come link alla pagina impostazioni.

```css
.header-profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-semibold); /* 600 */
  color: var(--color-white);
  background: var(--color-primary); /* #2163f6 */
}
```

## Campanella Notifiche

Icona SVG della campanella (20x20) con badge contatore. Il badge e' un cerchio rosso con il numero di notifiche non lette.

```css
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: var(--radius-full); /* 9999px */
  background: var(--color-error); /* #ef4444 */
  color: var(--color-white);
  font-size: 11px;
  font-weight: var(--font-weight-bold); /* 700 */
  display: flex;
  align-items: center;
  justify-content: center;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; gap: 32px; align-items: center; justify-content: center;">
  <div style="text-align: center;">
    <div style="position: relative; display: inline-block;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    </div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Senza notifiche</div>
  </div>
  <div style="text-align: center;">
    <div style="position: relative; display: inline-block;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <div style="position: absolute; top: -6px; right: -8px; min-width: 18px; height: 18px; border-radius: 9999px; background: #ef4444; color: #ffffff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px;">3</div>
    </div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Con badge</div>
  </div>
</div>

## Section Header `.section-header`

Section headers are used at the top of each tab (Voli, Hotel, Attivita) to show the section title + CTA action buttons.

```css
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.section-header-title {
  font-size: var(--font-size-xl);   /* 20px */
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-800);
  margin: 0;
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
```

Responsive labels:
```css
.section-header-cta-label-short { display: none; }

@media (max-width: 767px) {
  .section-header-cta-label-full { display: none; }
  .section-header-cta-label-short { display: inline; }
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Esempi di Section Header</div>

  <div style="display: flex; flex-direction: column; gap: 24px;">
    <!-- Voli header -->
    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0;">I miei voli</h2>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button style="padding: 10px 16px; background: #2163f6; color: #ffffff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Aggiungi volo</button>
          <button style="padding: 10px 16px; background: transparent; color: #2163f6; border: 1px solid #2163f6; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Modifica</button>
        </div>
      </div>
    </div>

    <!-- Hotel header -->
    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0;">I miei hotel</h2>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button style="padding: 10px 16px; background: #10b981; color: #ffffff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Aggiungi hotel</button>
          <button style="padding: 10px 16px; background: transparent; color: #10b981; border: 1px solid #10b981; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Modifica</button>
        </div>
      </div>
    </div>
  </div>
</div>

## Home Section Header `.home-section-header`

Used on the dashboard to introduce each trip section with a colored vertical bar:

```css
.home-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.home-section-bar {
  height: 40px;
  width: 4px;
  border-radius: 9999px;
}

.home-section-bar--current {
  background: linear-gradient(to bottom, #4ade80, #10b981);
}

.home-section-bar--upcoming {
  background: linear-gradient(to bottom, #60a5fa, #6366f1);
}

.home-section-bar--past {
  background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
}

.home-section-title {
  font-size: 30px;
  font-weight: 700;
  color: #0f172a;
}

.home-section-subtitle {
  font-size: 14px;
  color: #64748b;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Esempi di Home Section Header</div>

  <div style="display: flex; flex-direction: column; gap: 24px;">
    <!-- Current trip -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="height: 40px; width: 4px; border-radius: 9999px; background: linear-gradient(to bottom, #4ade80, #10b981);"></div>
      <div>
        <div style="font-size: 30px; font-weight: 700; color: #0f172a;">In Corso</div>
        <div style="font-size: 14px; color: #64748b;">Il tuo viaggio attuale</div>
      </div>
    </div>

    <!-- Upcoming trips -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="height: 40px; width: 4px; border-radius: 9999px; background: linear-gradient(to bottom, #60a5fa, #6366f1);"></div>
      <div>
        <div style="font-size: 30px; font-weight: 700; color: #0f172a;">Prossimi Viaggi</div>
        <div style="font-size: 14px; color: #64748b;">2 viaggi pianificati</div>
      </div>
    </div>

    <!-- Past trips -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="height: 40px; width: 4px; border-radius: 9999px; background: linear-gradient(to bottom, #cbd5e1, #94a3b8);"></div>
      <div>
        <div style="font-size: 30px; font-weight: 700; color: #0f172a;">Viaggi Passati</div>
        <div style="font-size: 14px; color: #64748b;">I tuoi ricordi</div>
      </div>
    </div>
  </div>
</div>

## Segmented Control `.segmented-control`

Controllo segmentato per la navigazione tra le tab (Voli, Hotel, Attivita'). Include un indicatore animato che scorre tra le opzioni.

```css
.segmented-control {
  display: inline-flex;
  position: relative;
  background: var(--color-gray-100); /* #f3f4f6 */
  border-radius: var(--radius-lg); /* 12px */
  padding: var(--spacing-1); /* 4px */
  gap: var(--spacing-1); /* 4px */
}

.segmented-control-btn {
  padding: var(--spacing-3) var(--spacing-5); /* 12px 20px */
  font-size: var(--font-size-sm); /* 14px */
  font-weight: var(--font-weight-medium); /* 500 */
  color: var(--color-gray-600);
  border-radius: var(--radius-md); /* 8px */
  min-height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.segmented-control-btn.active {
  color: var(--color-gray-900); /* #111827 */
  font-weight: var(--font-weight-semibold); /* 600 */
}

.segmented-indicator {
  position: absolute;
  background: var(--color-white);
  border-radius: var(--radius-md); /* 8px */
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="display: inline-flex; background: #f3f4f6; border-radius: 12px; padding: 4px; gap: 4px;">
    <div style="padding: 12px 20px; font-size: 14px; font-weight: 600; color: #111827; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer;">Attivita</div>
    <div style="padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6b7280; border-radius: 8px; cursor: pointer;">Voli</div>
    <div style="padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6b7280; border-radius: 8px; cursor: pointer;">Hotel</div>
  </div>
</div>

L'indicatore viene posizionato e dimensionato tramite JavaScript in base al bottone attivo. La transizione usa una curva `cubic-bezier(0.4, 0, 0.2, 1)` per un movimento fluido e naturale.

### Comportamento mobile

Su mobile il segmented control si espande a larghezza piena:

```css
@media (max-width: 768px) {
  .segmented-control {
    width: 100%;
  }

  .segmented-control-btn {
    flex: 1;
    text-align: center;
  }
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Mobile (larghezza piena)</div>
  <div style="display: flex; background: #f3f4f6; border-radius: 12px; padding: 4px; gap: 4px; max-width: 375px;">
    <div style="flex: 1; padding: 12px 20px; font-size: 14px; font-weight: 600; color: #111827; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; text-align: center;">Attivita</div>
    <div style="flex: 1; padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6b7280; border-radius: 8px; cursor: pointer; text-align: center;">Voli</div>
    <div style="flex: 1; padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6b7280; border-radius: 8px; cursor: pointer; text-align: center;">Hotel</div>
  </div>
</div>

## Activity View Switcher `.activity-view-switcher`

Switcher per alternare tra vista lista e vista calendario nella tab Attivita'.

```css
.activity-view-switcher {
  background: var(--color-white);
  border-radius: var(--radius-lg); /* 12px */
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-slate-200); /* #e2e8f0 */
  display: inline-flex;
  overflow: hidden;
}

.activity-view-switcher button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-gray-500);
  transition: all var(--transition-fast); /* 150ms ease */
}

.activity-view-switcher button:hover {
  color: var(--color-primary); /* #2163f6 */
  background: var(--color-gray-50); /* #f9fafb */
}

.activity-view-switcher button.active {
  color: var(--color-primary); /* #2163f6 */
  background: var(--color-primary-50); /* #eff6ff */
}
```

<div style="margin: 16px 0; padding: 24px; background: #f9fafb; border-radius: 12px; display: flex; align-items: center; gap: 16px;">
  <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: inline-flex; overflow: hidden;">
    <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #eff6ff; cursor: pointer;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2163f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    </div>
    <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    </div>
  </div>
  <span style="font-size: 13px; color: #6b7280;">Lista (attivo) / Calendario</span>
</div>

I pulsanti contengono icone SVG (lista e calendario) e rispettano la dimensione minima di 36x36px per un'adeguata area di tocco.
