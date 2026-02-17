# Changelog

## 0.24.1 - 2026-02-17

### Miglioramenti
- **Orario atterraggio nel tab Attività**: i voli nella vista elenco ora mostrano anche l'orario di arrivo (es. "14:30 → 18:45"), con indicatore "+1" per arrivi il giorno successivo
- **Open Graph meta tags**: anteprima social per i link condivisi (iMessage, WhatsApp, Telegram) con nome viaggio, date, conteggio voli/hotel/attività e cover photo dinamica tramite Netlify Edge Function
- **Categorie attività nella vista condivisa**: le attività ora mostrano icone e colori delle categorie

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
