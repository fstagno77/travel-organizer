/**
 * Help Detail Page — pagina di dettaglio per ogni categoria
 */

const helpDetailPage = {

  currentLang: 'it',

  // ─── Contenuti per sezione ────────────────────────────────────────────────
  CONTENT: {

    // ── INIZIA QUI ────────────────────────────────────────────────────────
    'inizia-qui': {
      it: {
        title: 'Inizia qui',
        desc: 'Tutto quello che ti serve per creare il tuo primo viaggio con Travel Flow',
        articles: [
          {
            id: 'cosa-e-travel-flow',
            title: 'Cos\'è Travel Flow?',
            intro: 'Travel Flow è il tuo organizzatore di viaggio personale: carica un PDF di prenotazione e l\'itinerario è pronto in secondi.',
            steps: [
              { text: 'Travel Flow analizza automaticamente i tuoi PDF di conferma — voli, hotel, treni, bus, noleggi auto — ed estrae tutti i dati senza che tu debba digitare nulla.' },
              { text: 'Ogni viaggio è una raccolta di prenotazioni arricchita con attività personalizzate e condivisibile con i tuoi compagni in tempo reale.' },
              { text: 'Puoi accedere con Google o con OTP via email. Non serve creare una password.' },
            ],
            tips: [
              { type: 'info', text: 'Travel Flow è una piattaforma ad accesso su invito: puoi registrarti solo se hai ricevuto un invito da un utente esistente o dall\'amministratore.' },
            ],
            result: 'Dopo il primo accesso trovi la schermata principale con i tuoi viaggi e il pulsante per crearne uno nuovo.',
          },
          {
            id: 'crea-primo-viaggio',
            title: 'Come creare il tuo primo viaggio',
            intro: 'Crea un viaggio completo in meno di 60 secondi caricando il PDF della tua prenotazione.',
            steps: [
              { text: 'Clicca su "Nuovo Viaggio" nella barra laterale sinistra (su mobile: icona + in basso a destra).', image: 'inizia-qui/01-nuovo-viaggio.png' },
              { text: 'Si apre il pannello di caricamento. Trascina un PDF di prenotazione nell\'area oppure clicca per selezionarlo dal dispositivo.', image: 'inizia-qui/02-upload-area.png' },
              { text: 'Travel Flow analizza il documento e mostra un\'anteprima con i dati estratti: titolo viaggio, date, rotta, passeggeri.', image: 'inizia-qui/03-anteprima.png' },
              { text: 'Controlla i dati e clicca "Salva viaggio" per confermare.' },
            ],
            tips: [
              { type: 'tip', text: 'Puoi aggiungere subito altre prenotazioni (hotel, treni, noleggio) cliccando il menu ⋮ del viaggio e scegliendo "Aggiungi prenotazione".' },
            ],
            result: 'Il viaggio appare in lista con titolo, date e rotta estratti automaticamente. Clicca sulla card per aprire l\'itinerario completo.',
            related: ['voli', 'hotel'],
          },
          {
            id: 'aggiungere-prenotazioni',
            title: 'Aggiungere altre prenotazioni a un viaggio',
            intro: 'Arricchisci il tuo viaggio con voli di ritorno, hotel, treni e noleggi senza creare un nuovo viaggio.',
            steps: [
              { text: 'Apri il viaggio e clicca sull\'icona ⋮ (menu contestuale) accanto al titolo.' },
              { text: 'Seleziona "Aggiungi prenotazione". Si apre lo stesso pannello di caricamento PDF.' },
              { text: 'Carica il PDF della nuova prenotazione. Travel Flow la aggiunge automaticamente alla timeline del viaggio esistente.' },
            ],
            tips: [
              { type: 'tip', text: 'Puoi aggiungere più prenotazioni dello stesso tipo (es. due voli di andata/ritorno, due hotel in città diverse).' },
              { type: 'warn', text: 'Se carichi un PDF già presente nel viaggio, il sistema lo riconosce e non crea duplicati.' },
            ],
            result: 'La nuova prenotazione appare nel tab corrispondente (Voli, Hotel, ecc.) e nel tab Attività nella posizione cronologica corretta.',
          },
          {
            id: 'rinominare-eliminare-viaggio',
            title: 'Rinominare o eliminare un viaggio',
            intro: 'Mantieni i tuoi viaggi organizzati rinominandoli o rimuovi quelli che non ti servono più.',
            steps: [
              { text: 'Apri il viaggio e clicca sull\'icona ⋮ nel menu del viaggio.' },
              { text: 'Per rinominare: seleziona "Rinomina viaggio", digita il nuovo nome e conferma.' },
              { text: 'Per eliminare: seleziona "Elimina viaggio". Viene richiesta una conferma esplicita — l\'operazione è irreversibile.' },
            ],
            tips: [
              { type: 'warn', text: 'Solo il Proprietario del viaggio può eliminarlo. Viaggiatori e Ospiti non vedono questa opzione.' },
            ],
            result: 'Il viaggio viene rinominato immediatamente o eliminato con tutti i dati associati (prenotazioni, attività, collaboratori).',
          },
          {
            id: 'inoltro-email',
            title: 'Aggiungere prenotazioni via email (inoltro)',
            intro: 'Il modo più rapido per importare una conferma: inoltra l\'email direttamente a Travel Flow senza aprire il browser.',
            steps: [
              { text: 'Apri l\'email di conferma della prenotazione (volo, hotel, treno, noleggio) nel tuo client di posta.' },
              { text: 'Inoltrala a trips@travel-flow.com usando lo stesso indirizzo email con cui sei registrato su Travel Flow.' },
              { text: 'Travel Flow elabora l\'email automaticamente — con PDF allegato se presente, oppure direttamente dal corpo HTML.' },
              { text: 'Dopo l\'elaborazione, una nuova prenotazione in sospeso appare nel badge campanella in alto a destra.' },
              { text: 'Clicca il badge, apri la prenotazione e scegli: aggiungi a un viaggio esistente oppure crea un nuovo viaggio.', image: 'inizia-qui/04-pending-booking.png' },
            ],
            tips: [
              { type: 'tip', text: 'Funziona con qualsiasi email di conferma: non serve che sia un PDF. Travel Flow legge anche il corpo HTML delle email direttamente.' },
              { type: 'warn', text: 'Devi inoltrare dall\'indirizzo email con cui sei registrato su Travel Flow. Inoltri da indirizzi non riconosciuti vengono ignorati.' },
            ],
            result: 'La prenotazione viene estratta automaticamente e messa in coda. Puoi associarla a un viaggio o crearne uno nuovo con un clic, senza digitare nulla.',
            related: ['notifiche'],
          },
          {
            id: 'smartparse',
            title: 'Come funziona il riconoscimento automatico (SmartParse)',
            intro: 'SmartParse riconosce il formato del PDF e estrae i dati in modo intelligente, imparando dai nuovi formati nel tempo.',
            steps: [
              { text: 'Livello 1 — Cache: se hai già caricato un PDF dello stesso provider, i dati vengono estratti istantaneamente senza chiamate AI.' },
              { text: 'Livello 2 — Template: se il formato è conosciuto ma non in cache, usa regole di estrazione precostruite (pochi secondi).' },
              { text: 'Livello 4 — AI Claude: se il formato è nuovo, l\'AI analizza il testo del documento e ne estrae i campi. Dopo la prima analisi, il template viene salvato per usi futuri.' },
            ],
            tips: [
              { type: 'info', text: 'I provider supportati includono: ITA Airways, Ryanair, EasyJet, Vueling, Emirates, Booking.com, Expedia, Trenitalia, Italo. La lista cresce con ogni nuovo formato processato.' },
            ],
            result: 'Il risultato viene mostrato in anteprima prima del salvataggio. Puoi sempre modificare i campi estratti se necessario.',
          },
          {
            id: 'accesso-invito',
            title: 'Accedere tramite link di invito',
            intro: 'Se hai ricevuto un link di invito a un viaggio, puoi unirti anche prima di completare la registrazione.',
            steps: [
              { text: 'Apri il link di invito ricevuto. Verrai reindirizzato alla pagina di accesso di Travel Flow.' },
              { text: 'Se hai già un account, accedi normalmente. L\'accettazione dell\'invito avviene automaticamente.' },
              { text: 'Se non hai un account, segui il flusso di registrazione (richiede email di invito piattaforma). Al termine sarai aggiunto al viaggio nel ruolo assegnato.' },
            ],
            tips: [
              { type: 'info', text: 'Il link di invito è personale e valido una sola volta. Non condividerlo con altri.' },
            ],
            result: 'Dopo l\'accesso vieni portato direttamente al viaggio condiviso, già nel ruolo (Viaggiatore o Ospite) che il Proprietario ti ha assegnato.',
            related: ['collaborazione'],
          },
        ],
      },
      en: {
        title: 'Getting Started',
        desc: 'Everything you need to create your first trip with Travel Flow',
        articles: [
          {
            id: 'cosa-e-travel-flow',
            title: 'What is Travel Flow?',
            intro: 'Travel Flow is your personal trip organizer: upload a booking PDF and your itinerary is ready in seconds.',
            steps: [
              { text: 'Travel Flow automatically analyzes your confirmation PDFs — flights, hotels, trains, buses, car rentals — and extracts all data without you having to type anything.' },
              { text: 'Each trip is a collection of bookings enriched with custom activities and shareable with your companions in real time.' },
              { text: 'You can sign in with Google or with OTP via email. No password required.' },
            ],
            tips: [
              { type: 'info', text: 'Travel Flow is an invite-only platform: you can only register if you\'ve received an invitation from an existing user or the administrator.' },
            ],
            result: 'After your first login you see the main screen with your trips and a button to create a new one.',
          },
          {
            id: 'crea-primo-viaggio',
            title: 'How to create your first trip',
            intro: 'Create a complete trip in under 60 seconds by uploading your booking PDF.',
            steps: [
              { text: 'Click "New Trip" in the left sidebar (on mobile: + icon at bottom right).', image: 'inizia-qui/01-nuovo-viaggio.png' },
              { text: 'The upload panel opens. Drag a booking PDF into the area or click to select it from your device.', image: 'inizia-qui/02-upload-area.png' },
              { text: 'Travel Flow analyzes the document and shows a preview with extracted data: trip title, dates, route, passengers.', image: 'inizia-qui/03-anteprima.png' },
              { text: 'Check the data and click "Save trip" to confirm.' },
            ],
            tips: [
              { type: 'tip', text: 'You can immediately add more bookings (hotel, trains, rental) by clicking the ⋮ menu of the trip and choosing "Add booking".' },
            ],
            result: 'The trip appears in the list with title, dates, and route extracted automatically. Click the card to open the full itinerary.',
            related: ['voli', 'hotel'],
          },
          {
            id: 'aggiungere-prenotazioni',
            title: 'Adding more bookings to a trip',
            intro: 'Enrich your trip with return flights, hotels, trains, and rentals without creating a new trip.',
            steps: [
              { text: 'Open the trip and click the ⋮ icon (context menu) next to the title.' },
              { text: 'Select "Add booking". The same PDF upload panel opens.' },
              { text: 'Upload the PDF of the new booking. Travel Flow adds it automatically to the existing trip timeline.' },
            ],
            tips: [
              { type: 'tip', text: 'You can add multiple bookings of the same type (e.g. two outbound/return flights, two hotels in different cities).' },
              { type: 'warn', text: 'If you upload a PDF already in the trip, the system recognizes it and won\'t create duplicates.' },
            ],
            result: 'The new booking appears in the corresponding tab (Flights, Hotels, etc.) and in the Activities tab in the correct chronological position.',
          },
          {
            id: 'rinominare-eliminare-viaggio',
            title: 'Renaming or deleting a trip',
            intro: 'Keep your trips organized by renaming them or remove ones you no longer need.',
            steps: [
              { text: 'Open the trip and click the ⋮ icon in the trip menu.' },
              { text: 'To rename: select "Rename trip", type the new name and confirm.' },
              { text: 'To delete: select "Delete trip". Explicit confirmation is required — this action is irreversible.' },
            ],
            tips: [
              { type: 'warn', text: 'Only the trip Owner can delete it. Travelers and Guests don\'t see this option.' },
            ],
            result: 'The trip is renamed immediately or deleted with all associated data (bookings, activities, collaborators).',
          },
          {
            id: 'smartparse',
            title: 'How automatic recognition works (SmartParse)',
            intro: 'SmartParse recognizes the PDF format and extracts data intelligently, learning from new formats over time.',
            steps: [
              { text: 'Level 1 — Cache: if you\'ve already uploaded a PDF from the same provider, data is extracted instantly without AI calls.' },
              { text: 'Level 2 — Template: if the format is known but not cached, it uses pre-built extraction rules (a few seconds).' },
              { text: 'Level 4 — Claude AI: if the format is new, AI analyzes the document text and extracts the fields. After the first analysis, the template is saved for future use.' },
            ],
            tips: [
              { type: 'info', text: 'Supported providers include: ITA Airways, Ryanair, EasyJet, Vueling, Emirates, Booking.com, Expedia, Trenitalia, Italo. The list grows with each new format processed.' },
            ],
            result: 'The result is shown in a preview before saving. You can always edit the extracted fields if needed.',
          },
          {
            id: 'inoltro-email',
            title: 'Adding bookings by email (forwarding)',
            intro: 'The fastest way to import a confirmation: forward the email directly to Travel Flow without opening a browser.',
            steps: [
              { text: 'Open the booking confirmation email (flight, hotel, train, rental) in your mail client.' },
              { text: 'Forward it to trips@travel-flow.com using the same email address you registered with on Travel Flow.' },
              { text: 'Travel Flow processes the email automatically — from an attached PDF if present, or directly from the HTML body.' },
              { text: 'After processing, a new pending booking appears in the bell badge at the top right.' },
              { text: 'Click the badge, open the booking and choose: add to an existing trip or create a new trip.', image: 'inizia-qui/04-pending-booking.png' },
            ],
            tips: [
              { type: 'tip', text: 'Works with any confirmation email: no PDF needed. Travel Flow can read the HTML body of emails directly.' },
              { type: 'warn', text: 'You must forward from the email address registered with Travel Flow. Forwards from unrecognized addresses are ignored.' },
            ],
            result: 'The booking is extracted automatically and queued. You can associate it with a trip or create a new one with a single click, no typing required.',
            related: ['notifiche'],
          },
          {
            id: 'accesso-invito',
            title: 'Joining via invite link',
            intro: 'If you received a trip invite link, you can join even before completing registration.',
            steps: [
              { text: 'Open the invite link you received. You\'ll be redirected to the Travel Flow sign-in page.' },
              { text: 'If you already have an account, sign in normally. The invitation is accepted automatically.' },
              { text: 'If you don\'t have an account, follow the registration flow (requires a platform invite email). You\'ll be added to the trip in the assigned role.' },
            ],
            tips: [
              { type: 'info', text: 'The invite link is personal and valid once only. Don\'t share it with others.' },
            ],
            result: 'After signing in you\'re taken directly to the shared trip, already in the role (Traveler or Guest) the Owner assigned you.',
            related: ['collaborazione'],
          },
        ],
      },
    },

    // ── VOLI ──────────────────────────────────────────────────────────────
    'voli': {
      it: {
        title: 'Voli',
        desc: 'Gestisci voli, passeggeri e prenotazioni aeree',
        articles: [
          {
            id: 'leggere-card-volo',
            title: 'Come leggere una card volo',
            intro: 'Ogni card volo mostra le informazioni essenziali del tuo volo in modo chiaro e compatto.',
            steps: [
              { text: 'Nella card principale trovi: numero volo, compagnia, data, orario di partenza/arrivo, codici aeroporto (IATA) e rotta.', image: 'voli/01-card-volo.png' },
              { text: 'Il nome del passeggero principale e il codice di prenotazione (PNR) sono visibili sotto i dettagli del volo.' },
              { text: 'Clicca su "Mostra dettagli" per vedere tutti i dettagli: gate, classe, numero poltrona, bagaglio incluso.' },
            ],
            result: 'Hai una visione completa del tuo volo senza dover aprire il PDF originale.',
          },
          {
            id: 'espandere-dettagli-volo',
            title: 'Espandere i dettagli del volo',
            intro: 'Il pannello espanso mostra informazioni aggiuntive su gate, classe e bagaglio.',
            steps: [
              { text: 'Clicca sul pulsante "Mostra dettagli" in fondo alla card per espandere il pannello.' },
              { text: 'Visualizza: numero poltrona, classe di viaggio (Economy/Business), bagaglio incluso, gate di imbarco (se disponibile).' },
              { text: 'Per i voli multi-passeggero, scorrendo vedi tutti i passeggeri con i rispettivi posti e numeri di biglietto.' },
            ],
            tips: [
              { type: 'info', text: 'Alcuni campi potrebbero non essere presenti se il PDF non li conteneva o non è stato possibile estrarli.' },
            ],
            result: 'Tutti i dettagli del volo sono accessibili senza uscire dall\'app.',
          },
          {
            id: 'volo-multi-passeggero',
            title: 'Gestire voli con più passeggeri',
            intro: 'Travel Flow gestisce automaticamente le prenotazioni di gruppo con passeggeri multipli sullo stesso volo.',
            steps: [
              { text: 'Carica il PDF di conferma del gruppo. SmartParse riconosce tutti i passeggeri presenti nel documento.' },
              { text: 'Nella card volo espansa trovi la lista di tutti i passeggeri, ciascuno con il proprio numero di biglietto e posto assegnato.' },
              { text: 'Per rimuovere un passeggero specifico dalla lista (es. separazione del gruppo), clicca sull\'icona ✕ accanto al suo nome.' },
            ],
            tips: [
              { type: 'warn', text: 'La rimozione di un passeggero è definitiva. Per riaggiungerlo devi ricaricare il PDF originale.' },
            ],
            result: 'Tutti i passeggeri del gruppo sono visibili e gestibili dalla stessa card volo.',
            related: ['inizia-qui'],
          },
          {
            id: 'modificare-volo',
            title: 'Modificare i dati di un volo',
            intro: 'Se SmartParse ha estratto un dato errato o incompleto, puoi correggerlo direttamente dall\'app.',
            steps: [
              { text: 'Apri la card volo e clicca sull\'icona matita (modifica) nel menu della card.' },
              { text: 'Nel pannello di modifica, correggi i campi necessari: numero volo, orari, aeroporti, passeggeri.' },
              { text: 'Clicca "Salva" per confermare le modifiche. I collaboratori del viaggio ricevono una notifica.' },
            ],
            tips: [
              { type: 'tip', text: 'Le modifiche manuali sovrascrivono i dati estratti automaticamente, ma non modificano il PDF originale.' },
            ],
            result: 'I dati corretti vengono salvati e la card volo si aggiorna immediatamente.',
          },
          {
            id: 'eliminare-volo',
            title: 'Eliminare un volo dal viaggio',
            intro: 'Rimuovi un volo che non fa più parte del tuo itinerario.',
            steps: [
              { text: 'Apri la card volo e clicca sull\'icona ⋮ o il pulsante "Elimina" nel menu della card.' },
              { text: 'Conferma l\'eliminazione nella finestra di dialogo.' },
            ],
            tips: [
              { type: 'warn', text: 'Solo Proprietari e Viaggiatori possono eliminare prenotazioni. Gli Ospiti non vedono questa opzione.' },
            ],
            result: 'Il volo viene rimosso dall\'itinerario e dal tab Attività. L\'azione genera una notifica ai collaboratori.',
            related: ['collaborazione'],
          },
        ],
      },
      en: {
        title: 'Flights',
        desc: 'Manage flights, passengers and airline bookings',
        articles: [
          {
            id: 'leggere-card-volo',
            title: 'How to read a flight card',
            intro: 'Each flight card shows the essential information for your flight clearly and compactly.',
            steps: [
              { text: 'The main card shows: flight number, airline, date, departure/arrival times, airport codes (IATA), and route.', image: 'voli/01-card-volo.png' },
              { text: 'The main passenger\'s name and booking reference (PNR) are visible below the flight details.' },
              { text: 'Click "Show details" to see all details: gate, class, seat number, included baggage.' },
            ],
            result: 'You get a complete view of your flight without needing to open the original PDF.',
          },
          {
            id: 'espandere-dettagli-volo',
            title: 'Expanding flight details',
            intro: 'The expanded panel shows additional information about gate, class, and baggage.',
            steps: [
              { text: 'Click the "Show details" button at the bottom of the card to expand the panel.' },
              { text: 'View: seat number, travel class (Economy/Business), included baggage, boarding gate (if available).' },
              { text: 'For multi-passenger flights, scroll to see all passengers with their seats and ticket numbers.' },
            ],
            tips: [
              { type: 'info', text: 'Some fields may be absent if the PDF didn\'t contain them or they couldn\'t be extracted.' },
            ],
            result: 'All flight details are accessible without leaving the app.',
          },
          {
            id: 'volo-multi-passeggero',
            title: 'Managing flights with multiple passengers',
            intro: 'Travel Flow automatically handles group bookings with multiple passengers on the same flight.',
            steps: [
              { text: 'Upload the group confirmation PDF. SmartParse recognizes all passengers in the document.' },
              { text: 'In the expanded flight card you find the list of all passengers, each with their own ticket number and assigned seat.' },
              { text: 'To remove a specific passenger (e.g. group separation), click the ✕ icon next to their name.' },
            ],
            tips: [
              { type: 'warn', text: 'Removing a passenger is permanent. To re-add them you need to re-upload the original PDF.' },
            ],
            result: 'All group passengers are visible and manageable from the same flight card.',
            related: ['inizia-qui'],
          },
          {
            id: 'modificare-volo',
            title: 'Editing flight data',
            intro: 'If SmartParse extracted incorrect or incomplete data, you can correct it directly in the app.',
            steps: [
              { text: 'Open the flight card and click the pencil (edit) icon in the card menu.' },
              { text: 'In the edit panel, correct the necessary fields: flight number, times, airports, passengers.' },
              { text: 'Click "Save" to confirm. Trip collaborators receive a notification.' },
            ],
            tips: [
              { type: 'tip', text: 'Manual edits overwrite automatically extracted data, but don\'t modify the original PDF.' },
            ],
            result: 'The corrected data is saved and the flight card updates immediately.',
          },
          {
            id: 'eliminare-volo',
            title: 'Deleting a flight from the trip',
            intro: 'Remove a flight that is no longer part of your itinerary.',
            steps: [
              { text: 'Open the flight card and click the ⋮ icon or "Delete" button in the card menu.' },
              { text: 'Confirm the deletion in the dialog.' },
            ],
            tips: [
              { type: 'warn', text: 'Only Owners and Travelers can delete bookings. Guests don\'t see this option.' },
            ],
            result: 'The flight is removed from the itinerary and the Activities tab. The action generates a notification to collaborators.',
            related: ['collaborazione'],
          },
        ],
      },
    },

    // ── HOTEL ─────────────────────────────────────────────────────────────
    'hotel': {
      it: {
        title: 'Hotel',
        desc: 'Prenotazioni hotel, check-in e check-out',
        articles: [
          {
            id: 'leggere-card-hotel',
            title: 'Come leggere una card hotel',
            intro: 'La card hotel mostra in sintesi struttura, date e numero di conferma della prenotazione.',
            steps: [
              { text: 'Nella card principale trovi: nome dell\'hotel, città, date di check-in e check-out, numero notti.', image: 'hotel/01-card-hotel.png' },
              { text: 'Il numero di conferma e l\'indirizzo completo sono visibili cliccando su "Mostra dettagli".' },
              { text: 'L\'icona calendario mostra le date in formato compatto (gg/mm).' },
            ],
            result: 'Hai un riepilogo immediato di ogni soggiorno senza aprire il PDF.',
          },
          {
            id: 'espandere-dettagli-hotel',
            title: 'Espandere i dettagli dell\'hotel',
            intro: 'Il pannello espanso mostra indirizzo, tipo di camera e condizioni di cancellazione.',
            steps: [
              { text: 'Clicca sul pulsante "Mostra dettagli" nella card hotel.' },
              { text: 'Visualizza: indirizzo completo, tipo di camera, regime (colazione inclusa, solo pernottamento), condizioni di cancellazione se estratte.' },
              { text: 'Per hotel con più camere o ospiti, ogni soggiorno è mostrato separatamente.' },
            ],
            tips: [
              { type: 'tip', text: 'Clicca sull\'indirizzo per aprirlo direttamente in Google Maps.' },
            ],
            result: 'Tutti i dettagli del soggiorno sono accessibili da un\'unica schermata.',
          },
          {
            id: 'hotel-timeline',
            title: 'Hotel nel tab Attività',
            intro: 'Il tab Attività mostra check-in, soggiorno e check-out come eventi distinti nella timeline giornaliera.',
            steps: [
              { text: 'Apri il tab Attività del viaggio.' },
              { text: 'Nel giorno del check-in trovi l\'evento "Check-in: [nome hotel]" con l\'orario standard (14:00 se non specificato).' },
              { text: 'Nei giorni intermedi trovi l\'evento "Soggiorno: [nome hotel]".' },
              { text: 'Nel giorno del check-out trovi l\'evento "Check-out: [nome hotel]" (11:00 se non specificato).' },
            ],
            tips: [
              { type: 'info', text: 'Gli orari di check-in e check-out mostrati sono quelli estratti dal PDF. Se non presenti, vengono usati gli standard internazionali.' },
            ],
            result: 'Puoi vedere tutti i giorni del soggiorno nella timeline senza dover consultare la card hotel separatamente.',
            related: ['attivita'],
          },
          {
            id: 'modificare-hotel',
            title: 'Modificare i dati di un hotel',
            intro: 'Correggi i dati estratti o aggiorna le date del soggiorno direttamente dall\'app.',
            steps: [
              { text: 'Apri la card hotel e clicca sull\'icona matita nel menu della card.' },
              { text: 'Modifica i campi necessari: nome hotel, date, indirizzo, numero di conferma.' },
              { text: 'Clicca "Salva" per confermare.' },
            ],
            result: 'La card hotel e la timeline si aggiornano immediatamente con i nuovi dati.',
          },
          {
            id: 'eliminare-hotel',
            title: 'Eliminare un hotel dal viaggio',
            intro: 'Rimuovi una prenotazione hotel annullata o non più valida.',
            steps: [
              { text: 'Apri la card hotel e clicca su "Elimina" nel menu della card.' },
              { text: 'Conferma l\'eliminazione.' },
            ],
            tips: [
              { type: 'warn', text: 'L\'eliminazione rimuove la prenotazione anche dalla timeline nel tab Attività.' },
            ],
            result: 'L\'hotel viene rimosso dall\'itinerario e i collaboratori ricevono una notifica.',
          },
        ],
      },
      en: {
        title: 'Hotels',
        desc: 'Hotel bookings, check-in and check-out',
        articles: [
          {
            id: 'leggere-card-hotel',
            title: 'How to read a hotel card',
            intro: 'The hotel card summarizes the property, dates, and booking confirmation number.',
            steps: [
              { text: 'The main card shows: hotel name, city, check-in and check-out dates, number of nights.', image: 'hotel/01-card-hotel.png' },
              { text: 'The confirmation number and full address are visible by clicking "Show details".' },
              { text: 'The calendar icon shows dates in compact format (dd/mm).' },
            ],
            result: 'You get an immediate summary of each stay without opening the PDF.',
          },
          {
            id: 'espandere-dettagli-hotel',
            title: 'Expanding hotel details',
            intro: 'The expanded panel shows address, room type, and cancellation conditions.',
            steps: [
              { text: 'Click the "Show details" button in the hotel card.' },
              { text: 'View: full address, room type, board basis (breakfast included, room only), cancellation conditions if extracted.' },
              { text: 'For hotels with multiple rooms or guests, each stay is shown separately.' },
            ],
            tips: [
              { type: 'tip', text: 'Click the address to open it directly in Google Maps.' },
            ],
            result: 'All stay details are accessible from a single screen.',
          },
          {
            id: 'hotel-timeline',
            title: 'Hotels in the Activities tab',
            intro: 'The Activities tab shows check-in, stay, and check-out as distinct events in the daily timeline.',
            steps: [
              { text: 'Open the trip\'s Activities tab.' },
              { text: 'On check-in day you find the "Check-in: [hotel name]" event with the standard time (14:00 if not specified).' },
              { text: 'On intermediate days you find the "Stay: [hotel name]" event.' },
              { text: 'On check-out day you find "Check-out: [hotel name]" (11:00 if not specified).' },
            ],
            tips: [
              { type: 'info', text: 'Check-in/check-out times shown are those extracted from the PDF. If absent, international standards are used.' },
            ],
            result: 'You can see all stay days in the timeline without consulting the hotel card separately.',
            related: ['attivita'],
          },
          {
            id: 'modificare-hotel',
            title: 'Editing hotel data',
            intro: 'Correct extracted data or update stay dates directly in the app.',
            steps: [
              { text: 'Open the hotel card and click the pencil icon in the card menu.' },
              { text: 'Edit the necessary fields: hotel name, dates, address, confirmation number.' },
              { text: 'Click "Save" to confirm.' },
            ],
            result: 'The hotel card and timeline update immediately with the new data.',
          },
          {
            id: 'eliminare-hotel',
            title: 'Deleting a hotel from the trip',
            intro: 'Remove a cancelled or no longer valid hotel booking.',
            steps: [
              { text: 'Open the hotel card and click "Delete" in the card menu.' },
              { text: 'Confirm the deletion.' },
            ],
            tips: [
              { type: 'warn', text: 'Deletion also removes the booking from the timeline in the Activities tab.' },
            ],
            result: 'The hotel is removed from the itinerary and collaborators receive a notification.',
          },
        ],
      },
    },

    // ── TRENI ─────────────────────────────────────────────────────────────
    'treni': {
      it: {
        title: 'Treni',
        desc: 'Biglietti ferroviari integrati nell\'itinerario giornaliero',
        articles: [
          {
            id: 'aggiungere-treno',
            title: 'Aggiungere un biglietto treno',
            intro: 'Carica il PDF del biglietto ferroviario e Travel Flow lo integra automaticamente nel tuo itinerario.',
            steps: [
              { text: 'Nel viaggio, clicca su ⋮ e seleziona "Aggiungi prenotazione".' },
              { text: 'Carica il PDF del biglietto treno (Trenitalia, Italo o altro operatore supportato).' },
              { text: 'SmartParse estrae: treno, stazioni di partenza/arrivo, orari, passeggero e numero prenotazione.' },
            ],
            tips: [
              { type: 'info', text: 'I treni sono una funzione in beta. Alcuni campi potrebbero non essere estratti correttamente da tutti i provider.' },
            ],
            result: 'Il treno appare nella timeline del tab Attività nel giorno e orario corretti.',
            related: ['attivita'],
          },
          {
            id: 'leggere-card-treno',
            title: 'Come leggere una card treno',
            intro: 'La card treno mostra partenza, arrivo, orari e numero prenotazione in formato compatto.',
            steps: [
              { text: 'Nella card treno trovi: numero treno, stazioni di partenza e arrivo, orari, data.' },
              { text: 'Clicca su "Mostra dettagli" per vedere il numero di prenotazione, la classe e il posto assegnato (se disponibili).' },
            ],
            result: 'Tutte le informazioni del viaggio in treno sono consultabili senza aprire il PDF.',
          },
          {
            id: 'treno-attivita',
            title: 'Treni nella timeline Attività',
            intro: 'I treni appaiono come eventi nel tab Attività insieme a voli, hotel e attività personalizzate.',
            steps: [
              { text: 'Apri il tab Attività del viaggio.' },
              { text: 'Nel giorno del viaggio in treno trovi l\'evento con orario di partenza, stazione di partenza e arrivo.' },
              { text: 'Clicca su "Dettagli" per tornare alla card treno nel tab dedicato.' },
            ],
            result: 'Il treno è integrato nella visione giornaliera dell\'itinerario.',
          },
          {
            id: 'modificare-treno',
            title: 'Modificare un biglietto treno',
            intro: 'Correggi i dati estratti se necessario.',
            steps: [
              { text: 'Apri la card treno e clicca sull\'icona matita.' },
              { text: 'Modifica i campi necessari e salva.' },
            ],
            result: 'Le modifiche vengono riflesse nella timeline e i collaboratori vengono notificati.',
          },
          {
            id: 'treni-beta',
            title: 'Nota sulla versione beta',
            intro: 'Il supporto treni è in fase beta attiva con miglioramenti continui.',
            steps: [
              { text: 'I provider attualmente testati sono Trenitalia e Italo.' },
              { text: 'Per PDF di altri operatori ferroviari, SmartParse usa l\'AI per tentare l\'estrazione.' },
              { text: 'Se i dati non vengono estratti correttamente, puoi modificarli manualmente dopo l\'importazione.' },
            ],
            tips: [
              { type: 'info', text: 'Hai un PDF di un operatore non supportato? Contatta il supporto — ogni nuovo formato migliora il sistema per tutti.' },
            ],
            result: 'Anche i formati non standard vengono gestiti dall\'AI con un\'anteprima modificabile prima del salvataggio.',
          },
        ],
      },
      en: {
        title: 'Trains',
        desc: 'Train tickets integrated into your daily itinerary',
        articles: [
          {
            id: 'aggiungere-treno',
            title: 'Adding a train ticket',
            intro: 'Upload the train ticket PDF and Travel Flow integrates it automatically into your itinerary.',
            steps: [
              { text: 'In the trip, click ⋮ and select "Add booking".' },
              { text: 'Upload the train ticket PDF (Trenitalia, Italo or other supported operator).' },
              { text: 'SmartParse extracts: train, departure/arrival stations, times, passenger and booking number.' },
            ],
            tips: [
              { type: 'info', text: 'Trains are a beta feature. Some fields may not be correctly extracted from all providers.' },
            ],
            result: 'The train appears in the Activities tab timeline on the correct day and time.',
            related: ['attivita'],
          },
          {
            id: 'leggere-card-treno',
            title: 'How to read a train card',
            intro: 'The train card shows departure, arrival, times, and booking number in compact format.',
            steps: [
              { text: 'The train card shows: train number, departure and arrival stations, times, date.' },
              { text: 'Click "Show details" to see the booking number, class and assigned seat (if available).' },
            ],
            result: 'All train journey information is accessible without opening the PDF.',
          },
          {
            id: 'treno-attivita',
            title: 'Trains in the Activities timeline',
            intro: 'Trains appear as events in the Activities tab alongside flights, hotels, and custom activities.',
            steps: [
              { text: 'Open the trip\'s Activities tab.' },
              { text: 'On the train travel day you find the event with departure time, departure and arrival station.' },
              { text: 'Click "Details" to go back to the train card in the dedicated tab.' },
            ],
            result: 'The train is integrated into the daily itinerary view.',
          },
          {
            id: 'modificare-treno',
            title: 'Editing a train ticket',
            intro: 'Correct extracted data if needed.',
            steps: [
              { text: 'Open the train card and click the pencil icon.' },
              { text: 'Edit the necessary fields and save.' },
            ],
            result: 'Changes are reflected in the timeline and collaborators are notified.',
          },
          {
            id: 'treni-beta',
            title: 'Beta version note',
            intro: 'Train support is in active beta with continuous improvements.',
            steps: [
              { text: 'Currently tested providers are Trenitalia and Italo.' },
              { text: 'For PDFs from other rail operators, SmartParse uses AI to attempt extraction.' },
              { text: 'If data isn\'t extracted correctly, you can edit it manually after importing.' },
            ],
            tips: [
              { type: 'info', text: 'Have a PDF from an unsupported operator? Contact support — every new format improves the system for everyone.' },
            ],
            result: 'Even non-standard formats are handled by AI with an editable preview before saving.',
          },
        ],
      },
    },

    // ── BUS ───────────────────────────────────────────────────────────────
    'bus': {
      it: {
        title: 'Bus',
        desc: 'Biglietti autobus e pullman nel tuo viaggio',
        articles: [
          {
            id: 'aggiungere-bus',
            title: 'Aggiungere un biglietto bus',
            intro: 'Carica il PDF del biglietto autobus o pullman per includerlo nell\'itinerario.',
            steps: [
              { text: 'Nel viaggio, clicca ⋮ e seleziona "Aggiungi prenotazione".' },
              { text: 'Carica il PDF del biglietto bus.' },
              { text: 'SmartParse estrae: operatore, stazioni/fermate, orari, passeggero e codice prenotazione.' },
            ],
            tips: [
              { type: 'info', text: 'I bus sono in beta. I provider più comuni (FlixBus, Itabus, Eurolines) sono supportati con i relativi template.' },
            ],
            result: 'Il biglietto bus appare nella timeline Attività con orario e tappe corretti.',
          },
          {
            id: 'leggere-card-bus',
            title: 'Come leggere una card bus',
            intro: 'La card bus mostra fermata di partenza, arrivo, orario e operatore.',
            steps: [
              { text: 'Nella card bus trovi: operatore, punto di partenza e arrivo, data e orario.' },
              { text: 'Clicca su "Mostra dettagli" per vedere il numero di prenotazione, posto (se assegnato) e eventuali note.' },
            ],
            result: 'Tutti i dettagli del trasporto in bus sono accessibili senza aprire il PDF originale.',
          },
          {
            id: 'bus-attivita',
            title: 'Bus nella timeline Attività',
            intro: 'I bus appaiono come eventi nella timeline giornaliera insieme a tutti gli altri trasporti.',
            steps: [
              { text: 'Apri il tab Attività.' },
              { text: 'Trova l\'evento bus nel giorno di viaggio con orario di partenza e tappe principali.' },
            ],
            result: 'Il bus è integrato nella visione complessiva del giorno di viaggio.',
          },
          {
            id: 'modificare-bus',
            title: 'Modificare un biglietto bus',
            intro: 'Correggi i dati estratti o aggiorna le informazioni del viaggio in bus.',
            steps: [
              { text: 'Clicca sull\'icona matita nella card bus.' },
              { text: 'Modifica i campi e salva.' },
            ],
            result: 'Le modifiche si riflettono nella timeline e generano notifica ai collaboratori.',
          },
          {
            id: 'bus-beta',
            title: 'Nota sulla versione beta',
            intro: 'Il supporto bus è in sviluppo attivo con nuovi provider aggiunti regolarmente.',
            steps: [
              { text: 'FlixBus, Itabus ed Eurolines hanno template dedicati.' },
              { text: 'Per altri operatori, SmartParse usa l\'AI per l\'estrazione.' },
              { text: 'I dati estratti sono sempre modificabili prima del salvataggio.' },
            ],
            result: 'Anche i formati non standard vengono gestiti con anteprima modificabile.',
          },
        ],
      },
      en: {
        title: 'Buses',
        desc: 'Bus and coach tickets in your trip',
        articles: [
          {
            id: 'aggiungere-bus',
            title: 'Adding a bus ticket',
            intro: 'Upload the bus or coach ticket PDF to include it in your itinerary.',
            steps: [
              { text: 'In the trip, click ⋮ and select "Add booking".' },
              { text: 'Upload the bus ticket PDF.' },
              { text: 'SmartParse extracts: operator, stations/stops, times, passenger and booking code.' },
            ],
            tips: [
              { type: 'info', text: 'Buses are in beta. The most common providers (FlixBus, Itabus, Eurolines) are supported with dedicated templates.' },
            ],
            result: 'The bus ticket appears in the Activities timeline with correct times and stops.',
          },
          {
            id: 'leggere-card-bus',
            title: 'How to read a bus card',
            intro: 'The bus card shows departure stop, arrival, time, and operator.',
            steps: [
              { text: 'The bus card shows: operator, departure and arrival point, date and time.' },
              { text: 'Click "Show details" to see the booking number, seat (if assigned) and any notes.' },
            ],
            result: 'All bus transport details are accessible without opening the original PDF.',
          },
          {
            id: 'bus-attivita',
            title: 'Buses in the Activities timeline',
            intro: 'Buses appear as events in the daily timeline alongside all other transport.',
            steps: [
              { text: 'Open the Activities tab.' },
              { text: 'Find the bus event on the travel day with departure time and main stops.' },
            ],
            result: 'The bus is integrated into the overall view of the travel day.',
          },
          {
            id: 'modificare-bus',
            title: 'Editing a bus ticket',
            intro: 'Correct extracted data or update bus journey information.',
            steps: [
              { text: 'Click the pencil icon on the bus card.' },
              { text: 'Edit the fields and save.' },
            ],
            result: 'Changes are reflected in the timeline and generate a notification to collaborators.',
          },
          {
            id: 'bus-beta',
            title: 'Beta version note',
            intro: 'Bus support is in active development with new providers added regularly.',
            steps: [
              { text: 'FlixBus, Itabus and Eurolines have dedicated templates.' },
              { text: 'For other operators, SmartParse uses AI for extraction.' },
              { text: 'Extracted data is always editable before saving.' },
            ],
            result: 'Even non-standard formats are handled with an editable preview.',
          },
        ],
      },
    },

    // ── NOLEGGIO ──────────────────────────────────────────────────────────
    'noleggio': {
      it: {
        title: 'Noleggio Auto',
        desc: 'Gestisci ritiro, restituzione e dettagli noleggio',
        articles: [
          {
            id: 'aggiungere-noleggio',
            title: 'Aggiungere un noleggio auto',
            intro: 'Carica il PDF di conferma del noleggio per avere tutti i dettagli nell\'itinerario.',
            steps: [
              { text: 'Nel viaggio, clicca ⋮ e seleziona "Aggiungi prenotazione".' },
              { text: 'Carica il PDF di conferma del noleggio (Hertz, Avis, Europcar, ecc.).' },
              { text: 'SmartParse estrae: agenzia, veicolo, luogo e data di ritiro/restituzione, conducente, numero prenotazione.' },
            ],
            result: 'Il noleggio appare nella timeline con tre eventi: ritiro, periodo di noleggio e restituzione.',
            related: ['attivita'],
          },
          {
            id: 'leggere-card-noleggio',
            title: 'Come leggere una card noleggio',
            intro: 'La card noleggio mostra veicolo, agenzia, date e luogo di ritiro/restituzione.',
            steps: [
              { text: 'Nella card trovi: agenzia, tipo di veicolo, date di ritiro e restituzione, luogo.', image: 'noleggio/01-card-noleggio.png' },
              { text: 'Clicca su "Mostra dettagli" per vedere il numero di prenotazione, categoria veicolo, conducente aggiuntivo (se presente) e eventuale polizza assicurativa.' },
            ],
            result: 'Tutte le informazioni del noleggio sono accessibili senza aprire il PDF.',
          },
          {
            id: 'noleggio-tre-eventi',
            title: 'I tre eventi del noleggio nella timeline',
            intro: 'Ogni noleggio genera tre eventi distinti nel tab Attività per una visione chiara.',
            steps: [
              { text: 'Evento 1 — Ritiro auto: nel giorno e luogo di pickup, con orario.' },
              { text: 'Evento 2 — Noleggio in corso: nei giorni intermedi tra ritiro e restituzione.' },
              { text: 'Evento 3 — Restituzione auto: nel giorno e luogo di drop-off, con orario.' },
            ],
            tips: [
              { type: 'tip', text: 'Clicca su uno degli eventi per tornare alla card noleggio con tutti i dettagli.' },
            ],
            result: 'Il noleggio è completamente integrato nella timeline giornaliera senza dati mancanti.',
          },
          {
            id: 'modificare-noleggio',
            title: 'Modificare i dati del noleggio',
            intro: 'Correggi date, luogo o veicolo se i dati estratti non sono corretti.',
            steps: [
              { text: 'Apri la card noleggio e clicca sull\'icona matita.' },
              { text: 'Modifica i campi necessari: date, luoghi, veicolo, numero prenotazione.' },
              { text: 'Salva le modifiche.' },
            ],
            result: 'La card e tutti e tre gli eventi nella timeline vengono aggiornati immediatamente.',
          },
          {
            id: 'noleggio-multiplo',
            title: 'Più noleggi nello stesso viaggio',
            intro: 'Puoi avere più noleggi auto in città diverse all\'interno dello stesso viaggio.',
            steps: [
              { text: 'Aggiungi ogni noleggio separatamente caricando il rispettivo PDF di conferma.' },
              { text: 'Ogni noleggio appare come una card separata nel tab Noleggi.' },
              { text: 'Nel tab Attività, tutti i noleggi appaiono nella timeline con i relativi eventi cronologici.' },
            ],
            result: 'Puoi gestire noleggi multipli in un\'unica schermata senza confusione.',
          },
        ],
      },
      en: {
        title: 'Car Rentals',
        desc: 'Manage pickup, drop-off and rental details',
        articles: [
          {
            id: 'aggiungere-noleggio',
            title: 'Adding a car rental',
            intro: 'Upload the rental confirmation PDF to have all details in your itinerary.',
            steps: [
              { text: 'In the trip, click ⋮ and select "Add booking".' },
              { text: 'Upload the rental confirmation PDF (Hertz, Avis, Europcar, etc.).' },
              { text: 'SmartParse extracts: agency, vehicle, pickup/drop-off location and date, driver, booking number.' },
            ],
            result: 'The rental appears in the timeline with three events: pickup, rental period, and drop-off.',
            related: ['attivita'],
          },
          {
            id: 'leggere-card-noleggio',
            title: 'How to read a rental card',
            intro: 'The rental card shows vehicle, agency, dates and pickup/drop-off location.',
            steps: [
              { text: 'The card shows: agency, vehicle type, pickup and drop-off dates, location.', image: 'noleggio/01-card-noleggio.png' },
              { text: 'Click "Show details" to see the booking number, vehicle category, additional driver (if present) and insurance policy.' },
            ],
            result: 'All rental information is accessible without opening the PDF.',
          },
          {
            id: 'noleggio-tre-eventi',
            title: 'The three rental events in the timeline',
            intro: 'Each rental generates three distinct events in the Activities tab for a clear view.',
            steps: [
              { text: 'Event 1 — Car pickup: on the pickup day and location, with time.' },
              { text: 'Event 2 — Rental in progress: on intermediate days between pickup and drop-off.' },
              { text: 'Event 3 — Car return: on the drop-off day and location, with time.' },
            ],
            tips: [
              { type: 'tip', text: 'Click on any event to go back to the rental card with all details.' },
            ],
            result: 'The rental is fully integrated into the daily timeline with no missing data.',
          },
          {
            id: 'modificare-noleggio',
            title: 'Editing rental data',
            intro: 'Correct dates, location or vehicle if extracted data is incorrect.',
            steps: [
              { text: 'Open the rental card and click the pencil icon.' },
              { text: 'Edit the necessary fields: dates, locations, vehicle, booking number.' },
              { text: 'Save the changes.' },
            ],
            result: 'The card and all three timeline events are updated immediately.',
          },
          {
            id: 'noleggio-multiplo',
            title: 'Multiple rentals in the same trip',
            intro: 'You can have multiple car rentals in different cities within the same trip.',
            steps: [
              { text: 'Add each rental separately by uploading its confirmation PDF.' },
              { text: 'Each rental appears as a separate card in the Rentals tab.' },
              { text: 'In the Activities tab, all rentals appear in the timeline with their chronological events.' },
            ],
            result: 'You can manage multiple rentals in a single screen without confusion.',
          },
        ],
      },
    },

    // ── ATTIVITÀ ──────────────────────────────────────────────────────────
    'attivita': {
      it: {
        title: 'Attività',
        desc: 'Aggiungi esperienze e appuntamenti al tuo viaggio',
        articles: [
          {
            id: 'timeline-giornaliera',
            title: 'La timeline giornaliera',
            intro: 'Il tab Attività è la visione completa del tuo viaggio: ogni giorno mostra tutti gli eventi in ordine cronologico.',
            steps: [
              { text: 'Apri il viaggio e clicca sul tab "Attività".', image: 'attivita/01-tab-attivita.png' },
              { text: 'Vedi tutti i giorni del viaggio (da startDate a endDate) con i relativi eventi: voli, check-in/check-out hotel, treni, bus, noleggi e attività custom.' },
              { text: 'Gli eventi senza orario specifico appaiono in cima alla giornata; quelli con orario sono ordinati cronologicamente.' },
            ],
            tips: [
              { type: 'info', text: 'I giorni senza eventi vengono comunque mostrati per avere una visione continua del viaggio.' },
            ],
            result: 'Hai una vista completa di ogni giorno del viaggio in un\'unica schermata.',
          },
          {
            id: 'creare-attivita',
            title: 'Creare un\'attività personalizzata',
            intro: 'Aggiungi qualsiasi evento al tuo itinerario: escursioni, ristoranti, visite guidate, appuntamenti.',
            steps: [
              { text: 'Nel tab Attività, clicca sul pulsante "+ Aggiungi attività" o sull\'icona + accanto al giorno desiderato.', image: 'attivita/02-aggiungi-attivita.png' },
              { text: 'Compila il form: nome (obbligatorio), data (obbligatoria), orario di inizio/fine, descrizione, link utili.' },
              { text: 'Aggiungi eventualmente degli allegati (PDF, immagini, voucher) — massimo 5 file da 10 MB ciascuno.' },
              { text: 'Clicca "Crea" per salvare l\'attività.' },
            ],
            tips: [
              { type: 'tip', text: 'Usa il campo link per aggiungere il sito web del posto, un link Google Maps o la conferma online.' },
            ],
            result: 'L\'attività appare nella timeline nel giorno e orario specificati, visibile a tutti i collaboratori.',
          },
          {
            id: 'modificare-eliminare-attivita',
            title: 'Modificare o eliminare un\'attività',
            intro: 'Aggiorna i dettagli di un\'attività o rimuovila dall\'itinerario.',
            steps: [
              { text: 'Clicca sull\'attività nella timeline per aprire il pannello dettagli.' },
              { text: 'Per modificare: clicca sull\'icona matita, aggiorna i campi e salva.' },
              { text: 'Per eliminare: clicca sull\'icona cestino nel pannello e conferma.' },
            ],
            result: 'Le modifiche o l\'eliminazione sono immediate e vengono notificate ai collaboratori.',
            related: ['collaborazione'],
          },
          {
            id: 'allegati-attivita',
            title: 'Allegare file a un\'attività',
            intro: 'Ogni attività può avere fino a 5 allegati: voucher, conferme, foto, PDF di prenotazione.',
            steps: [
              { text: 'Apri il form di creazione o modifica di un\'attività.' },
              { text: 'Clicca su "Aggiungi file" e seleziona il file dal dispositivo (PDF, JPEG, PNG, GIF, WebP — max 10 MB).' },
              { text: 'Il file viene caricato su Supabase Storage. Puoi aggiungere fino a 5 file per attività.' },
              { text: 'Salva l\'attività. Gli allegati sono accessibili cliccando sull\'icona graffetta nell\'attività.' },
            ],
            tips: [
              { type: 'warn', text: 'Gli allegati non vengono eliminati automaticamente se elimini l\'attività. Eliminali manualmente prima per liberare spazio.' },
            ],
            result: 'I file allegati sono accessibili direttamente dall\'attività per tutta la durata del viaggio.',
          },
          {
            id: 'filtri-attivita',
            title: 'Filtrare gli eventi nella timeline',
            intro: 'Filtra la timeline per vedere solo certi tipi di eventi (voli, hotel, attività, ecc.).',
            steps: [
              { text: 'In cima al tab Attività trovi i filtri per tipo di evento.' },
              { text: 'Clicca su un tipo (es. "Voli") per mostrare solo quel tipo nella timeline.' },
              { text: 'Clicca su "Tutti" per tornare alla vista completa.' },
            ],
            result: 'Puoi focalizzarti sugli eventi che ti interessano senza scorrere tutta la timeline.',
          },
        ],
      },
      en: {
        title: 'Activities',
        desc: 'Add experiences and appointments to your trip',
        articles: [
          {
            id: 'timeline-giornaliera',
            title: 'The daily timeline',
            intro: 'The Activities tab is your complete trip view: each day shows all events in chronological order.',
            steps: [
              { text: 'Open the trip and click the "Activities" tab.', image: 'attivita/01-tab-attivita.png' },
              { text: 'You see all trip days (from startDate to endDate) with their events: flights, hotel check-in/out, trains, buses, rentals and custom activities.' },
              { text: 'Events without a specific time appear at the top of the day; those with times are sorted chronologically.' },
            ],
            tips: [
              { type: 'info', text: 'Days without events are still shown to maintain a continuous view of the trip.' },
            ],
            result: 'You have a complete view of every trip day in a single screen.',
          },
          {
            id: 'creare-attivita',
            title: 'Creating a custom activity',
            intro: 'Add any event to your itinerary: excursions, restaurants, guided tours, appointments.',
            steps: [
              { text: 'In the Activities tab, click the "+ Add activity" button or the + icon next to the desired day.', image: 'attivita/02-aggiungi-attivita.png' },
              { text: 'Fill in the form: name (required), date (required), start/end time, description, useful links.' },
              { text: 'Optionally add attachments (PDFs, images, vouchers) — max 5 files of 10 MB each.' },
              { text: 'Click "Create" to save the activity.' },
            ],
            tips: [
              { type: 'tip', text: 'Use the link field to add the venue website, a Google Maps link, or the online confirmation.' },
            ],
            result: 'The activity appears in the timeline on the specified day and time, visible to all collaborators.',
          },
          {
            id: 'modificare-eliminare-attivita',
            title: 'Editing or deleting an activity',
            intro: 'Update activity details or remove it from the itinerary.',
            steps: [
              { text: 'Click the activity in the timeline to open the details panel.' },
              { text: 'To edit: click the pencil icon, update the fields and save.' },
              { text: 'To delete: click the trash icon in the panel and confirm.' },
            ],
            result: 'Changes or deletion are immediate and collaborators are notified.',
            related: ['collaborazione'],
          },
          {
            id: 'allegati-attivita',
            title: 'Attaching files to an activity',
            intro: 'Each activity can have up to 5 attachments: vouchers, confirmations, photos, booking PDFs.',
            steps: [
              { text: 'Open the create or edit form for an activity.' },
              { text: 'Click "Add files" and select the file from your device (PDF, JPEG, PNG, GIF, WebP — max 10 MB).' },
              { text: 'The file is uploaded to Supabase Storage. You can add up to 5 files per activity.' },
              { text: 'Save the activity. Attachments are accessible by clicking the paperclip icon on the activity.' },
            ],
            tips: [
              { type: 'warn', text: 'Attachments are not automatically deleted if you delete the activity. Delete them manually first to free up space.' },
            ],
            result: 'Attached files are accessible directly from the activity for the duration of the trip.',
          },
          {
            id: 'filtri-attivita',
            title: 'Filtering events in the timeline',
            intro: 'Filter the timeline to see only certain event types (flights, hotels, activities, etc.).',
            steps: [
              { text: 'At the top of the Activities tab you find filters by event type.' },
              { text: 'Click a type (e.g. "Flights") to show only that type in the timeline.' },
              { text: 'Click "All" to return to the full view.' },
            ],
            result: 'You can focus on the events you care about without scrolling the entire timeline.',
          },
        ],
      },
    },

    // ── COLLABORAZIONE ────────────────────────────────────────────────────
    'collaborazione': {
      it: {
        title: 'Collaborazione',
        desc: 'Invita compagni di viaggio e gestisci i ruoli',
        articles: [
          {
            id: 'aprire-pannello-share',
            title: 'Aprire il pannello di condivisione',
            intro: 'Il pannello di condivisione è il centro di controllo per tutti i collaboratori del viaggio.',
            steps: [
              { text: 'Apri il viaggio e clicca sull\'icona di condivisione (persone) nella barra del titolo.', image: 'collaborazione/01-icona-share.png' },
              { text: 'Si apre il pannello con tre sezioni: Link di condivisione, Invita per email, Collaboratori attuali.' },
            ],
            result: 'Da qui puoi gestire tutto: invitare nuovi collaboratori, vedere chi ha accesso e revocare i permessi.',
          },
          {
            id: 'tre-ruoli',
            title: 'I tre ruoli: Proprietario, Viaggiatore, Ospite',
            intro: 'Ogni collaboratore ha un ruolo che determina cosa può fare nel viaggio.',
            steps: [
              { text: 'Proprietario: ha controllo totale. Può modificare, invitare e cancellare il viaggio. È l\'utente che ha creato il viaggio.' },
              { text: 'Viaggiatore: può modificare tutte le prenotazioni (aggiungi/modifica/elimina voli, hotel, attività) e invitare altri come Ospiti. Non può cancellare il viaggio.' },
              { text: 'Ospite: sola lettura. Vede l\'itinerario completo ma non può fare modifiche. Può solo lasciare il viaggio.' },
            ],
            tips: [
              { type: 'tip', text: 'Usa il ruolo Viaggiatore per chi pianifica il viaggio con te; usa Ospite per chi deve solo consultare l\'itinerario.' },
            ],
            result: 'Assegna il ruolo corretto sin dall\'invito per evitare modifiche indesiderate.',
          },
          {
            id: 'invitare-registrato',
            title: 'Invitare un utente già registrato',
            intro: 'Se il tuo compagno di viaggio ha già un account Travel Flow, aggiungilo in pochi secondi.',
            steps: [
              { text: 'Apri il pannello di condivisione e clicca su "Invita per email".' },
              { text: 'Digita l\'email dell\'utente. L\'autocomplete suggerisce utenti conosciuti.' },
              { text: 'Scegli il ruolo (Viaggiatore o Ospite) e clicca "Invia invito".' },
            ],
            tips: [
              { type: 'info', text: 'Gli utenti registrati vengono aggiunti direttamente come collaboratori con stato "accettato" — non devono fare nulla.' },
            ],
            result: 'L\'utente vede immediatamente il viaggio nella sua lista e riceve una notifica in-app.',
            related: ['notifiche'],
          },
          {
            id: 'invitare-non-registrato',
            title: 'Invitare chi non ha un account',
            intro: 'Genera un link di invito personale per chi non è ancora su Travel Flow.',
            steps: [
              { text: 'Nel pannello di condivisione, inserisci l\'email della persona da invitare.' },
              { text: 'Scegli il ruolo e clicca "Invia invito". Viene generato un link di invito personale.' },
              { text: 'Copia il link e condividilo manualmente via WhatsApp, email o SMS.' },
              { text: 'Quando il destinatario apre il link, viene guidato alla registrazione. Al termine è aggiunto automaticamente al viaggio.' },
            ],
            tips: [
              { type: 'warn', text: 'Il link di invito è personale. Se condiviso con persone sbagliate, chiunque lo apra può accedere al viaggio con il ruolo assegnato.' },
              { type: 'info', text: 'La piattaforma è ad accesso su invito: per registrarsi è necessario un invito piattaforma, non solo un invito viaggio.' },
            ],
            result: 'Dopo la registrazione, il nuovo collaboratore vede il viaggio direttamente nella propria lista.',
          },
          {
            id: 'gestire-collaboratori',
            title: 'Gestire collaboratori: revocare e reinviare',
            intro: 'Rivedi chi ha accesso al viaggio e agisci su inviti in sospeso o collaboratori da rimuovere.',
            steps: [
              { text: 'Nel pannello di condivisione, scorri la lista "Collaboratori attuali".' },
              { text: 'Per revocare l\'accesso a un collaboratore, clicca su "Rimuovi" accanto al suo nome e conferma.' },
              { text: 'Per reinviare un invito in sospeso, clicca su "Reinvia link" — viene generato un nuovo link.' },
            ],
            tips: [
              { type: 'warn', text: 'Solo il Proprietario può revocare Viaggiatori. I Viaggiatori possono solo revocare Ospiti.' },
            ],
            result: 'L\'accesso revocato è immediato: il collaboratore non vede più il viaggio nella sua lista.',
          },
          {
            id: 'link-pubblico',
            title: 'Link di condivisione pubblico',
            intro: 'Condividi un link di sola lettura del viaggio senza richiedere un account.',
            steps: [
              { text: 'Nel pannello di condivisione, trova la sezione "Link di condivisione".' },
              { text: 'Clicca "Copia link" per copiare il link pubblico negli appunti.' },
              { text: 'Condividi il link: chi lo apre vede l\'itinerario in sola lettura senza dover accedere.' },
            ],
            tips: [
              { type: 'info', text: 'Il link pubblico è diverso dal link di invito: non richiede registrazione ma non aggiunge nessuno come collaboratore.' },
            ],
            result: 'Chiunque abbia il link può vedere l\'itinerario in versione pubblica, senza accesso ai dati sensibili.',
          },
        ],
      },
      en: {
        title: 'Collaboration',
        desc: 'Invite travel companions and manage roles',
        articles: [
          {
            id: 'aprire-pannello-share',
            title: 'Opening the sharing panel',
            intro: 'The sharing panel is the control center for all trip collaborators.',
            steps: [
              { text: 'Open the trip and click the sharing icon (people) in the title bar.', image: 'collaborazione/01-icona-share.png' },
              { text: 'The panel opens with three sections: Share link, Invite by email, Current collaborators.' },
            ],
            result: 'From here you can manage everything: invite new collaborators, see who has access, and revoke permissions.',
          },
          {
            id: 'tre-ruoli',
            title: 'The three roles: Owner, Traveler, Guest',
            intro: 'Each collaborator has a role that determines what they can do in the trip.',
            steps: [
              { text: 'Owner: has full control. Can edit, invite and delete the trip. This is the user who created the trip.' },
              { text: 'Traveler: can modify all bookings (add/edit/delete flights, hotels, activities) and invite others as Guests. Cannot delete the trip.' },
              { text: 'Guest: read-only. Can see the full itinerary but cannot make changes. Can only leave the trip.' },
            ],
            tips: [
              { type: 'tip', text: 'Use the Traveler role for someone planning the trip with you; use Guest for someone who just needs to view the itinerary.' },
            ],
            result: 'Assign the correct role from the invitation to avoid unwanted changes.',
          },
          {
            id: 'invitare-registrato',
            title: 'Inviting a registered user',
            intro: 'If your travel companion already has a Travel Flow account, add them in seconds.',
            steps: [
              { text: 'Open the sharing panel and click "Invite by email".' },
              { text: 'Type the user\'s email. Autocomplete suggests known users.' },
              { text: 'Choose the role (Traveler or Guest) and click "Send invitation".' },
            ],
            tips: [
              { type: 'info', text: 'Registered users are added directly as collaborators with "accepted" status — they don\'t need to do anything.' },
            ],
            result: 'The user immediately sees the trip in their list and receives an in-app notification.',
            related: ['notifiche'],
          },
          {
            id: 'invitare-non-registrato',
            title: 'Inviting someone without an account',
            intro: 'Generate a personal invite link for someone not yet on Travel Flow.',
            steps: [
              { text: 'In the sharing panel, enter the email of the person to invite.' },
              { text: 'Choose the role and click "Send invitation". A personal invite link is generated.' },
              { text: 'Copy the link and share it manually via WhatsApp, email or SMS.' },
              { text: 'When the recipient opens the link, they\'re guided through registration. On completion they\'re automatically added to the trip.' },
            ],
            tips: [
              { type: 'warn', text: 'The invite link is personal. If shared with the wrong people, anyone who opens it can access the trip with the assigned role.' },
              { type: 'info', text: 'The platform is invite-only: registering requires a platform invitation, not just a trip invitation.' },
            ],
            result: 'After registration, the new collaborator sees the trip directly in their list.',
          },
          {
            id: 'gestire-collaboratori',
            title: 'Managing collaborators: revoke and resend',
            intro: 'Review who has access to the trip and act on pending invitations or collaborators to remove.',
            steps: [
              { text: 'In the sharing panel, scroll through the "Current collaborators" list.' },
              { text: 'To revoke a collaborator\'s access, click "Remove" next to their name and confirm.' },
              { text: 'To resend a pending invitation, click "Resend link" — a new link is generated.' },
            ],
            tips: [
              { type: 'warn', text: 'Only the Owner can revoke Travelers. Travelers can only revoke Guests.' },
            ],
            result: 'Revoked access is immediate: the collaborator no longer sees the trip in their list.',
          },
          {
            id: 'link-pubblico',
            title: 'Public sharing link',
            intro: 'Share a read-only trip link without requiring an account.',
            steps: [
              { text: 'In the sharing panel, find the "Share link" section.' },
              { text: 'Click "Copy link" to copy the public link to clipboard.' },
              { text: 'Share the link: anyone who opens it sees the itinerary read-only without needing to sign in.' },
            ],
            tips: [
              { type: 'info', text: 'The public link differs from the invite link: it doesn\'t require registration but doesn\'t add anyone as a collaborator.' },
            ],
            result: 'Anyone with the link can view the public version of the itinerary, without access to sensitive data.',
          },
        ],
      },
    },

    // ── NOTIFICHE ─────────────────────────────────────────────────────────
    'notifiche': {
      it: {
        title: 'Notifiche',
        desc: 'Aggiornamenti in tempo reale sulle modifiche al viaggio',
        articles: [
          {
            id: 'quando-ricevo-notifiche',
            title: 'Quando ricevo una notifica?',
            intro: 'Le notifiche ti avvisano di ogni modifica importante ai viaggi a cui partecipi.',
            steps: [
              { text: 'Ricevi una notifica quando: sei aggiunto a un viaggio come collaboratore.' },
              { text: 'Quando: un Proprietario o Viaggiatore aggiunge, modifica o elimina un volo, hotel o attività nel viaggio.' },
              { text: 'Quando: un altro collaboratore accetta l\'invito a un viaggio di cui sei Proprietario.' },
              { text: 'Quando: il tuo accesso a un viaggio viene revocato.' },
            ],
            tips: [
              { type: 'info', text: 'Non ricevi notifiche per le tue stesse modifiche — solo per le azioni degli altri collaboratori.' },
            ],
            result: 'Sei sempre aggiornato sulle modifiche al viaggio senza dover controllare manualmente.',
          },
          {
            id: 'leggere-gestire-notifiche',
            title: 'Leggere e gestire le notifiche',
            intro: 'La pagina Notifiche raccoglie tutti gli aggiornamenti degli ultimi 30 giorni.',
            steps: [
              { text: 'Clicca sull\'icona campanella nell\'header per aprire la pagina Notifiche.', image: 'notifiche/01-campanella.png' },
              { text: 'Le notifiche non lette appaiono in evidenza con un punto colorato.' },
              { text: 'Clicca su una notifica per segnarla come letta e, se pertinente, navigare al viaggio o prenotazione collegata.' },
              { text: 'Per segnare tutte come lette in una volta, clicca "Segna tutto letto".' },
            ],
            result: 'Le notifiche lette non mostrano più il badge. La lista viene conservata per 30 giorni.',
          },
          {
            id: 'badge-campanella',
            title: 'Il badge della campanella',
            intro: 'Il numero sul badge campanella indica quante notifiche non hai ancora letto.',
            steps: [
              { text: 'Il badge appare sull\'icona campanella nell\'header quando hai notifiche non lette.' },
              { text: 'Il numero include anche le prenotazioni in attesa di revisione (se presente questa funzione).' },
              { text: 'Dopo aver letto tutte le notifiche, il badge sparisce automaticamente.' },
            ],
            result: 'Il badge ti tiene aggiornato a colpo d\'occhio senza dover aprire la pagina notifiche.',
          },
          {
            id: 'conservazione-notifiche',
            title: 'Per quanto tempo vengono conservate?',
            intro: 'Le notifiche vengono conservate per 30 giorni dalla data di ricezione.',
            steps: [
              { text: 'Le notifiche più vecchie di 30 giorni vengono eliminate automaticamente.' },
              { text: 'La lista mostra al massimo le ultime 50 notifiche entro i 30 giorni.' },
            ],
            tips: [
              { type: 'info', text: 'Non è possibile recuperare notifiche eliminate. Se hai bisogno di storico modifiche, consulta la sezione del viaggio direttamente.' },
            ],
            result: 'La lista notifiche rimane sempre pulita e rilevante senza accumulo infinito.',
          },
          {
            id: 'formato-temporale',
            title: 'Il formato delle date nelle notifiche',
            intro: 'Le notifiche mostrano il tempo trascorso in formato relativo (es. "5 minuti fa", "ieri").',
            steps: [
              { text: 'Per notifiche recenti: "Adesso", "5 minuti fa", "1 ora fa".' },
              { text: 'Per notifiche di ieri: "Ieri alle 14:30".' },
              { text: 'Per notifiche più vecchie: data e ora esatta (es. "12 mar alle 09:15").' },
            ],
            result: 'Il formato relativo ti permette di capire subito quando è avvenuta la modifica senza dover interpretare date assolute.',
          },
        ],
      },
      en: {
        title: 'Notifications',
        desc: 'Real-time updates on trip changes',
        articles: [
          {
            id: 'quando-ricevo-notifiche',
            title: 'When do I receive a notification?',
            intro: 'Notifications alert you to every important change in trips you participate in.',
            steps: [
              { text: 'You receive a notification when: you\'re added to a trip as a collaborator.' },
              { text: 'When: an Owner or Traveler adds, edits or deletes a flight, hotel or activity in the trip.' },
              { text: 'When: another collaborator accepts an invitation to a trip you own.' },
              { text: 'When: your access to a trip is revoked.' },
            ],
            tips: [
              { type: 'info', text: 'You don\'t receive notifications for your own changes — only for other collaborators\' actions.' },
            ],
            result: 'You\'re always up to date on trip changes without having to check manually.',
          },
          {
            id: 'leggere-gestire-notifiche',
            title: 'Reading and managing notifications',
            intro: 'The Notifications page collects all updates from the last 30 days.',
            steps: [
              { text: 'Click the bell icon in the header to open the Notifications page.', image: 'notifiche/01-campanella.png' },
              { text: 'Unread notifications appear highlighted with a colored dot.' },
              { text: 'Click a notification to mark it as read and, if relevant, navigate to the linked trip or booking.' },
              { text: 'To mark all as read at once, click "Mark all read".' },
            ],
            result: 'Read notifications no longer show the badge. The list is kept for 30 days.',
          },
          {
            id: 'badge-campanella',
            title: 'The bell badge',
            intro: 'The number on the bell badge shows how many notifications you haven\'t read yet.',
            steps: [
              { text: 'The badge appears on the bell icon in the header when you have unread notifications.' },
              { text: 'The number also includes pending bookings awaiting review (if this feature is present).' },
              { text: 'After reading all notifications, the badge disappears automatically.' },
            ],
            result: 'The badge keeps you up to date at a glance without having to open the notifications page.',
          },
          {
            id: 'conservazione-notifiche',
            title: 'How long are they kept?',
            intro: 'Notifications are kept for 30 days from the date received.',
            steps: [
              { text: 'Notifications older than 30 days are automatically deleted.' },
              { text: 'The list shows at most the last 50 notifications within 30 days.' },
            ],
            tips: [
              { type: 'info', text: 'Deleted notifications cannot be recovered. If you need a change history, check the trip section directly.' },
            ],
            result: 'The notification list stays clean and relevant without infinite accumulation.',
          },
          {
            id: 'formato-temporale',
            title: 'The date format in notifications',
            intro: 'Notifications show elapsed time in relative format (e.g. "5 minutes ago", "yesterday").',
            steps: [
              { text: 'For recent notifications: "Just now", "5 minutes ago", "1 hour ago".' },
              { text: 'For yesterday\'s notifications: "Yesterday at 2:30 PM".' },
              { text: 'For older notifications: exact date and time (e.g. "Mar 12 at 9:15 AM").' },
            ],
            result: 'The relative format lets you immediately understand when the change occurred without interpreting absolute dates.',
          },
        ],
      },
    },

    // ── PROFILO ───────────────────────────────────────────────────────────
    'profilo': {
      it: {
        title: 'Profilo & Viaggiatori',
        desc: 'I tuoi dati, i tuoi compagni e i programmi fedeltà',
        articles: [
          {
            id: 'tab-impostazioni',
            title: 'Le quattro tab del Profilo',
            intro: 'La pagina Profilo è organizzata in quattro sezioni accessibili dalle tab in cima alla pagina.',
            steps: [
              { text: 'Tab Profilo: nome utente, email, foto profilo, lingua dell\'interfaccia (IT/EN).' },
              { text: 'Tab Viaggiatori: gestione dei profili passeggero con documenti e programmi fedeltà.' },
              { text: 'Tab Preferenze: impostazioni di notifica e altre preferenze personali.' },
              { text: 'Tab Inviti: elenco degli inviti piattaforma inviati e loro stato.' },
            ],
            result: 'Tutte le impostazioni personali sono organizzate in un\'unica pagina con navigazione a tab.',
          },
          {
            id: 'gestire-viaggiatori',
            title: 'Aggiungere e gestire profili viaggiatore',
            intro: 'Salva i profili passeggero per velocizzare le prenotazioni future e avere sempre i documenti a portata di mano.',
            steps: [
              { text: 'Vai su Profilo → tab Viaggiatori.' },
              { text: 'Clicca "Aggiungi viaggiatore" per creare un nuovo profilo.' },
              { text: 'Compila: nome, cognome, data di nascita, nazionalità.' },
              { text: 'Opzionalmente aggiungi i dati del passaporto (numero, scadenza) — verranno cifrati automaticamente.' },
              { text: 'Salva il profilo.' },
            ],
            tips: [
              { type: 'tip', text: 'Il primo viaggiatore è solitamente il tuo profilo personale (contrassegnato come "Proprietario"). Aggiungine altri per familiari o compagni di viaggio abituali.' },
            ],
            result: 'I profili salvati appaiono nell\'autocomplete quando devi associare passeggeri a voli o prenotazioni.',
          },
          {
            id: 'cifratura-passaporto',
            title: 'Cifratura dei dati del passaporto',
            intro: 'I dati del passaporto sono protetti con crittografia AES-256-GCM prima di essere salvati.',
            steps: [
              { text: 'Inserisci i dati del passaporto nel profilo viaggiatore (numero, scadenza, nazionalità).' },
              { text: 'Alla pressione di "Salva", i dati vengono cifrati sul server prima di essere scritti nel database.' },
              { text: 'Per visualizzare i dati salvati, clicca sull\'icona occhio — i dati vengono decifrati solo per la sessione corrente.' },
            ],
            tips: [
              { type: 'info', text: 'La chiave di cifratura non è mai accessibile al database. Anche con accesso diretto ai dati grezzi, i valori cifrati non sono leggibili senza la chiave.' },
            ],
            result: 'I tuoi documenti sono al sicuro con lo stesso standard di cifratura usato in ambito bancario.',
            related: ['sicurezza'],
          },
          {
            id: 'programmi-fedelta',
            title: 'Programmi fedeltà',
            intro: 'Salva i tuoi numeri frequent flyer e loyalty card nel profilo per averli sempre disponibili.',
            steps: [
              { text: 'Nel profilo viaggiatore, scorri fino alla sezione "Programmi fedeltà".' },
              { text: 'Clicca "Aggiungi programma", cerca la compagnia aerea o hotel e inserisci il numero tessera.' },
              { text: 'Salva. Il numero appare nella lista associata al viaggiatore.' },
            ],
            tips: [
              { type: 'tip', text: 'I dati dei programmi fedeltà sono visibili solo a te e non vengono condivisi con i collaboratori del viaggio.' },
            ],
            result: 'Hai tutti i tuoi numeri loyalty in un unico posto, sempre consultabili dall\'app.',
          },
          {
            id: 'inviti-pendenti',
            title: 'Gestire gli inviti piattaforma inviati',
            intro: 'Dalla tab Inviti puoi vedere lo stato degli inviti che hai inviato per far registrare nuovi utenti.',
            steps: [
              { text: 'Vai su Profilo → tab Inviti.' },
              { text: 'Vedi la lista degli inviti inviati con stato: in attesa, accettato, scaduto.' },
              { text: 'Per gli inviti in attesa, puoi copiare nuovamente il link o annullare l\'invito.' },
            ],
            tips: [
              { type: 'info', text: 'Gli inviti piattaforma sono distinti dagli inviti viaggio. Gli inviti piattaforma permettono la registrazione; gli inviti viaggio danno accesso a un singolo viaggio.' },
            ],
            result: 'Puoi monitorare e gestire facilmente tutti gli inviti inviati da un\'unica schermata.',
          },
          {
            id: 'cambio-lingua',
            title: 'Cambiare la lingua dell\'interfaccia',
            intro: 'Travel Flow è disponibile in italiano e inglese. Puoi cambiare lingua in qualsiasi momento.',
            steps: [
              { text: 'Vai su Profilo → tab Profilo.' },
              { text: 'Trova il selettore lingua (IT / EN) e clicca sulla lingua desiderata.' },
              { text: 'L\'interfaccia si aggiorna immediatamente senza ricaricare la pagina.' },
            ],
            tips: [
              { type: 'info', text: 'La preferenza di lingua è salvata nel browser. Se accedi da un altro dispositivo, la lingua torna a quella predefinita.' },
            ],
            result: 'Tutta l\'interfaccia, inclusi i messaggi di errore e le notifiche, passa alla lingua selezionata.',
          },
        ],
      },
      en: {
        title: 'Profile & Travelers',
        desc: 'Your data, companions and loyalty programs',
        articles: [
          {
            id: 'tab-impostazioni',
            title: 'The four Profile tabs',
            intro: 'The Profile page is organized into four sections accessible from the tabs at the top.',
            steps: [
              { text: 'Profile tab: username, email, profile photo, interface language (IT/EN).' },
              { text: 'Travelers tab: management of passenger profiles with documents and loyalty programs.' },
              { text: 'Preferences tab: notification settings and other personal preferences.' },
              { text: 'Invites tab: list of sent platform invitations and their status.' },
            ],
            result: 'All personal settings are organized in a single page with tab navigation.',
          },
          {
            id: 'gestire-viaggiatori',
            title: 'Adding and managing traveler profiles',
            intro: 'Save passenger profiles to speed up future bookings and always have documents handy.',
            steps: [
              { text: 'Go to Profile → Travelers tab.' },
              { text: 'Click "Add traveler" to create a new profile.' },
              { text: 'Fill in: first name, last name, date of birth, nationality.' },
              { text: 'Optionally add passport data (number, expiry) — it will be encrypted automatically.' },
              { text: 'Save the profile.' },
            ],
            tips: [
              { type: 'tip', text: 'The first traveler is usually your personal profile (marked as "Owner"). Add others for family members or regular travel companions.' },
            ],
            result: 'Saved profiles appear in autocomplete when you need to associate passengers with flights or bookings.',
          },
          {
            id: 'cifratura-passaporto',
            title: 'Passport data encryption',
            intro: 'Passport data is protected with AES-256-GCM encryption before being saved.',
            steps: [
              { text: 'Enter passport data in the traveler profile (number, expiry, nationality).' },
              { text: 'When you press "Save", the data is encrypted on the server before being written to the database.' },
              { text: 'To view saved data, click the eye icon — data is decrypted only for the current session.' },
            ],
            tips: [
              { type: 'info', text: 'The encryption key is never accessible to the database. Even with direct access to raw data, encrypted values are unreadable without the key.' },
            ],
            result: 'Your documents are secure with the same encryption standard used in banking.',
            related: ['sicurezza'],
          },
          {
            id: 'programmi-fedelta',
            title: 'Loyalty programs',
            intro: 'Save your frequent flyer numbers and loyalty cards in your profile to always have them available.',
            steps: [
              { text: 'In the traveler profile, scroll to the "Loyalty programs" section.' },
              { text: 'Click "Add program", search for the airline or hotel and enter the membership number.' },
              { text: 'Save. The number appears in the list associated with the traveler.' },
            ],
            tips: [
              { type: 'tip', text: 'Loyalty program data is visible only to you and is not shared with trip collaborators.' },
            ],
            result: 'All your loyalty numbers are in one place, always accessible from the app.',
          },
          {
            id: 'inviti-pendenti',
            title: 'Managing sent platform invitations',
            intro: 'From the Invites tab you can see the status of invitations you\'ve sent for new users to register.',
            steps: [
              { text: 'Go to Profile → Invites tab.' },
              { text: 'See the list of sent invitations with status: pending, accepted, expired.' },
              { text: 'For pending invitations, you can copy the link again or cancel the invitation.' },
            ],
            tips: [
              { type: 'info', text: 'Platform invitations are distinct from trip invitations. Platform invitations allow registration; trip invitations give access to a single trip.' },
            ],
            result: 'You can easily monitor and manage all sent invitations from a single screen.',
          },
          {
            id: 'cambio-lingua',
            title: 'Changing the interface language',
            intro: 'Travel Flow is available in Italian and English. You can change language at any time.',
            steps: [
              { text: 'Go to Profile → Profile tab.' },
              { text: 'Find the language selector (IT / EN) and click the desired language.' },
              { text: 'The interface updates immediately without reloading the page.' },
            ],
            tips: [
              { type: 'info', text: 'The language preference is saved in the browser. If you access from another device, language resets to the default.' },
            ],
            result: 'The entire interface, including error messages and notifications, switches to the selected language.',
          },
        ],
      },
    },

    // ── SICUREZZA ─────────────────────────────────────────────────────────
    'sicurezza': {
      it: {
        title: 'Sicurezza & Privacy',
        desc: 'Come proteggiamo i tuoi dati e cosa puoi controllare',
        articles: [
          {
            id: 'architettura-sicurezza',
            title: 'Architettura di sicurezza',
            intro: 'Travel Flow è costruito su Supabase e Netlify, con più livelli di protezione per i tuoi dati.',
            steps: [
              { text: 'Il database è su Supabase PostgreSQL con Row Level Security (RLS): ogni utente accede solo ai propri dati.' },
              { text: 'Le funzioni backend girano su Netlify (serverless) con autenticazione JWT su ogni richiesta.' },
              { text: 'Nessun dato sensibile transita nel frontend in chiaro: tutte le operazioni critiche avvengono sul server.' },
            ],
            result: 'Hai un sistema a più livelli di difesa, dal database all\'interfaccia.',
          },
          {
            id: 'chi-vede-dati',
            title: 'Chi può vedere i tuoi dati?',
            intro: 'I tuoi dati di viaggio sono accessibili solo a te e ai collaboratori che hai esplicitamente autorizzato.',
            steps: [
              { text: 'Solo tu (Proprietario) hai accesso completo a tutti i dati del viaggio.' },
              { text: 'I collaboratori (Viaggiatori e Ospiti) vedono i dati condivisi del viaggio — mai le tue prenotazioni personali in altri viaggi.' },
              { text: 'I dati del passaporto e i programmi fedeltà sono visibili solo al loro proprietario, mai ai collaboratori.' },
              { text: 'L\'admin della piattaforma ha accesso a metadati aggregati (conteggi, statistiche) ma non al contenuto delle prenotazioni.' },
            ],
            result: 'Hai il controllo completo su chi accede ai tuoi dati di viaggio.',
          },
          {
            id: 'cifratura-dati',
            title: 'Cifratura dei dati sensibili',
            intro: 'I dati sensibili come i passaporti sono cifrati con AES-256-GCM prima del salvataggio.',
            steps: [
              { text: 'Quando salvi dati passaporto, vengono cifrati sul server con una chiave dedicata (non nel database).' },
              { text: 'Il formato cifrato è: iv:authTag:ciphertext (tutto in esadecimale).' },
              { text: 'Per visualizzare i dati, la decifratura avviene solo a runtime — il valore cifrato rimane nel database.' },
            ],
            tips: [
              { type: 'info', text: 'AES-256-GCM garantisce sia la riservatezza che l\'integrità dei dati: non è possibile modificare i dati cifrati senza che la decifratura fallisca.' },
            ],
            result: 'Anche in caso di accesso non autorizzato al database, i dati sensibili rimangono illeggibili.',
          },
          {
            id: 'autenticazione',
            title: 'Metodi di autenticazione',
            intro: 'Travel Flow supporta due metodi sicuri di accesso, entrambi senza password tradizionale.',
            steps: [
              { text: 'Google OAuth: accedi con il tuo account Google esistente. Nessuna password aggiuntiva da ricordare.' },
              { text: 'OTP via email: ricevi un codice monouso via email (valido pochi minuti). Inseriscilo per accedere.' },
              { text: 'Entrambi i metodi usano token JWT firmati da Supabase per autenticare ogni richiesta API.' },
            ],
            tips: [
              { type: 'info', text: 'Non è possibile creare una password tradizionale. Questo riduce il rischio di attacchi a dizionario o credential stuffing.' },
            ],
            result: 'L\'accesso è sicuro e non richiede di ricordare password aggiuntive.',
          },
          {
            id: 'piattaforma-inviti',
            title: 'Piattaforma ad accesso su invito',
            intro: 'Travel Flow è una piattaforma chiusa: per registrarsi è necessario ricevere un invito.',
            steps: [
              { text: 'Solo gli utenti esistenti (o l\'admin) possono inviare inviti piattaforma via email.' },
              { text: 'Ogni invito è personale e valido una sola volta: non può essere riutilizzato.' },
              { text: 'Questo meccanismo impedisce registrazioni non autorizzate e mantiene la qualità della base utenti.' },
            ],
            result: 'Solo persone fidate hanno accesso alla piattaforma.',
          },
          {
            id: 'eliminazione-dati',
            title: 'Eliminazione dei tuoi dati',
            intro: 'Puoi eliminare i tuoi viaggi in qualsiasi momento. Per la cancellazione dell\'account, contatta il supporto.',
            steps: [
              { text: 'Per eliminare un viaggio: menu ⋮ del viaggio → "Elimina viaggio" → conferma.' },
              { text: 'L\'eliminazione cancella prenotazioni, attività, collaboratori e allegati associati al viaggio.' },
              { text: 'Per eliminare il tuo account e tutti i dati associati, contatta l\'amministratore.' },
            ],
            tips: [
              { type: 'warn', text: 'L\'eliminazione di un viaggio è irreversibile. Non è possibile recuperare i dati eliminati.' },
            ],
            result: 'Hai il controllo su cosa eliminare e quando. I dati eliminati non sono recuperabili.',
          },
        ],
      },
      en: {
        title: 'Security & Privacy',
        desc: 'How we protect your data and what you control',
        articles: [
          {
            id: 'architettura-sicurezza',
            title: 'Security architecture',
            intro: 'Travel Flow is built on Supabase and Netlify, with multiple layers of protection for your data.',
            steps: [
              { text: 'The database is on Supabase PostgreSQL with Row Level Security (RLS): each user only accesses their own data.' },
              { text: 'Backend functions run on Netlify (serverless) with JWT authentication on every request.' },
              { text: 'No sensitive data passes through the frontend in plain text: all critical operations happen on the server.' },
            ],
            result: 'You have a multi-layer defense system, from database to interface.',
          },
          {
            id: 'chi-vede-dati',
            title: 'Who can see your data?',
            intro: 'Your trip data is accessible only to you and the collaborators you\'ve explicitly authorized.',
            steps: [
              { text: 'Only you (Owner) have full access to all trip data.' },
              { text: 'Collaborators (Travelers and Guests) see the shared trip data — never your personal bookings in other trips.' },
              { text: 'Passport data and loyalty programs are visible only to their owner, never to collaborators.' },
              { text: 'The platform admin has access to aggregate metadata (counts, statistics) but not booking content.' },
            ],
            result: 'You have full control over who accesses your trip data.',
          },
          {
            id: 'cifratura-dati',
            title: 'Sensitive data encryption',
            intro: 'Sensitive data like passports is encrypted with AES-256-GCM before saving.',
            steps: [
              { text: 'When you save passport data, it\'s encrypted on the server with a dedicated key (not in the database).' },
              { text: 'The encrypted format is: iv:authTag:ciphertext (all in hexadecimal).' },
              { text: 'To view data, decryption occurs only at runtime — the encrypted value remains in the database.' },
            ],
            tips: [
              { type: 'info', text: 'AES-256-GCM guarantees both confidentiality and data integrity: it\'s impossible to modify encrypted data without decryption failing.' },
            ],
            result: 'Even with unauthorized database access, sensitive data remains unreadable.',
          },
          {
            id: 'autenticazione',
            title: 'Authentication methods',
            intro: 'Travel Flow supports two secure sign-in methods, both without traditional passwords.',
            steps: [
              { text: 'Google OAuth: sign in with your existing Google account. No additional password to remember.' },
              { text: 'OTP via email: receive a one-time code via email (valid for a few minutes). Enter it to sign in.' },
              { text: 'Both methods use JWT tokens signed by Supabase to authenticate every API request.' },
            ],
            tips: [
              { type: 'info', text: 'Creating a traditional password is not possible. This reduces the risk of dictionary attacks or credential stuffing.' },
            ],
            result: 'Access is secure and doesn\'t require remembering additional passwords.',
          },
          {
            id: 'piattaforma-inviti',
            title: 'Invite-only platform',
            intro: 'Travel Flow is a closed platform: registration requires receiving an invitation.',
            steps: [
              { text: 'Only existing users (or the admin) can send platform invitations via email.' },
              { text: 'Each invitation is personal and valid once only: it cannot be reused.' },
              { text: 'This mechanism prevents unauthorized registrations and maintains user base quality.' },
            ],
            result: 'Only trusted people have access to the platform.',
          },
          {
            id: 'eliminazione-dati',
            title: 'Deleting your data',
            intro: 'You can delete your trips at any time. For account deletion, contact support.',
            steps: [
              { text: 'To delete a trip: trip ⋮ menu → "Delete trip" → confirm.' },
              { text: 'Deletion removes bookings, activities, collaborators and attachments associated with the trip.' },
              { text: 'To delete your account and all associated data, contact the administrator.' },
            ],
            tips: [
              { type: 'warn', text: 'Trip deletion is irreversible. Deleted data cannot be recovered.' },
            ],
            result: 'You control what to delete and when. Deleted data is unrecoverable.',
          },
        ],
      },
    },

  }, // fine CONTENT

  // ─── Init ─────────────────────────────────────────────────────────────────
  init() {
    this.currentLang = localStorage.getItem('lang') || 'it';
    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get('section') || 'inizia-qui';
    this.renderSection(sectionId);
    this.initTocToggle();
    if (window.i18n) window.i18n.apply();
  },

  // ─── Render sezione ───────────────────────────────────────────────────────
  renderSection(sectionId) {
    const content = this.CONTENT[sectionId];
    if (!content) {
      this.renderNotFound(sectionId);
      return;
    }

    const lang = content[this.currentLang] || content.it;

    // Breadcrumb
    const breadcrumb = document.getElementById('help-breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = lang.title;

    // Hero
    const cat = window.helpPage?.CATEGORIES?.find(c => c.id === sectionId);
    const heroEl = document.getElementById('help-detail-hero');
    const heroIcon = document.getElementById('help-detail-hero-icon');
    const heroTitle = document.getElementById('help-detail-hero-title');
    const heroDesc = document.getElementById('help-detail-hero-desc');

    if (heroEl && cat) {
      heroEl.style.background = cat.gradient || 'var(--color-primary)';
    }
    if (heroIcon && cat) heroIcon.innerHTML = cat.icon || '';
    if (heroTitle) heroTitle.textContent = lang.title;
    if (heroDesc) heroDesc.textContent = lang.desc;
    // Rimuovi skeleton dell'hero dopo aver scritto i dati
    heroEl?.classList.remove('is-loading');

    // TOC + articoli
    this.renderTOC(lang.articles);
    this.renderArticles(lang.articles);

    // Altre categorie
    this.renderOtherCategories(sectionId);

    // IntersectionObserver per TOC attiva
    this.initTocObserver();
  },

  // ─── TOC ──────────────────────────────────────────────────────────────────
  renderTOC(articles) {
    const toc = document.getElementById('help-toc');
    if (!toc || !articles?.length) return;

    const label = this.currentLang === 'en' ? 'In this section' : 'In questa sezione';
    toc.innerHTML = `
      <p class="help-toc-label">${label}</p>
      <ol class="help-toc-list">
        ${articles.map((a, i) => `
          <li class="help-toc-item">
            <a href="#${a.id}" class="help-toc-link" data-id="${a.id}">
              <span class="help-toc-num">${i + 1}</span>
              <span>${a.title}</span>
            </a>
          </li>
        `).join('')}
      </ol>
    `;

    // Click su link TOC: chiudi toggle mobile
    toc.querySelectorAll('.help-toc-link').forEach(link => {
      link.addEventListener('click', () => {
        const sidebar = document.querySelector('.help-toc-sidebar');
        if (sidebar && window.innerWidth < 900) {
          sidebar.classList.remove('toc-open');
          const btn = document.getElementById('help-toc-toggle');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  },

  initTocObserver() {
    const links = document.querySelectorAll('.help-toc-link');
    if (!links.length) return;

    // Disconnetti observer precedente per evitare observer multipli
    if (this._tocObserver) {
      this._tocObserver.disconnect();
      this._tocObserver = null;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(`.help-toc-link[data-id="${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

    // Osserva sia articoli reali che skeleton placeholder (condividono lo stesso id)
    document.querySelectorAll('.help-article-block[id], .help-article-skel[id]').forEach(el => observer.observe(el));

    this._tocObserver = observer;
  },

  initTocToggle() {
    const btn = document.getElementById('help-toc-toggle');
    const sidebar = document.querySelector('.help-toc-sidebar');
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('toc-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  },

  // ─── Articoli: eager per i primi, skeleton placeholder per i lazy ─────────
  renderArticles(articles) {
    const container = document.getElementById('help-articles-container');
    if (!container || !articles?.length) return;

    const EAGER_COUNT = 2;
    const lazyArticles = articles.slice(EAGER_COUNT);

    // Render immediato dei primi articoli (con divider incluso)
    let html = articles.slice(0, EAGER_COUNT).map((a, i) =>
      this.renderArticleBlock(a, i, articles.length)
    ).join('');

    // Skeleton placeholder per ogni articolo lazy: visibili subito, sostituiti al passaggio in viewport
    lazyArticles.forEach((a, i) => {
      const idx = EAGER_COUNT + i;
      const isLast = idx === articles.length - 1;
      html += `
        <div class="help-article-skel" id="${a.id}" data-idx="${idx}" aria-hidden="true">
          <div class="help-skeleton-bar" style="width:50%;height:1.3rem;margin-bottom:var(--spacing-5)"></div>
          <div class="help-article-skel-intro">
            <div class="help-skeleton-bar" style="width:90%;margin-bottom:var(--spacing-3)"></div>
            <div class="help-skeleton-bar" style="width:73%"></div>
          </div>
          <div class="help-article-skel-steps">
            <div class="help-article-skel-step">
              <div class="help-article-skel-num"></div>
              <div style="flex:1;display:flex;flex-direction:column;gap:var(--spacing-2)">
                <div class="help-skeleton-bar" style="width:86%"></div>
                <div class="help-skeleton-bar" style="width:64%"></div>
              </div>
            </div>
            <div class="help-article-skel-step">
              <div class="help-article-skel-num"></div>
              <div style="flex:1;display:flex;flex-direction:column;gap:var(--spacing-2)">
                <div class="help-skeleton-bar" style="width:78%"></div>
                <div class="help-skeleton-bar" style="width:52%"></div>
              </div>
            </div>
            <div class="help-article-skel-step">
              <div class="help-article-skel-num"></div>
              <div style="flex:1"><div class="help-skeleton-bar" style="width:92%"></div></div>
            </div>
          </div>
          <div class="help-article-skel-result">
            <div class="help-skeleton-bar" style="width:68%"></div>
          </div>
        </div>
        ${!isLast ? '<hr class="help-article-divider" aria-hidden="true">' : ''}
      `;
    });

    container.innerHTML = html;
    if (!lazyArticles.length) return;

    // Observer per-placeholder: quando entra in viewport, sostituisce skeleton con articolo reale
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        const idx = parseInt(entry.target.dataset.idx);
        const article = articles[idx];

        // Crea il blocco reale senza divider (l'HR è già nel DOM dal loop skeleton)
        const tmp = document.createElement('div');
        tmp.innerHTML = this.renderArticleBlock(article, idx, articles.length, false);
        const block = tmp.firstElementChild;
        block.classList.add('help-article-lazy');

        // Swappa skeleton → articolo reale
        entry.target.replaceWith(block);

        // Fade-in nel prossimo frame (garantisce che il browser applichi opacity:0 prima della transizione)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => block.classList.add('help-article-visible'));
        });

        // Aggiorna TOC observer per includere il nuovo blocco
        this.initTocObserver();
      });
    }, { rootMargin: '80px 0px' });

    container.querySelectorAll('.help-article-skel').forEach(p => observer.observe(p));
  },

  renderArticleBlock(article, idx, total, showDivider = true) {
    const stepsHtml = article.steps?.length ? `
      <ol class="help-steps-list" role="list">
        ${article.steps.map((step, i) => `
          <li class="help-step">
            <div class="help-step-number" aria-hidden="true">${i + 1}</div>
            <div class="help-step-body">
              <p class="help-step-text">${step.text}</p>
              ${step.image ? this.renderStepImage(step.image) : ''}
            </div>
          </li>
        `).join('')}
      </ol>
    ` : '';

    const tipsHtml = article.tips?.length ? article.tips.map(tip => `
      <div class="help-callout help-callout-${tip.type}" role="note">
        <span class="help-callout-icon">${this.calloutIcon(tip.type)}</span>
        <p>${tip.text}</p>
      </div>
    `).join('') : '';

    const resultHtml = article.result ? `
      <div class="help-article-result" role="note">
        <div class="help-article-result-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p>${article.result}</p>
      </div>
    ` : '';

    const relatedHtml = article.related?.length ? this.renderRelated(article.related) : '';

    const divider = showDivider && idx < total - 1 ? '<hr class="help-article-divider" aria-hidden="true">' : '';

    return `
      <section id="${article.id}" class="help-article-block">
        <h2 class="help-article-title">${article.title}</h2>
        ${article.intro ? `<div class="help-article-intro"><p>${article.intro}</p></div>` : ''}
        ${stepsHtml}
        ${tipsHtml}
        ${resultHtml}
        ${relatedHtml}
      </section>
      ${divider}
    `;
  },

  renderStepImage(imagePath) {
    const src = `/assets/help-images/${imagePath}`;
    const filename = imagePath.split('/').pop();
    const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="%23f1f5f9"/><rect x="1" y="1" width="598" height="358" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-dasharray="8,4"/><g opacity=".4"><circle cx="300" cy="155" r="28" fill="%2394a3b8"/><path d="M289 155a11 11 0 0 1 22 0" fill="%2394a3b8"/><rect x="275" y="155" width="50" height="35" rx="4" fill="%2394a3b8"/><circle cx="292" cy="170" r="5" fill="white"/></g><text x="300" y="225" font-family="system-ui,sans-serif" font-size="13" fill="%2394a3b8" text-anchor="middle">${filename}</text></svg>`)}`;
    return `
      <div class="help-step-image-wrap">
        <img
          src="${src}"
          alt="${filename}"
          class="help-step-image"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        >
        <div class="help-step-image-placeholder" style="display:none" aria-hidden="true">
          <img src="${placeholderSvg}" alt="" style="width:100%;height:auto;display:block;">
        </div>
      </div>
    `;
  },

  renderRelated(sectionIds) {
    const cats = window.helpPage?.CATEGORIES || [];
    const links = sectionIds
      .map(id => cats.find(c => c.id === id))
      .filter(Boolean)
      .map(cat => {
        const title = this.currentLang === 'en' ? cat.titleEn : cat.titleIt;
        return `
          <a href="/help-detail.html?section=${cat.id}" class="help-related-card">
            <span class="help-related-icon" style="background:${cat.gradient}; color:#fff;">${cat.icon}</span>
            <span>${title}</span>
          </a>
        `;
      });

    if (!links.length) return '';

    const label = this.currentLang === 'en' ? 'Related topics' : 'Argomenti correlati';
    return `
      <div class="help-related">
        <p class="help-related-label">${label}</p>
        <div class="help-related-list">${links.join('')}</div>
      </div>
    `;
  },

  calloutIcon(type) {
    if (type === 'warn') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    if (type === 'info') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';
  },

  // ─── Helper singola card "altre categorie" ───────────────────────────────
  renderOtherCard(cat) {
    const title = this.currentLang === 'en' ? cat.titleEn : cat.titleIt;
    const desc = this.currentLang === 'en' ? cat.descEn : cat.descIt;
    return `
      <a href="/help-detail.html?section=${cat.id}" class="help-other-card">
        <div class="help-other-icon" style="background:${cat.gradient}; color:#fff;">${cat.icon}</div>
        <div class="help-other-text">
          <span class="help-other-title">${title}</span>
          <span class="help-other-desc">${desc}</span>
        </div>
      </a>
    `;
  },

  // ─── Altre categorie con skeleton lazy per le card sotto la fold ──────────
  renderOtherCategories(currentSectionId) {
    const grid = document.getElementById('help-other-grid');
    if (!grid || !window.helpPage?.CATEGORIES) return;

    const others = window.helpPage.CATEGORIES.filter(c => c.id !== currentSectionId);
    const EAGER_COUNT = 5; // prima riga su desktop (5 colonne)

    let html = others.slice(0, EAGER_COUNT).map(cat => this.renderOtherCard(cat)).join('');

    others.slice(EAGER_COUNT).forEach((cat, i) => {
      html += `
        <div class="help-other-skel" data-idx="${EAGER_COUNT + i}" aria-hidden="true">
          <div class="help-other-skel-icon"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px">
            <div class="help-skeleton-bar" style="width:80%;height:.7rem"></div>
            <div class="help-skeleton-bar" style="width:60%;height:.6rem"></div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    const skeletons = grid.querySelectorAll('.help-other-skel');
    if (!skeletons.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        const cat = others[parseInt(entry.target.dataset.idx)];
        const tmp = document.createElement('div');
        tmp.innerHTML = this.renderOtherCard(cat);
        const card = tmp.firstElementChild;
        card.classList.add('help-other-card-lazy');

        entry.target.replaceWith(card);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => card.classList.add('help-other-card-visible'));
        });
      });
    }, { rootMargin: '80px 0px' });

    skeletons.forEach(s => observer.observe(s));
  },

  renderNotFound(sectionId) {
    const container = document.getElementById('help-articles-container');
    if (container) {
      const msg = this.currentLang === 'en'
        ? `Section "${sectionId}" not found.`
        : `Sezione "${sectionId}" non trovata.`;
      container.innerHTML = `<p class="help-not-found">${msg}</p>`;
    }
  },

};

window.helpDetailPage = helpDetailPage;
