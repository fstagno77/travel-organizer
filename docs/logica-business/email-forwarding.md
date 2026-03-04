# Email Forwarding

Il sistema di email forwarding permette agli utenti di importare prenotazioni semplicemente inoltrando le email di conferma a un indirizzo dedicato. Il flusso e completamente automatico: dall'arrivo dell'email all'estrazione dei dati di prenotazione.

## Flusso completo

```
Utente inoltra email → SendGrid Inbound Parse → POST webhook
→ Parsing multipart → Identificazione utente → Estrazione dati
→ Salvataggio pending_booking → Notifica frontend
```

### 1. Ricezione email

L'utente inoltra un'email di conferma prenotazione (volo o hotel) a un indirizzo email dedicato configurato su SendGrid Inbound Parse.

### 2. Webhook

SendGrid invia una richiesta HTTP POST in formato `multipart/form-data` all'endpoint `/.netlify/functions/process-email`. Questo endpoint e **pubblico** (non richiede autenticazione JWT) perche viene invocato direttamente da SendGrid.

### 3. Parsing della richiesta

Il parsing del body multipart avviene tramite la libreria `busboy`. Il sistema supporta tre formati di input:

| Formato | Descrizione |
|---------|-------------|
| Upload multipart file | File allegati inviati come parti multipart standard |
| SendGrid parsed mode | Allegati descritti in un campo `attachment-info` JSON, con i file come parti separate |
| Raw MIME message | Messaggio MIME completo da cui vengono estratti allegati e corpo |

### 4. Dati estratti dalla richiesta

| Campo | Descrizione |
|-------|-------------|
| `senderEmail` | Email del mittente (l'utente che ha inoltrato) |
| `subject` | Oggetto dell'email originale |
| `htmlBody` | Corpo HTML dell'email |
| `textBody` | Corpo testuale dell'email (fallback) |
| `messageId` | Identificativo univoco del messaggio (per deduplicazione) |
| `attachments` | Array di allegati (PDF) |

## Elaborazione

### Deduplicazione email

Prima di qualsiasi elaborazione, il sistema controlla se l'`email_message_id` e gia presente nella tabella `email_processing_log`. Se l'email e gia stata processata, la richiesta viene ignorata per evitare duplicazioni causate da retry di SendGrid.

### Identificazione utente

Il sistema cerca l'utente nel database tramite l'indirizzo email del mittente:

1. Cerca nella tabella `profiles` un record con email corrispondente (confronto case-insensitive)
2. Se l'utente non viene trovato, l'elaborazione si interrompe e l'evento viene loggato

### Estrazione dati di prenotazione

I dati di prenotazione vengono estratti da tre fonti possibili, in ordine di priorita:

| Priorita | Fonte | Limite | Descrizione |
|----------|-------|--------|-------------|
| 1 (massima) | HTML body | 20.000 caratteri | Le email HTML contengono la formattazione originale con tutti i dettagli |
| 2 | Text body | 15.000 caratteri | Versione testuale dell'email, usata come fallback |
| 3 | PDF allegato | - | Elaborato con `processSinglePdfWithClaude` dal modulo condiviso `emailExtractor.js` |

I limiti di caratteri servono a rispettare i limiti di contesto dell'API di Claude e a ridurre i costi.

### Classificazione

Il sistema determina automaticamente il tipo di prenotazione:

| Tipo | Significato |
|------|-------------|
| `flight` | Prenotazione di volo |
| `hotel` | Prenotazione alberghiera |
| `unknown` | Tipo non determinabile |

Vengono inoltre generati due campi di riepilogo:
- **`summary_title`** -- Titolo sintetico della prenotazione (es. "Volo AZ1234 FCO-NRT")
- **`summary_dates`** -- Date rilevanti in formato leggibile

## Salvataggio

### Pending booking

I dati estratti non vengono inseriti direttamente in un viaggio. Vengono invece salvati come **pending booking**:

```json
{
  "user_id": "uuid-utente",
  "status": "pending",
  "extracted_data": { /* dati strutturati estratti */ },
  "email_subject": "Conferma prenotazione volo...",
  "email_message_id": "message-id-univoco",
  "booking_type": "flight",
  "summary_title": "Volo AZ1234 FCO-NRT",
  "summary_dates": "15 Mar 2026"
}
```

### Log di elaborazione

Ogni elaborazione viene registrata nella tabella `email_processing_log` con l'esito (successo, errore, utente non trovato, duplicato).

### Risposta

L'endpoint restituisce sempre `200 OK` indipendentemente dall'esito dell'elaborazione. Questo pattern **fire-and-forget** e necessario perche SendGrid ripete le chiamate per qualsiasi risposta diversa da `2xx`, e non ha senso rielaborare un'email che ha generato un errore applicativo.

## Gestione pending bookings

### Frontend

Il frontend presenta una pagina dedicata che mostra la lista dei pending bookings dell'utente. Per ogni prenotazione in attesa, l'utente puo scegliere tra tre azioni:

| Azione | Risultato |
|--------|-----------|
| Associa a viaggio esistente | I dati vengono aggiunti al viaggio selezionato (stessa logica di `add-booking`) |
| Crea nuovo viaggio | Viene creato un nuovo viaggio con i dati estratti |
| Ignora | La prenotazione viene marcata come `dismissed` |

### Stati del pending booking

```
pending → associated   (associata a un viaggio)
pending → dismissed    (ignorata dall'utente)
```

### Notifiche

Il frontend esegue un **polling periodico** per verificare la presenza di nuovi pending bookings. Quando ne vengono trovati, viene mostrato un badge di notifica nell'header dell'applicazione per informare l'utente.
