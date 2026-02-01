-- Migration: Add Multi-User Authentication
-- Run this in Supabase SQL Editor

-- ============================================
-- PHASE 1: Create profiles table
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(12) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  language_preference VARCHAR(2) DEFAULT 'it' CHECK (language_preference IN ('it', 'en')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Username format constraint: 5-12 chars, alphanumeric only
ALTER TABLE public.profiles
ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9]{5,12}$');

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- PHASE 2: Modify trips table
-- ============================================

-- Add user_id column (nullable initially for migration)
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for user trip lookups
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);

-- ============================================
-- PHASE 3: Modify city_photos table
-- ============================================

-- Add user_id column
ALTER TABLE public.city_photos
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old unique constraint on city (if exists)
ALTER TABLE public.city_photos
DROP CONSTRAINT IF EXISTS city_photos_city_key;

ALTER TABLE public.city_photos
DROP CONSTRAINT IF EXISTS city_photos_pkey;

-- Add new unique constraint per user
ALTER TABLE public.city_photos
ADD CONSTRAINT city_photos_user_city_unique UNIQUE (user_id, city);

-- Index for user photo lookups
CREATE INDEX IF NOT EXISTS idx_city_photos_user_id ON public.city_photos(user_id);

-- ============================================
-- PHASE 4: Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "trips_select" ON public.trips;
DROP POLICY IF EXISTS "trips_insert" ON public.trips;
DROP POLICY IF EXISTS "trips_update" ON public.trips;
DROP POLICY IF EXISTS "trips_delete" ON public.trips;
DROP POLICY IF EXISTS "city_photos_select" ON public.city_photos;
DROP POLICY IF EXISTS "city_photos_insert" ON public.city_photos;
DROP POLICY IF EXISTS "city_photos_update" ON public.city_photos;
DROP POLICY IF EXISTS "city_photos_delete" ON public.city_photos;

-- Profiles policies
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "trips_delete" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- City Photos policies
CREATE POLICY "city_photos_select" ON public.city_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "city_photos_insert" ON public.city_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "city_photos_update" ON public.city_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "city_photos_delete" ON public.city_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PHASE 5: Helper Functions
-- ============================================

-- Function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;

-- Function to validate username format
CREATE OR REPLACE FUNCTION public.is_valid_username(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN check_username ~ '^[a-zA-Z0-9]{5,12}$';
END;
$$;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PHASE 6: Grant permissions
-- ============================================

-- Grant access to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.trips TO authenticated;
GRANT ALL ON public.city_photos TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_valid_username(TEXT) TO anon;
