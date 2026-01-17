/**
 * Trips API Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfProcessor = require('../services/pdfProcessor');

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * POST /api/trips/process-pdf
 * Process uploaded PDF documents and create a new trip
 */
router.post('/process-pdf', upload.array('pdfs', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files uploaded'
      });
    }

    console.log(`Processing ${req.files.length} PDF file(s)...`);

    // Process all PDFs and extract travel data
    const extractedData = await pdfProcessor.processMultiplePdfs(req.files);

    if (!extractedData.flights.length && !extractedData.hotels.length) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any travel data from the uploaded PDFs'
      });
    }

    // Generate trip ID and create trip data
    const tripData = await createTripFromExtractedData(extractedData);

    // Save trip to filesystem
    const tripUrl = await saveTrip(tripData);

    res.json({
      success: true,
      tripUrl,
      tripId: tripData.id,
      summary: {
        flights: tripData.flights.length,
        hotels: tripData.hotels.length
      }
    });

  } catch (error) {
    console.error('Error processing PDFs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process PDF documents'
    });
  }
});

/**
 * POST /api/trips/add-documents
 * Add flights or hotels to an existing trip from PDF documents
 */
router.post('/add-documents', upload.array('pdfs', 10), async (req, res) => {
  try {
    const { tripId, type } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files uploaded'
      });
    }

    if (!tripId) {
      return res.status(400).json({
        success: false,
        error: 'Trip ID is required'
      });
    }

    console.log(`Adding ${type} documents to trip ${tripId}...`);

    // Process PDFs
    const extractedData = await pdfProcessor.processMultiplePdfs(req.files);

    // Load existing trip data
    const tripJsonPath = path.join(__dirname, '..', '..', 'trips', tripId, 'trip.json');
    let tripData;

    try {
      const tripContent = await fs.readFile(tripJsonPath, 'utf-8');
      tripData = JSON.parse(tripContent);
    } catch (e) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }

    // Add extracted data to trip
    let addedCount = 0;

    if (type === 'flight' && extractedData.flights.length > 0) {
      // Generate IDs for new flights
      const maxFlightId = tripData.flights.reduce((max, f) => {
        const num = parseInt(f.id?.replace('flight-', '') || '0');
        return num > max ? num : max;
      }, 0);

      extractedData.flights.forEach((flight, i) => {
        flight.id = `flight-${maxFlightId + i + 1}`;
        tripData.flights.push(flight);
      });

      // Sort flights by date
      tripData.flights.sort((a, b) => new Date(a.date) - new Date(b.date));
      addedCount = extractedData.flights.length;

    } else if (type === 'hotel' && extractedData.hotels.length > 0) {
      // Generate IDs for new hotels
      const maxHotelId = tripData.hotels.reduce((max, h) => {
        const num = parseInt(h.id?.replace('hotel-', '') || '0');
        return num > max ? num : max;
      }, 0);

      extractedData.hotels.forEach((hotel, i) => {
        hotel.id = `hotel-${maxHotelId + i + 1}`;
        tripData.hotels.push(hotel);
      });

      // Sort hotels by check-in date
      tripData.hotels.sort((a, b) => new Date(a.checkIn.date) - new Date(b.checkIn.date));
      addedCount = extractedData.hotels.length;
    }

    if (addedCount === 0) {
      return res.status(400).json({
        success: false,
        error: `No ${type} data found in the uploaded PDFs`
      });
    }

    // Update trip dates if needed
    if (tripData.flights.length > 0) {
      tripData.startDate = tripData.flights[0].date;
      tripData.endDate = tripData.flights[tripData.flights.length - 1].date;
    }

    // Save updated trip data
    await fs.writeFile(tripJsonPath, JSON.stringify(tripData, null, 2));

    // Update trips index with new dates
    const tripsIndexPath = path.join(__dirname, '..', '..', 'data', 'trips.json');
    try {
      const indexContent = await fs.readFile(tripsIndexPath, 'utf-8');
      const tripsIndex = JSON.parse(indexContent);
      const tripIndex = tripsIndex.trips.findIndex(t => t.id === tripId);
      if (tripIndex !== -1) {
        tripsIndex.trips[tripIndex].startDate = tripData.startDate;
        tripsIndex.trips[tripIndex].endDate = tripData.endDate;
        await fs.writeFile(tripsIndexPath, JSON.stringify(tripsIndex, null, 2));
      }
    } catch (e) {
      // Index update failed, but trip was saved
    }

    res.json({
      success: true,
      added: addedCount,
      type
    });

  } catch (error) {
    console.error('Error adding documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add documents'
    });
  }
});

