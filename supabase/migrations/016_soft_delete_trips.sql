-- Migration 016: Soft delete per i viaggi
-- Aggiunge deleted_at e aggiorna le RLS per escludere automaticamente i viaggi cancellati

-- Colonna soft delete
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Indice per query admin sui viaggi cancellati
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON public.trips (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- Aggiorna RLS: escludi viaggi soft-deleted
-- ============================================

-- SELECT: owner o collaboratore, ma solo se non cancellato
DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      auth.uid() = user_id
      OR id IN (SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid())
    )
  );

-- UPDATE: owner o viaggiatore, ma solo se non cancellato
DROP POLICY IF EXISTS "trips_update" ON public.trips;
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (
    deleted_at IS NULL
    AND (
      auth.uid() = user_id
      OR id IN (
        SELECT trip_id FROM public.trip_collaborators
        WHERE user_id = auth.uid() AND role = 'viaggiatore'
      )
    )
  );

-- DELETE: solo il proprietario (hard delete da admin, bypassa RLS con service role)
-- Invariato rispetto a migration 008
