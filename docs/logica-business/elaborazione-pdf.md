# Elaborazione PDF

L'elaborazione dei PDF di prenotazione è il cuore dell'importazione dati in Travel Organizer. Il sistema utilizza **SmartParse v2.1**, un parser a tre livelli che minimizza le chiamate a Claude AI riconoscendo provider già noti.

## SmartParse v2.1 — Cascade L1 → L2 → L4

Ogni PDF caricato viene processato attraverso una cascade di tre livelli:

```
PDF → estrazione testo (pdf-parse) → fingerprint SHA-256
  ↓
L1: fingerprint nei known_fingerprints?  → SÌ → return risultato cached (0 AI)
  ↓ NO
L2: brand riconosciuto + template esistente?
  → SÌ → estrazione locale (anchor o clone) → valida campi obbligatori
        → tutti presenti? → return L2 (0 AI)
        → mancanti? → continua a L4
  ↓ NO
L4: Claude API (text mode) → risultato
  → salva template per il brand (per futuri L2)
  → registra fingerprint (per futuri L1)
  → return L4 (1 AI)
```

### Livelli

| Livello | Descrizione | Chiamate AI | Tempo tipico |
|---------|-------------|:-----------:|:------------:|
| **L1** | Cache esatta — fingerprint identico già processato | 0 | ~0.3s |
| **L2** | Template extraction — stesso brand/provider, dati estratti localmente | 0 | ~0.1-0.2s |
| **L4** | Claude API — primo documento di un nuovo provider | 1 | ~4-7s |

### Brand detection

Il sistema rileva il brand del documento dal testo estratto (keyword matching con priorità):
- **ITA Airways**: parole chiave `ricevut` + `viaggio`, `ita airways`, `italia trasporto aereo`
- **Booking.com**: parole chiave `booking.com` + (`conferma` o `confirmation`)

### Estrazione L2 per provider

| Provider | Metodo L2 | Come funziona |
|----------|-----------|---------------|
| **Booking.com** | Anchor extraction | Estrae dati da label noti ("Indirizzo:", "NUMERO DI CONFERMA:", "ARRIVO", "PARTENZA") |
| **ITA Airways** | Clone + swap | Clona il risultato template e sostituisce i campi passeggero (nome, PNR, biglietto) |

### Template storage

Un solo template per brand+docType (es. `tpl-ita-airways-flight`, `tpl-booking-com-hotel`):
- **`match_rules._knownFingerprints`**: array di tutti i fingerprint processati (per L1)
- **`match_rules._results`**: risultati per-fingerprint (per L1 con dati corretti)
- **`match_rules._sampleText`**: testo del documento campione (per clone similarity check)
- **`field_rules`**: extraction map (regole anchor per L2)
- **`brand`**: nome brand rilevato

### Validazione campi obbligatori

L2 restituisce un risultato solo se **tutti** i campi obbligatori sono presenti. Se manca anche un solo campo, fallback a L4 (Claude).

**Voli**: `flightNumber`, `date`, `departureTime`, `arrivalTime`, `departure.code`, `departure.city`, `arrival.code`, `arrival.city`, `passenger.name`, `bookingReference`

**Hotel**: `name`, `checkIn.date`, `checkOut.date`, `confirmationNumber`, `address.city`, `address.fullAddress`

---

## Modulo condiviso (pdfProcessor.js)

Per i casi NON SmartParse (batch multi-PDF, email), la logica è centralizzata in `netlify/functions/utils/pdfProcessor.js`:

| Consumer | Scopo |
|----------|-------|
| `process-pdf.js` | Creazione di un nuovo viaggio da PDF caricati |
| `add-booking.js` | Aggiunta di prenotazioni a un viaggio esistente |
| `emailExtractor.js` | Elaborazione di allegati PDF da email inoltrate (singolo PDF) |

### Configurazione

| Parametro | Valore | Descrizione |
|-----------|--------|-------------|
| `MAX_TOKENS_SINGLE` | 4096 | Limite token per elaborazione di un singolo PDF |
| `MAX_TOKENS_BATCH` | 8192 | Limite token per elaborazione batch (2 PDF) |
| `MAX_BATCH_SIZE` | 2 | Numero massimo di PDF per singola chiamata API |

Il modello utilizzato è **`claude-haiku-4-5-20251001`**, scelto per il bilanciamento ottimale tra velocità, costo e qualità.

### Strategia di batching

```
1 PDF  → singola chiamata API (MAX_TOKENS_SINGLE)
2+ PDF → batch da 2, processati sequenzialmente (MAX_TOKENS_BATCH)
         Fallback: se un batch fallisce → chiamate singole sequenziali
```

## Rilevamento tipo documento

Il sistema analizza il nome del file per determinare se il PDF contiene volo o hotel:

**Indicatori volo**: `flight`, `volo`, `boarding`, `itinerary`, `ticket`, `eticket`, `ricevut`, `viaggio`, `biglietto`, `airways`, `airline`

**Indicatori hotel**: `hotel`, `booking`, `reservation`, `accommodation`, `soggiorno`, `albergo`, `conferma`, `prenotazione`

Se nessun indicatore viene trovato, SmartParse usa `docType: auto` e Claude determina il tipo.

## File di riferimento

| File | Ruolo |
|------|-------|
| `netlify/functions/utils/smartParser.js` | SmartParse v2.1 — cascade L1/L2/L4 |
| `netlify/functions/utils/templateExtractor.js` | Logica L2 — brand detection, extractors, validation |
| `netlify/functions/utils/pdfProcessor.js` | Batch processing per multi-PDF (non-SmartParse) |
| `netlify/functions/admin-api.js` | Endpoint `analyze-pdf-smart` per admin analyzer |
| `supabase: parsing_templates_beta` | Tabella cache/template |
