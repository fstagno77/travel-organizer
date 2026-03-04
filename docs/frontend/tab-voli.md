# Tab Voli - Documentazione Design

Questo documento descrive il design aggiornato della scheda "Voli" nell'applicazione Travel Organizer.

## Section Header

Ogni tab ora include un header di sezione con titolo e pulsanti di azione (CTA):

```html
<div class="section-header">
  <h2 class="section-header-title">I miei voli</h2>
  <div class="section-header-actions">
    <button class="section-header-cta btn btn-primary">+ Aggiungi</button>
    <button class="section-header-cta btn btn-outline">✏ Modifica</button>
  </div>
</div>
```

### CSS del Section Header

- `.section-header`: display flex, justify-content space-between, align-items center
- `.section-header-cta`: pulsanti che utilizzano `.btn-primary` (sfondo blu) e `.btn-outline` (trasparente con bordo blu 1.5px)
- **Mobile (<767px)**: le etichette dei pulsanti cambiano da versione completa a versione breve

### Anteprima Visuale

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f9fafb;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">I miei voli</h2>
    <div style="display: flex; gap: 12px;">
      <button style="padding: 10px 20px; background: #2163f6; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">+ Aggiungi</button>
      <button style="padding: 10px 20px; background: transparent; color: #2163f6; border: 1.5px solid #2163f6; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">✏ Modifica</button>
    </div>
  </div>
</div>

---

## Flight Card Redesign

La nuova struttura della card volo è composta da tre parti principali:

### 1. Header Bar (Barra Superiore)

- **Sfondo blu**: `--color-primary #2163f6`
- **Contenuto**:
  - Sinistra: data formattata (es. "Sabato, 15 Feb 2026")
  - Destra: numero volo come link (apre Google Flight tracking)
- **Voli passati**: utilizzano gray-400 (`#9ca3af`) invece del blu

**CSS chiave**:
```css
.flight-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #2163f6;
  color: white;
}

.flight-card.past .flight-card-header {
  background: #9ca3af;
}
```

### 2. Body (Corpo della Card)

Padding di 24px, contiene:

#### a) Titolo
- **Formato**: "Da {depCity} a {arrCity}"
- **Stile**: font-size 2xl (24px), bold, gray-800

#### b) Località Aeroporto
- Icona pin della mappa + nome aeroporto come link a Google Maps

#### c) Visualizzazione Rotta

Struttura a tre colonne:

**Colonna Sinistra (Partenza)**:
- Codice aeroporto grande (2rem, bold)
- Orario partenza con icona flight_takeoff
- Terminal (se presente)

**Colonna Centrale (Arco)**:
- SVG arco tratteggiato verde (160x28px)
- Colore: `#22c55e` (green)
- Tratteggio: stroke-dasharray 10 6
- Icona aereo in cerchio bianco (26px) posizionato in basso a destra dell'arco
- Rotazione aereo: 120deg
- Durata volo sotto l'arco

**Colonna Destra (Arrivo)**:
- Codice aeroporto grande
- Orario arrivo con icona flight_land
- Badge "+1" se arrivo giorno successivo
- Terminal (se presente)

**CSS chiave**:
```css
.flight-route {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.flight-endpoint {
  text-align: center;
  min-width: 60px;
}

.flight-airport-code-lg {
  font-size: 2rem;
  font-weight: bold;
}

.flight-arc {
  flex: 0 0 160px;
  position: relative;
}

.flight-arc-plane {
  position: absolute;
  right: -4px;
  bottom: -9px;
  width: 26px;
  height: 26px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transform: rotate(120deg);
}

.flight-duration {
  font-size: 12px;
  color: #6b7280;
}
```

### 3. Toggle Dettagli

Pulsante "Mostra dettagli" con chevron che espande per mostrare:
- Codice prenotazione
- Posto
- Bagaglio
- Numero biglietto
- Passeggeri

### 4. Voli Passati

I voli passati utilizzano la classe `.flight-card.past`:
- Header diventa gray-400 invece del blu

---

