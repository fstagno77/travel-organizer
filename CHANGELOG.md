# Changelog

## 0.27 - 2026-03-01

### Nuove funzionalità
- **Registrazione su invito**: Travel Flow è ora una piattaforma chiusa. Solo gli utenti invitati da un membro già registrato (come Viaggiatore o Ospite) possono creare un account, tramite magic link o Google OAuth
- **Blocco pre-OTP**: prima di inviare il codice email, il sistema verifica che l'email abbia un invito valido (`trip_invitations` con `status='pending'`). Se non invitata, l'OTP non viene inviato e appare un messaggio esplicativo
- **Blocco post-auth (secondo livello)**: dopo il login (anche con Google), il backend verifica l'accesso e, se non autorizzato, elimina l'account da `auth.users` — nessuna area utente rimane creata
- **Account permanenti**: una volta registrato, l'account resta valido anche se l'utente viene rimosso da tutti i viaggi condivisi

## 0.26 - 2026-03-01

### Nuove funzionalità
- **Condivisione collaborativa viaggi**: invita altri utenti a un viaggio con ruolo Viaggiatore (può modificare e invitare ospiti) o Ospite (sola lettura). La lista collaboratori è visibile nel modale di condivisione con opzioni di revoca e reinvio invito
- **Flusso invito email**: gli utenti registrati ricevono una notifica in-app con accept/decline; gli utenti non registrati ricevono un'email con link per iscriversi e accedere direttamente al viaggio
- **Sistema notifiche**: campanella nell'header con badge contatore non letti. Pagina `/notifications.html` con lista ultimi 30 giorni. Tipi: invito collaborazione, accettazione/rifiuto, revoca, aggiunta/modifica/eliminazione prenotazioni e attività
- **Ruoli e permessi**: logica centralizzata (`permissions.js`). Proprietario: accesso completo. Viaggiatore: modifica + invita ospiti. Ospite: sola lettura con gating CSS sui controlli di modifica
- **Badge proprietario nel trip**: nei viaggi condivisi viene mostrato il nome del proprietario sotto il titolo con il proprio ruolo
- **"Lascia viaggio"**: nel menu del viaggio appare l'opzione per uscire dai viaggi condivisi (per tutti i non-proprietari)
- **Autocomplete email inviti**: digitando nel campo email del modale di condivisione vengono suggerite email/username di persone già invitate in precedenti viaggi

### Miglioramenti
- `shareModal.js`: modulo condiviso usato sia da homepage che da trip page (sostituisce la logica inline duplicata)
- `get-trip.js`: restituisce `{ tripData, role, owner }` per supportare la vista ruolo collaboratore
- `get-trips.js`: ogni viaggio include il campo `role` dell'utente corrente
- `delete-trip.js`: solo il proprietario può eliminare un viaggio (403 per collaboratori)
- Tutte le funzioni di mutazione (add/edit/delete booking, manage-activity): inviano notifica ai collaboratori dopo ogni modifica
- Nav bell ora punta a `/notifications.html` (era `/pending-bookings.html`); badge mostra somma prenotazioni in attesa + notifiche non lette

## 0.25.1 - 2026-03-01

### Miglioramenti
- **Auto-fill nome attività da Google Maps**: quando si incolla un link Google Maps nel campo indirizzo, il nome della location viene automaticamente inserito come nome dell'attività (se il campo è vuoto), con rilevamento automatico della categoria

## 0.24.1 - 2026-02-17

### Miglioramenti
- **Orario atterraggio nel tab Attività**: i voli nella vista elenco ora mostrano anche l'orario di arrivo (es. "14:30 → 18:45"), con indicatore "+1" per arrivi il giorno successivo
- **Open Graph meta tags**: anteprima social per i link condivisi (iMessage, WhatsApp, Telegram) con nome viaggio, date, conteggio voli/hotel/attività e cover photo dinamica tramite Netlify Edge Function
- **Categorie attività nella vista condivisa**: le attività ora mostrano icone e colori delle categorie
- **Pulsante condivisione nell'header**: spostato nella barra di navigazione per maggiore accessibilità
- **Auto-hide header nella vista condivisa**: l'header si nasconde allo scroll verso il basso e riappare allo scroll verso l'alto
- **Stile pulsante menu trip header**: rimosso sfondo di default, ora coerente con lo stile della freccia indietro

### Bug fix
- Fix anteprima social che mostrava sempre "Viaggio condiviso" invece del nome del viaggio (edge function leggeva il campo sbagliato)
- Fix posizionamento dropdown filtro/ricerca su mobile nel tab Attività
- Fix chiusura dropdown filtro/ricerca al tap esterno su mobile
- Fix indicatore segmented control nella vista condivisa
- Fix autocomplete città: `cities.json` aggiunto alla directory pubblica con percorso assoluto

## 0.23.2 - 2026-02-17

### Nuove funzionalità
- **Admin dashboard**: pagina di amministrazione con statistiche, gestione utenti/viaggi/prenotazioni, analytics (Chart.js), audit log, export dati
- **Deep linking home → dettaglio viaggio**: cliccando su un evento (volo, hotel, attività) nella card "In Corso" si apre il viaggio nel tab e item corretto
- **Icona admin nel header**: visibile solo per l'utente admin

### Miglioramenti
- Le città in homepage ora vengono mostrate solo se impostate dall'utente tramite il modale "Città" (rimosso fallback automatico da voli/hotel)

### Bug fix
- Fix autocomplete città non funzionante: il caricamento del database JSON era sincrono e tornava vuoto alla prima chiamata, ora usa async/await

## 0.23 - 2026-02-16

### Nuove funzionalità
- **Città nelle card home**: le card dei viaggi in homepage mostrano le città visitate sotto il titolo, con icona pin bianca e testo bianco
- **Gestione città** (`manage-cities`): nuova funzione backend per salvare/aggiornare le città di un viaggio
- **Auto-compilazione città**: le città vengono derivate automaticamente da voli (arrivo) e hotel quando non impostate manualmente
- **Lookup DB città**: sia il backend che il frontend cercano corrispondenze nel database città (`data/cities.json`) per arricchire con paese, coordinate
- **Header unificato**: tutte le pagine usano lo stesso header con logo immagine e sfondo gradiente
- **Filtro attività intelligente**: i pill del filtro mostrano solo le categorie presenti nel viaggio

### Miglioramenti
- Normalizzazione Title Case per i nomi delle città (mai tutto maiuscolo o minuscolo)
- Supporto robusto per formati legacy (stringhe) e moderni (oggetti con `name`, `country`, `lat`, `lng`)
- Il frontend "Compila da voli e hotel" ora arricchisce le città con paese e coordinate dal DB

### Bug fix
- Fix logo non visibile in homepage (nome file con underscore vs trattino)
