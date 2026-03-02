# manage-collaboration

Gestisce la condivisione collaborativa dei viaggi: inviti, accettazioni, revoche e lista collaboratori.

- **Path**: `/.netlify/functions/manage-collaboration`
- **Metodo**: `POST`
- **Auth**: JWT obbligatorio

Tutte le richieste condividono il campo `action` che determina l'operazione da eseguire.

---

## `invite`

Invita un utente al viaggio tramite email.

**Permessi richiesti**: `proprietario` o `viaggiatore` (i viaggiatori possono invitare solo ospiti).

### Request

```json
{
  "action": "invite",
  "tripId": "trip-uuid",
  "email": "utente@esempio.it",
  "role": "ospite"
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `tripId` | string | ✅ | ID del viaggio |
| `email` | string | ✅ | Email dell'invitato |
| `role` | string | — | `'viaggiatore'` o `'ospite'` (default: `'ospite'`) |

### Comportamento

- **Utente già registrato**: crea un record in `trip_collaborators` (status=`'pending'`) e invia una notifica in-app.
- **Utente non registrato**: crea un record in `trip_invitations` e invia un'email con link di invito tramite `supabase.auth.admin.inviteUserByEmail()`.

### Response

```json
{ "success": true, "type": "collaborator" }
// oppure
{ "success": true, "type": "invitation" }
```

---

## `accept-invite`

Accetta un invito tramite token (flusso per utenti non registrati che si iscrivono tramite link email).

### Request

```json
{
  "action": "accept-invite",
  "token": "64-char-hex-token"
}
```

### Comportamento

1. Cerca il record in `trip_invitations` con il token e `status='pending'`
2. Verifica che l'email del token corrisponda all'email dell'utente autenticato (sicurezza)
3. Aggiunge l'utente a `trip_collaborators`
4. Aggiorna `trip_invitations.status = 'accepted'`
5. Invia notifica al mittente dell'invito

### Response

```json
{ "success": true, "tripId": "trip-uuid", "role": "ospite" }
```

---

## `list`

Restituisce proprietario, collaboratori attivi e inviti pendenti per un viaggio.

**Permessi richiesti**: qualsiasi ruolo sul viaggio.

### Request

```json
{
  "action": "list",
  "tripId": "trip-uuid"
}
```

### Response

```json
{
  "success": true,
  "owner": {
    "userId": "uuid",
    "email": "owner@esempio.it",
    "username": "mario",
    "role": "proprietario"
  },
  "collaborators": [
    {
      "id": "collab-uuid",
      "userId": "uuid",
      "email": "user@esempio.it",
      "username": "luigi",
      "role": "viaggiatore",
      "status": "accepted",
      "invitedBy": "uuid",
      "createdAt": "2026-03-01T10:00:00Z",
      "type": "collaborator"
    }
  ],
  "invitations": [
    {
      "id": "inv-uuid",
      "email": "nuovo@esempio.it",
      "role": "ospite",
      "invitedBy": "uuid",
      "status": "pending",
      "createdAt": "2026-03-01T11:00:00Z",
      "type": "invitation"
    }
  ],
  "callerRole": "proprietario"
}
```

---

## `revoke`

Revoca l'accesso di un collaboratore o annulla un invito pendente.

**Permessi**: `proprietario` può revocare chiunque. `viaggiatore` può revocare solo gli ospiti da lui invitati.

### Request

```json
{
  "action": "revoke",
  "tripId": "trip-uuid",
  "collaboratorId": "collab-uuid"
}
```

oppure per un invito pendente:

```json
{
  "action": "revoke",
  "tripId": "trip-uuid",
  "invitationId": "inv-uuid"
}
```

### Response

```json
{ "success": true }
```

---

## `resend-invite`

Reinvia l'email di invito a un utente non ancora registrato.

**Permessi richiesti**: `proprietario`.

### Request

```json
{
  "action": "resend-invite",
  "tripId": "trip-uuid",
  "invitationId": "inv-uuid"
}
```

### Response

```json
{ "success": true }
```

---

## `remove-self`

Permette a un collaboratore di abbandonare autonomamente un viaggio condiviso.

### Request

```json
{
  "action": "remove-self",
  "tripId": "trip-uuid"
}
```

### Response

```json
{ "success": true }
```

---

## `get-role`

Restituisce il ruolo dell'utente autenticato per un dato viaggio.

### Request

```json
{
  "action": "get-role",
  "tripId": "trip-uuid"
}
```

### Response

```json
{ "success": true, "role": "viaggiatore" }
```

---

## `get-past-collaborators`

Restituisce le email e gli username di tutte le persone con cui l'utente ha collaborato in passato. Usato per l'autocomplete nel modal di invito.

### Request

```json
{ "action": "get-past-collaborators" }
```

### Response

```json
{
  "success": true,
  "collaborators": [
    { "email": "user@esempio.it", "username": "luigi" }
  ]
}
```

---

## Codici di errore

| Codice | Causa |
|--------|-------|
| `401` | Token JWT mancante o non valido |
| `403` | Permessi insufficienti per l'operazione |
| `404` | Collaboratore o invito non trovato |
| `409` | Utente già collaboratore del viaggio |
| `400` | Parametri obbligatori mancanti |
