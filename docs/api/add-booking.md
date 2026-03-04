# add-booking

Endpoint per aggiungere nuove prenotazioni (voli e/o hotel) a un viaggio esistente. Funziona in modo analogo a `process-pdf`, ma invece di creare un nuovo viaggio, arricchisce un viaggio gia presente con i dati estratti dai PDF.

## Specifiche

| Parametro | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/.netlify/functions/add-booking` |
| **Autenticazione** | JWT richiesto |
| **Timeout** | 26 secondi (esteso per elaborazione Claude API) |
| **Content-Type** | `application/json` |

## Richiesta

### Header

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Body

```json
{
  "tripId": "uuid-del-viaggio",
  "pdfs": [
    {
      "storagePath": "tmp/{userId}/{uniqueId}-new-flight.pdf",
      "filename": "new-flight.pdf"
    }
  ]
}
```

Come per `process-pdf`, i PDF devono essere gia stati caricati su Supabase Storage tramite `get-upload-url`. Il campo `tripId` identifica il viaggio a cui aggiungere le prenotazioni.

## Flusso di elaborazione

### 1. Autenticazione e validazione

Validazione del JWT e verifica che il `tripId` sia presente nel body della richiesta.

### 2. Recupero viaggio esistente

Il viaggio viene caricato dal database per ottenere i voli e gli hotel gia presenti. Questo e necessario per la fase di deduplicazione.

### 3. Download e elaborazione PDF con Claude API

I PDF vengono scaricati dallo storage temporaneo e analizzati con Claude API tramite il modulo condiviso `pdfProcessor.js`, con lo stesso meccanismo di batching di `process-pdf`.

### 4. Deduplicazione rispetto ai dati esistenti

I nuovi voli e hotel vengono confrontati con quelli gia presenti nel viaggio:

- **Voli duplicati**: stesso numero di volo e stessa data. Se il volo esiste gia, i passeggeri del nuovo PDF vengono aggregati a quelli esistenti.
- **Hotel duplicati**: stesso nome hotel e stesse date. Gli hotel duplicati vengono scartati.

### 5. Aggregazione passeggeri

Se un volo estratto dal nuovo PDF corrisponde a un volo gia presente nel viaggio, i nuovi passeggeri vengono aggiunti all'array `passengers` del volo esistente, evitando duplicati per nome.

### 6. Aggiunta nuovi voli e hotel

I voli e gli hotel che non risultano duplicati vengono accodati agli array `flights` e `hotels` del viaggio.

### 7. Ricalcolo date e rotta

Le date di inizio e fine viaggio e la rotta vengono ricalcolate tenendo conto delle nuove prenotazioni aggiunte.

### 8. Salvataggio nel database

Il JSON blob aggiornato viene salvato nella colonna `data` della tabella `trips`.

### 9. Spostamento PDF

I PDF vengono spostati dalla posizione temporanea al path definitivo del viaggio:

```
tmp/{userId}/{uniqueId}-{filename}  →  trips/{tripId}/{itemId}.pdf
```

## Risposta

### Successo (200)

```json
{
  "success": true,
  "tripData": {
    "title": "Tokyo, Osaka",
    "startDate": "2026-03-15",
    "endDate": "2026-03-28",
    "route": ["Tokyo", "Osaka"],
    "flights": [ ... ],
    "hotels": [ ... ]
  },
  "added": {
    "flights": 2,
    "hotels": 1
  },
  "skipped": {
    "flights": 0,
    "hotels": 1
  }
}
```

La risposta include i contatori `added` e `skipped` che permettono al frontend di comunicare all'utente quanti elementi sono stati effettivamente aggiunti e quanti sono stati scartati perche duplicati.

### Errori

| Codice | Condizione | Messaggio |
|--------|-----------|-----------|
| 400 | `tripId` mancante | `"tripId is required"` |
| 400 | Nessun PDF fornito | `"No PDFs provided"` |
| 400 | Nessun dato estratto | `"No data could be extracted from the uploaded PDFs"` |
| 401 | JWT mancante o non valido | `"Unauthorized"` |
| 404 | Viaggio non trovato | `"Trip not found"` |
| 429 | Rate limit API Claude | `"Rate limit exceeded, please try again later"` |
| 500 | Errore generico del server | `"Internal server error"` |

## Differenze rispetto a process-pdf

| Aspetto | process-pdf | add-booking |
|---------|-------------|-------------|
| **Risultato** | Crea un nuovo viaggio | Modifica un viaggio esistente |
| **Deduplicazione** | Solo tra i PDF caricati | Anche contro i dati gia presenti nel viaggio |
| **Passeggeri** | Costruisce array da zero | Aggrega con passeggeri esistenti |
| **Titolo** | Generato automaticamente | Non modificato |
| **Risposta** | `tripId` + `tripData` | `tripData` + contatori `added`/`skipped` |

## Note

- Se tutti i voli e hotel estratti risultano duplicati, l'endpoint restituisce comunque `success: true` con contatori `added` a zero. Non viene generato un errore.
- L'aggregazione dei passeggeri preserva il `ticketNumber` di ogni passeggero, utilizzando lo stesso pattern di fallback a tre livelli di `process-pdf`.
- Il modulo `pdfProcessor.js` e condiviso tra `process-pdf`, `add-booking` e il processamento delle email (`emailExtractor.js`), garantendo un comportamento uniforme nell'analisi dei PDF.
