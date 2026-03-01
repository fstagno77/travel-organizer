-- Migration: Add pending status to trip_collaborators
-- Enables accept/decline flow for registered users invited to trips
-- Existing records default to 'accepted' (backward compatible)
-- NOTE: Also re-applies SECURITY DEFINER fix and all RLS policies for idempotency

-- ============================================
-- PHASE 1: Add status column
-- ============================================

ALTER TABLE public.trip_collaborators
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted';

DO $$
BEGIN
  ALTER TABLE public.trip_collaborators DROP CONSTRAINT IF EXISTS trip_collaborators_status_check;
  ALTER TABLE public.trip_collaborators ADD CONSTRAINT trip_collaborators_status_check CHECK (status IN ('pending', 'accepted'));
END $$;

-- ============================================
-- PHASE 2: SECURITY DEFINER function (breaks RLS cycle)
-- ============================================

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
-- PHASE 3: trip_collaborators RLS (uses is_trip_owner)
-- ============================================

DROP POLICY IF EXISTS "collaborators_select" ON public.trip_collaborators;
CREATE POLICY "collaborators_select" ON public.trip_collaborators
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_trip_owner(trip_id, auth.uid())
  );

DROP POLICY IF EXISTS "collaborators_insert" ON public.trip_collaborators;
CREATE POLICY "collaborators_insert" ON public.trip_collaborators
  FOR INSERT WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
  );

DROP POLICY IF EXISTS "collaborators_update" ON public.trip_collaborators;
CREATE POLICY "collaborators_update" ON public.trip_collaborators
  FOR UPDATE USING (
    public.is_trip_owner(trip_id, auth.uid())
  );

DROP POLICY IF EXISTS "collaborators_delete" ON public.trip_collaborators;
CREATE POLICY "collaborators_delete" ON public.trip_collaborators
  FOR DELETE USING (
    public.is_trip_owner(trip_id, auth.uid())
    OR auth.uid() = user_id
  );

-- ============================================
-- PHASE 4: trips RLS (with status = accepted filter)
-- ============================================

DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid() AND status = 'accepted')
  );

DROP POLICY IF EXISTS "trips_update" ON public.trips;
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (
    auth.uid() = user_id
    OR id IN (
      SELECT trip_id FROM public.trip_collaborators
      WHERE user_id = auth.uid() AND role = 'viaggiatore' AND status = 'accepted'
    )
  );

-- ============================================
-- PHASE 5: trip_invitations RLS (uses is_trip_owner)
-- ============================================

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
