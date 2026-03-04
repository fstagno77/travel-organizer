# Deduplicazione

Quando vengono caricati piu PDF contemporaneamente, o quando si aggiungono prenotazioni a un viaggio esistente, il sistema applica una logica di deduplicazione per evitare di inserire dati duplicati. La deduplicazione opera separatamente su hotel e voli, con strategie differenti per ciascun tipo.

## Deduplicazione Hotel

La deduplicazione degli hotel avviene in tre passaggi, verificando sia gli hotel gia presenti nel viaggio che quelli estratti nel batch corrente.

### Algoritmo

1. **Match primario per `confirmationNumber`** -- Confronto case-insensitive del numero di conferma prenotazione contro:
   - Tutti gli hotel gia salvati nel viaggio
   - Tutti gli hotel gia aggiunti nel batch corrente (deduplicati fin qui)
2. **Match secondario (fallback)** -- Se non esiste un `confirmationNumber`, il sistema verifica la combinazione di tre campi:
   - `name` (nome dell'hotel)
   - `checkIn.date` (data di check-in)
   - `checkOut.date` (data di check-out)
3. **Risultato**:
   - Se viene trovato un match → l'hotel viene scartato (duplicato)
   - Se nessun match → l'hotel viene aggiunto alla lista deduplicata

### Esempio

```
PDF 1 → Hotel Sakura, conf. ABC123, check-in 2026-03-15
PDF 2 → Hotel Sakura, conf. abc123, check-in 2026-03-15   ← DUPLICATO (stesso confirmationNumber)
PDF 3 → Hotel Sakura, conf. (assente), check-in 2026-03-15, check-out 2026-03-18
PDF 4 → Hotel Sakura, conf. (assente), check-in 2026-03-15, check-out 2026-03-18  ← DUPLICATO (fallback match)
```

## Deduplicazione Voli

La deduplicazione dei voli e piu complessa perché uno stesso volo puo apparire in piu PDF con passeggeri diversi (ad esempio, due boarding pass per lo stesso volo). Invece di scartare il duplicato, il sistema **aggrega i passeggeri**.

### Algoritmo

1. **Identificazione volo** -- Un volo e identificato univocamente dalla combinazione di tre campi (tutti confrontati case-insensitive):
   - `bookingReference` (PNR)
   - `flightNumber`
   - `date`
2. **Verifica contro viaggio esistente** -- Se il volo esiste gia nel viaggio salvato:
   - Non viene duplicato il volo
   - Il passeggero viene aggregato (vedi sezione successiva)
   - Il flag `_needsPdfUpload = true` viene impostato sul volo esistente per collegare il nuovo PDF
3. **Verifica contro batch corrente** -- Se il volo esiste gia tra quelli estratti nel batch corrente:
   - Il passeggero viene aggregato al volo gia presente nel batch
   - Il flag `_needsPdfUpload = true` viene impostato
4. **Nessun match** -- Il volo viene aggiunto alla lista con l'array `passengers` inizializzato dal campo `passenger` singolare

## Aggregazione Passeggeri

L'aggregazione e il processo che unisce passeggeri diversi sullo stesso volo. Avviene quando la deduplicazione voli trova un match.

### Flusso

1. **Costruzione array `passengers`** -- Se il volo esistente ha solo il campo `passenger` (singolare) e non ha ancora un array `passengers`, il sistema costruisce l'array partendo dal passeggero singolo:
   ```js
   existingFlight.passengers = [{
     ...existingFlight.passenger,
     ticketNumber: existingFlight.passenger.ticketNumber
       || existingFlight.ticketNumber
       || null
   }];
   ```

2. **Verifica unicita** -- Prima di aggiungere il nuovo passeggero, il sistema controlla se e gia presente nell'array, verificando per:
   - `ticketNumber` (se presente su entrambi)
   - Nome del passeggero (confronto case-insensitive come fallback)

3. **Risultato**:
   - **Passeggero nuovo** → viene aggiunto all'array `passengers` con il suo `pdfPath`, e il flag `_needsPdfUpload = true` viene impostato
   - **Passeggero duplicato** → viene scartato e un contatore di skip viene incrementato

### Contatori di deduplicazione

Il processo restituisce contatori dettagliati per informare il frontend:

| Contatore | Significato |
|-----------|-------------|
| `addedFlights` | Voli completamente nuovi aggiunti |
| `addedHotels` | Hotel completamente nuovi aggiunti |
| `skippedFlights` | Voli duplicati scartati (passeggero gia presente) |
| `skippedHotels` | Hotel duplicati scartati |
| `aggregatedPassengers` | Passeggeri aggiunti a voli esistenti |

Questi contatori vengono mostrati all'utente in un messaggio riepilogativo dopo l'elaborazione.
