# Viaggio (Trip)

Il viaggio e' l'entita' principale di Travel Organizer. Tutti i dati di un viaggio vengono salvati come blob JSONB nella colonna `data` della tabella `trips` su Supabase.

## Schema

```json
{
  "id": "uuid",
  "title": { "it": "Titolo italiano", "en": "English title" },
  "destination": "Nome destinazione",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "route": "FCO → NRT → KIX → FCO",
  "coverPhoto": {
    "url": "https://...",
    "isCustom": true,
    "attribution": "Photographer name o null"
  },
  "flights": [],
  "hotels": [],
  "activities": []
}
```

## Campi nel dettaglio

### id

Identificativo univoco in formato UUID, generato automaticamente da Supabase al momento della creazione del record nella tabella `trips`.

### title

Oggetto bilingue con due chiavi:

- `it` — titolo in italiano
- `en` — titolo in inglese

Il titolo viene generato automaticamente da Claude durante il parsing del primo PDF caricato. L'utente puo' successivamente modificarlo manualmente.

### destination

Stringa che rappresenta la destinazione principale del viaggio. Viene determinata da Claude analizzando i documenti caricati.

### startDate e endDate

Date di inizio e fine viaggio in formato `YYYY-MM-DD`. Vengono calcolate automaticamente a partire dalla data piu' vecchia e dalla data piu' recente trovate tra tutti i voli e gli hotel del viaggio.

Ad esempio, se un viaggio contiene:
- Un volo di andata il `2024-03-15`
- Un hotel con check-out il `2024-03-20`
- Un volo di ritorno il `2024-03-20`

Allora `startDate` sara' `2024-03-15` e `endDate` sara' `2024-03-20`.

Questi valori vengono ricalcolati ogni volta che si aggiunge o rimuove una prenotazione.

### route

Stringa che descrive il percorso del viaggio, calcolata automaticamente concatenando i codici IATA degli aeroporti di partenza e arrivo di tutti i voli.

Esempio: `FCO → NRT → KIX → FCO` indica un viaggio Roma Fiumicino - Tokyo Narita - Osaka Kansai - Roma Fiumicino.

### coverPhoto

Oggetto che rappresenta l'immagine di copertina del viaggio:

| Campo | Tipo | Descrizione |
|---|---|---|
| `url` | `string` | URL dell'immagine |
| `isCustom` | `boolean` | `true` se caricata dall'utente, `false` se da Unsplash |
| `attribution` | `string \| null` | Nome del fotografo (obbligatorio per Unsplash, `null` per upload custom) |

L'immagine puo' provenire da due fonti:
- **Unsplash**: selezionata automaticamente in base alla destinazione, con attribuzione obbligatoria al fotografo
- **Upload custom**: caricata direttamente dall'utente

### flights

Array di oggetti volo. Vedi la documentazione dettagliata in [Voli](./voli.md).

### hotels

Array di oggetti hotel. Vedi la documentazione dettagliata in [Hotel](./hotel.md).

### activities

Array di attivita' personalizzate create dall'utente. Vedi la documentazione dettagliata in [Attivita'](./attivita.md).

## Ciclo di vita

Un viaggio attraversa le seguenti fasi:

1. **Creazione** — Tramite `process-pdf.js`: l'utente carica uno o piu' PDF (carte d'imbarco, conferme hotel, ecc.) e Claude li analizza per estrarre i dati del viaggio. Viene creato un nuovo record nella tabella `trips`.

2. **Aggiornamento** — Tramite `add-booking.js`: l'utente carica PDF aggiuntivi per aggiungere voli, hotel o altre prenotazioni al viaggio esistente. I dati vengono fusi con quelli gia' presenti, le date vengono ricalcolate e la rotta aggiornata.

3. **Modifica** — Tramite `edit-booking`: l'utente puo' modificare manualmente i dettagli del viaggio (titolo, copertina, ecc.).

4. **Eliminazione** — Tramite `delete-trip`: il viaggio e tutti i file associati (PDF, allegati attivita') vengono rimossi definitivamente.

## Tabella Supabase

La tabella `trips` ha la seguente struttura:

| Colonna | Tipo | Descrizione |
|---|---|---|
| `id` | `uuid` | Chiave primaria |
| `user_id` | `uuid` | Riferimento all'utente proprietario |
| `data` | `jsonb` | Blob JSON contenente tutti i dati del viaggio |
| `created_at` | `timestamptz` | Data di creazione |
| `updated_at` | `timestamptz` | Data di ultimo aggiornamento |

Tutti i dati descritti in questa pagina risiedono all'interno della colonna `data`.
