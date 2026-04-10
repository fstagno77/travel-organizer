# Changelog

## 0.39.0 - 2026-04-10

### Novità
- **Viaggi in preparazione (bozze)**: è ora possibile creare un viaggio senza date né destinazione — un contenitore da riempire in un secondo momento. Le bozze hanno una sezione dedicata "In preparazione" nella sidebar, con badge conteggio sempre visibile. Dalla pagina del viaggio bozza, la CTA "Completa viaggio" permette di aggiungere destinazione e date e convertire la bozza in viaggio attivo
- **Tipi di volo**: nel form di creazione volo manuale è ora possibile scegliere tra Solo andata, Andata e ritorno e Multitratta. A/R mostra due sezioni distinte (andata in blu, ritorno in verde); Multitratta supporta fino a 6 tratte con aggiunta e rimozione dinamica
- **Icone colorate nelle modali prenotazione**: il titolo della modale di creazione mostra l'icona del tipo di prenotazione (volo, hotel, treno, bus, traghetto, noleggio) con il colore specifico del tipo — sia nel flusso manuale che tramite SmartParse

### Miglioramenti
- Pill selector tipo volo con icone freccia direzionale (→ per solo andata, ⇄ per A/R, →→ per multitratta)
- Header modale si aggiorna dinamicamente al cambio di tipo prenotazione e si ripristina tornando indietro
- Creazione bozza: il link "Crea senza date" è sostituito da un toggle "Salva come bozza" integrato nel form — si attiva automaticamente aprendo il modal dalla pagina "In preparazione"

## 0.38.1 - 2026-04-03

### Fix
- **Tab Traghetti su smartphone**: il tap sul segmento "Traghetti" ora funziona correttamente su iOS Safari — aggiunto `pointer-events: none` sull'SVG inline per garantire la propagazione del touch event al bottone padre

## 0.38.0 - 2026-04-03

### Novità
- **Creazione manuale prenotazione**: è ora possibile aggiungere manualmente voli, hotel, treni, bus, auto a noleggio e traghetti senza importare un PDF — tramite form guidato con step tipo/viaggio e campi specifici per categoria
- Fallback SmartParse: se il parsing automatico fallisce, l'utente viene indirizzato al form manuale
- Protezione unsaved changes: conferma prima di uscire dal form con dati non salvati

## 0.35.0 - 2026-03-24

### Fix
- Accordion "Mostra dettagli" su voli e hotel ora funziona correttamente
- Tab "Auto" nel segmented control ora si apre sempre dopo il ricaricamento della pagina
- Link Google Maps dall'app iOS ora vengono riconosciuti correttamente nell'aggiunta attività
- Messaggio di errore nelle modali ora è sempre visibile su smartphone, anche se la pagina è scrollata verso il basso
- Corretto bug su PWA iOS che mostrava il messaggio di errore sotto la status bar del sistema
- Nella modale di condivisione, i collaboratori che hanno già accettato l'invito non appaiono più in doppio

### Novità
- **Pagina di condivisione pubblica rinnovata**: il link di condivisione mostra ora la stessa struttura della pagina viaggio (Voli, Hotel, Treni, Bus, Auto, Attività), con tab dinamici e card aggiornate — tutto in sola lettura

## 0.34.10 - 2026-03-15

### Miglioramenti
- Pagina Aiuto: le FAQ mostrano ora skeleton placeholder per gli item sotto la prima schermata, sostituiti con l'item reale al passaggio in viewport
- Pagina dettaglio Aiuto: la sezione "Altri argomenti" in fondo alla pagina mostra skeleton card (icona + testo grigi animati) mentre il contenuto si carica

## 0.34.9 - 2026-03-15

### Fix mobile
- Badge "Beta" ora visibile accanto al logo nella barra di navigazione su smartphone
- Pagina Aiuto: campo di ricerca e bottone "Cerca" ora affiancati su mobile (non più impilati in colonna)

## 0.34.8 - 2026-03-15

### Miglioramenti
- Pagina Aiuto: le card categorie sotto la prima schermata mostrano ora un blocco skeleton (icona, titolo, descrizione grigi animati) mentre si carica il contenuto; vengono sostituite dalla card reale con un'animazione di entrata quando entrano nel campo visivo
- Pagina dettaglio Aiuto: gli articoli lazy mostrano ora un placeholder skeleton fedele alla struttura reale (titolo, box intro, cerchi di step, box risultato) invece di rimanere invisibili; i link del TOC funzionano anche prima che l'articolo venga caricato

## 0.34.7 - 2026-03-15

