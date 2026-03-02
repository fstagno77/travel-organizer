# Endpoint

Tabella completa di tutti gli endpoint API di Travel Organizer. Ogni endpoint corrisponde a una Netlify Function accessibile all'indirizzo `/.netlify/functions/{nome}`.

## Tabella riassuntiva

| Funzione | Metodo | Path | Auth | Timeout | Descrizione |
|----------|--------|------|------|---------|-------------|
| `process-pdf` | POST | `/.netlify/functions/process-pdf` | JWT | 26s | Crea viaggio da PDF |
| `add-booking` | POST | `/.netlify/functions/add-booking` | JWT | 26s | Aggiunge prenotazione a viaggio |
| `delete-passenger` | POST | `/.netlify/functions/delete-passenger` | JWT | 10s | Rimuove passeggero da voli |
| `delete-booking` | POST | `/.netlify/functions/delete-booking` | JWT | 10s | Elimina singolo volo o hotel |
| `edit-booking` | POST | `/.netlify/functions/edit-booking` | JWT | 10s | Modifica campi volo/hotel |
| `delete-trip` | DELETE | `/.netlify/functions/delete-trip` | JWT | 10s | Elimina intero viaggio |
| `rename-trip` | POST | `/.netlify/functions/rename-trip` | JWT | 10s | Aggiorna titolo viaggio |
| `get-trip` | GET | `/.netlify/functions/get-trip` | JWT | 10s | Recupera viaggio per ID |
| `get-trips` | GET | `/.netlify/functions/get-trips` | JWT | 10s | Lista tutti i viaggi utente |
| `get-pdf-url` | GET | `/.netlify/functions/get-pdf-url` | JWT | 10s | URL firmato per download PDF |
| `get-upload-url` | POST | `/.netlify/functions/get-upload-url` | JWT | 10s | URL firmato per upload diretto |
| `manage-activity` | POST | `/.netlify/functions/manage-activity` | JWT | 10s | CRUD attivita custom |
| `manage-collaboration` | POST | `/.netlify/functions/manage-collaboration` | JWT | 10s | Inviti e gestione collaboratori |
| `notifications` | GET/POST | `/.netlify/functions/notifications` | JWT | 10s | Lista e gestione notifiche |
| `check-invite-status` | POST | `/.netlify/functions/check-invite-status` | No | 10s | Verifica accesso pre-OTP (invite-only) |
| `check-registration-access` | POST | `/.netlify/functions/check-registration-access` | JWT | 10s | Valida registrazione post-auth (invite-only) |
| `get-platform-stats` | GET | `/.netlify/functions/get-platform-stats` | No | 10s | Statistiche pubbliche piattaforma |
| `admin-api` | POST | `/.netlify/functions/admin-api` | JWT (admin) | 10s | Dashboard amministrativa |
| `process-email` | POST | `/.netlify/functions/process-email` | No | 26s | Webhook SendGrid email |
| `pending-bookings` | GET/POST/DELETE | `/.netlify/functions/pending-bookings` | JWT | 10s | Gestione prenotazioni pendenti |
| `crypto` | POST | `/.netlify/functions/crypto` | JWT | 10s | Crittografia/decrittografia dati |
| `check-username` | POST | `/.netlify/functions/check-username` | No | 10s | Verifica disponibilita username |
| `upload-trip-photo` | POST | `/.netlify/functions/upload-trip-photo` | JWT | 10s | Upload foto viaggio custom |
| `update-trip-photo` | POST | `/.netlify/functions/update-trip-photo` | JWT | 10s | Aggiorna foto copertina |
| `save-city-photo` | POST | `/.netlify/functions/save-city-photo` | JWT | 10s | Salva/cache foto citta |
| `get-city-photos` | GET | `/.netlify/functions/get-city-photos` | JWT | 10s | Recupera foto citta cached |
| `copy-trip-photo` | POST | `/.netlify/functions/copy-trip-photo` | JWT | 10s | Copia foto tra viaggi |
| `get-shared-trip` | GET | `/.netlify/functions/get-shared-trip` | No | 10s | Viaggio condiviso pubblico |
| `google-maps-proxy` | GET | `/.netlify/functions/google-maps-proxy` | JWT | 10s | Proxy API Google Maps |

## Raggruppamento per area funzionale

### Viaggi

