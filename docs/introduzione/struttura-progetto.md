# Struttura del progetto

Questa pagina descrive l'organizzazione delle directory e dei file principali del progetto.

## Albero delle directory

```
travel-organizer/
├── index.html
├── trip.html
├── login.html
├── profile.html
├── pending-bookings.html
├── share.html
├── changelog.html
├── package.json
├── vite.config.mjs
├── netlify.toml
├── js/
├── css/
├── netlify/functions/
├── data/
├── locales/
├── public/
├── scripts/
├── supabase/migrations/
└── tests/
```

## Pagine HTML

Il progetto è un'applicazione multi-pagina. Ogni file HTML nella root corrisponde a una pagina distinta.

| File | Descrizione |
|------|-------------|
| `index.html` | Home page e dashboard con l'elenco dei viaggi |
| `trip.html` | Pagina di dettaglio viaggio con tab Voli, Hotel, Attività |
| `login.html` | Pagina di autenticazione (Google OAuth / Magic Link) |
| `profile.html` | Impostazioni utente con tre tab: Profilo, Viaggiatori, Preferenze |
| `pending-bookings.html` | Gestione delle prenotazioni ricevute via email in attesa di assegnazione |
| `share.html` | Vista pubblica di un viaggio condiviso (accessibile senza login) |
| `changelog.html` | Registro delle modifiche e novità dell'applicazione |

## File di configurazione

| File | Descrizione |
|------|-------------|
| `package.json` | Dipendenze del progetto (Vite, Supabase, Anthropic SDK, Jest) |
| `vite.config.mjs` | Configurazione Vite: app multi-pagina con proxy verso le funzioni Netlify in sviluppo |
| `netlify.toml` | Configurazione di deploy su Netlify (build command, publish directory, redirect) |

## `js/` -- JavaScript frontend

Ogni file gestisce la logica di una pagina o di un aspetto trasversale dell'applicazione.

```
js/
├── main.js                   # Home page: lista viaggi, creazione nuovo viaggio
├── tripPage.js               # Pagina viaggio: tab (Voli/Hotel/Attività), card
├── auth.js                   # Autenticazione: login, sessione, helper encrypt/decrypt
├── storage.js                # Supabase Storage: upload PDF, file attività
├── navigation.js             # Header, footer, link navigazione, campanella notifiche
├── i18n.js                   # Internazionalizzazione (it/en)
├── utils.js                  # Formattazione date, debounce, funzioni di utilità
├── profile.js                # Pagina impostazioni: 3 tab, CRUD viaggiatori
├── pendingBookings.js        # Gestione prenotazioni in attesa
├── share.js                  # Vista pubblica viaggio condiviso
├── activityCategories.js     # Definizioni categorie attività: icone, colori
└── changelog.js              # Logica pagina changelog
```

## `css/` -- Fogli di stile

Il design system è basato su CSS Custom Properties definite in `variables.css`. Gli stili sono suddivisi per responsabilità.

```
css/
├── variables.css             # Design token: colori, spaziature, ombre, breakpoint
├── reset.css                 # Reset CSS
├── fonts.css                 # Import font (Inter, Material Icons/Symbols)
├── base.css                  # Stili di base per elementi HTML
├── layout.css                # Layout pagina, container, header, griglia
├── components.css            # Stili di tutti i componenti (~113 KB)
├── utilities.css             # Classi di utilità
├── auth.css                  # Stili pagina autenticazione e impostazioni
├── pending-bookings.css      # Stili pagina prenotazioni in attesa
└── changelog.css             # Stili pagina changelog
```

## `netlify/functions/` -- Backend serverless

Tutte le API sono implementate come funzioni Netlify (serverless Node.js). Ogni file espone un singolo endpoint.

### Gestione viaggi

| File | Descrizione |
|------|-------------|
| `process-pdf.js` | Crea un nuovo viaggio a partire da PDF caricati |
| `add-booking.js` | Aggiunge una prenotazione (volo/hotel) a un viaggio esistente |
| `delete-passenger.js` | Rimuove un passeggero da uno o più voli |
| `delete-booking.js` | Elimina un singolo volo o hotel |
| `edit-booking.js` | Modifica i campi di un volo o hotel |
| `delete-trip.js` | Elimina un intero viaggio |
| `rename-trip.js` | Aggiorna il titolo di un viaggio |
| `get-trip.js` | Restituisce un singolo viaggio |
| `get-trips.js` | Restituisce l'elenco dei viaggi dell'utente |

### Attività e prenotazioni email

| File | Descrizione |
|------|-------------|
| `manage-activity.js` | CRUD attività personalizzate (create/update/delete/get-url) |
| `process-email.js` | Webhook SendGrid per ricezione email inoltrate |
| `pending-bookings.js` | Gestione prenotazioni in attesa di assegnazione |

### Storage e file

| File | Descrizione |
|------|-------------|
| `get-pdf-url.js` | Genera URL firmato per il download di un PDF |
| `get-upload-url.js` | Genera URL firmato per upload diretto |
| `upload-trip-photo.js` | Caricamento foto personalizzata del viaggio |
| `update-trip-photo.js` | Aggiornamento foto di copertina del viaggio |
| `save-city-photo.js` | Salvataggio foto città in cache |
| `get-city-photos.js` | Recupero foto città dalla cache |
| `copy-trip-photo.js` | Copia foto tra viaggi |

### Utilità e servizi

| File | Descrizione |
|------|-------------|
| `crypto.js` | Crittografia AES-256-GCM per dati sensibili (passaporti) |
| `check-username.js` | Verifica disponibilità username |
| `get-shared-trip.js` | Endpoint pubblico per viaggi condivisi |
| `google-maps-proxy.js` | Proxy per le API Google Maps/Places |

### `netlify/functions/utils/` -- Moduli condivisi

```
utils/
├── auth.js               # Helper autenticazione, CORS, factory client Supabase
├── pdfProcessor.js       # Elaborazione PDF con Claude API, batching (max 2 per chiamata)
└── emailExtractor.js     # Estrazione corpo email e allegati
```

## `data/` -- Dati statici

```
data/
└── airlines.json         # Elenco compagnie aeree con programmi fedeltà
```

Il file viene caricato on-demand nel frontend per la ricerca delle compagnie aeree nella modale dei programmi fedeltà.

## `locales/` -- Traduzioni

```
locales/
├── it.json               # Traduzioni in italiano
└── en.json               # Traduzioni in inglese
```

I file JSON contengono tutte le stringhe dell'interfaccia, caricate dal modulo `i18n.js`.

## `public/` -- Asset statici

Directory servita direttamente da Vite. Contiene immagini, icone e altri asset che non necessitano di elaborazione dal bundler.

## `scripts/` -- Script di manutenzione

```
scripts/
└── encrypt-existing-passports.js   # Migrazione una tantum: crittografia passaporti esistenti
```

## `supabase/` -- Migrazioni database

```
supabase/
└── migrations/           # File SQL di migrazione del database
```

Le migrazioni definiscono lo schema delle tabelle, le policy di Row Level Security e gli indici.

## `tests/` -- Test

Directory contenente i file di test Jest. I test si eseguono con:

```bash
npx jest
```