### Miglioramenti
- Pagina Aiuto: le card categorie e le FAQ mostrano ora un'animazione shimmer mentre il contenuto si carica, eliminando il flash di pagina vuota
- Pagina dettaglio Aiuto: l'hero mostra uno skeleton mentre la sezione si inizializza; gli articoli sotto la prima schermata vengono caricati in modo lazy con un'animazione di entrata

## 0.34.6 - 2026-03-15

### Novità
- Dashboard admin: la pagina Gestione Utenti mostra ora tutti gli inviti in attesa, sia quelli alla piattaforma che quelli a singoli viaggi, con indicazione di chi ha invitato, il ruolo assegnato (Viaggiatore, Ospite, Invitato piattaforma) e la data dell'invito
- Admin può revocare qualsiasi invito pendente direttamente dalla tabella

## 0.34.5 - 2026-03-15

### Fix
- Cliccando su "Aiuto" nel breadcrumb della pagina dettaglio, il contenuto della pagina Aiuto (categorie e FAQ) ora si carica correttamente

## 0.34.4 - 2026-03-15

### Miglioramenti
- Copiando il link di invito piattaforma viene ora copiato anche un messaggio precostruito pronto da incollare in chat
- Il link di invito genera un'anteprima ricca (immagine + titolo) quando condiviso su WhatsApp, iMessage, Telegram e altri sistemi di messaggistica

## 0.34.3 - 2026-03-15

