/**
 * Trips API Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfProcessor = require('../services/pdfProcessor');
const supabaseService = require('../services/supabase');

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
 * GET /api/trips
 * Get all trips from Supabase
 */
router.get('/', async (req, res) => {
  try {
    const trips = await supabaseService.getAllTrips();
    res.json({ success: true, trips });
  } catch (error) {
    console.error('Error getting trips:', error);
    res.json({ success: true, trips: [] });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip by ID from Supabase
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await supabaseService.getTripById(id);
    res.json({ success: true, tripData });
  } catch (error) {
    console.error('Error getting trip:', error);
    res.status(404).json({ success: false, error: 'Trip not found' });
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

    // Save trip to Supabase
    await supabaseService.saveTrip(tripData);

    res.json({
      success: true,
      tripData,
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

    // Load existing trip data from Supabase
    let tripData;

    try {
      tripData = await supabaseService.getTripById(tripId);
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

    // Save updated trip data to Supabase
    await supabaseService.saveTrip(tripData);

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
 * POST /api/trips/add-booking
 * Add flights and/or hotels to an existing trip (AI determines type automatically)
 */
router.post('/add-booking', upload.array('pdfs', 10), async (req, res) => {
  try {
    const { tripId } = req.body;

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

    console.log(`Adding booking documents to trip ${tripId}...`);

    // Process PDFs - AI will extract both flights and hotels
    const extractedData = await pdfProcessor.processMultiplePdfs(req.files);

    // Load existing trip data from Supabase
    let tripData;

    try {
      tripData = await supabaseService.getTripById(tripId);
    } catch (e) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }

    let addedFlights = 0;
    let addedHotels = 0;

    // Add flights if found
    if (extractedData.flights && extractedData.flights.length > 0) {
      const maxFlightId = tripData.flights.reduce((max, f) => {
        const num = parseInt(f.id?.replace('flight-', '') || '0');
        return num > max ? num : max;
      }, 0);

      extractedData.flights.forEach((flight, i) => {
        flight.id = `flight-${maxFlightId + i + 1}`;
        tripData.flights.push(flight);
      });

      tripData.flights.sort((a, b) => new Date(a.date) - new Date(b.date));
      addedFlights = extractedData.flights.length;
    }

    // Add hotels if found
    if (extractedData.hotels && extractedData.hotels.length > 0) {
      const maxHotelId = tripData.hotels.reduce((max, h) => {
        const num = parseInt(h.id?.replace('hotel-', '') || '0');
        return num > max ? num : max;
      }, 0);

      extractedData.hotels.forEach((hotel, i) => {
        hotel.id = `hotel-${maxHotelId + i + 1}`;
        tripData.hotels.push(hotel);
      });

      tripData.hotels.sort((a, b) => new Date(a.checkIn.date) - new Date(b.checkIn.date));
      addedHotels = extractedData.hotels.length;
    }

    if (addedFlights === 0 && addedHotels === 0) {
      return res.status(400).json({
        success: false,
        error: 'No booking data found in the uploaded PDFs'
      });
    }

    // Update trip dates if needed
    if (tripData.flights.length > 0) {
      tripData.startDate = tripData.flights[0].date;
      tripData.endDate = tripData.flights[tripData.flights.length - 1].date;
    }

    // Save updated trip data to Supabase
    await supabaseService.saveTrip(tripData);

    res.json({
      success: true,
      addedFlights,
      addedHotels
    });

  } catch (error) {
    console.error('Error adding booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add booking'
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

  // Create share.html for shared view
  const shareHtml = generateShareHtml(tripData);
  await fs.writeFile(
    path.join(tripDir, 'share.html'),
    shareHtml
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

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="../../assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="../../assets/icons/apple-touch-icon.svg">
  <meta name="theme-color" content="#2563eb">

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
 * Generate share page HTML (minimal view without navigation)
 */
function generateShareHtml(tripData) {
  const startDate = new Date(tripData.startDate);
  const endDate = new Date(tripData.endDate);
  const dateStr = `${startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tripData.title.en} - Travel Organizer</title>

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="../../assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="../../assets/icons/apple-touch-icon.svg">
  <meta name="theme-color" content="#2563eb">

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
<body class="shared-view">
  <div class="page-wrapper">
    <!-- Minimal header for shared view -->
    <header class="header header-shared">
      <div class="container">
        <div class="header-inner">
          <div class="header-logo header-logo-static">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.8 3.2-2.1 2.1-2.4-.6c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l2.2 2.2 2.2 2.2c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.6-2.4 2.1-2.1 3.2 4.8c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
            <span data-i18n="app.name">Travel Organizer</span>
          </div>
        </div>
      </div>
    </header>

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

    <!-- Minimal footer for shared view -->
    <footer class="footer">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-left">
            <div class="footer-copyright">
              Travel Organizer
            </div>
          </div>
          <div class="lang-selector">
            <button class="lang-selector-btn" aria-expanded="false" aria-haspopup="true">
              <span class="lang-flag"></span>
              <span class="lang-current"></span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="lang-dropdown lang-dropdown-up" role="menu">
              <button class="lang-option" data-lang="it" role="menuitem">
                <span>🇮🇹</span>
                <span>Italiano</span>
              </button>
              <button class="lang-option" data-lang="en" role="menuitem">
                <span>🇬🇧</span>
                <span>English</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- JS -->
  <script src="../../js/utils.js"></script>
  <script src="../../js/i18n.js"></script>
  <script src="../../js/share.js"></script>
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

    await supabaseService.renameTrip(id, name.trim());

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

    await supabaseService.deleteTrip(id);

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
