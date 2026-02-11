# Sprint 3 — Ottimizzazione Trip Page (rifinitura)

Usare questi prompt in sequenza (8 → 9). Ogni prompt e' autonomo e include tutto il contesto necessario. **Prerequisito**: Sprint 1 e Sprint 2 completati.

---

## PROMPT 8 — Ottimizzazione caricamento Supabase SDK

### Contesto

L'app Travel Organizer carica il Supabase JS SDK da CDN esterno in tutte le pagine HTML. Ad esempio in `trip.html` (linea 68):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Lo stesso pattern e' presente in `index.html`, `profile.html`, `share.html`, `changelog.html`, `pending-bookings.html`, `login.html`.

Problemi:
- **Dipendenza da CDN esterno** (jsDelivr): se il CDN e' lento, il caricamento dell'intera app e' bloccato perche' lo script e' sincrono.
- **Nessun controllo sulla versione**: `@2` puo' risolvere a versioni diverse nel tempo.
- **Non cacheable dal service worker**: essendo un dominio esterno, il caching e' meno predicibile.
- **Dimensione**: il bundle completo di `@supabase/supabase-js` e' ~55 KB gzipped, anche se l'app usa solo `createClient`, `auth`, e le query.

Supabase e' gia' una dipendenza npm del progetto (usata nelle Netlify Functions backend). Tuttavia nel frontend viene caricata da CDN perche' l'app usa vanilla JS con script tag, non un import ES module (tranne che attraverso Vite per gli entry point).

L'entry point `js/entries/trip.js` usa `import` statements processati da Vite. `auth.js` (linea 36) usa `supabase.createClient()` come globale.

### Obiettivo

Bundlare Supabase nel build Vite invece di caricarlo da CDN esterno, per avere caching locale, versionamento fisso e ridurre una richiesta di rete critica.

