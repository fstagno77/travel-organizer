# Viaggiatori (Travelers)

I viaggiatori rappresentano le persone associate a un account utente. Vengono gestiti nella sezione Impostazioni dell'applicazione (`profile.html`), nella tab "Viaggiatori".

A differenza delle altre entita', i viaggiatori non sono salvati come blob JSON nella tabella `trips`, ma hanno una **tabella Supabase dedicata**: `travelers`.

## Schema tabella

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "is_owner": true,
  "first_name": "Mario",
  "last_name": "Rossi",
  "passport_number": "iv_hex:authTag_hex:ciphertext_hex",
  "passport_issue_date": "2020-01-15",
  "passport_expiry_date": "2030-01-14",
  "loyalty_programs": [
    {
      "airline": "Alitalia",
      "number": "AZ123456",
      "tier": "Gold"
    }
  ],
  "sort_order": 0
}
```

## Campi nel dettaglio

### id

Identificativo univoco in formato UUID, generato da Supabase.

### user_id

UUID dell'utente proprietario. Ogni viaggiatore e' collegato a un singolo account utente.

### is_owner

Campo booleano che indica se il viaggiatore e' il titolare dell'account. Esiste un **indice UNIQUE** che garantisce che ogni utente possa avere al massimo un solo viaggiatore con `is_owner = true`.

Il viaggiatore owner viene tipicamente creato per primo e rappresenta l'utente stesso.

### first_name e last_name

Nome e cognome del viaggiatore. Utilizzati per la visualizzazione nell'interfaccia e per l'associazione con i passeggeri dei voli.

### Dati passaporto

| Campo | Tipo | Descrizione |
|---|---|---|
| `passport_number` | `string` | Numero del passaporto (**crittografato**) |
| `passport_issue_date` | `string` | Data di emissione (formato `YYYY-MM-DD`) |
| `passport_expiry_date` | `string` | Data di scadenza (formato `YYYY-MM-DD`) |

## Crittografia passaporti

I numeri di passaporto sono dati sensibili e vengono crittografati prima del salvataggio nel database utilizzando l'algoritmo **AES-256-GCM**.

### Flusso di crittografia

1. Il frontend chiama `encryptData()` (definita in `auth.js`)
2. `encryptData()` invoca la Netlify Function `crypto.js` con l'azione `encrypt`
3. La funzione crittografa il dato usando la chiave `ENCRYPTION_KEY` presente nelle variabili d'ambiente
4. Il risultato viene restituito nel formato `iv:authTag:ciphertext` (tutto in esadecimale)

### Formato crittografato

Il valore salvato nel campo `passport_number` ha il formato:

```
iv_hex:authTag_hex:ciphertext_hex
```

Dove:
- **iv** — Vettore di inizializzazione (initialization vector), unico per ogni operazione di crittografia
- **authTag** — Tag di autenticazione GCM, che garantisce l'integrita' del dato
- **ciphertext** — Il numero di passaporto crittografato

Tutti e tre i componenti sono codificati in esadecimale e separati dal carattere `:`.

### Flusso di decrittazione

1. Il frontend chiama `decryptData()` (definita in `auth.js`)
2. La funzione `loadTravelers` invoca automaticamente la decrittazione per ogni viaggiatore
3. La Netlify Function `crypto.js` con l'azione `decrypt` ripristina il valore originale

### Retrocompatibilita'

La funzione `decryptData` gestisce automaticamente la retrocompatibilita': se il valore di `passport_number` **non contiene** il carattere `:`, viene trattato come testo in chiaro (plaintext passthrough) e restituito senza tentare la decrittazione.

Questo meccanismo garantisce che i dati inseriti prima dell'introduzione della crittografia continuino a funzionare correttamente.

### Migrazione dati esistenti

Per i passaporti salvati in chiaro prima dell'introduzione della crittografia, e' disponibile lo script di migrazione:

```
scripts/encrypt-existing-passports.js
```

Questo script (da eseguire una tantum) utilizza la chiave service role di Supabase per leggere tutti i passaporti non crittografati e sovrascriverli con la versione crittografata.

## Programmi fedelta' (loyalty_programs)

Campo JSONB che contiene un array di programmi fedelta' aerei:

```json
[
  {
    "airline": "Alitalia",
    "number": "AZ123456",
    "tier": "Gold"
  },
  {
    "airline": "Lufthansa",
    "number": "LH9876543",
    "tier": "Senator"
  }
]
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `airline` | `string` | Nome della compagnia aerea |
| `number` | `string` | Numero della tessera fedelta' |
| `tier` | `string` | Livello del programma (es. Silver, Gold, Platinum) |

### Ricerca compagnie aeree

La lista delle compagnie aeree disponibili e' contenuta nel file `data/airlines.json`. Questo file contiene **solo le compagnie che offrono programmi fedelta'**, filtrate da un dataset piu' ampio.

La ricerca delle compagnie avviene tramite una **modal con campo di ricerca** che viene caricata in modalita' lazy-loaded per non appesantire il caricamento iniziale della pagina.

## Ordinamento (sort_order)

Campo numerico intero che determina la posizione del viaggiatore nella lista. Permette all'utente di personalizzare l'ordine di visualizzazione tramite drag-and-drop o spostamento manuale.

Il valore parte da `0` per il primo viaggiatore e incrementa di 1 per ogni posizione successiva.

## Interfaccia utente

La gestione dei viaggiatori avviene nella pagina Impostazioni (`profile.html`), che presenta tre tab:

| Tab | Descrizione |
|---|---|
| **Profilo** | Dati dell'account utente |
| **Viaggiatori** | Lista e gestione dei viaggiatori (questa entita') |
| **Preferenze** | Impostazioni dell'applicazione |

Il codice frontend e' implementato in `js/profile.js`.
