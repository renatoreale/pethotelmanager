-- =============================================
-- PETHOTELMANAGER - MySQL DDL
-- Generato da schema PostgreSQL/Supabase
-- Data: 2026-03-31
-- =============================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- TABELLA DI SUPPORTO: users (replica auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- tenants
-- =============================================
CREATE TABLE IF NOT EXISTS tenants (
  id                      CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name                    TEXT           NOT NULL,
  slug                    VARCHAR(255)   NOT NULL UNIQUE,
  address                 TEXT,
  phone                   VARCHAR(50),
  email                   VARCHAR(255),
  num_singole             INT            NOT NULL DEFAULT 0,
  num_doppie              INT            NOT NULL DEFAULT 0,
  occupancy_rule_days     INT            NOT NULL DEFAULT 4,
  created_at              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  stay_calc_type          VARCHAR(50)    NOT NULL DEFAULT 'notti',
  count_checkin_day       TINYINT(1)     NOT NULL DEFAULT 1,
  count_checkout_day      TINYINT(1)     NOT NULL DEFAULT 1,
  partita_iva             VARCHAR(20),
  pec                     VARCHAR(255),
  titolare_name           VARCHAR(255),
  logo_url                TEXT,
  cap                     VARCHAR(10),
  city                    VARCHAR(100),
  max_cats                INT            NOT NULL DEFAULT 0,
  pet_type                ENUM('gatti','cani','entrambi') NOT NULL DEFAULT 'gatti',
  num_singole_gatti       INT            NOT NULL DEFAULT 0,
  num_doppie_gatti        INT            NOT NULL DEFAULT 0,
  num_singole_cani        INT            NOT NULL DEFAULT 0,
  num_doppie_cani         INT            NOT NULL DEFAULT 0,
  iban                    VARCHAR(34),
  bank_name               VARCHAR(255),
  iban_holder             VARCHAR(255),
  bollo_amount            DECIMAL(10,2)  NOT NULL DEFAULT 0,
  preventivo_validity_days INT           NOT NULL DEFAULT 5,
  preventivo_footer_text  TEXT,
  locale                  VARCHAR(10)    NOT NULL DEFAULT 'it',
  bck                     CHAR(1)        NOT NULL DEFAULT 'Y',
  dt_bck                  DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- profiles
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL UNIQUE,
  full_name  VARCHAR(255),
  avatar_url TEXT,
  phone      VARCHAR(50),
  tenant_id  CHAR(36),
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME,
  CONSTRAINT fk_profiles_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_profiles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_profiles_user_id   ON profiles(user_id);
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);

-- =============================================
-- user_roles
-- =============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id        CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id   CHAR(36)  NOT NULL,
  role      ENUM('admin','ceo','titolare','manager','operatore') NOT NULL,
  tenant_id CHAR(36),
  bck       CHAR(1)   NOT NULL DEFAULT 'Y',
  dt_bck    DATETIME,
  UNIQUE KEY uq_user_roles (user_id, role, tenant_id),
  CONSTRAINT fk_user_roles_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);

-- =============================================
-- clients
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  first_name       VARCHAR(255) NOT NULL,
  last_name        VARCHAR(255) NOT NULL,
  email            VARCHAR(255),
  phone            VARCHAR(50),
  fiscal_code      VARCHAR(20),
  address          TEXT,
  notes            TEXT,
  is_blacklisted   TINYINT(1)   NOT NULL DEFAULT 0,
  blacklist_reason TEXT,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id          CHAR(36),
  portal_activated TINYINT(1)   NOT NULL DEFAULT 0,
  bck              CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck           DATETIME,
  CONSTRAINT fk_clients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_clients_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_clients_tenant_lastname ON clients(tenant_id, last_name);
CREATE UNIQUE INDEX idx_clients_user_id ON clients(user_id);

