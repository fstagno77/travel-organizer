/**
 * Netlify Function: Add Booking to existing trip
 * Processes PDF and adds flight/hotel to existing trip in Supabase
 * Also stores original PDFs for download
 * Authenticated endpoint
 *
 * Supporta due modalità:
 * 1. Normale: parsa + deduplicazione + salvataggio (come prima)
 * 2. Conferma aggiornamenti: quando la 1a chiamata rileva update,
 *    il frontend invia confirmedUpdates per applicare le modifiche
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { uploadPdf, deletePdf, downloadPdfAsBase64, moveTmpPdfToTrip, cleanupTmpPdfs } = require('./utils/storage');
const { processPdfsWithClaude, extractPassengerFromFilename } = require('./utils/pdfProcessor');
const { updateTripDates } = require('./utils/tripDates');
const { deduplicateFlights, deduplicateHotels, deduplicateTrains, deduplicateBuses } = require('./utils/deduplication');
const { notifyCollaborators } = require('./utils/notificationHelper');

function countFields(flights, hotels) {
  const FLIGHT_KEYS = ['flightNumber', 'airline', 'date', 'departureTime', 'arrivalTime', 'class', 'seat', 'bookingReference', 'ticketNumber', 'status'];
  const HOTEL_KEYS = ['name', 'checkIn', 'checkOut', 'nights', 'address', 'guestName', 'confirmationNumber', 'price'];
  let filled = 0, total = 0;
  for (const f of flights) {
    for (const k of FLIGHT_KEYS) { total++; if (f[k] != null && f[k] !== '') filled++; }
    if (f.departure?.code) filled++; total++;
    if (f.arrival?.code) filled++; total++;
    if (f.passenger?.name) filled++; total++;
  }
  for (const h of hotels) {
    for (const k of HOTEL_KEYS) { total++; if (h[k] != null && h[k] !== '') filled++; }
  }
  return { filled, total };
}

/**
 * Applica gli aggiornamenti confermati ai booking esistenti e sostituisce i PDF.
 * @returns {{ updatedCounts: Object }}
 */
