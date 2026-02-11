# Sprint 1 — Ottimizzazione Trip Page (impatto alto, effort basso-medio)

Usare questi prompt in sequenza (1 → 4). Ogni prompt e' autonomo e include tutto il contesto necessario.

---

## PROMPT 1 — Lazy tab rendering

### Contesto

L'app Travel Organizer ha una pagina viaggio (`trip.html`) orchestrata da `js/tripPage.js`. La pagina ha 3 tab: Activities, Flights, Hotels, gestiti da un segmented control.

Attualmente `renderTripContent()` in `tripPage.js` (linea 253-255) chiama **subito** il render di tutti e 3 i tab:

```js
window.tripFlights.render(document.getElementById('flights-container'), tripData.flights);
window.tripHotels.render(document.getElementById('hotels-container'), tripData.hotels);
window.tripActivities.render(document.getElementById('activities-container'), tripData);
```

Questo significa che anche se l'utente vede solo il tab Activities (quello di default), il browser costruisce l'intero DOM di Flights e Hotels, inclusi listener, bottoni, dettagli nascosti, etc. Per un viaggio con 8 voli e 3 hotel, il DOM generato e' circa 3x quello necessario.

I moduli di rendering sono:
- `js/tripActivities.js`: funzione `renderActivities(container, tripData)` esposta come `window.tripActivities.render`
- `js/tripFlights.js`: funzione `renderFlights(container, flights)` esposta come `window.tripFlights.render`
- `js/tripHotels.js`: funzione `renderHotels(container, hotels)` esposta come `window.tripHotels.render`

Il tab switching e' gestito da `switchToTab(tabName)` in `tripPage.js` (linea 331-361), che toglie/aggiunge la classe `active` sui `div.tab-content`.

Dopo operazioni come edit/delete/add booking, il codice chiama `loadTripFromUrl()` che ri-scarica il trip e chiama `renderTrip()` -> `renderTripContent()`, ri-renderizzando tutto. Dopo il re-render, viene chiamato `switchToTab(activeTab)` per ripristinare il tab corrente.

Nella tab Activities ci sono link "Dettagli" che navigano verso Voli/Hotel: `tripActivities.js` (linea 269) chiama `window.tripPage.switchToTab(tab)` per passare al tab destinazione.

### Obiettivo

Implementare lazy rendering dei tab: renderizzare solo il tab attivo, e gli altri al primo accesso.

1. **Al caricamento iniziale**, renderizza solo il tab di default (Activities). I container di Flights e Hotels restano vuoti.

2. **Traccia lo stato di render** di ogni tab con un oggetto (es. `tabRendered = { activities: false, flights: false, hotels: false }`).

3. **In `switchToTab(tabName)`**, prima di mostrare un tab, controlla se e' stato gia' renderizzato. Se no, chiama il render appropriato:
   - `activities` -> `window.tripActivities.render(container, currentTripData)`
   - `flights` -> `window.tripFlights.render(container, currentTripData.flights)`
   - `hotels` -> `window.tripHotels.render(container, currentTripData.hotels)`
   Poi segna il tab come renderizzato.

4. **Quando `renderTripContent()` viene chiamato** (sia al primo load che dopo un re-fetch), resetta lo stato di render di tutti i tab e renderizza solo il tab che sara' attivo.

5. **Compatibilita' con navigazione da Activities**: quando l'utente clicca "Dettagli" su un evento flight/hotel nella timeline Activities, il `switchToTab('flights')` o `switchToTab('hotels')` deve triggerare il render del tab destinazione se non ancora renderizzato, prima di fare lo scroll alla card (il `setTimeout` di 100ms in `tripActivities.js` linea 271 dovrebbe bastare).

### Vincoli

- Non modificare la firma delle funzioni render dei moduli (`tripFlights.render`, `tripHotels.render`, `tripActivities.render`).
- Mantieni compatibilita' con il cambio lingua: `window.addEventListener('languageChanged')` in `tripPage.js` (linea 1784) chiama `renderTrip()` che deve resettare tutto.
- Mantieni compatibilita' con il restore del tab su page refresh: `tripPage.js` (linea 263-266) usa `sessionStorage.getItem('tripActiveTab')`.
- Non aggiungere librerie esterne.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri un viaggio: verifica che il tab Activities si carichi subito, e che i container `#flights-container` e `#hotels-container` siano vuoti nel DOM.
3. Clicca sul tab Flights: verifica che le card dei voli appaiano senza ritardo percepibile.
4. Clicca sul tab Hotels: verifica che le card degli hotel appaiano.
5. Torna su Activities e clicca "Dettagli" su un volo: verifica che si passi al tab Flights e lo scroll arrivi alla card corretta.
6. Aggiungi un booking (upload PDF da menu): verifica che dopo il reload il tab corrente sia preservato e il contenuto aggiornato.
7. Cambia lingua dalle impostazioni: verifica che tutti i tab si aggiornino correttamente.

