# Condivisione Collaborativa

Travel Flow supporta la condivisione dei viaggi tra più utenti con un sistema di ruoli. Il proprietario di un viaggio può invitare altri utenti, assegnando loro permessi diversi in base al ruolo.

## Ruoli

| Ruolo | Etichetta | Permessi |
|-------|-----------|----------|
| `proprietario` | Proprietario | Tutte le operazioni: modifica, invita, elimina viaggio |
| `viaggiatore` | Viaggiatore | Modifica prenotazioni + invita ospiti |
| `ospite` | Ospite | Solo lettura (nessuna modifica) |

Il proprietario è l'utente che ha creato il viaggio. I ruoli `viaggiatore` e `ospite` sono assegnati al momento dell'invito e possono essere revocati in qualsiasi momento dal proprietario.

## Tabelle database

### `trip_collaborators`

Contiene i collaboratori attivi (utenti già registrati che hanno accettato l'invito).

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | PK |
| `trip_id` | TEXT | FK → `trips.id` |
| `user_id` | UUID | FK → `auth.users` |
| `role` | TEXT | `'viaggiatore'` o `'ospite'` |
| `invited_by` | UUID | FK → `auth.users` (chi ha invitato) |
| `status` | TEXT | `'pending'` (invito non ancora accettato) o `'accepted'` |
| `created_at` | TIMESTAMP | — |

### `trip_invitations`

Contiene gli inviti inviati a email non ancora registrate sulla piattaforma.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | PK |
| `trip_id` | TEXT | FK → `trips.id` |
| `email` | TEXT | Email dell'invitato |
| `role` | TEXT | `'viaggiatore'` o `'ospite'` |
| `invited_by` | UUID | FK → `auth.users` |
| `status` | TEXT | `'pending'`, `'accepted'` o `'revoked'` |
| `token` | TEXT | Token univoco a 64 caratteri hex per il link di invito |
| `created_at`, `updated_at` | TIMESTAMP | — |

## Flusso di invito

### Utente già registrato

```
Invitante apre share modal → inserisce email
    ↓
Backend: email trovata in profiles
    ↓
Crea record in trip_collaborators (status='pending')
    ↓
Invia notifica in-app all'invitato
    ↓
Invitato vede notifica → accetta o rifiuta
    ↓
trip_collaborators.status = 'accepted' | eliminato
```

### Utente non ancora registrato

```
Invitante inserisce email non registrata
    ↓
Backend: crea trip_invitations (status='pending', token=random 64 hex)
    ↓
supabase.auth.admin.inviteUserByEmail(email, { redirectTo: '/?invite=TOKEN' })
    ↓
Utente riceve email con magic link → /?invite=TOKEN
    ↓
Token salvato in sessionStorage('pending_invite_token')
    ↓
Utente si autentica (OTP o Google) → profilo creato
    ↓
acceptPendingInvite(): trip_invitations.status = 'accepted'
                       + record in trip_collaborators
    ↓
Redirect al viaggio
```

## Permessi e controllo accessi

La logica di controllo accessi è centralizzata in `netlify/functions/utils/permissions.js`:

```js
canModifyTrip(userId, tripId)  // proprietario o viaggiatore
canDeleteTrip(userId, tripId)  // solo proprietario
getUserRole(userId, tripId)    // ritorna il ruolo dell'utente
```

Le funzioni di mutazione (add/edit/delete booking, manage-activity) chiamano `canModifyTrip()` prima di eseguire la modifica. `delete-trip.js` chiama `canDeleteTrip()`.

### Gating interfaccia

Dopo il caricamento del viaggio, `tripPage.js` chiama `applyPermissionGating()` che aggiunge una classe CSS al `document.body`:

| Classe | Ruolo |
|--------|-------|
| `role-ospite` | Nasconde tutti i controlli di modifica (CSS `display: none`) |
| `role-viaggiatore` | Nasconde "Elimina viaggio" e "Rinomina" |
| _(nessuna)_ | Proprietario — accesso completo |

## Notifiche

Il sistema di notifiche aggiorna i collaboratori su ogni evento rilevante del viaggio.

### Tabella `notifications`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | Destinatario |
| `type` | TEXT | Tipo evento (vedi sotto) |
| `trip_id` | TEXT | Viaggio di riferimento |
| `actor_id` | UUID | Utente che ha eseguito l'azione |
| `message` | JSONB | `{ it: '...', en: '...' }` |
| `read` | BOOLEAN | Se letta |
| `created_at` | TIMESTAMP | — |

### Tipi di notifica

| Tipo | Trigger |
|------|---------|
| `collaboration_added` | Aggiunto come collaboratore |
| `collaboration_revoked` | Rimosso dal viaggio |
| `invitation_accepted` | Un invitato ha accettato |
| `booking_added` | Prenotazione aggiunta al viaggio |
| `booking_edited` | Prenotazione modificata |
| `booking_deleted` | Prenotazione eliminata |
| `activity_added` | Attività aggiunta |
| `activity_edited` | Attività modificata |
| `activity_deleted` | Attività eliminata |

### Invio notifiche

La funzione `notifyCollaborators()` in `netlify/functions/utils/notificationHelper.js` invia notifiche a tutti i collaboratori del viaggio, escludendo l'utente che ha eseguito l'azione. È non fatale: gli errori vengono catturati senza interrompere l'operazione principale.

```js
await notifyCollaborators(tripId, actorId, type, msgIt, msgEn);
```

Viene chiamata da tutte le funzioni di mutazione (add-booking, edit-booking, delete-booking, manage-activity, manage-collaboration).

## Frontend

### Share Modal (`js/shareModal.js`)

Modulo condiviso usato da `homePage.js` e `tripPage.js`. La visualizzazione varia in base al ruolo:

| Ruolo | Sezioni visibili |
|-------|-----------------|
| `proprietario` | Link condivisione + Invita (viaggiatore/ospite) + Lista collaboratori (revoca/reinvio) |
| `viaggiatore` | Link condivisione + Invita (solo ospite) + Lista collaboratori |
| `ospite` | Solo link condivisione |

### Pagina notifiche (`notifications.html`)

Lista delle ultime 50 notifiche (max 30 giorni). Il badge nell'header mostra la somma di prenotazioni pendenti + notifiche non lette, aggiornato all'avvio di ogni pagina.

### Badge proprietario nel viaggio

Nei viaggi condivisi (utente non proprietario), viene mostrato sotto il titolo:
- Nome del proprietario (`trip-owner-info`)
- Ruolo dell'utente corrente (`trip-role-badge`)
- Opzione "Lascia viaggio" nel menu

## Sicurezza

| Meccanismo | Dettaglio |
|------------|-----------|
| Verifica JWT | Ogni endpoint valida il token prima di qualsiasi operazione |
| Controllo ruolo | `getUserRole()` interroga il database per il ruolo effettivo, non si fida del client |
| Invito email verificata | In `accept-invite`, il backend verifica che l'email del JWT corrisponda all'email dell'invito |
| Revoca immediata | La revoca aggiorna `status='revoked'` e rimuove da `trip_collaborators` in una transazione |
| RLS | Le policy Supabase impediscono accessi cross-user anche in caso di bug applicativo |
