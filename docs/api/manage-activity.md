# manage-activity

Endpoint unico per la gestione delle attivita personalizzate all'interno di un viaggio. Utilizza un parametro `action` per determinare l'operazione da eseguire: creazione, modifica, eliminazione o generazione di URL firmati per gli allegati.

## Specifiche

| Parametro | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/.netlify/functions/manage-activity` |
| **Autenticazione** | JWT richiesto |
| **Timeout** | 10 secondi |
| **Content-Type** | `application/json` |

## Header

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

## Azioni disponibili

### create -- Crea nuova attivita

Aggiunge una nuova attivita all'array `activities` del viaggio. Viene generato automaticamente un ID univoco con prefisso `activity-`.

**Richiesta:**

```json
{
  "action": "create",
  "tripId": "uuid-del-viaggio",
  "activity": {
    "name": "Visita al Tempio Senso-ji",
    "date": "2026-03-18",
    "startTime": "09:00",
    "endTime": "11:30",
    "description": "Tempio buddista piu antico di Tokyo, nel quartiere Asakusa",
    "category": "cultura",
    "urls": ["https://www.senso-ji.jp/"],
    "address": "2 Chome-3-1 Asakusa, Taito City, Tokyo"
  }
}
```

**Campi dell'attivita:**

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:------------:|-------------|
| `name` | string | Si | Nome dell'attivita (max 100 caratteri) |
| `date` | string | Si | Data nel formato `YYYY-MM-DD` |
| `startTime` | string | No | Orario di inizio nel formato `HH:mm` |
| `endTime` | string | No | Orario di fine nel formato `HH:mm` |
| `description` | string | No | Descrizione testuale libera |
| `category` | string | No | Categoria dell'attivita |
| `urls` | string[] | No | Lista di URL correlati |
| `address` | string | No | Indirizzo o luogo dell'attivita |

**Risposta (200):**

```json
{
  "success": true,
  "activity": {
    "id": "activity-a1b2c3d4",
    "name": "Visita al Tempio Senso-ji",
    "date": "2026-03-18",
    "startTime": "09:00",
    "endTime": "11:30",
    "description": "Tempio buddista piu antico di Tokyo, nel quartiere Asakusa",
    "category": "cultura",
    "urls": ["https://www.senso-ji.jp/"],
    "address": "2 Chome-3-1 Asakusa, Taito City, Tokyo"
  }
}
```

### update -- Modifica attivita esistente

Aggiorna i campi di un'attivita gia presente. Vengono sovrascritti solo i campi forniti nel body; gli altri rimangono invariati.

**Richiesta:**

```json
{
  "action": "update",
  "tripId": "uuid-del-viaggio",
  "activityId": "activity-a1b2c3d4",
  "activity": {
    "startTime": "10:00",
    "description": "Descrizione aggiornata con piu dettagli"
  }
}
```

**Risposta (200):**

```json
{
  "success": true,
  "activity": {
    "id": "activity-a1b2c3d4",
    "name": "Visita al Tempio Senso-ji",
    "date": "2026-03-18",
    "startTime": "10:00",
    "endTime": "11:30",
    "description": "Descrizione aggiornata con piu dettagli",
    "category": "cultura",
    "urls": ["https://www.senso-ji.jp/"],
    "address": "2 Chome-3-1 Asakusa, Taito City, Tokyo"
  }
}
```

### delete -- Elimina attivita

Rimuove un'attivita dall'array `activities` del viaggio ed elimina tutti gli allegati associati dal bucket `activity-files` di Supabase Storage.

**Richiesta:**

```json
{
  "action": "delete",
  "tripId": "uuid-del-viaggio",
  "activityId": "activity-a1b2c3d4"
}
```

**Risposta (200):**

```json
{
  "success": true
}
```

::: warning Attenzione
L'eliminazione e irreversibile. Tutti gli allegati associati all'attivita vengono rimossi permanentemente dal bucket `activity-files`.
:::

### get-url -- URL firmato per allegato

Genera un URL firmato temporaneo per il download di un allegato dell'attivita. L'URL ha una scadenza predefinita di 1 ora.

**Richiesta:**

```json
{
  "action": "get-url",
  "tripId": "uuid-del-viaggio",
  "filePath": "uuid-del-viaggio/activity-a1b2c3d4-0.pdf"
}
```

**Risposta (200):**

```json
{
  "success": true,
  "url": "https://xxx.supabase.co/storage/v1/object/sign/activity-files/..."
}
```

## Allegati

Gli allegati delle attivita sono gestiti separatamente tramite upload diretto su Supabase Storage. L'endpoint `manage-activity` non gestisce direttamente l'upload dei file, ma solo la generazione di URL firmati per il download.

**Vincoli:**

| Vincolo | Valore |
|---------|--------|
| Numero massimo allegati per attivita | 5 |
| Dimensione massima per file | 10 MB |
| Formati accettati | PDF, JPEG, PNG, GIF, WebP |
| Bucket di storage | `activity-files` |
| Path | `{tripId}/{activityId}-{indice}.{estensione}` |

Il bucket `activity-files` viene creato automaticamente al primo upload tramite la funzione `ensureActivityBucket()`, che utilizza il client Supabase con service role key.

## Errori

| Codice | Condizione | Messaggio |
|--------|-----------|-----------|
| 400 | Azione non valida | `"Invalid action"` |
| 400 | `tripId` mancante | `"tripId is required"` |
| 400 | `activityId` mancante (per update/delete) | `"activityId is required"` |
| 400 | Nome attivita mancante (per create) | `"Activity name is required"` |
| 400 | Data attivita mancante (per create) | `"Activity date is required"` |
| 401 | JWT mancante o non valido | `"Unauthorized"` |
| 404 | Viaggio non trovato | `"Trip not found"` |
| 404 | Attivita non trovata | `"Activity not found"` |
| 500 | Errore generico del server | `"Internal server error"` |

## Struttura dati nel viaggio

Le attivita vengono salvate nell'array `activities` del JSON blob del viaggio:

```json
{
  "title": "Tokyo, Osaka",
  "flights": [ ... ],
  "hotels": [ ... ],
  "activities": [
    {
      "id": "activity-a1b2c3d4",
      "name": "Visita al Tempio Senso-ji",
      "date": "2026-03-18",
      "startTime": "09:00",
      "endTime": "11:30",
      "description": "...",
      "category": "cultura",
      "urls": ["https://www.senso-ji.jp/"],
      "address": "...",
      "attachments": [
        {
          "name": "biglietto-ingresso.pdf",
          "path": "uuid-viaggio/activity-a1b2c3d4-0.pdf",
          "type": "application/pdf",
          "size": 245760
        }
      ]
    }
  ]
}
```
