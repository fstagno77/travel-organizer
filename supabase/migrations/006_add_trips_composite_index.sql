-- Composite index on (user_id, created_at DESC) for the trips table.
-- Optimizes the home page query in get-trips.js which filters by user_id (via RLS)
-- and orders by created_at DESC, allowing PostgreSQL to satisfy both the filter
-- and the sort directly from the index without an in-memory sort.
CREATE INDEX IF NOT EXISTS idx_trips_user_id_created_at ON public.trips(user_id, created_at DESC);