/**
 * Create trip data structure from extracted data
 */
async function createTripFromExtractedData(data) {
  const { flights, hotels, metadata } = data;

  // Determine trip dates from flights/hotels
  let startDate = null;
  let endDate = null;
  let destination = '';

  if (flights.length > 0) {
    // Sort flights by date
    flights.sort((a, b) => new Date(a.date) - new Date(b.date));
    startDate = flights[0].date;
    endDate = flights[flights.length - 1].date;

    // Get destination from first arriving flight that's not the departure city
    const departureCode = flights[0].departure.code;
    const arrivalFlight = flights.find(f => f.arrival.code !== departureCode);
    if (arrivalFlight) {
      destination = arrivalFlight.arrival.city;
    }
  }

  if (hotels.length > 0) {
    // If no flights, use hotel dates
    if (!startDate) {
      startDate = hotels[0].checkIn.date;
    }
    if (!endDate) {
      endDate = hotels[hotels.length - 1].checkOut.date;
    }
    if (!destination) {
      destination = hotels[0].address.city;
    }
  }

  // Generate trip ID
  const date = new Date(startDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const destSlug = destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  const tripId = `${year}-${month}-${destSlug}`;

  // Build route string
  let route = '';
  if (flights.length > 0) {
    const codes = [flights[0].departure.code];
    flights.forEach(f => {
      if (codes[codes.length - 1] !== f.arrival.code) {
        codes.push(f.arrival.code);
      }
    });
    route = codes.join(' → ');
  }

  return {
    id: tripId,
    title: {
      it: `Viaggio a ${destination}`,
      en: `${destination} Trip`
    },
    destination,
    startDate,
    endDate,
    route,
    passenger: metadata.passenger || {
      name: '',
      type: 'ADT'
    },
    flights: flights.map((f, i) => ({ ...f, id: `flight-${i + 1}` })),
    hotels: hotels.map((h, i) => ({ ...h, id: `hotel-${i + 1}` })),
    booking: metadata.booking || null
  };
}

/**
 * Save trip to filesystem
 */
async function saveTrip(tripData) {
  const tripsDir = path.join(__dirname, '..', '..', 'trips');
  const tripDir = path.join(tripsDir, tripData.id);

  // Create trip directory
  await fs.mkdir(tripDir, { recursive: true });

  // Save trip.json
  await fs.writeFile(
    path.join(tripDir, 'trip.json'),
    JSON.stringify(tripData, null, 2)
  );

  // Create index.html for the trip
  const indexHtml = generateTripHtml(tripData);
  await fs.writeFile(
    path.join(tripDir, 'index.html'),
    indexHtml
  );

  // Update trips index
  await updateTripsIndex(tripData);

  return `trips/${tripData.id}/index.html`;
}

/**
 * Generate trip page HTML
 */
function generateTripHtml(tripData) {
  const startDate = new Date(tripData.startDate);
  const endDate = new Date(tripData.endDate);
  const dateStr = `${startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tripData.title.en} - Travel Organizer</title>

  <!-- CSS -->
  <link rel="stylesheet" href="../../css/reset.css">
  <link rel="stylesheet" href="../../css/variables.css">
  <link rel="stylesheet" href="../../css/base.css">
  <link rel="stylesheet" href="../../css/components.css">
  <link rel="stylesheet" href="../../css/layout.css">
  <link rel="stylesheet" href="../../css/utilities.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="page-wrapper">
    <div id="header-placeholder"></div>

    <div class="trip-header">
      <div class="container">
        <h1>${tripData.title.en}</h1>
        <div class="trip-meta">
          <div class="trip-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="trip-meta-date">${dateStr}</span>
          </div>
        </div>
      </div>
    </div>

    <main>
      <div class="container">
        <div id="trip-content">
          <div class="text-center py-6">
            <span class="spinner"></span>
          </div>
        </div>
      </div>
    </main>

    <div id="footer-placeholder"></div>
  </div>

  <!-- JS -->
  <script src="../../js/utils.js"></script>
  <script src="../../js/i18n.js"></script>
  <script src="../../js/navigation.js"></script>
  <script src="../../js/main.js"></script>
  <script src="../../js/tripCreator.js"></script>
</body>
</html>
`;
}

/**
 * Update the trips index file
 */
async function updateTripsIndex(tripData) {
  const tripsIndexPath = path.join(__dirname, '..', '..', 'data', 'trips.json');

  let tripsIndex = { trips: [] };
  try {
    const content = await fs.readFile(tripsIndexPath, 'utf-8');
    tripsIndex = JSON.parse(content);
  } catch (e) {
    // File doesn't exist or is invalid, start fresh
  }

  // Check if trip already exists
  const existingIndex = tripsIndex.trips.findIndex(t => t.id === tripData.id);

  const tripEntry = {
    id: tripData.id,
    folder: tripData.id,
    title: tripData.title,
    destination: tripData.destination,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    route: tripData.route,
    color: '#0066cc'
  };

  if (existingIndex >= 0) {
    tripsIndex.trips[existingIndex] = tripEntry;
  } else {
    tripsIndex.trips.push(tripEntry);
  }

  // Sort trips by start date (newest first)
  tripsIndex.trips.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  await fs.writeFile(tripsIndexPath, JSON.stringify(tripsIndex, null, 2));
}

/**
 * PUT /api/trips/:id/rename
 * Rename a trip
 */
router.put('/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const tripsIndexPath = path.join(__dirname, '..', '..', 'data', 'trips.json');
    const tripJsonPath = path.join(__dirname, '..', '..', 'trips', id, 'trip.json');

    // Update trips index
    const tripsIndexContent = await fs.readFile(tripsIndexPath, 'utf-8');
    const tripsIndex = JSON.parse(tripsIndexContent);

    const tripIndex = tripsIndex.trips.findIndex(t => t.id === id);
    if (tripIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }

    // Update title in both languages
    tripsIndex.trips[tripIndex].title = {
      it: name.trim(),
      en: name.trim()
    };

    await fs.writeFile(tripsIndexPath, JSON.stringify(tripsIndex, null, 2));

    // Update trip.json
    try {
      const tripContent = await fs.readFile(tripJsonPath, 'utf-8');
      const tripData = JSON.parse(tripContent);
      tripData.title = {
        it: name.trim(),
        en: name.trim()
      };
      await fs.writeFile(tripJsonPath, JSON.stringify(tripData, null, 2));
    } catch (e) {
      // trip.json might not exist for manually created trips
    }

    res.json({
      success: true,
      message: 'Trip renamed successfully'
    });

  } catch (error) {
    console.error('Error renaming trip:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rename trip'
    });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tripsIndexPath = path.join(__dirname, '..', '..', 'data', 'trips.json');
    const tripDir = path.join(__dirname, '..', '..', 'trips', id);

    // Update trips index
    const tripsIndexContent = await fs.readFile(tripsIndexPath, 'utf-8');
    const tripsIndex = JSON.parse(tripsIndexContent);

    const tripIndex = tripsIndex.trips.findIndex(t => t.id === id);
    if (tripIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }

    // Remove from index
    tripsIndex.trips.splice(tripIndex, 1);
    await fs.writeFile(tripsIndexPath, JSON.stringify(tripsIndex, null, 2));

    // Delete trip directory
    try {
      await fs.rm(tripDir, { recursive: true, force: true });
    } catch (e) {
      // Directory might not exist
    }

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete trip'
    });
  }
});

module.exports = router;
