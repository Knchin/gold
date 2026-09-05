import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockGoldMarketProvider } from '../src/providers/mock';
import { CommodityPriceApiProvider } from '../src/providers/commoditypriceapi';

describe('MockGoldMarketProvider', () => {
  let provider: MockGoldMarketProvider;

  beforeEach(() => {
    provider = new MockGoldMarketProvider();
  });

  it('should return valid gold quote', async () => {
    const quote = await provider.getGoldQuote();
    expect(quote.pricePerOunce).toBeGreaterThan(0);
    expect(quote.currency).toBe('USD');
    expect(quote.timestamp).toBeTruthy();
    expect(quote.source).toBe('mock');
  });

  it('should return valid FX rates', async () => {
    const fx = await provider.getFxRates();
    expect(fx.EURUSD).toBeGreaterThan(0);
    expect(fx.GBPUSD).toBeGreaterThan(0);
    expect(fx.USDCHF).toBeGreaterThan(0);
  });

  it('should return historical data', async () => {
    const bars = await provider.getHistoricalGoldData('2024-01-01', '2024-01-10');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => {
      expect(bar.close).toBeGreaterThan(0);
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
    });
  });

  it('should simulate price movement', async () => {
    const q1 = await provider.getGoldQuote();
    const q2 = await provider.getGoldQuote();
    // Prices should be similar but may differ
    expect(Math.abs(q2.pricePerOunce - q1.pricePerOunce)).toBeLessThan(q1.pricePerOunce * 0.01);
  });
});

describe('API Provider Error Handling', () => {
  it('should handle network failure gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch('https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Network error');
    }

    vi.unstubAllGlobals();
  });

  it('should handle invalid JSON response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch('https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT');
      await res.json();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }

    vi.unstubAllGlobals();
  });

  it('should handle HTTP errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetch('https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(429);

    vi.unstubAllGlobals();
  });
});

describe('CommodityPriceApiProvider', () => {
  let provider: CommodityPriceApiProvider;

  beforeEach(() => {
    provider = new CommodityPriceApiProvider('test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return valid gold quote', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          timestamp,
          rates: { XAU: { rate: 4430.58, bid: 4430.08, ask: 4430.58 } },
          metadata: { XAU: { unit: 'T.oz', quote: 'USD' } },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const quote = await provider.getGoldQuote();
    expect(quote.pricePerOunce).toBe(4430.58);
    expect(quote.bid).toBe(4430.08);
    expect(quote.ask).toBe(4430.58);
    expect(quote.currency).toBe('USD');
    expect(quote.source).toBe('commoditypriceapi');
    expect(quote.timestamp).toBe(new Date(timestamp * 1000).toISOString());
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.commoditypriceapi.com/v2/rates/latest')
    );
    expect(mockFetch.mock.calls[0][0]).toContain('apiKey=test-key');
  });

  it('should throw if no gold rate returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, rates: {} }),
      })
    );

    await expect(provider.getGoldQuote()).rejects.toThrow('No gold rate returned');
  });

  it('should handle number-shaped gold rate response', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          timestamp,
          rates: { XAU: 4430.58 },
          metadata: { XAU: { unit: 'T.oz', quote: 'USD' } },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const quote = await provider.getGoldQuote();
    expect(quote.pricePerOunce).toBe(4430.58);
    expect(quote.bid).toBeNull();
    expect(quote.ask).toBeNull();
    expect(quote.currency).toBe('USD');
    expect(quote.source).toBe('commoditypriceapi');
    expect(quote.timestamp).toBe(new Date(timestamp * 1000).toISOString());
  });

  it('should throw on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        statusText: 'PAYMENT_REQUIRED',
        json: () => Promise.resolve({ message: 'Please extend your trial' }),
      })
    );

    await expect(provider.getGoldQuote()).rejects.toThrow('402 Please extend your trial');
  });

  it('should return valid FX rates and cache them', async () => {
    // er-api returns target per USD (base=USD): EUR=0.86, GBP=0.74, CHF=0.81
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: 'success',
        base_code: 'USD',
        rates: { EUR: 0.86, GBP: 0.74, CHF: 0.81 },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const fx1 = await provider.getFxRates();
    // Inverted for EURUSD and GBPUSD
    expect(fx1.EURUSD).toBeCloseTo(1 / 0.86, 4);
    expect(fx1.GBPUSD).toBeCloseTo(1 / 0.74, 4);
    // USDCHF direct
    expect(fx1.USDCHF).toBe(0.81);

    const fx2 = await provider.getFxRates();
    expect(fx2).toEqual(fx1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should map historical bars', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            startDate: '2026-08-01',
            endDate: '2026-08-03',
            rates: {
              '2026-08-01': { open: 4400, high: 4420, low: 4390, close: 4410 },
              '2026-08-02': { open: 4410, high: 4430, low: 4405, close: 4425 },
            },
          }),
      })
    );

    const bars = await provider.getHistoricalGoldData('2026-08-01', '2026-08-03');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toEqual({
      date: '2026-08-01',
      open: 4400,
      high: 4420,
      low: 4390,
      close: 4410,
      volume: null,
    });
  });

  it('should throw on history error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'BAD_REQUEST',
        json: () => Promise.resolve({ message: 'Date range exceeds the allowed limit' }),
      })
    );

    await expect(provider.getHistoricalGoldData('2026-01-01', '2027-01-01')).rejects.toThrow(
      '400 Date range exceeds the allowed limit'
    );
  });
});
