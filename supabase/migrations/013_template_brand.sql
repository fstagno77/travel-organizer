-- Migration 013: Add brand fields to parsing_templates_beta
-- brand         = canonical display name for grouping/filtering (e.g. "ITA Airways")
-- brand_aliases = alternative names/identifiers for the same brand
--                 used for future brand-aware matching and deduplication
--                 (e.g. ["ITA", "Alitalia", "AZ", "Italia Trasporto Aereo"])

ALTER TABLE parsing_templates_beta
  ADD COLUMN IF NOT EXISTS brand         text,
  ADD COLUMN IF NOT EXISTS brand_aliases text[] DEFAULT '{}';

-- Index for brand-based filtering (admin UI grouping + future matching)
CREATE INDEX IF NOT EXISTS idx_parsing_templates_beta_brand
  ON parsing_templates_beta (brand)
  WHERE brand IS NOT NULL;

-- GIN index for alias array lookups (e.g. WHERE 'ITA' = ANY(brand_aliases))
CREATE INDEX IF NOT EXISTS idx_parsing_templates_beta_brand_aliases
  ON parsing_templates_beta USING GIN (brand_aliases);

COMMENT ON COLUMN parsing_templates_beta.brand IS
  'Canonical brand name used for display and grouping (e.g. "ITA Airways").';

COMMENT ON COLUMN parsing_templates_beta.brand_aliases IS
  'Alternative names/identifiers for the same brand '
  '(e.g. ["ITA", "Alitalia", "AZ"]). Used for brand-aware matching.';
