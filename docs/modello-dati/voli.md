# Voli (Flights)

I voli rappresentano il modello dati piu' complesso di Travel Organizer, principalmente a causa del **modello duale passeggero** e della gestione del `ticketNumber` su piu' livelli.

## Schema completo

```json
{
  "date": "YYYY-MM-DD",
  "flightNumber": "AZ1234",
  "airline": "ITA Airways",
  "operatedBy": "Nome compagnia o null",
  "departure": {
    "code": "FCO",
    "city": "Roma",
    "airport": "Fiumicino",
    "terminal": "1"
  },
  "arrival": {
    "code": "NRT",
    "city": "Tokyo",
    "airport": "Narita",
    "terminal": "2"
  },
  "departureTime": "10:30",
  "arrivalTime": "06:45",
  "arrivalNextDay": true,
  "duration": "12:15",
  "class": "Economy",
  "bookingReference": "ABC123",
  "ticketNumber": "055 1234567890",
  "seat": "24A",
  "baggage": "1PC",
  "status": "OK",
  "passenger": {
    "name": "MARIO ROSSI",
    "type": "ADT",
    "ticketNumber": "055 1234567890"
  },
  "passengers": [
    {
      "name": "MARIO ROSSI",
      "type": "ADT",
      "ticketNumber": "055 1234567890",
      "pdfPath": "trips/uuid/file.pdf"
    },
    {
      "name": "LUCIA ROSSI",
      "type": "ADT",
      "ticketNumber": "055 0987654321",
      "pdfPath": "trips/uuid/file2.pdf"
    }
  ],
  "booking": {
    "reference": "ABC123",
    "ticketNumber": "055 1234567890",
    "issueDate": "2024-01-15",
    "totalAmount": {
      "value": 450.00,
      "currency": "EUR"
    }
  },
  "pdfPath": "trips/uuid/itemId.pdf"
}
```

## Campi nel dettaglio

### Informazioni volo

| Campo | Tipo | Descrizione |
|---|---|---|
| `date` | `string` | Data del volo in formato `YYYY-MM-DD` |
| `flightNumber` | `string` | Codice volo (es. `AZ1234`) |
| `airline` | `string` | Nome della compagnia aerea |
| `operatedBy` | `string \| null` | Compagnia che opera il volo (se diversa da `airline`, in caso di code-sharing) |
| `departureTime` | `string` | Orario di partenza in formato `HH:MM` |
| `arrivalTime` | `string` | Orario di arrivo in formato `HH:MM` |
| `arrivalNextDay` | `boolean` | `true` se l'arrivo e' il giorno successivo alla partenza |
| `duration` | `string` | Durata del volo in formato `HH:MM` |
| `class` | `string` | Classe di viaggio (Economy, Business, First, ecc.) |
| `seat` | `string` | Numero del posto assegnato |
| `baggage` | `string` | Franchigia bagaglio (es. `1PC` = 1 bagaglio da stiva) |
| `status` | `string` | Stato della prenotazione (tipicamente `OK`) |

### Aeroporti (departure / arrival)

| Campo | Tipo | Descrizione |
|---|---|---|
| `code` | `string` | Codice IATA dell'aeroporto (3 lettere) |
| `city` | `string` | Nome della citta' |
| `airport` | `string` | Nome dell'aeroporto |
| `terminal` | `string` | Terminal (se disponibile) |

### Prenotazione (booking)

| Campo | Tipo | Descrizione |
|---|---|---|
| `reference` | `string` | Codice PNR della prenotazione |
| `ticketNumber` | `string` | Numero di biglietto a livello di prenotazione |
| `issueDate` | `string` | Data di emissione del biglietto |
| `totalAmount` | `object` | Prezzo totale con `value` (numero) e `currency` (stringa) |

### pdfPath

Percorso del file PDF sorgente nello storage Supabase, nel formato `trips/{tripId}/{itemId}.pdf`. Utilizzato per consentire all'utente di visualizzare il documento originale.

## Modello duale passeggero

Questa e' la caratteristica piu' importante (e delicata) del modello voli. Esistono due campi per rappresentare i passeggeri:

