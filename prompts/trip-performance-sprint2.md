# Sprint 2 — Ottimizzazione Trip Page (impatto medio, effort medio)

Usare questi prompt in sequenza (5 → 7). Ogni prompt e' autonomo e include tutto il contesto necessario. **Prerequisito**: Sprint 1 completato.

---

## PROMPT 5 — Code splitting con dynamic import

### Contesto

L'app Travel Organizer usa Vite come bundler. L'entry point della pagina viaggio e' `js/entries/trip.js`:

```js
import '../utils.js';
import '../i18n.js';
import '../auth.js';
import '../navigation.js';
import '../airportAutocomplete.js';
import '../pdfUpload.js';
import '../tripFlights.js';
import '../tripHotels.js';
import '../tripActivities.js';
import '../tripSlidePanel.js';
import '../tripPage.js';
import '../tripCreator.js';
```

Tutti i 12 moduli sono importati staticamente. Il bundle risultante e':
- `trip-*.js`: ~110 KB
- `shared-*.js`: ~27 KB
- Totale: ~137 KB (pre-gzip, ~35-45 KB gzipped)

Alcuni moduli non servono al primo render della pagina:

- **`tripSlidePanel.js`**: pannello slide-in per creare/vedere/modificare attivita' custom. Serve solo quando l'utente clicca "Nuova attivita'" o visualizza un'attivita'. Usato via `window.tripSlidePanel.show()`.

- **`airportAutocomplete.js`**: autocomplete per codici IATA nel form di modifica volo. Serve solo quando l'utente apre il pannello "Modifica volo". Usato via `AirportAutocomplete.init(panelBody)` in `tripPage.js` linea 1313.