-- =============================================
-- cats
-- =============================================
CREATE TABLE IF NOT EXISTS cats (
  id                CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id         CHAR(36)       NOT NULL,
  client_id         CHAR(36)       NOT NULL,
  name              VARCHAR(255)   NOT NULL,
  breed             VARCHAR(255),
  color             VARCHAR(100),
  birth_date        DATE,
  gender            VARCHAR(20),
  microchip         VARCHAR(50),
  weight_kg         DECIMAL(5,2),
  is_neutered       TINYINT(1)     DEFAULT 0,
  medical_notes     TEXT,
  dietary_notes     TEXT,
  behavioral_notes  TEXT,
  needs_double_cage TINYINT(1)     NOT NULL DEFAULT 0,
  sibling_group_id  CHAR(36),
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pet_type          ENUM('gatti','cani','entrambi'),
  photo_url         TEXT,
  bck               CHAR(1)        NOT NULL DEFAULT 'Y',
  dt_bck            DATETIME,
  CONSTRAINT fk_cats_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_cats_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cats_tenant_client ON cats(tenant_id, client_id);

-- =============================================
-- quote_requests
-- =============================================
CREATE TABLE IF NOT EXISTS quote_requests (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  client_id        CHAR(36)     NOT NULL,
  check_in_date    DATE         NOT NULL,
  check_out_date   DATE         NOT NULL,
  num_pets         INT          NOT NULL DEFAULT 1,
  pet_names        TEXT,
  notes            TEXT,
  status           VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  rejection_reason TEXT,
  bck              CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck           DATETIME,
  CONSTRAINT fk_quote_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_quote_requests_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- bookings
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  client_id        CHAR(36)     NOT NULL,
  booking_number   VARCHAR(50)  NOT NULL,
  status           ENUM('preventivo','confermata','check_in','in_corso','check_out','chiusa','cancellata','rimborsata','scaduto') NOT NULL DEFAULT 'preventivo',
  check_in_date    DATE         NOT NULL,
  check_out_date   DATE         NOT NULL,
  cage_pool_type   ENUM('singola','doppia') NOT NULL DEFAULT 'singola',
  units_occupied   INT          NOT NULL DEFAULT 1,
  total_amount     DECIMAL(10,2) DEFAULT 0,
  deposit_amount   DECIMAL(10,2) DEFAULT 0,
  notes            TEXT,
  created_by       CHAR(36),
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  price_breakdown  JSON,
  pet_type         ENUM('gatti','cani','entrambi'),
  quote_request_id CHAR(36),
  bck              CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck           DATETIME,
  CONSTRAINT fk_bookings_tenant        FOREIGN KEY (tenant_id)        REFERENCES tenants(id)        ON DELETE CASCADE,
  CONSTRAINT fk_bookings_client        FOREIGN KEY (client_id)        REFERENCES clients(id),
  CONSTRAINT fk_bookings_created_by    FOREIGN KEY (created_by)       REFERENCES users(id)          ON DELETE SET NULL,
  CONSTRAINT fk_bookings_quote_request FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bookings_tenant_status   ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_tenant_checkin  ON bookings(tenant_id, check_in_date);
CREATE INDEX idx_bookings_tenant_checkout ON bookings(tenant_id, check_out_date);
CREATE INDEX idx_bookings_tenant_client   ON bookings(tenant_id, client_id);

-- =============================================
-- booking_cats
-- =============================================
CREATE TABLE IF NOT EXISTS booking_cats (
  id         CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  cat_id     CHAR(36) NOT NULL,
  bck        CHAR(1)  NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME,
  UNIQUE KEY uq_booking_cats (booking_id, cat_id),
  CONSTRAINT fk_booking_cats_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_cats_cat     FOREIGN KEY (cat_id)     REFERENCES cats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_booking_cats_booking ON booking_cats(booking_id);
CREATE INDEX idx_booking_cats_cat     ON booking_cats(cat_id);

-- =============================================
-- payment_methods
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id  CHAR(36),
  name       TEXT         NOT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME,
  CONSTRAINT fk_payment_methods_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- payments
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id                CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id         CHAR(36)      NOT NULL,
  booking_id        CHAR(36)      NOT NULL,
  payment_type      ENUM('caparra','saldo','extra','rimborso') NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  method            VARCHAR(100),
  payment_date      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes             TEXT,
  created_by        CHAR(36),
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method_id CHAR(36),
  bck               CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck            DATETIME,
  CONSTRAINT fk_payments_tenant         FOREIGN KEY (tenant_id)         REFERENCES tenants(id)         ON DELETE CASCADE,
  CONSTRAINT fk_payments_booking        FOREIGN KEY (booking_id)        REFERENCES bookings(id)        ON DELETE CASCADE,
  CONSTRAINT fk_payments_created_by     FOREIGN KEY (created_by)        REFERENCES users(id)           ON DELETE SET NULL,
  CONSTRAINT fk_payments_method         FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_tenant_booking ON payments(tenant_id, booking_id);
CREATE INDEX idx_payments_tenant_date    ON payments(tenant_id, payment_date);

-- =============================================
-- appointments
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id               CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id        CHAR(36)  NOT NULL,
  booking_id       CHAR(36)  NOT NULL,
  appointment_type ENUM('check_in','check_out') NOT NULL,
  scheduled_at     DATETIME  NOT NULL,
  duration_minutes INT       NOT NULL DEFAULT 30,
  confirmed        TINYINT(1) NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck              CHAR(1)   NOT NULL DEFAULT 'Y',
  dt_bck           DATETIME,
  CONSTRAINT fk_appointments_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
  CONSTRAINT fk_appointments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_tenant_scheduled ON appointments(tenant_id, scheduled_at);
CREATE INDEX idx_appointments_tenant_booking   ON appointments(tenant_id, booking_id);

-- =============================================
-- slot_configs
-- =============================================
CREATE TABLE IF NOT EXISTS slot_configs (
  id                      CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id               CHAR(36),
  day_of_week             TINYINT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time              TIME        NOT NULL,
  end_time                TIME        NOT NULL,
  slot_duration_minutes   INT         NOT NULL DEFAULT 30,
  max_appointments        INT         NOT NULL DEFAULT 1,
  is_active               TINYINT(1)  NOT NULL DEFAULT 1,
  created_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  appointment_type        VARCHAR(50) NOT NULL DEFAULT 'check_in',
  bck                     CHAR(1)     NOT NULL DEFAULT 'Y',
  dt_bck                  DATETIME,
  CONSTRAINT fk_slot_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- cage_overrides
-- =============================================
CREATE TABLE IF NOT EXISTS cage_overrides (
  id              CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id       CHAR(36)  NOT NULL,
  cage_pool_type  ENUM('singola','doppia') NOT NULL,
  override_date   DATE      NOT NULL,
  capacity_change INT       NOT NULL,
  reason          TEXT,
  created_by      CHAR(36),
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck             CHAR(1)   NOT NULL DEFAULT 'Y',
  dt_bck          DATETIME,
  CONSTRAINT fk_cage_overrides_tenant     FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_cage_overrides_created_by FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cage_overrides_tenant_date ON cage_overrides(tenant_id, override_date);

-- =============================================
-- price_lists
-- =============================================
CREATE TABLE IF NOT EXISTS price_lists (
  id                   CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id            CHAR(36),
  name                 TEXT          NOT NULL,
  cage_pool_type       ENUM('singola','doppia'),
  price_per_day        DECIMAL(10,2) DEFAULT 0,
  extra_cat_supplement DECIMAL(10,2) DEFAULT 0,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  valid_from           DATE,
  valid_to             DATE,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  tariff_type          ENUM('stagionale','extra_giornaliero','extra_km','extra_una_tantum') NOT NULL DEFAULT 'stagionale',
  season               VARCHAR(100),
  fixed_cost           DECIMAL(10,2) DEFAULT 0,
  included_km          DECIMAL(10,2) DEFAULT 0,
  extra_km_cost        DECIMAL(10,2) DEFAULT 0,
  pet_type             ENUM('gatti','cani','entrambi'),
  bck                  CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck               DATETIME,
  CONSTRAINT fk_price_lists_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- cat_registry
-- =============================================
CREATE TABLE IF NOT EXISTS cat_registry (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id      CHAR(36)     NOT NULL,
  booking_id     CHAR(36)     NOT NULL,
  cat_id         CHAR(36)     NOT NULL,
  client_name    VARCHAR(255) NOT NULL,
  cat_name       VARCHAR(255) NOT NULL,
  microchip      VARCHAR(50),
  check_in_date  DATE         NOT NULL,
  check_out_date DATE,
  reason         TEXT,
  notes          TEXT,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck            CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck         DATETIME,
  CONSTRAINT fk_cat_registry_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
  CONSTRAINT fk_cat_registry_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_cat_registry_cat     FOREIGN KEY (cat_id)     REFERENCES cats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cat_registry_tenant_checkin ON cat_registry(tenant_id, check_in_date);
CREATE INDEX idx_cat_registry_tenant_booking ON cat_registry(tenant_id, booking_id);

-- =============================================
-- booking_counters
-- =============================================
CREATE TABLE IF NOT EXISTS booking_counters (
  tenant_id    CHAR(36)  NOT NULL,
  year         SMALLINT  NOT NULL,
  last_counter INT       NOT NULL DEFAULT 99,
  bck          CHAR(1)   NOT NULL DEFAULT 'Y',
  dt_bck       DATETIME,
  PRIMARY KEY (tenant_id, year),
  CONSTRAINT fk_booking_counters_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- planning_tasks
-- =============================================
CREATE TABLE IF NOT EXISTS planning_tasks (
  id           CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id    CHAR(36)  NOT NULL,
  task_date    DATE      NOT NULL,
  title        TEXT      NOT NULL,
  description  TEXT,
  assigned_to  CHAR(36),
  completed    TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME,
  completed_by CHAR(36),
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck          CHAR(1)   NOT NULL DEFAULT 'Y',
  dt_bck       DATETIME,
  CONSTRAINT fk_planning_tasks_tenant       FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_planning_tasks_assigned_to  FOREIGN KEY (assigned_to) REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_planning_tasks_completed_by FOREIGN KEY (completed_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_planning_tasks_tenant_date ON planning_tasks(tenant_id, task_date);

-- =============================================
-- email_templates
-- =============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  name       TEXT         NOT NULL,
  subject    TEXT         NOT NULL,
  body_html  LONGTEXT     NOT NULL,
  variables  JSON,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- email_log
-- =============================================
CREATE TABLE IF NOT EXISTS email_log (
  id                  CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id           CHAR(36)     NOT NULL,
  template_id         CHAR(36),
  recipient_email     VARCHAR(255) NOT NULL,
  subject             TEXT         NOT NULL,
  status              ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  sent_at             DATETIME,
  error_message       TEXT,
  metadata            JSON,
  created_by          CHAR(36),
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck                 CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck              DATETIME,
  CONSTRAINT fk_email_log_tenant     FOREIGN KEY (tenant_id)   REFERENCES tenants(id)         ON DELETE CASCADE,
  CONSTRAINT fk_email_log_template   FOREIGN KEY (template_id) REFERENCES email_templates(id),
  CONSTRAINT fk_email_log_created_by FOREIGN KEY (created_by)  REFERENCES users(id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- email_send_log
-- =============================================
CREATE TABLE IF NOT EXISTS email_send_log (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  message_id      TEXT,
  template_name   TEXT         NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status          ENUM('pending','sent','suppressed','failed','bounced','complained','dlq') NOT NULL,
  error_message   TEXT,
  metadata        JSON,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck             CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck          DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_email_send_log_created   ON email_send_log(created_at DESC);
CREATE INDEX idx_email_send_log_recipient ON email_send_log(recipient_email);

-- =============================================
-- email_send_state
-- =============================================
CREATE TABLE IF NOT EXISTS email_send_state (
  id                              INT      NOT NULL DEFAULT 1 PRIMARY KEY,
  retry_after_until               DATETIME,
  batch_size                      INT      NOT NULL DEFAULT 10,
  send_delay_ms                   INT      NOT NULL DEFAULT 200,
  auth_email_ttl_minutes          INT      NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INT      NOT NULL DEFAULT 60,
  updated_at                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck                             CHAR(1)  NOT NULL DEFAULT 'Y',
  dt_bck                          DATETIME,
  CONSTRAINT chk_email_send_state_id CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- suppressed_emails
-- =============================================
CREATE TABLE IF NOT EXISTS suppressed_emails (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  reason     ENUM('unsubscribe','bounce','complaint') NOT NULL,
  metadata   JSON,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_suppressed_emails_email ON suppressed_emails(email);

-- =============================================
-- email_unsubscribe_tokens
-- =============================================
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  token      VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at    DATETIME,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_unsubscribe_tokens_token ON email_unsubscribe_tokens(token);

-- =============================================
-- documents
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  booking_id    CHAR(36),
  document_type VARCHAR(100) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  storage_path  TEXT         NOT NULL,
  mime_type     VARCHAR(100) DEFAULT 'application/pdf',
  created_by    CHAR(36),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck           CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck        DATETIME,
  CONSTRAINT fk_documents_tenant     FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
  CONSTRAINT fk_documents_booking    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_created_by FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_documents_tenant_booking ON documents(tenant_id, booking_id);

-- =============================================
-- audit_log
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id   CHAR(36),
  table_name  VARCHAR(100) NOT NULL,
  record_id   CHAR(36)     NOT NULL,
  operation   ENUM('INSERT','UPDATE','DELETE','RESTORE') NOT NULL,
  user_id     CHAR(36),
  user_role   VARCHAR(50),
  before_data JSON,
  after_data  JSON,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck         CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck      DATETIME,
  CONSTRAINT fk_audit_log_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_log_user    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_log_tenant_table ON audit_log(tenant_id, table_name);

-- =============================================
-- cancellation_policies
-- =============================================
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id         CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id  CHAR(36),
  admin_fee  DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck        CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME,
  UNIQUE KEY uq_cancellation_policies_tenant (tenant_id),
  CONSTRAINT fk_cancellation_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- cancellation_policy_rules
-- =============================================
CREATE TABLE IF NOT EXISTS cancellation_policy_rules (
  id                  CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  policy_id           CHAR(36)      NOT NULL,
  days_before_checkin INT           NOT NULL,
  refund_percentage   DECIMAL(5,2)  NOT NULL DEFAULT 100,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck                 CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck              DATETIME,
  UNIQUE KEY uq_cancellation_policy_rules (policy_id, days_before_checkin),
  CONSTRAINT fk_cancellation_policy_rules_policy FOREIGN KEY (policy_id) REFERENCES cancellation_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- payment_split_configs
-- =============================================
CREATE TABLE IF NOT EXISTS payment_split_configs (
  id                  CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id           CHAR(36)      NOT NULL,
  label               TEXT          NOT NULL,
  percentage          DECIMAL(5,2)  NOT NULL DEFAULT 0,
  payment_moment      VARCHAR(50)   NOT NULL DEFAULT 'caparra',
  sort_order          INT           NOT NULL DEFAULT 0,
  payment_method_note TEXT,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck                 CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck              DATETIME,
  CONSTRAINT fk_payment_split_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- landing_config
-- =============================================
CREATE TABLE IF NOT EXISTS landing_config (
  id                      CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  trial_days              INT           NOT NULL DEFAULT 14,
  base_plan_price_yearly  DECIMAL(10,2) NOT NULL DEFAULT 290,
  pro_plan_price_yearly   DECIMAL(10,2) NOT NULL DEFAULT 490,
  base_plan_features      JSON          NOT NULL,
  pro_plan_features       JSON          NOT NULL,
  hero_title              TEXT          NOT NULL DEFAULT 'CatHotel Manager',
  hero_subtitle           TEXT          NOT NULL DEFAULT 'Il gestionale completo per la tua pensione per animali',
  hero_description        TEXT          NOT NULL DEFAULT 'Gestisci prenotazioni, pagamenti, clienti e animali in un unico posto. Provalo gratis!',
  cta_text                TEXT          NOT NULL DEFAULT 'Inizia la prova gratuita',
  show_trial_banner       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck                     CHAR(1)       NOT NULL DEFAULT 'Y',
  dt_bck                  DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- trial_registrations
-- =============================================
CREATE TABLE IF NOT EXISTS trial_registrations (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id              CHAR(36)     NOT NULL UNIQUE,
  email                VARCHAR(255) NOT NULL,
  full_name            VARCHAR(255),
  pet_type             ENUM('gatti','cani','entrambi') NOT NULL DEFAULT 'gatti',
  tenant_id            CHAR(36),
  trial_start          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trial_end            DATETIME     NOT NULL,
  is_converted         TINYINT(1)   NOT NULL DEFAULT 0,
  converted_at         DATETIME,
  stripe_customer_id   VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  last_login_at        DATETIME,
  login_count          INT          NOT NULL DEFAULT 0,
  pages_visited        JSON         NOT NULL,
  actions_count        INT          NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck                  CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck               DATETIME,
  CONSTRAINT fk_trial_registrations_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_trial_registrations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trial_registrations_user_id    ON trial_registrations(user_id);
CREATE INDEX idx_trial_registrations_converted  ON trial_registrations(is_converted);

-- =============================================
-- trial_activity_log
-- =============================================
CREATE TABLE IF NOT EXISTS trial_activity_log (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  trial_id   CHAR(36)     NOT NULL,
  action     VARCHAR(255) NOT NULL,
  page       VARCHAR(255),
  metadata   JSON,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME,
  CONSTRAINT fk_trial_activity_log_trial FOREIGN KEY (trial_id) REFERENCES trial_registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trial_activity_log_trial_id   ON trial_activity_log(trial_id);
CREATE INDEX idx_trial_activity_log_created_at ON trial_activity_log(created_at);

-- =============================================
-- tenant_stripe_keys
-- =============================================
CREATE TABLE IF NOT EXISTS tenant_stripe_keys (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant_id         CHAR(36)     NOT NULL UNIQUE,
  stripe_secret_key TEXT         NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck               CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck            DATETIME,
  CONSTRAINT fk_tenant_stripe_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- demo_leads
-- =============================================
CREATE TABLE IF NOT EXISTS demo_leads (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  full_name        TEXT         NOT NULL,
  email            VARCHAR(255) NOT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_name        VARCHAR(255),
  phone            VARCHAR(50),
  privacy_accepted TINYINT(1)   NOT NULL DEFAULT 0,
  confirmed        TINYINT(1)   NOT NULL DEFAULT 0,
  confirmed_at     DATETIME,
  token            CHAR(36)     DEFAULT (UUID()),
  lead_type        VARCHAR(50)  NOT NULL DEFAULT 'prova_gratuita',
  pensione_name    VARCHAR(255),
  message          TEXT,
  bck              CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck           DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- system_config
-- =============================================
CREATE TABLE IF NOT EXISTS system_config (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  `key`      VARCHAR(255) NOT NULL UNIQUE,
  value      JSON         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bck        CHAR(1)      NOT NULL DEFAULT 'Y',
  dt_bck     DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================

SET FOREIGN_KEY_CHECKS = 1;
