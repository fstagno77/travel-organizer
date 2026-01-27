/**
 * Travel Organizer - Express Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/trips', require('./routes/trips'));

// Redirect Netlify function calls to local API (for local development)
app.get('/.netlify/functions/get-trips', (req, res) => {
  res.redirect('/api/trips');
});
app.get('/.netlify/functions/get-trip', (req, res) => {
  const tripId = req.query.id;
  res.redirect(`/api/trips/${tripId}`);
});
app.post('/.netlify/functions/upload-pdfs', (req, res, next) => {
  req.url = '/api/trips/upload';
  next();
});
app.post('/.netlify/functions/save-trip', express.json(), (req, res, next) => {
  req.url = '/api/trips';
  next();
});
app.put('/.netlify/functions/update-trip', express.json(), (req, res, next) => {
  const tripId = req.query.id;
  req.url = `/api/trips/${tripId}`;
  next();
});
app.delete('/.netlify/functions/delete-trip', async (req, res) => {
  const tripId = req.query.id;
  const supabaseService = require('./services/supabase');
  const { deleteAllTripPdfs } = require('./services/storage');
  try {
    // Delete all PDFs for this trip
    await deleteAllTripPdfs(tripId);
    // Delete trip from database
    await supabaseService.deleteTrip(tripId);
    res.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/.netlify/functions/rename-trip', async (req, res) => {
  const { tripId, title } = req.body;
  const supabaseService = require('./services/supabase');
  try {
    await supabaseService.renameTrip(tripId, title);
    const tripData = await supabaseService.getTripById(tripId);
    res.json({ success: true, tripData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get PDF download URL
app.get('/.netlify/functions/get-pdf-url', async (req, res) => {
  const { getPdfSignedUrl } = require('./services/storage');
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ success: false, error: 'Path is required' });
  }

  // Validate path format
  if (!path.match(/^trips\/[^/]+\/[^/]+\.pdf$/)) {
    return res.status(400).json({ success: false, error: 'Invalid path format' });
  }

  try {
    const signedUrl = await getPdfSignedUrl(path);
    res.json({ success: true, url: signedUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete booking (flight or hotel) from trip
app.post('/.netlify/functions/delete-booking', async (req, res) => {
  const supabaseService = require('./services/supabase');
  const { deletePdf } = require('./services/storage');

  try {
    const { tripId, type, itemId } = req.body;

    if (!tripId) {
      return res.status(400).json({ success: false, error: 'Trip ID is required' });
    }
    if (!type || !['flight', 'hotel'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type must be "flight" or "hotel"' });
    }
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    // Get existing trip
    let tripData;
    try {
      tripData = await supabaseService.getTripById(tripId);
    } catch (e) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    // Find and delete the item
    if (type === 'flight') {
      const flightToDelete = (tripData.flights || []).find(f => f.id === itemId);
      if (!flightToDelete) {
        return res.status(404).json({ success: false, error: 'Flight not found' });
      }
      // Delete associated PDF
      if (flightToDelete.pdfPath) {
        await deletePdf(flightToDelete.pdfPath);
      }
      tripData.flights = tripData.flights.filter(f => f.id !== itemId);
    } else {
      const hotelToDelete = (tripData.hotels || []).find(h => h.id === itemId);
      if (!hotelToDelete) {
        return res.status(404).json({ success: false, error: 'Hotel not found' });
      }
      // Delete associated PDF
      if (hotelToDelete.pdfPath) {
        await deletePdf(hotelToDelete.pdfPath);
      }
      tripData.hotels = tripData.hotels.filter(h => h.id !== itemId);
    }

    // Update dates
    const dates = [];
    tripData.flights?.forEach(f => { if (f.date) dates.push(new Date(f.date)); });
    tripData.hotels?.forEach(h => {
      if (h.checkIn?.date) dates.push(new Date(h.checkIn.date));
      if (h.checkOut?.date) dates.push(new Date(h.checkOut.date));
    });
    if (dates.length > 0) {
      dates.sort((a, b) => a - b);
      tripData.startDate = dates[0].toISOString().split('T')[0];
      tripData.endDate = dates[dates.length - 1].toISOString().split('T')[0];
    }

    // Update route
    if (tripData.flights && tripData.flights.length > 0) {
      const sortedFlights = [...tripData.flights].sort((a, b) => new Date(a.date) - new Date(b.date));
      const departures = sortedFlights.map(f => f.departure?.code).filter(Boolean);
      const arrivals = sortedFlights.map(f => f.arrival?.code).filter(Boolean);
      tripData.route = [departures[0], ...arrivals].join(' → ');
    }

    // Save updated trip
    await supabaseService.saveTrip(tripData);
    res.json({ success: true, tripData });

  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process PDF - accepts same format as Netlify function (JSON with base64 PDFs)
app.post('/.netlify/functions/process-pdf', async (req, res) => {
  const pdfProcessor = require('./services/pdfProcessor');
  const supabaseService = require('./services/supabase');
  const { uploadPdf } = require('./services/storage');

  try {
    const { pdfs } = req.body;

    if (!pdfs || pdfs.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files provided' });
    }

    console.log(`Processing ${pdfs.length} PDF file(s)...`);

    // Process each PDF and track which items came from which PDF
    const allFlights = [];
    const allHotels = [];
    let metadata = {};

    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];
      const file = {
        originalname: pdf.filename,
        buffer: Buffer.from(pdf.content, 'base64')
      };

      const extractedData = await pdfProcessor.processMultiplePdfs([file]);

      if (extractedData.flights) {
        extractedData.flights.forEach(f => {
          f._pdfIndex = pdfIndex;
          allFlights.push(f);
        });
      }
      if (extractedData.hotels) {
        extractedData.hotels.forEach(h => {
          h._pdfIndex = pdfIndex;
          allHotels.push(h);
        });
      }
      if (extractedData.metadata?.passenger) {
        metadata.passenger = extractedData.metadata.passenger;
      }
      if (extractedData.metadata?.booking) {
        metadata.booking = extractedData.metadata.booking;
      }
    }

    if (!allFlights.length && !allHotels.length) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any travel data from the uploaded PDFs'
      });
    }

    // Create trip data
    const tripData = createTripFromExtractedData({ flights: allFlights, hotels: allHotels, metadata });

    // Upload PDFs and link to items
    console.log('Uploading PDFs to storage...');
    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];
      const flightsFromPdf = tripData.flights.filter(f => f._pdfIndex === pdfIndex);
      const hotelsFromPdf = tripData.hotels.filter(h => h._pdfIndex === pdfIndex);

      if (flightsFromPdf.length > 0 || hotelsFromPdf.length > 0) {
        try {
          for (const flight of flightsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripData.id, flight.id);
            flight.pdfPath = pdfPath;
          }
          for (const hotel of hotelsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripData.id, hotel.id);
            hotel.pdfPath = pdfPath;
          }
        } catch (uploadError) {
          console.error(`Error uploading PDF ${pdf.filename}:`, uploadError);
        }
      }
    }

    // Clean up temporary markers
    tripData.flights.forEach(f => delete f._pdfIndex);
    tripData.hotels.forEach(h => delete h._pdfIndex);

    // Save to Supabase
    await supabaseService.saveTrip(tripData);

    res.json({
      success: true,
      tripData,
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

// Helper function to create trip data from extracted data
function createTripFromExtractedData(data) {
  const { flights, hotels, metadata } = data;

  let startDate = null;
  let endDate = null;
  let destination = '';

  if (flights.length > 0) {
    flights.sort((a, b) => new Date(a.date) - new Date(b.date));
    startDate = flights[0].date;
    endDate = flights[flights.length - 1].date;

    const departureCode = flights[0].departure.code;
    const arrivalFlight = flights.find(f => f.arrival.code !== departureCode);
    if (arrivalFlight) {
      destination = arrivalFlight.arrival.city;
    }
  }

  if (hotels.length > 0) {
    if (!startDate) startDate = hotels[0].checkIn.date;
    if (!endDate) endDate = hotels[hotels.length - 1].checkOut.date;
    if (!destination) destination = hotels[0].address.city;
  }

  const date = new Date(startDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const destSlug = destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  const tripId = `${year}-${month}-${destSlug}`;

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
    passenger: metadata?.passenger || { name: '', type: 'ADT' },
    flights: flights.map((f, i) => ({ ...f, id: `flight-${i + 1}` })),
    hotels: hotels.map((h, i) => ({ ...h, id: `hotel-${i + 1}` })),
    booking: metadata?.booking || null
  };
}

// Add booking to existing trip - accepts same format as Netlify function
app.post('/.netlify/functions/add-booking', async (req, res) => {
  const pdfProcessor = require('./services/pdfProcessor');
  const supabaseService = require('./services/supabase');
  const { uploadPdf } = require('./services/storage');

  try {
    const { pdfs, tripId } = req.body;

    if (!pdfs || pdfs.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files provided' });
    }

    if (!tripId) {
      return res.status(400).json({ success: false, error: 'Trip ID is required' });
    }

    console.log(`Adding booking to trip ${tripId}, processing ${pdfs.length} PDF file(s)...`);

    // Get existing trip from Supabase
    let tripData;
    try {
      tripData = await supabaseService.getTripById(tripId);
    } catch (e) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    // Process each PDF and track which items came from which PDF
    const newFlights = [];
    const newHotels = [];

    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];
      const file = {
        originalname: pdf.filename,
        buffer: Buffer.from(pdf.content, 'base64')
      };

      const extractedData = await pdfProcessor.processMultiplePdfs([file]);

      if (extractedData.flights) {
        extractedData.flights.forEach(f => {
          f._pdfIndex = pdfIndex;
          newFlights.push(f);
        });
      }
      if (extractedData.hotels) {
        extractedData.hotels.forEach(h => {
          h._pdfIndex = pdfIndex;
          newHotels.push(h);
        });
      }
    }

    if (!newFlights.length && !newHotels.length) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any travel data from the uploaded PDFs'
      });
    }

    // Add new bookings to trip with IDs
    const existingFlightCount = tripData.flights?.length || 0;
    const existingHotelCount = tripData.hotels?.length || 0;

    const flightsWithIds = newFlights.map((f, i) => ({
      ...f,
      id: `flight-${existingFlightCount + i + 1}`
    }));

    const hotelsWithIds = newHotels.map((h, i) => ({
      ...h,
      id: `hotel-${existingHotelCount + i + 1}`
    }));

    // Upload PDFs and link to items
    console.log('Uploading PDFs to storage...');
    for (let pdfIndex = 0; pdfIndex < pdfs.length; pdfIndex++) {
      const pdf = pdfs[pdfIndex];
      const flightsFromPdf = flightsWithIds.filter(f => f._pdfIndex === pdfIndex);
      const hotelsFromPdf = hotelsWithIds.filter(h => h._pdfIndex === pdfIndex);

      if (flightsFromPdf.length > 0 || hotelsFromPdf.length > 0) {
        try {
          for (const flight of flightsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripId, flight.id);
            flight.pdfPath = pdfPath;
          }
          for (const hotel of hotelsFromPdf) {
            const pdfPath = await uploadPdf(pdf.content, tripId, hotel.id);
            hotel.pdfPath = pdfPath;
          }
        } catch (uploadError) {
          console.error(`Error uploading PDF ${pdf.filename}:`, uploadError);
        }
      }
    }

    // Clean up temporary markers
    flightsWithIds.forEach(f => delete f._pdfIndex);
    hotelsWithIds.forEach(h => delete h._pdfIndex);

    tripData.flights = [...(tripData.flights || []), ...flightsWithIds];
    tripData.hotels = [...(tripData.hotels || []), ...hotelsWithIds];

    // Update dates
    const dates = [];
    tripData.flights.forEach(f => { if (f.date) dates.push(new Date(f.date)); });
    tripData.hotels.forEach(h => {
      if (h.checkIn?.date) dates.push(new Date(h.checkIn.date));
      if (h.checkOut?.date) dates.push(new Date(h.checkOut.date));
    });
    if (dates.length > 0) {
      dates.sort((a, b) => a - b);
      tripData.startDate = dates[0].toISOString().split('T')[0];
      tripData.endDate = dates[dates.length - 1].toISOString().split('T')[0];
    }

    // Save updated trip to Supabase
    await supabaseService.saveTrip(tripData);

    res.json({
      success: true,
      tripData,
      added: {
        flights: newFlights.length,
        hotels: newHotels.length
      }
    });

  } catch (error) {
    console.error('Error adding booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process PDF documents'
    });
  }
});

// Fallback to index.html for SPA-like behavior
app.get('*', (req, res) => {
  // If requesting an API route that doesn't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Otherwise serve the requested file or index.html
  res.sendFile(path.join(__dirname, '..', req.path));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Travel Organizer server running at http://localhost:${PORT}`);
});
