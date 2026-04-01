/**
 * Deduplication - Shared logic for deduplicating flights and hotels
 * Used by both process-pdf.js (batch-only) and add-booking.js (existing + batch).
 *
 * Supporta anche il rilevamento di aggiornamenti (update detection):
 * quando un booking matcha per chiave "soft" (es. bookingRef + flightNumber senza data)
 * ma ha campi diversi, viene segnalato come update invece che duplicato.
 */

const { buildPassengersArray, buildPassengerEntry } = require('./passengerBuilder');

// ── Campi da confrontare per rilevamento aggiornamenti ──

const FLIGHT_COMPARE_FIELDS = [
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
];

const HOTEL_COMPARE_FIELDS = [
  { path: 'checkIn.date', label: 'Check-in' },
  { path: 'checkOut.date', label: 'Check-out' },
  { path: 'name', label: 'Nome hotel' },
  { path: 'roomType', label: 'Camera' },
  { path: 'guestName', label: 'Ospite' },
];

const TRAIN_COMPARE_FIELDS = [
  { path: 'date', label: 'Data' },
  { path: 'departure.time', label: 'Ora partenza' },
  { path: 'arrival.time', label: 'Ora arrivo' },
  { path: 'departure.station', label: 'Stazione partenza' },
  { path: 'arrival.station', label: 'Stazione arrivo' },
  { path: 'seat', label: 'Posto' },
  { path: 'coach', label: 'Carrozza' },
  { path: 'class', label: 'Classe' },
];

const BUS_COMPARE_FIELDS = [
  { path: 'date', label: 'Data' },
  { path: 'departure.time', label: 'Ora partenza' },
  { path: 'arrival.time', label: 'Ora arrivo' },
  { path: 'departure.station', label: 'Fermata partenza' },
  { path: 'arrival.station', label: 'Fermata arrivo' },
  { path: 'seat', label: 'Posto' },
];

// ── Utility per confronto campi ──

/**
 * Legge un valore annidato da un oggetto (es. 'departure.code' → obj.departure.code)
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let val = obj;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

/**
 * Confronta campi specifici tra un booking esistente e uno nuovo.
 * Ritorna solo i campi che differiscono.
 * @returns {Array<{field: string, label: string, oldValue: *, newValue: *}>}
 */
function diffFields(existing, incoming, compareFields) {
  const changes = [];
  for (const { path, label } of compareFields) {
    const oldVal = getNestedValue(existing, path);
    const newVal = getNestedValue(incoming, path);
    // Ignora se il nuovo valore è vuoto
    if (newVal == null || newVal === '') continue;
    // Confronto normalizzato (stringhe lowercase trim)
    const oldNorm = typeof oldVal === 'string' ? oldVal.toLowerCase().trim() : oldVal;
    const newNorm = typeof newVal === 'string' ? newVal.toLowerCase().trim() : newVal;
    if (oldNorm !== newNorm) {
      changes.push({ field: path, label, oldValue: oldVal ?? null, newValue: newVal });
    }
  }
  return changes;
}

/**
 * Merge non-null fields from source into target without overwriting existing values.
 * Used to enrich a flight record with data from a supplementary document
 * (e.g. email confirmation adds price/seat to an existing boarding-pass entry).
 */
function mergeFlightFields(target, source) {
  const skip = new Set(['id', '_pdfIndex', '_needsPdfUpload', 'passengers', 'passenger']);
  for (const [key, val] of Object.entries(source)) {
    if (skip.has(key)) continue;
    if (val === null || val === undefined || val === '') continue;
    if (target[key] === null || target[key] === undefined || target[key] === '') {
      target[key] = val;
    }
  }
}

/**
 * Deduplicate hotels against existing hotels and within the new batch.
 * When existingHotels is empty, only deduplicates within the batch.
 *
 * Rileva anche aggiornamenti: stesso confirmationNumber ma date diverse.
 *
 * @param {Array} newHotels - New hotels to deduplicate
 * @param {Array} [existingHotels=[]] - Existing hotels in the trip (from DB)
 * @returns {{ deduplicatedHotels: Array, skippedHotels: number, updatedHotels: Array }}
 */
