-- Expense Tracking Table for TolMaal
CREATE TABLE IF NOT EXISTS expenses (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  category     TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  note         TEXT NOT NULL DEFAULT '',
  day          TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_time ON expenses(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_day ON expenses(business_id, day);
