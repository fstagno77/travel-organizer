# Gestione Passeggeri

Il sistema supporta voli con piu passeggeri, gestiti attraverso un modello duale che nasce dalla natura del parsing PDF (un documento = un passeggero) e si estende con l'aggregazione progressiva.

## Modello duale

Ogni volo nel sistema puo avere i dati passeggero in due formati coesistenti:

```
flight.passenger   (oggetto singolare)  ← dal parsing Claude (un PDF = un passeggero)
flight.passengers  (array di oggetti)   ← aggregato da piu PDF dello stesso volo
```

| Campo | Tipo | Origine | Uso |
|-------|------|---------|-----|
| `flight.passenger` | Oggetto | Parsing diretto del PDF | Vista singolo passeggero nel frontend |
| `flight.passengers` | Array | Aggregazione da piu PDF | Vista multi-passeggero nel frontend |

Il frontend utilizza `flight.passengers` quando disponibile, altrimenti ricade su `flight.passenger` per retrocompatibilita con voli importati prima dell'introduzione del supporto multi-passeggero.

## Aggiunta passeggero

L'aggiunta di un nuovo passeggero a un volo esistente avviene tramite `add-booking.js` quando l'utente carica un PDF di un altro passeggero per lo stesso volo.

### Flusso

1. **Parsing PDF** -- Claude analizza il documento ed estrae `flight.passenger` con il nome del nuovo passeggero
2. **Deduplicazione** -- Il sistema trova il volo esistente confrontando `bookingReference` + `flightNumber` + `date`
3. **Costruzione array** -- Se `flight.passengers` non esiste ancora, viene costruito dal `flight.passenger` singolo del volo esistente
4. **Verifica unicita** -- Il sistema controlla che il nuovo passeggero non sia gia presente, confrontando per `ticketNumber` o per nome
5. **Inserimento** -- Il nuovo passeggero viene aggiunto all'array con il proprio `pdfPath` che punta al PDF sorgente

### Campo `ticketNumber`

Il `ticketNumber` e un dato critico che esiste a tre livelli nel modello dati:

| Livello | Campo | Esempio |
|---------|-------|---------|
| Volo | `flight.ticketNumber` | `055-1234567890` |
| Passeggero singolare | `flight.passenger.ticketNumber` | `055-1234567890` |
| Passeggero in array | `passengers[n].ticketNumber` | `055-1234567890` |

Il frontend mostra `flight.ticketNumber` nella vista singolo passeggero e `passengers[n].ticketNumber` nella vista multi-passeggero.

### Backfill ticketNumber

Un pattern critico (corretto il 2026-02-07) riguarda il backfill del `ticketNumber`. Quando l'array `passengers` viene costruito dal campo `passenger` singolare, o quando entry esistenti mancano del ticketNumber, il sistema applica un fallback a cascata:

```js
{
  ...flight.passenger,
  ticketNumber: flight.passenger.ticketNumber
    || flight.ticketNumber
    || null
}
```

Questo garantisce che il ticketNumber venga propagato dal livello volo al livello passeggero anche quando Claude non lo estrae direttamente nel campo `passenger`.

Analogamente, per i passeggeri gia presenti nell'array `passengers` che mancano di `ticketNumber`, il sistema esegue un backfill dal ticketNumber a livello di volo:

```js
flight.passengers = flight.passengers.map(p => ({
  ...p,
  ticketNumber: p.ticketNumber || flight.ticketNumber || null
}));
```

## Eliminazione passeggero

L'eliminazione di un passeggero da un volo avviene tramite la funzione `delete-passenger.js`.

### Parametri di input

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `bookingReference` | String | PNR o codice prenotazione del volo |
| `passengerName` | String | Nome completo del passeggero da rimuovere |

### Flusso

1. **Ricerca voli** -- Trova tutti i voli nel viaggio con il `bookingReference` specificato (uno stesso PNR puo coprire piu segmenti di volo)
2. **Rimozione passeggero** -- Per ogni volo trovato, rimuove il passeggero dall'array `flight.passengers` confrontando il nome
3. **Raccolta PDF** -- Identifica i path unici dei PDF associati al passeggero rimosso, che dovranno essere eliminati dallo storage
4. **Verifica volo vuoto** -- Se dopo la rimozione `flight.passengers` risulta vuoto (nessun passeggero rimasto), l'intero volo viene eliminato dal viaggio
5. **Ricalcolo date** -- Chiama `updateTripDates()` per aggiornare `startDate` e `endDate` del viaggio, che potrebbero cambiare se il volo eliminato definiva i confini temporali
6. **Eliminazione PDF** -- I file PDF associati al passeggero vengono eliminati dallo storage Supabase. Questa operazione e **best effort**: un fallimento nell'eliminazione dei file non blocca il completamento dell'operazione
7. **Salvataggio** -- Il viaggio aggiornato viene salvato nel database

### Effetti collaterali

L'eliminazione di un passeggero puo avere effetti a cascata:

- Se era l'ultimo passeggero del volo → il volo viene eliminato
- Se il volo eliminato definiva `startDate` o `endDate` → le date del viaggio cambiano
- Se il volo eliminato era parte della rotta → la rotta viene ricalcolata