---

## PROMPT 2 — Lazy dettagli card (Flights e Hotels)

### Contesto

L'app Travel Organizer renderizza le card dei voli in `js/tripFlights.js` e quelle degli hotel in `js/tripHotels.js`.

**Flights** (`tripFlights.js`, funzione `renderFlights`, linea 84-302):
Ogni flight card contiene una sezione `.flight-details` (linee 144-300) nascosta via CSS (nessuna classe `active`). Questa sezione include:
- Per voli multi-passeggero: lista completa dei passeggeri con nome, tipo, ticket number, booking reference, bottoni PDF, bottoni delete, menu 3-dot con dropdown
- Per voli singolo passeggero: griglia con booking ref, ticket number, seat, class, bottone PDF
- Bottone "Modifica volo" e "Elimina volo"

L'utente vede i dettagli solo cliccando "Mostra dettagli" (`flight-toggle-details` button, linea 137). Ma l'HTML e' gia' costruito al render iniziale nel `.map()`.

Dopo il render, vengono inizializzati molti listener (linee 321-329):
```js
initFlightToggleButtons();
initEditItemButtons();
initDeleteItemButtons();
initPdfDownloadButtons();
initSmallPdfButtons();
initDeletePassengerButtons();
initPassengerMenus();
initCopyValueButtons();
initQuickUploadCard();
```

**Hotels** (`tripHotels.js`, funzione `renderHotels`, linea 47-174):
Ogni hotel card contiene una sezione `.hotel-details` (linee 115-172) nascosta, con:
- Griglia con room type, guests, guest name, phone, price, confirmation
- Bottone PDF, "Modifica hotel", "Elimina hotel"

Dopo il render, listener inizializzati (linee 193-197):
```js
initHotelToggleButtons();
initEditItemButtons();
initDeleteItemButtons();
initPdfDownloadButtons();
initQuickUploadCard();
```

Il pattern `cloneNode(true) + replaceChild` viene usato in molte funzioni init (es. `tripFlights.js` linea 357-359, 409-410) per rimuovere listener duplicati ad ogni re-render.

### Obiettivo

Generare l'HTML dei dettagli (`.flight-details` e `.hotel-details`) solo quando l'utente clicca "Mostra dettagli", non al render iniziale.

**Per Flights (`tripFlights.js`):**

1. Nel `.map()` della funzione `renderFlights`, sostituisci l'HTML della sezione `.flight-details` con un **placeholder vuoto**:
   ```html
   <div class="flight-details" id="flight-details-${index}" data-flight-index="${index}"></div>
   ```
   Rimuovi tutto l'HTML dei dettagli dal template iniziale. Mantieni il bottone toggle e tutto il resto della card sopra (header, route, durata).

2. Crea una nuova funzione `renderFlightDetails(flight, index)` che generi l'HTML dei dettagli (l'attuale contenuto di `.flight-details`). Questa funzione deve restituire la stringa HTML.

3. Modifica `initFlightToggleButtons()`: quando l'utente clicca il bottone toggle, prima di mostrare i dettagli controlla se il contenuto e' gia' stato generato (es. verifica se il div e' vuoto o ha un data attribute `data-rendered`). Se non e' stato generato:
   - Chiama `renderFlightDetails(flight, index)` per ottenere l'HTML
   - Inserisci nel div `.flight-details`
   - Inizializza i listener solo per quella card (edit, delete, PDF download, copy, passenger menus)
   - Segna come renderizzato (`data-rendered="true"`)

4. Per accedere ai dati del volo nel click handler, salva l'array `sortedFlights` in una variabile accessibile (es. closure o `window.tripFlights._flights`).

5. I listener globali che prima erano inizializzati per tutte le card al render (`initEditItemButtons`, `initDeleteItemButtons`, etc.) devono ora essere chiamati solo per i dettagli appena espansi. I bottoni della card principale (header, route) che non sono nei dettagli restano invariati.

**Per Hotels (`tripHotels.js`):**

