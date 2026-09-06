import type { GoldMarketProvider } from '../providers/types';
import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';
import { supabase, type GoldPriceCache, type FxRatesCache, type QuotaTracker, CACHE_MAX_AGE_MS } from '../utils/supabase';
import { CommodityPriceApiProvider } from './commoditypriceapi';

const LOCK_KEY_GOLD = 123456789; // Advisory lock key for gold quotes
const LOCK_KEY_FX = 123456790;   // Advisory lock key for FX rates

export class CachedCommodityPriceApiProvider implements GoldMarketProvider {
  name = 'commodityprice-cached';
  private baseProvider: CommodityPriceApiProvider;

  constructor(apiKey?: string) {
    this.baseProvider = new CommodityPriceApiProvider(apiKey);
  }

  private async getCachedGold(): Promise<GoldQuote | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('gold_price_cache')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) console.error('Get cached gold error:', error);
    if (!data) return null;
    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > CACHE_MAX_AGE_MS) return null;
    return {
      pricePerOunce: data.price_per_ounce,
      currency: 'USD',
      bid: data.bid,
      ask: data.ask,
      timestamp: data.timestamp_utc,
      source: data.source,
      isStale: data.is_stale,
    };
  }

  private async setCachedGold(quote: GoldQuote): Promise<void> {
    if (!supabase) return;
    const { error: cacheError } = await supabase.from('gold_price_cache').upsert({
      id: 1,
      price_per_ounce: quote.pricePerOunce,
      bid: quote.bid,
      ask: quote.ask,
      timestamp_utc: quote.timestamp,
      source: quote.source,
      is_stale: quote.isStale,
      updated_at: new Date().toISOString(),
    });
    if (cacheError) {
      console.error('Cache gold upsert error:', cacheError);
      throw cacheError;
    }
    const { error: historyError } = await supabase.from('gold_price_history').insert({
      price_per_ounce: quote.pricePerOunce,
      bid: quote.bid,
      ask: quote.ask,
      timestamp_utc: quote.timestamp,
      source: quote.source,
    });
    if (historyError) {
      console.error('Gold history insert error:', historyError);
      throw historyError;
    }
  }

  private async getCachedFx(): Promise<FxRates | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('fx_rates_cache')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) console.error('Get cached FX error:', error);
    if (!data) return null;
    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > CACHE_MAX_AGE_MS) return null;
    return {
      EURUSD: data.eur_usd,
      GBPUSD: data.gbp_usd,
      USDCHF: data.usd_chf,
      timestamp: data.timestamp_utc,
    };
  }

  private async setCachedFx(fx: FxRates): Promise<void> {
    if (!supabase) return;
    const { error: cacheError } = await supabase.from('fx_rates_cache').upsert({
      id: 1,
      eur_usd: fx.EURUSD,
      gbp_usd: fx.GBPUSD,
      usd_chf: fx.USDCHF,
      timestamp_utc: fx.timestamp,
      updated_at: new Date().toISOString(),
    });
    if (cacheError) {
      console.error('Cache FX upsert error:', cacheError);
      throw cacheError;
    }
    const { error: historyError } = await supabase.from('fx_rates_history').insert({
      eur_usd: fx.EURUSD,
      gbp_usd: fx.GBPUSD,
      usd_chf: fx.USDCHF,
      timestamp_utc: fx.timestamp,
    });
    if (historyError) {
      console.error('FX history insert error:', historyError);
      throw historyError;
    }
  }

  private async acquireLock(lockKey: number): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('pg_try_advisory_lock', { lock_key: lockKey });
    if (error) {
      console.error('Lock acquire failed:', error);
      return false;
    }
    return data === true;
  }

  private async releaseLock(lockKey: number): Promise<void> {
    if (!supabase) return;
    await supabase.rpc('pg_advisory_unlock', { lock_key: lockKey });
  }

  private async getOrFetchGold(): Promise<GoldQuote> {
    // Try to get fresh cache first
    const cached = await this.getCachedGold();
    if (cached) return cached;

    // No fresh cache - try to acquire lock to refresh
    const gotLock = await this.acquireLock(LOCK_KEY_GOLD);
    if (!gotLock) {
      // Another client is refreshing, wait and retry cache
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        const cached = await this.getCachedGold();
        if (cached) return cached;
      }
      // Fallback: try without lock (last resort)
      const cached = await this.getCachedGold();
      if (cached) return cached;
    }

    try {
      // We have the lock, fetch from API
      const quote = await this.baseProvider.getGoldQuote();
      await this.setCachedGold(quote);
      await this.incrementQuota();
      return quote;
    } finally {
      await this.releaseLock(LOCK_KEY_GOLD);
    }
  }

  private async getOrFetchFx(): Promise<FxRates> {
    const cached = await this.getCachedFx();
    if (cached) return cached;

    const gotLock = await this.acquireLock(LOCK_KEY_FX);
    if (!gotLock) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        const cached = await this.getCachedFx();
        if (cached) return cached;
      }
      const cached = await this.getCachedFx();
      if (cached) return cached;
    }

    try {
      const fx = await this.baseProvider.getFxRates();
      await this.setCachedFx(fx);
      return fx;
    } finally {
      await this.releaseLock(LOCK_KEY_FX);
    }
  }

  private async incrementQuota(): Promise<number | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('increment_quota');
    if (error) {
      console.error('Quota increment failed:', error);
      return null;
    }
    return data as number;
  }

  private async getQuotaUsed(): Promise<number | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('quota_tracker')
      .select('calls_used, trial_ends_at')
      .eq('id', 1)
      .single();
    if (!data) return null;
    return data.calls_used;
  }

  async getGoldQuote(): Promise<GoldQuote> {
    return this.getOrFetchGold();
  }

  async getFxRates(): Promise<FxRates> {
    return this.getOrFetchFx();
  }

  async getHistoricalGoldData(from: string, to: string): Promise<HistoricalBar[]> {
    if (!supabase) {
      return this.baseProvider.getHistoricalGoldData(from, to);
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('gold_price_history')
      .select('price_per_ounce, bid, ask, timestamp_utc')
      .gte('timestamp_utc', fromDate.toISOString())
      .lte('timestamp_utc', toDate.toISOString())
      .order('timestamp_utc', { ascending: true });

    if (error) {
      console.error('History query failed:', error);
      return this.baseProvider.getHistoricalGoldData(from, to);
    }

    if (!data || data.length === 0) {
      return this.baseProvider.getHistoricalGoldData(from, to);
    }

    const dailyMap = new Map<string, { open: number; high: number; low: number; close: number; count: number }>();
    
    for (const row of data) {
      const dateKey = new Date(row.timestamp_utc).toISOString().split('T')[0];
      const price = row.price_per_ounce;
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { open: price, high: price, low: price, close: price, count: 1 });
      } else {
        const day = dailyMap.get(dateKey)!;
        day.high = Math.max(day.high, price);
        day.low = Math.min(day.low, price);
        day.close = price;
        day.count++;
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, day]) => ({
        date,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getQuotaInfo(): Promise<{ used: number; remaining: number; trialEndsAt: string | null } | null> {
    if (!supabase) return null;
    const used = await this.getQuotaUsed();
    if (used === null) return null;
    return { used, remaining: Math.max(0, 2000 - used), trialEndsAt: null };
  }
}