-- Replaces the Wix "Reservations" CMS collection.
CREATE TABLE IF NOT EXISTS reservations (
  id                    TEXT PRIMARY KEY,
  created_at            TEXT NOT NULL,              -- ISO-8601 UTC
  updated_at            TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  source                TEXT NOT NULL DEFAULT 'online', -- online | manual | wix-import
  start_date            TEXT NOT NULL,              -- YYYY-MM-DD delivery
  end_date              TEXT NOT NULL,              -- YYYY-MM-DD pickup
  resources             TEXT NOT NULL,              -- JSON array of resource keys
  zone_key              TEXT,
  total                 REAL,                       -- quoted pre-tax total, USD
  terms_version         TEXT,
  agreed_at             TEXT,
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  site_address          TEXT,
  notes                 TEXT,
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  amount_paid_cents     INTEGER                     -- what Stripe actually collected, incl. tax
);

CREATE INDEX IF NOT EXISTS idx_reservations_active ON reservations (status, end_date);
