import { useState, useEffect, useCallback } from 'react';
import { getGoldMarketProvider } from '../providers';
import { interpolateHistoricalPrices } from '../calculations/gold';
import type { HistoricalBar } from '../types/gold';
import type { SupportedCurrency } from '../types/gold';
import type { FxRates } from '../types/gold';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

interface UseHistoricalChartReturn {
  data: { date: string; price: number }[];
  isLoading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

function getDateRange(range: TimeRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (range) {
    case '1D':
      from.setDate(from.getDate() - 1);
      break;
    case '1W':
      from.setDate(from.getDate() - 7);
      break;
    case '1M':
      from.setMonth(from.getMonth() - 1);
      break;
    case '3M':
      from.setMonth(from.getMonth() - 3);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function useHistoricalChart(
  currency: SupportedCurrency,
  fxRates: FxRates | null
): UseHistoricalChartReturn {
  const [data, setData] = useState<{ date: string; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [rawBars, setRawBars] = useState<HistoricalBar[]>([]);

  // Fetch raw historical data (USD) - only when timeRange changes
  const fetchRawData = useCallback(async () => {
    const provider = getGoldMarketProvider();
    if (!provider.getHistoricalGoldData) {
      setError('Historical data not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { from, to } = getDateRange(timeRange);
      const bars = await provider.getHistoricalGoldData(from, to);
      // Store raw bars (USD prices) in state for reuse
      setRawBars(bars);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  // Convert raw bars to chart data using current FX rates and currency
  // This runs whenever raw bars or currency/FX rates change, but doesn't re-fetch
  useEffect(() => {
    if (rawBars && rawBars.length > 0) {
      const fallbackFx = fxRates || {
        EURUSD: 1.085,
        GBPUSD: 1.272,
        USDCHF: 0.878,
        timestamp: new Date().toISOString(),
      };
      const chartData = interpolateHistoricalPrices(rawBars, currency, fallbackFx);
      setData(chartData);
    }
  }, [rawBars, currency, fxRates]);

  useEffect(() => {
    fetchRawData();
  }, [fetchRawData]);

  const fetchData = useCallback(async () => {
    await fetchRawData();
  }, [fetchRawData]);

  return { data, isLoading, error, timeRange, setTimeRange };
}
