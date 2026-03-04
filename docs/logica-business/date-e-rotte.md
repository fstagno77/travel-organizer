# Date e Rotte

Il sistema ricalcola automaticamente le date di inizio/fine viaggio e la rotta (sequenza di aeroporti) ogni volta che i dati del viaggio vengono modificati. Questo garantisce che le informazioni di sintesi siano sempre coerenti con le prenotazioni effettive.

## Calcolo automatico delle date

La funzione `updateTripDates(tripData)` determina `startDate` e `endDate` del viaggio analizzando tutte le date presenti nelle prenotazioni.

### Fonti delle date

| Fonte | Campo | Esempio |
|-------|-------|---------|
| Voli | `flight.date` | `2026-03-15` |
| Hotel (check-in) | `hotel.checkIn.date` | `2026-03-15` |
| Hotel (check-out) | `hotel.checkOut.date` | `2026-03-22` |

### Algoritmo

1. Raccoglie tutte le date dai voli e dagli hotel del viaggio
2. Ordina le date in ordine crescente
3. Assegna la data piu vecchia a `tripData.startDate`
4. Assegna la data piu recente a `tripData.endDate`

```
Volo andata:    2026-03-15
Hotel check-in: 2026-03-15
Hotel check-out: 2026-03-22
Volo ritorno:   2026-03-22

→ startDate = 2026-03-15
→ endDate   = 2026-03-22
```

Se il viaggio non contiene prenotazioni con date valide, `startDate` e `endDate` rimangono invariati.

## Calcolo della rotta

La rotta del viaggio e una stringa sintetica che rappresenta la sequenza di aeroporti toccati, visualizzata nella card del viaggio in dashboard.

### Formato

```
partenza[0] → arrivo[0] → arrivo[1] → ... → arrivo[N]
```

La rotta e costruita concatenando:
1. Il codice aeroporto di **partenza del primo volo**
2. I codici aeroporto di **arrivo di ogni volo**, nell'ordine in cui appaiono

### Esempi

| Voli | Rotta generata |
|------|---------------|
| FCO→NRT, NRT→KIX, KIX→FCO | `FCO → NRT → KIX → FCO` |
| MXP→JFK, JFK→LAX, LAX→MXP | `MXP → JFK → LAX → MXP` |
| FCO→CDG | `FCO → CDG` |

La rotta viene aggiornata automaticamente insieme alle date e riflette sempre lo stato attuale dei voli nel viaggio.

## Quando avviene il ricalcolo

Il ricalcolo di date e rotta viene eseguito automaticamente in quattro scenari:

| Operazione | Funzione | Motivo |
|------------|----------|--------|
| Aggiunta prenotazione | `add-booking.js` | Nuovi voli/hotel possono estendere le date o modificare la rotta |
| Eliminazione passeggero | `delete-passenger.js` | La rimozione dell'ultimo passeggero di un volo elimina il volo, che potrebbe definire i confini temporali o essere parte della rotta |
| Eliminazione prenotazione | `delete-booking.js` | L'eliminazione di un singolo volo o hotel puo modificare date e rotta |
| Modifica prenotazione | `edit-booking.js` | La modifica delle date di un volo o hotel puo spostare i confini temporali |

### Ordine delle operazioni

In tutti i casi, il ricalcolo segue lo stesso ordine:

1. Applicazione della modifica ai dati del viaggio (aggiunta, rimozione, modifica)
2. Chiamata a `updateTripDates()` per ricalcolare `startDate` e `endDate`
3. Ricalcolo della rotta dalla lista aggiornata dei voli
4. Salvataggio del viaggio aggiornato nel database

Questo ordine garantisce che il salvataggio avvenga sempre con dati coerenti e aggiornati.
