-- Chakki Book (Grinder Hub) — Multi-tenant schema (Cloudflare D1 / SQLite)
-- Strict, normalized schema with zero duplicate columns.

CREATE TABLE IF NOT EXISTS businesses (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  upi            TEXT NOT NULL DEFAULT '',
  note           TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'active',
  plan           TEXT NOT NULL DEFAULT 'free',
  is_super_admin INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER DEFAULT 0,
  pass_hash      TEXT NOT NULL,
  salt           TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash   TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_biz ON sessions(business_id);

CREATE TABLE IF NOT EXISTS services (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'kg',
  rate_paise   INTEGER NOT NULL DEFAULT 0,
  loss_rate_g  REAL NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS services_biz ON services(business_id);

CREATE TABLE IF NOT EXISTS products (
  id                 TEXT PRIMARY KEY,
  business_id        TEXT NOT NULL,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'both',
  unit               TEXT NOT NULL DEFAULT 'kg',
  default_rate_paise INTEGER NOT NULL DEFAULT 0,
  active             INTEGER NOT NULL DEFAULT 1,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS products_biz ON products(business_id);

CREATE TABLE IF NOT EXISTS customers (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,
  village      TEXT NOT NULL DEFAULT '',
  village_key  TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  photo        TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_biz_name_village ON customers(business_id, name_key, village_key);

CREATE TABLE IF NOT EXISTS entries (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  customer_id  TEXT,
  kind         TEXT NOT NULL,
  service_id   TEXT,
  item_name    TEXT NOT NULL DEFAULT '',
  unit         TEXT NOT NULL DEFAULT 'kg',
  name         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  gross_weight REAL,
  loss_g       REAL NOT NULL DEFAULT 0,
  net_weight   REAL,
  rate_paise   INTEGER,
  amount_paise INTEGER NOT NULL,
  paid         INTEGER NOT NULL DEFAULT 1,
  note         TEXT NOT NULL DEFAULT '',
  token_no     INTEGER,
  day          TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_biz_time ON entries(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entries_biz_cust ON entries(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_entries_cust_bal ON entries(business_id, customer_id, kind, paid, amount_paise, created_at);
CREATE INDEX IF NOT EXISTS idx_entries_biz_kind_paid ON entries(business_id, kind, paid, created_at);

CREATE TABLE IF NOT EXISTS tokens (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  day          TEXT NOT NULL,
  no           INTEGER NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  service_id   TEXT,
  gross_weight REAL DEFAULT 0,
  loss_g       REAL NOT NULL DEFAULT 0,
  net_weight   REAL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'waiting',
  created_at   INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tokens_biz_day_no ON tokens(business_id, day, no);
CREATE INDEX IF NOT EXISTS tokens_biz_day ON tokens(business_id, day, status);

CREATE TABLE IF NOT EXISTS day_counters (
  business_id  TEXT NOT NULL,
  day          TEXT NOT NULL,
  last_no      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day)
);

CREATE TABLE IF NOT EXISTS villages (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  UNIQUE(business_id, name)
);
CREATE INDEX IF NOT EXISTS idx_villages_biz ON villages(business_id, display_order);

-- Staging Tables for Notebook / Diary OCR Scanning
CREATE TABLE IF NOT EXISTS scans (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL,
  image_data    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  total_rows    INTEGER NOT NULL DEFAULT 0,
  approved_rows INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_biz ON scans(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scan_items (
  id                  TEXT PRIMARY KEY,
  scan_id             TEXT NOT NULL,
  business_id         TEXT NOT NULL,
  row_index           INTEGER NOT NULL,
  raw_text            TEXT NOT NULL DEFAULT '',
  parsed_name         TEXT NOT NULL DEFAULT '',
  parsed_village      TEXT NOT NULL DEFAULT '',
  gross_weight        REAL NOT NULL DEFAULT 0,
  loss_g              REAL NOT NULL DEFAULT 0,
  net_weight          REAL NOT NULL DEFAULT 0,
  matched_customer_id TEXT,
  match_confidence    REAL NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending',
  imported_token_id   TEXT,
  imported_entry_id   TEXT,
  created_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scan_items_scan ON scan_items(scan_id, row_index ASC);
CREATE INDEX IF NOT EXISTS idx_scan_items_biz ON scan_items(business_id, status);
