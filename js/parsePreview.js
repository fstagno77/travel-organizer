/**
 * Parse Preview — Shared module for rendering SmartParse extraction results
 * Used by tripCreator.js (new trip) and tripPage.js (add booking)
 */

const parsePreview = {
  _feedback: null, // 'up' | 'down' | null
  _editing: false,
  _parsedResults: null,
  _editedFields: [], // ['flight[0].flightNumber', 'hotel[0].checkIn', ...]
  _activeSegment: 0,
  _segments: [], // { type: 'flight'|'hotel'|'train'|'bus', index, label, icon }

  /**
   * Render extraction preview into a container element.
   * @param {HTMLElement} container - The modal body element
   * @param {Array} parsedResults - Array from parse-pdf endpoint
   * @param {Object} options - { onConfirm(feedback, parsedResults), onCancel() }
   */
  render(container, parsedResults, { onConfirm, onCancel }) {
    this._feedback = null;
    this._editing = false;
    this._parsedResults = parsedResults;
    this._editedFields = [];
    this._activeSegment = 0;

    const allFlights = [];
    const allHotels = [];
    const allTrains = [];
    const allBuses = [];
    const allRentals = [];
    const allFerries = [];
    const allPassengers = []; // array passeggeri a livello prenotazione (multi-pax)
    let passenger = null;
    let booking = null;

    for (const pr of parsedResults) {
      if (!pr.result) continue;
      if (pr.result.flights) allFlights.push(...pr.result.flights);
      if (pr.result.hotels) allHotels.push(...pr.result.hotels);
      if (pr.result.trains) allTrains.push(...pr.result.trains);
      if (pr.result.buses) allBuses.push(...pr.result.buses);
      if (pr.result.rentals) allRentals.push(...pr.result.rentals);
      if (pr.result.ferries) allFerries.push(...pr.result.ferries);
      if (pr.result.passengers?.length) allPassengers.push(...pr.result.passengers);
      if (pr.result.passenger && !passenger) passenger = pr.result.passenger;
      if (pr.result.booking && !booking) booking = pr.result.booking;
    }

    // Build segments list
    this._segments = [];
    allFlights.forEach((f, i) => {
      const dep = f.departure?.code || '?';
      const arr = f.arrival?.code || '?';
      this._segments.push({ type: 'flight', index: i, label: `${dep}→${arr}`, icon: 'flight' });
    });
    allHotels.forEach((h, i) => {
      const name = h.name || 'Hotel';
      const short = name.length > 16 ? name.substring(0, 14) + '…' : name;
      this._segments.push({ type: 'hotel', index: i, label: short, icon: 'hotel' });
    });
    allTrains.forEach((t, i) => {
      const dep = t.departure?.station || t.departure?.city || '?';
      const arr = t.arrival?.station || t.arrival?.city || '?';
      const short = s => s.length > 10 ? s.substring(0, 8) + '…' : s;
      this._segments.push({ type: 'train', index: i, label: `${short(dep)}→${short(arr)}`, icon: 'train' });
    });
    allBuses.forEach((b, i) => {
      const dep = b.departure?.station || b.departure?.city || '?';
      const arr = b.arrival?.station || b.arrival?.city || '?';
      const short = s => s.length > 10 ? s.substring(0, 8) + '…' : s;
      this._segments.push({ type: 'bus', index: i, label: `${short(dep)}→${short(arr)}`, icon: 'directions_bus' });
    });
    allRentals.forEach((r, i) => {
      const provider = r.provider || 'Auto';
      const short = provider.length > 12 ? provider.substring(0, 10) + '…' : provider;
      this._segments.push({ type: 'rental', index: i, label: short, icon: 'directions_car' });
    });
    allFerries.forEach((f, i) => {
      const dep = f.departure?.port || f.departure?.city || '?';
      const arr = f.arrival?.port || f.arrival?.city || '?';
      this._segments.push({ type: 'ferry', index: i, label: `${dep}→${arr}`, icon: 'directions_boat' });
    });

    const totalItems = this._segments.length;

    let html = `<div class="parse-preview">`;

    // ── Booking (top, above segmented) ──
    if (booking) {
      html += `<div class="parse-preview-booking">`;
      html += `<div class="parse-section-header"><span>Prenotazione</span></div>`;
      html += `<div class="parse-detail-grid">`;
      html += this._field('PNR', booking.reference || booking.bookingReference, 'booking.reference');
      html += this._field('Biglietto', booking.ticketNumber, 'booking.ticketNumber');
      html += this._field('Data emissione', this._fmtDate(booking.issueDate), 'booking.issueDate', 'date', booking.issueDate);
      html += this._field('Importo', this._resolvePrice(booking.totalAmount), 'booking.totalAmount');
      html += `</div></div>`;
    }

    // ── Passenger (top, solo se nessun tipo di trasporto ha il campo passeggero) ──
    if (passenger && allFlights.length === 0 && allTrains.length === 0 && allBuses.length === 0 && allFerries.length === 0) {
      html += `<div class="parse-preview-booking">`;
      html += `<div class="parse-section-header"><span>Passeggero</span></div>`;
      html += `<div class="parse-detail-grid">`;
      html += this._field('Nome', passenger.name, 'passenger.name');
      html += this._field('Tipo', passenger.type, 'passenger.type');
      html += this._field('Biglietto', passenger.ticketNumber, 'passenger.ticketNumber');
      html += `</div></div>`;
    }

    // ── Segmented control (only if >1 item) ──
    if (totalItems > 1) {
      html += `<div class="parse-segmented">`;
      this._segments.forEach((seg, i) => {
        html += `<button class="parse-segment-btn${i === 0 ? ' active' : ''}" data-segment="${i}">
          ${this._esc(seg.label)}
        </button>`;
      });
      html += `</div>`;
    }

    // ── Content panels ──
    html += `<div class="parse-panels">`;

    allFlights.forEach((f, i) => {
      const segIdx = i; // flights come first in segments
      const depCode = f.departure?.code || '?';
      const arrCode = f.arrival?.code || '?';
      const depCity = f.departure?.city || '';
      const arrCity = f.arrival?.city || '';
      const depTime = f.departureTime || '';
      const arrTime = f.arrivalTime || '';

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-flight-card" data-type="flight" data-index="${i}">`;
      html += `<div class="parse-flight-route">
        <div class="parse-flight-endpoint">
          <span class="parse-flight-code">${this._esc(depCode)}</span>
          <span class="parse-flight-city">${this._esc(depCity)}</span>
          ${depTime ? `<span class="parse-flight-time">${this._esc(depTime)}</span>` : ''}
        </div>
        <div class="parse-flight-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="parse-flight-endpoint">
          <span class="parse-flight-code">${this._esc(arrCode)}</span>
          <span class="parse-flight-city">${this._esc(arrCity)}</span>
          ${arrTime ? `<span class="parse-flight-time">${this._esc(arrTime)}</span>` : ''}
        </div>
      </div>`;

      // f.passenger può essere stringa (email) o oggetto {name, ticketNumber} (PDF)
      const passengerName = typeof f.passenger === 'object' ? f.passenger?.name : (f.passenger || null);
      const passengerTicket = typeof f.passenger === 'object' ? f.passenger?.ticketNumber : null;
      // Posto: usa f.seat, altrimenti il posto del passeggero corrispondente nell'array
      const matchPax = allPassengers.find(p => p.name && passengerName && p.name.toUpperCase() === passengerName.toUpperCase());
      const seatDisplay = f.seat || matchPax?.seat || null;

      html += `<div class="parse-detail-grid">`;
      html += this._field('Volo', f.flightNumber, 'flightNumber');
      html += this._field('Compagnia', f.airline, 'airline');
      html += this._field('Data', this._fmtDate(f.date), 'date', 'date', f.date);
      html += this._field('Classe', f.class, 'class');
      html += this._field('Passeggero', passengerName, 'passenger.name');
      html += this._field('PNR', f.bookingReference, 'bookingReference');
      html += this._field('Biglietto', f.ticketNumber || passengerTicket, 'ticketNumber');
      html += this._field('Posto', seatDisplay, 'seat');
      html += this._field('Bagaglio', this._resolveBaggage(f.baggage), 'baggage');
      html += this._field('Stato', f.status, 'status');
      html += `</div>`;

      // Tabella multi-passeggero (solo se >1 passeggero nell'array booking)
      if (allPassengers.length > 1) {
        html += `<div class="parse-section-header" style="margin-top:14px"><span>Passeggeri (${allPassengers.length})</span></div>`;
        html += `<table style="width:100%;border-collapse:collapse;margin-top:4px">`;
        html += `<thead><tr>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Nome</th>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Tipo</th>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Posto</th>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Biglietto</th>
        </tr></thead><tbody>`;
        for (const p of allPassengers) {
          html += `<tr>
            <td style="padding:8px 0;font-size:13px">${this._esc(p.name || '—')}</td>
            <td style="padding:8px 0;font-size:12px;color:var(--text-secondary)">${this._esc(p.type || '—')}</td>
            <td style="padding:8px 0;font-size:13px">${this._esc(p.seat || '—')}</td>
            <td style="padding:8px 0;font-size:12px;color:var(--text-secondary)">${this._esc(p.ticketNumber || '—')}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
      }

      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="flight" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `</div>`;

      html += `</div>`;
      html += `</div>`;
    });

    allHotels.forEach((h, i) => {
      const segIdx = allFlights.length + i;
      // Use the new structured form sections (same as manual booking and edit panel)
      const formSectionsHtml = (window.tripHotels && window.tripHotels.buildFormSections)
        ? window.tripHotels.buildFormSections(h, true)
        : ''; // fallback: empty — tripHotels must be loaded first

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-hotel-card parse-hotel-card--form" data-type="hotel" data-index="${i}">`;
      html += `<div class="edit-booking-form parse-hotel-form-sections">${formSectionsHtml}</div>`;
      html += `</div>`;
      html += `</div>`;
    });

    allTrains.forEach((t, i) => {
      const segIdx = allFlights.length + allHotels.length + i;
      const depStation = t.departure?.station || t.departure?.city || '?';
      const arrStation = t.arrival?.station || t.arrival?.city || '?';
      const depTime = t.departure?.time || '';
      const arrTime = t.arrival?.time || '';

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-train-card" data-type="train" data-index="${i}">`;
      html += `<div class="parse-transport-route">
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(depStation)}</span>
          ${depTime ? `<span class="parse-transport-time">${this._esc(depTime)}</span>` : ''}
        </div>
        <div class="parse-transport-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(arrStation)}</span>
          ${arrTime ? `<span class="parse-transport-time">${this._esc(arrTime)}</span>` : ''}
        </div>
      </div>`;

      html += `<div class="parse-detail-grid">`;
      html += this._field('Treno', t.trainNumber, 'trainNumber');
      html += this._field('Operatore', t.operator, 'operator');
      html += this._field('Data', this._fmtDate(t.date), 'date', 'date', t.date);
      html += this._field('Classe', t.class, 'class');
      html += this._field('Passeggero', typeof t.passenger === 'object' ? t.passenger?.name : (t.passenger || null), 'passenger.name');
      html += this._field('PNR', t.bookingReference, 'bookingReference');
      html += this._field('Biglietto', t.ticketNumber, 'ticketNumber');
      html += this._field('Posto', t.seat, 'seat');
      html += this._field('Carrozza', t.coach, 'coach');
      html += this._field('Prezzo', this._resolvePrice(t.price), 'price');
      html += `</div>`;
      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="train" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
    });

    allBuses.forEach((b, i) => {
      const segIdx = allFlights.length + allHotels.length + allTrains.length + i;
      const depStation = b.departure?.station || b.departure?.city || '?';
      const arrStation = b.arrival?.station || b.arrival?.city || '?';
      const depTime = b.departure?.time || '';
      const arrTime = b.arrival?.time || '';

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-bus-card" data-type="bus" data-index="${i}">`;
      html += `<div class="parse-transport-route">
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(depStation)}</span>
          ${depTime ? `<span class="parse-transport-time">${this._esc(depTime)}</span>` : ''}
        </div>
        <div class="parse-transport-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(arrStation)}</span>
          ${arrTime ? `<span class="parse-transport-time">${this._esc(arrTime)}</span>` : ''}
        </div>
      </div>`;

      html += `<div class="parse-detail-grid">`;
      html += this._field('Operatore', b.operator, 'operator');
      html += this._field('Linea', b.routeNumber, 'routeNumber');
      html += this._field('Data', this._fmtDate(b.date), 'date', 'date', b.date);
      html += this._field('Passeggero', typeof b.passenger === 'object' ? b.passenger?.name : (b.passenger || null), 'passenger.name');
      html += this._field('PNR', b.bookingReference, 'bookingReference');
      html += this._field('Posto', b.seat, 'seat');
      html += this._field('Prezzo', this._resolvePrice(b.price), 'price');
      html += `</div>`;
      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="bus" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
    });

    allRentals.forEach((r, i) => {
      const segIdx = allFlights.length + allHotels.length + allTrains.length + allBuses.length + i;
      const pickupCityRaw = r.pickupLocation?.city || '?';
      const pickupAirport = r.pickupLocation?.airportCode;
      const pickupCity = pickupAirport ? `${pickupCityRaw} (${pickupAirport})` : pickupCityRaw;
      const dropoffCityRaw = r.dropoffLocation?.city || '?';
      const dropoffAirport = r.dropoffLocation?.airportCode;
      const dropoffCity = dropoffAirport ? `${dropoffCityRaw} (${dropoffAirport})` : dropoffCityRaw;
      const pickupTime = r.pickupLocation?.time || '';
      const dropoffTime = r.dropoffLocation?.time || '';
      const vehicle = [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(' ') || r.vehicle?.category || null;
      const price = r.price?.value != null ? `${r.price.value} ${r.price.currency || ''}`.trim() : null;

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-rental-card" data-type="rental" data-index="${i}">`;
      html += `<div class="parse-rental-provider">${this._esc(r.provider || 'Noleggio Auto')}</div>`;

      html += `<div class="parse-transport-route">
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(pickupCity)}</span>
          ${pickupTime ? `<span class="parse-transport-time">${this._esc(pickupTime)}</span>` : ''}
        </div>
        <div class="parse-transport-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(dropoffCity)}</span>
          ${dropoffTime ? `<span class="parse-transport-time">${this._esc(dropoffTime)}</span>` : ''}
        </div>
      </div>`;

      html += `<div class="parse-detail-grid">`;
      html += this._field('Ritiro', this._fmtDate(r.date), 'date', 'date', r.date);
      html += this._field('Riconsegna', this._fmtDate(r.endDate), 'endDate', 'date', r.endDate);
      html += this._field('Giorni', r.rentalDays, 'rentalDays', 'number');
      html += this._field('Veicolo', vehicle, 'vehicle.model');
      html += this._field('Categoria', r.vehicle?.category, 'vehicle.category');
      html += this._field('Conducente', r.driverName, 'driverName');
      html += this._field('Riferimento', r.bookingReference || r.confirmationNumber, 'bookingReference');
      html += this._field('Prezzo', price, 'price');
      html += `</div>`;
      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="rental" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
    });

    allFerries.forEach((f, i) => {
      const segIdx = allFlights.length + allHotels.length + allTrains.length + allBuses.length + allRentals.length + i;
      const depPort = f.departure?.port || f.departure?.city || '?';
      const arrPort = f.arrival?.port || f.arrival?.city || '?';
      const depTime = f.departure?.time || '';
      const arrTime = f.arrival?.time || '';

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-ferry-card" data-type="ferry" data-index="${i}">`;
      if (f.operator) html += `<div class="parse-rental-provider">${this._esc(f.operator)}</div>`;
      html += `<div class="parse-transport-route">
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(depPort)}</span>
          ${depTime ? `<span class="parse-transport-time">${this._esc(depTime)}</span>` : ''}
        </div>
        <div class="parse-transport-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="parse-transport-endpoint">
          <span class="parse-transport-station">${this._esc(arrPort)}</span>
          ${arrTime ? `<span class="parse-transport-time">${this._esc(arrTime)}</span>` : ''}
        </div>
      </div>`;

      html += `<div class="parse-section-header" style="margin-top:10px"><span>Partenza</span></div>`;
      html += `<div class="parse-detail-grid parse-detail-grid--2col">`;
      html += this._field('Porto', f.departure?.port, 'departure.port');
      html += this._field('Città', f.departure?.city, 'departure.city');
      html += this._field('Orario', f.departure?.time, 'departure.time');
      html += `</div>`;
      html += `<div class="parse-section-header" style="margin-top:10px"><span>Arrivo</span></div>`;
      html += `<div class="parse-detail-grid parse-detail-grid--2col">`;
      html += this._field('Porto', f.arrival?.port, 'arrival.port');
      html += this._field('Città', f.arrival?.city, 'arrival.city');
      html += this._field('Orario', f.arrival?.time, 'arrival.time');
      html += `</div>`;
      html += `<div class="parse-section-header" style="margin-top:10px"><span>Dettagli</span></div>`;
      html += `<div class="parse-detail-grid">`;
      html += this._field('Nome nave', f.ferryName, 'ferryName');
      html += this._field('Rotta', f.routeNumber, 'routeNumber');
      html += this._field('Data', this._fmtDate(f.date), 'date', 'date', f.date);
      html += this._field('Durata', f.duration, 'duration');
      if (f.cabin != null) html += this._field('Cabina', f.cabin, 'cabin');
      if (f.deck != null) html += this._field('Deck', f.deck, 'deck');
      html += this._field('PNR', f.bookingReference, 'bookingReference');
      html += this._field('Prezzo', this._resolvePrice(f.price), 'price');
      html += `</div>`;

      // Passeggeri ferry
      const ferryPassengers = f.passengers?.length > 0 ? f.passengers : [];
      html += `<div class="parse-section-header parse-ferry-pax-header" style="margin-top:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span>Passeggeri (${ferryPassengers.length})</span><button type="button" class="parse-add-pax-btn" style="display:none;font-size:12px;color:var(--primary);background:none;border:none;cursor:pointer;padding:0">+ Aggiungi passeggero</button></div>`;
      html += `<div class="parse-ferry-passengers" data-ferry-index="${i}">`;
      html += `<table class="parse-ferry-pax-table" style="width:100%;border-collapse:collapse;margin-top:4px">`;
      html += `<thead><tr>
        <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Nome</th>
        <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Tipo</th>
        <th class="parse-ferry-edit-col" style="display:none;width:28px"></th>
      </tr></thead><tbody>`;
      for (let pi = 0; pi < ferryPassengers.length; pi++) {
        const p = ferryPassengers[pi];
        html += `<tr data-pax-index="${pi}">
          <td style="padding:8px 8px 8px 0;font-size:13px">
            <span class="parse-pax-name-display">${this._esc(p.name || '—')}</span>
            <input class="parse-pax-name-input parse-field-input" data-field="passengers[${pi}].name" data-original="${this._esc(p.name || '')}" value="${this._esc(p.name || '')}" style="display:none;width:100%;box-sizing:border-box">
          </td>
          <td style="padding:8px 8px 8px 0;font-size:12px;color:var(--text-secondary)">
            <span class="parse-pax-type-display">${this._esc(p.type || '—')}</span>
            <div class="parse-pax-type-cs-placeholder" data-pax-type="${this._esc(p.type || 'ADT')}" data-field="passengers[${pi}].type" data-original="${this._esc(p.type || '')}" style="display:none"></div>
          </td>
          <td class="parse-ferry-edit-col" style="display:none;text-align:center">
            <button type="button" class="parse-pax-remove-btn" data-pax-index="${pi}" title="Rimuovi" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:14px;padding:0 4px">×</button>
          </td>
        </tr>`;
      }
      html += `</tbody></table>`;
      html += `</div>`;

      // Veicoli a bordo
      const ferryVehicles = f.vehicles?.length > 0 ? f.vehicles : [];
      html += `<div class="parse-section-header parse-ferry-veh-header" style="margin-top:24px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span>Veicoli a bordo (${ferryVehicles.length})</span><button type="button" class="parse-add-veh-btn" style="display:none;font-size:12px;color:var(--primary);background:none;border:none;cursor:pointer;padding:0">+ Aggiungi veicolo</button></div>`;
      html += `<div class="parse-ferry-vehicles" data-ferry-index="${i}">`;
      html += `<table class="parse-ferry-veh-table" style="width:100%;border-collapse:collapse;margin-top:4px">`;
      html += `<thead><tr>
        <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Tipo</th>
        <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Targa</th>
        <th class="parse-ferry-edit-col" style="display:none;width:28px"></th>
      </tr></thead><tbody>`;
      for (let vi = 0; vi < ferryVehicles.length; vi++) {
        const v = ferryVehicles[vi];
        html += `<tr data-veh-index="${vi}">
          <td style="padding:8px 0;font-size:13px">
            <span class="parse-veh-type-display">${this._esc(v.type || '—')}</span>
            <div class="parse-veh-type-cs-placeholder" data-veh-type="${this._esc(v.type || 'auto')}" data-field="vehicles[${vi}].type" data-original="${this._esc(v.type || '')}" style="display:none"></div>
          </td>
          <td style="padding:8px 0;font-size:12px;color:var(--text-secondary)">
            <span class="parse-veh-plate-display">${this._esc(v.plate || '—')}</span>
            <input class="parse-veh-plate-input parse-field-input" data-field="vehicles[${vi}].plate" data-original="${this._esc(v.plate || '')}" value="${this._esc(v.plate || '')}" style="display:none;width:100%;box-sizing:border-box">
          </td>
          <td class="parse-ferry-edit-col" style="display:none;text-align:center">
            <button type="button" class="parse-veh-remove-btn" data-veh-index="${vi}" title="Rimuovi" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:14px;padding:0 4px">×</button>
          </td>
        </tr>`;
      }
      html += `</tbody></table>`;
      html += `</div>`;

      // Add-field trigger (visible only in edit mode via CSS)
      html += `<div class="parse-add-field-section" data-card-type="ferry" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn">`;
      html += `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo`;
      html += `</button>`;
      html += `</div>`;

      html += `</div>`;
      html += `</div>`;
    });

    html += `</div>`; // .parse-panels

    // ── Feedback + Actions ──
    html += `<div class="parse-preview-footer">`;
    html += `<div class="parse-preview-feedback">`;
    html += `<span class="parse-feedback-label">Estrazione corretta?</span>`;
    html += `<button class="parse-feedback-btn" data-value="up" title="Corretta">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
    </button>`;
    html += `<button class="parse-feedback-btn" data-value="down" title="Non corretta">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
    </button>`;
    html += `</div>`;
    html += `<div class="parse-preview-actions">`;
    html += `<button class="btn btn-secondary parse-cancel-btn">Annulla</button>`;
    html += `<div class="parse-actions-right">`;
    html += `<button class="btn btn-outline parse-edit-btn">Modifica</button>`;
    html += `<button class="btn btn-primary parse-confirm-btn">Conferma e salva</button>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;

    html += `</div>`;

    container.innerHTML = html;

    // ── Hotel form sections: attach dynamic listeners (rooms/guests add/remove) ──
    if (window.tripHotels && window.tripHotels.attachFormListeners) {
      container.querySelectorAll('.parse-hotel-card--form').forEach(card => {
        window.tripHotels.attachFormListeners(card);
      });
    }

    // ── Event listeners ──
    container.querySelector('.parse-confirm-btn').addEventListener('click', () => {
      if (this._editing) {
        this._applyEdits(container);
      }
      onConfirm(this._feedback, this._parsedResults, this._editedFields);
    });
    container.querySelector('.parse-cancel-btn').addEventListener('click', () => {
      onCancel();
    });
    container.querySelector('.parse-edit-btn').addEventListener('click', () => {
      this._toggleEditMode(container);
    });

    // Feedback buttons
    container.querySelectorAll('.parse-feedback-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        if (this._feedback === value) {
          this._feedback = null;
        } else {
          this._feedback = value;
        }
        container.querySelectorAll('.parse-feedback-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.value === this._feedback);
        });
      });
    });

    // Segmented control
    container.querySelectorAll('.parse-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.segment);
        this._switchSegment(container, idx);
      });
    });
  },

  _switchSegment(container, idx) {
    this._activeSegment = idx;
    container.querySelectorAll('.parse-segment-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.segment) === idx);
    });
    container.querySelectorAll('.parse-panel').forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.panel) === idx);
    });
  },

  // ── Edit mode ──

  _toggleEditMode(container) {
    this._editing = !this._editing;
    const editBtn = container.querySelector('.parse-edit-btn');
    const preview = container.querySelector('.parse-preview');

    if (this._editing) {
      editBtn.textContent = 'Fine modifica';
      preview.classList.add('parse-editing');
      // Convert field values to inputs
      container.querySelectorAll('.parse-field-value').forEach(el => {
        const currentText = el.textContent;
        const fieldKey = el.dataset.field || '';
        const inputType = el.dataset.inputType || 'text';
        const rawValue = el.dataset.raw || '';
        const input = document.createElement('input');
        input.className = 'parse-field-input';
        input.dataset.field = fieldKey;
        input.dataset.original = currentText;

        if (inputType === 'date') {
          input.type = 'date';
          input.value = rawValue || '';
          input.dataset.rawOriginal = rawValue || '';
        } else if (inputType === 'number') {
          input.type = 'number';
          input.min = '0';
          input.value = currentText;
        } else {
          input.type = 'text';
          input.value = currentText;
        }
        el.replaceWith(input);
      });
      // Attach city autocomplete to ferry city fields
      if (window.CityAutocomplete) {
        container.querySelectorAll('.parse-ferry-card').forEach(card => {
          window.CityAutocomplete.init(card, 'input[data-field="departure.city"], input[data-field="arrival.city"]');
        });
      }
      // Enable ferry passengers/vehicles edit mode
      this._enterFerryEditMode(container);
      // Show and init add-field triggers
      this._initAddFieldTriggers(container);
    } else {
      // Hide add-field sections
      container.querySelectorAll('.parse-add-field-section').forEach(s => { s.style.display = 'none'; });
      container.querySelectorAll('.parse-add-field-inline-picker').forEach(d => { d.style.display = 'none'; });
      // Exit ferry passengers/vehicles edit mode
      this._exitFerryEditMode(container);
      this._applyEdits(container);
      editBtn.textContent = 'Modifica';
      preview.classList.remove('parse-editing');
      // Convert inputs back to display elements (skip added-field inputs — they stay as field-value)
      // Also skip inputs inside hotel form sections (parse-hotel-card--form) — they are always form inputs
      container.querySelectorAll('.parse-field-input').forEach(input => {
        // Skip inputs that live inside the new hotel form sections
        if (input.closest('.parse-hotel-card--form')) return;

        const fieldKey = input.dataset.field || '';
        const div = document.createElement('div');
        div.className = 'parse-field-value';
        div.dataset.field = fieldKey;
        // Format date values back to readable display
        if (input.type === 'date' && input.value) {
          div.textContent = this._fmtDate(input.value) || input.value;
          div.dataset.inputType = 'date';
          div.dataset.raw = input.value;
        } else if (input.type === 'number') {
          div.textContent = input.value;
          div.dataset.inputType = 'number';
        } else {
          div.textContent = input.value;
        }
        input.replaceWith(div);
      });
    }
  },

  _enterFerryEditMode(container) {
    const PAX_TYPE_OPTIONS = [
      { value: 'ADT', label: 'ADT' },
      { value: 'CHD', label: 'CHD' },
      { value: 'INF', label: 'INF' }
    ];
    const VEH_TYPE_OPTIONS = [
      { value: 'auto',    label: 'Auto' },
      { value: 'moto',    label: 'Moto' },
      { value: 'camper',  label: 'Camper' },
      { value: 'furgone', label: 'Furgone' }
    ];

    /** Upgrade all .parse-pax-type-cs-placeholder elements in an element to CustomSelect */
    const _upgradePaxPlaceholders = (scope) => {
      scope.querySelectorAll('.parse-pax-type-cs-placeholder').forEach(ph => {
        const cs = window.CustomSelect.create({
          options: PAX_TYPE_OPTIONS,
          selected: ph.dataset.paxType || 'ADT',
          className: 'parse-pax-type-cs',
          dataAttrs: {
            field: ph.dataset.field || '',
            original: ph.dataset.original || ''
          }
        });
        cs.style.cssText = ph.style.cssText; // preserve display:none etc.
        ph.replaceWith(cs);
      });
    };

    /** Upgrade all .parse-veh-type-cs-placeholder elements in an element to CustomSelect */
    const _upgradeVehPlaceholders = (scope) => {
      scope.querySelectorAll('.parse-veh-type-cs-placeholder').forEach(ph => {
        const cs = window.CustomSelect.create({
          options: VEH_TYPE_OPTIONS,
          selected: ph.dataset.vehType || 'auto',
          className: 'parse-veh-type-cs',
          dataAttrs: {
            field: ph.dataset.field || '',
            original: ph.dataset.original || ''
          }
        });
        cs.style.cssText = ph.style.cssText;
        ph.replaceWith(cs);
      });
    };

    container.querySelectorAll('.parse-ferry-card').forEach(card => {
      // Show edit columns
      card.querySelectorAll('.parse-ferry-edit-col').forEach(el => { el.style.display = ''; });

      // Passengers: show inputs, hide display spans
      const paxSection = card.querySelector('.parse-ferry-passengers');
      if (paxSection) {
        paxSection.querySelectorAll('.parse-pax-name-display').forEach(el => { el.style.display = 'none'; });
        paxSection.querySelectorAll('.parse-pax-name-input').forEach(el => { el.style.display = ''; });
        paxSection.querySelectorAll('.parse-pax-type-display').forEach(el => { el.style.display = 'none'; });

        // Upgrade placeholders → CustomSelect, then show them
        _upgradePaxPlaceholders(paxSection);
        paxSection.querySelectorAll('.parse-pax-type-cs').forEach(el => { el.style.display = ''; });

        // Remove buttons
        paxSection.querySelectorAll('.parse-pax-remove-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            btn.closest('tr').remove();
            const header = card.querySelector('.parse-ferry-pax-header span');
            if (header) header.textContent = `Passeggeri (${paxSection.querySelectorAll('tbody tr').length})`;
          });
        });

        // Add passenger button — now in the header
        const addPaxBtn = card.querySelector('.parse-ferry-pax-header .parse-add-pax-btn');
        if (addPaxBtn) {
          addPaxBtn.style.display = '';
          const newAddPaxBtn = addPaxBtn.cloneNode(true);
          addPaxBtn.replaceWith(newAddPaxBtn);
          newAddPaxBtn.addEventListener('click', () => {
            const tbody = paxSection.querySelector('tbody');
            const newIndex = tbody.querySelectorAll('tr').length;
            const tr = document.createElement('tr');
            tr.dataset.paxIndex = newIndex;
            // Build name td
            const nameTd = document.createElement('td');
            nameTd.style.cssText = 'padding:8px 8px 8px 0;font-size:13px';
            nameTd.innerHTML = `<span class="parse-pax-name-display" style="display:none"></span><input class="parse-pax-name-input parse-field-input" data-field="passengers[${newIndex}].name" data-original="" value="" style="width:100%;box-sizing:border-box" placeholder="Nome">`;
            // Build type td with CustomSelect
            const typeTd = document.createElement('td');
            typeTd.style.cssText = 'padding:8px 8px 8px 0;font-size:12px';
            const typeDisplay = document.createElement('span');
            typeDisplay.className = 'parse-pax-type-display';
            typeDisplay.style.display = 'none';
            const typeCs = window.CustomSelect.create({
              options: PAX_TYPE_OPTIONS,
              selected: 'ADT',
              className: 'parse-pax-type-cs',
              dataAttrs: { field: `passengers[${newIndex}].type`, original: '' }
            });
            typeTd.appendChild(typeDisplay);
            typeTd.appendChild(typeCs);
            // Build remove td
            const removeTd = document.createElement('td');
            removeTd.className = 'parse-ferry-edit-col';
            removeTd.style.textAlign = 'center';
            removeTd.innerHTML = `<button type="button" class="parse-pax-remove-btn" title="Rimuovi" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:14px;padding:0 4px">×</button>`;
            tr.appendChild(nameTd);
            tr.appendChild(typeTd);
            tr.appendChild(removeTd);
            tbody.appendChild(tr);
            tr.querySelector('.parse-pax-remove-btn').addEventListener('click', () => {
              tr.remove();
              const header = card.querySelector('.parse-ferry-pax-header span');
              if (header) header.textContent = `Passeggeri (${paxSection.querySelectorAll('tbody tr').length})`;
            });
            const header = card.querySelector('.parse-ferry-pax-header span');
            if (header) header.textContent = `Passeggeri (${paxSection.querySelectorAll('tbody tr').length})`;
            tr.querySelector('.parse-pax-name-input').focus();
          });
        }
      }

      // Vehicles: show inputs, hide display spans
      const vehSection = card.querySelector('.parse-ferry-vehicles');
      if (vehSection) {
        vehSection.querySelectorAll('.parse-veh-type-display').forEach(el => { el.style.display = 'none'; });
        vehSection.querySelectorAll('.parse-veh-plate-display').forEach(el => { el.style.display = 'none'; });
        vehSection.querySelectorAll('.parse-veh-plate-input').forEach(el => { el.style.display = ''; });

        // Upgrade placeholders → CustomSelect, then show them
        _upgradeVehPlaceholders(vehSection);
        vehSection.querySelectorAll('.parse-veh-type-cs').forEach(el => { el.style.display = ''; });

        // Remove buttons
        vehSection.querySelectorAll('.parse-veh-remove-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            btn.closest('tr').remove();
            const header = card.querySelector('.parse-ferry-veh-header span');
            if (header) header.textContent = `Veicoli a bordo (${vehSection.querySelectorAll('tbody tr').length})`;
          });
        });

        // Add vehicle button — now in the header
        const addVehBtn = card.querySelector('.parse-ferry-veh-header .parse-add-veh-btn');
        if (addVehBtn) {
          addVehBtn.style.display = '';
          const newAddVehBtn = addVehBtn.cloneNode(true);
          addVehBtn.replaceWith(newAddVehBtn);
          newAddVehBtn.addEventListener('click', () => {
            const tbody = vehSection.querySelector('tbody');
            const newIndex = tbody.querySelectorAll('tr').length;
            const tr = document.createElement('tr');
            tr.dataset.vehIndex = newIndex;
            // Build type td with CustomSelect
            const typeTd = document.createElement('td');
            typeTd.style.cssText = 'padding:8px 0;font-size:13px';
            const typeDisplay = document.createElement('span');
            typeDisplay.className = 'parse-veh-type-display';
            typeDisplay.style.display = 'none';
            const typeCs = window.CustomSelect.create({
              options: VEH_TYPE_OPTIONS,
              selected: 'auto',
              className: 'parse-veh-type-cs',
              dataAttrs: { field: `vehicles[${newIndex}].type`, original: '' }
            });
            typeTd.appendChild(typeDisplay);
            typeTd.appendChild(typeCs);
            // Build plate td
            const plateTd = document.createElement('td');
            plateTd.style.cssText = 'padding:8px 0;font-size:12px';
            plateTd.innerHTML = `<span class="parse-veh-plate-display" style="display:none"></span><input class="parse-veh-plate-input parse-field-input" data-field="vehicles[${newIndex}].plate" data-original="" value="" style="width:100%;box-sizing:border-box" placeholder="Targa">`;
            // Build remove td
            const removeTd = document.createElement('td');
            removeTd.className = 'parse-ferry-edit-col';
            removeTd.style.textAlign = 'center';
            removeTd.innerHTML = `<button type="button" class="parse-veh-remove-btn" title="Rimuovi" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:14px;padding:0 4px">×</button>`;
            tr.appendChild(typeTd);
            tr.appendChild(plateTd);
            tr.appendChild(removeTd);
            tbody.appendChild(tr);
            tr.querySelector('.parse-veh-remove-btn').addEventListener('click', () => {
              tr.remove();
              const header = card.querySelector('.parse-ferry-veh-header span');
              if (header) header.textContent = `Veicoli a bordo (${vehSection.querySelectorAll('tbody tr').length})`;
            });
            const header = card.querySelector('.parse-ferry-veh-header span');
            if (header) header.textContent = `Veicoli a bordo (${vehSection.querySelectorAll('tbody tr').length})`;
            tr.querySelector('.parse-veh-plate-input').focus();
          });
        }
      }
    });
  },

  _exitFerryEditMode(container) {
    container.querySelectorAll('.parse-ferry-card').forEach(card => {
      // Hide edit columns
      card.querySelectorAll('.parse-ferry-edit-col').forEach(el => { el.style.display = 'none'; });

      // Passengers: show display spans, hide inputs
      const paxSection = card.querySelector('.parse-ferry-passengers');
      if (paxSection) {
        paxSection.querySelectorAll('tbody tr').forEach(tr => {
          const nameInput = tr.querySelector('.parse-pax-name-input');
          const nameDisplay = tr.querySelector('.parse-pax-name-display');
          const typeCs = tr.querySelector('.parse-pax-type-cs');
          const typeDisplay = tr.querySelector('.parse-pax-type-display');
          if (nameInput && nameDisplay) {
            nameDisplay.textContent = nameInput.value || '—';
            nameDisplay.style.display = '';
            nameInput.style.display = 'none';
          }
          if (typeCs && typeDisplay) {
            typeDisplay.textContent = window.CustomSelect.getValue(typeCs) || '—';
            typeDisplay.style.display = '';
            typeCs.style.display = 'none';
          }
        });
        const addPaxBtn = card.querySelector('.parse-ferry-pax-header .parse-add-pax-btn');
        if (addPaxBtn) addPaxBtn.style.display = 'none';
        const header = card.querySelector('.parse-ferry-pax-header span');
        if (header) header.textContent = `Passeggeri (${paxSection.querySelectorAll('tbody tr').length})`;
      }

      // Vehicles: show display spans, hide inputs
      const vehSection = card.querySelector('.parse-ferry-vehicles');
      if (vehSection) {
        vehSection.querySelectorAll('tbody tr').forEach(tr => {
          const typeCs = tr.querySelector('.parse-veh-type-cs');
          const typeDisplay = tr.querySelector('.parse-veh-type-display');
          const plateInput = tr.querySelector('.parse-veh-plate-input');
          const plateDisplay = tr.querySelector('.parse-veh-plate-display');
          if (typeCs && typeDisplay) {
            typeDisplay.textContent = window.CustomSelect.getValue(typeCs) || '—';
            typeDisplay.style.display = '';
            typeCs.style.display = 'none';
          }
          if (plateInput && plateDisplay) {
            plateDisplay.textContent = plateInput.value || '—';
            plateDisplay.style.display = '';
            plateInput.style.display = 'none';
          }
        });
        const addVehBtn = card.querySelector('.parse-ferry-veh-header .parse-add-veh-btn');
        if (addVehBtn) addVehBtn.style.display = 'none';
        const header = card.querySelector('.parse-ferry-veh-header span');
        if (header) header.textContent = `Veicoli a bordo (${vehSection.querySelectorAll('tbody tr').length})`;
      }
    });
  },

  _initAddFieldTriggers(container) {
    // Schema dei campi aggiuntivi per tipo (deve restare sincronizzato con editBookingAddField.js)
    const SCHEMA = {
      flight:  [{ label: 'Posto', field: 'seat', t: 'text' }, { label: 'Bagaglio', field: 'baggage', t: 'text' }, { label: 'Terminal partenza', field: 'departure.terminal', t: 'text' }, { label: 'Terminal arrivo', field: 'arrival.terminal', t: 'text' }, { label: 'Durata', field: 'duration', t: 'text' }],
      hotel:   [{ label: 'Orario check-in', field: 'checkIn.time', t: 'time' }, { label: 'Orario check-out', field: 'checkOut.time', t: 'time' }, { label: 'Colazione inclusa', field: 'breakfast.included', t: 'text' }],
      train:   [{ label: 'Posto', field: 'seat', t: 'text' }, { label: 'Carrozza', field: 'coach', t: 'text' }, { label: 'Durata', field: 'duration', t: 'text' }],
      bus:     [{ label: 'Posto', field: 'seat', t: 'text' }, { label: 'Durata', field: 'duration', t: 'text' }],
      rental:  [{ label: 'Marca veicolo', field: 'vehicle.make', t: 'text' }, { label: 'Modello veicolo', field: 'vehicle.model', t: 'text' }, { label: 'Assicurazione', field: 'insurance', t: 'text' }],
      ferry:   [{ label: 'Orario partenza', field: 'departure.time', t: 'time' }, { label: 'Orario arrivo', field: 'arrival.time', t: 'time' }, { label: 'Cabina', field: 'cabin', t: 'text' }, { label: 'Ponte', field: 'deck', t: 'text' }, { label: 'Nome nave', field: 'ferryName', t: 'text' }, { label: 'Numero rotta', field: 'routeNumber', t: 'text' }, { label: 'Durata', field: 'duration', t: 'text' }]
    };

    container.querySelectorAll('.parse-add-field-section').forEach(section => {
      section.style.display = '';
      const type = section.dataset.cardType;
      const cardIndex = section.dataset.cardIndex;
      const btn = section.querySelector('.parse-add-field-btn');
      if (!btn) return;

      // Find the parent card element
      const cardClass = `.parse-${type}-card[data-index="${cardIndex}"]`;
      const card = container.querySelector(cardClass);
      if (!card) return;

      // Build inline picker (CustomSelect + confirm + cancel) — avoids floating dropdown clipping
      const picker = document.createElement('div');
      picker.className = 'parse-add-field-inline-picker';
      picker.style.display = 'none';
      // CustomSelect wrapper — populated dynamically when picker opens
      let fieldCs = null; // will hold the current .cs-wrapper
      let _missingFields = [];
      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'parse-add-field-confirm-btn';
      confirmBtn.textContent = 'Aggiungi';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'parse-add-field-cancel-btn';
      cancelBtn.textContent = '✕';
      picker.appendChild(confirmBtn);
      picker.appendChild(cancelBtn);
      section.appendChild(picker);

      const openPicker = () => {
        const schema = SCHEMA[type] || [];
        const missing = schema.filter(def => !card.querySelector(`input[data-field="${def.field}"]`));
        if (missing.length === 0) return;
        _missingFields = missing;
        // Re-build the CustomSelect with current missing options
        if (fieldCs) fieldCs.remove();
        fieldCs = window.CustomSelect.create({
          options: missing.map((def, i) => ({ value: String(i), label: def.label })),
          selected: '0',
          className: 'parse-add-field-cs'
        });
        picker.insertBefore(fieldCs, confirmBtn);
        btn.style.display = 'none';
        picker.style.display = '';
      };

      const closePicker = () => {
        picker.style.display = 'none';
        btn.style.display = '';
      };

      const addField = () => {
        const missing = _missingFields;
        const idx = parseInt(fieldCs ? window.CustomSelect.getValue(fieldCs) : '0', 10);
        if (isNaN(idx) || !missing[idx]) { closePicker(); return; }
        const def = missing[idx];

        // Find or create a "campi aggiuntivi" grid in the card
        let addedGrid = card.querySelector('.parse-added-fields-grid');
        if (!addedGrid) {
          const header = document.createElement('div');
          header.className = 'parse-section-header';
          header.style.marginTop = '10px';
          header.innerHTML = '<span>Campi aggiuntivi</span>';
          addedGrid = document.createElement('div');
          addedGrid.className = 'parse-detail-grid parse-added-fields-grid';
          card.insertBefore(header, section);
          card.insertBefore(addedGrid, section);
        }

        const row = document.createElement('div');
        row.className = 'parse-field-row';
        row.innerHTML = `<span class="parse-field-label">${this._esc(def.label)}</span>`;
        const input = document.createElement('input');
        input.type = def.t;
        input.className = 'parse-field-input';
        input.dataset.field = def.field;
        input.dataset.original = '';
        input.value = '';
        row.appendChild(input);
        addedGrid.appendChild(row);

        closePicker();
        setTimeout(() => input.focus(), 50);
      };

      btn.addEventListener('click', openPicker);
      confirmBtn.addEventListener('click', addField);
      cancelBtn.addEventListener('click', closePicker);
    });
  },

  _applyEdits(container) {
    // Walk through each card and update the parsedResults
    this._editedFields = [];
    let flightIdx = 0;
    let hotelIdx = 0;
    let trainIdx = 0;
    let busIdx = 0;
    let rentalIdx = 0;
    let ferryIdx = 0;

    for (const pr of this._parsedResults) {
      if (!pr.result) continue;

      if (pr.result.flights) {
        for (const flight of pr.result.flights) {
          const card = container.querySelector(`.parse-flight-card[data-index="${flightIdx}"]`);
          if (card) this._applyCardEdits(card, flight, `flight[${flightIdx}]`);
          flightIdx++;
        }
      }

      if (pr.result.hotels) {
        for (const hotel of pr.result.hotels) {
          const card = container.querySelector(`.parse-hotel-card[data-index="${hotelIdx}"]`);
          if (card) {
            // Use the unified collector from tripHotels (form sections)
            if (window.tripHotels && window.tripHotels.collectFormUpdates) {
              const updates = window.tripHotels.collectFormUpdates(card);
              Object.assign(hotel, updates);
              // Track edited fields (any key in updates counts as a user edit)
              Object.keys(updates).forEach(key => {
                this._editedFields.push(`hotel[${hotelIdx}].${key}`);
              });
            } else {
              // Fallback: legacy flat collector
              this._applyCardEdits(card, hotel, `hotel[${hotelIdx}]`);
            }
          }
          hotelIdx++;
        }
      }

      if (pr.result.trains) {
        for (const train of pr.result.trains) {
          const card = container.querySelector(`.parse-train-card[data-index="${trainIdx}"]`);
          if (card) this._applyCardEdits(card, train, `train[${trainIdx}]`);
          trainIdx++;
        }
      }

      if (pr.result.buses) {
        for (const bus of pr.result.buses) {
          const card = container.querySelector(`.parse-bus-card[data-index="${busIdx}"]`);
          if (card) this._applyCardEdits(card, bus, `bus[${busIdx}]`);
          busIdx++;
        }
      }

      if (pr.result.rentals) {
        for (const rental of pr.result.rentals) {
          const card = container.querySelector(`.parse-rental-card[data-index="${rentalIdx}"]`);
          if (card) this._applyCardEdits(card, rental, `rental[${rentalIdx}]`);
          rentalIdx++;
        }
      }

      if (pr.result.ferries) {
        for (const ferry of pr.result.ferries) {
          const card = container.querySelector(`.parse-ferry-card[data-index="${ferryIdx}"]`);
          if (card) this._applyCardEdits(card, ferry, `ferry[${ferryIdx}]`);
          ferryIdx++;
        }
      }
    }
  },

  _applyCardEdits(card, dataObj, prefix) {
    // Exclude pax/veh ferry inputs (handled separately) and hotel name/address
    const inputs = card.querySelectorAll(
      '.parse-field-input' +
      ':not(.parse-hotel-name-input)' +
      ':not(.parse-hotel-address-input)' +
      ':not(.parse-pax-name-input)' +
      ':not(.parse-veh-plate-input)'
    );
    inputs.forEach(input => {
      const field = input.dataset.field;
      if (!field) return;
      let newVal = input.value.trim();
      let changed = false;

      // For date inputs, use YYYY-MM-DD value directly
      if (input.type === 'date') {
        changed = newVal !== (input.dataset.rawOriginal || '');
      } else if (input.type === 'number') {
        newVal = newVal ? Number(newVal) : newVal;
        changed = String(newVal) !== input.dataset.original;
      } else {
        changed = newVal !== input.dataset.original;
      }

      if (!changed) return;

      // Track edited field
      this._editedFields.push(`${prefix}.${field}`);

      // Set nested fields like "passenger.name"
      const parts = field.split('.');
      if (parts.length === 2) {
        if (dataObj[parts[0]]) dataObj[parts[0]][parts[1]] = newVal;
      } else {
        dataObj[field] = newVal;
      }
    });

    // Ferry passengers — rebuild array from DOM rows
    const paxSection = card.querySelector('.parse-ferry-passengers');
    if (paxSection) {
      const rows = paxSection.querySelectorAll('tbody tr');
      if (rows.length > 0) {
        const newPassengers = [];
        rows.forEach(tr => {
          const nameInput = tr.querySelector('.parse-pax-name-input');
          const typeCs = tr.querySelector('.parse-pax-type-cs');
          const nameDisplay = tr.querySelector('.parse-pax-name-display');
          const typeDisplay = tr.querySelector('.parse-pax-type-display');
          const name = nameInput ? nameInput.value.trim() : (nameDisplay ? nameDisplay.textContent.trim() : '');
          const type = typeCs ? window.CustomSelect.getValue(typeCs) : (typeDisplay ? typeDisplay.textContent.trim() : '');
          if (name && name !== '—') newPassengers.push({ name, type: type || 'ADT' });
        });
        dataObj.passengers = newPassengers;
        this._editedFields.push(`${prefix}.passengers`);
      }
    }

    // Ferry vehicles — rebuild array from DOM rows
    const vehSection = card.querySelector('.parse-ferry-vehicles');
    if (vehSection) {
      const rows = vehSection.querySelectorAll('tbody tr');
      if (rows.length > 0) {
        const newVehicles = [];
        rows.forEach(tr => {
          const typeCs = tr.querySelector('.parse-veh-type-cs');
          const plateInput = tr.querySelector('.parse-veh-plate-input');
          const typeDisplay = tr.querySelector('.parse-veh-type-display');
          const plateDisplay = tr.querySelector('.parse-veh-plate-display');
          const type = typeCs ? window.CustomSelect.getValue(typeCs) : (typeDisplay ? typeDisplay.textContent.trim() : '');
          const plate = plateInput ? plateInput.value.trim() : (plateDisplay ? plateDisplay.textContent.trim() : '');
          if (type || (plate && plate !== '—')) newVehicles.push({ type: type || 'auto', plate: plate || '' });
        });
        dataObj.vehicles = newVehicles;
        this._editedFields.push(`${prefix}.vehicles`);
      }
    }
  },

  // ── Helpers ──

  _field(label, value, fieldKey, inputType, rawValue) {
    if (value == null || value === '' || value === 'null' || value === 'N/A') return '';
    // Safety: resolve objects that slipped through
    if (typeof value === 'object') {
      value = this._resolvePrice(value) || JSON.stringify(value);
    }
    const typeAttr = inputType ? ` data-input-type="${inputType}"` : '';
    const rawAttr = rawValue ? ` data-raw="${this._esc(String(rawValue))}"` : '';
    return `<div class="parse-field">
      <div class="parse-field-label">${this._esc(label)}</div>
      <div class="parse-field-value" data-field="${this._esc(fieldKey || '')}"${typeAttr}${rawAttr}>${this._esc(String(value))}</div>
    </div>`;
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

  _resolveDate(v) {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.date || null;
    return String(v);
  },

  _resolveAddress(v) {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.fullAddress) return v.fullAddress;
      const parts = [v.street, v.city, v.postalCode, v.country].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    }
    return String(v);
  },

  _resolvePrice(v) {
    if (!v) return null;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const node = v.total || v;
      if (node.value != null) return `${node.value} ${node.currency || ''}`.trim();
    }
    return null;
  },

  _resolveRoomType(v) {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && v.length > 0) return v[0].it || v[0].en || v[0] || null;
    return null;
  },

  _resolveGuests(v) {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') {
      const parts = [];
      if (v.adults) parts.push(`${v.adults} adult${v.adults === 1 ? 'o' : 'i'}`);
      const cc = Array.isArray(v.children) ? v.children.length : v.children;
      if (cc) parts.push(`${cc} bambin${cc === 1 ? 'o' : 'i'}`);
      if (v.pets) parts.push(`${v.pets} animal${v.pets === 1 ? 'e' : 'i'}`);
      if (v.total && !parts.length) return `${v.total} ospiti`;
      return parts.join(', ') || null;
    }
    return null;
  },

  _resolveBreakfast(v) {
    if (v == null) return null;
    if (typeof v === 'boolean') return v ? 'Inclusa' : 'Non inclusa';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.included != null) return v.included ? (v.type || 'Inclusa') : 'Non inclusa';
      return v.type || null;
    }
    return null;
  },

  _resolveCancellation(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.freeCancellationUntil) return `Gratuita fino al ${v.freeCancellationUntil}`;
      if (v.policy) return v.policy;
      if (v.penaltyAfter) return `Penale dopo: ${v.penaltyAfter}`;
    }
    return null;
  },

  _resolveBaggage(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.allowance || v.description || v.value || null;
    return String(v);
  },

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};

window.parsePreview = parsePreview;
