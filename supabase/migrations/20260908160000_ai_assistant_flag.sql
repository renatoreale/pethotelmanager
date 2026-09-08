ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_assistant_enabled boolean NOT NULL DEFAULT false;
