/**
 * Update Preview — Modulo per visualizzare il confronto tra prenotazioni
 * esistenti e aggiornamenti rilevati durante l'add-booking.
 *
 * Mostra le differenze campo per campo e permette all'utente di
 * accettare o rifiutare ogni singolo aggiornamento.
 */

const updatePreview = {
  _selectedUpdates: new Set(),

  /**
   * Renderizza la preview degli aggiornamenti rilevati.
   * @param {HTMLElement} container - Il container del modale
   * @param {Array} updates - Array di { type, existingId, existing, incoming, changes, pdfIndex }
   * @param {Object|null} pendingNew - Booking nuovi da salvare { flights: [], hotels: [], ... }
   * @param {Object} callbacks - { onConfirm(selectedUpdates, pendingNew), onCancel() }
   */
  render(container, updates, pendingNew, { onConfirm, onCancel }, tripData) {
    this._selectedUpdates = new Set(updates.map((_, i) => i));

    const typeLabels = {
      flight: 'Volo',
      hotel: 'Hotel',
      train: 'Treno',
      bus: 'Bus'
    };

    const typeIcons = {
      flight: 'travel',
      hotel: 'bed',
      train: 'train',
      bus: 'directions_bus'
    };

    let html = `<div class="update-preview">`;

    // Header
    html += `<div class="update-preview-header">`;
    html += `<div class="update-preview-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color, #e67e22)" stroke-width="2">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    </div>`;
    html += `<div>`;
    html += `<div class="update-preview-title">${this._t('trip.updateDetected', 'Aggiornamenti rilevati')}</div>`;
    html += `<div class="update-preview-subtitle">${this._t('trip.updateDetectedMessage', 'Alcune prenotazioni risultano aggiornate rispetto a quelle esistenti.')}</div>`;
    html += `</div>`;
    html += `</div>`;

    // Card per ogni aggiornamento
    updates.forEach((update, idx) => {
      const { type, existing, incoming, changes } = update;
      const label = typeLabels[type] || type;
      const title = this._buildTitle(type, existing, incoming);

      html += `<div class="update-card${this._selectedUpdates.has(idx) ? ' selected' : ''}" data-update-index="${idx}">`;

      // Header card con checkbox
      html += `<div class="update-card-header">`;
      html += `<label class="update-toggle">`;
      html += `<input type="checkbox" data-update-idx="${idx}" ${this._selectedUpdates.has(idx) ? 'checked' : ''}>`;
      html += `<span class="update-toggle-label">${this._t('trip.updateToggle', 'Aggiorna')}</span>`;
      html += `</label>`;
      html += `<div class="update-card-type">`;
      html += `<span class="material-symbols-outlined update-card-icon">${typeIcons[type] || 'receipt'}</span>`;
      html += `<span>${label}</span>`;
      html += `</div>`;
      html += `<div class="update-card-title">${this._esc(title)}</div>`;
      html += `</div>`;

      // Info passeggeri per voli multi-passeggero
      if (type === 'flight' && existing.passengers && existing.passengers.length > 1) {
        const incomingName = (incoming.passenger?.name || incoming.passengers?.[0]?.name || '').trim();
        const allNames = existing.passengers.map(p => p.name || '?');
        const paxLabel = this._t('trip.updatePassengersAffected', 'Dati volo aggiornati per tutti i passeggeri');
        html += `<div class="update-passengers-info">`;
        html += `<div class="update-passengers-label">${paxLabel}</div>`;
        html += `<div class="update-passengers-list">`;
        html += allNames.map(name => {
          const isMatched = incomingName && this._namesMatch(name, incomingName);
          if (isMatched) {
            return `<span class="update-passenger-chip matched">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ${this._esc(name)}</span>`;
          }
          return `<span class="update-passenger-chip">${this._esc(name)}</span>`;
        }).join('');
        html += `</div>`;
        html += `</div>`;
      }

      // Tabella differenze
      html += `<div class="update-diff-table">`;
      for (const change of changes) {
        const oldDisplay = this._formatValue(change.field, change.oldValue);
        const newDisplay = this._formatValue(change.field, change.newValue);

        html += `<div class="update-diff-row">`;
        html += `<span class="update-diff-label">${this._esc(change.label)}</span>`;
        html += `<span class="update-diff-old">${this._esc(oldDisplay)}</span>`;
        html += `<span class="update-diff-arrow">→</span>`;
        html += `<span class="update-diff-new">${this._esc(newDisplay)}</span>`;
        html += `</div>`;
      }
      html += `</div>`;

      html += `</div>`;
    });

    // Riepilogo nuovi booking (se presenti)
    if (pendingNew) {
      const newCounts = [];
      if (pendingNew.flights?.length) newCounts.push(`${pendingNew.flights.length} ${pendingNew.flights.length === 1 ? 'volo' : 'voli'}`);
      if (pendingNew.hotels?.length) newCounts.push(`${pendingNew.hotels.length} hotel`);
      if (pendingNew.trains?.length) newCounts.push(`${pendingNew.trains.length} ${pendingNew.trains.length === 1 ? 'treno' : 'treni'}`);
      if (pendingNew.buses?.length) newCounts.push(`${pendingNew.buses.length} bus`);

      if (newCounts.length > 0) {
        html += `<div class="update-new-summary">`;
        html += `<span class="update-new-label">${this._t('trip.updateNewBookings', 'Nuove prenotazioni da aggiungere')}:</span> `;
        html += `<span>${newCounts.join(', ')}</span>`;
        html += `</div>`;
      }
    }

    // Footer con azioni
    const hasMultiPax = updates.some(u =>
      u.type === 'flight' && u.existing.passengers && u.existing.passengers.length > 1
    );
    const confirmLabel = hasMultiPax
      ? this._t('trip.updateNext', 'Avanti')
      : this._t('trip.updateConfirm', 'Conferma aggiornamenti');
    html += `<div class="update-preview-footer">`;
    html += `<button class="btn btn-secondary update-cancel-btn">${window.i18n?.t('modal.cancel') || 'Annulla'}</button>`;
    html += `<button class="btn btn-primary update-confirm-btn">${confirmLabel}</button>`;
    html += `</div>`;

    html += `</div>`;

    container.innerHTML = html;

    // Event listeners
    container.querySelector('.update-confirm-btn').addEventListener('click', () => {
      const selected = updates.filter((_, i) => this._selectedUpdates.has(i));

      // Controlla se ci sono voli multi-passeggero tra quelli selezionati
      const multiPaxUpdates = selected.filter(u =>
        u.type === 'flight' && u.existing.passengers && u.existing.passengers.length > 1
      );

      if (multiPaxUpdates.length > 0) {
        // Mostra step 2: chiedi PDF per gli altri passeggeri
        this._renderPassengerPdfStep(container, selected, pendingNew, multiPaxUpdates, { onConfirm, onCancel }, tripData);
      } else {
        onConfirm(selected, pendingNew);
      }
    });

    container.querySelector('.update-cancel-btn').addEventListener('click', () => {
      onCancel();
    });

    // Checkbox toggle
    container.querySelectorAll('input[data-update-idx]').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.updateIdx);
        const card = container.querySelector(`.update-card[data-update-index="${idx}"]`);
        if (cb.checked) {
          this._selectedUpdates.add(idx);
          card?.classList.add('selected');
        } else {
          this._selectedUpdates.delete(idx);
          card?.classList.remove('selected');
        }
        // Aggiorna stato bottone conferma
        const confirmBtn = container.querySelector('.update-confirm-btn');
        if (confirmBtn) {
          const hasSelected = this._selectedUpdates.size > 0 || pendingNew;
          confirmBtn.disabled = !hasSelected;
        }
      });
    });
  },

  /**
   * Costruisce il titolo della card in base al tipo di booking
   */
  _buildTitle(type, existing, incoming) {
    switch (type) {
      case 'flight': {
        const num = existing.flightNumber || incoming.flightNumber || '';
        const ref = existing.bookingReference || incoming.bookingReference || '';
        return num ? `${num}${ref ? ' — ' + ref : ''}` : ref || '';
      }
      case 'hotel': {
        return existing.name || incoming.name || '';
      }
      case 'train': {
        const num = existing.trainNumber || incoming.trainNumber || '';
        const ref = existing.bookingReference || incoming.bookingReference || '';
        return num ? `${num}${ref ? ' — ' + ref : ''}` : ref || '';
      }
      case 'bus': {
        const op = existing.operator || incoming.operator || '';
        const route = existing.routeNumber || incoming.routeNumber || '';
        return op ? `${op}${route ? ' — ' + route : ''}` : route || '';
      }
      default:
        return '';
    }
  },

  /**
   * Formatta un valore per la visualizzazione
   */
  _formatValue(field, value) {
    if (value == null || value === '') return '—';

    // Date in formato leggibile
    if (field.includes('date') || field === 'checkIn.date' || field === 'checkOut.date') {
      return this._fmtDate(value) || String(value);
    }

    return String(value);
  },

  _fmtDate(str) {
    if (!str) return null;
    try {
      const d = new Date(str + 'T00:00:00');
      if (isNaN(d)) return str;
      const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return str;
    }
  },

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  /**
   * Step 2: Chiede i PDF aggiornati per gli altri passeggeri.
   * Raggruppa per NOME passeggero (1 PDF = 1 passeggero = tutti i suoi voli).
   */
  _renderPassengerPdfStep(container, selectedUpdates, pendingNew, multiPaxUpdates, { onConfirm, onCancel }, tripData) {
    // Raccogli nomi unici dei passeggeri, con i loro indici per TUTTI i voli
    // con lo stesso bookingReference (non solo quelli aggiornati)
    const paxMap = new Map(); // normName → { name, entries: [{ existingId, passengerIdx }] }

    // Raccogli tutti i bookingReference coinvolti negli aggiornamenti
    const updatedBookingRefs = new Set();
    for (const update of multiPaxUpdates) {
      const ref = (update.existing.bookingReference || '').toLowerCase().trim();
      if (ref) updatedBookingRefs.add(ref);
    }

    // Trova TUTTI i voli con quegli stessi bookingReference (anche quelli non aggiornati)
    const allFlights = tripData?.flights || [];
    const allRelatedFlights = allFlights.filter(f => {
      const ref = (f.bookingReference || '').toLowerCase().trim();
      return ref && updatedBookingRefs.has(ref) && f.passengers && f.passengers.length > 1;
    });

    // Nome del passeggero coperto dal PDF principale (quello già caricato)
    const incomingName = (multiPaxUpdates[0]?.incoming.passenger?.name || multiPaxUpdates[0]?.incoming.passengers?.[0]?.name || '').trim();

    for (const flight of allRelatedFlights) {
      flight.passengers.forEach((p, pIdx) => {
        if (this._namesMatch(p.name, incomingName)) return; // già coperto dal PDF principale

        const pKey = this._normName(p.name);
        if (!paxMap.has(pKey)) {
          paxMap.set(pKey, { name: p.name || '?', entries: [] });
        }
        // Evita duplicati (stesso volo già aggiunto)
        const entries = paxMap.get(pKey).entries;
        if (!entries.some(e => e.existingId === flight.id)) {
          entries.push({
            existingId: flight.id,
            passengerIdx: pIdx
          });
        }
      });
    }

    const uniquePax = [...paxMap.values()];

    if (uniquePax.length === 0) {
      onConfirm(selectedUpdates, pendingNew);
      return;
    }

    let html = `<div class="update-preview">`;
    html += `<div class="update-preview-header">`;
    html += `<div class="update-preview-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #2563eb)" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    </div>`;
    html += `<div>`;
    html += `<div class="update-preview-title">${this._t('trip.updateOtherPdfs', 'Ricevute altri passeggeri')}</div>`;
    html += `<div class="update-preview-subtitle">${this._t('trip.updateOtherPdfsMessage', 'Se hai le ricevute aggiornate anche per gli altri passeggeri, puoi caricarle qui. È facoltativo: puoi procedere anche senza.')}</div>`;
    html += `</div></div>`;

    // Lista passeggeri unici con upload (drag & drop + click)
    html += `<div class="update-pax-upload-list">`;
    uniquePax.forEach((pax, i) => {
      html += `<div class="update-pax-upload-row" data-pax-idx="${i}" data-pax-drop="${i}">`;
      html += `<input type="file" accept="application/pdf" data-pax-upload="${i}" hidden>`;
      html += `<span class="update-pax-name">${this._esc(pax.name)}</span>`;
      html += `<span class="update-pax-upload-label" data-pax-label="${i}">${this._t('trip.uploadPdf', 'Carica PDF')}</span>`;
      html += `</div>`;
    });
    html += `</div>`;

    // Footer
    html += `<div class="update-preview-footer">`;
    html += `<button class="btn btn-secondary update-pax-cancel-btn">${this._t('trip.cancel', 'Annulla')}</button>`;
    html += `<button class="btn btn-primary update-pax-confirm-btn">${this._t('trip.updateConfirm', 'Conferma aggiornamenti')}</button>`;
    html += `</div>`;
    html += `</div>`;

    container.innerHTML = html;

    // File upload state
    const uploadedFiles = new Map(); // paxIdx → File
    const uploadedFingerprints = new Map(); // "name+size" → paxIdx (per duplicati)

    const handleFile = (idx, file) => {
      if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;

      // Controlla duplicati: stesso file (nome + dimensione) già caricato per un altro passeggero
      const fingerprint = `${file.name}:${file.size}`;
      const existingIdx = uploadedFingerprints.get(fingerprint);
      if (existingIdx !== undefined && existingIdx !== idx) {
        const existingName = uniquePax[existingIdx]?.name || '?';
        const msg = this._t('trip.updateDuplicatePdf', 'Questo file è già stato caricato per') + ` ${existingName}`;
        if (window.utils?.showToast) window.utils.showToast(msg, 'warning');
        return;
      }

      // Rimuovi vecchio fingerprint se sta sostituendo
      const oldFile = uploadedFiles.get(idx);
      if (oldFile) {
        uploadedFingerprints.delete(`${oldFile.name}:${oldFile.size}`);
      }

      uploadedFiles.set(idx, file);
      uploadedFingerprints.set(fingerprint, idx);

      const row = container.querySelector(`[data-pax-idx="${idx}"]`);
      const label = container.querySelector(`[data-pax-label="${idx}"]`);
      if (label) {
        // Tronca il nome file se troppo lungo
        const maxLen = 35;
        const name = file.name;
        label.textContent = name.length > maxLen ? name.slice(0, maxLen - 3) + '…' : name;
        label.title = name;
      }
      row?.classList.add('has-file');
    };

    // Click + drag & drop su tutta la riga
    container.querySelectorAll('.update-pax-upload-row[data-pax-drop]').forEach(row => {
      const idx = parseInt(row.dataset.paxDrop);
      const input = row.querySelector('input[type="file"]');

      row.addEventListener('click', () => input.click());
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('change', () => {
        if (input.files[0]) handleFile(idx, input.files[0]);
      });

      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('dragover'); });
      row.addEventListener('dragleave', () => row.classList.remove('dragover'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(idx, file);
      });
    });

    const doConfirm = () => {
      // Per ogni passeggero, genera gli extraPdfs per TUTTI i suoi voli
      const allExtraPdfs = [];
      uniquePax.forEach((pax, i) => {
        const file = uploadedFiles.get(i) || null;
        // Lo stesso file va a tutti i voli di questo passeggero
        for (const entry of pax.entries) {
          allExtraPdfs.push({
            existingId: entry.existingId,
            passengerIdx: entry.passengerIdx,
            name: pax.name,
            file
          });
        }
      });

      // Metti tutti gli extra PDF (inclusi voli non-update) nel primo update
      // Il backend li raccoglie da tutti gli update e li processa per existingId
      if (selectedUpdates.length > 0) {
        selectedUpdates[0].extraPassengerPdfs = allExtraPdfs;
      }

      onConfirm(selectedUpdates, pendingNew);
    };

    container.querySelector('.update-pax-cancel-btn').addEventListener('click', () => onCancel());
    container.querySelector('.update-pax-confirm-btn').addEventListener('click', doConfirm);
  },

  // Helper i18n: se t() restituisce la key stessa, usa il fallback
  _t(key, fallback) {
    const val = window.i18n?.t(key);
    if (!val || val === key) return fallback;
    return val;
  },

  // Confronto nomi robusto: rimuovi tutto tranne lettere e numeri
  _normName(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  _namesMatch(a, b) {
    return this._normName(a) === this._normName(b);
  }
};

