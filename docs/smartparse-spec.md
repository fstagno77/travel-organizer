# SmartParse v2.1 — Specifica di Progetto

## Problema

L'applicazione Travel Organizer permette agli utenti di caricare PDF di prenotazioni (voli, hotel) per popolare automaticamente i dati del viaggio. Senza SmartParse, ogni PDF genera **1 chiamata a Claude AI**:

- 5 biglietti aerei = 5 chiamate Claude
- 3 conferme hotel = 3 chiamate Claude

**Con SmartParse v2.1**: dopo il primo PDF di un provider, tutti i successivi sono estratti localmente (0 chiamate AI):

- 5 biglietti ITA Airways = **1 chiamata** (primo) + 4 template L2 (0 AI)
- 6 conferme Booking.com = **1 chiamata** (primo) + 5 template L2 (0 AI)
- Totale: **2 chiamate** invece di 11

---

## Architettura — Cascade L1 → L2 → L4

```
PDF → estrazione testo (pdf-parse) → fingerprint SHA-256
  ↓
L1: fingerprint nei known_fingerprints del template?
  → SÌ → return risultato specifico per quel fingerprint (0 AI)
  ↓ NO
L2: brand riconosciuto + template esistente?
  → SÌ → estrazione locale (brand-specific o clone)
        → valida 100% campi obbligatori
        → tutti presenti? → return L2 (0 AI) + registra fingerprint per L1
        → mancanti? → fallback a L4
  ↓ NO
L4: Claude API (text mode)
  → salva/aggiorna template per brand+docType
  → registra fingerprint + risultato nel template
  → return L4 (1 AI)
```

### Livelli

| Livello | Quando | Chiamate AI | Tempo |
|---------|--------|:-----------:|:-----:|
| **L1** | Stesso identico PDF già processato | 0 | ~0.3s |
| **L2** | Stesso provider, PDF diverso | 0 | ~0.1-0.2s |
| **L4** | Provider nuovo o L2 fallito | 1 | ~4-7s |

---

## Vincoli e Paletti

### Scope
- **Solo PDF** (email/forwarding in futuro)
- **Solo voli e hotel** (treni, bus, traghetti in futuro)
- **Un singolo PDF alla volta** per SmartParse
- **Universale**: deve funzionare per qualsiasi compagnia aerea, piattaforma hotel, lingua

### Principi
1. **Correttezza > economia**: mai restituire dati sbagliati o incompleti pur di evitare Claude
2. **100% campi obbligatori**: se manca anche 1 campo → fallback a L4 (Claude)
3. **Un template per provider**: non proliferare righe nel DB — un solo record per brand+docType
4. **Text mode**: inviare testo estratto a Claude (non il PDF binario) per velocità (~4-7s vs ~25s)

---

## Classificazione dei Campi

### Voli — Obbligatori

| Campo | Uso | Deduplicazione |
|-------|-----|----------------|
| `flightNumber` | Header card, timeline | Sì (chiave primaria con date) |
| `date` | Ordinamento, card | Sì (chiave primaria) |
| `departureTime` | Card, timeline | No |
| `arrivalTime` | Card, timeline | No |
| `departure.code` | Card (codice IATA) | No |
| `departure.city` | Card ("Da [città]") | No |
| `arrival.code` | Card (codice IATA) | No |
| `arrival.city` | Card ("a [città]") | No |
| `passenger.name` | Sezione passeggeri | Sì (aggregazione) |
| `bookingReference` | Dettagli, pulsante copia | Sì (chiave primaria) |

### Hotel — Obbligatori

| Campo | Uso | Deduplicazione |
|-------|-----|----------------|
| `name` | Header card, timeline | Sì (match secondario) |
| `checkIn.date` | Card, timeline | Sì (match secondario) |
| `checkOut.date` | Card, timeline | Sì (match secondario) |
| `confirmationNumber` | Dettagli, pulsante copia | Sì (chiave primaria) |
| `address.city` | Destinazione, timeline | No |
| `address.fullAddress` | Link Google Maps | No |

### Soglie

| | Obbligatori | Opzionali |
|---|---|---|
| **Accettato** | 100% presenti e corretti | >= 30% presenti |
| **Rifiutato** | Anche 1 solo mancante → L4 | — |

---

## L2 — Template Extraction

### Brand Detection

Keyword matching con priorità (ordine importante per evitare falsi positivi):

| Brand | Keywords richieste | Priorità |
|-------|--------------------|----------|
| **ITA Airways** | (`ricevut` + `viaggio`) OR `ita airways` OR `italia trasporto aereo` | 1 (alta) |
| **Booking.com** | `booking.com` + (`conferma` OR `confirmation`) | 2 |

### Estrattori brand-specific

#### Booking.com (metodo: `booking-specific`)
Estrazione anchor-based da label noti nel testo:
- **Nome hotel**: prima riga non-label del testo
- **Indirizzo**: dopo label "Indirizzo:" (con `collapseSpacedText` per testo spaziato)
- **Città**: parte dell'indirizzo prima del codice postale
- **Conferma**: label "NUMERO DI CONFERMA:" o "CONFIRMATION NUMBER:"
- **Check-in/out**: pattern "ARRIVO / DD / MESE" e "PARTENZA / DD / MESE"
- **Ospite**: label "Nome dell'ospite:" o "Guest name:"