## CSS Completo della Card

```css
.flight-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  overflow: hidden;
}

.flight-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #2163f6;
  color: white;
}

.flight-card-body {
  padding: 24px;
}

.flight-title {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}
```

---

## Responsività Mobile

Su schermi con larghezza massima 480px:

- Body padding: 16px (invece di 24px)
- Titolo: font-size xl (invece di 2xl)
- Codice aeroporto: 1.5rem (invece di 2rem)
- Arco: min-width 60px (invece di flex 0 0 160px)

```css
@media (max-width: 480px) {
  .flight-card-body {
    padding: 16px;
  }

  .flight-title {
    font-size: 20px;
  }

  .flight-airport-code-lg {
    font-size: 1.5rem;
  }

  .flight-arc {
    flex: 0 0 60px;
    min-width: 60px;
  }
}
```

---

## Anteprime Visuali Complete

### Flight Card Attivo (Futuro)

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; max-width: 800px;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #2163f6; color: white;">
      <div style="font-weight: 600;">Sabato, 15 Feb 2026</div>
      <a href="#" style="color: white; text-decoration: underline; font-weight: 500;">NH104</a>
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      <!-- Title -->
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1f2937;">Da Tokyo a Roma</h3>

      <!-- Airport Location -->
      <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
        <svg style="width: 16px; height: 16px; color: #6b7280;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
        </svg>
        <a href="#" style="color: #2163f6; text-decoration: none; font-size: 14px;">Narita International Airport</a>
      </div>

      <!-- Route -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-top: 24px;">
        <!-- Departure -->
        <div style="text-align: center; min-width: 60px;">
          <div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">NRT</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 4px;">
            <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            14:30
          </div>
          <div style="font-size: 12px; color: #6b7280;">Terminal 1</div>
        </div>

        <!-- Arc -->
        <div style="flex: 0 0 160px; position: relative; display: flex; flex-direction: column; align-items: center;">
          <svg width="160" height="28" viewBox="0 0 160 28" style="margin-bottom: 4px;">
            <path d="M 0 26 Q 80 -10, 160 26" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="10 6"/>
          </svg>
          <div style="position: absolute; right: -4px; bottom: 25px; width: 26px; height: 26px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; transform: rotate(120deg);">
            <svg style="width: 16px; height: 16px; color: #22c55e;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">12h 15m</div>
        </div>

        <!-- Arrival -->
        <div style="text-align: center; min-width: 60px;">
          <div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">FCO</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 4px;">
            <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49s7.12-1.9 16.57-4.43c.81-.23 1.28-1.05 1.07-1.85z"/>
            </svg>
            22:45
          </div>
          <div style="font-size: 12px; color: #6b7280;">Terminal 3</div>
        </div>
      </div>

      <!-- Toggle Details Button -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <button style="display: flex; align-items: center; gap: 8px; background: none; border: none; color: #2163f6; font-weight: 600; font-size: 14px; cursor: pointer; padding: 0;">
          Mostra dettagli
          <svg style="width: 16px; height: 16px; transform: rotate(0deg); transition: transform 0.2s;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>

---

