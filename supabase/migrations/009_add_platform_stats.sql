-- Migration 009: Add platform_stats table for login page statistics
-- Stores cached aggregate stats (total trips, travel days, activities)

CREATE TABLE IF NOT EXISTS platform_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_trips INTEGER NOT NULL DEFAULT 0,
  total_travel_days INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row so upsert always works
INSERT INTO platform_stats (id, total_trips, total_travel_days, total_activities, updated_at)
VALUES (1, 0, 0, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access (used by get-platform-stats function)
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Public read access (stats are intentionally public)
CREATE POLICY "Public can read platform stats"
  ON platform_stats FOR SELECT
  USING (true);

-- Only service role can write (functions use service key)
CREATE POLICY "Service role can update platform stats"
  ON platform_stats FOR ALL
  USING (auth.role() = 'service_role');