- **`tripCreator.js`**: wizard per creare un nuovo viaggio. Non serve nella pagina viaggio (e' usato nella home). Il suo import qui e' probabilmente un residuo.

- **`pdfUpload.js`**: utility per upload PDF. Serve solo quando l'utente fa upload di un booking. Usato via `pdfUpload.uploadFiles()` in `tripPage.js` linee 589 e 1708.

I moduli critici per il primo render sono: `utils.js`, `i18n.js`, `auth.js`, `navigation.js`, `tripFlights.js`, `tripHotels.js`, `tripActivities.js`, `tripPage.js`.

### Obiettivo

Implementare code splitting tramite dynamic import per i moduli non critici, riducendo il bundle iniziale.

1. **Rimuovi `tripCreator.js`** dall'import in `js/entries/trip.js`. Verifica che non sia effettivamente usato nella pagina viaggio (cerca riferimenti a `window.tripCreator` in `tripPage.js`, `tripFlights.js`, `tripHotels.js`, `tripActivities.js`). Se non e' usato, rimuovi semplicemente la riga.

2. **Converti `tripSlidePanel.js` in dynamic import**:
   - Rimuovi l'import statico da `js/entries/trip.js`.
   - Nei punti dove viene usato (`window.tripSlidePanel.show()`), sostituisci con un dynamic import:
     ```js
     async function loadSlidePanel() {
       if (!window.tripSlidePanel) {
         await import('../tripSlidePanel.js');
       }
       return window.tripSlidePanel;
     }
     ```
   - Punti da modificare:
     - `tripPage.js` linea 487: `window.tripSlidePanel.show('create', defaultDate, null)` (nel modal "Aggiungi" -> Attivita')
     - `tripActivities.js` linea 292: `window.tripSlidePanel.show('create', date, null)` (bottone "Nuova attivita'")
     - `tripActivities.js` linea 307: `window.tripSlidePanel.show('view', null, activity)` (click su attivita' custom)

3. **Converti `airportAutocomplete.js` in dynamic import**:
   - Rimuovi l'import statico da `js/entries/trip.js`.
   - In `tripPage.js` linea 1313, sostituisci:
     ```js
     // prima:
     if (typeof AirportAutocomplete !== 'undefined') {
       AirportAutocomplete.init(panelBody);
     }
     // dopo:
     import('../airportAutocomplete.js').then(() => {
       if (typeof AirportAutocomplete !== 'undefined') {
         AirportAutocomplete.init(panelBody);
       }
     });
     ```

4. **Converti `pdfUpload.js` in dynamic import**:
   - Rimuovi l'import statico da `js/entries/trip.js`.
   - Nei punti dove viene usato (`pdfUpload.uploadFiles()`), caricalo on-demand:
     - `tripPage.js` linea 589 (modal add booking -> `submitBooking`)
     - `tripPage.js` linea 1708 (quick upload -> `handleQuickUpload`)
   - Entrambi sono gia' in funzioni async, quindi basta aggiungere `await import('../pdfUpload.js')` prima dell'uso.

5. **Verifica la configurazione Vite** (`vite.config.js`): assicurati che i dynamic import generino chunk separati. Vite lo fa automaticamente, ma verifica che non ci siano configurazioni che forzano un singolo bundle.

### Vincoli

- I moduli caricati dinamicamente devono registrarsi su `window` (come fanno gia': `window.tripSlidePanel`, `window.AirportAutocomplete`, `window.pdfUpload`) cosi' il codice chiamante puo' accedervi dopo l'import.
- Il primo utilizzo di ogni modulo lazy avra' un leggero ritardo (download + parse del chunk). Questo e' accettabile per azioni utente (click su "Nuova attivita'", "Modifica volo", upload PDF).
- Non cambiare il comportamento dei moduli stessi, solo il modo in cui vengono importati.
- Dopo il build (`npx vite build`), verifica che i chunk separati siano stati generati nella cartella `dist/assets/`.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Esegui `npx vite build` e verifica che il bundle `trip-*.js` sia significativamente piu' piccolo (target: ~70-80 KB invece di 110 KB). Verifica che siano stati creati chunk separati per slidePanel, airportAutocomplete, pdfUpload.
3. Apri un viaggio nel browser: verifica che il caricamento iniziale sia piu' veloce (nessun errore in console).
4. Clicca "Nuova attivita'" nel tab Activities: verifica che il pannello slide-in si apra (dopo il caricamento del chunk).
5. Clicca su un'attivita' custom: verifica che il pannello si apra in modalita' visualizzazione.
6. Apri "Modifica volo" su un volo: verifica che l'autocomplete aeroporti funzioni.
7. Fai upload di un PDF (sia da modal che da quick-upload card): verifica che funzioni.
8. Verifica in DevTools > Network che i chunk vengano caricati on-demand (al primo utilizzo, non al page load).

---

## PROMPT 6 — Self-host font subset

### Contesto

La pagina viaggio (`trip.html`) carica 3 risorse font esterne da Google nelle linee 27-31 dell'`<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=bed,calendar_today,event,travel" />
```

Problemi:
- **3 richieste separate** a `fonts.googleapis.com` (ciascuna puo' generare ulteriori richieste per i file `.woff2`).
- **Dipendenza da CDN esterno**: se Google Fonts e' lento o bloccato (es. in Cina, su alcune reti aziendali), il rendering viene ritardato o i font non si caricano.
- Le stesse risorse sono caricate anche in `index.html`, `profile.html`, `share.html`, e nelle altre pagine HTML dell'app.

I font utilizzati dall'app sono:
- **Inter** (400, 500, 600, 700): font principale per tutto il testo.
- **Material Icons Outlined**: icone nella navigazione (es. `flight_takeoff`, `flight_land` nelle card voli).
- **Material Symbols Outlined**: icone nei tab segmented control (`bed`, `calendar_today`, `event`, `travel`), usate solo in `trip.html`.

### Obiettivo

Self-hostare i font per eliminare la dipendenza da Google CDN e ridurre le richieste di rete.

1. **Scarica Inter** in formato WOFF2 (i weight 400, 500, 600, 700 Latin). Salvali in `assets/fonts/inter/`.

2. **Scarica Material Icons Outlined** in formato WOFF2. Salva in `assets/fonts/`.

3. **Scarica Material Symbols Outlined** (subset: solo `bed`, `calendar_today`, `event`, `travel`). Se non e' possibile fare il subset facilmente, scarica il font completo. Salva in `assets/fonts/`.

4. **Crea un file CSS** `css/fonts.css` con le `@font-face` declarations per tutti i font:
   ```css
   /* Inter */
   @font-face {
     font-family: 'Inter';
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url('../assets/fonts/inter/inter-400.woff2') format('woff2');
   }
   /* ... 500, 600, 700 ... */

   /* Material Icons Outlined */
   @font-face {
     font-family: 'Material Icons Outlined';
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url('../assets/fonts/material-icons-outlined.woff2') format('woff2');
   }
   .material-icons-outlined {
     font-family: 'Material Icons Outlined';
     /* ... stesse regole di Google ... */
   }

   /* Material Symbols Outlined */
   @font-face {
     font-family: 'Material Symbols Outlined';
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url('../assets/fonts/material-symbols-outlined.woff2') format('woff2');
   }
   .material-symbols-outlined {
     font-family: 'Material Symbols Outlined';
     /* ... stesse regole di Google ... */
   }
   ```

5. **Aggiorna tutte le pagine HTML** (`trip.html`, `index.html`, `profile.html`, `share.html`, `changelog.html`, `pending-bookings.html`, `login.html`) per:
   - Rimuovere i 3 link a Google Fonts (preconnect + stylesheet)
   - Aggiungere `<link rel="stylesheet" href="./css/fonts.css">` prima degli altri CSS

6. **Aggiorna `vite.config.js`** se necessario per includere la cartella `assets/fonts/` nel build output.

### Vincoli

- I font devono sembrare identici a quelli di Google. Usa gli stessi file WOFF2 serviti da Google (puoi scaricarli dalla URL presente nel CSS di Google Fonts).
- Mantieni `font-display: swap` per evitare FOIT.
- Se il download dei font Material Symbols con subset non e' pratico, scarica il font completo. E' comunque meglio di un roundtrip a Google.
- Non modificare le classi CSS usate nel codice HTML (`material-icons-outlined`, `material-symbols-outlined`). Il CSS deve replicare le stesse classi che Google definiva.
- Non aggiungere librerie esterne. Puoi usare `curl` o `wget` per scaricare i font.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri la pagina viaggio: verifica che il font Inter sia utilizzato (confronta visualmente con prima).
3. Verifica che le icone Material Icons Outlined siano visibili (es. `flight_takeoff`, `flight_land` nelle card voli).
4. Verifica che le icone Material Symbols Outlined siano visibili nei tab (bed, calendar_today, event, travel).
5. Ispeziona DevTools > Network: verifica che NON ci siano richieste a `fonts.googleapis.com` o `fonts.gstatic.com`.
6. Verifica che i font vengano serviti dal tuo dominio (`assets/fonts/`).
7. Testa tutte le pagine HTML dell'app (home, profilo, changelog, pending bookings, share) per verificare che i font funzionino.
8. Esegui `npx vite build` e verifica che i font siano inclusi nel build output.

---

## PROMPT 7 — Update ottimistico dopo azioni

### Contesto

L'app Travel Organizer, nella pagina viaggio (`js/tripPage.js`), dopo ogni operazione di modifica (edit, delete, add booking) esegue un **re-fetch completo** del trip dal server:

```js
await loadTripFromUrl();  // ri-scarica tutto il trip JSON da get-trip
```

Questo succede in:
- `tripPage.js` linea 623: dopo add booking (upload PDF)
- `tripPage.js` linea 1058: dopo delete booking
- `tripPage.js` linea 1220: dopo rename trip
- `tripPage.js` linea 1370: dopo edit booking
- `tripPage.js` linea 1551: dopo delete singolo item
- `tripPage.js` linea 1743: dopo quick upload
- `tripFlights.js` linea 577: dopo delete passenger

`loadTripFromUrl()` (linea 78-109) fa:
1. Fetch a `/.netlify/functions/get-trip?id=xxx`
2. Parse JSON della risposta
3. `currentTripData = result.tripData`
4. `renderTrip(result.tripData)` -> ri-renderizza TITOLO + TUTTI I TAB

Dopo `loadTripFromUrl()`, viene spesso chiamato `switchToTab(activeTab)` per ripristinare il tab corrente.

Il problema: ogni azione genera un roundtrip completo (300-800ms) + re-render totale, anche quando l'utente ha cancellato un singolo volo o modificato un campo. Con il lazy tab rendering (Sprint 1 Prompt 1), il re-render e' gia' piu' leggero, ma il roundtrip resta.

La variabile `currentTripData` in `tripPage.js` (linea 17) contiene gia' lo stato completo del trip. Dopo un'operazione, il backend ritorna la risposta di successo e in molti casi i dati aggiornati.

### Obiettivo

Per le operazioni di **delete** (dove sappiamo esattamente cosa cambia), aggiornare `currentTripData` localmente e ri-renderizzare solo il tab coinvolto, senza re-fetch dal server. Per le altre operazioni (add, edit), mantenere il re-fetch perche' il server potrebbe calcolare campi derivati.

1. **Delete singolo item** (`showDeleteItemModal` -> `performDelete`, linea 1499-1554):
   - Dopo il successo della chiamata `delete-booking`, invece di `loadTripFromUrl()`:
     - Rimuovi l'item da `currentTripData.flights` o `currentTripData.hotels`
     - Ricalcola `startDate`/`endDate` se necessario (o lascia invariati)
     - Ri-renderizza solo il tab corrente (flights o hotels)
     - Mantieni la logica di redirect alla home se non ci sono piu' booking (linee 1522-1536)

2. **Delete passenger** (`tripFlights.js`, `performDelete` nella modal, linea 555-585):
   - Dopo il successo della chiamata `delete-passenger`:
     - Trova il/i flight con quel `bookingReference` in `currentTripData.flights`
     - Rimuovi il passeggero dall'array `passengers` di ogni flight
     - Se un flight rimane con 0 passeggeri, rimuovilo
     - Ri-renderizza solo il tab flights

3. **Delete booking multiplo** (`showDeleteBookingModal` -> `performDelete`, linea 1008-1067):
   - Dopo il successo di tutte le chiamate delete:
     - Rimuovi gli item da `currentTripData.flights`/`currentTripData.hotels` in base agli ID selezionati
     - Se erano delete per passeggero, rimuovi i passeggeri
     - Ri-renderizza solo il tab corrente

4. **Crea un helper `rerenderCurrentTab()`** che:
   - Legge il tab attivo da `sessionStorage` o dal DOM
   - Resetta lo stato di render del tab (se hai implementato lazy tab dal Prompt 1)
   - Chiama il render solo di quel tab
   - Re-inizializza i listener necessari

5. **Per le operazioni di add ed edit**, mantieni il `loadTripFromUrl()` completo perche':
   - Add booking: il server parsa il PDF e genera dati nuovi (non predicibili client-side)
   - Edit booking: il server potrebbe ricalcolare campi derivati (durata, date trip)
   - Rename: il server aggiorna il titolo

### Vincoli

- `currentTripData` deve restare la source of truth. Dopo un update ottimistico, deve riflettere lo stato esatto.
- Se l'operazione di delete fallisce (errore server), NON aggiornare il dato locale. Mostra l'errore e lascia tutto invariato.
- Mantieni l'animazione di rimozione della card (linee 1542-1548) prima del re-render del tab.
- Il tab Activities mostra dati derivati da flights + hotels. Se un volo o hotel viene cancellato, il tab Activities deve essere resettato (segnato come non renderizzato) cosi' al prossimo switch verra' ri-generato con i dati aggiornati.
- Non aggiungere librerie esterne.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri un viaggio con almeno 2 voli. Cancella un volo: verifica che la card scompaia con l'animazione e il tab si aggiorni senza reload dalla rete (controlla DevTools > Network: non deve esserci una chiamata a `get-trip`).
3. Verifica che il tab Activities, dopo il delete, mostri i dati aggiornati (senza il volo cancellato).
4. Cancella un passeggero da un volo multi-passeggero: verifica che il passeggero scompaia dalla lista, il volo resti con i passeggeri rimanenti.
5. Se cancelli l'ultimo passeggero di un volo, verifica che il volo venga rimosso.
6. Cancella un hotel: verifica lo stesso comportamento (animazione + update locale).
7. Usa la modalita' "Cancella per prenotazione": verifica che tutti i voli del gruppo vengano rimossi.
8. Dopo un delete, modifica un altro item (edit booking): verifica che il re-fetch completo funzioni ancora e i dati siano coerenti.
9. Testa il caso limite: cancella l'ultimo booking del viaggio. Verifica che venga mostrato l'empty state o il redirect alla home.
