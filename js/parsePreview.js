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
      const short = s => s.length > 10 ? s.substring(0, 8) + '…' : s;
      this._segments.push({ type: 'ferry', index: i, label: `${short(dep)}→${short(arr)}`, icon: 'directions_boat' });
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
            <td style="padding:5px 0;font-size:13px">${this._esc(p.name || '—')}</td>
            <td style="padding:5px 0;font-size:12px;color:var(--text-secondary)">${this._esc(p.type || '—')}</td>
            <td style="padding:5px 0;font-size:13px">${this._esc(p.seat || '—')}</td>
            <td style="padding:5px 0;font-size:12px;color:var(--text-secondary)">${this._esc(p.ticketNumber || '—')}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
      }

      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="flight" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
      html += `</div>`;

      html += `</div>`;
      html += `</div>`;
    });

    allHotels.forEach((h, i) => {
      const segIdx = allFlights.length + i;
      const name = h.name || 'Hotel';
      const checkIn = this._resolveDate(h.checkIn);
      const checkOut = this._resolveDate(h.checkOut);
      const address = this._resolveAddress(h.address);
      const price = this._resolvePrice(h.price);
      const roomType = this._resolveRoomType(h.roomTypes || h.roomType);
      const guests = this._resolveGuests(h.guests);
      const breakfast = this._resolveBreakfast(h.breakfast);
      const cancellation = this._resolveCancellation(h.cancellation);

      html += `<div class="parse-panel${segIdx === 0 ? ' active' : ''}" data-panel="${segIdx}">`;
      html += `<div class="parse-hotel-card" data-type="hotel" data-index="${i}">`;
      html += `<div class="parse-hotel-name">${this._esc(name)}</div>`;
      if (address) html += `<div class="parse-hotel-address">${this._esc(address)}</div>`;

      html += `<div class="parse-detail-grid">`;
      html += this._field('Check-in', this._fmtDate(checkIn), 'checkIn', 'date', checkIn);
      html += this._field('Check-out', this._fmtDate(checkOut), 'checkOut', 'date', checkOut);
      html += this._field('Notti', h.nights, 'nights', 'number');
      html += this._field('Camera', roomType, 'roomType');
      html += this._field('Ospiti', guests, 'guests');
      html += this._field('Nome ospite', h.guestName, 'guestName');
      html += this._field('Prezzo', price, 'price');
      html += this._field('Conferma', h.confirmationNumber, 'confirmationNumber');
      html += this._field('Colazione', breakfast, 'breakfast');
      html += this._field('Cancellazione', cancellation, 'cancellation');
      html += this._field('Fonte', h.source, 'source');
      html += `</div>`;
      // Add-field trigger (visible only in edit mode)
      html += `<div class="parse-add-field-section" data-card-type="hotel" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo</button>`;
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
      html += `</div>`;

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
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
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
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
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
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
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
      html += `<div class="parse-detail-grid">`;
      html += this._field('Porto', f.departure?.port, 'departure.port');
      html += this._field('Città', f.departure?.city, 'departure.city');
      html += this._field('Orario', f.departure?.time, 'departure.time');
      html += `</div>`;
      html += `<div class="parse-section-header" style="margin-top:10px"><span>Arrivo</span></div>`;
      html += `<div class="parse-detail-grid">`;
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
      if (f.passengers?.length > 0) {
        html += `<div class="parse-section-header" style="margin-top:14px"><span>Passeggeri (${f.passengers.length})</span></div>`;
        html += `<table style="width:100%;border-collapse:collapse;margin-top:4px">`;
        html += `<thead><tr>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Nome</th>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Tipo</th>
        </tr></thead><tbody>`;
        for (const p of f.passengers) {
          html += `<tr>
            <td style="padding:5px 0;font-size:13px">${this._esc(p.name || '—')}</td>
            <td style="padding:5px 0;font-size:12px;color:var(--text-secondary)">${this._esc(p.type || '—')}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
      }

      // Veicoli a bordo
      if (f.vehicles?.length > 0) {
        html += `<div class="parse-section-header" style="margin-top:14px"><span>Veicoli a bordo</span></div>`;
        html += `<table style="width:100%;border-collapse:collapse;margin-top:4px">`;
        html += `<thead><tr>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Tipo</th>
          <th style="text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color)">Targa</th>
        </tr></thead><tbody>`;
        for (const v of f.vehicles) {
          html += `<tr>
            <td style="padding:5px 0;font-size:13px">${this._esc(v.type || '—')}</td>
            <td style="padding:5px 0;font-size:12px;color:var(--text-secondary)">${this._esc(v.plate || '—')}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
      }

      // Add-field trigger (visible only in edit mode via CSS)
      html += `<div class="parse-add-field-section" data-card-type="ferry" data-card-index="${i}" style="display:none">`;
      html += `<button type="button" class="parse-add-field-btn">`;
      html += `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Aggiungi campo`;
      html += `</button>`;
      html += `<div class="parse-add-field-dropdown" style="display:none"></div>`;
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
      // Make hotel name editable
      container.querySelectorAll('.parse-hotel-name').forEach(el => {
        const currentText = el.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'parse-field-input parse-hotel-name-input';
        input.value = currentText;
        input.dataset.field = 'name';
        input.dataset.original = currentText;
        el.replaceWith(input);
      });
      // Make hotel address editable
      container.querySelectorAll('.parse-hotel-address').forEach(el => {
        const currentText = el.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'parse-field-input parse-hotel-address-input';
        input.value = currentText;
        input.dataset.field = 'address';
        input.dataset.original = currentText;
        el.replaceWith(input);
      });
      // Attach city autocomplete to ferry city fields
      if (window.CityAutocomplete) {
        container.querySelectorAll('.parse-ferry-card').forEach(card => {
          window.CityAutocomplete.init(card, 'input[data-field="departure.city"], input[data-field="arrival.city"]');
        });
      }
      // Show and init add-field triggers
      this._initAddFieldTriggers(container);
    } else {
      // Hide add-field sections
      container.querySelectorAll('.parse-add-field-section').forEach(s => { s.style.display = 'none'; });
      container.querySelectorAll('.parse-add-field-dropdown').forEach(d => { d.style.display = 'none'; });
      this._applyEdits(container);
      editBtn.textContent = 'Modifica';
      preview.classList.remove('parse-editing');
      // Convert inputs back to display elements (skip added-field inputs — they stay as field-value)
      container.querySelectorAll('.parse-field-input').forEach(input => {
        const fieldKey = input.dataset.field || '';
        if (input.classList.contains('parse-hotel-name-input')) {
          const div = document.createElement('div');
          div.className = 'parse-hotel-name';
          div.textContent = input.value;
          input.replaceWith(div);
        } else if (input.classList.contains('parse-hotel-address-input')) {
          const div = document.createElement('div');
          div.className = 'parse-hotel-address';
          div.textContent = input.value;
          input.replaceWith(div);
        } else {
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
        }
      });
    }
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
      const dropdown = section.querySelector('.parse-add-field-dropdown');
      if (!btn || !dropdown) return;

      // Find the parent card element
      const cardClass = `.parse-${type}-card[data-index="${cardIndex}"]`;
      const card = container.querySelector(cardClass);
      if (!card) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const schema = SCHEMA[type] || [];
        // Filter out fields already present as inputs in the card
        const missing = schema.filter(def => !card.querySelector(`input[data-field="${def.field}"]`));
        if (missing.length === 0) { dropdown.style.display = 'none'; return; }

        if (dropdown.style.display === 'block') { dropdown.style.display = 'none'; return; }

        dropdown.innerHTML = missing.map((def, i) =>
          `<div class="parse-add-field-option" data-index="${i}">${this._esc(def.label)}</div>`
        ).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.parse-add-field-option').forEach((el, i) => {
          el.addEventListener('click', () => {
            const def = missing[i];
            // Find or create a "campi aggiuntivi" grid in the card
            let addedGrid = card.querySelector('.parse-added-fields-grid');
            if (!addedGrid) {
              const header = document.createElement('div');
              header.className = 'parse-section-header';
              header.style.marginTop = '10px';
              header.innerHTML = '<span>Campi aggiuntivi</span>';
              addedGrid = document.createElement('div');
              addedGrid.className = 'parse-detail-grid parse-added-fields-grid';
              // Insert before the add-field-section
              card.insertBefore(header, section);
              card.insertBefore(addedGrid, section);
            }

            // Build a field row with an input
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

            dropdown.style.display = 'none';
            setTimeout(() => input.focus(), 50);
          });
        });
      });

      // Close dropdown on outside click
      document.addEventListener('click', function handler(e) {
        if (!section.contains(e.target)) dropdown.style.display = 'none';
      });
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
            // Hotel name
            const nameInput = card.querySelector('.parse-hotel-name-input');
            if (nameInput && nameInput.value !== nameInput.dataset.original) {
              hotel.name = nameInput.value;
              this._editedFields.push(`hotel[${hotelIdx}].name`);
            }
            // Hotel address
            const addrInput = card.querySelector('.parse-hotel-address-input');
            if (addrInput && addrInput.value !== addrInput.dataset.original) {
              if (typeof hotel.address === 'object') hotel.address.fullAddress = addrInput.value;
              else hotel.address = addrInput.value;
              this._editedFields.push(`hotel[${hotelIdx}].address`);
            }
            this._applyCardEdits(card, hotel, `hotel[${hotelIdx}]`);
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
    const inputs = card.querySelectorAll('.parse-field-input:not(.parse-hotel-name-input):not(.parse-hotel-address-input)');
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
