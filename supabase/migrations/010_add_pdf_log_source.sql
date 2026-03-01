-- Migration: Add source tracking and enriched data to email_processing_log
-- Allows both direct PDF uploads and email-forwarded PDFs to be logged together

ALTER TABLE public.email_processing_log
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'email'
    CHECK (source IN ('email', 'upload')),
  ADD COLUMN IF NOT EXISTS trip_id TEXT REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_count INTEGER,
  ADD COLUMN IF NOT EXISTS extracted_summary JSONB;

CREATE INDEX IF NOT EXISTS idx_email_processing_log_source
  ON public.email_processing_log(source);

CREATE INDEX IF NOT EXISTS idx_email_processing_log_trip_id
  ON public.email_processing_log(trip_id);
