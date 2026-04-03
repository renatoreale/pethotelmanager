-- Recreate trigger explicitly on cats table
DROP TRIGGER IF EXISTS trg_bck_cats ON public.cats;
CREATE TRIGGER trg_bck_cats
  BEFORE INSERT OR UPDATE ON public.cats
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();
