import { useState, useEffect, useCallback, useRef } from 'react';
import { getGoldMarketProvider } from '../providers';
import { calculatePricePerGram, calculatePriceByKarat, isQuoteFresh } from '../calculations/gold';
import { loadPreferences } from '../stores/preferences';
import { isMarketOpen, msUntilNextOpen } from '../utils/marketHours';
import { supabase } from '../utils/supabase';
import type { GoldPriceData, DataStatus, SupportedCurrency, KaratValue } from '../types/gold';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const CACHE_MAX_AGE_MS = 300000; // 5 minutes - matches provider

interface CachedData {
  quote: any;
  fxRates: any;
  timestamp: number;
}

async function getCachedData(): Promise<CachedData | null> {
  if (!supabase) return null;
  const [{ data: goldCache }, { data: fxCache }] = await Promise.all([
    supabase.from('gold_price_cache').select('*').eq('id', 1).single(),
    supabase.from('fx_rates_cache').select('*').eq('id', 1).single(),
  ]);
  if (!goldCache || !fxCache) return null;
  const age = Date.now() - new Date(goldCache.updated_at).getTime();
  if (age > CACHE_MAX_AGE_MS) return null;
  return {
    quote: {
      pricePerOunce: goldCache.price_per_ounce,
      currency: 'USD',
      bid: goldCache.bid,
      ask: goldCache.ask,
      timestamp: goldCache.timestamp_utc,
      source: goldCache.source,
      isStale: goldCache.is_stale,
    },
    fxRates: {
      EURUSD: fxCache.eur_usd,
      GBPUSD: fxCache.gbp_usd,
      USDCHF: fxCache.usd_chf,
      timestamp: fxCache.timestamp_utc,
    },
    timestamp: new Date(goldCache.updated_at).getTime(),
  };
}

interface UseGoldPriceReturn {
  data: GoldPriceData | null;
  status: DataStatus;
  error: string | null;
  isDemoMode: boolean;
  refresh: () => Promise<void>;
}

export function useGoldPrice(): UseGoldPriceReturn {
  const [data, setData] = useState<GoldPriceData | null>(null);
  const [status, setStatus] = useState<DataStatus>('updating');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const wakeupRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const prefs = loadPreferences();
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const respectMarketHours = prefs.respectMarketHours !== false;

  const clearWakeup = useCallback(() => {
    if (wakeupRef.current !== null) {
      window.clearTimeout(wakeupRef.current);
      wakeupRef.current = null;
    }
  }, []);

  const scheduleWakeup = useCallback(() => {
    clearWakeup();
    const delay = msUntilNextOpen();
    wakeupRef.current = window.setTimeout(() => {
      wakeupRef.current = null;
      if (mountedRef.current) fetchData();
    }, delay);
  }, []);

const fetchData = useCallback(async () => {
    const marketOpen = respectMarketHours && !isDemoMode && isMarketOpen();

    if (!marketOpen) {
      if (!mountedRef.current) return;
      setStatus('market-closed');
      scheduleWakeup();

      const cached = await getCachedData();
      if (cached) {
        const pricePerGram = calculatePricePerGram(cached.quote, cached.fxRates);
        const pricesByKarat = calculatePriceByKarat(pricePerGram);
        setData({
          quote: cached.quote,
          fxRates: cached.fxRates,
          pricePerGram,
          pricesByKarat,
          dailyChange: null,
          dailyChangePercent: null,
          status: 'market-closed',
          lastUpdated: new Date().toISOString(),
        });
      }
      return;
      // No fresh cache when market closed - fall through to fetch fresh data from API
    }

    clearWakeup();

    try {
      setStatus((prev) => (prev === 'live' || prev === 'demo' ? 'updating' : prev));
      setError(null);

      const provider = getGoldMarketProvider();
      const [quote, fxRates] = await Promise.all([
        provider.getGoldQuote('USD'),
        provider.getFxRates(),
      ]);

      if (!mountedRef.current) return;

      const pricePerGram = calculatePricePerGram(quote, fxRates);
      const pricesByKarat = calculatePriceByKarat(pricePerGram);

      const fresh = isQuoteFresh(quote.timestamp, STALE_THRESHOLD_MS);
      const isDemo = provider.name === 'mock';
      const nextStatus: DataStatus = isDemo
        ? 'demo'
        : marketOpen
          ? fresh
            ? quote.isStale
              ? 'delayed'
              : 'live'
            : 'stale'
          : 'market-closed';

      setData({
        quote,
        fxRates,
        pricePerGram,
        pricesByKarat,
        dailyChange: null,
        dailyChangePercent: null,
        status: nextStatus,
        lastUpdated: new Date().toISOString(),
      });
      setStatus(nextStatus);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStatus((prev) => {
        if (data) return 'stale';
        return 'reconnecting';
      });
    }
  }, [data, respectMarketHours, isDemoMode]);

  const refresh = useCallback(async () => {
    clearWakeup();
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    const scheduleInterval = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      const marketOpen = respectMarketHours && !isDemoMode && isMarketOpen();
      if (marketOpen) {
        const intervalMs = prefs.marketHoursIntervalMs ?? prefs.refreshIntervalMs;
        intervalRef.current = window.setInterval(fetchData, intervalMs);
      }
    };

    scheduleInterval();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      clearWakeup();
    };
  }, [fetchData, prefs.refreshIntervalMs, prefs.marketHoursIntervalMs, respectMarketHours, isDemoMode]);

  return { data, status, error, isDemoMode, refresh };
}