/**
 * Supabase Service
 * Database operations for trips
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Get all trips from Supabase
 * @returns {Promise<Array>} Array of trip summaries
 */
async function getAllTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, data, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch trips');
  }

  // Extract trip data and format for frontend
  return data.map(row => ({
    id: row.data.id,
    folder: row.data.id,
    title: row.data.title,
    destination: row.data.destination,
    startDate: row.data.startDate,
    endDate: row.data.endDate,
    route: row.data.route,
    color: '#0066cc'
  }));
}

/**
 * Get a single trip by ID
 * @param {string} tripId - The trip ID
 * @returns {Promise<Object>} Trip data
 */
async function getTripById(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('data')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Trip not found');
  }

  return data.data;
}

/**
 * Save or update a trip
 * @param {Object} tripData - The complete trip data
 * @returns {Promise<void>}
 */
async function saveTrip(tripData) {
  const { error } = await supabase
    .from('trips')
    .upsert({
      id: tripData.id,
      data: tripData,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to save trip');
  }
}

/**
 * Delete a trip by ID
 * @param {string} tripId - The trip ID
 * @returns {Promise<void>}
 */
async function deleteTrip(tripId) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to delete trip');
  }
}

/**
 * Rename a trip
 * @param {string} tripId - The trip ID
 * @param {string} newName - The new name
 * @returns {Promise<void>}
 */
async function renameTrip(tripId, newName) {
  // First get the trip
  const tripData = await getTripById(tripId);

  // Update the title
  tripData.title = {
    it: newName,
    en: newName
  };

  // Save it back
  await saveTrip(tripData);
}

module.exports = {
  getAllTrips,
  getTripById,
  saveTrip,
  deleteTrip,
  renameTrip
};
