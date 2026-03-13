-- Fix FK constraints that block auth.users deletion
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_created_by_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE cage_overrides DROP CONSTRAINT IF EXISTS cage_overrides_created_by_fkey;
ALTER TABLE cage_overrides ADD CONSTRAINT cage_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE planning_tasks DROP CONSTRAINT IF EXISTS planning_tasks_assigned_to_fkey;
ALTER TABLE planning_tasks ADD CONSTRAINT planning_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE planning_tasks DROP CONSTRAINT IF EXISTS planning_tasks_completed_by_fkey;
ALTER TABLE planning_tasks ADD CONSTRAINT planning_tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_created_by_fkey;
ALTER TABLE email_log ADD CONSTRAINT email_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_created_by_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;