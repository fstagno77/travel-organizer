/**
 * Script to migrate static trips to Supabase
 * Run with: node scripts/migrate-trips.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function migrateTrips() {
  const tripsDir = path.join(__dirname, '..', 'trips');
  const tripFolders = fs.readdirSync(tripsDir);

  console.log(`Found ${tripFolders.length} trip folders`);

  for (const folder of tripFolders) {
    const tripJsonPath = path.join(tripsDir, folder, 'trip.json');

    if (!fs.existsSync(tripJsonPath)) {
      console.log(`Skipping ${folder} - no trip.json found`);
      continue;
    }

    try {
      const tripData = JSON.parse(fs.readFileSync(tripJsonPath, 'utf-8'));
      console.log(`Migrating: ${tripData.id} - ${tripData.title.en || tripData.title.it}`);

      const { error } = await supabase
        .from('trips')
        .upsert({
          id: tripData.id,
          data: tripData,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Error migrating ${tripData.id}:`, error);
      } else {
        console.log(`Successfully migrated: ${tripData.id}`);
      }
    } catch (err) {
      console.error(`Error processing ${folder}:`, err.message);
    }
  }

  console.log('Migration complete!');
}

migrateTrips();
