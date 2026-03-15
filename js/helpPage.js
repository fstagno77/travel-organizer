/**
 * Help Page — Aiuto / Help
 * Gestisce le card categorie, la ricerca e le FAQ nella pagina principale.
 * I contenuti dettagliati sono in helpDetailPage.js (pagina help-detail.html)
 */

const helpPage = {

  currentLang: 'it',

  // ─── Definizione categorie ────────────────────────────────────────────────
  // Icone e colori allineati all'app (activityCategories.js + tripPage.js)
  // Gradienti e colori allineati a activityCategories.js (stile card Attività)
  CATEGORIES: [
    {
      id: 'inizia-qui',
      titleIt: 'Inizia qui',
      titleEn: 'Getting Started',
      descIt: 'Crea il tuo primo viaggio e carica le prenotazioni PDF',
      descEn: 'Create your first trip and upload booking PDFs',
      color: '#2163f6',
      gradient: 'linear-gradient(135deg, #4f8ef7, #2163f6)',
      // Icona bussola — orienta l'utente, più attinente di un razzo
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    },
    {
      id: 'voli',
      titleIt: 'Voli',
      titleEn: 'Flights',
      descIt: 'Gestisci voli, passeggeri e prenotazioni aeree',
      descEn: 'Manage flights, passengers and airline bookings',
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    },
    {
      id: 'hotel',
      titleIt: 'Hotel',
      titleEn: 'Hotels',
      descIt: 'Prenotazioni hotel, check-in e check-out',
      descEn: 'Hotel bookings, check-in and check-out',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #34d399, #14b8a6)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M9 16h.01"/><path d="M15 16h.01"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>`,
    },
    {
      id: 'treni',
      titleIt: 'Treni',
      titleEn: 'Trains',
      descIt: 'Biglietti ferroviari integrati nell\'itinerario giornaliero',
      descEn: 'Train tickets integrated into your daily itinerary',
      color: '#e67e22',
      gradient: 'linear-gradient(135deg, #f5a54d, #e67e22)',
      // Stessa icona treno usata in activityCategories.js e tripActivities.js
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/></svg>`,
    },
    {
      id: 'bus',
      titleIt: 'Bus',
      titleEn: 'Buses',
      descIt: 'Biglietti autobus e pullman nel tuo viaggio',
      descEn: 'Bus and coach tickets in your trip',
      color: '#8e44ad',
      gradient: 'linear-gradient(135deg, #b87fd1, #8e44ad)',
      // Stessa icona bus usata in tripActivities.js (directions_bus → SVG equivalente)
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-4.4c.2-2.6.1-4.6.1-4.6V7L14 4H5L2 10v5"/><circle cx="6" cy="18" r="2"/><path d="M8 18h8"/><circle cx="16" cy="18" r="2"/></svg>`,
    },
    {
      id: 'noleggio',
      titleIt: 'Noleggio Auto',
      titleEn: 'Car Rentals',
      descIt: 'Gestisci ritiro, restituzione e dettagli noleggio',
      descEn: 'Manage pickup, drop-off and rental details',
      color: '#0891b2',
      gradient: 'linear-gradient(135deg, #0ea5e9, #0891b2)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.8L18 11l-2-4H8L6 11l-2.5.2C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    },
    {
      id: 'attivita',
      titleIt: 'Attività',
      titleEn: 'Activities',
      descIt: 'Aggiungi esperienze e appuntamenti al tuo viaggio',
      descEn: 'Add experiences and appointments to your trip',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #fbbf24, #f97316)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      id: 'collaborazione',
      titleIt: 'Collaborazione',
      titleEn: 'Collaboration',
      descIt: 'Invita compagni di viaggio e gestisci i ruoli',
      descEn: 'Invite travel companions and manage roles',
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
      id: 'notifiche',
      titleIt: 'Notifiche',
      titleEn: 'Notifications',
      descIt: 'Aggiornamenti in tempo reale sulle modifiche al viaggio',
      descEn: 'Real-time updates on trip changes',
      color: '#8e44ad',
      gradient: 'linear-gradient(135deg, #b87fd1, #8e44ad)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    },
    {
      id: 'profilo',
      titleIt: 'Profilo & Viaggiatori',
      titleEn: 'Profile & Travelers',
      descIt: 'I tuoi dati, i tuoi compagni e i programmi fedeltà',
      descEn: 'Your data, companions and loyalty programs',
      color: '#3949ab',
      gradient: 'linear-gradient(135deg, #6575d4, #3949ab)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    },
    {
      id: 'sicurezza',
      titleIt: 'Sicurezza & Privacy',
      titleEn: 'Security & Privacy',
      descIt: 'Come proteggiamo i tuoi dati e cosa puoi controllare',
      descEn: 'How we protect your data and what you control',
      color: '#00796b',
      gradient: 'linear-gradient(135deg, #26a69a, #00796b)',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
  ],

  // ─── FAQ ─────────────────────────────────────────────────────────────────
  FAQS: {
    it: [
      {
        q: 'Come creo un viaggio?',
        a: 'Clicca il pulsante "Nuovo Viaggio" nella barra laterale sinistra. Si apre un pannello dove puoi caricare uno o più PDF di prenotazione (voli, hotel, treni, noleggi). Travel Flow analizza i documenti automaticamente e crea l\'itinerario con tutti i dettagli già compilati — numero volo, orari, passeggeri, indirizzo hotel e date di check-in/check-out. Se non hai PDF, puoi anche creare un viaggio vuoto e aggiungere le prenotazioni manualmente in un secondo momento tramite il tab Attività.',
      },
      {
        q: 'Quali compagnie aeree e provider supportate?',
        a: 'Il sistema SmartParse riconosce PDF di ITA Airways, Ryanair, EasyJet, Vueling, Emirates e molte altre compagnie aeree. Per gli hotel supporta le conferme di Booking.com, Expedia e portali simili. Per i treni sono supportati i biglietti Trenitalia e Italo. Quando un formato non è ancora nel database dei template, l\'AI Claude lo analizza comunque e impara per le volte successive, quindi la copertura cresce nel tempo. Se un PDF non viene riconosciuto correttamente, puoi modificare i campi manualmente dopo l\'importazione.',
      },
      {
        q: 'Quanti livelli di condivisione esistono?',
        a: 'Travel Flow ha due livelli distinti. Il primo è la condivisione come collaboratore: puoi invitare un utente registrato (o farlo registrare) come Viaggiatore — può modificare le prenotazioni — oppure come Ospite — può solo consultare l\'itinerario. In entrambi i casi la persona accede con il proprio account e riceve aggiornamenti in tempo reale. Il secondo livello è il link di sola lettura pubblica: chiunque abbia il link può vedere l\'itinerario senza creare un account, senza poter modificare nulla e senza accedere ai dati sensibili. Usa il link pubblico per condividere l\'itinerario con chi non ha bisogno di far parte della piattaforma (familiari, agenzie, ecc.).',
      },
      {
        q: 'Qual è la differenza tra Viaggiatore e Ospite?',
        a: 'Ci sono tre ruoli distinti. Il Proprietario ha controllo totale: può modificare, invitare e cancellare il viaggio. Il Viaggiatore può modificare tutte le prenotazioni (aggiungere, editare, cancellare voli/hotel/attività) e può invitare altri utenti come Ospiti, ma non può cancellare il viaggio. L\'Ospite è in sola lettura: vede l\'intero itinerario ma non può fare modifiche. Può solo lasciare il viaggio dal menu. Scegli il ruolo in base al livello di fiducia: usa Viaggiatore per chi pianifica il viaggio insieme a te, Ospite per chi deve solo consultare l\'itinerario.',
      },
      {
        q: 'Come carico le mie ricevute e conferme di prenotazione?',
        a: 'Hai due modi. Il primo è il caricamento diretto: clicca "Nuovo Viaggio" o "Aggiungi prenotazione" dal menu ⋮ del viaggio e seleziona il PDF dal tuo dispositivo. Il secondo — e più comodo — è l\'inoltro email: inoltra qualsiasi email di conferma (volo, hotel, treno, noleggio) direttamente a trips@travel-flow.com usando lo stesso indirizzo con cui sei registrato su Travel Flow. Il sistema estrae automaticamente i dati e crea una prenotazione in sospeso che trovi nel badge della campanella. Da lì puoi aggiungerla a un viaggio esistente o creare un nuovo viaggio con un solo clic. Funziona sia con email HTML che con PDF allegati.',
      },
      {
        q: 'I dati del passaporto sono sicuri?',
        a: 'Sì, sono protetti con crittografia AES-256-GCM, lo stesso standard usato in ambito bancario. Quando salvi un documento nel profilo, i dati sensibili (numero passaporto, data di scadenza, nazionalità) vengono cifrati sul server prima di essere scritti nel database. La chiave di cifratura non è mai accessibile al database stesso, quindi nemmeno chi ha accesso diretto ai dati grezzi può leggere le informazioni in chiaro. Puoi visualizzare i dati salvati con l\'icona a occhio nella pagina Profilo, che li decifra solo per la durata della sessione.',
      },
      {
        q: 'Posso usare Travel Flow senza caricare PDF?',
        a: 'Assolutamente sì. Il tab Attività ti permette di aggiungere qualsiasi tipo di evento manualmente: escursioni, ristoranti, appuntamenti, trasferimenti, visite guidate. Per ogni attività puoi inserire data, orario di inizio e fine, descrizione, link utili (sito del posto, Google Maps, ecc.) e fino a 5 allegati (foto, voucher, conferme) da massimo 10 MB ciascuno. Le attività manuali appaiono nell\'itinerario giornaliero insieme a voli e hotel, ordinate cronologicamente per avere una visione completa della giornata.',
      },
      {
        q: 'Come funziona il riconoscimento automatico dei PDF?',
        a: 'Travel Flow usa un sistema a tre livelli chiamato SmartParse. Al primo caricamento, se il formato del PDF è già conosciuto, usa un template preesistente per estrarre i dati in pochi secondi senza chiamate AI. Se il formato è nuovo, attiva l\'AI Claude (Anthropic) che analizza il testo del documento e ne estrae tutte le informazioni rilevanti; questo richiede qualche secondo in più ma produce risultati molto accurati. Dopo la prima analisi, il template viene memorizzato: i caricamenti successivi dello stesso formato sono istantanei e non consumano risorse AI. Il risultato viene sempre mostrato in anteprima prima del salvataggio finale.',
      },
      {
        q: 'Cosa succede se i dati estratti dal PDF o dall\'email non sono corretti?',
        a: 'Può capitare, soprattutto con provider o formati non ancora conosciuti dal sistema. In ogni caso puoi correggere manualmente qualsiasi campo: apri la card della prenotazione (volo, hotel, ecc.) e clicca sull\'icona matita per modificare i dati estratti. L\'anteprima mostrata prima del salvataggio ti permette di accorgerti degli errori già in fase di importazione. Nel tempo SmartParse migliora automaticamente: ogni nuovo formato analizzato arricchisce il database dei template, quindi lo stesso PDF elaborato correttamente da un utente diventa un modello riutilizzabile per tutti. Più prenotazioni vengono caricate, più il sistema diventa accurato.',
      },
      {
        q: 'Chi può cancellare o modificare un viaggio?',
        a: 'Solo il Proprietario del viaggio può cancellarlo definitivamente — questa operazione richiede una conferma esplicita ed è irreversibile. Le modifiche alle prenotazioni (aggiungere/editare/cancellare voli, hotel, attività) sono consentite a Proprietario e Viaggiatori, non agli Ospiti. Quando un Viaggiatore o Ospite vuole uscire dal viaggio, può usare l\'opzione "Lascia questo viaggio" nel menu del viaggio: questo rimuove il suo accesso ma lascia intatto il viaggio per gli altri partecipanti. Ogni modifica significativa genera una notifica agli altri collaboratori.',
      },
    ],
    en: [
      {
        q: 'How do I create a trip?',
        a: 'Click the "New Trip" button in the left sidebar. A panel opens where you can upload one or more booking PDFs (flights, hotels, trains, rentals). Travel Flow analyzes the documents automatically and builds the itinerary with all details already filled in — flight number, times, passengers, hotel address, and check-in/check-out dates. If you don\'t have any PDFs, you can create an empty trip and add bookings manually later using the Activities tab.',
      },
      {
        q: 'Which airlines and providers do you support?',
        a: 'SmartParse recognizes PDFs from ITA Airways, Ryanair, EasyJet, Vueling, Emirates and many other airlines. For hotels it supports Booking.com, Expedia and similar portals. For trains, Trenitalia and Italo tickets are supported. When a format is not yet in the template database, Claude AI analyzes it anyway and learns for future uploads, so coverage grows over time. If a PDF isn\'t recognized correctly, you can edit the fields manually after importing.',
      },
      {
        q: 'How many sharing levels are there?',
        a: 'Travel Flow has two distinct levels. The first is sharing as a collaborator: you can invite a registered user (or have them register) as a Traveler — who can edit bookings — or as a Guest — who can only view the itinerary. In both cases the person signs in with their own account and receives real-time updates. The second level is the public read-only link: anyone with the link can view the itinerary without creating an account, without being able to edit anything, and without access to sensitive data. Use the public link to share your itinerary with people who don\'t need to be part of the platform (family members, travel agencies, etc.).',
      },
      {
        q: 'What\'s the difference between Traveler and Guest?',
        a: 'There are three distinct roles. The Owner has full control: they can edit, invite, and delete the trip. The Traveler can modify all bookings (add, edit, delete flights/hotels/activities) and can invite other users as Guests, but cannot delete the trip. The Guest is read-only: they can see the full itinerary but cannot make changes. They can only leave the trip from the menu. Choose the role based on trust level: use Traveler for someone planning the trip with you, Guest for someone who just needs to view the itinerary.',
      },
      {
        q: 'How do I upload my booking receipts and confirmations?',
        a: 'You have two ways. The first is direct upload: click "New Trip" or "Add booking" from the trip ⋮ menu and select the PDF from your device. The second — and most convenient — is email forwarding: forward any confirmation email (flight, hotel, train, rental) directly to trips@travel-flow.com using the same address you registered with on Travel Flow. The system automatically extracts the data and creates a pending booking that appears in the bell badge. From there you can add it to an existing trip or create a new trip with a single click. Works with both HTML emails and attached PDFs.',
      },
      {
        q: 'Is my passport data secure?',
        a: 'Yes, it\'s protected with AES-256-GCM encryption, the same standard used in banking. When you save a document in your profile, sensitive data (passport number, expiry date, nationality) is encrypted on the server before being written to the database. The encryption key is never accessible to the database itself, so even someone with direct access to the raw data cannot read the information in plain text. You can view saved data using the eye icon on the Profile page, which decrypts it only for the duration of the session.',
      },
      {
        q: 'Can I use Travel Flow without uploading PDFs?',
        a: 'Absolutely yes. The Activities tab lets you add any type of event manually: excursions, restaurants, appointments, transfers, guided tours. For each activity you can enter date, start and end time, description, useful links (venue website, Google Maps, etc.) and up to 5 attachments (photos, vouchers, confirmations) up to 10 MB each. Manual activities appear in the daily itinerary alongside flights and hotels, sorted chronologically to give you a complete view of the day.',
      },
      {
        q: 'How does automatic PDF recognition work?',
        a: 'Travel Flow uses a three-level system called SmartParse. On the first upload, if the PDF format is already known, it uses a pre-existing template to extract data in seconds with no AI calls. If the format is new, it activates Claude AI (Anthropic) which analyzes the document text and extracts all relevant information; this takes a few more seconds but produces very accurate results. After the first analysis, the template is memorized: subsequent uploads of the same format are instant and consume no AI resources. The result is always shown in a preview before the final save.',
      },
      {
        q: 'What happens if the data extracted from a PDF or email is incorrect?',
        a: 'It can happen, especially with providers or formats not yet known to the system. In any case you can manually correct any field: open the booking card (flight, hotel, etc.) and click the pencil icon to edit the extracted data. The preview shown before saving lets you spot errors right at the import stage. Over time SmartParse improves automatically: every new format successfully analyzed enriches the template database, so a PDF correctly processed by one user becomes a reusable model for everyone. The more bookings are uploaded, the more accurate the system becomes.',
      },
      {
        q: 'Who can delete or modify a trip?',
        a: 'Only the trip Owner can delete it permanently — this action requires explicit confirmation and is irreversible. Modifying bookings (adding/editing/deleting flights, hotels, activities) is allowed for Owners and Travelers, not Guests. When a Traveler or Guest wants to exit the trip, they can use the "Leave this trip" option in the trip menu: this removes their access but leaves the trip intact for other participants. Every significant change generates a notification to other collaborators.',
      },
    ],
  },

  // ─── Init ─────────────────────────────────────────────────────────────────
  init() {
    this.currentLang = localStorage.getItem('lang') || 'it';
    this.renderCategories();
    this.renderFaqs();
    this._saveCache();
    this.initSearch();
    if (window.i18n) window.i18n.apply();
  },

  /** Salva il contenuto renderizzato in sessionStorage per instant-render alla navigazione SPA successiva */
  _saveCache() {
    const lang = this.currentLang;
    const grid = document.getElementById('help-categories-grid');
    const faqList = document.getElementById('help-faq-list');
    try {
      if (grid) sessionStorage.setItem(`help-categories-${lang}`, grid.innerHTML);
      if (faqList) sessionStorage.setItem(`help-faq-${lang}`, faqList.innerHTML);
    } catch (e) { /* sessionStorage pieno, ignora */ }
  },

  // ─── Helpers ──────────────────────────────────────────────────────────────
  t(cat, field) {
    return this.currentLang === 'en' ? cat[field + 'En'] : cat[field + 'It'];
  },

  learnMoreText() {
    return this.currentLang === 'en' ? 'Learn more →' : 'Scopri →';
  },

  // ─── Render categorie ─────────────────────────────────────────────────────
  renderCategories() {
    const grid = document.getElementById('help-categories-grid');
    if (!grid) return;

    grid.innerHTML = this.CATEGORIES.map(cat => `
      <a href="/help-detail.html?section=${cat.id}" class="help-category-card">
        <div class="help-category-icon-wrap" style="background:${cat.gradient}; color:#ffffff;">
          ${cat.icon}
        </div>
        <h3 class="help-category-title">${this.t(cat, 'title')}</h3>
        <p class="help-category-desc">${this.t(cat, 'desc')}</p>
        <span class="help-category-link" style="color:${cat.color};">${this.learnMoreText()}</span>
      </a>
    `).join('');
  },

  // ─── Render FAQ ───────────────────────────────────────────────────────────
  renderFaqs() {
    const list = document.getElementById('help-faq-list');
    if (!list) return;

    const faqs = this.FAQS[this.currentLang] || this.FAQS.it;
    list.innerHTML = faqs.map((faq, idx) => `
      <div class="help-faq-item" data-idx="${idx}">
        <button class="help-faq-trigger" aria-expanded="false">
          <span class="help-faq-question">${faq.q}</span>
          <span class="help-faq-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
        </button>
        <div class="help-faq-answer"><p>${faq.a}</p></div>
      </div>
    `).join('');

    list.querySelectorAll('.help-faq-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.help-faq-item');
        const isOpen = item.classList.contains('open');
        list.querySelectorAll('.help-faq-item.open').forEach(el => {
          el.classList.remove('open');
          el.querySelector('.help-faq-trigger').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  },

  // ─── Ricerca con autocomplete ─────────────────────────────────────────────
  initSearch() {
    const input = document.getElementById('help-search-input');
    const btn = document.getElementById('help-search-btn');
    const dropdown = document.getElementById('help-autocomplete-dropdown');
    const resultsEl = document.getElementById('help-search-results');
    const resultsHeader = document.getElementById('help-search-results-header');
    const resultsList = document.getElementById('help-search-results-list');
    const categoriesSection = document.getElementById('help-categories-section');
    const faqSection = document.getElementById('help-faq');

    if (!input) return;

    let debounceTimer = null;
    let selectedIdx = -1;

    const noResultsText = () => this.currentLang === 'en'
      ? 'No results found. Try a different search term.'
      : 'Nessun risultato trovato. Prova con un termine diverso.';

    const countText = (n) => this.currentLang === 'en'
      ? (n === 1 ? '1 result' : `${n} results`)
      : (n === 1 ? '1 risultato' : `${n} risultati`);

    // Evidenzia la query nel testo
    const highlight = (text, q) => {
      if (!q) return text;
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="help-ac-highlight">$1</mark>');
    };

    // Costruisce i risultati di ricerca
    const buildResults = (q) => {
      const results = [];
      const lang = this.currentLang;

      // Categorie
      this.CATEGORIES.forEach(cat => {
        const title = this.t(cat, 'title');
        const desc = this.t(cat, 'desc');
        if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
          results.push({
            type: 'category',
            priority: title.toLowerCase().startsWith(q) ? 0 : 1,
            id: cat.id,
            section: lang === 'en' ? 'Category' : 'Categoria',
            title,
            excerpt: desc,
            color: cat.color,
            href: `/help-detail.html?section=${cat.id}`,
          });
        }
      });

      // Articoli nelle sezioni (da helpDetailPage se disponibile)
      if (window.helpDetailPage?.CONTENT) {
        Object.entries(window.helpDetailPage.CONTENT).forEach(([sectionId, sectionContent]) => {
          const sectionLang = sectionContent[lang] || sectionContent.it;
          const cat = this.CATEGORIES.find(c => c.id === sectionId);
          const sectionTitle = cat ? this.t(cat, 'title') : sectionId;

          sectionLang.articles?.forEach(article => {
            const titleMatch = article.title.toLowerCase().includes(q);
            const introMatch = article.intro?.toLowerCase().includes(q);
            const resultMatch = article.result?.toLowerCase().includes(q);
            if (titleMatch || introMatch || resultMatch) {
              results.push({
                type: 'article',
                priority: titleMatch ? 0 : 2,
                id: article.id,
                section: sectionTitle,
                title: article.title,
                excerpt: article.intro || article.result || '',
                color: cat?.color || '#6b7280',
                href: `/help-detail.html?section=${sectionId}#${article.id}`,
              });
            }
          });
        });
      }

      // FAQ
      const faqs = this.FAQS[lang] || this.FAQS.it;
      faqs.forEach((faq, idx) => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({
            type: 'faq',
            priority: faq.q.toLowerCase().includes(q) ? 1 : 3,
            idx,
            section: 'FAQ',
            title: faq.q,
            excerpt: faq.a.length > 100 ? faq.a.slice(0, 100) + '…' : faq.a,
            color: '#6b7280',
            href: null,
          });
        }
      });

      return results.sort((a, b) => a.priority - b.priority);
    };

    // Chiudi il dropdown
    const closeDropdown = () => {
      if (dropdown) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
      }
      input.setAttribute('aria-expanded', 'false');
      selectedIdx = -1;
    };

    // Mostra il dropdown autocomplete
    const showDropdown = (q) => {
      if (!dropdown || q.length < 2) { closeDropdown(); return; }

      const results = buildResults(q).slice(0, 6);
      if (!results.length) { closeDropdown(); return; }

      dropdown.innerHTML = results.map((r, i) => `
        <div class="help-ac-item" role="option" data-idx="${i}" data-href="${r.href || ''}" data-faq="${r.type === 'faq' ? r.idx : ''}">
          <span class="help-ac-dot" style="background:${r.color}"></span>
          <div class="help-ac-content">
            <span class="help-ac-section">${r.section}</span>
            <span class="help-ac-title">${highlight(r.title, q)}</span>
            ${r.excerpt ? `<span class="help-ac-excerpt">${highlight(r.excerpt.slice(0, 80), q)}</span>` : ''}
          </div>
        </div>
      `).join('');

      dropdown.classList.add('visible');
      input.setAttribute('aria-expanded', 'true');
      selectedIdx = -1;

      dropdown.querySelectorAll('.help-ac-item').forEach((el, i) => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          navigateTo(el);
        });
      });
    };

    const navigateTo = (el) => {
      const href = el.dataset.href;
      const faqIdx = el.dataset.faq;
      closeDropdown();
      if (href) {
        window.location.href = href;
      } else if (faqIdx !== '') {
        input.value = '';
        doFullSearch('');
        setTimeout(() => {
          if (faqSection) faqSection.style.display = '';
          const items = document.querySelectorAll('.help-faq-item');
          if (items[faqIdx]) {
            items[faqIdx].querySelector('.help-faq-trigger')?.click();
            items[faqIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    };

    // Ricerca completa (mostra risultati nella pagina)
    const doFullSearch = (q) => {
      closeDropdown();
      if (!q) {
        resultsEl.classList.remove('visible');
        if (categoriesSection) categoriesSection.style.display = '';
        if (faqSection) faqSection.style.display = '';
        return;
      }

      if (categoriesSection) categoriesSection.style.display = 'none';
      if (faqSection) faqSection.style.display = 'none';
      resultsEl.classList.add('visible');

      const results = buildResults(q);
      resultsHeader.textContent = countText(results.length);

      if (results.length === 0) {
        resultsList.innerHTML = `<div class="help-no-results">${noResultsText()}</div>`;
        return;
      }

      resultsList.innerHTML = results.map(r => `
        <div class="help-search-result-item" data-href="${r.href || ''}" data-faq="${r.type === 'faq' ? r.idx : ''}">
          <div class="help-search-result-section" style="color:${r.color}">${r.section}</div>
          <div class="help-search-result-title">${highlight(r.title, q)}</div>
          <div class="help-search-result-excerpt">${highlight(r.excerpt?.slice(0, 120) || '', q)}</div>
        </div>
      `).join('');

      resultsList.querySelectorAll('.help-search-result-item').forEach(el => {
        el.addEventListener('click', () => navigateTo(el));
      });
    };

    // Aggiorna selezione tastiera nel dropdown
    const updateSelection = () => {
      const items = dropdown?.querySelectorAll('.help-ac-item') || [];
      items.forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
    };

    // Input con debounce
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        showDropdown(input.value.trim().toLowerCase());
      }, 200);
    });

    // Navigazione tastiera
    input.addEventListener('keydown', e => {
      const items = dropdown?.querySelectorAll('.help-ac-item') || [];
      if (dropdown?.classList.contains('visible') && items.length) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
          updateSelection();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIdx = Math.max(selectedIdx - 1, -1);
          updateSelection();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIdx >= 0 && items[selectedIdx]) {
            navigateTo(items[selectedIdx]);
          } else {
            doFullSearch(input.value.trim().toLowerCase());
          }
          return;
        }
      } else if (e.key === 'Enter') {
        doFullSearch(input.value.trim().toLowerCase());
        return;
      }
      if (e.key === 'Escape') {
        if (dropdown?.classList.contains('visible')) {
          closeDropdown();
        } else {
          input.value = '';
          doFullSearch('');
        }
      }
    });

    btn.addEventListener('click', () => doFullSearch(input.value.trim().toLowerCase()));

    // Chiudi dropdown cliccando fuori
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.help-search-wrapper')) closeDropdown();
    });
  },
};

window.helpPage = helpPage;
