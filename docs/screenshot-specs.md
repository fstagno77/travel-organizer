# Specifiche Screenshot — Travel Flow

Documento di riferimento per la generazione di screenshot tramite AI o tool automatizzati.
Ogni schermata elenca: dimensioni, stato UI, dati di esempio, elementi visibili e note di stile.

---

## Riferimento Design System

| Token | Valore |
|---|---|
| Colore primario | `#2163f6` (blu) |
| Colore primario scuro | `#1a50c7` (hover) |
| Colore primario chiaro | `#e6f0fa` (sfondo tint) |
| Hotel (verde) | `#2e9568` |
| Errore/badge | `#ef4444` |
| Sfondo pagina | `#f9fafb` |
| Testo principale | `#374151` |
| Font | Inter (sans-serif) |
| Border radius card | `8px` / `12px` |

---

## Screenshot Desktop (1440 × 900 px)

---

### DESK-01 — Home: lista viaggi (sidebar espansa)

**URL:** `/`
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Sidebar sinistra espansa (240 px), sfondo bianco
  - Logo "Travel Flow" in alto
  - Voci navigazione: Home (attiva, sfondo `#e6f0fa`), Notifiche, Impostazioni, Logout
  - Footer sidebar con avatar + nome utente "Marco Rossi" + email
- Header superiore minimalista: icona campana notifiche (badge rosso `3`) + icona profilo (top-right)
- Pulsante "Nuovo Viaggio" visibile nell'header (desktop: testo + icona +)

**Contenuto principale:**
- Titolo sezione "I tuoi viaggi"
- Griglia 3 colonne di trip card:
  1. **Giappone 2025** — immagine Tokyo, date `12 Apr → 28 Apr 2025`, badge ruolo "Proprietario", 2 avatar collaboratori, cuore (preferito)
  2. **New York & Chicago** — immagine NYC, date `1 Giu → 14 Giu 2025`, badge "Proprietario"
  3. **Lisbona Weekend** — immagine Lisbona, date `20 Mar → 23 Mar 2026`, badge "Ospite" (grigio)
- Sezione "Viaggi passati" sotto con 1 card desaturata (stile `.past`): **Roma Business Trip**

**Note stile:**
- Trip card: immagine hero con overlay gradiente scuro sul fondo, testo bianco sovrapposto
- Badge ruolo "Ospite": sfondo grigio `#f3f4f6`, testo `#566378`
- Badge ruolo "Proprietario": non mostrato (default, nessun badge)

---

### DESK-02 — Home: stato vuoto (nessun viaggio)

**URL:** `/`
**Auth:** utente loggato, nessun viaggio creato
**Viewport:** 1440 × 900

**Stato UI:**
- Stessa sidebar di DESK-01
- Area centrale: empty state centrata verticalmente
  - Illustrazione semplice (valigia o aereo, linee monocromatiche)
  - Titolo: "Nessun viaggio ancora"
  - Sottotitolo: "Carica il PDF della tua prenotazione per iniziare"
  - Pulsante primario "Nuovo Viaggio" centrato

---

### DESK-03 — Dettaglio viaggio: tab Voli

**URL:** `/trip.html?id=xxx`
**Auth:** utente loggato, ruolo "Proprietario"
**Viewport:** 1440 × 900

**Stato UI:**
- Header: freccia indietro "← Indietro" a sinistra
- Hero section (altezza ~200 px):
  - Immagine sfondo Tokyo con overlay scuro
  - Titolo "Giappone 2025" (bianco, font large)
  - Date "12 Aprile — 28 Aprile 2025" con icona calendario
  - Tab bar sotto: **Voli** (attiva, sfondo bianco / testo blu) | Hotel | Attività
- Contenuto tab Voli:
  - **Flight card 1** — header blu `#2163f6`:
    - Intestazione: data `12 Apr 2025` + numero volo `AZ 610`
    - Rotta: `FCO` → (arco SVG) → `NRT`, durata `12h 45m`
    - Dettagli espansi: gate, classe, orari (06:30 → 23:15)
    - Passeggero: "Marco Rossi" + ticket number
    - Bottoni: Modifica (matita) | Elimina (cestino)
  - **Flight card 2** — header blu, stessa struttura, collapsed (dettagli chiusi)
  - **Flight card 3** — volo di ritorno, rotta `NRT` → `FCO`
- Pulsante flottante `+` "Aggiungi prenotazione" (bottom-right, blu)

---

### DESK-04 — Dettaglio viaggio: tab Hotel