6. Applica lo stesso pattern: placeholder vuoto per `.hotel-details`, funzione `renderHotelDetails(hotel, index)`, init listener on-expand.

7. Crea una funzione `renderHotelDetails(hotel, index)` analoga.

8. Modifica `initHotelToggleButtons()` con la stessa logica: genera HTML e init listener al primo click.

### Vincoli

- Mantieni inalterato il comportamento visuale: il toggle apre/chiude i dettagli con la stessa animazione CSS.
- Il bottone toggle deve continuare a cambiare testo tra "Mostra dettagli" / "Nascondi dettagli".
- Le funzioni `buildEditForm` e `collectUpdates` esposte da `tripFlights` e `tripHotels` non devono cambiare (sono usate dal pannello edit in `tripPage.js`).
- L'inizializzazione di `initQuickUploadCard` resta al render della card principale, non nei dettagli.
- Non aggiungere librerie esterne.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri un viaggio con voli: verifica che le card mostrino header, rotta e durata ma NON i dettagli. Ispeziona il DOM e verifica che `.flight-details` sia vuoto.
3. Clicca "Mostra dettagli" su un volo: verifica che i dettagli appaiano (booking ref, ticket, passeggeri, bottoni).
4. Clicca "Nascondi dettagli" e poi "Mostra dettagli" di nuovo: verifica che i dettagli non vengano ri-generati (check `data-rendered`).
5. Testa i bottoni nei dettagli: "Modifica volo", "Elimina volo", download PDF, copia booking ref.
6. Per voli multi-passeggero: verifica che la lista passeggeri appaia correttamente con menu 3-dot e bottone elimina passeggero.
7. Ripeti i test 2-6 per le card hotel.
8. Aggiungi un booking e verifica che dopo il re-render i dettagli siano di nuovo in stato "non renderizzato".

---

## PROMPT 3 — Parallelizzare init e posticipare footer

### Contesto

L'app Travel Organizer ha una sequenza di inizializzazione in `js/tripPage.js` (funzione `init`, linee 42-73):

```js
async function init() {
  await i18n.init();
  await auth.init();
  await navigation.init();
  i18n.apply();
  if (!auth?.requireAuth()) return;
  await loadTripFromUrl();
}
```

Il modulo `navigation.js` (`js/navigation.js`, funzione `init`, linee 12-17):
```js
async init() {
  await this.loadHeader();
  await this.loadFooter();
  this.setActiveNavLink();
  this.startPendingBookingsPolling();
}
```

Problemi della sequenza attuale:
- `navigation.init()` e' awaited interamente prima di `loadTripFromUrl()`.
- `loadHeader()` e' necessario prima del rendering (mostra avatar utente, bottone new trip).
- `loadFooter()` fa un fetch di `changelog.json` (`navigation.js` linea 106) per mostrare la versione nel footer. Questo fetch blocca `loadTripFromUrl()`, ma l'utente non vede mai il footer prima del contenuto principale.
- `startPendingBookingsPolling()` chiama `updatePendingBookingsCount()` che fa un fetch a `/.netlify/functions/pending-bookings` per il badge delle notifiche. Anche questo blocca indirettamente il trip load.

La catena di waterfall e':
```
i18n.init() -> auth.init() -> navigation.loadHeader() -> navigation.loadFooter() [fetch changelog.json] -> navigation.startPendingBookingsPolling() [fetch pending-bookings] -> loadTripFromUrl() [fetch get-trip]
```

Il contenuto utile (i dati del viaggio) arriva solo alla fine della catena.

### Obiettivo

Riorganizzare la sequenza di init per rendere il primo contenuto utile visibile il prima possibile.

1. **Separa `loadHeader()` da `loadFooter()`** nella sequenza di init di `tripPage.js`:
   - `i18n.init()` e `auth.init()` restano sequenziali (auth dipende da i18n per la lingua).
   - `navigation.loadHeader()` deve completarsi prima del rendering (serve per mostrare l'header con l'avatar).
   - `navigation.loadFooter()` deve essere lanciato **senza await** (fire-and-forget), perche' il footer non e' critico. Puo' completarsi in background.
   - `navigation.setActiveNavLink()` puo' essere chiamato dopo `loadHeader()`.

2. **Sposta `startPendingBookingsPolling()`** dopo il rendering del trip:
   - Non deve piu' essere chiamato dentro `navigation.init()`.
   - Chiamalo dopo `loadTripFromUrl()` in `tripPage.js`, o meglio ancora con un `requestIdleCallback` / `setTimeout(fn, 0)` per non competere con il rendering.