/**
 * Rileva aggiornamenti confrontando i risultati del parsing con i booking esistenti.
 * Usato client-side per decidere se mostrare updatePreview o parsePreview.
 *
 * @param {Array} parsedResults - Risultati da parse-pdf
 * @param {Object} tripData - Dati del viaggio corrente (con flights, hotels, trains, buses)
 * @returns {{ hasUpdates: boolean, updates: Array, newBookings: Object }}
 */
updatePreview.detectUpdates = function(parsedResults, tripData) {
  const updates = [];
  const newFlights = [];
  const newHotels = [];
  const newTrains = [];
  const newBuses = [];

  const existingFlights = tripData.flights || [];
  const existingHotels = tripData.hotels || [];
  const existingTrains = tripData.trains || [];
  const existingBuses = tripData.buses || [];

  const norm = s => s?.toLowerCase()?.trim() || '';

  // Raccogli tutti i booking dai risultati parsati
  for (let prIdx = 0; prIdx < parsedResults.length; prIdx++) {
    const pr = parsedResults[prIdx];
    if (!pr.result) continue;

    // ── Voli ──
    if (pr.result.flights) {
      for (const flight of pr.result.flights) {
        const bookingRef = norm(flight.bookingReference);
        const flightNum = norm(flight.flightNumber);
        const flightDate = flight.date;

        // Match esatto (duplicato) → nessun update
        if (bookingRef && flightNum && flightDate) {
          const exactMatch = existingFlights.find(f =>
            norm(f.bookingReference) === bookingRef &&
            norm(f.flightNumber) === flightNum &&
            f.date === flightDate
          );
          if (exactMatch) continue; // duplicato, non update
        }

        // Soft match: bookingRef + flightNumber senza data
        if (bookingRef && flightNum) {
          const softMatch = existingFlights.find(f =>
            norm(f.bookingReference) === bookingRef &&
            norm(f.flightNumber) === flightNum
          );
          if (softMatch) {
            const changes = this._diffBooking(softMatch, flight, 'flight');
            if (changes.length > 0) {
              updates.push({
                type: 'flight',
                existingId: softMatch.id,
                existing: softMatch,
                incoming: flight,
                changes,
                pdfIndex: prIdx
              });
              continue;
            }
          }
        }
        newFlights.push(flight);
      }
    }

    // ── Hotel ──
    if (pr.result.hotels) {
      for (const hotel of pr.result.hotels) {
        const confirmNum = norm(hotel.confirmationNumber);
        const checkIn = hotel.checkIn?.date;
        const checkOut = hotel.checkOut?.date;

        // Match esatto: confirmationNumber + date
        if (confirmNum) {
          const exactMatch = existingHotels.find(h =>
            norm(h.confirmationNumber) === confirmNum &&
            h.checkIn?.date === checkIn &&
            h.checkOut?.date === checkOut
          );
          if (exactMatch) continue;

          // Soft match: solo confirmationNumber
          const softMatch = existingHotels.find(h =>
            norm(h.confirmationNumber) === confirmNum
          );
          if (softMatch) {
            const changes = this._diffBooking(softMatch, hotel, 'hotel');
            if (changes.length > 0) {
              updates.push({
                type: 'hotel',
                existingId: softMatch.id,
                existing: softMatch,
                incoming: hotel,
                changes,
                pdfIndex: prIdx
              });
              continue;
            }
          }
        }
        newHotels.push(hotel);
      }
    }

    // ── Treni ──
    if (pr.result.trains) {
      for (const train of pr.result.trains) {
        const trainNum = norm(train.trainNumber);
        const trainDate = train.date;
        const bookingRef = norm(train.bookingReference);

        // Match esatto
        if (trainNum && trainDate) {
          const exactMatch = existingTrains.find(t =>
            norm(t.trainNumber) === trainNum && t.date === trainDate
          );
          if (exactMatch) continue;
        }

        // Soft match
        let softMatch = null;
        if (trainNum) {
          softMatch = existingTrains.find(t => norm(t.trainNumber) === trainNum && t.date !== trainDate);
        }
        if (!softMatch && bookingRef) {
          softMatch = existingTrains.find(t => norm(t.bookingReference) === bookingRef && t.date !== trainDate);
        }
        if (softMatch) {
          const changes = this._diffBooking(softMatch, train, 'train');
          if (changes.length > 0) {
            updates.push({
              type: 'train',
              existingId: softMatch.id,
              existing: softMatch,
              incoming: train,
              changes,
              pdfIndex: prIdx
            });
            continue;
          }
        }
        newTrains.push(train);
      }
    }

    // ── Bus ──
    if (pr.result.buses) {
      for (const bus of pr.result.buses) {
        const routeNum = norm(bus.routeNumber);
        const busDate = bus.date;
        const bookingRef = norm(bus.bookingReference);

        if (routeNum && busDate) {
          const exactMatch = existingBuses.find(b =>
            norm(b.routeNumber) === routeNum && b.date === busDate
          );
          if (exactMatch) continue;
        }

        let softMatch = null;
        if (routeNum) {
          softMatch = existingBuses.find(b => norm(b.routeNumber) === routeNum && b.date !== busDate);
        }
        if (!softMatch && bookingRef) {
          softMatch = existingBuses.find(b => norm(b.bookingReference) === bookingRef && b.date !== busDate);
        }
        if (softMatch) {
          const changes = this._diffBooking(softMatch, bus, 'bus');
          if (changes.length > 0) {
            updates.push({
              type: 'bus',
              existingId: softMatch.id,
              existing: softMatch,
              incoming: bus,
              changes,
              pdfIndex: prIdx
            });
            continue;
          }
        }
        newBuses.push(bus);
      }
    }
  }

  const pendingNew = {};
  if (newFlights.length) pendingNew.flights = newFlights;
  if (newHotels.length) pendingNew.hotels = newHotels;
  if (newTrains.length) pendingNew.trains = newTrains;
  if (newBuses.length) pendingNew.buses = newBuses;

  return {
    hasUpdates: updates.length > 0,
    updates,
    pendingNew: Object.keys(pendingNew).length > 0 ? pendingNew : null
  };
};

