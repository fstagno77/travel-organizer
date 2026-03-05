# Istruzioni Progetto - Travel Flow (Travel Organizer)

## Autonomia operativa

Opera in modalita autonoma. Non chiedere conferma per creare, modificare o sovrascrivere file di codice. Chiedi conferma SOLO per operazioni distruttive: cancellazione di file, modifiche allo schema del database (Supabase), operazioni su dati di produzione, o deploy su produzione.

Quando incontri un errore durante l'esecuzione, analizzalo e correggilo autonomamente senza chiedere cosa fare. Se dopo 3 tentativi il problema persiste, fermati e spiega cosa sta succedendo.

## Lingua

Rispondi sempre in italiano. Scrivi i commenti nel codice in italiano. L'interfaccia utente e in italiano. Le chiavi i18n sono in `public/i18n/it.json` e `public/i18n/en.json`.

## Stack tecnologico

**Frontend:**
- Vanilla JavaScript (NO TypeScript, NO framework)
- CSS custom (13 file in `css/`, variabili in `variables.css`)
- Multi-page SPA: 9 pagine HTML (index, trip, login, profile, admin, notifications, pending-bookings, share, changelog)
- Vite 6 per bundling (multi-entry, code splitting con shared chunk)
- Font: Inter (self-hosted)

**Backend:**
- Netlify Functions (Node.js) — 36 funzioni serverless in `netlify/functions/`
- Utilities condivise in `netlify/functions/utils/`
- Pattern action-based: singola funzione con routing per azione (es. `manage-activity.js`, `manage-collaboration.js`, `admin-api.js`)
- Timeout: 60s per funzioni PDF, 30-45s per le altre (configurato in `netlify.toml`)

**Database:**
- Supabase PostgreSQL
- Trip data salvata come JSON blob nella colonna `data`
- Migrazioni in `supabase/migrations/` (001-009)
- Tabelle principali: `trips`, `travelers`, `trip_collaborators`, `trip_invitations`, `notifications`, `parsing_templates_beta`, `admin_audit_log`, `platform_stats`

**AI/PDF Processing:**
- Anthropic Claude API (`@anthropic-ai/sdk`) per parsing PDF
- SmartParse v2.1: cascade L1 (cache fingerprint) -> L2 (template extraction) -> L4 (Claude API)
- Moduli core: `smartParser.js`, `templateExtractor.js`, `pdfProcessor.js`

**Auth:**
- Supabase Auth (Google OAuth + OTP email)
- Piattaforma chiusa: registrazione solo su invito
- Crittografia AES-256-GCM per dati passaporto (`crypto.js`)

## Struttura progetto

```
travel-organizer/
├── index.html, trip.html, login.html, profile.html,
│   admin.html, notifications.html, pending-bookings.html,
│   share.html, changelog.html
├── js/                              # Frontend (29 file)
│   ├── main.js                      # Entry point (auth, nav init)
│   ├── auth.js                      # Autenticazione Supabase
│   ├── navigation.js                # Header, menu, badge notifiche
│   ├── supabaseClient.js            # Client singleton
│   ├── homePage.js                  # Lista viaggi
│   ├── tripPage.js                  # Dettaglio viaggio (124 KB)
│   ├── tripFlights.js               # Card voli
│   ├── tripHotels.js                # Card hotel
│   ├── tripActivities.js            # Tab attivita
│   ├── tripCreator.js               # Upload PDF + SmartParse preview
│   ├── tripSlidePanel.js            # Pannello slide generico
│   ├── shareModal.js                # Modale condivisione/collaborazione
│   ├── parsePreview.js              # Preview estrazione SmartParse
│   ├── adminPage.js                 # Dashboard admin (134 KB)
│   ├── profile.js                   # Impostazioni utente
│   └── entries/                     # Entry point Vite per ogni pagina
├── netlify/functions/               # Backend (36 funzioni)
│   ├── process-pdf.js               # Upload PDF, SmartParse
│   ├── add-booking.js               # Aggiunta booking a viaggio
│   ├── manage-activity.js           # CRUD attivita custom
│   ├── manage-collaboration.js      # Inviti, ruoli, collaboratori
│   ├── admin-api.js                 # Tutte le operazioni admin
│   ├── notifications.js             # GET/POST notifiche
│   └── utils/
│       ├── smartParser.js           # SmartParse v2.1 (34 KB)
│       ├── templateExtractor.js     # Estrazione template L2 (28 KB)
│       ├── pdfProcessor.js          # Batch PDF processing
│       ├── auth.js                  # JWT, CORS
│       ├── permissions.js           # canModifyTrip, canDeleteTrip
│       ├── notificationHelper.js    # notifyCollaborators()
│       └── storage.js               # Upload file Supabase Storage
├── css/                             # Stili (13 file, 584 KB)
├── public/
│   ├── data/                        # airlines.json, changelog.json
│   ├── i18n/                        # it.json, en.json
│   └── assets/                      # Icone, font, immagini
├── tests/                           # Jest test suite
├── scripts/                         # Script utility e test SmartParse
├── filebooking/                     # PDF di test (NON committati, in .gitignore)
├── docs/                            # Wiki tecnica (VitePress)
├── supabase/migrations/             # Schema DB (001-009)
├── netlify.toml                     # Config deploy + timeout funzioni
├── vite.config.mjs                  # Multi-entry, proxy API in dev
└── package.json
```

