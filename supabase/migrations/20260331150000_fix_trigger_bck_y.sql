-- Fix trigger: set bck = 'Y' on update (record modified, needs backup)
CREATE OR REPLACE FUNCTION set_bck_on_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bck := 'Y';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