3. **La nuova sequenza deve essere**:
   ```
   await i18n.init()
   await auth.init()
   await navigation.loadHeader()   // solo header, veloce
   navigation.setActiveNavLink()
   i18n.apply()

   // Non-blocking: footer e pending bookings
   navigation.loadFooter()          // fire-and-forget (no await)

   // Contenuto principale
   if (!auth?.requireAuth()) return
   await loadTripFromUrl()

   // Dopo il render del trip
   navigation.startPendingBookingsPolling()  // ora non blocca piu' nulla
   ```

4. **Modifica `navigation.init()`** per non chiamare piu' `loadFooter()` e `startPendingBookingsPolling()` internamente, oppure crea un metodo `initHeader()` separato. Assicurati che le altre pagine che usano `navigation.init()` (es. `index.html`, `profile.html`) continuino a funzionare. Se `navigation.init()` e' usato anche altrove, mantienilo e crea un'alternativa leggera, oppure modifica `init()` per accettare opzioni.

### Vincoli

- Le altre pagine dell'app (`index.html`, `profile.html`, `changelog.html`, `pending-bookings.html`, `share.html`) usano anch'esse `navigation.init()`. Verifica che continuino a funzionare.
- L'header deve essere completo (con avatar e bottone notifiche) prima che il contenuto del trip sia visibile.
- Il footer deve apparire eventualmente, anche se con un leggero ritardo. Non deve causare layout shift visibile.
- Il badge delle notifiche (pending bookings count) deve continuare a funzionare, ma puo' apparire con 1-2 secondi di ritardo.
- Non aggiungere librerie esterne.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri un viaggio: verifica che l'header sia visibile e completo (avatar, bottone notifiche) prima che appaiano i dati del trip.
3. Verifica che il footer appaia dopo il contenuto del trip, senza layout shift.
4. Verifica che il badge notifiche (pending bookings) si aggiorni correttamente, anche se con un leggero ritardo.
5. Apri la home page (`index.html`): verifica che header, footer e badge funzionino ancora normalmente.
6. Apri la pagina profilo (`profile.html`): verifica che navigation funzioni.
7. Misura (con DevTools > Performance) che il tempo tra il click sul link del viaggio e il primo render del contenuto sia diminuito rispetto a prima.

---

## PROMPT 4 — Event delegation sui container dei tab

### Contesto

L'app Travel Organizer attacca event listener individuali ad ogni bottone/link dopo ogni render delle card. Questo avviene in diversi punti:

**tripFlights.js** (dopo `renderFlights`, linee 321-329):
```js
initFlightToggleButtons();       // listener su ogni .flight-toggle-details
initEditItemButtons();           // listener su ogni .btn-edit-item
initDeleteItemButtons();         // listener su ogni .btn-delete-item
initPdfDownloadButtons();        // listener su ogni .btn-download-pdf
initSmallPdfButtons();           // listener su ogni .btn-download-pdf-small
initDeletePassengerButtons();    // listener su ogni .btn-delete-passenger
initPassengerMenus();            // listener su ogni .btn-passenger-menu + .passenger-menu-item
initCopyValueButtons();          // listener su ogni .btn-copy-value
```

**tripHotels.js** (dopo `renderHotels`, linee 193-197):
```js
initHotelToggleButtons();
initEditItemButtons();
initDeleteItemButtons();
initPdfDownloadButtons();
```

**tripActivities.js** (dopo `renderActivities`, linee 254-256):
```js
initActivityLinks();            // listener su ogni .activity-item-link
initNewActivityButtons();       // listener su ogni .activity-new-btn
initCustomActivityClicks();     // listener su ogni .activity-item-link--custom
```

Molte di queste funzioni usano il pattern `cloneNode(true) + replaceChild` per rimuovere vecchi listener prima di aggiungerne di nuovi (es. `tripFlights.js` linee 357-359, 409-410, `tripPage.js` linee 1403-1405, 1421-1423). Questo e' un workaround costoso: clona il nodo DOM, lo reinserisce, poi attacca un nuovo listener.

Per un viaggio con 8 voli (multi-passeggero), `renderFlights` crea circa 50-60 listener individuali. Con il Prompt 2 (lazy details) questo si riduce, ma i listener della card principale restano.