### Fix
- Icona campanella notifiche riallineata al bordo destro del contenuto su monitor larghi (era posizionata fuori dall'area visibile)
- Dropdown notifiche ora appare esattamente sotto la campanella su qualsiasi larghezza schermo
- Nella sezione Aiuto, l'hero non si sovrappone più all'icona campanella

## 0.34.2 - 2026-03-15

### Fix
- Navigando dalla pagina Aiuto verso Prossimi Viaggi o Viaggi Passati, i viaggi non venivano caricati

## 0.34.1 - 2026-03-15

### Novità
- **Pagina Aiuto**: nuova sezione accessibile dalla barra laterale con guide complete su tutte le funzionalità di Travel Flow
- Ricerca intelligente tra gli articoli di aiuto: trova subito la risposta che cerchi
- Guide dettagliate su: voli, hotel, attività, collaborazione, notifiche, profilo e sicurezza
- Sezione FAQ con le domande più frequenti
- Disponibile in italiano e inglese

## 0.34.0 - 2026-03-15

### Novità
- **Sistema inviti piattaforma**: ogni utente può invitare fino a 5 nuovi utenti al mese direttamente dalle Impostazioni (tab "Inviti")
- Dopo aver inserito l'email dell'amico, viene generato un link univoco da copiare e condividere (WhatsApp, email, ecc.)
- Chi riceve il link può registrarsi con Google OAuth o con un codice OTP via email
- Nella tab si vede quanti inviti sono stati usati questo mese e quando il contatore si azzera
- Per ogni invito pendente è possibile copiare di nuovo il link o revocarlo

## 0.33.1 - 2026-03-14

### Miglioramenti
- Invito collaboratori: dopo aver invitato un utente appare subito il box con il link da copiare e condividere, sia per utenti registrati che non
- Ricerca email nell'invito: il primo risultato è già evidenziato e si può selezionare con Invio senza dover usare le frecce

## 0.33.0 - 2026-03-14

### Novità
- **Noleggi Auto**: nuova categoria per le prenotazioni di noleggio auto (Hertz, Avis, Budget, Europcar, Sixt, Maggiore, Locauto)
- I PDF di conferma noleggio vengono riconosciuti automaticamente da SmartParse e aggiunti al viaggio
- Nuova tab "Auto" nel segmented control del viaggio, con schede dedicate per ogni noleggio (ritiro, riconsegna, veicolo, conducente, riferimento prenotazione)
- Gli eventi di noleggio (ritiro, giorno attivo, riconsegna) compaiono nella timeline "Le mie attività" con categoria colore teal

## 0.32.3 - 2026-03-14

### Fix
- Prenotazioni Ryanair (e altri vettori) con più passeggeri: tutti i passeggeri ora vengono salvati correttamente nel viaggio invece di comparire solo il primo

## 0.32.2 - 2026-03-11

### Miglioramenti
- Nella dashboard admin, la sezione "Email" si chiama ora "Parse Email" e "Elaborazioni PDF" si chiama "Parse PDF"
- "Parse Email" mostra ora i risultati SmartParse (livello cache/template/AI, brand, campi estratti, durata) esattamente come "Parse PDF", con statistiche e dettaglio espandibile
- Le email con PDF allegato compaiono in "Parse Email" anziché in "Parse PDF"
- Il log delle email ora registra livello SmartParse, brand, durata, chiamate AI e dati estratti: le card statistiche si popolano correttamente anche per le email
- Nel dettaglio di ogni email: anteprima del corpo ricevuto, link alla prenotazione pendente, pulsante "Carica JSON" per i dati estratti completi
- Modale prenotazione email: il passeggero ora viene sempre mostrato; per prenotazioni multi-passeggero appare la tabella con nome, tipo, posto e biglietto di ciascuno; i posti vengono recuperati dall'array passeggeri anche quando il campo sul volo è vuoto
- Aggiunto feedback 👍/👎 nella modale prenotazione email: salvato sul log admin alla conferma, al rifiuto o alla modifica

## 0.32.1 - 2026-03-11

### Miglioramenti
- I viaggi eliminati ora vengono conservati temporaneamente invece di essere cancellati subito: l'admin può ripristinarli dalla dashboard in qualsiasi momento

## 0.32.0 - 2026-03-11

### Novità
- **Prenotazioni via email**: è ora possibile fare il forward di un'email di prenotazione (volo, hotel) a trips@travel-flow.com e riceverla direttamente nell'app
- **Modale prenotazione**: cliccando su una prenotazione ricevuta via email si apre direttamente una modale per rivederla, scegliere a quale viaggio aggiungerla (o crearne uno nuovo) oppure rifiutarla — senza passare per una pagina separata

### Fix
- Risolto problema con email forward da Gmail: il contenuto della prenotazione originale ora viene estratto correttamente

## 0.31.5 - 2026-03-11

### Fix
- Risolto crash "Errore durante l'aggiunta" che si verificava caricando PDF Booking.com (e potenzialmente altri) quando il modulo di rilevamento aggiornamenti non era disponibile; ora il sistema torna automaticamente al flusso standard
- Messaggi di errore più dettagliati: distingue ora tra errore di rete, errore del server ed errore interno

## 0.31.4 - 2026-03-09

### Miglioramenti
- Copiando un link di condivisione o invito, ora viene incluso un messaggio precostruito pronto da incollare su WhatsApp, Telegram o email

## 0.31.3 - 2026-03-08

### Miglioramenti
- Aggiunto pulsante "Reinvia notifica" per collaboratori registrati in attesa di accettare l'invito

## 0.31.2 - 2026-03-08

### Fix
- Ripristinato layout card viaggio su mobile: data a sinistra e freccia a destra come su desktop

## 0.31.1 - 2026-03-07

### Novità
- **Skeleton loading**: la pagina viaggio mostra un'animazione di caricamento elegante al posto della schermata blu "Loading..."
- **Protezione modifiche non salvate (SafeClose)**: chiudendo il pannello attività con modifiche in corso, viene mostrata una conferma per evitare perdite accidentali
- **Categorie treni e bus nelle attività**: treni e bus ora appaiono con icona, colore e filtro dedicati nella tab Attività

### Miglioramenti
- Card treni e bus nella vista card attività ora seguono lo stesso layout delle card voli (badge numero, orario partenza, percorso)
- Colori treni (arancione) e bus (viola) allineati tra tab Attività e card prenotazioni
- Le icone nei tab si nascondono solo quando ci sono 4+ tab (prima sparivano sempre su mobile)

### Fix
- Corretto errore "updatePreview is not defined" al caricamento PDF dal pulsante "+"
- Corretta categorizzazione treni/bus nella tab Attività (prima apparivano come "luogo")

## 0.31 - 2026-03-07

### Novità
- **Tab dinamiche**: i tab (Voli, Hotel, Treni, Bus) appaiono solo quando ci sono prenotazioni del tipo corrispondente
- **Bottone "+" per aggiungere**: nuovo pulsante fisso in basso a destra per caricare prenotazioni o aggiungere attività
- **Pagina viaggio vuota rinnovata**: nuovo stato vuoto con azioni rapide per iniziare ad organizzare il viaggio

### Miglioramenti
- Rimossi i bottoni "Aggiungi" e le card di upload dai singoli tab — tutto passa dal pulsante "+"
- Interfaccia più pulita con meno elementi ripetuti

## 0.30 - 2026-03-07

### Novità
- **Rilevamento aggiornamenti prenotazioni**: caricando un PDF aggiornato su un viaggio esistente, il sistema rileva automaticamente le modifiche (date, orari, etc.) e mostra un confronto prima/dopo
- **Gestione PDF multi-passeggero**: dopo aver aggiornato una prenotazione, puoi caricare le ricevute aggiornate anche per gli altri passeggeri
- **Carica PDF mancanti**: nuova azione "Carica PDF" nelle card passeggero, per aggiungere ricevute mancanti direttamente dal dettaglio volo

### Miglioramenti
- **Propagazione PDF automatica**: il PDF caricato viene associato automaticamente a tutti i voli della stessa prenotazione per lo stesso passeggero
- **Supporto treni e bus**: il parsing e l'aggiunta prenotazioni supportano ora anche treni e bus con rilevamento aggiornamenti

## 0.29.1 - 2026-03-05

### Fix
- **Fix hover appiccicoso su smartphone**: i tab delle impostazioni non restano più evidenziati dopo il tap su dispositivi touch

## 0.29 - 2026-03-05

### Novità
- **Sidebar fissa**: nuova sidebar laterale sempre visibile su desktop (espandibile/comprimibile), sostituisce il menu hamburger
- **Navigazione istantanea**: il passaggio tra pagine e dettaglio viaggio avviene senza ricaricare la pagina, mantenendo la sidebar sempre visibile
- **Pagina viaggi passati**: nuova pagina dedicata ai viaggi conclusi, accessibile dalla sidebar

### Miglioramenti
- **Layout desktop migliorato**: contenuto principale si adatta alla sidebar con transizioni fluide
- **Sidebar mobile**: si apre come overlay con animazione, chiudibile con tap fuori o ESC
- **Stato sidebar persistente**: la scelta espansa/compressa viene salvata e ricordata

## 0.28.3 - 2026-03-04

### Fix
- **Fix inviti duplicati**: gestione corretta con `.limit(1)` quando esistono più inviti per la stessa email in `trip_invitations` (errore PGRST116 con `maybeSingle`)
- **Fix accesso senza link di invito**: il backend verifica l'email nella tabella `trip_invitations` oltre al token, permettendo l'accesso anche senza il link diretto
- **Fix modale username su iOS**: aggiunto colori espliciti e `-webkit-text-fill-color` per input visibile, suggerimento nome da email

### Miglioramenti
- **Inviti non auto-accettati**: `acceptPendingInvitesByEmail` ora converte `trip_invitations` in `trip_collaborators` con `status: 'pending'` + notifica `collaboration_invite` con accetta/rifiuta (non più accettazione automatica)
- **Conversione inviti al login**: la conversione viene eseguita ad ogni login (fire-and-forget) e dopo la creazione del profilo

## 0.28.2 - 2026-03-04

### Fix
- **Fix accesso utenti invitati**: il token di invito viene ora verificato dal backend in `check-registration-access`, risolvendo il problema di accesso con Google OAuth quando l'email differisce da quella invitata
- **Fix modale blocco registrazione**: aggiunto flag `_blockingRegistration` per evitare che il listener `SIGNED_OUT` faccia redirect prima che la modale sia visibile
- **Fix accept-invite email mismatch**: rimosso il blocco rigido sull'email in `accept-invite` — il possesso del token è sufficiente

### Miglioramenti
- **SmartParse treni**: estrattore L2 dedicato per biglietti Trenitalia (stazioni, orari, PNR, passeggeri, de-duplicazione pagine)
- **Brand detection**: aggiunto riconoscimento Trenitalia e Italo

## 0.28 - 2026-03-04

### Fix
- **Fix invito utenti non registrati**: rimossa la chiamata `inviteUserByEmail` che creava un utente fantasma in `auth.users` causando conflitto con Google OAuth. Ora l'invito genera un link copiabile che l'invitante condivide manualmente (WhatsApp, Telegram, ecc.)
- **Link invito nel share modal**: dopo aver invitato un utente non registrato, il link di invito appare sotto il nome dell'invitato nella lista collaboratori con pulsante copia
- **Reinvia invito**: il pulsante "Reinvia" mostra il link copiabile sotto la riga dell'invitato invece di inviare un'email

### Miglioramenti
- **Open Graph meta tags**: aggiunto supporto per la preview del link su WhatsApp/Telegram (titolo, descrizione, immagine)
- **SmartParse v2.1**: estrazione template L2 per provider noti (0 chiamate AI per provider già processati)
- **Admin dashboard**: miglioramenti alla gestione PDF log e statistiche
- **Trip creator**: miglioramenti al flusso di creazione viaggio
- **Trip page**: miglioramenti UI e nuove funzionalità

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
