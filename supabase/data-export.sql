-- ============================================================
-- PetHotelManager - Data Export
-- Generated: 2026-03-15
-- Run AFTER schema-export.sql in the new Supabase project
-- ============================================================
-- IMPORTANT: Disable RLS temporarily for data import
-- Run this in the SQL Editor of the target project

-- Temporarily disable triggers to avoid conflicts
SET session_replication_role = 'replica';

-- ============================================================
-- 1. TENANTS (must be first - referenced by most tables)
-- ============================================================

INSERT INTO public.tenants (id, name, slug, locale, pet_type, address, cap, city, phone, email, pec, partita_iva, titolare_name, logo_url, iban, iban_holder, bank_name, max_cats, num_singole, num_doppie, num_singole_cani, num_doppie_cani, num_singole_gatti, num_doppie_gatti, occupancy_rule_days, count_checkin_day, count_checkout_day, stay_calc_type, bollo_amount, preventivo_validity_days, preventivo_footer_text, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'La Zampa Felice', 'la-zampa-felice', 'it', 'entrambi', 'Via Roma 42', '00100', 'Roma', '+39 06 1234567', 'info@lazampafelice.it', 'lazampafelice@pec.it', '12345678901', 'Maria Rossi', 'https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/tenant-logos/a0000000-0000-0000-0000-000000000001/logo.png', 'IT60X0542811101000000123456', 'Maria Rossi', 'Banca Intesa', 30, 5, 4, 2, 3, 3, 1, 4, true, true, 'giorni', 2.00, 7, NULL, '2026-03-12 18:13:13.729568+00', '2026-03-13 17:58:23.214772+00'),
  ('4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'admin', 'admin', 'it', 'gatti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 4, true, true, 'notti', 0, 5, NULL, '2026-03-13 19:01:06.04104+00', '2026-03-13 19:01:27.468839+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PROFILES (references auth.users - user_id must exist)
-- NOTE: You must create the auth users FIRST in the new project
-- These inserts will fail if user_ids don't exist in auth.users
-- ============================================================

-- Skipping profiles - they depend on auth.users which must be created separately
-- After creating users in the new project, profiles will be auto-created by the handle_new_user trigger

-- ============================================================
-- 3. USER_ROLES (references auth.users)
-- NOTE: Same dependency on auth.users
-- ============================================================

-- Skipping user_roles - depends on auth.users

-- ============================================================
-- 4. CLIENTS
-- ============================================================

INSERT INTO public.clients (id, tenant_id, first_name, last_name, email, phone, fiscal_code, address, notes, is_blacklisted, blacklist_reason, portal_activated, user_id, created_at, updated_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Marco', 'Bianchi', 'realerenato@hotmail.com', '+39 333 1112233', 'BNCMRC85M01F205Z', 'Via Garibaldi 15, Milano', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-13 17:48:55.868073+00'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Laura', 'Verdi', 'laura.verdi@email.it', '+39 340 4455667', 'VRDLRA90D45H501W', 'Corso Italia 8, Roma', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-12 18:13:24.967193+00'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Giuseppe', 'Russo', 'giuseppe.russo@email.it', '+39 345 7788990', 'RSSGPP78A01F839X', 'Via Dante 22, Napoli', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-12 18:13:24.967193+00'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Francesca', 'Esposito', 'francesca.esposito@email.it', '+39 347 1122334', 'SPSFNC82T41D612Y', 'Piazza Duomo 3, Firenze', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-13 17:48:23.793561+00'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Alessandro', 'Romano', 'alessandro.romano@email.it', '+39 348 5566778', 'RMNLSN88L01L219P', 'Via Mazzini 10, Torino', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-13 17:47:56.89691+00'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Chiara', 'Colombo', 'chiara.colombo@email.it', '+39 349 9900112', 'CLMCHR92A41A944Q', 'Via Leopardi 7, Bologna', NULL, false, NULL, false, NULL, '2026-03-12 18:13:24.967193+00', '2026-03-13 17:35:20.345723+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. CATS
-- ============================================================

INSERT INTO public.cats (id, tenant_id, client_id, name, breed, gender, color, birth_date, weight_kg, microchip, is_neutered, needs_double_cage, sibling_group_id, photo_url, pet_type, medical_notes, dietary_notes, behavioral_notes, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111101', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Micio', 'Europeo', 'M', 'Tigrato grigio', '2020-03-15', 4.50, '380260000111111', true, false, NULL, NULL, 'gatti', NULL, 'Cibo umido preferito', 'Socievole', '2026-03-12 18:14:16.92636+00', '2026-03-15 18:18:54.856368+00'),
  ('a1111111-1111-1111-1111-111111111102', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Luna', 'Persiano', 'F', 'Bianco', '2021-07-20', 3.80, '380260000222222', true, false, NULL, NULL, 'gatti', 'Allergia al pollo', 'Solo cibo ipoallergenico', 'Timida', '2026-03-12 18:14:16.92636+00', '2026-03-15 18:18:55.009853+00'),
  ('a1111111-1111-1111-1111-111111111103', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Romeo', 'Maine Coon', 'M', 'Rosso tabby', '2019-11-05', 7.20, '380260000333333', true, true, NULL, NULL, 'gatti', NULL, NULL, 'Molto affettuoso', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111104', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Pallina', 'Ragdoll', 'F', 'Seal point', '2022-01-10', 4.00, '380260000444444', false, false, NULL, NULL, 'gatti', NULL, NULL, 'Tranquilla', '2026-03-12 18:14:16.92636+00', '2026-03-15 18:18:36.497174+00'),
  ('a1111111-1111-1111-1111-111111111105', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Simba', 'British Shorthair', 'M', 'Blu', '2020-09-01', 5.50, '380260000555555', true, false, NULL, NULL, 'gatti', 'Terapia tiroidea', 'Cibo medicato', 'Calmo', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111106', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Rex', 'Pastore Tedesco', 'M', 'Nero e tan', '2019-05-12', 32.00, '380260000666666', true, true, NULL, NULL, 'cani', NULL, NULL, 'Addestrato', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111107', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Bella', 'Labrador Retriever', 'F', 'Miele', '2021-03-28', 28.50, '380260000777777', true, false, NULL, NULL, 'cani', NULL, 'Dieta ipoallergenica', 'Giocherellona', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111108', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Rocky', 'Bulldog Francese', 'M', 'Brindle', '2022-06-15', 12.00, '380260000888888', false, false, NULL, NULL, 'cani', 'Brachicefalo - attenzione al caldo', NULL, 'Pigro ma affettuoso', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111109', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'Lola', 'Golden Retriever', 'F', 'Dorato', '2020-12-01', 30.00, '380260000999999', true, false, NULL, NULL, 'cani', NULL, NULL, 'Dolcissima', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00'),
  ('a1111111-1111-1111-1111-111111111110', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'Toby', 'Beagle', 'M', 'Tricolore', '2021-08-20', 14.00, '380260001010101', true, false, NULL, NULL, 'cani', NULL, NULL, 'Curioso', '2026-03-12 18:14:16.92636+00', '2026-03-12 18:14:16.92636+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. QUOTE REQUESTS
-- ============================================================

INSERT INTO public.quote_requests (id, tenant_id, client_id, check_in_date, check_out_date, num_pets, pet_names, notes, status, rejection_reason, created_at, updated_at)
VALUES
  ('72a3760c-2c48-43d6-acd0-2a23f21ca51a', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-03-23', '2026-03-29', 2, 'Luna, Micio', '', 'converted', NULL, '2026-03-15 18:08:09.772621+00', '2026-03-15 18:08:09.772621+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. BOOKINGS
-- ============================================================

INSERT INTO public.bookings (id, tenant_id, client_id, booking_number, status, check_in_date, check_out_date, cage_pool_type, units_occupied, total_amount, deposit_amount, price_breakdown, pet_type, notes, quote_request_id, created_by, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '26100', 'chiusa', '2026-01-10', '2026-01-20', 'singola', 1, 350.00, 100.00, NULL, 'gatti', 'Soggiorno invernale Micio', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-12 18:13:56.26428+00'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', '26101', 'chiusa', '2026-02-01', '2026-02-15', 'doppia', 1, 700.00, 200.00, NULL, 'cani', 'Rex e Simba insieme', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-12 18:13:56.26428+00'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', '26102', 'in_corso', '2026-03-10', '2026-03-20', 'singola', 1, 280.00, 80.00, NULL, 'cani', 'Bella - passeggiata extra pomeridiana', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-12 18:13:56.26428+00'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', '26103', 'in_corso', '2026-03-08', '2026-03-18', 'doppia', 1, 450.00, 150.00, NULL, 'gatti', 'Romeo - casetta grande', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-12 18:13:56.26428+00'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', '26104', 'in_corso', '2026-03-15', '2026-04-05', 'singola', 1, 660.00, 100.00, '{"checkin_date_change":{"new_date":"2026-03-15","new_days":22,"new_total":660,"original_date":"2026-03-25","original_days":12,"original_total":380}}', 'gatti', 'Pallina - prima volta', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-15 18:18:36.6051+00'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '26105', 'appuntamento_in_out_fissato', '2026-04-01', '2026-04-10', 'singola', 2, 540.00, 150.00, NULL, 'cani', 'Lola e Toby', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-15 18:13:02.574736+00'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '26106', 'appuntamento_in_out_fissato', '2026-04-15', '2026-04-25', 'singola', 1, 320.00, 100.00, NULL, 'gatti', 'Luna - preventivo estivo', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-15 18:15:20.64423+00'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', '26107', 'preventivo', '2026-05-01', '2026-05-15', 'doppia', 1, 650.00, 0.00, NULL, 'cani', 'Rocky e Bella insieme', NULL, NULL, '2026-03-12 18:13:56.26428+00', '2026-03-12 18:13:56.26428+00'),
  ('6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '26100', 'in_corso', '2026-03-12', '2026-03-29', 'singola', 1, 1080.00, 100.00, '{"checkin_date_change":{"new_date":"2026-03-15","new_days":15,"new_total":900,"original_date":"2026-03-23","original_days":7,"original_total":465},"extra_days_info":{"extra_cost":180,"extra_days":3,"num_cats":2,"reason":"check_in_anticipato","tariff_name":"Soggiorno Alta stagione"}}', 'gatti', '[Periodi: 2026-03-23 → 2026-03-29: Soggiorno Alta stagione (7 giorni, €420.00)]', '72a3760c-2c48-43d6-acd0-2a23f21ca51a', 'dd1ec388-eff6-48d4-bd91-b3324e74e8c5', '2026-03-15 18:13:38.919404+00', '2026-03-15 18:18:55.117637+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. BOOKING_CATS
-- ============================================================

INSERT INTO public.booking_cats (id, booking_id, cat_id)
VALUES
  ('17da8b92-62f7-4be3-85d6-6dcb448388da', 'b0000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111101'),
  ('024287e4-c9fe-4995-9479-02953df9503c', 'b0000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111106'),
  ('0bca03b9-3173-40c9-9e86-182803370bef', 'b0000000-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111107'),
  ('a7c3c19a-8526-49b1-8791-a3d22476112d', 'b0000000-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111103'),
  ('8d52a9ec-1800-4bdf-a05d-65d487e33708', 'b0000000-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111104'),
  ('7a9c07aa-ae28-441d-896b-f73e706d47b2', 'b0000000-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111109'),
  ('e4499414-eb79-45ca-92ea-e7530c5f4617', 'b0000000-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111110'),
  ('68345577-4a27-4cae-9838-bd5c40893b61', 'b0000000-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111102'),
  ('44e551e9-1882-450b-a12e-e3f3efe82a12', 'b0000000-0000-0000-0000-000000000008', 'a1111111-1111-1111-1111-111111111108'),
  ('f0a49979-f0c6-45cc-b0d1-9fa4525305e6', 'b0000000-0000-0000-0000-000000000008', 'a1111111-1111-1111-1111-111111111107'),
  ('acbc45bf-d15b-49f1-a5a0-f3a270e0ab51', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'a1111111-1111-1111-1111-111111111102'),
  ('6b406501-6a9f-4e7d-9832-0bcf2509a812', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'a1111111-1111-1111-1111-111111111101')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. BOOKING_COUNTERS
-- ============================================================

INSERT INTO public.booking_counters (tenant_id, year, last_counter)
VALUES ('a0000000-0000-0000-0000-000000000001', 26, 100)
ON CONFLICT (tenant_id, year) DO NOTHING;

-- ============================================================
-- 10. PAYMENT_METHODS
-- ============================================================

INSERT INTO public.payment_methods (id, tenant_id, name, is_active, sort_order, created_at)
VALUES
  ('76061bfc-54bf-4280-9558-508028a26b33', NULL, 'Bonifico', true, 1, '2026-03-09 09:07:12.602669+00'),
  ('534f8ce4-ac29-4606-99ca-08b2c7ae4c10', NULL, 'Pos', true, 2, '2026-03-09 09:07:22.678133+00'),
  ('1a60b72f-d64b-459d-b508-ee9ad5c5cbc4', NULL, 'Contanti', true, 3, '2026-03-09 09:07:28.206032+00'),
  ('f16342eb-7f15-4d81-bf08-0430501edae3', 'a0000000-0000-0000-0000-000000000001', 'Bonifico', true, 1, '2026-03-12 18:14:33.384342+00'),
  ('8b10a6bf-8f77-4d7a-9986-51628e205a67', 'a0000000-0000-0000-0000-000000000001', 'Pos', true, 2, '2026-03-12 18:14:33.384342+00'),
  ('9638ef80-aca2-45ad-b942-30235190fac9', 'a0000000-0000-0000-0000-000000000001', 'Contanti', true, 3, '2026-03-12 18:14:33.384342+00'),
  ('fb8470f7-0e61-409f-8c99-629fcb2b1df3', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Bonifico', true, 1, '2026-03-13 19:01:06.137419+00'),
  ('0fbfb767-ee4f-4da0-b3f9-bb166dfd049a', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Pos', true, 2, '2026-03-13 19:01:06.137419+00'),
  ('d6bb2066-402d-4b79-9ed6-101d8fee3a1a', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Contanti', true, 3, '2026-03-13 19:01:06.137419+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. PAYMENTS
-- ============================================================

INSERT INTO public.payments (id, tenant_id, booking_id, payment_type, amount, payment_date, method, payment_method_id, notes, created_by, created_at)
VALUES
  ('4df2e427-18f3-4294-920c-a4ba252dfbc7', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'caparra', 100.00, '2025-12-20 00:00:00+00', 'Bonifico', NULL, 'Caparra confermazione', NULL, '2026-03-12 18:14:32.645623+00'),
  ('e4838615-2423-4b91-8e96-dae5cfc5a82d', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'saldo', 250.00, '2026-01-20 00:00:00+00', 'Contanti', NULL, 'Saldo al checkout', NULL, '2026-03-12 18:14:32.645623+00'),
  ('75f5d0d9-5739-462e-be79-e15bf1193d98', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'caparra', 200.00, '2026-01-15 00:00:00+00', 'Bonifico', NULL, 'Caparra', NULL, '2026-03-12 18:14:32.645623+00'),
  ('0214ab5b-847f-40bc-92c2-77fda2fffdf4', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'saldo', 500.00, '2026-02-15 00:00:00+00', 'POS', NULL, 'Saldo finale', NULL, '2026-03-12 18:14:32.645623+00'),
  ('19537352-8fdb-43ca-b270-c489bad3df46', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'caparra', 80.00, '2026-03-05 00:00:00+00', 'Bonifico', NULL, 'Caparra Bella', NULL, '2026-03-12 18:14:32.645623+00'),
  ('adf94c96-c93c-4788-8851-9d63e6e123d5', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'caparra', 150.00, '2026-03-01 00:00:00+00', 'Bonifico', NULL, 'Caparra Romeo', NULL, '2026-03-12 18:14:32.645623+00'),
  ('92c952e5-290a-4181-b012-95f4d45803fd', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'caparra', 100.00, '2026-03-15 00:00:00+00', 'Bonifico', NULL, 'Caparra Pallina', NULL, '2026-03-12 18:14:32.645623+00'),
  ('99a957a6-0ff6-4b52-9039-86bf4056baaa', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'caparra', 150.00, '2026-03-20 00:00:00+00', 'POS', NULL, 'Caparra Lola e Toby', NULL, '2026-03-12 18:14:32.645623+00'),
  ('55afacf3-6e08-4be2-8905-094e8a0569ee', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'caparra', 100.00, '2026-03-15 00:00:00+00', NULL, '8b10a6bf-8f77-4d7a-9986-51628e205a67', NULL, 'dd1ec388-eff6-48d4-bd91-b3324e74e8c5', '2026-03-15 18:13:57.578256+00'),
  ('a024a65f-162f-48af-b9d9-4f01b5d41d1d', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'caparra', 100.00, '2026-03-15 00:00:00+00', NULL, '8b10a6bf-8f77-4d7a-9986-51628e205a67', NULL, 'dd1ec388-eff6-48d4-bd91-b3324e74e8c5', '2026-03-15 18:14:05.965376+00'),
  ('9abe5aaf-e924-443d-8011-d8d8648af201', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'caparra', 300.00, '2026-03-15 00:00:00+00', NULL, '8b10a6bf-8f77-4d7a-9986-51628e205a67', NULL, 'dd1ec388-eff6-48d4-bd91-b3324e74e8c5', '2026-03-15 18:18:37.346256+00'),
  ('b90dabcd-bb65-4a79-b3d1-57a9549d3527', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'caparra', 100.00, '2026-03-15 00:00:00+00', NULL, '8b10a6bf-8f77-4d7a-9986-51628e205a67', NULL, 'dd1ec388-eff6-48d4-bd91-b3324e74e8c5', '2026-03-15 18:18:55.690984+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. APPOINTMENTS
-- ============================================================

INSERT INTO public.appointments (id, tenant_id, booking_id, appointment_type, scheduled_at, duration_minutes, confirmed, notes, created_at, updated_at)
VALUES
  ('ee81db8c-1a6f-4005-be6c-4b4812e6fdaf', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'check_in', '2026-03-15 15:30:00+00', 30, false, NULL, '2026-03-15 18:12:56.736159+00', '2026-03-15 18:16:42.368206+00'),
  ('412a4f1c-a503-4b52-8dbc-724ebf851eef', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'check_out', '2026-04-05 11:00:00+00', 30, false, NULL, '2026-03-15 18:12:56.886232+00', '2026-03-15 18:12:56.886232+00'),
  ('b366dab7-9e9b-4286-a553-9ce5f8c5ac36', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'check_in', '2026-04-01 15:00:00+00', 30, false, NULL, '2026-03-15 18:13:02.273314+00', '2026-03-15 18:13:02.273314+00'),
  ('2698cc96-64d6-4b97-a537-da8d5c674420', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'check_out', '2026-04-10 11:30:00+00', 30, false, NULL, '2026-03-15 18:13:02.385897+00', '2026-03-15 18:13:02.385897+00'),
  ('5cafcc3e-81a0-4db4-967f-e136914fd642', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'check_in', '2026-03-15 15:00:00+00', 30, false, NULL, '2026-03-15 18:15:10.701051+00', '2026-03-15 18:16:36.075398+00'),
  ('d457f11c-3bf8-4b14-9406-cd2300c76a1e', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'check_out', '2026-03-29 11:00:00+00', 30, false, NULL, '2026-03-15 18:15:10.808476+00', '2026-03-15 18:15:10.808476+00'),
  ('c820e66f-363f-4aba-bd7e-65f8dec4da5e', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'check_in', '2026-04-15 16:00:00+00', 30, false, NULL, '2026-03-15 18:15:20.335447+00', '2026-03-15 18:15:20.335447+00'),
  ('f5c02e40-042b-4c7d-a893-ba16f2386a9c', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'check_out', '2026-04-25 11:00:00+00', 30, false, NULL, '2026-03-15 18:15:20.469923+00', '2026-03-15 18:15:20.469923+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. CAT_REGISTRY
-- ============================================================

INSERT INTO public.cat_registry (id, tenant_id, booking_id, cat_id, client_name, cat_name, microchip, check_in_date, check_out_date, reason, notes, created_at, updated_at)
VALUES
  ('01ac62e5-8947-4b47-95f7-d708aae449c7', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111104', 'Giuseppe Russo', 'Pallina', '380260000444444', '2026-03-15', NULL, NULL, NULL, '2026-03-15 18:18:36.997029+00', '2026-03-15 18:18:37.17072+00'),
  ('b25f22c9-8746-47ec-9131-781a498af22f', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'a1111111-1111-1111-1111-111111111101', 'Marco Bianchi', 'Micio', '380260000111111', '2026-03-12', NULL, NULL, NULL, '2026-03-15 18:18:55.434224+00', '2026-03-15 18:18:55.58519+00'),
  ('9b84ad1d-87c3-4735-a1fa-18df6c092a93', 'a0000000-0000-0000-0000-000000000001', '6799e02e-e0f5-4e0a-9c25-ab8eaae7c76e', 'a1111111-1111-1111-1111-111111111102', 'Marco Bianchi', 'Luna', '380260000222222', '2026-03-12', NULL, NULL, NULL, '2026-03-15 18:18:55.434224+00', '2026-03-15 18:18:55.590428+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. CANCELLATION_POLICIES
-- ============================================================

INSERT INTO public.cancellation_policies (id, tenant_id, admin_fee, created_at, updated_at)
VALUES
  ('803e52ae-cb9c-418c-a1c2-5645c4ff4729', NULL, 15, '2026-03-09 12:52:51.627399+00', '2026-03-09 12:52:51.627399+00'),
  ('acf793d5-dc7d-4a3e-83cc-74223d4c66f2', 'a0000000-0000-0000-0000-000000000001', 15, '2026-03-12 18:14:33.384342+00', '2026-03-12 18:14:33.384342+00'),
  ('7e45f6ba-095d-41b4-83d3-e1056123ee21', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 15, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. CANCELLATION_POLICY_RULES
-- ============================================================

INSERT INTO public.cancellation_policy_rules (id, policy_id, days_before_checkin, refund_percentage, created_at)
VALUES
  ('ec812996-9505-47cf-8b54-00a7272b22c1', '803e52ae-cb9c-418c-a1c2-5645c4ff4729', 15, 100, '2026-03-09 12:52:52.207987+00'),
  ('29b40c85-9dce-4190-ab52-e09367d694fd', '803e52ae-cb9c-418c-a1c2-5645c4ff4729', 10, 50, '2026-03-09 12:52:52.207987+00'),
  ('7362fffc-1804-4045-b279-77e41855f30f', '803e52ae-cb9c-418c-a1c2-5645c4ff4729', 3, 10, '2026-03-09 12:52:52.207987+00'),
  ('6778ecc4-c633-44c2-a967-5d83dbab9e43', 'acf793d5-dc7d-4a3e-83cc-74223d4c66f2', 15, 100, '2026-03-12 18:14:33.384342+00'),
  ('806f79e9-d638-4e6c-b5ea-2dc6e13d912e', 'acf793d5-dc7d-4a3e-83cc-74223d4c66f2', 10, 50, '2026-03-12 18:14:33.384342+00'),
  ('a27e1e21-9352-4e09-b1db-83120fc17009', 'acf793d5-dc7d-4a3e-83cc-74223d4c66f2', 3, 10, '2026-03-12 18:14:33.384342+00'),
  ('84db531e-16a4-45b2-a03b-638113b2dac0', '7e45f6ba-095d-41b4-83d3-e1056123ee21', 15, 100, '2026-03-13 19:01:06.137419+00'),
  ('d461385f-6de9-4424-bc6c-ea5abbfed706', '7e45f6ba-095d-41b4-83d3-e1056123ee21', 10, 50, '2026-03-13 19:01:06.137419+00'),
  ('ea632f51-98bf-46b3-862a-93422718042a', '7e45f6ba-095d-41b4-83d3-e1056123ee21', 3, 10, '2026-03-13 19:01:06.137419+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. PRICE_LISTS (global + tenant-specific)
-- ============================================================

INSERT INTO public.price_lists (id, tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type, created_at, updated_at)
VALUES
  -- Global templates
  ('53a87fd3-9945-4797-9204-cf4e7229e331', NULL, 'Soggiorno Alta stagione', 'stagionale', 'alta', 30.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-09 09:05:12.677174+00', '2026-03-09 09:05:12.677174+00'),
  ('7bb74e42-f169-40a7-8e14-7c9ee3bfce07', NULL, 'Soggiorno Bassa stagione', 'stagionale', 'bassa', 20.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-09 09:05:30.985958+00', '2026-03-09 09:05:30.985958+00'),
  ('7ab0a8f4-757f-40c4-b93f-9105b1a5774e', NULL, 'Soggiorno Media stagione', 'stagionale', 'media', 25.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-09 09:05:46.22677+00', '2026-03-09 09:05:46.22677+00'),
  ('5fffa327-08e6-438e-b22a-300927042ad9', NULL, 'Cat taxi', 'extra_km', NULL, 20.00, 0.00, true, NULL, NULL, 0, 10, 0.5, NULL, NULL, '2026-03-09 09:06:26.798186+00', '2026-03-09 09:06:26.798186+00'),
  ('a297a5bf-3ab4-4a38-8ecd-6d2aec208bbb', NULL, 'Cat veterinary', 'extra_una_tantum', NULL, 0.00, 0.00, true, NULL, NULL, 10, 0, 0, NULL, NULL, '2026-03-09 09:06:43.116006+00', '2026-03-09 09:06:43.116006+00'),
  ('215708cd-16b2-41ce-bd03-6b42b9ca461f', NULL, 'Somministrazione farmaci', 'extra_giornaliero', NULL, 5.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-09 09:07:02.29165+00', '2026-03-09 09:07:02.29165+00'),
  -- Tenant: La Zampa Felice
  ('c0f04c91-e5c1-4474-b87e-13eca8641564', 'a0000000-0000-0000-0000-000000000001', 'Soggiorno Alta stagione', 'stagionale', 'alta', 30.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-12 18:14:33.384342+00', '2026-03-12 18:14:33.384342+00'),
  -- Tenant: admin (copies from global)
  ('3589ce8b-4d2d-42fe-abc6-46e18009baeb', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Soggiorno Alta stagione', 'stagionale', 'alta', 30.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00'),
  ('5f866925-796c-4f63-b702-ff0dfa928c58', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Soggiorno Bassa stagione', 'stagionale', 'bassa', 20.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00'),
  ('345d9b26-6c6e-4283-bd10-9bf09b87669d', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Soggiorno Media stagione', 'stagionale', 'media', 25.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00'),
  ('eecf105c-5f88-4028-b57f-a8c8b81c271c', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Cat taxi', 'extra_km', NULL, 20.00, 0.00, true, NULL, NULL, 0, 10, 0.5, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00'),
  ('7bab46c1-e59e-4604-ba1d-f276b3323865', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Cat veterinary', 'extra_una_tantum', NULL, 0.00, 0.00, true, NULL, NULL, 10, 0, 0, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00'),
  ('4fc9c981-36ff-435f-a8a7-48894737b887', '4b5f8a58-7bb8-4992-87cb-ce421fc2f640', 'Somministrazione farmaci', 'extra_giornaliero', NULL, 5.00, 0.00, true, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-13 19:01:06.137419+00', '2026-03-13 19:01:06.137419+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. LANDING_CONFIG
-- ============================================================

INSERT INTO public.landing_config (id, hero_title, hero_subtitle, hero_description, cta_text, show_trial_banner, trial_days, base_plan_price_yearly, pro_plan_price_yearly, base_plan_features, pro_plan_features, created_at, updated_at)
VALUES
  ('bb337441-70f8-4b44-91ec-673146d351ec', 'PetHotel Manager', 'Il gestionale completo per la tua pensione per animali', 'Gestisci prenotazioni, pagamenti, clienti e animali in un unico posto. Provalo gratis!', 'Inizia la prova gratuita', true, 14, 290, 490, '["Gestione prenotazioni","Calendario appuntamenti","Anagrafica clienti e animali","Registro presenze","1 pensione"]', '["Tutto del piano Base","Gestione pagamenti completa","Preventivi e documenti PDF","Occupazione casette","Planning e task","Multi-pensione (fino a 3)","Report e statistiche"]', '2026-03-12 12:07:16.884969+00', '2026-03-12 12:07:16.884969+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. DEMO_LEADS
-- ============================================================

INSERT INTO public.demo_leads (id, full_name, last_name, email, phone, pensione_name, message, lead_type, privacy_accepted, confirmed, confirmed_at, token, created_at)
VALUES
  ('9506b94d-17b0-48d1-8dc4-a5b4bcd41b14', 'sdad', 'asdasda', 'regnew02@gmail.com', '3459663542', NULL, NULL, 'prova_gratuita', true, true, '2026-03-13 16:01:54.433+00', '1a778332-5ba9-45ec-9313-4269ca1f5ecb', '2026-03-13 16:01:29.490469+00'),
  ('80af3854-2545-43a5-a5bf-e55eebe8f855', 'cicc', 'dipap', 'dddd@sadsa.it', '3496638827', NULL, NULL, 'prova_gratuita', true, true, '2026-03-13 16:11:08.242+00', '56a2cf98-4b00-445d-8510-172497d76a27', '2026-03-13 16:10:47.31378+00'),
  ('b88116a6-25b5-4d2e-8ac6-908e0e4c11a5', 'xcdsc', 'sdsdsd', 'regnew2@gmail.com', '3256456262', NULL, NULL, 'prova_gratuita', true, true, '2026-03-13 16:13:13.455+00', '3ef796f9-ddc0-4542-b3c7-49b52dec4bc8', '2026-03-13 16:13:04.059859+00'),
  ('9cd110b2-40fa-4aa7-8b9c-00aabeb7e8e0', 'ffsdfds', NULL, 'reg@dsa.it', '324234243', 'dfsfds', 'cxsvs', 'demo_live', true, true, '2026-03-13 16:29:30.372+00', '10500963-d7ca-4e18-a702-61442aaf6a72', '2026-03-13 16:29:09.962965+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 19. EMAIL_SEND_STATE
-- ============================================================

INSERT INTO public.email_send_state (id, send_delay_ms, batch_size, auth_email_ttl_minutes, transactional_email_ttl_minutes, retry_after_until, updated_at)
VALUES (1, 200, 10, 15, 60, NULL, '2026-03-12 20:27:28.425248+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 20. SLOT_CONFIGS (global templates - too many rows, inserting globals only)
-- ============================================================

-- Global slot configs (tenant_id IS NULL)
INSERT INTO public.slot_configs (id, tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type, created_at, updated_at)
VALUES
  ('417e4f4a-3dbb-4f98-9b0b-596587aca92e', NULL, 0, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58.341848+00', '2026-03-09 09:03:58.341848+00'),
  ('12342943-7906-4291-bdf1-4beaedbb052a', NULL, 1, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58.684115+00', '2026-03-09 09:03:58.684115+00'),
  ('a3c34e5f-0000-0000-0000-000000000001', NULL, 2, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000002', NULL, 3, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000003', NULL, 4, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000004', NULL, 5, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000005', NULL, 6, '15:00:00', '18:30:00', 30, 1, true, 'check_in', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000010', NULL, 0, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000011', NULL, 1, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000012', NULL, 2, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000013', NULL, 3, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000014', NULL, 4, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000015', NULL, 5, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00'),
  ('a3c34e5f-0000-0000-0000-000000000016', NULL, 6, '10:00:00', '12:30:00', 30, 1, true, 'check_out', '2026-03-09 09:03:58+00', '2026-03-09 09:03:58+00')
ON CONFLICT (id) DO NOTHING;

-- NOTE: Tenant-specific slot_configs will be auto-created by copy_global_templates_to_tenant()

-- ============================================================
-- 21. ROLE_PERMISSIONS (subset - global defaults)
-- ============================================================

-- These are the global role_permissions (tenant_id IS NULL)
-- Too many rows to list individually. Use copy_global_templates_to_tenant() for tenant copies.
-- Key permissions for operatore role:
INSERT INTO public.role_permissions (id, tenant_id, role, resource, is_visible, can_read, can_write, can_delete, created_at, updated_at)
VALUES
  -- operatore
  ('97f2bc0a-d546-42fd-98dc-63c8ccbe5483', NULL, 'operatore', 'dashboard', true, true, false, false, '2026-03-09 07:52:55.479898+00', '2026-03-09 08:25:48.823598+00'),
  ('6b354cb4-971b-461e-ac73-b264fbf0b7ea', NULL, 'operatore', 'preventivi', false, false, false, false, '2026-03-09 07:52:55.847297+00', '2026-03-09 08:25:49.062048+00'),
  ('1c88e68b-3cfa-42a7-a267-02aebfaccb90', NULL, 'operatore', 'prenotazioni', false, false, false, false, '2026-03-09 07:52:56.220923+00', '2026-03-09 08:25:49.311814+00'),
  ('0f066885-37d0-4c33-92eb-fe339bde42af', NULL, 'operatore', 'appuntamenti', false, false, false, false, '2026-03-09 07:52:56.713481+00', '2026-03-09 08:25:49.564984+00'),
  ('f191e220-a421-4113-a8d9-7954a9e40443', NULL, 'operatore', 'check-in', true, true, false, false, '2026-03-09 07:52:57.083566+00', '2026-03-09 07:52:57.083566+00'),
  -- manager
  ('a74c9365-90b2-4785-be4e-94167ca6dcc3', NULL, 'manager', 'occupazione', true, true, true, false, '2026-03-09 08:26:29.487312+00', '2026-03-09 08:30:18.285786+00'),
  ('ccccd4fd-44d1-4349-9cae-3aa75b09c163', NULL, 'manager', 'utenti', false, false, false, false, '2026-03-09 08:26:29.855692+00', '2026-03-09 08:30:18.548085+00'),
  ('aed28be8-5f8a-40f2-bca1-52f20a93853e', NULL, 'manager', 'template-email', false, false, false, false, '2026-03-09 08:26:30.22532+00', '2026-03-09 08:30:19.01542+00'),
  ('2f088beb-1bb9-44bd-92d0-7eac39e12308', NULL, 'manager', 'pensione', false, false, false, false, '2026-03-09 08:26:30.591544+00', '2026-03-09 08:30:19.276965+00'),
  ('8d77c635-bbe0-4969-925d-6d4714cda220', NULL, 'manager', 'admin', false, false, false, false, '2026-03-09 08:26:30.959316+00', '2026-03-09 08:30:19.644933+00'),
  -- ceo
  ('cddd3c66-a12a-4ffa-905f-f2231cf3f63b', NULL, 'ceo', 'dashboard', true, true, true, false, '2026-03-09 08:29:13.307641+00', '2026-03-09 08:42:59.295844+00'),
  ('78b9f1c9-319b-4e8d-9682-3e322d2a8e9a', NULL, 'ceo', 'preventivi', true, true, true, false, '2026-03-09 08:29:13.672483+00', '2026-03-09 08:42:59.661756+00'),
  ('58d59aa5-6aae-4678-9038-adbffaa7d919', NULL, 'ceo', 'prenotazioni', true, true, true, false, '2026-03-09 08:29:14.043967+00', '2026-03-09 08:43:00.158684+00'),
  ('e6f9fa72-07f3-429f-942c-943aa5204dc8', NULL, 'ceo', 'appuntamenti', true, true, true, false, '2026-03-09 08:29:14.396239+00', '2026-03-09 08:43:00.643199+00'),
  ('91f60e9c-2c5a-4974-a7d0-c836a03a2ac8', NULL, 'ceo', 'check-in', true, true, true, false, '2026-03-09 08:29:14.763033+00', '2026-03-09 08:43:01.140792+00'),
  ('7ae988b9-fa6a-4d3e-9f4b-67232fd2a7a8', NULL, 'ceo', 'check-out', true, true, true, false, '2026-03-09 08:29:15.130928+00', '2026-03-09 08:43:01.628442+00'),
  ('5e6b7f9c-9b32-413f-9188-cb3ef5c0f9f6', NULL, 'ceo', 'pagamenti', true, true, true, false, '2026-03-09 08:29:15.517049+00', '2026-03-09 08:43:01.995703+00'),
  ('4af2e21e-24a1-42cc-9584-3d630c5fa9e0', NULL, 'ceo', 'clienti', true, true, true, false, '2026-03-09 08:29:15.868134+00', '2026-03-09 08:43:02.487301+00'),
  ('0f8e3b3f-713e-45d5-85ec-09febe7144e6', NULL, 'ceo', 'gatti', true, true, true, false, '2026-03-09 08:29:16.238164+00', '2026-03-09 08:43:02.857035+00'),
  ('4f8b7375-e67e-4753-9e50-35a88bddfa82', NULL, 'ceo', 'registro-gatti', true, true, true, false, '2026-03-09 08:29:16.60279+00', '2026-03-09 08:43:03.23404+00'),
  ('85046146-e74e-4b2a-ad96-34de4cadbfc1', NULL, 'ceo', 'planning', true, true, true, false, '2026-03-09 08:29:16.979396+00', '2026-03-09 08:43:03.59764+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Re-enable triggers
-- ============================================================

SET session_replication_role = 'origin';

-- ============================================================
-- NOTES:
-- 1. Profiles and user_roles are NOT included because they
--    depend on auth.users IDs which must be created first
--    in the new project
-- 2. After creating users, the handle_new_user trigger will
--    auto-create profiles
-- 3. You'll need to manually assign roles via user_roles
-- 4. Audit log, email logs, trial data are empty/skipped
--    as they are operational data
-- 5. Slot configs for tenants can be re-created using:
--    SELECT copy_global_templates_to_tenant('tenant-id');
-- ============================================================
