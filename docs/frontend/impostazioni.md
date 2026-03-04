# Impostazioni

La pagina impostazioni (`profile.html` + `js/profile.js`) permette all'utente di gestire il proprio profilo, i viaggiatori associati e le preferenze dell'applicazione. La navigazione tra le sezioni avviene tramite un **segmented control** a tre tab.

## Tab Profilo

Il tab Profilo mostra le informazioni dell'account dell'utente.

### Avatar

Un avatar circolare mostra l'**iniziale dello username** dell'utente, con sfondo colorato generato automaticamente.

### Campi del profilo

| Campo | Modificabile | Descrizione |
|-------|:------------:|-------------|
| Username | No | Impostato alla creazione dell'account, non modificabile successivamente |
| Email | No | Email associata all'account, sola lettura |
| Lingua preferita | Si | Selezione tra italiano (`it`) e inglese (`en`) |

### Azioni

- **Pulsante logout**: disconnette l'utente e reindirizza alla pagina di login

## Tab Viaggiatori

Il tab Viaggiatori gestisce l'elenco delle persone che possono essere associate ai viaggi dell'utente.

### Lista viaggiatori

La lista mostra tutti i viaggiatori registrati dall'utente. Uno di essi e contrassegnato come **owner** (il titolare dell'account) e viene evidenziato con un **badge** distintivo. L'ordinamento della lista segue il campo `sort_order` per consentire un ordinamento personalizzato.

### CRUD viaggiatore

Per ogni viaggiatore e possibile gestire le seguenti informazioni:

#### Dati anagrafici
- **Nome** (obbligatorio)
- **Cognome** (obbligatorio)

#### Dati passaporto

I dati del passaporto sono protetti da **crittografia AES-256-GCM**. Il processo funziona cosi:

1. **Salvataggio**: i dati sensibili vengono crittografati lato client tramite la funzione `encryptData()` prima dell'invio al server
2. **Archiviazione**: nel database il valore crittografato e nel formato `iv:authTag:ciphertext` (tutti in formato esadecimale)
3. **Caricamento**: al recupero dei dati, la funzione `decryptData()` decritta i valori. I valori senza il carattere `:` vengono trattati come testo in chiaro (retrocompatibilita)

La crittografia e la decrittografia avvengono tramite la Netlify Function `crypto.js`, che utilizza una chiave segreta (`ENCRYPTION_KEY`) memorizzata nelle variabili d'ambiente.

Campi del passaporto:

| Campo | Crittografato | Descrizione |
|-------|:-------------:|-------------|
| Numero passaporto | Si | Numero del documento |
| Data di emissione | No | Data di rilascio del passaporto |
| Data di scadenza | No | Data di scadenza del passaporto |

#### Programmi fedelta

Ogni viaggiatore puo avere uno o piu programmi fedelta associati, memorizzati come array JSONB nel campo `loyalty_programs` della tabella `travelers`.

Per ogni programma fedelta si registra:

- **Compagnia aerea**: selezionata tramite una **modal di ricerca** che carica i dati da `data/airlines.json`. Il file delle compagnie aeree viene caricato in modalita **lazy-loaded** (solo al primo accesso alla modal di ricerca), e contiene esclusivamente le compagnie che offrono programmi fedelta
- **Numero tessera**: il codice identificativo del programma
- **Livello (tier)**: il livello raggiunto nel programma (es. Silver, Gold, Platinum)

### Struttura dati

La tabella `travelers` nel database Supabase ha la seguente struttura:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | UUID | Identificativo univoco |
| `user_id` | UUID | Riferimento all'utente proprietario |
| `is_owner` | boolean | Indica se e il titolare dell'account |
| `first_name` | text | Nome |
| `last_name` | text | Cognome |
| Campi passaporto | text (crittografato) | Dati del documento |
| `loyalty_programs` | JSONB | Array dei programmi fedelta |
| `sort_order` | integer | Ordine di visualizzazione |

## Tab Preferenze

Il tab Preferenze raccoglie le impostazioni generali dell'applicazione:

- **Lingua**: selezione della lingua dell'interfaccia
- **Notifiche**: configurazione delle notifiche (promemoria voli, check-in, ecc.)
- Altre impostazioni di personalizzazione dell'esperienza utente
