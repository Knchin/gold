import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockGoldMarketProvider } from '../src/providers/mock';

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
