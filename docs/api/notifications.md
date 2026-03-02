# notifications

Gestisce le notifiche in-app degli utenti: lista notifiche e marcatura come lette.

- **Path**: `/.netlify/functions/notifications`
- **Auth**: JWT obbligatorio

---

## GET — Lista notifiche

Restituisce le ultime 50 notifiche degli ultimi 30 giorni per l'utente autenticato.

### Parametri query

| Parametro | Descrizione |
|-----------|-------------|
| `?count=true` | Restituisce solo il conteggio non letti (per il badge header), senza i dati completi |

### Response (lista completa)

```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "booking_added",
      "tripId": "trip-uuid",
      "actorId": "user-uuid",
      "message": { "it": "Mario ha aggiunto un volo", "en": "Mario added a flight" },
      "read": false,
      "createdAt": "2026-03-01T14:30:00Z",
      "actor": { "username": "mario", "email": "mario@esempio.it" },
      "trip": { "title": "Viaggio in Giappone" }
    }
  ],
  "unreadCount": 3
}
```

### Response (`?count=true`)

```json
{ "success": true, "unreadCount": 3 }
```

---

## POST — Azioni sulle notifiche

### `mark-read` — Marca una notifica come letta

```json
{
  "action": "mark-read",
  "notificationId": "uuid"
}
```

**Response**: `{ "success": true }`

### `mark-all-read` — Marca tutte le notifiche come lette

```json
{ "action": "mark-all-read" }
```

**Response**: `{ "success": true }`

---

## Tipi di notifica

| Tipo | Descrizione |
|------|-------------|
| `collaboration_added` | Sei stato aggiunto come collaboratore a un viaggio |
| `collaboration_revoked` | Il tuo accesso al viaggio è stato revocato |
| `invitation_accepted` | Un tuo invitato ha accettato e si è iscritto |
| `booking_added` | Un collaboratore ha aggiunto una prenotazione |
| `booking_edited` | Un collaboratore ha modificato una prenotazione |
| `booking_deleted` | Un collaboratore ha eliminato una prenotazione |
| `activity_added` | Un collaboratore ha aggiunto un'attività |
| `activity_edited` | Un collaboratore ha modificato un'attività |
| `activity_deleted` | Un collaboratore ha eliminato un'attività |

---

## Badge header

Il badge di notifica nell'header aggrega due contatori recuperati in parallelo all'avvio di ogni pagina:

```js
const [pendingCount, unreadCount] = await Promise.all([
  fetchPendingBookingsCount(),
  fetch('/.netlify/functions/notifications?count=true')
]);
navigation.notificationCount = pendingCount + unreadCount;
```

Dopo `mark-all-read`, `navigation.refreshPendingCount()` aggiorna il badge senza ricaricare la pagina.