#### ITA Airways (metodo: `ita-clone`)
Clone del risultato template + swap campi passeggero:
1. Verifica similarità testo (>85%) — se troppo diverso (itinerario diverso), fallback a L4
2. Clona l'intero risultato dal template (voli, booking, etc.)
3. Estrae dal nuovo testo: `passenger.name`, `bookingReference`, `ticketNumber`
4. Sostituisce questi campi nel clone

#### Fallback generico (metodo: `generic-anchor`)
Per brand riconosciuti ma senza estrattore specifico:
1. Applica extraction_map (anchor rules salvate dopo L4)
2. Se fallisce, tenta clone (come ITA) con similarity check
3. Se mancano campi obbligatori → fallback L4

### Template Storage

Un solo record per brand+docType in `parsing_templates_beta`:

| Colonna | Contenuto |
|---------|-----------|
| `id` | `tpl-{brand}-{docType}` (es. `tpl-ita-airways-flight`) |
| `brand` | Nome brand rilevato |
| `match_rules._knownFingerprints` | Array di tutti i fingerprint processati |
| `match_rules._results` | Mappa `{ fingerprint: risultato }` per L1 |
| `match_rules._sampleText` | Testo del documento campione |
| `field_rules` | Extraction map (regole anchor) |
| `last_sample_result` | Ultimo risultato Claude (per clone) |
| `usage_count` | Numero totale di utilizzi |

---

## File di Riferimento

| File | Ruolo |
|------|-------|
| `netlify/functions/utils/smartParser.js` | Modulo principale — cascade L1/L2/L4, cache management |
| `netlify/functions/utils/templateExtractor.js` | Logica L2 — brand detection, extractors, validation |
| `netlify/functions/admin-api.js` | Endpoint `analyze-pdf-smart` |
| `js/adminPage.js` | Frontend admin — analyzer UI |
| `css/admin.css` | Stili badge L1/L2/L4 |
| `supabase: parsing_templates_beta` | Tabella template/cache |
| `supabase: migrations/012-014` | Schema DB |

---

## Test

### Script principale

```bash
node scripts/test-smartparse-v2.js
```

Processa 13 PDF × 2 passate = 26 test:
- **Passata 1** (cache vuota): attesi ~3 L4 + ~10 L2
- **Passata 2** (ri-caricamento): attesi 13 L1, 0 Claude

### Risultati attesi (passata 1)

| PDF | Livello | Motivo |
|-----|---------|--------|
| ITA-Alessandro | L4 | Primo ITA, crea template |
| ITA-Ferdinando | L2 | Clone + swap passeggero |
| ITA-Francesco | L2 | Clone + swap passeggero |
| ITA-Giovanni | L2 | Clone + swap passeggero |
| ITA-MariaLaura | L2 | Clone + swap passeggero |
| Hotel-Chicago | L4 | Primo Booking.com, crea template |
| Hotel-JP-1..5 | L2 | Anchor extraction Booking.com |
| ITA-Agata | L4 | Itinerario diverso (Giappone), clone fallisce |
| ITA-Ginevra | L2 | Clone dall'itinerario Agata |

### Test manuale (admin analyzer)

1. Admin → SmartParse → Analizzatore PDF
2. Cancellare template dalla tab Cache
3. Caricare un PDF → verificare L4 con badge "🤖 Claude API"
4. Caricare un PDF dello stesso provider → verificare L2 con badge "🧩 Template L2"
5. Ricaricare un PDF già processato → verificare L1 con badge "⚡ Cache esatta"

---

## JSON Schema di Riferimento

### Volo
```json
{
  "flights": [{
    "date": "YYYY-MM-DD",
    "flightNumber": "XX123",
    "airline": "Name",
    "departure": { "code": "XXX", "city": "City", "airport": "Name", "terminal": null },
    "arrival": { "code": "XXX", "city": "City", "airport": "Name", "terminal": null },
    "departureTime": "HH:MM",
    "arrivalTime": "HH:MM",
    "arrivalNextDay": false,
    "class": "Economy",
    "bookingReference": "XXXXXX",
    "ticketNumber": null,
    "seat": null,
    "baggage": null,
    "status": "OK"
  }],
  "passenger": { "name": "FULL NAME", "type": "ADT", "ticketNumber": null },
  "booking": { "reference": "XXXXXX", "ticketNumber": null, "issueDate": null, "totalAmount": null }
}
```

### Hotel
```json
{
  "hotels": [{
    "name": "Hotel Name",
    "address": { "street": null, "city": "City", "postalCode": null, "country": "Country", "fullAddress": "Full address" },
    "checkIn": { "date": "YYYY-MM-DD", "time": "HH:MM" },
    "checkOut": { "date": "YYYY-MM-DD", "time": "HH:MM" },
    "nights": 0,
    "rooms": 1,
    "roomTypes": [{ "it": "Tipo", "en": "Type" }],
    "guests": { "adults": 1, "children": [], "total": 1 },
    "guestName": "Name",
    "confirmationNumber": "XXXXXX",
    "price": {
      "room": { "value": 0, "currency": "EUR" },
      "tax": { "value": 0, "currency": "EUR" },
      "total": { "value": 0, "currency": "EUR" }
    },
    "breakfast": { "included": false, "type": null },
    "cancellation": { "freeCancellationUntil": null, "penaltyAfter": null },
    "source": "Provider"
  }]
}
```
