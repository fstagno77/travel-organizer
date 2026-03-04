# Dashboard - Homepage

La homepage di Travel Organizer mostra una panoramica dei viaggi dell'utente, con focus sul viaggio corrente e l'itinerario della giornata.

## Header

Header con gradiente blu che contiene il logo e i pulsanti di azione:

- **Gradiente**: `linear-gradient(to top, #0D47A1, #1557E0, #2163F6)`
- **Logo**: "Travel Flow" a 72px
- **Pulsanti**: icone con effetto glass-morphism

## Sezioni con Barra Colorata

Ogni sezione della dashboard ha un header distintivo con:
- Barra verticale colorata (4px larghezza, 40px altezza, bordi arrotondati)
- Titolo della sezione (30px, bold)
- Sottotitolo descrittivo (14px, grigio)

### Tipi di Sezione

#### In Corso (Viaggio Corrente)
- **Barra**: gradiente verde `linear-gradient(to bottom, #4ade80, #10b981)`
- **Contenuto**: card dedicata per il viaggio attualmente in corso
- **Visibilità**: mostrata solo se c'è un viaggio corrente

#### Prossimi Viaggi
- **Barra**: gradiente blu `linear-gradient(to bottom, #60a5fa, #6366f1)`
- **Sottotitolo**: "N viaggi pianificati" (dove N è il numero di viaggi futuri)
- **Contenuto**: griglia di card dei viaggi futuri

#### Viaggi Passati
- **Barra**: gradiente grigio `linear-gradient(to bottom, #cbd5e1, #94a3b8)`
- **Sottotitolo**: "I tuoi ricordi"
- **Contenuto**: griglia di card dei viaggi passati

### Anteprima Visiva: Header delle Sezioni

```html
<div style="display: flex; gap: 40px; padding: 20px; background: #f8fafc; border-radius: 8px;">
  <!-- In Corso -->
  <div style="display: flex; align-items: center; gap: 16px;">
    <div style="width: 4px; height: 40px; background: linear-gradient(to bottom, #4ade80, #10b981); border-radius: 4px;"></div>
    <div>
      <div style="font-size: 30px; font-weight: 700; color: #0f172a;">In Corso</div>
      <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Il tuo viaggio attuale</div>
    </div>
  </div>

  <!-- Prossimi Viaggi -->
  <div style="display: flex; align-items: center; gap: 16px;">
    <div style="width: 4px; height: 40px; background: linear-gradient(to bottom, #60a5fa, #6366f1); border-radius: 4px;"></div>
    <div>
      <div style="font-size: 30px; font-weight: 700; color: #0f172a;">Prossimi Viaggi</div>
      <div style="font-size: 14px; color: #64748b; margin-top: 4px;">3 viaggi pianificati</div>
    </div>
  </div>

  <!-- Viaggi Passati -->
  <div style="display: flex; align-items: center; gap: 16px;">
    <div style="width: 4px; height: 40px; background: linear-gradient(to bottom, #cbd5e1, #94a3b8); border-radius: 4px;"></div>
    <div>
      <div style="font-size: 30px; font-weight: 700; color: #0f172a;">Viaggi Passati</div>
      <div style="font-size: 14px; color: #64748b; margin-top: 4px;">I tuoi ricordi</div>
    </div>
  </div>
</div>
```

## Card "In Corso"

Card principale per il viaggio corrente, con design distintivo e focus sugli eventi della giornata.

### Struttura

**Container**: `.current-trip-card`
- Background: bianco
- Border radius: 24px
- Shadow: `shadow-xl` (default), `shadow-2xl` (hover)

### Header della Card

Padding: 24px, bordo inferiore

**Elementi**:
- **Titolo viaggio**: 24px, bold
- **Destinazione**: 14px, grigio, con icona pin
- **Meta informazioni**:
  - Icona calendario (blu) + date di viaggio
  - Icona orologio (indigo) + durata del viaggio
- **Freccia navigazione**: 40x40px, arrotondata, grigio → blu on hover

### Sezione "Oggi"

Padding: 24px

**Label data**: "OGGI · [data]" (12px, uppercase, font-weight 600)

**Event cards**: `.current-event-card`
- Layout: flex, gap 14px
- Padding: 16px 18px
- Border radius: 14px
- Bordo e background basati sulla categoria dell'evento

**Struttura event card**:
1. **Icon container**: 36x36px, rounded 10px, gradiente categoria, icona bianca
2. **Info section**:
   - **Orario e titolo**: 14px, font-weight 700, separati da ·
   - **Descrizione**: 13px, gray-600
   - **Location**: 12px, grigio, con icona pin

**Categorie eventi**: utilizzano i colori da `activityCategories`:
- Flight (volo): blu
- Hotel: verde
- Restaurant (ristorante): amber
- Tour: viola
- Transport (trasporto): cyan
- Activity (attività): rosa
- Other (altro): grigio

