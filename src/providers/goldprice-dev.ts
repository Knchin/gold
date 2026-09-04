import type { GoldMarketProvider } from './types';
import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';

export class GoldPriceDevProvider implements GoldMarketProvider {
  name = 'goldprice.dev';
  private apiKey?: string;
  private baseUrl = 'https://api.goldprice.dev/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async getGoldQuote(currency: string = 'USD'): Promise<GoldQuote> {
    const url = `${this.baseUrl}/prices?symbol=XAU-${currency}-SPOT`;
    const res = await fetch(url, { headers: this.getHeaders() });

    if (!res.ok) {
      throw new Error(`goldprice.dev API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const symbol = data.symbols?.[0];

    if (!symbol) {
      throw new Error('No price data returned from goldprice.dev');
    }

    const price = parseFloat(symbol.price);
    const bid = symbol.bid ? parseFloat(symbol.bid) : null;
    const ask = symbol.ask ? parseFloat(symbol.ask) : null;

    if (isNaN(price) || price <= 0) {
      throw new Error('Invalid gold price received');
    }

    return {
      pricePerOunce: price,
      currency: symbol.currency || currency,
      bid,
      ask,
      timestamp: symbol.computed_at || new Date().toISOString(),
      source: 'goldprice.dev',
      isStale: symbol.is_stale ?? false,
    };
  }

  async getFxRates(): Promise<FxRates> {
    const pairs = ['EUR-USD', 'GBP-USD', 'USD-CHF'];
    const results = await Promise.all(
      pairs.map(async (pair) => {
        const url = `${this.baseUrl}/prices?symbol=${pair}`;
        const res = await fetch(url, { headers: this.getHeaders() });
        if (!res.ok) return { pair, rate: 0 };
        const data = await res.json();
        return { pair, rate: parseFloat(data.symbols?.[0]?.price || '0') };
      })
    );

    const ratesMap = new Map(results.map((r) => [r.pair, r.rate]));

    return {
      EURUSD: ratesMap.get('EUR-USD') || 1.08,
      GBPUSD: ratesMap.get('GBP-USD') || 1.27,
      USDCHF: ratesMap.get('USD-CHF') || 0.88,
      timestamp: new Date().toISOString(),
    };
  }

  async getHistoricalGoldData(from: string, to: string): Promise<HistoricalBar[]> {
    const url = `${this.baseUrl}/bars?symbol=XAU-USD-SPOT&interval=1d&from=${from}&to=${to}`;
    const res = await fetch(url, { headers: this.getHeaders() });

    if (!res.ok) {
      throw new Error(`goldprice.dev history API error: ${res.status}`);
    }

    const data = await res.json();
    const bars = data.bars || data.data || [];

    return bars.map((bar: Record<string, unknown>) => ({
      date: bar.t || bar.date || bar.timestamp || '',
      open: parseFloat(String(bar.o || bar.open || '0')),
      high: parseFloat(String(bar.h || bar.high || '0')),
      low: parseFloat(String(bar.l || bar.low || '0')),
      close: parseFloat(String(bar.c || bar.close || '0')),
      volume: bar.v != null ? parseFloat(String(bar.v)) : null,
    }));
  }
}
