# Database

Travel Organizer utilizza **Supabase** come piattaforma database, basata su **PostgreSQL**. I dati sono protetti da Row Level Security (RLS) per garantire l'isolamento completo tra utenti.

## Schema delle tabelle

### profiles

Profili utente, collegati direttamente alla tabella `auth.users` di Supabase Auth.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | UUID | PK, FK `auth.users.id` ON DELETE CASCADE | Identificativo utente |
| `username` | VARCHAR(12) | UNIQUE, NOT NULL | Username univoco, formato `[a-zA-Z0-9]{5,12}` |
| `email` | TEXT | NOT NULL | Email dell'utente |
| `language_preference` | VARCHAR(2) | DEFAULT `'it'` | Lingua preferita (`it` o `en`) |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Data creazione |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Data ultimo aggiornamento |

**RLS**: l'utente puo accedere solo al proprio profilo (`auth.uid() = id`).

---

### trips

Tabella principale dei viaggi. Tutti i dati del viaggio (voli, hotel, attivita, metadati) sono archiviati in un unico campo JSONB.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | UUID | PK, DEFAULT `gen_random_uuid()` | Identificativo viaggio |
| `user_id` | UUID | FK `auth.users.id` ON DELETE CASCADE | Proprietario del viaggio |
| `data` | JSONB | NOT NULL | Blob JSON completo con tutti i dati del viaggio |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Data creazione |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Data ultimo aggiornamento |

**RLS**: l'utente puo eseguire CRUD solo sui propri viaggi (`auth.uid() = user_id`).

Il campo `data` contiene l'intera struttura del viaggio in formato JSON: informazioni generali, array di voli con passeggeri, array di prenotazioni hotel e array di attivita personalizzate. Questa scelta di design (blob JSON singolo) semplifica le operazioni di lettura/scrittura e consente aggiornamenti atomici dell'intero viaggio.

---

### pending_bookings

Prenotazioni estratte dalle email inoltrate dagli utenti, in attesa di essere associate a un viaggio esistente.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | UUID | PK, DEFAULT `gen_random_uuid()` | Identificativo prenotazione |
| `user_id` | UUID | FK `auth.users.id` ON DELETE CASCADE | Utente destinatario |
| `email_from` | TEXT | | Mittente dell'email originale |
| `email_subject` | TEXT | | Oggetto dell'email |
| `email_received_at` | TIMESTAMPTZ | | Data ricezione email |
| `email_message_id` | TEXT | | ID univoco del messaggio email |
| `booking_type` | TEXT | | Tipo: `flight`, `hotel` o `unknown` |
| `extracted_data` | JSONB | | Dati estratti dall'analisi del PDF |
| `summary_title` | TEXT | | Titolo riepilogativo (es. "Roma - Milano") |
| `summary_dates` | TEXT | | Date riepilogative (es. "15 Mar - 20 Mar") |
| `pdf_path` | TEXT | | Percorso del PDF nello storage |
| `status` | TEXT | DEFAULT `'pending'` | Stato: `pending`, `associated` o `dismissed` |
| `associated_trip_id` | UUID | FK `trips.id` | Viaggio a cui e stata associata |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Data creazione |

**RLS**: l'utente puo leggere (`SELECT`), aggiornare (`UPDATE`) e cancellare (`DELETE`) le proprie prenotazioni. L'inserimento (`INSERT`) e riservato esclusivamente al service role (webhook email).

---

### travelers

Profili dei viaggiatori abituali con dati dei documenti e programmi fedelta.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | UUID | PK, DEFAULT `gen_random_uuid()` | Identificativo viaggiatore |
| `user_id` | UUID | FK `auth.users.id` ON DELETE CASCADE | Utente proprietario |
| `is_owner` | BOOLEAN | DEFAULT `false` | Se il viaggiatore e l'utente stesso |
| `first_name` | TEXT | NOT NULL | Nome |
| `last_name` | TEXT | NOT NULL | Cognome |
| `passport_number` | TEXT | | Numero passaporto (crittografato AES-256-GCM) |
| `passport_issue_date` | DATE | | Data rilascio passaporto |
| `passport_expiry_date` | DATE | | Data scadenza passaporto |
| `loyalty_programs` | JSONB | | Array di programmi fedelta |
| `sort_order` | INTEGER | | Ordine di visualizzazione |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Data creazione |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Data ultimo aggiornamento |

**RLS**: l'utente puo eseguire CRUD solo sui propri viaggiatori (`auth.uid() = user_id`).

Il campo `loyalty_programs` contiene un array JSON con la struttura:

```json
[
  { "airline": "Alitalia", "number": "AZ123456", "tier": "Gold" },
  { "airline": "Lufthansa", "number": "LH789012", "tier": "Senator" }
]
```

Il campo `passport_number` viene crittografato lato server con **AES-256-GCM** prima di essere salvato nel database. Il formato crittografato e `{iv_hex}:{authTag_hex}:{ciphertext_hex}`. In fase di lettura, i valori che non contengono il separatore `:` vengono trattati come testo in chiaro (passthrough per retrocompatibilita).

---

### city_photos

Cache delle foto delle citta utilizzate come copertina delle card dei viaggi.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | UUID | PK, DEFAULT `gen_random_uuid()` | Identificativo |
| `user_id` | UUID | FK `auth.users.id` | Utente proprietario |
| `city` | TEXT | NOT NULL | Nome della citta |
| `url` | TEXT | NOT NULL | URL della foto |
| `isCustom` | BOOLEAN | | Se la foto e stata caricata dall'utente |
| `attribution` | TEXT | | Attribuzione della foto |
| `photographer` | TEXT | | Nome del fotografo |

**Vincolo UNIQUE**: `(user_id, city)` -- ogni utente ha al massimo una foto per citta.

