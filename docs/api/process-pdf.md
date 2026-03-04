# process-pdf

Endpoint principale per la creazione di un nuovo viaggio a partire da uno o piu PDF di prenotazione. I PDF vengono analizzati dall'intelligenza artificiale (Claude API) che estrae automaticamente tutti i dati di voli e hotel.

## Specifiche

| Parametro | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/.netlify/functions/process-pdf` |
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
  "pdfs": [
    {
      "storagePath": "tmp/{userId}/{uniqueId}-boarding-pass.pdf",
      "filename": "boarding-pass.pdf"
    },
    {
      "storagePath": "tmp/{userId}/{uniqueId}-hotel-receipt.pdf",
      "filename": "hotel-receipt.pdf"
    }
  ]
}
```

I PDF devono essere gia stati caricati su Supabase Storage tramite l'endpoint `get-upload-url` prima di chiamare questo endpoint. Il campo `storagePath` corrisponde al path temporaneo restituito da `get-upload-url`.

## Flusso di elaborazione

Il processo si articola in 12 fasi sequenziali:

### 1. Autenticazione utente

Validazione del JWT dall'header `Authorization`. Creazione del client Supabase con il contesto dell'utente.

### 2. Download PDF dallo storage temporaneo

I file vengono scaricati dal bucket `trip-pdfs` utilizzando i path temporanei forniti nella richiesta (`tmp/{userId}/{uniqueId}-{filename}`).

### 3. Rilevamento tipo documento

Il tipo di documento viene dedotto dal nome del file (boarding pass, conferma hotel, ricevuta, ecc.) per ottimizzare il prompt inviato a Claude.

### 4. Elaborazione con Claude API

I PDF vengono inviati all'API di Claude come documenti base64. Il modulo condiviso `pdfProcessor.js` gestisce il batching:

- **1 PDF** -- Singola chiamata API
- **2+ PDF** -- Batch di 2 PDF per chiamata, elaborati sequenzialmente
- **Fallback** -- Se un batch fallisce, i PDF del batch vengono rielaborati singolarmente

Questo approccio riduce significativamente il numero di chiamate API e il rischio di rate limiting.

### 5. Parsing risposta JSON

La risposta di Claude viene analizzata per estrarre i dati strutturati di voli e hotel. Viene inoltre verificato il `stop_reason`: se e `max_tokens`, la risposta e stata troncata e viene segnalato un errore.

### 6. Deduplicazione voli e hotel

I voli e gli hotel estratti da piu PDF vengono deduplicati confrontando i campi chiave:

- **Voli**: numero volo, data, aeroporti di partenza e arrivo
- **Hotel**: nome hotel, date check-in e check-out

### 7. Costruzione array passeggeri

Per ogni volo viene costruito l'array `passengers` a partire dal campo singolare `passenger`. Il `ticketNumber` viene assegnato con fallback a tre livelli:

```js
{
  ...flight.passenger,
  ticketNumber: flight.passenger.ticketNumber || flight.ticketNumber || null
}
```

Questo pattern risolve il problema dei PDF che riportano il numero di biglietto solo a livello di volo e non del singolo passeggero.

### 8. Calcolo date viaggio

Le date di inizio e fine viaggio vengono calcolate automaticamente come la data piu anticipata e la data piu recente tra tutti i voli e hotel.

### 9. Calcolo rotta

La rotta del viaggio viene determinata analizzando le citta di destinazione dei voli, escludendo la citta di partenza (primo aeroporto di partenza).

### 10. Generazione titolo viaggio

Il titolo viene generato automaticamente a partire dalle citta di destinazione. Se il viaggio ha una sola destinazione, il titolo sara il nome della citta; con piu destinazioni, verranno elencate separate da virgola.

### 11. Creazione record nel database

Il record del viaggio viene inserito nella tabella `trips` di Supabase con tutti i dati estratti salvati come JSON blob nella colonna `data`.

### 12. Spostamento PDF e pulizia

I PDF vengono spostati dalla posizione temporanea al path definitivo:

```
tmp/{userId}/{uniqueId}-{filename}  →  trips/{tripId}/{itemId}.pdf
```

I file temporanei vengono eliminati al termine dell'operazione.

## Risposta

### Successo (200)

```json
{
  "success": true,
  "tripId": "uuid-del-viaggio",
  "tripData": {
    "title": "Tokyo, Osaka",
    "startDate": "2026-03-15",
    "endDate": "2026-03-28",
    "route": ["Tokyo", "Osaka"],
    "flights": [ ... ],
    "hotels": [ ... ]
  }
}
```

### Errori

| Codice | Condizione | Messaggio |
|--------|-----------|-----------|
| 400 | Nessun PDF fornito | `"No PDFs provided"` |
| 400 | Nessun dato estratto | `"No data could be extracted from the uploaded PDFs"` |
| 401 | JWT mancante o non valido | `"Unauthorized"` |
| 429 | Rate limit API Claude | `"Rate limit exceeded, please try again later"` |
| 500 | Errore generico del server | `"Internal server error"` |

## Note

- Il timeout di 26 secondi e configurato nel `netlify.toml` ed e necessario perche l'analisi di piu PDF con Claude puo richiedere diversi secondi per batch.
- Il marcatore temporaneo `_pdfIndex` viene utilizzato internamente per collegare i passeggeri al PDF di origine, ma viene rimosso prima del salvataggio nel database.
- In caso di errore durante lo spostamento dei PDF, il viaggio viene comunque creato nel database; i PDF rimarranno nella posizione temporanea fino alla pulizia periodica.