**Funzioni condivise** (`tripPage.js`):
- `initEditItemButtons()` (linea 1402) opera su `.btn-edit-item` in tutto il documento
- `initDeleteItemButtons()` (linea 1419) opera su `.btn-delete-item`
- `initPdfDownloadButtons()` (linea 1578) opera su `.btn-download-pdf`

Queste funzioni sono esposte via `window.tripPage` e chiamate sia da `tripFlights` che da `tripHotels`.

### Obiettivo

Sostituire i listener individuali con event delegation sui container dei tab, riducendo drasticamente il numero di listener e eliminando il pattern cloneNode.

1. **Per il tab Flights** (`#flights-container`): attacca UN SOLO listener `click` delegato sul container. Nel handler, usa `event.target.closest()` per determinare quale elemento e' stato cliccato:
   - `.flight-toggle-details` -> toggle dei dettagli
   - `.btn-edit-item[data-type="flight"]` -> apri pannello edit
   - `.btn-delete-item[data-type="flight"]` -> mostra modal delete
   - `.btn-download-pdf` -> download PDF
   - `.btn-download-pdf-small` -> download PDF (multi-passenger)
   - `.btn-delete-passenger` -> mostra modal delete passenger
   - `.btn-passenger-menu` -> toggle menu passeggero
   - `.passenger-menu-item` -> azione dal menu passeggero
   - `.btn-copy-value` -> copia valore negli appunti

2. **Per il tab Hotels** (`#hotels-container`): analogo, con un singolo listener delegato per:
   - `.hotel-toggle-details` -> toggle dei dettagli
   - `.btn-edit-item[data-type="hotel"]` -> apri pannello edit
   - `.btn-delete-item[data-type="hotel"]` -> mostra modal delete
   - `.btn-download-pdf` -> download PDF

3. **Per il tab Activities** (`#activities-container`): un singolo listener delegato per:
   - `.activity-item-link` -> naviga al tab flights/hotels con scroll
   - `.activity-item-link--custom` -> apri slide panel attivita'
   - `.activity-new-btn` -> apri form nuova attivita'

4. **Attacca i listener delegati una volta sola** in `renderTripContent()`, dopo aver creato i container. Non devono essere ri-attaccati ad ogni render delle card interne. Usa un flag o `data-delegated` per evitare duplicati.

5. **Rimuovi** tutte le funzioni `init*` individuali che non servono piu' (o svuotale se sono chiamate da altri punti). Rimuovi il pattern `cloneNode + replaceChild` ovunque non serva piu'.

6. **Mantieni la logica** di ogni azione identica (stessa funzione chiamata, stessi parametri). Cambia solo il modo in cui l'evento viene intercettato.

### Vincoli

- Le funzioni `window.tripPage.initEditItemButtons()`, `window.tripPage.initDeleteItemButtons()`, `window.tripPage.initPdfDownloadButtons()` sono chiamate da `tripFlights.js` e `tripHotels.js`. Se le rimuovi, rimuovi anche le chiamate nei moduli.
- Se il Prompt 2 (lazy details) e' gia' implementato, i dettagli vengono generati on-expand. L'event delegation deve funzionare anche per elementi aggiunti dinamicamente (che e' esattamente il punto forte della delegation).
- `initQuickUploadCard()` (drag & drop) non puo' usare delegation facilmente per `dragover`/`dragleave`/`drop`. Mantienilo come listener diretto.
- I listener `click` su document (es. chiudere dropdown menu passeggero, `tripFlights.js` linea 494) possono restare invariati.
- Non aggiungere librerie esterne.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri un viaggio e verifica che il toggle "Mostra dettagli" / "Nascondi dettagli" funzioni su tutti i voli.
3. Verifica che il bottone "Modifica volo" apra il pannello edit corretto per ogni volo.
4. Verifica che il bottone "Elimina volo" apra la modal di conferma corretta.
5. Verifica il download PDF (sia volo singolo che multi-passeggero).
6. Verifica il bottone "Copia" su booking reference e ticket number.
7. Per voli multi-passeggero: verifica il menu 3-dot e l'azione "Rimuovi passeggero".
8. Ripeti test 2-7 per le card hotel.
9. Nel tab Activities: verifica click su eventi (navigazione a Flights/Hotels), click su attivita' custom (apertura slide panel), bottone "Nuova attivita'".
10. Verifica che il drag & drop sulle quick-upload card funzioni ancora.
11. Ispeziona con DevTools > Event Listeners che ogni container abbia 1 solo click listener, non decine.
