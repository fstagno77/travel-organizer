# Tab Hotel - Documentazione Design

Questo documento descrive il design della scheda Hotel nel Travel Organizer.

## Section Header

La sezione header segue lo stesso pattern utilizzato per i voli:

```html
<div class="section-header">
  <h2 class="section-header-title">I miei hotel</h2>
  <div class="section-header-actions">
    <button class="section-header-cta btn btn-hotel">+ Aggiungi</button>
    <button class="section-header-cta btn btn-hotel-outline">✏ Modifica</button>
  </div>
</div>
```

I pulsanti hotel utilizzano il tema verde:
- `.btn-hotel`: background hotel-600 (`#2e9568`), testo bianco
- `.btn-hotel-outline`: background trasparente, bordo verde 1.5px, testo verde

### Anteprima Visiva - Section Header

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 20px; background: #f8f9fa;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin: 0;">I miei hotel</h2>
    <div style="display: flex; gap: 12px;">
      <button style="background: #2e9568; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;">+ Aggiungi</button>
      <button style="background: transparent; color: #2e9568; border: 1.5px solid #2e9568; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;">✏ Modifica</button>
    </div>
  </div>
</div>

---

## Hotel Card - Struttura Completa

### 1. Header
Header con background color smeraldo (`--color-hotel-600 #2e9568`), mostra la data di check-in formattata.

```css
.hotel-card-header {
  padding: 20px 16px;
  background: var(--color-hotel-600);
  color: white;
  border-radius: 16px 16px 0 0;
}
```

### 2. Body
Padding di 24px, contiene:

#### Name Section
Nome dell'hotel (font 2xl bold) + badge notti (background hotel-100 `#d1f5e4`, testo hotel-700 `#1a6844`, size xs, rounded).

```css
.hotel-name-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.hotel-nights-badge {
  background: var(--color-hotel-100);
  color: var(--color-hotel-700);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
```

#### Indirizzo
Icona pin mappa + indirizzo completo come link a Google Maps.

#### Griglia Check-in/Check-out
Due colonne, ognuna con:
- Container icona (background verde `hotel-50` per check-in, grigio `gray-100` per check-out)
- Icona calendario
- Label (maiuscolo xs, gray-500)
- Data (xl bold)
- Ora (sm gray-600)

```css
.hotel-checkin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}

.hotel-checkin-icon--in {
  background: var(--color-hotel-50);
  color: var(--color-hotel-600);
  /* #e8f8f0 bg, #2e9568 text */
}

.hotel-checkin-icon--out {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.hotel-checkin-date {
  font-size: 1.25rem;
  font-weight: 700;
}
```

### 3. Dettagli Espandibili
Pulsante toggle che espande per mostrare:
- **Griglia dettagli**: riferimento prenotazione + numero conferma (con pulsanti copia)
- **Tipo camera + numero ospiti**
- **Nome ospite**
- **Servizi**: badge con icone (wifi, colazione, parcheggio, piscina, ecc.)
- **Box prezzo**: label + valore
- **Pulsanti azione**: Voucher (verde primario), Modifica (verde outline), Elimina (danger)

```css
.hotel-btn--primary {
  background: var(--color-hotel-600);
  color: white;
  border: none;
}

.hotel-btn--outline {
  background: transparent;
  border: 1.5px solid var(--color-hotel-300);
  color: var(--color-hotel-600);
}

.hotel-btn--danger {
  background: transparent;
  border: 1.5px solid var(--color-danger);
  color: var(--color-danger);
}

.hotel-btn--danger:hover {
  background: var(--color-danger);
  color: white;
}
```

---

## CSS Completo

### Card Base
```css
.hotel-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.hotel-card-header {
  padding: 20px 16px;
  background: var(--color-hotel-600); /* #2e9568 */
  color: white;
  border-radius: 16px 16px 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.hotel-card-body {
  padding: 24px;
}
```

### Name & Badge
```css
.hotel-name-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.hotel-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-gray-900);
}

.hotel-nights-badge {
  background: var(--color-hotel-100); /* #d1f5e4 */
  color: var(--color-hotel-700); /* #1a6844 */
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
```

### Check-in/Check-out Grid
```css
.hotel-checkin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}

.hotel-checkin-item {
  display: flex;
  flex-direction: column;
}

.hotel-checkin-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.hotel-checkin-icon--in {
  background: var(--color-hotel-50); /* #e8f8f0 */
  color: var(--color-hotel-600); /* #2e9568 */
}

.hotel-checkin-icon--out {
  background: var(--color-gray-100); /* #f3f4f6 */
  color: var(--color-gray-600); /* #4b5563 */
}

.hotel-checkin-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-gray-500);
  margin-bottom: 4px;
  font-weight: 500;
}

.hotel-checkin-date {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-gray-900);
}

.hotel-checkin-time {
  font-size: 0.875rem;
  color: var(--color-gray-600);
  margin-top: 2px;
}
```

