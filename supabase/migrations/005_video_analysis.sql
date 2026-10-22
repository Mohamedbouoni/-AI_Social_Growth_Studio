-- =============================================================================
-- 005 — Video Studio: video analyses in the credit ledger and the library
-- =============================================================================

-- Allow the 'video' usage kind (5 credits per analyzed video)
ALTER TABLE generation_usage DROP CONSTRAINT IF EXISTS generation_usage_kind_check;
ALTER TABLE generation_usage
    ADD CONSTRAINT generation_usage_kind_check
    CHECK (kind IN ('generation', 'repurpose', 'assistant', 'video'));

-- Library items can come from a typed idea or an uploaded video
ALTER TABLE content_projects
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'idea'
    CHECK (source IN ('idea', 'video'));
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Detected language may be any ISO code for videos, not only en/ar
ALTER TABLE content_projects DROP CONSTRAINT IF EXISTS content_projects_language_check;
ALTER TABLE content_projects
    ADD CONSTRAINT content_projects_language_check
    CHECK (char_length(language) BETWEEN 2 AND 12);

-- The full omnichannel package is stored as one 'package' variant
ALTER TABLE content_variants DROP CONSTRAINT IF EXISTS content_variants_content_type_check;
ALTER TABLE content_variants
    ADD CONSTRAINT content_variants_content_type_check
    CHECK (content_type IN ('video', 'short', 'reel', 'carousel', 'post', 'story', 'package'));

NOTIFY pgrst, 'reload schema';
