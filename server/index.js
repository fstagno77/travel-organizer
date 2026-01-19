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
  try {
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

// Process PDF - accepts same format as Netlify function (JSON with base64 PDFs)
app.post('/.netlify/functions/process-pdf', async (req, res) => {
  const pdfProcessor = require('./services/pdfProcessor');
  const supabaseService = require('./services/supabase');

  try {
    const { pdfs } = req.body;

    if (!pdfs || pdfs.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files provided' });
    }

    console.log(`Processing ${pdfs.length} PDF file(s)...`);

    // Convert base64 PDFs to buffer format for pdfProcessor
    const files = pdfs.map(pdf => ({
      originalname: pdf.filename,
      buffer: Buffer.from(pdf.content, 'base64')
    }));

    // Process all PDFs
    const extractedData = await pdfProcessor.processMultiplePdfs(files);

    if (!extractedData.flights.length && !extractedData.hotels.length) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any travel data from the uploaded PDFs'
      });
    }

    // Create trip data
    const tripData = createTripFromExtractedData(extractedData);

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

    // Convert base64 PDFs to buffer format for pdfProcessor
    const files = pdfs.map(pdf => ({
      originalname: pdf.filename,
      buffer: Buffer.from(pdf.content, 'base64')
    }));

    // Process all PDFs
    const extractedData = await pdfProcessor.processMultiplePdfs(files);

    if (!extractedData.flights.length && !extractedData.hotels.length) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any travel data from the uploaded PDFs'
      });
    }

    // Add new bookings to trip
    const existingFlightCount = tripData.flights?.length || 0;
    const existingHotelCount = tripData.hotels?.length || 0;

    const flightsWithIds = extractedData.flights.map((f, i) => ({
      ...f,
      id: `flight-${existingFlightCount + i + 1}`
    }));

    const hotelsWithIds = extractedData.hotels.map((h, i) => ({
      ...h,
      id: `hotel-${existingHotelCount + i + 1}`
    }));

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
        flights: extractedData.flights.length,
        hotels: extractedData.hotels.length
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
