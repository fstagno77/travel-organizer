# Autenticazione

Travel Organizer utilizza **Supabase Auth** per la gestione dell'autenticazione, supportando due provider: **Google OAuth** e **Magic Link** (OTP via email).

## Provider di autenticazione

| Provider | Metodo | Descrizione |
|----------|--------|-------------|
| **Google OAuth** | OAuth 2.0 | Login con account Google tramite redirect |
| **Magic Link** | OTP via email | L'utente riceve un link di accesso nella casella email |

Entrambi i metodi sono gestiti direttamente dal client Supabase nel frontend, senza logica backend custom per il flusso di autenticazione.

## Flusso di autenticazione

### Login

1. L'utente accede alla pagina `login.html` e sceglie il metodo di autenticazione
2. Il client Supabase avvia il flusso OAuth (redirect a Google) o invia il Magic Link
3. Dopo l'autenticazione, l'utente viene reindirizzato all'applicazione con una sessione attiva
4. Supabase gestisce automaticamente il token JWT, il refresh token e la persistenza della sessione nel browser

### Richieste autenticate

Il token JWT viene inviato ad ogni chiamata alle Netlify Functions tramite l'header HTTP:

```
Authorization: Bearer {jwt_token}
```

Il client Supabase nel frontend si occupa automaticamente di includere il token nelle richieste e di rinnovarlo alla scadenza.

## Validazione backend

Nel backend, la funzione `authenticateRequest()` (definita in `netlify/functions/utils/auth.js`) gestisce la validazione del token:

1. Estrae il JWT dall'header `Authorization`
2. Crea un client Supabase inizializzato con il token dell'utente
3. Verifica la validita del token tramite `supabase.auth.getUser()`
4. Restituisce il client autenticato e i dati dell'utente

```js
const { user, supabase } = await authenticateRequest(event);
```

Il client Supabase restituito e gia inizializzato con il token dell'utente. Questo significa che tutte le query successive al database saranno automaticamente filtrate dal **Row Level Security**: l'utente potra accedere solo ai propri dati, senza necessita di filtri manuali nel codice applicativo.

## Creazione profilo

Dopo il primo login, l'utente deve completare la registrazione scegliendo uno **username**:

### Regole username

| Regola | Dettaglio |
|--------|----------|
| Lunghezza | Da 5 a 12 caratteri |
| Caratteri ammessi | Solo lettere e numeri (`[a-zA-Z0-9]`) |
| Unicita | Deve essere univoco nel sistema |

### Validazione username

Due funzioni SQL nel database gestiscono la validazione:

- **`is_valid_username(text)`** -- Verifica che il formato rispetti il pattern `[a-zA-Z0-9]{5,12}` tramite espressione regolare
- **`is_username_available(text)`** -- Controlla che lo username non sia gia presente nella tabella `profiles`

L'endpoint `check-username` e **pubblico** (non richiede autenticazione) per permettere la verifica in tempo reale durante la digitazione, prima che l'utente abbia completato la registrazione.

## Crittografia dati sensibili

I numeri di passaporto dei viaggiatori vengono crittografati prima di essere salvati nel database, utilizzando l'algoritmo **AES-256-GCM**.

### Architettura della crittografia

| Componente | Ruolo |
|------------|-------|
| `netlify/functions/crypto.js` | Funzione serverless che esegue cifratura e decifratura |
| `ENCRYPTION_KEY` | Chiave simmetrica a 256 bit, variabile d'ambiente |
| `auth.js` (frontend) | Funzioni `encryptData()` e `decryptData()` che chiamano la funzione crypto |

### Formato crittografato

Il valore crittografato viene salvato nel database come stringa con il formato:

```
{iv_hex}:{authTag_hex}:{ciphertext_hex}
```

Dove:
- **`iv_hex`** -- Vettore di inizializzazione (12 byte, random, in formato esadecimale)
- **`authTag_hex`** -- Tag di autenticazione GCM (16 byte, in formato esadecimale)
- **`ciphertext_hex`** -- Testo cifrato (in formato esadecimale)

### Compatibilita retroattiva

La funzione `decryptData()` verifica se il valore contiene il separatore `:`. Se il valore non contiene separatori, viene restituito cosi com'e (passthrough in chiaro). Questo permette la retrocompatibilita con dati salvati prima dell'introduzione della crittografia, senza necessita di migrazioni distruttive.

### Flusso operativo

**Salvataggio** (`saveTraveler`):
1. Il frontend chiama `encryptData(passportNumber)`
2. `encryptData()` invia il valore alla funzione `crypto.js` con azione `encrypt`
3. Il valore crittografato viene salvato nel campo `passport_number` del database

