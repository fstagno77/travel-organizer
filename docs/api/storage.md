# Storage

Travel Organizer utilizza Supabase Storage per l'archiviazione di tutti i file caricati dagli utenti: PDF di prenotazioni, allegati delle attivita e foto di copertina dei viaggi. I file sono organizzati in tre bucket separati, ciascuno con regole di accesso e limiti specifici.

## Bucket

### trip-pdfs

Bucket principale per i PDF di prenotazioni voli e hotel caricati dagli utenti.

| Parametro | Valore |
|-----------|--------|
| **Scopo** | PDF di prenotazioni voli e hotel |
| **Dimensione massima file** | 10 MB |
| **MIME type** | `application/pdf` |
| **Accesso** | Privato (richiede URL firmati) |
| **Scadenza URL firmato** | 1 ora (default) |

**Struttura dei path:**

```
trip-pdfs/
  trips/{tripId}/{itemId}.pdf          # PDF definitivi associati a un viaggio
  pending/{pendingBookingId}/attachment.pdf  # PDF da prenotazioni pendenti (email)
  tmp/{userId}/{uniqueId}-{filename}   # PDF temporanei in attesa di elaborazione
```

- **`trips/`** -- Path definitivo dopo l'elaborazione. Ogni PDF viene rinominato con l'ID dell'elemento (volo o hotel) a cui si riferisce.
- **`pending/`** -- PDF estratti dalle email inoltrate, in attesa che l'utente li confermi come prenotazioni.
- **`tmp/`** -- Area temporanea per i PDF appena caricati tramite `get-upload-url`, prima che vengano elaborati da `process-pdf` o `add-booking`.

### activity-files

Bucket per gli allegati delle attivita personalizzate: biglietti, ricevute, foto, documenti.

| Parametro | Valore |
|-----------|--------|
| **Scopo** | Allegati attivita custom (biglietti, ricevute, foto) |
| **Dimensione massima file** | 10 MB |
| **Allegati massimi per attivita** | 5 |
| **MIME type** | PDF, JPEG, PNG, GIF, WebP |
| **Accesso** | Privato (richiede URL firmati) |

**Struttura dei path:**

```
activity-files/
  {tripId}/{activityId}-{indice}.{estensione}
```

Esempio: `activity-files/abc123/activity-x1y2z3-0.pdf`

L'indice numerico (`0`, `1`, `2`, ...) identifica la posizione dell'allegato nell'array `attachments` dell'attivita.

::: info Creazione automatica
Il bucket `activity-files` viene creato automaticamente al primo upload tramite la funzione `ensureActivityBucket()`. Questa funzione utilizza il client Supabase con **service role key** per verificare l'esistenza del bucket e crearlo se necessario, poiche la creazione di bucket richiede privilegi amministrativi.
:::

### city-photos

Bucket per le foto personalizzate delle copertine dei viaggi.

| Parametro | Valore |
|-----------|--------|
| **Scopo** | Foto personalizzate delle copertine viaggio |
| **Dimensione massima file** | 2 MB |
| **MIME type** | JPEG, PNG, WebP |
| **Accesso** | Privato (richiede URL firmati) |

**Struttura dei path:**

```
city-photos/
  trips/{tripId}/{timestamp}.{jpg|png|webp}
```

Il timestamp nel nome del file garantisce l'univocita e previene problemi di cache del browser quando la foto viene aggiornata.

## Flusso upload diretto

I file non vengono inviati direttamente alle Netlify Functions (che hanno limiti stringenti sulla dimensione del body). Viene invece utilizzato un flusso di upload diretto su Supabase Storage tramite URL firmati.

```
Frontend                    Backend                     Supabase Storage
   │                           │                              │
   │  1. POST get-upload-url   │                              │
   │ ─────────────────────────>│                              │
   │                           │  Genera URL firmato          │
   │                           │  per path tmp/               │
   │  { uploadUrl, storagePath }                              │
   │ <─────────────────────────│                              │
   │                           │                              │
   │  2. PUT uploadUrl + file  │                              │
   │ ─────────────────────────────────────────────────────────>│
   │                           │                    Salva in tmp/
   │  200 OK                   │                              │
   │ <─────────────────────────────────────────────────────────│
   │                           │                              │
   │  3. POST process-pdf      │                              │
   │     { storagePath }       │                              │
   │ ─────────────────────────>│                              │
   │                           │  4. Download da tmp/         │
   │                           │ ────────────────────────────>│
   │                           │                              │
   │                           │  5. Elaborazione Claude      │
   │                           │                              │
   │                           │  6. Sposta tmp/ → trips/     │
   │                           │ ────────────────────────────>│
   │                           │                              │
   │                           │  7. Elimina tmp/             │
   │                           │ ────────────────────────────>│
   │                           │                              │
   │  { success, tripData }    │                              │
   │ <─────────────────────────│                              │
```

### Dettaglio dei passaggi

1. **Richiesta URL firmato** -- Il frontend chiama `POST get-upload-url` specificando il nome del file e il MIME type. Il backend genera un URL firmato per un path temporaneo `tmp/{userId}/{uniqueId}-{filename}`.

2. **Upload diretto** -- Il frontend carica il file direttamente su Supabase Storage utilizzando l'URL firmato, senza passare per le Netlify Functions. Questo bypassa il limite di dimensione del body delle funzioni serverless.

3. **Invio riferimento** -- Il frontend invia lo `storagePath` restituito al punto 1 a `process-pdf` o `add-booking` come riferimento al file gia caricato.

4. **Download interno** -- Il backend scarica il file dalla posizione temporanea utilizzando il client Supabase con service role key.

5. **Elaborazione** -- Il file viene elaborato (analisi Claude per i PDF, ridimensionamento per le foto).

6. **Spostamento definitivo** -- Il file viene copiato dalla posizione temporanea al path definitivo nel bucket appropriato.

7. **Pulizia** -- Il file temporaneo viene eliminato dalla directory `tmp/`.

## URL firmati

Tutti i bucket sono privati. L'accesso ai file avviene esclusivamente tramite URL firmati (signed URLs) generati dal backend.

| Endpoint | Bucket | Scopo |
|----------|--------|-------|
| `get-pdf-url` | `trip-pdfs` | Download PDF prenotazione |
| `manage-activity` (action: `get-url`) | `activity-files` | Download allegato attivita |
| `get-upload-url` | `trip-pdfs` | Upload PDF (area temporanea) |

Gli URL firmati hanno una scadenza predefinita di **1 ora**, sufficiente per il download o la visualizzazione del file nel browser. Dopo la scadenza, e necessario richiedere un nuovo URL.

## Sicurezza

- **Row Level Security** -- Le policy RLS di Supabase garantiscono che ogni utente possa accedere solo ai propri file. Il client inizializzato con il JWT dell'utente applica automaticamente queste restrizioni.
- **Service role** -- Utilizzato solo per operazioni amministrative (creazione bucket, spostamento file tra path, elaborazione webhook email).
- **Nessun accesso pubblico** -- I bucket non hanno policy di accesso pubblico. Anche i viaggi condivisi utilizzano l'endpoint `get-shared-trip` per servire i dati, senza esporre direttamente i file di storage.
