-- Migration 015: Add SmartParse metadata to email_processing_log
-- parse_level: 1 (L1 cache), 2 (L2 template), 4 (L4 Claude), NULL (legacy/pre-SmartParse)
-- parse_meta: { brand, claudeCalls, durationMs, levels[], feedback: "up"|"down"|null }

ALTER TABLE public.email_processing_log
  ADD COLUMN IF NOT EXISTS parse_level SMALLINT,
  ADD COLUMN IF NOT EXISTS parse_meta JSONB;

COMMENT ON COLUMN public.email_processing_log.parse_level IS
  'SmartParse level: 1=cache, 2=template, 4=Claude, NULL=legacy';

COMMENT ON COLUMN public.email_processing_log.parse_meta IS
  'SmartParse metadata: brand, claudeCalls, durationMs, levels[], feedback';
