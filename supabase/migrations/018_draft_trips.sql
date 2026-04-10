-- Migration 018: Draft trips status
-- Aggiunge colonna status per distinguere bozze da viaggi attivi

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
  CHECK (status IN ('draft', 'active'));

-- Tutti i viaggi esistenti sono active
UPDATE public.trips SET status = 'active' WHERE status IS NULL;

-- Indice per query per status
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status, user_id);