function deduplicateHotels(newHotels, existingHotels = []) {
  const deduplicatedHotels = [];
  let skippedHotels = 0;
  const updatedHotels = [];

  for (const newHotel of newHotels) {
    const confirmNum = newHotel.confirmationNumber?.toLowerCase()?.trim();
    const hotelName = newHotel.name?.toLowerCase()?.trim();
    const checkIn = newHotel.checkIn?.date;
    const checkOut = newHotel.checkOut?.date;

    let isDuplicate = false;
    let isUpdate = false;

    if (confirmNum) {
      // Match esatto: confirmationNumber + date check-in + date check-out
      const exactMatch = existingHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum &&
        h.checkIn?.date === checkIn &&
        h.checkOut?.date === checkOut
      );
      const alreadyInBatch = deduplicatedHotels.find(h =>
        h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
      );

      if (exactMatch || alreadyInBatch) {
        isDuplicate = true;
      } else if (existingHotels.length > 0) {
        // SOFT MATCH: stesso confirmationNumber ma date diverse → potenziale update
        const softMatch = existingHotels.find(h =>
          h.confirmationNumber?.toLowerCase()?.trim() === confirmNum
        );
        if (softMatch) {
          const changes = diffFields(softMatch, newHotel, HOTEL_COMPARE_FIELDS);
          if (changes.length > 0) {
            updatedHotels.push({
              type: 'hotel',
              existingId: softMatch.id,
              existing: softMatch,
              incoming: newHotel,
              changes,
              pdfIndex: newHotel._pdfIndex
            });
            isUpdate = true;
          } else {
            isDuplicate = true;
          }
        }
      }
    } else if (hotelName && checkIn && checkOut) {
      const existingHotel = existingHotels.find(h =>
        h.name?.toLowerCase()?.trim() === hotelName &&
        h.checkIn?.date === checkIn &&
        h.checkOut?.date === checkOut
      );
      const alreadyInBatch = deduplicatedHotels.find(h =>
        h.name?.toLowerCase()?.trim() === hotelName &&
        h.checkIn?.date === checkIn &&
        h.checkOut?.date === checkOut
      );
      isDuplicate = !!(existingHotel || alreadyInBatch);
    }

    if (isUpdate) {
      console.log(`Detected update for hotel: ${confirmNum} (${newHotel.name})`);
    } else if (isDuplicate) {
      console.log(`Skipping duplicate hotel: ${confirmNum || hotelName} (${newHotel.name})`);
      skippedHotels++;
    } else {
      deduplicatedHotels.push(newHotel);
    }
  }

  return { deduplicatedHotels, skippedHotels, updatedHotels };
}

/**
 * Deduplicate flights against existing flights and within the new batch.
 * When existingFlights is empty, only deduplicates within the batch.
 * Aggregates passengers when the same flight appears multiple times (different passengers).
 * Mutates existingFlights in place when adding passengers to existing flights.
 *
 * Rileva anche aggiornamenti: stesso bookingRef + flightNumber ma data/orari diversi.
 *
 * @param {Array} newFlights - New flights to deduplicate
 * @param {Array} [existingFlights=[]] - Existing flights in the trip (from DB)
 * @returns {{ deduplicatedFlights: Array, skippedFlights: number, updatedFlights: Array }}
 */
