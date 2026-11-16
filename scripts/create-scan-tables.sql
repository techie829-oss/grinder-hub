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
