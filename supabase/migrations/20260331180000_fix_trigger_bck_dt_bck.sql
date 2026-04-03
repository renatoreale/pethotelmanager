-- Fix trigger: do not override bck when bck or dt_bck are explicitly changed.
-- The trigger sets bck = 'N' only when neither bck nor dt_bck were touched.
CREATE OR REPLACE FUNCTION set_bck_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.bck := 'N';
  ELSIF TG_OP = 'UPDATE'
    AND NEW.bck IS NOT DISTINCT FROM OLD.bck
    AND NEW.dt_bck IS NOT DISTINCT FROM OLD.dt_bck
  THEN
    NEW.bck := 'N';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
