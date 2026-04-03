-- Fix trigger: set bck = 'N' only if bck was not explicitly changed in the statement.
-- This allows the backup process to set bck = 'Y' without the trigger overriding it.
CREATE OR REPLACE FUNCTION set_bck_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.bck := 'N';
  ELSIF TG_OP = 'UPDATE' AND NEW.bck = OLD.bck THEN
    -- bck was not touched by the UPDATE: mark as pending backup
    NEW.bck := 'N';
  END IF;
  -- If bck was explicitly changed (e.g. backup process sets 'Y'), respect it
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