1. **Verifica che `@supabase/supabase-js` sia nel `package.json`** (dovrebbe gia' esserci come dependency per le Netlify Functions). Se non c'e', aggiungilo.

2. **Crea un modulo wrapper** `js/supabaseClient.js`:
   ```js
   import { createClient } from '@supabase/supabase-js';
   window.supabase = { createClient };
   ```
   Questo rende `supabase.createClient` disponibile come globale (come fa ora il CDN), mantenendo compatibilita' con `auth.js`.

3. **Aggiungi l'import** del wrapper nell'entry point `js/entries/trip.js` PRIMA di `auth.js`:
   ```js
   import '../supabaseClient.js';  // deve essere prima di auth.js
   import '../utils.js';
   import '../i18n.js';
   import '../auth.js';
   // ...
   ```
   Fai lo stesso per tutti gli entry point: `js/entries/index.js` (home), `js/entries/profile.js`, etc. Cerca tutti i file in `js/entries/`.

4. **Rimuovi il tag `<script>` del CDN** da tutte le pagine HTML:
   ```html
   <!-- RIMUOVI questa riga -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
   Pagine da aggiornare: `trip.html`, `index.html`, `profile.html`, `share.html`, `changelog.html`, `pending-bookings.html`, `login.html`.

5. **Verifica che Vite faccia tree-shaking** su Supabase: nel chunk `shared-*.js` dovrebbe finire solo il codice Supabase effettivamente usato. Il bundle finale potrebbe crescere leggermente rispetto al chunk attuale, ma la richiesta CDN esterna viene eliminata.

### Vincoli

- `auth.js` usa `supabase.createClient(url, key, options)` come globale (linea 36). Il wrapper deve esporre esattamente questa API.
- Le Netlify Functions (backend Node.js) usano `require('@supabase/supabase-js')` separatamente e non sono influenzate da questa modifica.
- Se alcune pagine HTML non hanno un entry point Vite (es. `login.html`), ma usano Supabase, dovranno avere un entry point o mantenere il CDN. Verifica caso per caso.
- La pagina `share.html` potrebbe avere un flusso diverso (utente non autenticato). Verifica che Supabase sia disponibile al momento giusto.
- Non aggiungere librerie esterne oltre a Supabase (gia' presente).

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Esegui `npx vite build`: verifica che il build completi senza errori e che i chunk generati includano Supabase.
3. Ispeziona la dimensione dei chunk in `dist/assets/`: il chunk `shared-*.js` potrebbe crescere di ~25-30 KB (Supabase bundlato), ma si elimina una richiesta di rete esterna.
4. Apri l'app nel browser: verifica in DevTools > Network che NON ci siano richieste a `cdn.jsdelivr.net`.
5. Verifica il login (Google OAuth): deve funzionare come prima.
6. Apri un viaggio: verifica che il fetch dei dati funzioni (auth + get-trip).
7. Testa tutte le pagine: home, profilo, changelog, pending bookings, share.
8. Testa su mobile (o con throttling di rete): verifica che il caricamento sia piu' rapido e predicibile senza la dipendenza dal CDN.

---

## PROMPT 9 — Metriche RUM e performance budget

### Contesto

L'app Travel Organizer ha completato gli Sprint 1 e 2 di ottimizzazione della pagina viaggio. Le modifiche implementate includono:
- Lazy tab rendering (solo tab attivo renderizzato)
- Lazy dettagli card (HTML dettagli generato on-expand)
- Init parallelizzato (footer e pending bookings non bloccanti)
- Event delegation (meno listener)
- Code splitting (chunk separati per moduli non critici)
- Font self-hosted (nessuna dipendenza Google CDN)
- Update ottimistico per delete (meno roundtrip)
- Supabase bundlato (nessuna dipendenza CDN esterna)

Tuttavia non c'e' modo di **misurare** l'impatto reale di queste ottimizzazioni su dispositivi e reti reali. Non ci sono metriche di performance nel codice.

L'app e' una SPA con vanilla JS, deployata su Netlify. Non usa Google Analytics ne' altri tool di monitoraggio.

### Obiettivo

Aggiungere metriche RUM (Real User Monitoring) leggere per misurare le performance della pagina viaggio e stabilire un baseline.

1. **Crea un modulo `js/perf.js`** che raccolga metriche chiave:
   - **TTFB** (Time To First Byte): `performance.getEntriesByType('navigation')[0].responseStart`
   - **FCP** (First Contentful Paint): `new PerformanceObserver` per `paint` entries
   - **TTI custom** (Time To Interactive): tempo dal `navigationStart` al completamento di `loadTripFromUrl()` (il momento in cui il contenuto del trip e' visibile). Misuralo con `performance.now()` all'inizio e alla fine di `init()` in `tripPage.js`.
   - **Dimensione bundle**: `performance.getEntriesByType('resource')` per i file JS e CSS
   - **Tempo di render tab**: `performance.now()` prima e dopo ogni `render()` dei tab

2. **Logga le metriche in console** in development mode (non in produzione):
   ```js
   if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
     console.table({
       'TTFB (ms)': ttfb,
       'FCP (ms)': fcp,
       'Trip loaded (ms)': tripLoadTime,
       'Tab render (ms)': tabRenderTime,
       'JS bundle (KB)': jsBundleSize,
     });
   }
   ```

3. **In produzione**, invia le metriche a un endpoint Netlify Function leggero (opzionale, solo se vuoi tracking storico):
   - Crea `netlify/functions/perf-metrics.js` che riceve un POST con le metriche e le logga (o le salva in una tabella Supabase `perf_metrics`).
   - Invia le metriche con `navigator.sendBeacon()` per non bloccare la navigazione.
   - Campiona: invia solo per l'1-5% degli utenti (`Math.random() < 0.05`).

4. **Aggiungi un performance budget** come commento documentato in `js/perf.js`:
   ```js
   // Performance budget (pagina viaggio):
   // - TTI < 2000ms su 4G veloce
   // - Tab render < 100ms
   // - Bundle JS totale < 100KB gzipped
   // - Nessuna richiesta bloccante a CDN esterni
   ```

5. **Importa `perf.js`** negli entry point delle pagine principali (`js/entries/trip.js`, `js/entries/index.js`).

### Vincoli

- Le metriche NON devono impattare la performance dell'app. Usa API native (`Performance API`, `PerformanceObserver`) e `requestIdleCallback` per il reporting.
- Non aggiungere librerie esterne (no web-vitals, no analytics SDK).
- Il logging in console deve essere leggero e formattato (una sola `console.table`, non 10 log separati).
- L'endpoint Netlify per le metriche (se implementato) deve essere fire-and-forget dal client, e non deve rallentare la pagina.
- Se l'endpoint non viene implementato, le metriche in console sono sufficienti per questa fase.
- La tabella Supabase `perf_metrics` e' opzionale. Se non la crei, logga solo in console.

### Verifica

Dopo la modifica:
1. Esegui i test con `npx jest`. Se falliscono, analizza il log d'errore e correggi il codice finche' non ottieni il 100% di pass.
2. Apri la pagina viaggio in localhost: verifica che in console appaia una tabella con le metriche (TTFB, FCP, trip load time, tab render time, bundle size).
3. Verifica che le metriche siano ragionevoli (es. TTI < 3000ms su localhost, tab render < 200ms).
4. Apri la pagina in produzione (Netlify): verifica che NON appaia nulla in console (metriche solo in development).
5. Se hai implementato l'endpoint: verifica con DevTools > Network che `sendBeacon` venga chiamato (per il campione selezionato) e che non blocchi nulla.
6. Verifica che le metriche non causino errori se le API Performance non sono disponibili (fallback graceful).
7. Esegui un test Lighthouse sulla pagina viaggio e confronta i risultati con un baseline precedente (se disponibile).
