# Hotel

Gli hotel rappresentano le prenotazioni alberghiere all'interno di un viaggio. I dati vengono estratti automaticamente dai PDF caricati (conferme di prenotazione, ricevute) tramite il parsing di Claude.

## Schema completo

```json
{
  "name": "Hotel Grand Palace",
  "address": {
    "street": "Via Roma 1",
    "district": "Centro storico",
    "city": "Roma",
    "postalCode": "00100",
    "country": "Italia",
    "fullAddress": "Via Roma 1, 00100 Roma, Italia"
  },
  "coordinates": {
    "lat": 41.9028,
    "lng": 12.4964
  },
  "phone": "+39 06 12345678",
  "checkIn": {
    "date": "2024-03-15",
    "time": "15:00"
  },
  "checkOut": {
    "date": "2024-03-18",
    "time": "11:00"
  },
  "nights": 3,
  "rooms": 1,
  "roomTypes": [
    { "it": "Camera Doppia", "en": "Double Room" }
  ],
  "guests": {
    "adults": 2,
    "children": [{ "age": 5 }],
    "total": 3
  },
  "guestName": "Mario Rossi",
  "confirmationNumber": "1234567890",
  "pinCode": "1234",
  "price": {
    "room": { "value": 150.00, "currency": "EUR" },
    "tax": { "value": 30.00, "currency": "EUR" },
    "total": { "value": 480.00, "currency": "EUR" }
  },
  "breakfast": {
    "included": true,
    "type": "Buffet"
  },
  "bedTypes": "1 letto matrimoniale",
  "payment": {
    "method": "Pay at property",
    "prepayment": false
  },
  "cancellation": {
    "freeCancellationUntil": "2024-03-10T23:59:00",
    "penaltyAfter": { "value": 150.00, "currency": "EUR" }
  },
  "amenities": ["WiFi", "Piscina", "Parcheggio"],
  "source": "Booking.com",
  "pdfPath": "trips/uuid/itemId.pdf"
}
```

## Campi nel dettaglio

### Informazioni struttura

| Campo | Tipo | Descrizione |
|---|---|---|
| `name` | `string` | Nome dell'hotel |
| `phone` | `string` | Numero di telefono della struttura |
| `source` | `string` | Piattaforma di prenotazione (es. Booking.com, Expedia) |
| `confirmationNumber` | `string` | Numero di conferma della prenotazione |
| `pinCode` | `string` | Codice PIN (usato da alcune piattaforme come Booking.com) |

### Indirizzo (address)

| Campo | Tipo | Descrizione |
|---|---|---|
| `street` | `string` | Via e numero civico |
| `district` | `string` | Quartiere o zona |
| `city` | `string` | Citta' |
| `postalCode` | `string` | Codice postale |
| `country` | `string` | Paese |
| `fullAddress` | `string` | Indirizzo completo formattato in una singola stringa |

### Coordinate (coordinates)

| Campo | Tipo | Descrizione |
|---|---|---|
| `lat` | `number` | Latitudine |
| `lng` | `number` | Longitudine |

Le coordinate vengono utilizzate nel frontend per generare link diretti a Google Maps, permettendo all'utente di aprire la posizione dell'hotel nell'app di navigazione.

### Date soggiorno (checkIn / checkOut)

| Campo | Tipo | Descrizione |
|---|---|---|
| `date` | `string` | Data in formato `YYYY-MM-DD` |
| `time` | `string` | Orario in formato `HH:MM` |

Il campo `nights` viene calcolato come differenza in giorni tra `checkOut.date` e `checkIn.date`.

### Camere e tipologia (rooms / roomTypes)

| Campo | Tipo | Descrizione |
|---|---|---|
| `rooms` | `number` | Numero di camere prenotate |
| `roomTypes` | `array` | Array di oggetti bilingue `{it, en}` con il tipo di camera |

Ogni elemento di `roomTypes` contiene la traduzione italiana e inglese del tipo di camera, coerentemente con l'approccio bilingue usato anche per il titolo del viaggio.

### Ospiti (guests)

| Campo | Tipo | Descrizione |
|---|---|---|
| `adults` | `number` | Numero di adulti |
| `children` | `array` | Array di oggetti con campo `age` per ogni bambino |
| `total` | `number` | Numero totale di ospiti |

Il campo `guestName` contiene il nome dell'intestatario della prenotazione.

### Prezzi (price)

La struttura dei prezzi e' organizzata su tre livelli:

| Campo | Tipo | Descrizione |
|---|---|---|
| `price.room` | `object` | Costo della camera (per notte o totale, a seconda della fonte) |
| `price.tax` | `object` | Tasse e contributi (tassa di soggiorno, IVA, ecc.) |
| `price.total` | `object` | Prezzo totale comprensivo di tutto |

Ogni livello contiene:
- `value` — importo numerico
- `currency` — codice valuta ISO 4217 (es. `EUR`, `USD`, `JPY`)

### Colazione (breakfast)

| Campo | Tipo | Descrizione |
|---|---|---|
| `included` | `boolean` | `true` se la colazione e' inclusa nel prezzo |
| `type` | `string` | Tipologia di colazione (es. Buffet, Continentale) |

### Letti (bedTypes)

Stringa che descrive la configurazione dei letti nella camera. Esempi:
- `"1 letto matrimoniale"`
- `"2 letti singoli"`
- `"1 letto king size + 1 divano letto"`

### Pagamento (payment)

| Campo | Tipo | Descrizione |
|---|---|---|
| `method` | `string` | Metodo di pagamento (es. "Pay at property", "Prepaid") |
| `prepayment` | `boolean` | `true` se e' richiesto il pagamento anticipato |

### Cancellazione (cancellation)

| Campo | Tipo | Descrizione |
|---|---|---|
| `freeCancellationUntil` | `string` | Data e ora limite per la cancellazione gratuita (formato ISO 8601) |
| `penaltyAfter` | `object` | Penale da pagare dopo la data limite, con `value` e `currency` |

### Servizi (amenities)

Array di stringhe che elenca i servizi disponibili nella struttura. Nel frontend vengono visualizzati come badge.

Esempi comuni:
- `WiFi`
- `Piscina`
- `Parcheggio`
- `Palestra`
- `Spa`
- `Ristorante`
- `Aria condizionata`

### pdfPath

Percorso del file PDF sorgente nello storage Supabase, nel formato `trips/{tripId}/{itemId}.pdf`. Utilizzato per permettere all'utente di consultare il documento originale della prenotazione.

## Deduplicazione

Quando vengono caricati piu' PDF relativi allo stesso hotel (es. conferma di prenotazione e ricevuta di pagamento), il sistema effettua una deduplicazione per evitare duplicati.

La deduplicazione avviene in due fasi:

1. **Per `confirmationNumber`**: confronto case-insensitive del numero di conferma. Se due hotel hanno lo stesso numero di conferma, vengono considerati lo stesso hotel e i dati vengono fusi.

2. **Fallback su campi multipli**: se il `confirmationNumber` non e' disponibile, il sistema confronta la combinazione di:
   - `name` — nome dell'hotel
   - `checkIn.date` — data di check-in
   - `checkOut.date` — data di check-out

   Se tutti e tre corrispondono, gli hotel vengono considerati duplicati.

In caso di fusione, i campi del nuovo PDF sovrascrivono quelli esistenti solo se contengono informazioni piu' complete.