**URL:** `/trip.html?id=xxx`
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Stesso header + hero di DESK-03
- Tab **Hotel** attiva
- Hotel card 1 — header verde `#2e9568`:
  - Nome: "Shinjuku Granbell Hotel"
  - Date: Check-in `15 Apr` → Check-out `20 Apr` (5 notti)
  - Dettagli: indirizzo, confirmation number, numero camere
  - Bottoni: Modifica | Elimina
- Hotel card 2 — "Dormy Inn Akihabara", collapsed

---

### DESK-05 — Dettaglio viaggio: tab Attività

**URL:** `/trip.html?id=xxx`
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Stesso header + hero + tab **Attività** attiva
- Timeline giorno per giorno:
  - **Sab 12 Apr** — icona aereo, "Volo AZ 610 · FCO → NRT · 06:30" (link testo "Dettagli")
  - **Dom 13 Apr** — icona hotel verde, "Arrivo Shinjuku Granbell Hotel" (check-in)
  - **Lun 14 Apr** — icona stellina azzurra, attività custom "Visita al Senso-ji · 09:00"
  - **Mar 15 Apr** — icona hotel verde, "Shinjuku Granbell Hotel" (stay night)
  - **Mer 16 Apr** — più giorni…
- Pulsante "+ Aggiungi attività" nella giornata con hover

---

### DESK-06 — Slide panel: crea attività custom

**URL:** `/trip.html?id=xxx` (con panel aperto)
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Trip page visibile in background (leggermente oscurata da overlay `rgba(0,0,0,0.6)`)
- Slide panel dal lato destro (420 px wide):
  - Header panel: titolo "Nuova Attività" + pulsante ✕ chiudi
  - Form:
    - Campo "Nome attività" (focus attivo, border blu)
    - Campo "Data" (date picker, valore selezionato)
    - Orario inizio / Orario fine (due campi affiancati)
    - Area testo "Descrizione (opzionale)"
    - Sezione "Link utili" con campo URL + pulsante "+ Aggiungi link"
    - Sezione "Allegati" con drag-drop zone o file picker
  - Footer panel: pulsante "Salva attività" (primario) + "Annulla" (secondario)

---

### DESK-07 — Modale condivisione viaggio

**URL:** `/trip.html?id=xxx` (con modale aperta)
**Auth:** utente loggato, ruolo "Proprietario"
**Viewport:** 1440 × 900

**Stato UI:**
- Overlay scuro su trip page
- Modale centrata (~560 px wide):
  - Header: "Condividi viaggio" + ✕
  - **Sezione 1 — Link di condivisione:**
    - Input con URL (troncato, copiabile)
    - Pulsante "Copia link" (icon clipboard)
  - **Sezione 2 — Invita collaboratore:**
    - Label "Invita per email"
    - Input email + dropdown ruolo (Viaggiatore / Ospite)
    - Pulsante "Invia invito"
  - **Sezione 3 — Collaboratori attuali:**
    - Riga 1: avatar + "Marco Rossi (tu)" + badge "Proprietario"
    - Riga 2: avatar + "Giulia Bianchi" + badge "Viaggiatrice" + pulsante "Rimuovi"
    - Riga 3: avatar generico + "luca@email.com" + badge "Invito inviato" + link "Reinvia"

---

### DESK-08 — Notifiche

**URL:** `/notifications.html`
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Stessa sidebar di DESK-01 (voce "Notifiche" attiva)
- Titolo pagina "Notifiche"
- Pulsante "Segna tutte come lette" (top-right, secondario)
- Lista notifiche (mista lette/non lette):
  - **Non letta** (sfondo `#f0f6ff`, bordo sinistro blu):
    - Icona cerchio blu (people icon)
    - "Giulia Bianchi ha accettato il tuo invito per **Giappone 2025**"
    - Timestamp "2 ore fa"
  - **Non letta**: icona aereo, "Marco ha aggiunto un volo a **New York & Chicago**" — "5 ore fa"
  - **Letta** (sfondo bianco): icona hotel, "Prenotazione hotel aggiornata su **Giappone 2025**" — "Ieri"
  - **Letta**: icona attività, "Attività 'Senso-ji' aggiunta a **Giappone 2025**" — "2 giorni fa"

---

### DESK-09 — Profilo: tab Viaggiatori

**URL:** `/profile.html`
**Auth:** utente loggato
**Viewport:** 1440 × 900

