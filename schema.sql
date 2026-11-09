-- चक्की बुक — multi-tenant schema (D1 / SQLite)
-- हर पंक्ति business_id से बँधी है; सारी क्वेरी सत्र से मिले business_id पर सीमित रहती हैं।

CREATE TABLE IF NOT EXISTS businesses (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL UNIQUE,
  address      TEXT NOT NULL DEFAULT '',
  upi          TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  pass_hash    TEXT NOT NULL,
  salt         TEXT NOT NULL,
  created_at   INTEGER NOT NULL
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
  active       INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS services_biz ON services(business_id);

CREATE TABLE IF NOT EXISTS customers (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_biz_name ON customers(business_id, name_key);

CREATE TABLE IF NOT EXISTS entries (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  customer_id  TEXT,
  kind         TEXT NOT NULL,
  service_id   TEXT,
  name         TEXT NOT NULL DEFAULT '',
  qty          REAL,
  rate_paise   INTEGER,
  amount_paise INTEGER NOT NULL,
  paid         INTEGER NOT NULL DEFAULT 1,
  note         TEXT NOT NULL DEFAULT '',
  token_no     INTEGER,
  day          TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_biz_time ON entries(business_id, created_at);
CREATE INDEX IF NOT EXISTS entries_biz_cust ON entries(business_id, customer_id);

CREATE TABLE IF NOT EXISTS tokens (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  day          TEXT NOT NULL,
  no           INTEGER NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  service_id   TEXT,
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
