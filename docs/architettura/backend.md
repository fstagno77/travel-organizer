# Backend

Il backend di Travel Organizer è composto da funzioni serverless **Netlify Functions** eseguite in ambiente Node.js. Ogni funzione corrisponde a un singolo endpoint HTTP accessibile all'indirizzo `/.netlify/functions/{nome}`.

## Runtime e limiti

| Parametro | Valore |
|-----------|--------|
| Runtime | Node.js (Netlify Functions) |
| Timeout di default | 10 secondi |
| Timeout elaborazione PDF | 26 secondi |
| Formato richiesta/risposta | JSON |

Il timeout esteso per l'elaborazione PDF è necessario perché le chiamate all'API di Claude per l'analisi dei documenti possono richiedere diversi secondi, specialmente con batch di più file.

## Pattern comune delle funzioni

Tutte le funzioni seguono lo stesso pattern architetturale:

```
CORS check → Autenticazione → Validazione input → Esecuzione logica → Risposta JSON
```

### 1. Gestione CORS

Ogni funzione gestisce le richieste cross-origin tramite due utility condivise:

- **`getCorsHeaders()`** -- Restituisce gli header CORS necessari (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, ecc.).
- **`handleOptions()`** -- Gestisce le richieste preflight `OPTIONS` restituendo immediatamente `200` con gli header CORS.

```js
if (event.httpMethod === 'OPTIONS') {
  return handleOptions();
}
```

### 2. Autenticazione

Le funzioni protette estraggono il JWT dall'header `Authorization: Bearer {token}` e lo validano tramite `authenticateRequest()`. Questo passaggio crea un client Supabase inizializzato con il token dell'utente, abilitando automaticamente il Row Level Security.

### 3. Risposta

Le risposte seguono un formato strutturato uniforme:

```json
// Successo
{ "success": true, "data": { ... } }

// Errore
{ "success": false, "error": "Messaggio di errore" }
```

La gestione degli errori avviene tramite blocchi `try/catch` a livello di funzione, che catturano qualsiasi eccezione non gestita e restituiscono un errore `500` con messaggio descrittivo.

## Client Supabase

Ogni funzione che interagisce con il database utilizza due tipologie distinte di client Supabase:

| Client | Scopo | Sicurezza |
|--------|-------|-----------|
| **User client** | Operazioni per conto dell'utente | Inizializzato con JWT; il Row Level Security filtra automaticamente i dati per `user_id` |
| **Service client** | Operazioni amministrative | Usa la `service_role` key; bypassa completamente il RLS |

Il service client viene utilizzato solo quando necessario: creazione di bucket di storage, scrittura nella cache condivisa, elaborazione webhook email e operazioni che non hanno un contesto utente.

## Supabase Storage

I file vengono archiviati in Supabase Storage, organizzati in tre bucket separati:

| Bucket | Contenuto | Accesso |
|--------|-----------|---------|
| `trip-pdfs` | PDF di prenotazioni caricate dagli utenti | Privato, per utente |
| `activity-files` | Allegati delle attività personalizzate (PDF, immagini) | Privato, per utente |
| `city-photos` | Foto delle citta per le card dei viaggi | Privato, per utente |

Ogni bucket viene creato automaticamente al primo utilizzo tramite la funzione `ensureActivityBucket()` (o equivalente), che utilizza il service client per verificarne l'esistenza e crearlo se necessario.

## Integrazioni esterne

### Claude API

L'SDK `@anthropic-ai/sdk` viene utilizzato per l'analisi automatica dei PDF di prenotazione. Il modulo condiviso `pdfProcessor.js` gestisce:

- Invio dei PDF come documenti base64 all'API di Claude
- Batching fino a 2 PDF per chiamata (riduce i rate limit)
- Fallback a chiamate singole sequenziali in caso di errore del batch
- Rilevamento troncamento tramite `stop_reason === 'max_tokens'`

### SendGrid Inbound Parse

Il webhook `process-email.js` riceve le email inoltrate dagli utenti tramite SendGrid Inbound Parse. Questo endpoint è pubblico (nessuna autenticazione JWT) perché viene invocato direttamente da SendGrid. Il webhook:

1. Riceve l'email come richiesta `multipart/form-data` (parsing tramite `busboy`)
2. Identifica l'utente dal campo "to" dell'email
3. Estrae gli allegati PDF
4. Li analizza con Claude
5. Salva la prenotazione come `pending_booking` nel database

### Google Maps API

L'endpoint `google-maps-proxy.js` funge da proxy server-side per le API di Google Maps e Places. Questo pattern evita di esporre la chiave API di Google nel codice frontend e permette di gestire centralmente rate limiting e caching.

## Endpoint pubblici

Tre endpoint non richiedono autenticazione JWT:

| Endpoint | Motivo |
|----------|--------|
| `check-username` | Verifica disponibilita username durante la registrazione |
| `get-shared-trip` | Accesso a viaggi condivisi tramite link pubblico |
| `process-email` | Webhook SendGrid (autenticazione tramite indirizzo email destinatario) |