## Testing

### Jest (unit test)

- Framework: Jest 30 (`npx jest`)
- Test in `tests/` (NON co-locati con i sorgenti)
- 6 file di test: `auth-reload-loop`, `crypto`, `delete-passenger`, `manage-activity`, `passenger-merge`, `pdf-batching`
- Nessun file di configurazione Jest esplicito (usa defaults)
- I test richiedono il file `.env` con le variabili Supabase
- Mocking estensivo di Supabase client e auth utilities

### SmartParse v2.1 — Test con PDF reali

**Script principale:** `node scripts/test-smartparse-v2.js`

Esegue 13 PDF reali in 2 passate (26 test totali):
- **Passata 1:** primo upload — atteso L4 (Claude) o L2 (template)
- **Passata 2:** re-upload stessi PDF — atteso L1 (cache fingerprint, 0 chiamate AI)

Lo script cancella tutta la cache da `parsing_templates_beta` prima di iniziare.

**Cartella PDF di test:** `filebooking/` (in `.gitignore`, NON committata)

```
filebooking/
├── america/          # 6 PDF — 5 ricevute volo ITA Airways + 1 hotel Booking.com (Chicago)
├── giappone/         # 7 PDF — 5 hotel Booking.com + 2 voli ITA Airways
└── treni/            # 5 PDF — biglietti treno (per test nuovi tipi documento)
```

**Provider coperti:** ITA Airways (voli), Booking.com (hotel), treni

**Campi obbligatori validati:**
- Voli: flightNumber, date, departureTime, arrivalTime, departure.code/city, arrival.code/city, passenger.name, bookingReference
- Hotel: name, checkIn.date, checkOut.date, confirmationNumber, address.city, address.fullAddress

**Output atteso:**
```
L2 | 0 AI | 2.3s | 1F 0H | campi: 8/8
```

**Altri script di test SmartParse** (in `scripts/`):
- `test-smartparse.js` — versione precedente
- `test-smartparse-mock.js` — test offline con mock
- `test-smartparse-ita.js` — specifico ITA Airways
- `test-smartparse-hotel-mock.js` — mock Booking.com
- `test-booking-smartparse.js` — test booking reali
- `test-hotel-cache.js` — test cache hit
- `test-hotel-frontend-sim.js` — simulazione frontend

## Versionamento e changelog

Formato versione: **X.Y** o **X.Y.Z** (es: 0.28, 0.28.3, 1.0). Versione corrente: **0.28.3**.

Due file da aggiornare insieme:
- `CHANGELOG.md` (root): changelog dettagliato in markdown
- `public/data/changelog.json`: JSON strutturato per il footer (la versione viene letta da `versions[0].version`)

Il footer legge la versione da `changelog.json`.

**Regola: aggiornare il changelog ad ogni push.** Incrementa la versione patch (X.Y.Z) per fix e miglioramenti, la minor (X.Y) per nuove funzionalità. Le voci del changelog devono essere:
- Scritte dal punto di vista dell'utente finale, non tecniche
- Brevi e comprensibili (es. "Fix accesso utenti invitati" non "cambiato maybeSingle in limit(1)")
- Solo cambiamenti rilevanti per l'utente (no refactoring interni, no modifiche a log/debug)

## Comandi utili

```bash
# Dev server (porta 8888, proxy Netlify Functions)
netlify dev

# Build produzione
npm run build

# Test Jest
npx jest

# Test SmartParse (richiede .env + PDF in filebooking/)
node scripts/test-smartparse-v2.js

# Documentazione (VitePress)
npm run docs:dev
```

## Regole di sviluppo

1. Il progetto e in **vanilla JS** — non introdurre TypeScript, React, o altri framework
2. Mantieni il pattern esistente: entry point in `js/entries/`, logica pagina in `js/nomePagina.js`
3. Backend: una funzione Netlify per dominio, con routing action-based
4. CSS: usa le variabili definite in `css/variables.css`, mantieni il sistema esistente
5. Commenti solo su logica complessa, non su codice autodocumentato
6. Non esporre mai errori tecnici all'utente — messaggi user-friendly in italiano
7. **File NON committati** (in `.gitignore`): `.env`, `filebooking/` (PDF di test), `node_modules/`, `dist/`, `.netlify/`, `.claude/`, `server/` (legacy), `trips/` (legacy), `deno.lock`, `docs/.vitepress/cache/`, `supabase/.temp/`
8. Per operazioni su dati viaggio, verificare sempre i permessi con `permissions.js` (`canModifyTrip`, `canDeleteTrip`)
9. Dopo mutazioni su booking/attivita, chiamare `notifyCollaborators()` per notificare i collaboratori

## Deploy

- **Piattaforma:** Netlify (auto-deploy su push a main)
- **Build:** `npm run build` (Vite) → output in `dist/`
- **Functions:** bundled con esbuild
- **Variabili d'ambiente:** configurate nel dashboard Netlify
- **Dev locale:** `netlify dev` (avvia sia Vite che le Functions con proxy)

## Struttura commit

Conventional commits:
```
feat: descrizione feature
fix: descrizione bug fix
docs: aggiornamento documentazione
refactor: refactoring codice
test: aggiunta/modifica test
chore: manutenzione, dipendenze
perf: ottimizzazione performance
```