/**
 * Confronta campi tra booking esistente e incoming per tipo.
 */
updatePreview._diffBooking = function(existing, incoming, type) {
  const fieldsByType = {
    flight: [
      { path: 'date', label: 'Data' },
      { path: 'departureTime', label: 'Ora partenza' },
      { path: 'arrivalTime', label: 'Ora arrivo' },
      { path: 'departure.code', label: 'Aeroporto partenza' },
      { path: 'departure.city', label: 'Città partenza' },
      { path: 'arrival.code', label: 'Aeroporto arrivo' },
      { path: 'arrival.city', label: 'Città arrivo' },
      { path: 'seat', label: 'Posto' },
      { path: 'class', label: 'Classe' },
      { path: 'status', label: 'Stato' },
    ],
    hotel: [
      { path: 'checkIn.date', label: 'Check-in' },
      { path: 'checkOut.date', label: 'Check-out' },
      { path: 'name', label: 'Nome hotel' },
      { path: 'roomType', label: 'Camera' },
      { path: 'guestName', label: 'Ospite' },
    ],
    train: [
      { path: 'date', label: 'Data' },
      { path: 'departure.time', label: 'Ora partenza' },
      { path: 'arrival.time', label: 'Ora arrivo' },
      { path: 'departure.station', label: 'Stazione partenza' },
      { path: 'arrival.station', label: 'Stazione arrivo' },
      { path: 'seat', label: 'Posto' },
      { path: 'coach', label: 'Carrozza' },
      { path: 'class', label: 'Classe' },
    ],
    bus: [
      { path: 'date', label: 'Data' },
      { path: 'departure.time', label: 'Ora partenza' },
      { path: 'arrival.time', label: 'Ora arrivo' },
      { path: 'departure.station', label: 'Fermata partenza' },
      { path: 'arrival.station', label: 'Fermata arrivo' },
      { path: 'seat', label: 'Posto' },
    ]
  };

  const fields = fieldsByType[type] || [];
  const changes = [];

  for (const { path, label } of fields) {
    const oldVal = this._getNestedValue(existing, path);
    const newVal = this._getNestedValue(incoming, path);
    if (newVal == null || newVal === '') continue;
    const oldNorm = typeof oldVal === 'string' ? oldVal.toLowerCase().trim() : oldVal;
    const newNorm = typeof newVal === 'string' ? newVal.toLowerCase().trim() : newVal;
    if (oldNorm !== newNorm) {
      changes.push({ field: path, label, oldValue: oldVal ?? null, newValue: newVal });
    }
  }
  return changes;
};

updatePreview._getNestedValue = function(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let val = obj;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
};

window.updatePreview = updatePreview;
