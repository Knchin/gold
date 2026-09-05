import type { GoldMarketProvider } from './types';
import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';

const BASE_URL = 'https://api.commoditypriceapi.com/v2';
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const GOLD_SYMBOL = 'XAU';
const FX_CACHE_MS = 6 * 60 * 60 * 1000;
const QUOTE_STALE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

interface CommodityRateEntry {
  rate?: number;
  bid?: number;
  ask?: number;
}

interface CommodityLatestResponse {
  timestamp?: number;
  rates?: Record<string, CommodityRateEntry | number>;
}

interface CommodityTimeSeriesResponse {
  rates?: Record<string, { open?: number; high?: number; low?: number; close?: number }>;
}

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export class CommodityPriceApiProvider implements GoldMarketProvider {
  name = 'commodityprice';
  private apiKey?: string;
  private cachedFx: FxRates | null = null;
  private cachedFxAt = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private authQuery(query: URLSearchParams): URLSearchParams {
    if (this.apiKey) {
      query.set('apiKey', this.apiKey);
    }
    return query;
  }

  async getGoldQuote(): Promise<GoldQuote> {
    const query = this.authQuery(new URLSearchParams({ symbols: GOLD_SYMBOL }));
    const res = await fetchWithTimeout(`${BASE_URL}/rates/latest?${query.toString()}`);
    const data: CommodityLatestResponse | null = await res.json().catch(() => null);

    if (!res.ok) {
      const message = (data as { message?: string } | null)?.message;
      throw new Error(`commoditypriceapi API error: ${res.status} ${message ?? res.statusText}`);
    }

    const goldRaw = data?.rates?.[GOLD_SYMBOL];
    if (goldRaw === undefined) {
      throw new Error('No gold rate returned from commoditypriceapi');
    }

    const entry: CommodityRateEntry | null =
      typeof goldRaw === 'object' && goldRaw !== null ? goldRaw : null;

    const price =
      entry?.rate != null
        ? Number(entry.rate)
        : typeof goldRaw === 'number'
          ? goldRaw
          : NaN;
    const bid = entry?.bid != null && Number.isFinite(Number(entry.bid)) ? Number(entry.bid) : null;
    const ask = entry?.ask != null && Number.isFinite(Number(entry.ask)) ? Number(entry.ask) : null;

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Invalid gold rate received from commoditypriceapi');
    }

    const tsSeconds = data?.timestamp != null ? Number(data.timestamp) : NaN;
    const timestamp =
      Number.isFinite(tsSeconds) && tsSeconds > 0
        ? new Date(tsSeconds * 1000).toISOString()
        : new Date().toISOString();

    return {
      pricePerOunce: price,
      currency: 'USD',
      bid,
      ask,
      timestamp,
      source: 'commoditypriceapi',
      isStale: Date.now() - new Date(timestamp).getTime() > QUOTE_STALE_MS,
    };
  }

  async getFxRates(): Promise<FxRates> {
    if (this.cachedFx && Date.now() - this.cachedFxAt < FX_CACHE_MS) {
      return this.cachedFx;
    }

    const res = await fetchWithTimeout(FX_URL);
    const data: { rates?: Record<string, number>; base_code?: string } | null = await res.json().catch(() => null);

    if (!res.ok || !data?.rates) {
      throw new Error(`Exchange rate API error: ${res.status}`);
    }

    const eurPerUsd = Number(data.rates.EUR);
    const gbpPerUsd = Number(data.rates.GBP);
    const usdPerChf = Number(data.rates.CHF);

    if (![eurPerUsd, gbpPerUsd, usdPerChf].every((rate) => Number.isFinite(rate) && rate > 0)) {
      throw new Error('Invalid FX rates received from exchange rate API');
    }

    // API returns target per USD (base=USD). Need USD per target for EUR/GBP; CHF already correct.
    this.cachedFx = {
      EURUSD: 1 / eurPerUsd,
      GBPUSD: 1 / gbpPerUsd,
      USDCHF: usdPerChf,
      timestamp: new Date().toISOString(),
    };
    this.cachedFxAt = Date.now();
    return this.cachedFx;
  }

  async getHistoricalGoldData(from: string, to: string): Promise<HistoricalBar[]> {
    const query = this.authQuery(
      new URLSearchParams({ symbols: GOLD_SYMBOL, startDate: from, endDate: to })
    );
    const res = await fetchWithTimeout(`${BASE_URL}/rates/time-series?${query.toString()}`);
    const data: CommodityTimeSeriesResponse | null = await res.json().catch(() => null);

    if (!res.ok) {
      const message = (data as { message?: string } | null)?.message;
      throw new Error(`commoditypriceapi history error: ${res.status} ${message ?? res.statusText}`);
    }

    const rates = data?.rates;
    if (!rates || typeof rates !== 'object') {
      throw new Error('No history returned from commoditypriceapi');
    }

    return Object.entries(rates).map(([date, bar]) => ({
      date,
      open: Number(bar.open ?? 0),
      high: Number(bar.high ?? 0),
      low: Number(bar.low ?? 0),
      close: Number(bar.close ?? 0),
      volume: null,
    }));
  }
}