async function applyConfirmedUpdates(tripData, confirmedUpdates, resolvedPdfs, tripId) {
  const updatedCounts = { flights: 0, hotels: 0, trains: 0, buses: 0 };
  const deletePromises = [];
  const uploadPromises = [];

  for (const update of confirmedUpdates) {
    const { type, existingId, incoming, pdfIndex } = update;

    const collectionMap = {
      flight: tripData.flights,
      hotel: tripData.hotels,
      train: tripData.trains,
      bus: tripData.buses
    };
    const collection = collectionMap[type];
    if (!collection) continue;

    const existingItem = collection.find(item => item.id === existingId);
    if (!existingItem) {
      console.warn(`Update target not found: ${type} ${existingId}`);
      continue;
    }

    // Gestione PDF per voli multi-passeggero
    const normName = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedPassengerIdx = -1;

    if (type === 'flight' && existingItem.passengers && existingItem.passengers.length > 1) {
      const incomingName = normName(incoming.passenger?.name || incoming.passengers?.[0]?.name || '');
      if (incomingName) {
        matchedPassengerIdx = existingItem.passengers.findIndex(p => normName(p.name) === incomingName);
      }
      // La cancellazione PDF avviene dopo, nel blocco "invalidazione bookingRef"
    } else if (type === 'flight' && existingItem.passengers) {
      for (const p of existingItem.passengers) {
        if (p.pdfPath) deletePromises.push(deletePdf(p.pdfPath));
      }
    }

    if (type !== 'flight' && existingItem.pdfPath) {
      deletePromises.push(deletePdf(existingItem.pdfPath));
    }

    // Sovrascivi i campi del volo/booking (preserva id, passengers per voli)
    const preserveKeys = new Set(['id', '_pdfIndex']);
    if (type === 'flight') preserveKeys.add('passengers');

    for (const [key, val] of Object.entries(incoming)) {
      if (preserveKeys.has(key)) continue;
      if (val === undefined) continue;
      if (val && typeof val === 'object' && !Array.isArray(val) && existingItem[key] && typeof existingItem[key] === 'object') {
        Object.assign(existingItem[key], val);
      } else {
        existingItem[key] = val;
      }
    }

    // Carica PDF principale (del passeggero matchato dal parsing)
    if (pdfIndex != null && resolvedPdfs[pdfIndex]) {
      const pdf = resolvedPdfs[pdfIndex];
      const itemId = type === 'flight' ? `${existingId}-p${pdfIndex}` : existingId;

      uploadPromises.push(
        (pdf.storagePath
          ? moveTmpPdfToTrip(pdf.storagePath, tripId, itemId)
          : uploadPdf(pdf.content, tripId, itemId)
        ).then(newPath => {
          if (type === 'flight' && existingItem.passengers && existingItem.passengers.length > 1) {
            if (matchedPassengerIdx >= 0) {
              existingItem.passengers[matchedPassengerIdx].pdfPath = newPath;
              console.log(`Updated PDF for passenger ${matchedPassengerIdx} (${existingItem.passengers[matchedPassengerIdx].name})`);
            }
          } else if (type === 'flight' && existingItem.passengers) {
            existingItem.passengers.forEach(p => { p.pdfPath = newPath; });
          }
          existingItem.pdfPath = newPath;
        }).catch(err => console.error(`Error uploading PDF for ${type} ${existingId}:`, err))
      );
    }

    const countKey = type + 's';
    updatedCounts[countKey]++;
    console.log(`Applied update to ${type} ${existingId}`);
  }

  // ══════════════════════════════════════════════════════════════
  // Invalidazione PDF: quando un bookingRef viene aggiornato,
  // TUTTI i PDF di TUTTI i passeggeri su TUTTI i voli con quel
  // bookingRef sono obsoleti (la ricevuta contiene tutti i voli).
  // Ordine: cancella tutto → upload principale → propaga → upload extra
  // ══════════════════════════════════════════════════════════════
  const normName2 = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Raccogli bookingRef aggiornati
  const updatedBookingRefs = new Set();
  for (const update of confirmedUpdates) {
    if (update.type !== 'flight') continue;
    const flight = (tripData.flights || []).find(f => f.id === update.existingId);
    const ref = (flight?.bookingReference || '').toLowerCase().trim();
    if (ref) updatedBookingRefs.add(ref);
  }

  // 2. Cancella TUTTI i vecchi PDF su TUTTI i voli con quei bookingRef
  const deletedPaths = new Set();
  for (const flight of (tripData.flights || [])) {
    const ref = (flight.bookingReference || '').toLowerCase().trim();
    if (!ref || !updatedBookingRefs.has(ref)) continue;
    if (!flight.passengers) continue;

    for (const p of flight.passengers) {
      if (p.pdfPath && !deletedPaths.has(p.pdfPath)) {
        deletedPaths.add(p.pdfPath);
        deletePromises.push(deletePdf(p.pdfPath));
      }
      p.pdfPath = null;
    }
  }

  await Promise.all(deletePromises);

  // 3. Upload PDF principale (del passeggero matchato) — await prima di propagare
  await Promise.all(uploadPromises);

  // 4. Propaga pdfPath del passeggero matchato a TUTTI i voli con stesso bookingRef
  for (const update of confirmedUpdates) {
    if (update.type !== 'flight') continue;
    const updatedFlight = (tripData.flights || []).find(f => f.id === update.existingId);
    if (!updatedFlight?.bookingReference) continue;

    const bookingRef = updatedFlight.bookingReference.toLowerCase().trim();
    const incomingName = normName2(update.incoming?.passenger?.name || update.incoming?.passengers?.[0]?.name || '');
    if (!incomingName) continue;

    const matchedPax = updatedFlight.passengers?.find(p => normName2(p.name) === incomingName);
    if (!matchedPax?.pdfPath) continue;

    for (const flight of (tripData.flights || [])) {
      if (flight.id === update.existingId) continue;
      if ((flight.bookingReference || '').toLowerCase().trim() !== bookingRef) continue;
      if (!flight.passengers) continue;

      const pIdx = flight.passengers.findIndex(p => normName2(p.name) === incomingName);
      if (pIdx >= 0) {
        flight.passengers[pIdx].pdfPath = matchedPax.pdfPath;
        console.log(`Propagated main PDF to flight ${flight.id} for ${flight.passengers[pIdx].name}`);
      }
    }
  }

  // 5. Upload PDF extra per gli altri passeggeri (Step 2)
  const extraUploadPromises = [];
  const allExtraPdfs = [];
  for (const update of confirmedUpdates) {
    if (update.extraPassengerPdfs) allExtraPdfs.push(...update.extraPassengerPdfs);
  }

  if (allExtraPdfs.length > 0) {
    const processed = new Set();
    for (const extra of allExtraPdfs) {
      const key = `${extra.existingId}-${extra.passengerIdx}`;
      if (processed.has(key)) continue;
      processed.add(key);

      const flight = (tripData.flights || []).find(f => f.id === extra.existingId);
      if (!flight?.passengers) continue;
      const pIdx = extra.passengerIdx;
      if (pIdx < 0 || pIdx >= flight.passengers.length) continue;

      if (extra.fileBase64) {
        const pdfContent = extra.fileBase64.replace(/^data:.*?;base64,/, '');
        const extraItemId = `${extra.existingId}-pax${pIdx}`;
        extraUploadPromises.push(
          uploadPdf(pdfContent, tripId, extraItemId).then(newPath => {
            flight.passengers[pIdx].pdfPath = newPath;
            console.log(`Uploaded extra PDF for pax ${pIdx} (${flight.passengers[pIdx].name}) on flight ${extra.existingId}`);
          }).catch(err => console.error(`Error uploading extra PDF for pax ${pIdx}:`, err))
        );
      }
    }
  }

  await Promise.all(extraUploadPromises);

  return { updatedCounts };
}

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { supabase, user } = authResult;
  const serviceClient = getServiceClient();

  let tmpPaths = [];

  try {
    const body = JSON.parse(event.body);

    // ══════════════════════════════════════════════════════════════
    // AZIONE: Upload PDF per un passeggero specifico
    // ══════════════════════════════════════════════════════════════
    if (body.action === 'upload-passenger-pdf') {
      const { tripId, flightId, passengerIndex, pdfBase64, fileName } = body;
      if (!tripId || !flightId || passengerIndex == null || !pdfBase64) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
      }

      const { data: tripRecord, error: fetchError } = await supabase.from('trips').select('*').eq('id', tripId).single();
      if (fetchError || !tripRecord) {
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Trip not found' }) };
      }

      const tripData = tripRecord.data;
      const flight = (tripData.flights || []).find(f => f.id === flightId);
      if (!flight || !flight.passengers || !flight.passengers[passengerIndex]) {
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Flight or passenger not found' }) };
      }

      const passenger = flight.passengers[passengerIndex];
      const passengerName = passenger.name;
      const bookingRef = (flight.bookingReference || '').toLowerCase().trim();
      const normN = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Cancella vecchio PDF se esiste
      if (passenger.pdfPath) {
        await deletePdf(passenger.pdfPath);
      }

      // Carica nuovo PDF
      const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      const pdfItemId = `${flightId}-p${passengerIndex}`;
      const pdfPath = await uploadPdf(base64Data, tripId, pdfItemId);
      passenger.pdfPath = pdfPath;

      // Propaga lo stesso PDF a tutti i voli con stesso bookingRef per lo stesso passeggero
      if (bookingRef && passengerName) {
        const normalizedName = normN(passengerName);
        for (const f of (tripData.flights || [])) {
          if (f.id === flightId) continue;
          if ((f.bookingReference || '').toLowerCase().trim() !== bookingRef) continue;
          if (!f.passengers) continue;

          const pIdx = f.passengers.findIndex(p => normN(p.name) === normalizedName);
          if (pIdx >= 0) {
            // Cancella vecchio PDF su questo volo
            if (f.passengers[pIdx].pdfPath) {
              await deletePdf(f.passengers[pIdx].pdfPath);
            }
            f.passengers[pIdx].pdfPath = pdfPath;
            console.log(`Propagated upload PDF to flight ${f.id} for ${f.passengers[pIdx].name}`);
          }
        }
      }

      // Salva trip
      const { error: saveError } = await serviceClient.from('trips').update({ data: tripData }).eq('id', tripId);
      if (saveError) throw saveError;

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, pdfPath }) };
    }

    const { pdfs, tripId, parsedData, feedback, skipDateUpdate, editedFields, confirmedUpdates, pendingNew } = body;

    if (!pdfs || pdfs.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No PDF files provided', errorCode: 'E100' })
      };
    }

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required', errorCode: 'E101' })
      };
    }

    console.log(`Adding booking to trip ${tripId}, processing ${pdfs.length} PDF file(s)...`);

    // Resolve PDFs: download from Storage if storagePath provided, otherwise use inline content
    const resolvedPdfs = [];
    for (const pdf of pdfs) {
      if (pdf.storagePath) {
        tmpPaths.push(pdf.storagePath);
        const content = await downloadPdfAsBase64(pdf.storagePath);
        resolvedPdfs.push({ filename: pdf.filename, content, storagePath: pdf.storagePath });
      } else if (pdf.content) {
        resolvedPdfs.push({ filename: pdf.filename, content: pdf.content });
      }
    }

    // Get existing trip from Supabase
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      if (tmpPaths.length > 0) await cleanupTmpPdfs(tmpPaths);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found', errorCode: 'E102' })
      };
    }

    const tripData = tripRecord.data;

    // ══════════════════════════════════════════════════════════════
    // MODALITÀ 2: Conferma aggiornamenti (2a chiamata dal frontend)
    // ══════════════════════════════════════════════════════════════
    if (confirmedUpdates && Array.isArray(confirmedUpdates)) {
      console.log(`Applying ${confirmedUpdates.length} confirmed updates + ${pendingNew ? 'pending new bookings' : 'no new bookings'}`);

      // 1. Applica gli aggiornamenti confermati
      const { updatedCounts } = await applyConfirmedUpdates(tripData, confirmedUpdates, resolvedPdfs, tripId);

      // 2. Aggiungi i booking genuinamente nuovi (pendingNew)
      const addedCounts = { flights: 0, hotels: 0, trains: 0, buses: 0 };
      if (pendingNew) {
        const movedTmpPaths = new Set();

        for (const type of ['flights', 'hotels', 'trains', 'buses']) {
          const items = pendingNew[type];
          if (!items || !items.length) continue;

          const existingCount = (tripData[type] || []).length;
          const singularType = type.slice(0, -1); // flights → flight

          const itemsWithIds = items.map((item, i) => ({
            ...item,
            id: `${singularType}-${existingCount + i + 1}`
          }));

          // Upload PDF per ogni item
          for (const item of itemsWithIds) {
            const pdfIdx = item._pdfIndex;
            if (pdfIdx != null && resolvedPdfs[pdfIdx]) {
              const pdf = resolvedPdfs[pdfIdx];
              try {
                let pdfPath;
                if (pdf.storagePath && !movedTmpPaths.has(pdf.storagePath)) {
                  movedTmpPaths.add(pdf.storagePath);
                  pdfPath = await moveTmpPdfToTrip(pdf.storagePath, tripId, item.id);
                } else {
                  pdfPath = await uploadPdf(pdf.content, tripId, item.id);
                }

                if (singularType === 'flight' && item.passengers) {
                  item.passengers.forEach(p => { p.pdfPath = pdfPath; });
                }
                item.pdfPath = pdfPath;
              } catch (err) {
                console.error(`Error uploading PDF for new ${singularType} ${item.id}:`, err);
              }
            }
            // Cleanup markers
            delete item._pdfIndex;
            if (item.passengers) item.passengers.forEach(p => delete p._pdfIndex);
          }

          tripData[type] = [...(tripData[type] || []), ...itemsWithIds];
          addedCounts[type] = itemsWithIds.length;
        }

        // Cleanup tmp non spostati
        const unmoved = tmpPaths.filter(p => !movedTmpPaths.has(p));
        if (unmoved.length > 0) await cleanupTmpPdfs(unmoved);
      }

      // 3. Aggiorna date viaggio
      if (!skipDateUpdate) updateTripDates(tripData);

      // 4. Salva
      const { error: dbError } = await supabase
        .from('trips')
        .update({ data: tripData, updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (dbError) {
        console.error('Supabase error:', dbError);
        return {
          statusCode: 500, headers,
          body: JSON.stringify({ success: false, error: 'Failed to update trip in database', errorCode: 'E300' })
        };
      }

      // Notifica
      const totalUpdated = Object.values(updatedCounts).reduce((a, b) => a + b, 0);
      const totalAdded = Object.values(addedCounts).reduce((a, b) => a + b, 0);
      if (totalUpdated > 0) {
        await notifyCollaborators(tripId, user.id, 'booking_updated',
          'Ha aggiornato una prenotazione',
          'Updated a booking');
      }
      if (totalAdded > 0) {
        await notifyCollaborators(tripId, user.id, 'booking_added',
          'Ha aggiunto una prenotazione',
          'Added a booking');
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          success: true,
          tripData,
          updated: updatedCounts,
          added: addedCounts
        })
      };
    }

    // ══════════════════════════════════════════════════════════════
    // MODALITÀ 1: Normale (parsing + deduplicazione + salvataggio)
    // ══════════════════════════════════════════════════════════════

    const newFlights = [];
    const newHotels = [];
    const newTrains = [];
    const newBuses = [];
    let smartParseMeta = null;

    let results;
    let apiError = null;

    if (parsedData && Array.isArray(parsedData)) {
      // ── Pre-parsed by SmartParse (from parse-pdf endpoint) ──
      console.log(`Using pre-parsed data for ${parsedData.length} PDFs (SmartParse)`);
      results = parsedData.map((pd, i) => ({
        result: pd.result,
        pdfIndex: pd.pdfIndex ?? i,
        filename: pd.filename || resolvedPdfs[i]?.filename || `pdf-${i}`
      }));
      smartParseMeta = {
        brand: parsedData.find(p => p.brand)?.brand || null,
        claudeCalls: parsedData.reduce((sum, p) => sum + (p.claudeCalls || 0), 0),
        durationMs: parsedData.reduce((sum, p) => sum + (p.durationMs || 0), 0),
        levels: parsedData.map(p => p.parseLevel),
        feedback: feedback || null,
        ...(editedFields?.length ? { editedFields } : {}),
      };
    } else {
      // ── Legacy flow: process with Claude directly ──
      console.log(`Processing ${resolvedPdfs.length} PDFs with Claude batching...`);
      results = await processPdfsWithClaude(resolvedPdfs);

      const rateLimitError = results.find(r => r.error?.isRateLimit);
      if (rateLimitError) {
        const retryAfter = rateLimitError.error.retryAfter || 30;
        return {
          statusCode: 429,
          headers: { ...headers, 'Retry-After': String(retryAfter) },
          body: JSON.stringify({
            success: false,
            error: 'Rate limit reached. Please wait a minute before uploading another file.',
            errorType: 'rate_limit',
            errorCode: 'E200'
          })
        };
      }

      apiError = results.find(r => r.error && !r.error.isRateLimit) || null;
      if (apiError) {
        console.error('Claude API error:', apiError.error.message, apiError.error.status);
      }
    }

    // Collect results from all PDFs
    for (const { result, pdfIndex, filename } of results) {
      if (!result) continue;

      if (result.flights) {
        result.flights.forEach(flight => {
          flight._pdfIndex = pdfIndex;
          if (!flight.passenger && result.passenger) {
            flight.passenger = { ...result.passenger };
          }
          if (!flight.passenger) {
            const extractedName = extractPassengerFromFilename(filename);
            if (extractedName) {
              flight.passenger = { name: extractedName, type: 'ADT' };
            }
          }
          newFlights.push(flight);
        });
      }
      if (result.hotels) {
        result.hotels.forEach(hotel => {
          hotel._pdfIndex = pdfIndex;
          newHotels.push(hotel);
        });
      }
      if (result.trains) {
        result.trains.forEach(train => {
          train._pdfIndex = pdfIndex;
          if (!train.passenger && result.passenger) {
            train.passenger = { ...result.passenger };
          }
          newTrains.push(train);
        });
      }
      if (result.buses) {
        result.buses.forEach(bus => {
          bus._pdfIndex = pdfIndex;
          if (!bus.passenger && result.passenger) {
            bus.passenger = { ...result.passenger };
          }
          newBuses.push(bus);
        });
      }
    }

    if (!newFlights.length && !newHotels.length && !newTrains.length && !newBuses.length) {
      const errorCode = apiError ? 'E201' : 'E103';
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: apiError
            ? `Processing error: ${apiError.error.message || 'API unavailable'}`
            : 'Could not extract any travel data from the uploaded PDFs',
          errorCode
        })
      };
    }

    // Deduplicate
    const existingHotels = tripData.hotels || [];
    const existingFlights = tripData.flights || [];
    const existingTrains = tripData.trains || [];
    const existingBuses = tripData.buses || [];

    const { deduplicatedHotels, skippedHotels, updatedHotels } = deduplicateHotels(newHotels, existingHotels);
    const { deduplicatedFlights, skippedFlights, updatedFlights } = deduplicateFlights(newFlights, existingFlights);
    const { deduplicatedTrains, skippedTrains, updatedTrains } = deduplicateTrains(newTrains, existingTrains);
    const { deduplicatedBuses, skippedBuses, updatedBuses } = deduplicateBuses(newBuses, existingBuses);

    const allUpdates = [...updatedFlights, ...updatedHotels, ...updatedTrains, ...updatedBuses];

    // ── Se ci sono aggiornamenti, ritorna senza salvare ──
    if (allUpdates.length > 0) {
      console.log(`Detected ${allUpdates.length} updates — returning for user confirmation`);

      // Non cancellare i tmp PDF — serviranno alla 2a chiamata
      // Prepara i booking nuovi da passare al frontend
      const pendingNewBookings = {};
      if (deduplicatedFlights.length) {
        deduplicatedFlights.forEach(f => { f.passengers = f.passengers || []; });
        pendingNewBookings.flights = deduplicatedFlights;
      }
      if (deduplicatedHotels.length) pendingNewBookings.hotels = deduplicatedHotels;
      if (deduplicatedTrains.length) pendingNewBookings.trains = deduplicatedTrains;
      if (deduplicatedBuses.length) pendingNewBookings.buses = deduplicatedBuses;

      // Rimuovi campi interni dai dati existing per sicurezza (no leak di dati sensibili)
      const sanitizedUpdates = allUpdates.map(u => ({
        type: u.type,
        existingId: u.existingId,
        existing: sanitizeForFrontend(u.existing),
        incoming: sanitizeForFrontend(u.incoming),
        changes: u.changes,
        pdfIndex: u.pdfIndex
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          hasUpdates: true,
          updates: sanitizedUpdates,
          pendingNew: Object.keys(pendingNewBookings).length > 0 ? pendingNewBookings : null,
          skipped: { flights: skippedFlights, hotels: skippedHotels, trains: skippedTrains, buses: skippedBuses }
        })
      };
    }

    // Check if any existing flights need PDF upload (new passengers added)
    const existingFlightsWithNewPassengers = existingFlights.filter(f => f._needsPdfUpload);

    if (!deduplicatedFlights.length && !deduplicatedHotels.length && !deduplicatedTrains.length && !deduplicatedBuses.length && existingFlightsWithNewPassengers.length === 0) {
      // Build duplicate info for error message
      const duplicateInfo = [];
      if (skippedFlights > 0) {
        const flightInfo = newFlights[0]?.flightNumber || 'unknown';
        duplicateInfo.push(`flight ${flightInfo}`);
      }
      if (skippedHotels > 0) {
        const hotelInfo = newHotels[0]?.name || 'unknown';
        duplicateInfo.push(hotelInfo);
      }

      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'duplicate_booking',
          errorType: 'duplicate',
          errorCode: 'E104',
          duplicateInfo: duplicateInfo.join(', '),
          tripName: tripData.name || tripData.destination
        })
      };
    }

    // Add new bookings to trip
    const existingFlightCount = existingFlights.length;
    const existingHotelCount = existingHotels.length;
    const existingTrainCount = existingTrains.length;
    const existingBusCount = existingBuses.length;

    const flightsWithIds = deduplicatedFlights.map((f, i) => ({
      ...f,
      id: `flight-${existingFlightCount + i + 1}`
    }));

    const hotelsWithIds = deduplicatedHotels.map((h, i) => ({
      ...h,
      id: `hotel-${existingHotelCount + i + 1}`
    }));

    const trainsWithIds = deduplicatedTrains.map((t, i) => ({
      ...t,
      id: `train-${existingTrainCount + i + 1}`
    }));

    const busesWithIds = deduplicatedBuses.map((b, i) => ({
      ...b,
      id: `bus-${existingBusCount + i + 1}`
    }));

    // Upload/move PDFs and link to items (in parallel for speed)
    console.log('Uploading PDFs to storage...');
    const uploadPromises = [];
    const movedTmpPaths = new Set();

    for (let pdfIndex = 0; pdfIndex < resolvedPdfs.length; pdfIndex++) {
      const pdf = resolvedPdfs[pdfIndex];
      const isFromStorage = !!pdf.storagePath;
      let firstMoveForThisPdf = true;

      // Helper: move or upload a PDF for a given item
      const moveOrUpload = (itemId) => {
        if (isFromStorage && firstMoveForThisPdf) {
          firstMoveForThisPdf = false;
          movedTmpPaths.add(pdf.storagePath);
          return moveTmpPdfToTrip(pdf.storagePath, tripId, itemId);
        }
        return uploadPdf(pdf.content, tripId, itemId);
      };

      // Find passengers that came from this PDF in new flights and upload PDF
      for (const flight of flightsWithIds) {
        if (flight.passengers) {
          const passengersFromPdf = flight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            uploadPromises.push(
              moveOrUpload(`${flight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => { p.pdfPath = pdfPath; });
                  console.log(`Stored PDF for ${flight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error storing PDF for ${flight.id}:`, err))
            );
          }
        }
      }

      // Handle passengers added to existing flights (marked with _needsPdfUpload)
      for (const existingFlight of existingFlights) {
        if (existingFlight._needsPdfUpload && existingFlight.passengers) {
          const passengersFromPdf = existingFlight.passengers.filter(p => p._pdfIndex === pdfIndex);
          if (passengersFromPdf.length > 0) {
            uploadPromises.push(
              moveOrUpload(`${existingFlight.id}-p${pdfIndex}`)
                .then(pdfPath => {
                  passengersFromPdf.forEach(p => { p.pdfPath = pdfPath; });
                  console.log(`Stored PDF for existing ${existingFlight.id}, passengers: ${passengersFromPdf.map(p => p.name).join(', ')}`);
                })
                .catch(err => console.error(`Error storing PDF for ${existingFlight.id}:`, err))
            );
          }
        }
      }

      // Treni
      const trainsFromPdf = trainsWithIds.filter(t => t._pdfIndex === pdfIndex);
      for (const train of trainsFromPdf) {
        uploadPromises.push(
          moveOrUpload(train.id)
            .then(pdfPath => {
              train.pdfPath = pdfPath;
              console.log(`Stored PDF for ${train.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error storing PDF for ${train.id}:`, err))
        );
      }

      // Bus
      const busesFromPdf = busesWithIds.filter(b => b._pdfIndex === pdfIndex);
      for (const bus of busesFromPdf) {
        uploadPromises.push(
          moveOrUpload(bus.id)
            .then(pdfPath => {
              bus.pdfPath = pdfPath;
              console.log(`Stored PDF for ${bus.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error storing PDF for ${bus.id}:`, err))
        );
      }

      // Hotels remain linked at hotel level
      const hotelsFromPdf = hotelsWithIds.filter(h => h._pdfIndex === pdfIndex);
      for (const hotel of hotelsFromPdf) {
        uploadPromises.push(
          moveOrUpload(hotel.id)
            .then(pdfPath => {
              hotel.pdfPath = pdfPath;
              console.log(`Stored PDF for ${hotel.id}: ${pdfPath}`);
            })
            .catch(err => console.error(`Error storing PDF for ${hotel.id}:`, err))
        );
      }
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Clean up any tmp paths that weren't moved
    const unmoved = tmpPaths.filter(p => !movedTmpPaths.has(p));
    if (unmoved.length > 0) {
      await cleanupTmpPdfs(unmoved);
    }

    // Clean up temporary markers
    flightsWithIds.forEach(f => {
      delete f._pdfIndex;
      if (f.passengers) {
        f.passengers.forEach(p => delete p._pdfIndex);
      }
    });
    hotelsWithIds.forEach(h => delete h._pdfIndex);
    trainsWithIds.forEach(t => delete t._pdfIndex);
    busesWithIds.forEach(b => delete b._pdfIndex);
    // Clean up markers from existing flights that got new passengers
    existingFlights.forEach(f => {
      delete f._needsPdfUpload;
      if (f.passengers) {
        f.passengers.forEach(p => delete p._pdfIndex);
      }
    });

    tripData.flights = [...(tripData.flights || []), ...flightsWithIds];
    tripData.hotels = [...(tripData.hotels || []), ...hotelsWithIds];
    tripData.trains = [...(tripData.trains || []), ...trainsWithIds];
    tripData.buses = [...(tripData.buses || []), ...busesWithIds];

    // Update dates if needed (skip if user chose to keep current dates)
    if (!skipDateUpdate) {
      updateTripDates(tripData);
    }

    // Save updated trip to Supabase
    const { error: dbError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (dbError) {
      console.error('Supabase error:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to update trip in database',
          errorCode: 'E300'
        })
      };
    }

    // Notify collaborators about the new booking
    await notifyCollaborators(tripId, user.id, 'booking_added',
      'Ha aggiunto una prenotazione',
      'Added a booking');

    // Log to email_processing_log (non-fatal)
    try {
      const pdfFilenames = resolvedPdfs.map(p => p.filename).join(', ');
      const primaryLevel = smartParseMeta?.levels?.[0] || null;
      const row = {
        source: 'upload',
        email_from: user.email,
        email_subject: pdfFilenames || 'Add booking',
        status: 'success',
        user_id: user.id,
        trip_id: tripId,
        attachment_count: resolvedPdfs.length,
        extracted_summary: {
          flights: deduplicatedFlights.length,
          hotels: deduplicatedHotels.length,
          skippedFlights,
          skippedHotels,
          ...countFields(deduplicatedFlights, deduplicatedHotels),
          detectedDocType: parsedData?.find(p => p.detectedDocType)?.detectedDocType || null,
          passenger: deduplicatedFlights[0]?.passenger?.name
            || deduplicatedFlights[0]?.passengers?.[0]?.name
            || deduplicatedHotels[0]?.guestName
            || null,
          routes: deduplicatedFlights.map(f => {
            const dep = f.departure?.code || f.departureAirport || '';
            const arr = f.arrival?.code || f.arrivalAirport || '';
            return dep && arr ? `${dep}→${arr}` : null;
          }).filter(Boolean).slice(0, 6),
          hotelNames: deduplicatedHotels.map(h => h.name).filter(Boolean).slice(0, 3),
        },
        parse_level: primaryLevel,
        parse_meta: smartParseMeta,
      };
      const { error: logError } = await serviceClient.from('email_processing_log').insert(row);
      if (logError && (logError.code === '42703' || logError.message?.includes('parse_level') || logError.message?.includes('parse_meta'))) {
        delete row.parse_level;
        delete row.parse_meta;
        await serviceClient.from('email_processing_log').insert(row);
      }
    } catch (logErr) {
      console.error('Add-booking log failed (non-fatal):', logErr);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tripData,
        added: {
          flights: deduplicatedFlights.length,
          hotels: deduplicatedHotels.length,
          trains: deduplicatedTrains.length,
          buses: deduplicatedBuses.length
        },
        skipped: {
          flights: skippedFlights,
          hotels: skippedHotels,
          trains: skippedTrains,
          buses: skippedBuses
        }
      })
    };

  } catch (error) {
    // Cleanup temporary PDFs if any were uploaded
    if (tmpPaths && tmpPaths.length > 0) {
      try {
        await cleanupTmpPdfs(tmpPaths);
      } catch (cleanupErr) {
        console.error('Failed to cleanup tmp PDFs:', cleanupErr);
      }
    }
    console.error('Error adding booking:', error);
    const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
    const retryAfter = error.retryAfter || 30;
    return {
      statusCode: isRateLimit ? 429 : 500,
      headers: isRateLimit ? { ...headers, 'Retry-After': String(retryAfter) } : headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process PDF documents',
        errorType: isRateLimit ? 'rate_limit' : undefined,
        errorCode: isRateLimit ? 'E200' : 'E999'
      })
    };
  }
};

/**
 * Rimuove campi interni/sensibili prima di inviare al frontend
 */
function sanitizeForFrontend(obj) {
  if (!obj) return obj;
  const clean = { ...obj };
  delete clean._pdfIndex;
  delete clean._needsPdfUpload;
  return clean;
}