### Pulsanti
```css
.hotel-btn--primary {
  background: var(--color-hotel-600);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.hotel-btn--primary:hover {
  background: var(--color-hotel-700);
}

.hotel-btn--outline {
  background: transparent;
  border: 1.5px solid var(--color-hotel-300);
  color: var(--color-hotel-600);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.hotel-btn--outline:hover {
  background: var(--color-hotel-50);
}

.hotel-btn--danger {
  background: transparent;
  border: 1.5px solid var(--color-danger);
  color: var(--color-danger);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.hotel-btn--danger:hover {
  background: var(--color-danger);
  color: white;
}
```

---

## Responsive Mobile

Per schermi con `max-width: 575px`:

```css
@media (max-width: 575px) {
  .hotel-card-body {
    padding: 16px;
  }

  .hotel-checkin-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .hotel-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hotel-actions button {
    width: 100%;
  }
}
```

---

## Anteprima Visiva - Hotel Card Completa

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 20px; background: #f8f9fa;">
  <div style="background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 700px; margin: 0 auto;">
    <!-- Header -->
    <div style="padding: 20px 16px; background: #2e9568; color: white; border-radius: 16px 16px 0 0; font-size: 1rem; font-weight: 600;">
      Mercoledi, 11 Feb 2026
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      <!-- Name Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <h3 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin: 0;">Hotel Sakura Tokyo</h3>
        <span style="background: #d1f5e4; color: #1a6844; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; white-space: nowrap;">5 notti</span>
      </div>

      <!-- Address -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <svg style="width: 16px; height: 16px; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <a href="#" style="color: #2e9568; text-decoration: none; font-size: 0.875rem;">1-2-3 Ginza, Chuo-ku, Tokyo</a>
      </div>

      <!-- Check-in/Check-out Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px;">
        <!-- Check-in -->
        <div style="display: flex; flex-direction: column;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #e8f8f0; color: #2e9568; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; font-weight: 500;">CHECK-IN</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #1f2937;">11 Feb</div>
          <div style="font-size: 0.875rem; color: #4b5563; margin-top: 2px;">15:00</div>
        </div>

        <!-- Check-out -->
        <div style="display: flex; flex-direction: column;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; color: #4b5563; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; font-weight: 500;">CHECK-OUT</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #1f2937;">16 Feb</div>
          <div style="font-size: 0.875rem; color: #4b5563; margin-top: 2px;">11:00</div>
        </div>
      </div>

      <!-- Toggle Details Button -->
      <div style="margin-top: 24px; text-align: center;">
        <button style="background: transparent; border: none; color: #2e9568; font-size: 0.875rem; font-weight: 500; cursor: pointer; padding: 8px 0;">
          Mostra dettagli ▼
        </button>
      </div>
    </div>
  </div>
</div>

---

## Variabili CSS Colori

```css
:root {
  /* Hotel Green Theme */
  --color-hotel-50: #e8f8f0;
  --color-hotel-100: #d1f5e4;
  --color-hotel-300: #7dd4a8;
  --color-hotel-600: #2e9568;
  --color-hotel-700: #1a6844;

  /* Gray Scale */
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-900: #1f2937;

  /* Danger */
  --color-danger: #dc2626;
}
```

---

## Icone Servizi Hotel

Lista delle icone disponibili per i servizi (amenities):

- **WiFi**: `<svg>` icona wifi
- **Colazione**: `<svg>` icona utensili/tazza
- **Parcheggio**: `<svg>` icona auto
- **Piscina**: `<svg>` icona nuoto
- **Palestra**: `<svg>` icona dumbbell
- **Spa**: `<svg>` icona spa
- **Aria condizionata**: `<svg>` icona fiocco di neve
- **Animali ammessi**: `<svg>` icona zampa

Badge servizi:
```css
.hotel-amenity-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-hotel-50);
  color: var(--color-hotel-700);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}
```

---

## Note Implementative

1. **Calcolo notti**: La differenza tra check-out e check-in in giorni
2. **Formattazione data header**: Formato lungo italiano "Giorno, GG Mese AAAA"
3. **Link Google Maps**: `https://www.google.com/maps/search/?api=1&query={indirizzo}`
4. **Toggle dettagli**: Usa animazione slide-down con max-height transition
5. **Copia riferimenti**: Click su icona copia → tooltip "Copiato!" per 2 secondi
6. **Pulsante voucher**: Apre PDF voucher in nuova tab se disponibile