### Footer CTA

Pulsante "Visualizza Itinerario Completo":
- Gradiente: `linear-gradient(to right, #2563eb, #4f46e5)`
- Testo: bianco, 15px, font-weight 600
- Shadow, hover: gradiente più scuro

### Anteprima Visiva: Card "In Corso"

```html
<div style="max-width: 800px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); overflow: hidden;">
  <!-- Header -->
  <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #0f172a;">Giappone 2026</h2>
        <div style="display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 14px; margin-bottom: 16px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Tokyo, Kyoto, Osaka</span>
        </div>
        <div style="display: flex; gap: 20px; font-size: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #3b82f6;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span style="color: #0f172a; font-weight: 500;">15 Mar - 29 Mar 2026</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; color: #6366f1;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style="color: #0f172a; font-weight: 500;">14 giorni</span>
          </div>
        </div>
      </div>
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  </div>

  <!-- Today Section -->
  <div style="padding: 24px;">
    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
      OGGI · 18 Marzo 2026
    </div>

    <!-- Event: Flight -->
    <div style="display: flex; gap: 14px; padding: 16px 18px; border-radius: 14px; background: linear-gradient(to right, #dbeafe, #eff6ff); border: 1px solid #93c5fd; margin-bottom: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(to bottom, #60a5fa, #3b82f6); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          08:30 · Volo per Kyoto
        </div>
        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
          ANA NH123 · Tokyo Haneda → Osaka Itami
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Terminal 2, Gate 45</span>
        </div>
      </div>
    </div>

    <!-- Event: Hotel -->
    <div style="display: flex; gap: 14px; padding: 16px 18px; border-radius: 14px; background: linear-gradient(to right, #d1fae5, #ecfdf5); border: 1px solid #6ee7b7; margin-bottom: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(to bottom, #4ade80, #10b981); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          15:00 · Check-in Hotel
        </div>
        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
          Kyoto Garden Hotel · Camera Deluxe
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>123 Sakura Street, Gion</span>
        </div>
      </div>
    </div>

    <!-- Event: Restaurant -->
    <div style="display: flex; gap: 14px; padding: 16px 18px; border-radius: 14px; background: linear-gradient(to right, #fef3c7, #fefce8); border: 1px solid #fcd34d;">
      <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(to bottom, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
          <line x1="6" y1="1" x2="6" y2="4"></line>
          <line x1="10" y1="1" x2="10" y2="4"></line>
          <line x1="14" y1="1" x2="14" y2="4"></line>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          19:30 · Cena Tradizionale
        </div>
        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
          Kaiseki Yoshikawa · Menu degustazione
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Pontocho Alley</span>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA Footer -->
  <div style="padding: 0 24px 24px 24px;">
    <button style="width: 100%; padding: 14px 24px; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; font-size: 15px; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      Visualizza Itinerario Completo
    </button>
  </div>
</div>
```

### Anteprima Visiva: Pulsante CTA

```html
<div style="padding: 20px; background: #f8fafc; border-radius: 8px;">
  <button style="padding: 14px 24px; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; font-size: 15px; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transition: all 0.2s;">
    Visualizza Itinerario Completo
  </button>
  <p style="margin-top: 12px; font-size: 13px; color: #64748b;">
    Hover: gradiente più scuro, shadow più intensa
  </p>
</div>
```

## Griglia Viaggi

Le card dei viaggi prossimi e passati sono visualizzate in una griglia responsive.

### Struttura Card Viaggio

**Elementi**:
- **Immagine**: foto della destinazione con overlay gradiente
- **Titolo**: nome del viaggio
- **Date**: date di inizio e fine
- **Route**: città/tappe del viaggio

**Interazione Hover**:
- `translateY(-4px)`: sollevamento della card
- Bordo blu che appare
- Shadow più pronunciata

### Layout Griglia

**Desktop**: 3 colonne
**Tablet**: 2 colonne
**Mobile**: 1 colonna

## Pulsante "Nuovo Viaggio"

Pulsante per creare un nuovo viaggio, con testo adattivo su mobile.

**Desktop**: "Nuovo Viaggio" (testo completo)
**Mobile**: Icona + "Viaggio" (testo abbreviato)

### Implementazione

```html
<!-- Desktop -->
<button class="hidden sm:block">
  <svg>...</svg>
  <span>Nuovo Viaggio</span>
</button>

<!-- Mobile -->
<button class="sm:hidden">
  <svg>...</svg>
  <span>Viaggio</span>
</button>
```

## Changelog Modal

Modale per visualizzare le novità dell'applicazione, accessibile dal footer tramite pulsante versione.

### Struttura

**Overlay**: `.changelog-modal-overlay`
- Backdrop con blur
- Transizione opacity 0 → 1

**Modal**: `.changelog-modal`
- Larghezza massima: 480px
- Altezza massima: 80vh
- Padding: 20px
- Animazione: scale(0.95) → scale(1), slide up

