ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_quote_extraction_enabled boolean NOT NULL DEFAULT false;
