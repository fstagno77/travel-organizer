-- Migration: Add Travelers table for travel companion management
-- Run this in Supabase SQL Editor

-- ============================================
-- PHASE 1: Create travelers table
-- ============================================

CREATE TABLE IF NOT EXISTS public.travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner BOOLEAN DEFAULT false,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  passport_number TEXT,
  passport_issue_date DATE,
  passport_expiry_date DATE,
  loyalty_programs JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_travelers_user_id ON public.travelers(user_id);

-- Ensure only one owner per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_travelers_owner_unique
  ON public.travelers(user_id) WHERE is_owner = true;

-- ============================================
-- PHASE 2: Row Level Security
-- ============================================

ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_select" ON public.travelers;
DROP POLICY IF EXISTS "travelers_insert" ON public.travelers;
DROP POLICY IF EXISTS "travelers_update" ON public.travelers;
DROP POLICY IF EXISTS "travelers_delete" ON public.travelers;

CREATE POLICY "travelers_select" ON public.travelers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "travelers_insert" ON public.travelers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "travelers_update" ON public.travelers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "travelers_delete" ON public.travelers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PHASE 3: Trigger for updated_at
-- ============================================

DROP TRIGGER IF EXISTS travelers_updated_at ON public.travelers;
CREATE TRIGGER travelers_updated_at
  BEFORE UPDATE ON public.travelers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PHASE 4: Grant permissions
-- ============================================

GRANT ALL ON public.travelers TO authenticated;
