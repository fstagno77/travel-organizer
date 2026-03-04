# Frontend

Il frontend di Travel Organizer è un'applicazione **multi-pagina (MPA)** scritta in JavaScript vanilla, senza alcun framework, con **Vite 6.4** come bundler e dev server.

## Architettura generale

| Aspetto | Scelta |
|---------|--------|
| Linguaggio | Vanilla JavaScript (ES modules) |
| Bundler | Vite 6.4 |
| Tipologia app | Multi-page application (MPA) |
| CSS | Custom Properties, nessun preprocessore |
| Font | Inter (Google Fonts) |
| Icone | Material Icons + Material Symbols Outlined |
| Routing | Navigazione tradizionale tra pagine HTML con query params |

Non viene utilizzato alcun router SPA. La navigazione avviene tramite link standard tra le pagine HTML, con i parametri passati via query string (es. `trip.html?id=abc-123`).

## Pagine

L'applicazione è composta da sei pagine HTML indipendenti:

| Pagina | File | Descrizione |
|--------|------|-------------|
| Dashboard | `index.html` | Lista dei viaggi, creazione nuovo viaggio, caricamento PDF |
| Viaggio | `trip.html` | Dettaglio viaggio con tab Voli/Hotel/Attivita |
| Login | `login.html` | Autenticazione con Google OAuth o Magic Link |
| Impostazioni | `profile.html` | Profilo utente, viaggiatori, preferenze (3 tab) |
| Prenotazioni in sospeso | `pending-bookings.html` | Prenotazioni ricevute via email da associare |
| Condivisione | `share.html` | Vista pubblica di un viaggio condiviso |

## Configurazione Vite

Vite è configurato come applicazione multi-pagina con input multipli:

```js
build: {
  rollupOptions: {
    input: {
      main: 'index.html',
      trip: 'trip.html',
      login: 'login.html',
      profile: 'profile.html',
      pendingBookings: 'pending-bookings.html',
      share: 'share.html'
    }
  }
}
```

### Proxy in sviluppo

In modalita sviluppo locale, Vite effettua il proxy delle chiamate alle Netlify Functions verso il server locale di Netlify CLI:

```js
server: {
  proxy: {
    '/.netlify/functions': 'http://localhost:8888'
  }
}
```

### Chunking manuale

Per ottimizzare il caricamento, i moduli condivisi vengono raggruppati in un chunk `shared`:

```js
manualChunks: {
  shared: ['utils.js', 'i18n.js', 'auth.js', 'navigation.js']
}
```

Questo evita la duplicazione di codice comune tra le varie pagine e migliora il caching del browser.

## Moduli globali

Quattro moduli fondamentali vengono esposti sull'oggetto `window` per essere accessibili da qualsiasi punto dell'applicazione:

| Modulo | Oggetto globale | Responsabilita |
|--------|----------------|----------------|
| `auth.js` | `window.auth` | Gestione sessione, login/logout, chiamate API autenticate |
| `navigation.js` | `window.navigation` | Menu laterale, navigazione tra pagine |
| `i18n.js` | `window.i18n` | Internazionalizzazione, cambio lingua |
| `utils.js` | `window.utils` | Funzioni di utilita condivise (formattazione date, toast, ecc.) |

## Sistema di internazionalizzazione (i18n)

Il sistema i18n è implementato manualmente senza librerie esterne:

- I testi traducibili nel DOM utilizzano l'attributo `data-i18n` con una chiave di traduzione
- I file di localizzazione si trovano nella cartella `/locales/` (es. `it.json`, `en.json`)
- Il modulo `i18n.js` carica il file della lingua corrente e sostituisce i testi nel DOM
- La lingua preferita viene salvata nel profilo utente (`language_preference`)
- Lingue supportate: **italiano** e **inglese**

```html
<span data-i18n="dashboard.title">I miei viaggi</span>
```

## Architettura CSS

Lo stile dell'applicazione è distribuito su **10 file CSS** caricati in un ordine specifico per garantire la corretta cascata e specificita:

| Ordine | File | Contenuto |
|--------|------|-----------|
| 1 | `variables.css` | Design token: colori, spaziature, tipografia, ombre, border-radius |
| 2 | `components.css` | Stili di tutti i componenti (~113 KB) |
| 3-10 | File specifici per pagina | Override e stili specifici per ciascuna pagina |

### Design token

Tutti i valori riutilizzabili sono definiti come CSS Custom Properties in `variables.css`:

```css
:root {
  --color-primary: #4F46E5;
  --color-surface: #FFFFFF;
  --spacing-md: 16px;
  --radius-lg: 12px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1);
  /* ... */
}
```

Questo approccio centralizza la definizione dei valori di design e rende semplice la modifica globale dell'aspetto dell'applicazione.

## Font e icone

| Risorsa | Sorgente | Utilizzo |
|---------|----------|----------|
| **Inter** | Google Fonts | Font principale per tutto il testo |
| **Material Icons** | Google Fonts | Icone filled (navigazione, azioni principali) |
| **Material Symbols Outlined** | Google Fonts | Icone outlined (dettagli, indicatori) |

Le icone vengono utilizzate tramite classi CSS:

```html
<span class="material-icons">flight</span>
<span class="material-symbols-outlined">hotel</span>
```