| Funzione | Descrizione |
|----------|-------------|
| `process-pdf` | Crea un nuovo viaggio a partire da uno o piu PDF di prenotazione |
| `add-booking` | Aggiunge prenotazioni (voli/hotel) a un viaggio esistente |
| `get-trip` | Recupera i dati completi di un singolo viaggio |
| `get-trips` | Restituisce la lista di tutti i viaggi dell'utente |
| `rename-trip` | Modifica il titolo di un viaggio |
| `delete-trip` | Elimina un viaggio e tutti i dati associati |
| `get-shared-trip` | Accesso pubblico a un viaggio condiviso tramite link |

### Prenotazioni

| Funzione | Descrizione |
|----------|-------------|
| `edit-booking` | Modifica i campi di un volo o hotel esistente |
| `delete-booking` | Rimuove un singolo volo o hotel dal viaggio |
| `delete-passenger` | Rimuove un passeggero specifico da uno o piu voli |
| `pending-bookings` | Gestione completa delle prenotazioni pendenti (da email forwarding) |

### Attivita

| Funzione | Descrizione |
|----------|-------------|
| `manage-activity` | Endpoint unico per creare, modificare, eliminare attivita e ottenere URL allegati |

### Collaborazione e notifiche

| Funzione | Descrizione |
|----------|-------------|
| `manage-collaboration` | Invita utenti, accetta/revoca accessi, lista collaboratori, abbandona viaggio |
| `notifications` | Lista notifiche utente e marcatura come lette |

### Accesso e registrazione

| Funzione | Descrizione |
|----------|-------------|
| `check-invite-status` | Verifica pre-OTP: l'email ha un invito valido o e gia registrata? (pubblico) |
| `check-registration-access` | Verifica post-auth: il nuovo utente ha un invito pending? Se no, elimina l'account |

### Storage e file

| Funzione | Descrizione |
|----------|-------------|
| `get-upload-url` | Genera URL firmato per upload diretto su Supabase Storage |
| `get-pdf-url` | Genera URL firmato per il download di un PDF archiviato |
| `upload-trip-photo` | Carica una foto personalizzata per la copertina del viaggio |
| `update-trip-photo` | Aggiorna il riferimento alla foto di copertina nel database |
| `save-city-photo` | Salva e mette in cache una foto della citta di destinazione |
| `get-city-photos` | Recupera le foto delle citta gia presenti in cache |
| `copy-trip-photo` | Copia una foto di copertina da un viaggio a un altro |

### Utilita

| Funzione | Descrizione |
|----------|-------------|
| `crypto` | Crittografia e decrittografia dati sensibili (passaporti) con AES-256-GCM |
| `check-username` | Verifica se un username e disponibile durante la registrazione |
| `google-maps-proxy` | Proxy server-side per le API di Google Maps e Places |
| `process-email` | Webhook per la ricezione di email inoltrate tramite SendGrid |

## Note generali

### Formato di risposta

Tutti gli endpoint restituiscono JSON con la seguente struttura:

```json
// Successo
{ "success": true, ...dati }

// Errore
{ "success": false, "error": "Messaggio di errore" }
```

### Header CORS

Ogni risposta include gli header CORS necessari per il funzionamento cross-origin:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`

Le richieste preflight `OPTIONS` vengono gestite automaticamente da tutte le funzioni, restituendo un `200` con gli header CORS senza eseguire logica applicativa.

### Autenticazione

Gli endpoint contrassegnati con **JWT** richiedono un token nell'header `Authorization`:

```
Authorization: Bearer {jwt_token}
```

Il token viene validato tramite `authenticateRequest()`, che crea un client Supabase inizializzato con il contesto dell'utente e il Row Level Security attivo.

Gli endpoint pubblici non richiedono autenticazione per motivi specifici:

- **`check-username`** -- Deve essere accessibile prima del login
- **`check-invite-status`** -- Verifica accesso prima dell'OTP, nessun token disponibile
- **`get-shared-trip`** -- Permette la condivisione tramite link pubblico
- **`get-platform-stats`** -- Statistiche mostrate nella pagina di login pubblica
- **`process-email`** -- Webhook invocato direttamente da SendGrid

### Timeout

Il timeout di default per le funzioni Netlify e 10 secondi. Le funzioni che interagiscono con l'API di Claude per l'analisi dei PDF (`process-pdf`, `add-booking`, `process-email`) hanno un timeout esteso a 26 secondi, configurato nel file `netlify.toml`.
