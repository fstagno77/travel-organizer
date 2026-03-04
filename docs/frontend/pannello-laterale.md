# Pannello Laterale

Il pannello laterale (slide panel) e il componente utilizzato per creare, visualizzare e modificare le attivita personalizzate. Si presenta come un pannello che scorre dentro lo schermo dal lato destro.

## Struttura

### Overlay

L'overlay di sfondo (`.slide-panel-overlay`) copre l'intera pagina:

- `position: fixed`
- `inset: 0` (copre tutto il viewport)
- `background: rgba(0, 0, 0, 0.5)` (nero semi-trasparente al 50%)
- `z-index` elevato per posizionarsi sopra tutti gli altri elementi

Cliccando sull'overlay si chiude il pannello.

### Pannello

Il pannello vero e proprio (`.slide-panel`) ha le seguenti caratteristiche:

- `position: fixed`
- `right: 0` (ancorato al bordo destro)
- **Desktop**: `width: 420px`
- **Mobile**: `width: 100%` (occupa tutto lo schermo)
- `height: 100vh` (altezza completa del viewport)
- `box-shadow: -10px 0 15px -3px rgba(0, 0, 0, 0.1)` (ombra verso sinistra)

### Animazione

Il pannello entra in scena con un'animazione di **slide da destra**: parte da una posizione fuori schermo (`translateX(100%)`) e scorre fino alla posizione finale (`translateX(0)`). La chiusura esegue l'animazione inversa.

## Tre modalita operative

Il pannello laterale opera in tre modalita distinte, ciascuna con un layout e un comportamento specifico.

### 1. Modalita creazione (Create)

Si attiva quando l'utente clicca sul pulsante "+ Attivita". Presenta un **form vuoto** con i seguenti campi:

| Campo | Obbligatorio | Dettagli |
|-------|:------------:|----------|
| Nome | Si | Testo libero, massimo 100 caratteri |
| Data | Si | Selettore data |
| Ora inizio | No | Selettore orario |
| Ora fine | No | Selettore orario |
| Descrizione | No | Testo libero multiriga |
| Categoria | No | Selezione tra le categorie disponibili |
| Indirizzo | No | Testo libero |
| URL | No | Uno o piu link, aggiungibili dinamicamente |
| Allegati | No | Upload file, massimo 5 per attivita |

#### Upload allegati

- **Limite per file**: 10 MB
- **Limite per attivita**: massimo 5 allegati
- **Tipi consentiti**: PDF, JPEG, PNG, GIF, WebP
- I file vengono caricati nel bucket Supabase Storage `activity-files`

Il salvataggio avviene tramite la funzione `manage-activity` con `action: create`.

### 2. Modalita visualizzazione (View)

Si attiva quando l'utente clicca su una card di attivita custom nella timeline. Presenta tutti i campi in **formato di sola lettura**:

- Il **nome** dell'attivita come titolo del pannello
- **Data e orari** formattati
- **Descrizione** completa
- **Categoria** con icona e colore corrispondente
- **Indirizzo** (se presente)
- **URL cliccabili**: ogni link e attivo e si apre in una nuova scheda
- **Allegati scaricabili**: ogni allegato mostra il nome del file con un link per il download tramite URL firmato

In fondo al pannello sono presenti due pulsanti:

- **"Modifica"**: passa alla modalita edit mantenendo il pannello aperto
- **"Elimina"**: richiede una conferma prima di procedere con l'eliminazione dell'attivita e dei relativi allegati

### 3. Modalita modifica (Edit)

Si attiva dal pulsante "Modifica" nella modalita view. Presenta un **form precompilato** con i dati esistenti dell'attivita, identico nel layout alla modalita creazione ma con i valori gia inseriti.

Funzionalita specifiche della modalita modifica:

- **Rimozione allegati esistenti**: ogni allegato mostra un pulsante per rimuoverlo. La rimozione elimina il file dal bucket storage
- **Aggiunta nuovi allegati**: e possibile caricare nuovi file, rispettando il **limite complessivo di 5 allegati** (esistenti + nuovi)
- **Modifica di tutti i campi**: nome, data, orari, descrizione, categoria, indirizzo e URL sono tutti editabili

Il salvataggio avviene tramite la funzione `manage-activity` con `action: update`.
