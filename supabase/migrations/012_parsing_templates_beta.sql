-- Migration 012: Parsing templates for SmartParse BETA
-- This is a BETA feature for testing the 4-level cascade parsing system.
-- Completely separate from the main parsing pipeline.

CREATE TABLE IF NOT EXISTS parsing_templates_beta (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',     -- 'ai', 'heuristic', 'manual'
  doc_type TEXT NOT NULL DEFAULT 'any',  -- 'flight', 'hotel', 'any'
  match_rules JSONB NOT NULL DEFAULT '{}',
  field_rules JSONB NOT NULL DEFAULT '[]',
  collections JSONB NOT NULL DEFAULT '[]',
  min_confidence FLOAT NOT NULL DEFAULT 0.6,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_sample_fingerprint TEXT,
  last_sample_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for exact-cache fingerprint lookups (Level 1)
CREATE INDEX IF NOT EXISTS idx_parsing_templates_beta_fingerprint
  ON parsing_templates_beta(last_sample_fingerprint);

-- Index for doc_type filtering
CREATE INDEX IF NOT EXISTS idx_parsing_templates_beta_doc_type
  ON parsing_templates_beta(doc_type);

-- RLS: Only service role can access (admin-only BETA feature)
ALTER TABLE parsing_templates_beta ENABLE ROW LEVEL SECURITY;
-- No public policies — service role key bypasses RLS entirely

-- Atomic increment function to avoid race conditions on usage_count
CREATE OR REPLACE FUNCTION increment_template_usage_beta(template_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE parsing_templates_beta
  SET usage_count = usage_count + 1,
      updated_at  = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
