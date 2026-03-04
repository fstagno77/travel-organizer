# Attivita'

Le attivita' sono elementi personalizzati creati manualmente dall'utente per arricchire il programma di viaggio. A differenza di voli e hotel, che vengono estratti automaticamente dai PDF, le attivita' vengono inserite tramite un pannello dedicato nel frontend.

## Schema

```json
{
  "id": "activity-1707300000000",
  "name": "Visita al Colosseo",
  "description": "Tour guidato del Colosseo e Foro Romano",
  "date": "2024-03-16",
  "startTime": "09:00",
  "endTime": "12:00",
  "category": "museo",
  "address": "Piazza del Colosseo, Roma",
  "urls": ["https://www.coopculture.it/..."],
  "attachments": [
    {
      "path": "tripId/activity-1707300000000-0.pdf",
      "filename": "biglietto-colosseo.pdf",
      "type": "pdf"
    }
  ],
  "location": {
    "lat": 41.8902,
    "lng": 12.4922
  }
}
```

## Campi nel dettaglio

### id

Identificativo univoco generato nel formato `activity-{timestamp}`, dove `timestamp` e' il valore di `Date.now()` al momento della creazione. Esempio: `activity-1707300000000`.

### name (obbligatorio)

Nome dell'attivita'. Lunghezza massima: **100 caratteri**. Questo e' un campo obbligatorio per la creazione di un'attivita'.

### description

Descrizione testuale dell'attivita'. Campo opzionale che permette di aggiungere dettagli, note o istruzioni.

### date (obbligatorio)

Data dell'attivita' in formato `YYYY-MM-DD`. Deve ricadere all'interno del periodo del viaggio (tra `startDate` e `endDate`). Questo e' un campo obbligatorio.

### startTime e endTime

Orari di inizio e fine in formato `HH:MM`. Entrambi sono **opzionali**. Nella tab Attivita' del viaggio, gli eventi senza orario vengono mostrati prima di quelli con orario all'interno dello stesso giorno.

### category

Categoria dell'attivita', usata per l'icona e la visualizzazione nel frontend. Le categorie disponibili sono:

| Categoria | Descrizione | Icona |
|---|---|---|
| `ristorante` | Ristoranti, pranzi, cene | Posate |
| `volo` | Trasferimenti aerei | Aereo |
| `hotel` | Soggiorni, alloggi | Edificio |
| `museo` | Musei, mostre, gallerie | Edificio classico |
| `attrazione` | Attrazioni turistiche, monumenti | Stella |
| `treno` | Trasferimenti in treno | Treno |
| `luogo` | Categoria generica (default) | Segnaposto |

La categoria viene **rilevata automaticamente** dal nome e dalla descrizione dell'attivita' tramite un sistema di keywords. Ad esempio:
- "Pranzo da Roscioli" viene categorizzato come `ristorante`
- "Museo Nazionale di Tokyo" viene categorizzato come `museo`
- "Shinkansen Tokyo-Kyoto" viene categorizzato come `treno`

L'utente puo' comunque sovrascrivere la categoria rilevata automaticamente.

### address

Indirizzo dell'attivita' come stringa libera. Campo opzionale.

### urls

Array di stringhe contenenti link utili relativi all'attivita' (sito web, pagina di prenotazione, mappa, ecc.). L'utente puo' aggiungere piu' URL.

### location

Oggetto con le coordinate geografiche:

| Campo | Tipo | Descrizione |
|---|---|---|
| `lat` | `number` | Latitudine |
| `lng` | `number` | Longitudine |

### attachments

Array di file allegati all'attivita'. Ogni allegato e' un oggetto con:

| Campo | Tipo | Descrizione |
|---|---|---|
| `path` | `string` | Percorso nel bucket Supabase Storage |
| `filename` | `string` | Nome originale del file |
| `type` | `string` | Tipo di file (estensione) |

## Limiti allegati

| Vincolo | Valore |
|---|---|
| Numero massimo di file per attivita' | **5** |
| Dimensione massima per file | **10 MB** |
| Formati accettati | PDF, JPEG, PNG, GIF, WebP |

## Storage

Gli allegati delle attivita' vengono salvati in un bucket Supabase Storage dedicato chiamato `activity-files`, **separato** dal bucket `trip-pdfs` usato per le carte d'imbarco e le conferme di prenotazione.

Il percorso di ogni file nel bucket segue il formato:
```
{tripId}/{activityId}-{indice}.{estensione}
```

Esempio: `abc123/activity-1707300000000-0.pdf`

Il bucket viene creato automaticamente al primo upload tramite la funzione `ensureActivityBucket()`, che utilizza la chiave service role di Supabase.

Le funzioni di storage dedicate sono:
- `uploadActivityFile()` — carica un file nel bucket `activity-files`
- `deleteActivityFile()` — rimuove un file dal bucket `activity-files`

## Backend

Tutte le operazioni CRUD sulle attivita' sono gestite da una singola Netlify Function: `manage-activity.js`. Il tipo di operazione viene specificato tramite il campo `action` nella richiesta:

| Azione | Descrizione |
|---|---|
| `create` | Crea una nuova attivita' |
| `update` | Aggiorna un'attivita' esistente |
| `delete` | Elimina un'attivita' e i suoi allegati |
| `get-url` | Genera un URL firmato per scaricare un allegato |

## Visualizzazione nella tab Attivita'

Le attivita' personalizzate vengono mostrate nella tab "Attivita'" del viaggio, insieme agli eventi generati automaticamente da voli e hotel. La tab presenta una vista giorno per giorno dell'intero periodo del viaggio.

L'ordinamento degli eventi all'interno di ogni giorno segue queste regole:
1. Eventi senza orario vengono mostrati **prima** di quelli con orario
2. Gli eventi con orario sono ordinati cronologicamente
3. A parita' di orario, l'ordine segue la priorita' per tipo:
   - Check-out hotel: priorita' 0 (primo)
   - Volo: priorita' 1
   - Check-in hotel: priorita' 2
   - Soggiorno hotel: priorita' 3
   - Attivita' personalizzata: priorita' 4 (ultimo)

## Interfaccia utente

Le attivita' vengono create e modificate tramite un **pannello slide-in** che scorre da destra:
- Larghezza: **420px** su desktop
- Larghezza: **100%** su mobile
- Tre modalita': creazione (form vuoto), visualizzazione (sola lettura), modifica (form con dati esistenti)

Il pannello si sovrappone alla pagina tramite un overlay (`.slide-panel-overlay` / `.slide-panel`).