### Contenuto

**Header**:
- **Versione**: text-xl, bold, colore primario
- **Data**: text-sm, gray-400
- **Pulsante chiusura**: X in alto a destra

**Lista modifiche**:
- Items con bordo inferiore
- Testo small
- Spaziatura verticale

### Animazioni

**Apertura**:
1. Backdrop fade in
2. Modal slide up + scale up
3. Blur backdrop

**Chiusura**:
1. Modal slide down + scale down
2. Backdrop fade out

## Ordinamento Viaggi

I viaggi vengono ordinati secondo questa logica:

1. **Viaggio corrente**: sezione dedicata in cima (se presente)
2. **Viaggi futuri**: ordinati per data di inizio crescente (il più vicino per primo)
3. **Viaggi passati**: ordinati per data di fine decrescente (il più recente per primo)

### Logica di Classificazione

Un viaggio è considerato:
- **Corrente**: se la data odierna è compresa tra startDate e endDate
- **Futuro**: se startDate è successivo alla data odierna
- **Passato**: se endDate è precedente alla data odierna

## Responsive Design

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Adattamenti Mobile

1. **Header sezioni**: stack verticale invece di orizzontale
2. **Card "In Corso"**: padding ridotto
3. **Event cards**: icone più piccole, font-size ridotti
4. **Griglia viaggi**: singola colonna
5. **Pulsante "Nuovo Viaggio"**: testo abbreviato
6. **Changelog modal**: width 100%, padding ridotto

## Creazione Nuovo Viaggio

Il flusso di creazione di un nuovo viaggio si attiva tramite il pulsante "Nuovo Viaggio" presente nella dashboard.

### Flusso di Upload

1. L'utente clicca su "Nuovo Viaggio" e si apre una modal di upload PDF
2. L'utente seleziona uno o più file PDF (conferme di prenotazione voli, hotel, ecc.)
3. Il sistema richiede un URL di upload firmato tramite la funzione `get-upload-url`
4. Il file viene caricato direttamente su Supabase Storage usando l'URL firmato (upload lato client, senza passare dal server)
5. Una volta completato l'upload, viene invocata la funzione `process-pdf` che:
   - Invia il PDF all'API Claude per l'estrazione dei dati
   - Crea un nuovo record viaggio nel database con i dati estratti
   - Restituisce il viaggio creato alla dashboard

Al termine del flusso, la dashboard si aggiorna automaticamente mostrando il nuovo viaggio nella griglia.

## File Correlati

- **JavaScript**: `/js/main.js` - Logica dashboard e rendering
- **Styles**: `/css/dashboard.css` - Stili specifici dashboard
- **Components**: `/js/components/tripCard.js` - Componente card viaggio
- **Utils**: `/js/utils/dateUtils.js` - Utility per gestione date e ordinamento

## Note Implementative

### Performance

- Le immagini delle card viaggi utilizzano lazy loading
- Gli eventi della giornata sono limitati ai prossimi 5 eventi
- La griglia viaggi utilizza virtual scrolling per liste lunghe

### Accessibilità

- Tutte le icone hanno `aria-label` descrittivi
- I pulsanti hanno stati focus visibili
- Il contrasto dei colori rispetta WCAG AA
- La navigazione da tastiera è supportata

### Categorie Attività

Le categorie eventi utilizzano i colori definiti in `activityCategories`:

```javascript
const activityCategories = {
  flight: { gradient: 'linear-gradient(to bottom, #60a5fa, #3b82f6)', border: '#93c5fd', bg: 'linear-gradient(to right, #dbeafe, #eff6ff)' },
  hotel: { gradient: 'linear-gradient(to bottom, #4ade80, #10b981)', border: '#6ee7b7', bg: 'linear-gradient(to right, #d1fae5, #ecfdf5)' },
  restaurant: { gradient: 'linear-gradient(to bottom, #fbbf24, #f59e0b)', border: '#fcd34d', bg: 'linear-gradient(to right, #fef3c7, #fefce8)' },
  tour: { gradient: 'linear-gradient(to bottom, #a78bfa, #8b5cf6)', border: '#c4b5fd', bg: 'linear-gradient(to right, #ede9fe, #f5f3ff)' },
  transport: { gradient: 'linear-gradient(to bottom, #22d3ee, #06b6d4)', border: '#67e8f9', bg: 'linear-gradient(to right, #cffafe, #ecfeff)' },
  activity: { gradient: 'linear-gradient(to bottom, #f472b6, #ec4899)', border: '#f9a8d4', bg: 'linear-gradient(to right, #fce7f3, #fdf2f8)' },
  other: { gradient: 'linear-gradient(to bottom, #94a3b8, #64748b)', border: '#cbd5e1', bg: 'linear-gradient(to right, #f1f5f9, #f8fafc)' }
};
```