### Flight Card Passato (Past)

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; max-width: 800px;">
    <!-- Header - Gray for past flights -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #9ca3af; color: white;">
      <div style="font-weight: 600;">Lunedì, 20 Gen 2025</div>
      <a href="#" style="color: white; text-decoration: underline; font-weight: 500;">AZ784</a>
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      <!-- Title -->
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1f2937;">Da Milano a Parigi</h3>

      <!-- Airport Location -->
      <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
        <svg style="width: 16px; height: 16px; color: #6b7280;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
        </svg>
        <a href="#" style="color: #2163f6; text-decoration: none; font-size: 14px;">Aeroporto di Milano Malpensa</a>
      </div>

      <!-- Route -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-top: 24px;">
        <!-- Departure -->
        <div style="text-align: center; min-width: 60px;">
          <div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">MXP</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 4px;">
            <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            08:15
          </div>
          <div style="font-size: 12px; color: #6b7280;">Terminal 1</div>
        </div>

        <!-- Arc -->
        <div style="flex: 0 0 160px; position: relative; display: flex; flex-direction: column; align-items: center;">
          <svg width="160" height="28" viewBox="0 0 160 28" style="margin-bottom: 4px;">
            <path d="M 0 26 Q 80 -10, 160 26" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="10 6"/>
          </svg>
          <div style="position: absolute; right: -4px; bottom: 25px; width: 26px; height: 26px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; transform: rotate(120deg);">
            <svg style="width: 16px; height: 16px; color: #22c55e;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">1h 45m</div>
        </div>

        <!-- Arrival -->
        <div style="text-align: center; min-width: 60px;">
          <div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">CDG</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 4px;">
            <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49s7.12-1.9 16.57-4.43c.81-.23 1.28-1.05 1.07-1.85z"/>
            </svg>
            10:00
          </div>
          <div style="font-size: 12px; color: #6b7280;">Terminal 2F</div>
        </div>
      </div>

      <!-- Toggle Details Button -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <button style="display: flex; align-items: center; gap: 8px; background: none; border: none; color: #2163f6; font-weight: 600; font-size: 14px; cursor: pointer; padding: 0;">
          Mostra dettagli
          <svg style="width: 16px; height: 16px; transform: rotate(0deg); transition: transform 0.2s;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>

---

## Riepilogo Valori CSS Chiave

### Colori
- Primary blue: `#2163f6`
- Gray-400 (past flights): `#9ca3af`
- Green arc: `#22c55e`
- Text gray-800: `#1f2937`
- Text gray-500: `#6b7280`

### Dimensioni
- Card border-radius: `12px`
- Header padding: `16px`
- Body padding: `24px` (desktop), `16px` (mobile)
- Airport code font-size: `2rem` (desktop), `1.5rem` (mobile)
- Title font-size: `24px` (2xl desktop), `20px` (xl mobile)
- Arc width: `160px` (desktop), `60px` (mobile)
- Arc height: `28px`
- Plane circle: `26px`
- Plane rotation: `120deg`

### Arco SVG
- Dimensioni: `160x28px`
- Percorso: `M 0 26 Q 80 -10, 160 26`
- Stroke: `#22c55e`
- Stroke-width: `2`
- Stroke-dasharray: `10 6`

### Icona Aereo
- Posizione: absolute, right `-4px`, bottom `-9px`
- Cerchio bianco: `26px`, border-radius `50%`
- Box-shadow: `0 2px 4px rgba(0,0,0,0.1)`
- Transform: `rotate(120deg)`

---

## Dettagli Espandibili

Cliccando sul pulsante "Mostra dettagli", si espande una sezione con informazioni aggiuntive:

- **Booking reference** (codice di prenotazione)
- **Posto assegnato** (seat)
- **Bagaglio** (baggage allowance)
- **Numero biglietto** (ticket number)

### Gestione Multi-Passeggero

La visualizzazione dei dettagli si adatta al numero di passeggeri:

- **Singolo passeggero**: il ticket number viene mostrato a livello volo (campo `flight.ticketNumber`)
- **Multi-passeggero**: viene mostrata una lista dei passeggeri, ciascuno con il proprio nome e ticket number individuale (campo `passenger.ticketNumber`)

---

## Azioni Disponibili

### Traccia Volo

Il link del numero volo nell'header apre una ricerca Google con il numero del volo, permettendo all'utente di verificare rapidamente lo stato del volo in tempo reale, gate, ritardi e altre informazioni operative.

### Download PDF

Il pulsante per il download del PDF originale (la conferma di prenotazione caricata dall'utente) è disponibile nella sezione dettagli espandibile.

Il download avviene tramite un URL firmato generato da Supabase Storage, che garantisce l'accesso sicuro e temporaneo al file.

---

## Ordinamento

Le flight card sono ordinate secondo due criteri in sequenza:

1. **Data del volo** (crescente)
2. **Orario di partenza** (crescente), a parità di data
