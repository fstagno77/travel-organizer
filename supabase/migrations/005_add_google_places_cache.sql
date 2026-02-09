-- Migration: Add Google Places cache table (shared across all users)
-- Run this in Supabase SQL Editor

-- ============================================
-- PHASE 1: Create google_places_cache table
-- ============================================

CREATE TABLE IF NOT EXISTS public.google_places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolved_url TEXT NOT NULL UNIQUE,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast URL lookups
CREATE INDEX IF NOT EXISTS idx_places_cache_resolved_url ON public.google_places_cache(resolved_url);

-- Index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_places_cache_fetched_at ON public.google_places_cache(fetched_at);

-- ============================================
-- PHASE 2: Row Level Security
-- ============================================
-- This table is shared across all users (read by any authenticated user, written by service role)

ALTER TABLE public.google_places_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places_cache_select" ON public.google_places_cache;
DROP POLICY IF EXISTS "places_cache_insert" ON public.google_places_cache;
DROP POLICY IF EXISTS "places_cache_update" ON public.google_places_cache;

-- Any authenticated user can read from cache
CREATE POLICY "places_cache_select" ON public.google_places_cache
  FOR SELECT TO authenticated USING (true);

-- Only service role can insert/update (backend functions)
-- No INSERT/UPDATE policies for authenticated role = only service_role can write

-- ============================================
-- PHASE 3: Grant permissions
-- ============================================

GRANT SELECT ON public.google_places_cache TO authenticated;
GRANT ALL ON public.google_places_cache TO service_role;
