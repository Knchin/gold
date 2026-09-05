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
    return this.baseProvider.getHistoricalGoldData(from, to);
  }

  async getQuotaInfo(): Promise<{ used: number; remaining: number; trialEndsAt: string | null } | null> {
    if (!supabase) return null;
    const used = await this.getQuotaUsed();
    if (used === null) return null;
    return { used, remaining: Math.max(0, 2000 - used), trialEndsAt: null };
  }
}