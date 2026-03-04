# Panoramica

Travel Organizer è un'applicazione web personale per la gestione dei viaggi. Permette di caricare PDF di prenotazioni (voli, hotel) che vengono analizzati automaticamente tramite intelligenza artificiale, organizzarli in viaggi e gestire ogni aspetto del viaggio attraverso un'interfaccia curata e intuitiva.

## Stack tecnologico

| Livello | Tecnologia | Descrizione |
|---------|-----------|-------------|
| **Frontend** | Vanilla JavaScript, Vite 6.4, CSS Custom Properties | Nessun framework; bundler moderno con un design system basato su variabili CSS |
| **Backend** | Netlify Functions | Funzioni serverless in Node.js |
| **Database** | Supabase (PostgreSQL) | Row Level Security per isolamento dati per utente |
| **Storage** | Supabase Storage | Archiviazione di PDF, foto e file delle attività |
| **AI** | Anthropic Claude API (modello Haiku) | Parsing dei PDF e estrazione dati dalle email |
| **Autenticazione** | Supabase Auth | Google OAuth e Magic Link (OTP via email) |
| **Email** | SendGrid Inbound Parse | Inoltro email per importazione automatica prenotazioni |
| **Mappe** | Google Maps / Places API | Accesso tramite proxy server-side |
| **Internazionalizzazione** | Sistema i18n custom | Supporto italiano e inglese |

## Dipendenze principali

### Produzione

```json
{
  "@anthropic-ai/sdk": "^0.39.0",
  "@supabase/supabase-js": "^2.90.1",
  "busboy": "^1.6.0",
  "dotenv": "^16.4.7"
}
```

- **`@anthropic-ai/sdk`** -- SDK ufficiale di Anthropic per le chiamate all'API di Claude (analisi PDF e email).
- **`@supabase/supabase-js`** -- Client JavaScript per Supabase, utilizzato sia nel frontend che nelle funzioni serverless.
- **`busboy`** -- Parser di form `multipart/form-data` per la ricezione dei file PDF nelle funzioni Netlify.
- **`dotenv`** -- Caricamento delle variabili d'ambiente da file `.env` in sviluppo locale.

### Sviluppo

```json
{
  "vite": "^6.4.1",
  "jest": "^30.2.0"
}
```

- **`vite`** -- Bundler e dev server con hot reload, configurato come applicazione multi-pagina.
- **`jest`** -- Framework di testing per gli unit test.

## Funzionalita principali

- **Caricamento e analisi PDF** -- Carica prenotazioni di voli e hotel in formato PDF; Claude AI estrae automaticamente tutti i dati rilevanti (date, orari, passeggeri, numeri di volo, hotel, ecc.).
- **Gestione viaggi** -- Crea, rinomina, elimina viaggi. Ogni viaggio raggruppa voli, hotel e attività in un'unica vista organizzata.
- **Tracciamento voli e hotel** -- Visualizzazione dettagliata con card dedicate per ogni volo e ogni prenotazione alberghiera, con supporto multi-passeggero.
- **Attività personalizzate** -- Aggiungi attività manuali giorno per giorno (escursioni, ristoranti, visite) con descrizione, orari, link e allegati.
- **Inoltro email** -- Inoltra le email di conferma prenotazione a un indirizzo dedicato; il sistema le analizza e le associa automaticamente al viaggio corretto.
- **Profili viaggiatori** -- Gestisci i dati dei viaggiatori abituali (documenti, programmi fedeltà) con crittografia AES-256-GCM per i dati sensibili.
- **Condivisione viaggio** -- Condividi un viaggio con un link pubblico accessibile senza autenticazione.
