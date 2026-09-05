import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Cache/quota features disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface GoldPriceCache {
  id: number;
  price_per_ounce: number;
  bid: number | null;
  ask: number | null;
  timestamp_utc: string;
  source: string;
  is_stale: boolean;
  updated_at: string;
}

export interface FxRatesCache {
  id: number;
  eur_usd: number;
  gbp_usd: number;
  usd_chf: number;
  timestamp_utc: string;
  updated_at: string;
}

export interface QuotaTracker {
  id: number;
  calls_used: number;
  cycle_start_date: string;
  trial_ends_at: string | null;
  updated_at: string;
}

export const CACHE_MAX_AGE_MS = 300000; // 5 minutes