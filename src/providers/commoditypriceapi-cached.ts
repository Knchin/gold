import type { GoldMarketProvider } from '../providers/types';
import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';
import { supabase, type GoldPriceCache, type FxRatesCache, type QuotaTracker, CACHE_MAX_AGE_MS } from '../utils/supabase';
import { CommodityPriceApiProvider } from './commoditypriceapi';

export class CachedCommodityPriceApiProvider implements GoldMarketProvider {
  name = 'commodityprice-cached';
  private baseProvider: CommodityPriceApiProvider;

  constructor(apiKey?: string) {
    this.baseProvider = new CommodityPriceApiProvider(apiKey);
  }

  private async getCachedGold(): Promise<GoldQuote | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('gold_price_cache')
      .select('*')
      .eq('id', 1)
      .single();
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
    // Upsert the latest cache
    await supabase.from('gold_price_cache').upsert({
      id: 1,
      price_per_ounce: quote.pricePerOunce,
      bid: quote.bid,
      ask: quote.ask,
      timestamp_utc: quote.timestamp,
      source: quote.source,
      is_stale: quote.isStale,
      updated_at: new Date().toISOString(),
    });
    // Append to history for chart
    await supabase.from('gold_price_history').insert({
      price_per_ounce: quote.pricePerOunce,
      bid: quote.bid,
      ask: quote.ask,
      timestamp_utc: quote.timestamp,
      source: quote.source,
    });
  }

  private async getCachedFx(): Promise<FxRates | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('fx_rates_cache')
      .select('*')
      .eq('id', 1)
      .single();
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
    await supabase.from('fx_rates_cache').upsert({
      id: 1,
      eur_usd: fx.EURUSD,
      gbp_usd: fx.GBPUSD,
      usd_chf: fx.USDCHF,
      timestamp_utc: fx.timestamp,
      updated_at: new Date().toISOString(),
    });
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
    const cached = await this.getCachedGold();
    if (cached) return cached;

    const quote = await this.baseProvider.getGoldQuote();
    await this.setCachedGold(quote);
    await this.incrementQuota();
    return quote;
  }

  async getFxRates(): Promise<FxRates> {
    const cached = await this.getCachedFx();
    if (cached) return cached;

    const fx = await this.baseProvider.getFxRates();
    await this.setCachedFx(fx);
    return fx;
  }

  async getHistoricalGoldData(from: string, to: string): Promise<HistoricalBar[]> {
    if (!supabase) {
      // Fallback to API if no Supabase
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
      // No history yet, fall back to API
      return this.baseProvider.getHistoricalGoldData(from, to);
    }

    // Group by day and compute OHLC
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

    // Convert to HistoricalBar array
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