function deduplicateFlights(newFlights, existingFlights = []) {
  const deduplicatedFlights = [];
  let skippedFlights = 0;
  const updatedFlights = [];
  // Traccia gli id già segnalati come update per evitare duplicati nel batch
  const updatedExistingIds = new Set();

  for (const newFlight of newFlights) {
    const bookingRef = newFlight.bookingReference?.toLowerCase()?.trim();
    const flightNum  = newFlight.flightNumber?.toLowerCase()?.trim();
    const flightDate = newFlight.date;

    // PRIMARY MATCH: bookingRef + flightNumber + date (all three must be present and match)
    let existingFlight = (bookingRef && flightNum && flightDate)
      ? existingFlights.find(f =>
          f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
          f.flightNumber?.toLowerCase()?.trim()    === flightNum &&
          f.date === flightDate
        )
      : null;

    // SECONDARY MATCH: bookingRef only — used when the new document (e.g. email
    // confirmation) is missing flightNumber or date but shares a booking reference
    // with an existing flight. In this case we enrich the existing record instead
    // of creating a duplicate.
    let isSecondaryMatch = false;
    if (!existingFlight && bookingRef && (!flightNum || !flightDate)) {
      existingFlight = existingFlights.find(f =>
        f.bookingReference?.toLowerCase()?.trim() === bookingRef
      );
      if (existingFlight) isSecondaryMatch = true;
    }

    if (existingFlight) {
      // Merge any new fields (price, seat, gate, etc.) from the supplementary doc
      mergeFlightFields(existingFlight, newFlight);

      // Aggregate passenger if present and not already listed
      if (newFlight.passenger) {
        existingFlight.passengers = buildPassengersArray(existingFlight);
        const alreadyHasPassenger = existingFlight.passengers.some(p =>
          (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
          (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
        );
        if (!alreadyHasPassenger) {
          existingFlight.passengers.push(buildPassengerEntry(newFlight.passenger, newFlight));
          existingFlight._needsPdfUpload = true;
          console.log(`Added passenger ${newFlight.passenger.name} to existing flight ${existingFlight.flightNumber || bookingRef}`);
        } else if (!isSecondaryMatch) {
          console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
          skippedFlights++;
        }
      } else if (!isSecondaryMatch) {
        console.log(`Skipping duplicate flight: ${flightNum} on ${flightDate}`);
        skippedFlights++;
      }

      if (isSecondaryMatch) {
        existingFlight._needsPdfUpload = true;
        console.log(`Merged supplementary doc (bookingRef: ${bookingRef}) into flight ${existingFlight.flightNumber}`);
      }

    } else {
      // SOFT MATCH contro esistenti: bookingRef + flightNumber (senza data) → potenziale update
      if (existingFlights.length > 0 && bookingRef && flightNum) {
        const softMatch = existingFlights.find(f =>
          f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
          f.flightNumber?.toLowerCase()?.trim()    === flightNum &&
          !updatedExistingIds.has(f.id) // non segnalare lo stesso volo due volte
        );
        if (softMatch) {
          const changes = diffFields(softMatch, newFlight, FLIGHT_COMPARE_FIELDS);
          if (changes.length > 0) {
            updatedExistingIds.add(softMatch.id);
            updatedFlights.push({
              type: 'flight',
              existingId: softMatch.id,
              existing: softMatch,
              incoming: newFlight,
              changes,
              pdfIndex: newFlight._pdfIndex
            });
            console.log(`Detected update for flight: ${flightNum} (existing: ${softMatch.date} → new: ${flightDate})`);
            continue;
          }
        }
      }

      // PRIMARY MATCH within current upload batch
      let alreadyAdded = (bookingRef && flightNum && flightDate)
        ? deduplicatedFlights.find(f =>
            f.bookingReference?.toLowerCase()?.trim() === bookingRef &&
            f.flightNumber?.toLowerCase()?.trim()    === flightNum &&
            f.date === flightDate
          )
        : null;

      // SECONDARY MATCH within batch
      if (!alreadyAdded && bookingRef && (!flightNum || !flightDate)) {
        alreadyAdded = deduplicatedFlights.find(f =>
          f.bookingReference?.toLowerCase()?.trim() === bookingRef
        );
        if (alreadyAdded) {
          mergeFlightFields(alreadyAdded, newFlight);
          if (newFlight.passenger) {
            alreadyAdded.passengers = buildPassengersArray(alreadyAdded);
            const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
              (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
              (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
            );
            if (!alreadyHasPassenger) {
              alreadyAdded.passengers.push(buildPassengerEntry(newFlight.passenger, newFlight));
            }
          }
          console.log(`Merged supplementary doc into batch flight ${alreadyAdded.flightNumber || bookingRef}`);
          continue;
        }
      }

      if (!alreadyAdded) {
        newFlight.passengers = buildPassengersArray(newFlight);
        deduplicatedFlights.push(newFlight);
      } else {
        // Aggregate passenger to primary-matched batch flight
        if (newFlight.passenger) {
          alreadyAdded.passengers = buildPassengersArray(alreadyAdded);
          const alreadyHasPassenger = alreadyAdded.passengers.some(p =>
            (p.ticketNumber && newFlight.passenger.ticketNumber && p.ticketNumber === newFlight.passenger.ticketNumber) ||
            (p.name && newFlight.passenger.name && p.name === newFlight.passenger.name)
          );
          if (!alreadyHasPassenger) {
            alreadyAdded.passengers.push(buildPassengerEntry(newFlight.passenger, newFlight));
            console.log(`Added passenger ${newFlight.passenger.name} to batch flight ${flightNum} on ${flightDate}`);
          } else {
            console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
            skippedFlights++;
          }
        } else {
          console.log(`Skipping duplicate flight in same batch: ${flightNum}`);
          skippedFlights++;
        }
      }
    }
  }

  return { deduplicatedFlights, skippedFlights, updatedFlights };
}

/**
 * Deduplica treni contro esistenti e all'interno del batch.
 * Match su trainNumber + date oppure bookingReference.
 * Rileva aggiornamenti: stesso bookingReference o trainNumber ma data/orari diversi.
 */
function deduplicateTrains(newTrains, existingTrains = []) {
  const deduplicatedTrains = [];
  let skippedTrains = 0;
  const updatedTrains = [];

  for (const newTrain of newTrains) {
    const trainNum = newTrain.trainNumber?.toLowerCase()?.trim();
    const trainDate = newTrain.date;
    const bookingRef = newTrain.bookingReference?.toLowerCase()?.trim();

    let isDuplicate = false;
    let isUpdate = false;
    const allTrains = [...existingTrains, ...deduplicatedTrains];

    // Match esatto: trainNumber + date oppure bookingReference
    if (trainNum && trainDate) {
      isDuplicate = !!allTrains.find(t =>
        t.trainNumber?.toLowerCase()?.trim() === trainNum && t.date === trainDate
      );
    } else if (bookingRef) {
      isDuplicate = !!allTrains.find(t =>
        t.bookingReference?.toLowerCase()?.trim() === bookingRef
      );
    }

    // SOFT MATCH: stesso trainNumber (senza data) o stesso bookingRef con data diversa → update
    if (!isDuplicate && existingTrains.length > 0) {
      let softMatch = null;
      if (trainNum) {
        softMatch = existingTrains.find(t =>
          t.trainNumber?.toLowerCase()?.trim() === trainNum && t.date !== trainDate
        );
      }
      if (!softMatch && bookingRef) {
        softMatch = existingTrains.find(t =>
          t.bookingReference?.toLowerCase()?.trim() === bookingRef && t.date !== trainDate
        );
      }
      if (softMatch) {
        const changes = diffFields(softMatch, newTrain, TRAIN_COMPARE_FIELDS);
        if (changes.length > 0) {
          updatedTrains.push({
            type: 'train',
            existingId: softMatch.id,
            existing: softMatch,
            incoming: newTrain,
            changes,
            pdfIndex: newTrain._pdfIndex
          });
          isUpdate = true;
        }
      }
    }

    if (isUpdate) {
      console.log(`Detected update for train: ${trainNum || bookingRef}`);
    } else if (isDuplicate) {
      console.log(`Skipping duplicate train: ${trainNum || bookingRef}`);
      skippedTrains++;
    } else {
      deduplicatedTrains.push(newTrain);
    }
  }

  return { deduplicatedTrains, skippedTrains, updatedTrains };
}

/**
 * Deduplica bus contro esistenti e all'interno del batch.
 * Match su routeNumber + date oppure bookingReference.
 * Rileva aggiornamenti: stesso bookingReference o routeNumber ma data/orari diversi.
 */
function deduplicateBuses(newBuses, existingBuses = []) {
  const deduplicatedBuses = [];
  let skippedBuses = 0;
  const updatedBuses = [];

  for (const newBus of newBuses) {
    const routeNum = newBus.routeNumber?.toLowerCase()?.trim();
    const busDate = newBus.date;
    const bookingRef = newBus.bookingReference?.toLowerCase()?.trim();

    let isDuplicate = false;
    let isUpdate = false;
    const allBuses = [...existingBuses, ...deduplicatedBuses];

    // Match esatto: routeNumber + date oppure bookingReference
    if (routeNum && busDate) {
      isDuplicate = !!allBuses.find(b =>
        b.routeNumber?.toLowerCase()?.trim() === routeNum && b.date === busDate
      );
    } else if (bookingRef) {
      isDuplicate = !!allBuses.find(b =>
        b.bookingReference?.toLowerCase()?.trim() === bookingRef
      );
    }

    // SOFT MATCH: stesso routeNumber (senza data) o stesso bookingRef con data diversa → update
    if (!isDuplicate && existingBuses.length > 0) {
      let softMatch = null;
      if (routeNum) {
        softMatch = existingBuses.find(b =>
          b.routeNumber?.toLowerCase()?.trim() === routeNum && b.date !== busDate
        );
      }
      if (!softMatch && bookingRef) {
        softMatch = existingBuses.find(b =>
          b.bookingReference?.toLowerCase()?.trim() === bookingRef && b.date !== busDate
        );
      }
      if (softMatch) {
        const changes = diffFields(softMatch, newBus, BUS_COMPARE_FIELDS);
        if (changes.length > 0) {
          updatedBuses.push({
            type: 'bus',
            existingId: softMatch.id,
            existing: softMatch,
            incoming: newBus,
            changes,
            pdfIndex: newBus._pdfIndex
          });
          isUpdate = true;
        }
      }
    }

    if (isUpdate) {
      console.log(`Detected update for bus: ${routeNum || bookingRef}`);
    } else if (isDuplicate) {
      console.log(`Skipping duplicate bus: ${routeNum || bookingRef}`);
      skippedBuses++;
    } else {
      deduplicatedBuses.push(newBus);
    }
  }

  return { deduplicatedBuses, skippedBuses, updatedBuses };
}

const RENTAL_COMPARE_FIELDS = [
  { path: 'date', label: 'Data ritiro' },
  { path: 'endDate', label: 'Data riconsegna' },
  { path: 'pickupLocation.city', label: 'Città ritiro' },
  { path: 'pickupLocation.time', label: 'Ora ritiro' },
  { path: 'dropoffLocation.city', label: 'Città riconsegna' },
  { path: 'vehicle.category', label: 'Categoria veicolo' },
];

/**
 * Deduplica noleggi auto contro esistenti e all'interno del batch.
 * Match su bookingReference o confirmationNumber + provider + date.
 */
function deduplicateRentals(newRentals, existingRentals = []) {
  const deduplicatedRentals = [];
  let skippedRentals = 0;
  const updatedRentals = [];

  for (const newRental of newRentals) {
    const bookingRef = (newRental.bookingReference || newRental.confirmationNumber)?.toLowerCase()?.trim();
    const provider = newRental.provider?.toLowerCase()?.trim();
    const rentalDate = newRental.date;

    let isDuplicate = false;
    let isUpdate = false;
    const allRentals = [...existingRentals, ...deduplicatedRentals];

    // Match esatto: bookingRef/confirmationNumber
    if (bookingRef) {
      const exactMatch = allRentals.find(r => {
        const rRef = (r.bookingReference || r.confirmationNumber)?.toLowerCase()?.trim();
        return rRef === bookingRef && r.date === rentalDate;
      });
      if (exactMatch) isDuplicate = true;
    } else if (provider && rentalDate) {
      isDuplicate = !!allRentals.find(r =>
        r.provider?.toLowerCase()?.trim() === provider && r.date === rentalDate
      );
    }

    // SOFT MATCH: stesso bookingRef ma date diverse → potenziale update
    if (!isDuplicate && !isUpdate && bookingRef && existingRentals.length > 0) {
      const softMatch = existingRentals.find(r => {
        const rRef = (r.bookingReference || r.confirmationNumber)?.toLowerCase()?.trim();
        return rRef === bookingRef && r.date !== rentalDate;
      });
      if (softMatch) {
        const changes = diffFields(softMatch, newRental, RENTAL_COMPARE_FIELDS);
        if (changes.length > 0) {
          updatedRentals.push({
            type: 'rental',
            existingId: softMatch.id,
            existing: softMatch,
            incoming: newRental,
            changes,
            pdfIndex: newRental._pdfIndex
          });
          isUpdate = true;
        }
      }
    }

    if (isUpdate) {
      console.log(`Detected update for rental: ${bookingRef || provider}`);
    } else if (isDuplicate) {
      console.log(`Skipping duplicate rental: ${bookingRef || provider}`);
      skippedRentals++;
    } else {
      deduplicatedRentals.push(newRental);
    }
  }

  return { deduplicatedRentals, skippedRentals, updatedRentals };
}

const FERRY_COMPARE_FIELDS = [
  { path: 'date', label: 'Data' },
  { path: 'departure.time', label: 'Ora partenza' },
  { path: 'arrival.time', label: 'Ora arrivo' },
  { path: 'departure.port', label: 'Porto partenza' },
  { path: 'arrival.port', label: 'Porto arrivo' },
  { path: 'cabin', label: 'Cabina' },
];

/**
 * Deduplica traghetti contro esistenti e all'interno del batch.
 * Match su bookingReference + date oppure route + date.
 */
function deduplicateFerries(newFerries, existingFerries = []) {
  const deduplicatedFerries = [];
  let skippedFerries = 0;
  const updatedFerries = [];

  for (const newFerry of newFerries) {
    const bookingRef = newFerry.bookingReference?.toLowerCase()?.trim();
    const depPort = (newFerry.departure?.port || newFerry.departure?.city)?.toLowerCase()?.trim();
    const arrPort = (newFerry.arrival?.port || newFerry.arrival?.city)?.toLowerCase()?.trim();
    const ferryDate = newFerry.date;

    let isDuplicate = false;
    let isUpdate = false;
    const allFerries = [...existingFerries, ...deduplicatedFerries];

    // Match esatto: bookingRef + date
    if (bookingRef && ferryDate) {
      const exactMatch = allFerries.find(f => {
        const fRef = f.bookingReference?.toLowerCase()?.trim();
        return fRef === bookingRef && f.date === ferryDate;
      });
      if (exactMatch) isDuplicate = true;
    } else if (depPort && arrPort && ferryDate) {
      // Match per rotta + data
      isDuplicate = !!allFerries.find(f => {
        const fDep = (f.departure?.port || f.departure?.city)?.toLowerCase()?.trim();
        const fArr = (f.arrival?.port || f.arrival?.city)?.toLowerCase()?.trim();
        return fDep === depPort && fArr === arrPort && f.date === ferryDate;
      });
    }

    // SOFT MATCH: stesso bookingRef ma data diversa → potenziale update
    if (!isDuplicate && !isUpdate && bookingRef && existingFerries.length > 0) {
      const softMatch = existingFerries.find(f => {
        const fRef = f.bookingReference?.toLowerCase()?.trim();
        return fRef === bookingRef && f.date !== ferryDate;
      });
      if (softMatch) {
        const changes = diffFields(softMatch, newFerry, FERRY_COMPARE_FIELDS);
        if (changes.length > 0) {
          updatedFerries.push({
            type: 'ferry',
            existingId: softMatch.id,
            existing: softMatch,
            incoming: newFerry,
            changes,
            pdfIndex: newFerry._pdfIndex
          });
          isUpdate = true;
        }
      }
    }

    if (isUpdate) {
      console.log(`Detected update for ferry: ${bookingRef || `${depPort}→${arrPort}`}`);
    } else if (isDuplicate) {
      console.log(`Skipping duplicate ferry: ${bookingRef || `${depPort}→${arrPort}`}`);
      skippedFerries++;
    } else {
      deduplicatedFerries.push(newFerry);
    }
  }

  return { deduplicatedFerries, skippedFerries, updatedFerries };
}

module.exports = { deduplicateFlights, deduplicateHotels, deduplicateTrains, deduplicateBuses, deduplicateRentals, deduplicateFerries };
