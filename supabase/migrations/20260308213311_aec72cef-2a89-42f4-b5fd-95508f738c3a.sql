
-- payments
ALTER TABLE payments DROP CONSTRAINT payments_booking_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- appointments
ALTER TABLE appointments DROP CONSTRAINT appointments_booking_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- booking_cats
ALTER TABLE booking_cats DROP CONSTRAINT booking_cats_booking_id_fkey;
ALTER TABLE booking_cats ADD CONSTRAINT booking_cats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- cat_registry
ALTER TABLE cat_registry DROP CONSTRAINT cat_registry_booking_id_fkey;
ALTER TABLE cat_registry ADD CONSTRAINT cat_registry_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- documents
ALTER TABLE documents DROP CONSTRAINT documents_booking_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
