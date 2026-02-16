# Changelog

## 0.23 - 2026-02-16

### Nuove funzionalità
- **Città nelle card home**: le card dei viaggi in homepage mostrano le città visitate sotto il titolo, con icona pin bianca e testo bianco
- **Gestione città** (`manage-cities`): nuova funzione backend per salvare/aggiornare le città di un viaggio
- **Auto-compilazione città**: le città vengono derivate automaticamente da voli (arrivo) e hotel quando non impostate manualmente
- **Lookup DB città**: sia il backend che il frontend cercano corrispondenze nel database città (`data/cities.json`) per arricchire con paese, coordinate

### Miglioramenti
- Normalizzazione Title Case per i nomi delle città (mai tutto maiuscolo o minuscolo)
- Supporto robusto per formati legacy (stringhe) e moderni (oggetti con `name`, `country`, `lat`, `lng`)
- Il frontend "Compila da voli e hotel" ora arricchisce le città con paese e coordinate dal DB