**Lettura** (`loadTravelers`):
1. Il valore crittografato viene letto dal database
2. Il frontend chiama `decryptData(encryptedValue)`
3. `decryptData()` invia il valore alla funzione `crypto.js` con azione `decrypt`
4. Il valore in chiaro viene mostrato all'utente

## Piattaforma su invito

Travel Flow è una piattaforma **ad accesso chiuso**: solo gli utenti invitati da un membro già registrato possono creare un account. Il tentativo di registrarsi senza un invito valido viene bloccato sia prima dell'invio dell'OTP (livello UX) sia dopo il login (livello sicurezza).

### Regola di accesso

| Condizione | Accesso |
|------------|---------|
| Email presente in `trip_invitations` con `status='pending'` | ✅ Consentito |
| Email già registrata (ha un profilo) | ✅ Consentito |
| Invito revocato (`status='revoked'`) prima della registrazione | ❌ Bloccato |
| Email senza inviti | ❌ Bloccato |
| Utente già registrato rimosso da tutti i viaggi | ✅ Consentito (account permanente) |

### Due livelli di blocco

**Livello 1 — Pre-OTP** (`check-invite-status`, endpoint pubblico):

Prima di inviare il codice via email, la pagina di login verifica che l'indirizzo sia autorizzato. Se non lo è, l'OTP non viene inviato e viene mostrato un messaggio esplicativo. Questo livello si applica solo al flusso magic link (OTP).

**Livello 2 — Post-auth** (`check-registration-access`, endpoint autenticato):

Dopo che Supabase crea la sessione (sia OTP sia Google OAuth), il backend verifica nuovamente l'accesso:

1. Se l'utente ha già un profilo → utente esistente, accesso consentito
2. Se non ha profilo → controlla `trip_invitations` per email con `status='pending'`
3. Se non trovato → elimina il record da `auth.users` via admin API e restituisce 403
4. Il frontend riceve l'errore, esegue il logout e mostra il modal "Accesso riservato"

```js
// check-registration-access.js (semplificato)
const profile = await serviceClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
if (profile) return { allowed: true };  // utente esistente

const invite = await serviceClient.from('trip_invitations')
  .select('id').eq('email', user.email).eq('status', 'pending').maybeSingle();
if (!invite) {
  await serviceClient.auth.admin.deleteUser(user.id);  // nessun account rimane
  return { allowed: false };
}
```

### Flusso completo per nuovo utente invitato

```
Invito inviato → trip_invitations (status='pending')
    ↓
Utente clicca link nell'email → index.html?invite=TOKEN
    ↓
Token salvato in sessionStorage('pending_invite_token')
    ↓
Utente inserisce email/OTP → check-invite-status → canProceed: true
    ↓
Verifica codice → sessione Supabase creata
    ↓
handlePostLogin() → checkRegistrationAccess() → allowed: true
    ↓
Modale username → profilo creato → acceptPendingInvite()
    ↓
trip_invitations.status = 'accepted' + aggiunto a trip_collaborators
    ↓
Redirect al viaggio
```

## Endpoint pubblici

Cinque endpoint non richiedono autenticazione JWT:

| Endpoint | Motivo |
|----------|--------|
| `check-username` | Verifica disponibilita username durante la registrazione, prima che l'utente abbia un token |
| `check-invite-status` | Verifica se un'email può procedere con la registrazione (prima dell'OTP) |
| `get-shared-trip` | Permette l'accesso a un viaggio condiviso tramite link pubblico, senza necessita di un account |
| `process-email` | Webhook invocato da SendGrid; l'autenticazione avviene tramite l'indirizzo email destinatario |
| `get-platform-stats` | Statistiche pubbliche della piattaforma (viaggi, giorni, attivita) mostrate nella login page |

## Service role client

In alcuni casi il backend necessita di operazioni che bypassano il RLS. Il **service role client** viene utilizzato per:

| Caso d'uso | Motivo |
|------------|--------|
| Webhook email (`process-email`) | Nessun contesto utente durante l'elaborazione del webhook |
| Creazione bucket storage | Operazione amministrativa che richiede permessi elevati |
| Scrittura cache condivisa (`google_places_cache`) | La cache e condivisa tra tutti gli utenti |
| Log elaborazione email | La tabella `email_processing_log` non ha policy RLS utente |
| Invio inviti email (`inviteUserByEmail`) | Richiede la Admin API di Supabase |
| Eliminazione utenti non autorizzati | `auth.admin.deleteUser()` richiede la chiave service role |
| Lettura dati condivisi (collaboratori, notifiche) | Accesso cross-user per operazioni di collaborazione |

Il service role client viene creato con la chiave `SUPABASE_SERVICE_ROLE_KEY`, che non viene mai esposta nel codice frontend.
