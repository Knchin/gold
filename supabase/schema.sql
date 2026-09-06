-- Supabase schema for GoldPrice PWA cache and quota tracking
-- Run this in Supabase SQL Editor

-- Gold price cache (singleton row, id=1)
CREATE TABLE IF NOT EXISTS gold_price_cache (
  id int PRIMARY KEY DEFAULT 1,
  price_per_ounce numeric NOT NULL,
  bid numeric,
  ask numeric,
  timestamp_utc timestamptz NOT NULL,
  source text NOT NULL,
  is_stale boolean NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- FX rates cache (singleton row, id=1)
CREATE TABLE IF NOT EXISTS fx_rates_cache (
  id int PRIMARY KEY DEFAULT 1,
  eur_usd numeric NOT NULL,
  gbp_usd numeric NOT NULL,
  usd_chf numeric NOT NULL,
  timestamp_utc timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Quota tracker (singleton row, id=1)
CREATE TABLE IF NOT EXISTS quota_tracker (
  id int PRIMARY KEY DEFAULT 1,
  calls_used int DEFAULT 0,
  cycle_start_date date DEFAULT CURRENT_DATE,
  trial_ends_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Historical gold prices (append-only, one row per fetch)
CREATE TABLE IF NOT EXISTS gold_price_history (
  id bigserial PRIMARY KEY,
  price_per_ounce numeric NOT NULL,
  bid numeric,
  ask numeric,
  timestamp_utc timestamptz NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- FX rates history (append-only)
CREATE TABLE IF NOT EXISTS fx_rates_history (
  id bigserial PRIMARY KEY,
  eur_usd numeric NOT NULL,
  gbp_usd numeric NOT NULL,
  usd_chf numeric NOT NULL,
  timestamp_utc timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for time-range queries
CREATE INDEX IF NOT EXISTS idx_gold_price_history_timestamp ON gold_price_history (timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rates_history_timestamp ON fx_rates_history (timestamp_utc DESC);

-- Enable RLS
ALTER TABLE gold_price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates_history ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key can read cache)
DROP POLICY IF EXISTS "Public read gold cache" ON gold_price_cache;
CREATE POLICY "Public read gold cache" ON gold_price_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read fx cache" ON fx_rates_cache;
CREATE POLICY "Public read fx cache" ON fx_rates_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read quota" ON quota_tracker;
CREATE POLICY "Public read quota" ON quota_tracker FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read gold history" ON gold_price_history;
CREATE POLICY "Public read gold history" ON gold_price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read fx history" ON fx_rates_history;
CREATE POLICY "Public read fx history" ON fx_rates_history FOR SELECT USING (true);

-- Allow anon to write cache (public cache for public app)
DROP POLICY IF EXISTS "Anon write gold cache" ON gold_price_cache;
CREATE POLICY "Anon write gold cache" ON gold_price_cache FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon update gold cache" ON gold_price_cache;
CREATE POLICY "Anon update gold cache" ON gold_price_cache FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anon write fx cache" ON fx_rates_cache;
CREATE POLICY "Anon write fx cache" ON fx_rates_cache FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon update fx cache" ON fx_rates_cache;
CREATE POLICY "Anon update fx cache" ON fx_rates_cache FOR UPDATE USING (true);

-- Service role write access (edge function uses service role)
DROP POLICY IF EXISTS "Service role write gold cache" ON gold_price_cache;
CREATE POLICY "Service role write gold cache" ON gold_price_cache FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write fx cache" ON fx_rates_cache;
CREATE POLICY "Service role write fx cache" ON fx_rates_cache FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write quota" ON quota_tracker;
CREATE POLICY "Service role write quota" ON quota_tracker FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write gold history" ON gold_price_history;
CREATE POLICY "Service role write gold history" ON gold_price_history FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write fx history" ON fx_rates_history;
CREATE POLICY "Service role write fx history" ON fx_rates_history FOR ALL USING (auth.role() = 'service_role');

-- RPC function for atomic quota increment
CREATE OR REPLACE FUNCTION increment_quota()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE quota_tracker
  SET calls_used = calls_used + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING calls_used INTO new_count;

  IF new_count IS NULL THEN
    INSERT INTO quota_tracker (id, calls_used, cycle_start_date)
    VALUES (1, 1, CURRENT_DATE)
    RETURNING calls_used INTO new_count;
  END IF;

  RETURN new_count;
END;
$$;

-- Initialize quota tracker row
INSERT INTO quota_tracker (id, calls_used, cycle_start_date, trial_ends_at)
VALUES (1, 0, CURRENT_DATE, '2026-09-12 23:59:59+00')
ON CONFLICT (id) DO NOTHING;

-- Initialize cache rows
INSERT INTO gold_price_cache (id, price_per_ounce, timestamp_utc, source, is_stale)
VALUES (1, 0, now(), 'init', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fx_rates_cache (id, eur_usd, gbp_usd, usd_chf, timestamp_utc)
VALUES (1, 1.0, 1.0, 1.0, now())
ON CONFLICT (id) DO NOTHING;