---

### google_places_cache

Cache condivisa tra tutti gli utenti per i risultati delle ricerche su Google Places.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `resolved_url` | TEXT | UNIQUE | URL risolto di Google Maps |
| `name` | TEXT | | Nome del luogo |
| `address` | TEXT | | Indirizzo |
| `latitude` | FLOAT | | Latitudine |
| `longitude` | FLOAT | | Longitudine |
| `rating` | FLOAT | | Valutazione media |
| `review_count` | INTEGER | | Numero di recensioni |
| `category` | TEXT | | Categoria del luogo |

**RLS**: tutti gli utenti autenticati possono leggere; solo il service role puo scrivere. Questa tabella e condivisa per evitare chiamate duplicate all'API di Google Places per gli stessi luoghi.

---

### email_processing_log

Log di elaborazione delle email ricevute dal webhook SendGrid e dei PDF caricati direttamente dall'admin.

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `email_from` | TEXT | | Mittente |
| `email_subject` | TEXT | | Oggetto |
| `email_message_id` | TEXT | | ID messaggio |
| `status` | TEXT | | Esito elaborazione |
| `user_id` | UUID | | Utente associato (se identificato) |
| `error_message` | TEXT | | Messaggio di errore (se fallita) |
| `source` | TEXT | CHECK `email`/`upload` | Origine: `'email'` (webhook SendGrid) o `'upload'` (admin PDF) |
| `trip_id` | TEXT | FK `trips.id` | Viaggio associato (se applicabile) |
| `attachment_count` | INTEGER | | Numero di allegati PDF elaborati |
| `extracted_summary` | JSONB | | Riepilogo dei dati estratti |
| `parse_level` | SMALLINT | | Livello SmartParse: `1`=cache, `2`=template, `4`=Claude, `NULL`=legacy |
| `parse_meta` | JSONB | | Metadati SmartParse: `{ brand, claudeCalls, durationMs, levels[], feedback }` |

**RLS**: nessuna policy utente. Solo il service role puo leggere e scrivere in questa tabella.

---

### parsing_templates_beta

Cache e template per il sistema **SmartParse** — un record per provider + tipo documento (es. `tpl-ita-airways-flight`, `tpl-booking-com-hotel`).

| Colonna | Tipo | Vincoli | Descrizione |
|---------|------|---------|-------------|
| `id` | TEXT | PK | Formato `tpl-{brand}-{docType}` |
| `name` | TEXT | NOT NULL | Nome descrittivo del template |
| `source` | TEXT | DEFAULT `'ai'` | Origine: `'ai'`, `'heuristic'` o `'manual'` |
| `doc_type` | TEXT | DEFAULT `'any'` | Tipo documento: `'flight'`, `'hotel'` o `'any'` |
| `brand` | TEXT | | Nome canonico del brand (es. `"ITA Airways"`) |
| `brand_aliases` | TEXT[] | DEFAULT `'{}'` | Alias alternativi del brand (es. `["ITA", "AZ"]`) |
| `match_rules` | JSONB | DEFAULT `'{}'` | `{ _knownFingerprints: [...], _results: {...}, _sampleText: "..." }` |
| `field_rules` | JSONB | DEFAULT `'[]'` | Extraction map — regole anchor per estrazione L2 |
| `min_confidence` | FLOAT | DEFAULT `0.6` | Soglia minima di confidenza |
| `usage_count` | INTEGER | DEFAULT `0` | Numero totale di utilizzi |
| `last_sample_fingerprint` | TEXT | | SHA-256 dell'ultimo documento processato via L4 |
| `last_sample_result` | JSONB | | Ultimo risultato Claude (usato per il clone L2) |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Data creazione |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Data ultimo aggiornamento |

**RLS**: nessuna policy pubblica — accessibile solo tramite service role key.

**Funzione helper**: `increment_template_usage_beta(template_id TEXT)` — incremento atomico di `usage_count` per evitare race conditions.

**Indici**: su `last_sample_fingerprint` (lookup L1), su `doc_type`, su `brand`, GIN su `brand_aliases`.

---

## Funzioni helper

Il database include tre funzioni PostgreSQL di supporto:

| Funzione | Tipo | Descrizione |
|----------|------|-------------|
| `handle_updated_at()` | Trigger function | Aggiorna automaticamente il campo `updated_at` a `now()` ad ogni `UPDATE` |
| `is_valid_username(text)` | SQL function | Verifica che lo username rispetti il formato `[a-zA-Z0-9]{5,12}` |
| `is_username_available(text)` | SQL function | Controlla che lo username non sia gia in uso nella tabella `profiles` |

La funzione `handle_updated_at()` e collegata come trigger `BEFORE UPDATE` alle tabelle `profiles`, `trips` e `travelers`.

## Riepilogo Row Level Security

| Tabella | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| `profiles` | Proprio profilo | Proprio profilo | Proprio profilo | Proprio profilo |
| `trips` | Propri viaggi | Propri viaggi | Propri viaggi | Propri viaggi |
| `pending_bookings` | Proprie prenotazioni | Solo service role | Proprie prenotazioni | Proprie prenotazioni |
| `travelers` | Propri viaggiatori | Propri viaggiatori | Propri viaggiatori | Propri viaggiatori |
| `city_photos` | Proprie foto | Proprie foto | Proprie foto | Proprie foto |
| `google_places_cache` | Tutti gli autenticati | Solo service role | Solo service role | Solo service role |
| `email_processing_log` | Solo service role | Solo service role | Solo service role | Solo service role |
| `parsing_templates_beta` | Solo service role | Solo service role | Solo service role | Solo service role |

In tutte le policy "proprio/propri" il filtro e `auth.uid() = user_id` (o `auth.uid() = id` per `profiles`).
