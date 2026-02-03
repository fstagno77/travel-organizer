-- Migration: Add Email Forwarding Support
-- Run this in Supabase SQL Editor
-- Creates pending_bookings and email_processing_log tables

-- ============================================
-- PHASE 1: Create pending_bookings table
-- ============================================

CREATE TABLE IF NOT EXISTS public.pending_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email metadata
  email_from TEXT NOT NULL,
  email_subject TEXT,
  email_received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  email_message_id TEXT, -- SendGrid message ID for deduplication

  -- Extracted booking data
  booking_type TEXT NOT NULL CHECK (booking_type IN ('flight', 'hotel', 'unknown')),
  extracted_data JSONB NOT NULL, -- Full extracted booking data (same format as trip flights/hotels)

  -- Summary fields for quick display (denormalized)
  summary_title TEXT, -- e.g., "Volo AZ123 FCO→JFK" or "Hotel Roma Centro"
  summary_dates TEXT, -- e.g., "15 Mar 2024" or "15-20 Mar 2024"

  -- PDF attachment (if any)
  pdf_path TEXT, -- Storage path: pending/{id}/attachment.pdf

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'associated', 'dismissed')),
  associated_trip_id TEXT REFERENCES public.trips(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE -- When associated or dismissed
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pending_bookings_user_id ON public.pending_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON public.pending_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_user_status ON public.pending_bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_email_message_id ON public.pending_bookings(email_message_id);

-- Enable RLS
ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "pending_bookings_select" ON public.pending_bookings;
DROP POLICY IF EXISTS "pending_bookings_update" ON public.pending_bookings;
DROP POLICY IF EXISTS "pending_bookings_delete" ON public.pending_bookings;

-- RLS Policies (no INSERT policy - webhook uses service role)
CREATE POLICY "pending_bookings_select" ON public.pending_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pending_bookings_update" ON public.pending_bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "pending_bookings_delete" ON public.pending_bookings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at (reuses existing handle_updated_at function)
DROP TRIGGER IF EXISTS pending_bookings_updated_at ON public.pending_bookings;
CREATE TRIGGER pending_bookings_updated_at
  BEFORE UPDATE ON public.pending_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, UPDATE, DELETE ON public.pending_bookings TO authenticated;

-- ============================================
-- PHASE 2: Create email_processing_log table
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email identification
  email_from TEXT NOT NULL,
  email_subject TEXT,
  email_message_id TEXT,

  -- Processing result
  status TEXT NOT NULL CHECK (status IN ('success', 'user_not_found', 'extraction_failed', 'error')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pending_booking_id UUID REFERENCES public.pending_bookings(id) ON DELETE SET NULL,
  error_message TEXT,

  -- Debug info (truncated body preview)
  email_body_preview TEXT, -- First 500 chars for debugging

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_email_processing_log_email_from ON public.email_processing_log(email_from);
CREATE INDEX IF NOT EXISTS idx_email_processing_log_created_at ON public.email_processing_log(created_at);
CREATE INDEX IF NOT EXISTS idx_email_processing_log_status ON public.email_processing_log(status);

-- No RLS on this table - it's for admin/debugging only, accessed via service role
-- If you want users to see their own logs, add RLS policies similar to pending_bookings

-- ============================================
-- PHASE 3: Add index on profiles.email for fast lookup
-- ============================================

-- This index speeds up user lookup by email (for webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email));