**Stato UI:**
- Stessa sidebar (voce "Impostazioni" attiva)
- Header pagina "Impostazioni"
- Tab bar: Profilo | **Viaggiatori** (attiva, underline blu) | Preferenze
- Lista viaggiatori:
  - Card 1: "Marco Rossi (Tu)" — badge "Proprietario" — dati passaporto (oscurati con ****) — programmi fedeltà: AZ, BA
  - Card 2: "Sofia Rossi" — nessun passaporto — pulsante "Modifica"
  - Pulsante "+ Aggiungi viaggiatore" (outline, in fondo lista)

---

### DESK-10 — Admin Dashboard

**URL:** `/admin.html`
**Auth:** admin (`fstagno@idibgroup.com`)
**Viewport:** 1440 × 900

**Stato UI:**
- Sidebar admin scura (sfondo ~`#1f2937`):
  - Logo + sezioni: Panoramica, Gestione (Utenti, Viaggi, Prenotazioni), Log, Strumenti
  - Voce "Dashboard" attiva
- Area principale:
  - Titolo "Dashboard"
  - Riga stat card:
    - "Utenti totali" → **24**
    - "Viaggi attivi" → **18**
    - "PDF processati (7gg)" → **47**
    - "Cache hit rate" → **82%** (verde)
  - Grafico a linee "Attività ultimi 30 giorni" (Chart.js)
  - Tabella "Ultimi utenti registrati" (5 righe: email, data, viaggi #)

---

## Screenshot Mobile (390 × 844 px — iPhone 14)

---

### MOB-01 — Login

**URL:** `/login.html`
**Auth:** non autenticato
**Viewport:** 390 × 844

**Stato UI:**
- Sfondo sfumato chiaro (gradiente bianco → `#e6f0fa`)
- Logo "Travel Flow" centrato (scritto corsivo SVG)
- Tagline pill: ✈ "Organizza i tuoi viaggi"
- Pulsante "Continua con Google" (full-width, icona Google + testo)
- Separatore "oppure"
- Form OTP — Step 1:
  - Input email (placeholder "La tua email")
  - Pulsante "Invia codice" (blu, full-width)
- Stats row in basso: `12 Viaggi · 847 Giorni · 234 Attività`
- Footer: versione app "v0.34"

---

### MOB-02 — Login: inserimento OTP

**URL:** `/login.html` (step 2)
**Auth:** non autenticato
**Viewport:** 390 × 844

**Stato UI:**
- Stesso sfondo
- Testo "Codice inviato a marco@email.com"
- Input OTP: singolo campo numerico, `maxlength=8`, tastiera numerica
- Pulsante "Verifica" (blu, full-width)
- Link testo "← Torna indietro"

---

### MOB-03 — Home: lista viaggi

**URL:** `/`
**Auth:** utente loggato
**Viewport:** 390 × 844

**Stato UI:**
- Header mobile bianco (shadow leggera):
  - Logo a sinistra
  - Icona hamburger (☰) a destra
- Nessuna sidebar visibile (nascosta)
- Lista viaggi scroll verticale (1 colonna):
  - Trip card full-width: immagine hero, titolo, date, badge ruolo
  - Tre card: Giappone 2025, New York, Lisbona
- FAB "+" (fixed bottom-right, blu, ombra md) con label "Nuovo Viaggio"

---

### MOB-04 — Menu sidebar mobile aperto

**URL:** `/` (sidebar aperta)
**Auth:** utente loggato
**Viewport:** 390 × 844

**Stato UI:**
- Overlay scuro (`rgba(0,0,0,0.5)`) su tutta la pagina
- Sidebar slide-in dal lato sinistro (280 px):
  - Header: logo + pulsante ✕ chiudi
  - Navigazione: Home, Notifiche (badge rosso `3`), Impostazioni, Logout
  - Footer: avatar + "Marco Rossi" + email

---

### MOB-05 — Dettaglio viaggio: tab Voli

**URL:** `/trip.html?id=xxx`
**Auth:** utente loggato
**Viewport:** 390 × 844

**Stato UI:**
- Header: "← Indietro"
- Hero (altezza ~160 px): immagine Tokyo overlay, titolo "Giappone 2025", date
- Tab bar orizzontale (full-width, scrollabile se necessario): Voli | Hotel | Attività
- Flight card full-width (stacked verticalmente):
  - Header blu con data + volo
  - Rotta con codici aeroporto grandi e arco
  - Dettagli collapsed (freccia ▼)
- FAB "+" fixed bottom-right

---

### MOB-06 — Slide panel attività (mobile, full-width)

**URL:** `/trip.html?id=xxx` (panel aperto)
**Auth:** utente loggato
**Viewport:** 390 × 844

**Stato UI:**
- Panel occupa 100% dello schermo (sale dal basso, non da destra)
- Handle grip in cima (rettangolino grigio)
- Header: "Nuova Attività" + ✕
- Form scrollabile: stessi campi di DESK-06
- Footer sticky: "Salva" + "Annulla"

---

### MOB-07 — Notifiche (mobile)

**URL:** `/notifications.html`
**Auth:** utente loggato
**Viewport:** 390 × 844

**Stato UI:**
- Header mobile con hamburger
- Titolo "Notifiche" + "Segna tutte lette" (testo link piccolo)
- Lista notifiche full-width (stesse di DESK-08 ma layout adattato)
- Notifica non letta con bordo sinistro blu visible

---

### MOB-08 — Pagina condivisione pubblica (share.html)

**URL:** `/share.html?trip=xxx`
**Auth:** non autenticato (vista pubblica)
**Viewport:** 390 × 844

**Stato UI:**
- Header minimalista: logo centrato + selettore lingua IT/EN (top-right)
- Hero trip: immagine, titolo "Giappone 2025", date
- Tab Voli / Hotel / Attività (read-only, nessun bottone modifica)
- Banner in cima (se utente loggato): "Vai al tuo viaggio →"
- Nessun FAB, nessuna sidebar

---

## Screenshot stati componenti

---

### COMP-01 — Flight card espansa vs collapsed

**Viewport:** 800 × 400 (componente isolato)

Due flight card affiancate:
- **Sinistra (collapsed):** header blu, rotta `FCO → NRT`, freccia ▼ in basso
- **Destra (espansa):** stesso header, più blocco dettagli con griglia: orari, gate, classe, bagaglio, passseggero, ticket number, pulsanti Modifica/Elimina

---

### COMP-02 — Trip card (varianti ruolo)

**Viewport:** 900 × 300 (tre card affiancate)

- **Card 1 — Proprietario:** immagine, titolo, date. Nessun badge ruolo. Icona cuore + icona share.
- **Card 2 — Viaggiatore:** badge "Viaggiatore" (sfondo blu chiaro `#e6f0fa`, testo `#2163f6`)
- **Card 3 — Ospite:** badge "Ospite" (sfondo grigio `#f3f4f6`, testo `#566378`). No icona share.

---

### COMP-03 — Notification badge e dropdown

**Viewport:** 400 × 500

- Icona campana con badge rosso "3"
- Dropdown aperto sotto (380 px wide):
  - Tab "Tutte" (attiva) | "Non lette"
  - 3 notifiche: icona cerchio colorato, testo, timestamp
  - Link "Vedi tutte le notifiche" in fondo

---

### COMP-04 — Bottoni (varianti)

**Viewport:** 700 × 120 (riga componenti)

Fila orizzontale con gap:
- `btn-primary`: "Salva" (blu `#2163f6`, hover scuro)
- `btn-secondary`: "Annulla" (grigio `#f3f4f6`)
- `btn-outline`: "Condividi" (bordo blu, sfondo trasparente)
- `btn-danger`: "Elimina" (rosso `#ef4444`)
- `btn-primary` disabled: "Salva" (opacity 0.5, cursor not-allowed)

---

### COMP-05 — Hotel card espansa

**Viewport:** 700 × 350 (componente isolato)

- Header verde `#2e9568`: "Shinjuku Granbell Hotel" + date check-in/out
- Body espanso:
  - Indirizzo completo
  - Confirmation number
  - Notti: 5
  - Note opzionali
  - Pulsanti Modifica | Elimina

---

## Note generali per la generazione AI

1. **Font:** usare Inter o equivalente sans-serif (Helvetica Neue come fallback)
2. **Dati di esempio:** usare dati realistici italiani (nomi, città, codici aeroporto veri: FCO, NRT, JFK, ORD, LIS)
3. **Immagini di sfondo trip card:** foto paesaggistiche realistiche delle destinazioni indicate
4. **Avatar utenti:** placeholder circolari con iniziali colorate (es. "MR" su sfondo blu)
5. **Timestamps:** relativi e realistici ("2 ore fa", "Ieri", "3 giorni fa")
6. **Lingua UI:** tutto in italiano (label, placeholder, messaggi)
7. **Bordi e ombre:** usare i valori del design system (shadow-md per card, shadow-sm per input)
8. **Stato hover:** non catturare stati hover nelle screenshot statiche (solo stato normale)
9. **Scrollbar:** nascondere le scrollbar nelle screenshot
10. **Safe area mobile:** aggiungere padding top/bottom per simulare iPhone (notch + home indicator)
