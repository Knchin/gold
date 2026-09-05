import { useState, useEffect, useCallback, useRef } from 'react';
import { getGoldMarketProvider } from '../providers';
import { calculatePricePerGram, calculatePriceByKarat, isQuoteFresh } from '../calculations/gold';
import { loadPreferences } from '../stores/preferences';
import { isMarketOpen, msUntilNextOpen } from '../utils/marketHours';
import type { GoldPriceData, DataStatus, SupportedCurrency, KaratValue } from '../types/gold';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

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
    if (respectMarketHours && !isDemoMode && !isMarketOpen()) {
      if (!mountedRef.current) return;
      setStatus('market-closed');
      scheduleWakeup();
      return;
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
        : fresh
          ? quote.isStale
            ? 'delayed'
            : 'live'
          : 'stale';

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
      const intervalMs = respectMarketHours && !isDemoMode && isMarketOpen()
        ? prefs.marketHoursIntervalMs ?? prefs.refreshIntervalMs
        : prefs.refreshIntervalMs;
      intervalRef.current = window.setInterval(fetchData, intervalMs);
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