### `passenger` (singolare)

Oggetto proveniente direttamente dal parsing di Claude. Rappresenta il singolo passeggero estratto da un PDF:

```json
{
  "name": "MARIO ROSSI",
  "type": "ADT",
  "ticketNumber": "055 1234567890"
}
```

Il campo `type` indica la tipologia del passeggero:
- `ADT` — Adulto
- `CHD` — Bambino
- `INF` — Neonato

### `passengers` (plurale)

Array costruito aggregando i dati provenienti da piu' PDF dello stesso volo. Ogni elemento contiene anche il `pdfPath` che indica da quale documento e' stato estratto:

```json
[
  {
    "name": "MARIO ROSSI",
    "type": "ADT",
    "ticketNumber": "055 1234567890",
    "pdfPath": "trips/uuid/file.pdf"
  },
  {
    "name": "LUCIA ROSSI",
    "type": "ADT",
    "ticketNumber": "055 0987654321",
    "pdfPath": "trips/uuid/file2.pdf"
  }
]
```

### Adattamento del frontend

Il frontend si adatta automaticamente in base alla struttura dei dati:

- **Vista singolo passeggero**: quando e' presente solo `passenger` (o `passengers` ha un solo elemento), viene mostrata una vista compatta con il nome del passeggero e il numero di biglietto del volo (`flight.ticketNumber`).
- **Vista multi-passeggero**: quando `passengers` contiene piu' elementi, viene mostrata una lista con i dettagli di ciascun passeggero, ognuno con il proprio `ticketNumber` (`p.ticketNumber`).

## ticketNumber a 3 livelli

Il numero di biglietto puo' essere presente a tre livelli diversi nell'oggetto volo. Questo riflette la struttura eterogenea dei diversi tipi di documenti di viaggio (carte d'imbarco, conferme di prenotazione, ricevute):

| Livello | Campo | Fonte |
|---|---|---|
| 1. Volo | `flight.ticketNumber` | Estratto dal volo stesso |
| 2. Passeggero | `flight.passenger.ticketNumber` | Estratto dal passeggero singolo |
| 3. Prenotazione | `flight.booking.ticketNumber` | Estratto dalla prenotazione |

### Fallback critico

Quando si costruisce l'array `passengers` a partire dal campo `passenger` singolare, e' **fondamentale** applicare un fallback per il `ticketNumber`:

```js
{
  ...flight.passenger,
  ticketNumber: flight.passenger.ticketNumber || flight.ticketNumber || null
}
```

Questo garantisce che il numero di biglietto sia sempre presente nell'array `passengers`, anche quando il parsing di Claude lo ha estratto a livello di volo anziche' a livello di passeggero.

Inoltre, quando l'array `passengers` esiste gia' ma alcune voci non hanno il `ticketNumber`, viene eseguito un backfill che tenta di recuperare il valore dal livello volo.

::: warning Nota storica
Questo fallback e' stato introdotto per correggere un bug (risolto il 2026-02-07) in cui i passeggeri nell'array `passengers` potevano ritrovarsi senza `ticketNumber`, causando problemi nella visualizzazione del frontend.
:::

## Marcatore temporaneo `_pdfIndex`

Durante il processing dei PDF, viene assegnato un campo `_pdfIndex` ai passeggeri per collegare ciascuno al proprio PDF sorgente. Questo marcatore e' **strettamente temporaneo** e viene rimosso prima del salvataggio nel database.

Non deve mai apparire nei dati persistiti. Se dovesse essere presente, indica un bug nel processo di pulizia.

## Deduplicazione voli

Quando vengono caricati piu' PDF che contengono informazioni sullo stesso volo (es. carte d'imbarco di passeggeri diversi), il sistema effettua una deduplicazione basata sulla combinazione di:

- `bookingReference` — codice PNR
- `flightNumber` — numero del volo
- `date` — data del volo

Se tutti e tre i campi corrispondono, i dati dei passeggeri vengono aggregati nell'array `passengers` del volo esistente anziche' creare un volo duplicato.
