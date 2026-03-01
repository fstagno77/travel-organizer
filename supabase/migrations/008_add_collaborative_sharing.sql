-- Migration: Add Collaborative Trip Sharing
-- Run this in Supabase SQL Editor
-- Adds: trip_collaborators, trip_invitations, notifications tables
-- Updates: trips RLS policies for collaborative access
-- NOTE: Uses IF NOT EXISTS / DROP IF EXISTS for idempotent re-runs
-- FIX: Uses SECURITY DEFINER function to avoid circular RLS between trips ↔ trip_collaborators

-- ============================================
-- PHASE 0: Helper function to break RLS cycle
-- ============================================

-- SECURITY DEFINER runs with creator privileges, bypassing RLS on trips
-- This prevents circular dependency: trips_select → trip_collaborators → collaborators_select → trips
CREATE OR REPLACE FUNCTION public.is_trip_owner(check_trip_id TEXT, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = check_trip_id AND user_id = check_user_id
  );
$$;

-- ============================================
-- PHASE 1: trip_collaborators table
-- ============================================

CREATE TABLE IF NOT EXISTS public.trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viaggiatore', 'ospite')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON public.trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON public.trip_collaborators(user_id);

ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators can see their own records + owner can see all for their trips
DROP POLICY IF EXISTS "collaborators_select" ON public.trip_collaborators;
CREATE POLICY "collaborators_select" ON public.trip_collaborators
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_trip_owner(trip_id, auth.uid())
  );

-- Owner can insert collaborators (viaggiatore inserts go through service role)
DROP POLICY IF EXISTS "collaborators_insert" ON public.trip_collaborators;
CREATE POLICY "collaborators_insert" ON public.trip_collaborators
  FOR INSERT WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
  );

-- Owner can update collaborators
DROP POLICY IF EXISTS "collaborators_update" ON public.trip_collaborators;
CREATE POLICY "collaborators_update" ON public.trip_collaborators
  FOR UPDATE USING (
    public.is_trip_owner(trip_id, auth.uid())
  );

-- Owner can delete collaborators
DROP POLICY IF EXISTS "collaborators_delete" ON public.trip_collaborators;
CREATE POLICY "collaborators_delete" ON public.trip_collaborators
  FOR DELETE USING (
    public.is_trip_owner(trip_id, auth.uid())
    OR auth.uid() = user_id  -- collaborator can remove themselves
  );

GRANT ALL ON public.trip_collaborators TO authenticated;

-- ============================================
-- PHASE 2: trip_invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viaggiatore', 'ospite')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, email)
);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email ON public.trip_invitations(email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token ON public.trip_invitations(token);

ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

-- Owner can see all invitations for their trips
DROP POLICY IF EXISTS "invitations_select" ON public.trip_invitations;
CREATE POLICY "invitations_select" ON public.trip_invitations
  FOR SELECT USING (
    public.is_trip_owner(trip_id, auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_insert" ON public.trip_invitations;
CREATE POLICY "invitations_insert" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
  );

DROP POLICY IF EXISTS "invitations_update" ON public.trip_invitations;
CREATE POLICY "invitations_update" ON public.trip_invitations
  FOR UPDATE USING (
    public.is_trip_owner(trip_id, auth.uid())
  );

GRANT ALL ON public.trip_invitations TO authenticated;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trip_invitations_updated_at ON public.trip_invitations;
CREATE TRIGGER trip_invitations_updated_at
  BEFORE UPDATE ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PHASE 3: notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  trip_id TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message JSONB NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

GRANT ALL ON public.notifications TO authenticated;

-- ============================================
-- PHASE 4: Update trips RLS policies
-- ============================================

-- Drop existing trip policies (from migration 001)
DROP POLICY IF EXISTS "trips_select" ON public.trips;
DROP POLICY IF EXISTS "trips_update" ON public.trips;
DROP POLICY IF EXISTS "trips_delete" ON public.trips;
-- Keep trips_insert unchanged (owner only)

-- SELECT: owner OR collaborator
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid())
  );

-- UPDATE: owner OR viaggiatore collaborator
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (
    auth.uid() = user_id
    OR id IN (
      SELECT trip_id FROM public.trip_collaborators
      WHERE user_id = auth.uid() AND role = 'viaggiatore'
    )
  );

-- DELETE: owner only
CREATE POLICY "trips_delete" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);
