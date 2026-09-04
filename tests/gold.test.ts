import { describe, it, expect } from 'vitest';
import {
  TROY_OUNCE_GRAMS,
  GOLD_FINENESS,
} from '../src/types/gold';
import {
  usdPerGramFromOz,
  convertUsdPriceToCurrency,
  calculatePricePerGram,
  calculatePriceByKarat,
  calculateGoldValue,
  calculateMidPrice,
  calculateChange,
  formatPrice,
  formatPercent,
} from '../src/calculations/gold';
import type { GoldQuote, FxRates, CalculatorInput } from '../src/types/gold';

describe('Troy Ounce Conversion', () => {
  it('1 troy ounce = 31.1034768 grams', () => {
    expect(TROY_OUNCE_GRAMS).toBe(31.1034768);
  });

  it('should NOT be the avoirdupois ounce (28.3495g)', () => {
    expect(TROY_OUNCE_GRAMS).not.toBe(28.3495);
  });
});

describe('USD per Gram Calculation', () => {
  it('XAU/USD = 4500 → USD/gram ≈ 144.68', () => {
    const result = usdPerGramFromOz(4500);
    expect(result).toBeCloseTo(144.68, 1);
  });

  it('XAU/USD = 3250 → USD/gram ≈ 104.50', () => {
    const result = usdPerGramFromOz(3250);
    expect(result).toBeCloseTo(104.50, 1);
  });
});

describe('Currency Conversion', () => {
  const fxRates: FxRates = {
    EURUSD: 1.085,
    GBPUSD: 1.272,
    USDCHF: 0.878,
    timestamp: new Date().toISOString(),
  };

  it('USD → USD (identity)', () => {
    expect(convertUsdPriceToCurrency(100, 'USD', fxRates)).toBe(100);
  });

  it('USD → EUR', () => {
    const result = convertUsdPriceToCurrency(100, 'EUR', fxRates);
    expect(result).toBeCloseTo(100 / 1.085, 4);
  });

  it('USD → GBP', () => {
    const result = convertUsdPriceToCurrency(100, 'GBP', fxRates);
    expect(result).toBeCloseTo(100 / 1.272, 4);
  });

  it('USD → CHF', () => {
    const result = convertUsdPriceToCurrency(100, 'CHF', fxRates);
    expect(result).toBeCloseTo(100 * 0.878, 4);
  });
});

describe('Gold Purity', () => {
  it('24K = 0.999', () => {
    expect(GOLD_FINENESS[24]).toBe(0.999);
  });

  it('22K = 0.9167', () => {
    expect(GOLD_FINENESS[22]).toBe(0.9167);
  });

  it('21K = 0.875', () => {
    expect(GOLD_FINENESS[21]).toBe(0.875);
  });

  it('18K = 0.75', () => {
    expect(GOLD_FINENESS[18]).toBe(0.75);
  });

  it('14K = 0.5833', () => {
    expect(GOLD_FINENESS[14]).toBe(0.5833);
  });

  it('10K = 0.4167', () => {
    expect(GOLD_FINENESS[10]).toBe(0.4167);
  });

  it('9K = 0.375', () => {
    expect(GOLD_FINENESS[9]).toBe(0.375);
  });
});

describe('Full Gold Calculation', () => {
  const fxRates: FxRates = {
    EURUSD: 1.085,
    GBPUSD: 1.272,
    USDCHF: 0.878,
    timestamp: new Date().toISOString(),
  };

  const quote: GoldQuote = {
    pricePerOunce: 3250,
    currency: 'USD',
    bid: 3249,
    ask: 3251,
    timestamp: new Date().toISOString(),
    source: 'test',
    isStale: false,
  };

  it('should calculate price per gram correctly', () => {
    const ppg = calculatePricePerGram(quote, fxRates);
    const expectedUsd = 3250 / TROY_OUNCE_GRAMS;
    expect(ppg.usdPerGram).toBeCloseTo(expectedUsd, 4);
    expect(ppg.eurPerGram).toBeCloseTo(expectedUsd / 1.085, 4);
    expect(ppg.gbpPerGram).toBeCloseTo(expectedUsd / 1.272, 4);
    expect(ppg.chfPerGram).toBeCloseTo(expectedUsd * 0.878, 4);
  });

  it('should calculate all karat prices', () => {
    const ppg = calculatePricePerGram(quote, fxRates);
    const karats = calculatePriceByKarat(ppg);

    expect(karats).toHaveLength(7);

    karats.forEach((k) => {
      const fineness = GOLD_FINENESS[k.karat];
      expect(k.fineness).toBe(fineness);
      expect(k.pricePerGram.USD).toBeCloseTo(ppg.usdPerGram * fineness, 4);
      expect(k.pricePerGram.EUR).toBeCloseTo(ppg.eurPerGram * fineness, 4);
      expect(k.pricePerGram.GBP).toBeCloseTo(ppg.gbpPerGram * fineness, 4);
      expect(k.pricePerGram.CHF).toBeCloseTo(ppg.chfPerGram * fineness, 4);
    });
  });

  it('24K should be highest priced', () => {
    const ppg = calculatePricePerGram(quote, fxRates);
    const karats = calculatePriceByKarat(ppg);

    const k24 = karats.find((k) => k.karat === 24)!;
    const k9 = karats.find((k) => k.karat === 9)!;

    expect(k24.pricePerGram.USD).toBeGreaterThan(k9.pricePerGram.USD);
  });
});

describe('Gold Value Calculator', () => {
  const pricePerGramMap = {
    EUR: 96.0,
    USD: 104.5,
    GBP: 82.2,
    CHF: 91.7,
  };

  it('10g of 18K gold in EUR', () => {
    const input: CalculatorInput = {
      weight: 10,
      karat: 18,
      currency: 'EUR',
      weightUnit: 'gram',
    };
    const result = calculateGoldValue(input, pricePerGramMap);
    expect(result.goldValue).toBeCloseTo(10 * 96.0 * 0.75, 4);
    expect(result.fineness).toBe(0.75);
    expect(result.pureGoldContent).toBeCloseTo(7.5, 4);
  });

  it('1 troy oz of 24K gold in USD', () => {
    const input: CalculatorInput = {
      weight: 1,
      karat: 24,
      currency: 'USD',
      weightUnit: 'troy_oz',
    };
    const result = calculateGoldValue(input, pricePerGramMap);
    expect(result.goldValue).toBeCloseTo(TROY_OUNCE_GRAMS * 104.5 * 0.999, 4);
  });
});

describe('Mid Price Calculation', () => {
  it('should return (bid+ask)/2 when both are provided', () => {
    expect(calculateMidPrice(100, 102, 101)).toBe(101);
  });

  it('should return last when bid/ask is null', () => {
    expect(calculateMidPrice(null, null, 150)).toBe(150);
  });
});

describe('Change Calculation', () => {
  it('positive change', () => {
    const result = calculateChange(110, 100);
    expect(result).toEqual({ absolute: 10, percent: 10 });
  });

  it('negative change', () => {
    const result = calculateChange(90, 100);
    expect(result).toEqual({ absolute: -10, percent: -10 });
  });

  it('zero previous close', () => {
    expect(calculateChange(100, 0)).toBeNull();
  });

  it('null previous close', () => {
    expect(calculateChange(100, null)).toBeNull();
  });
});

describe('Formatting', () => {
  it('formatPrice EUR', () => {
    const result = formatPrice(123.45, 'EUR', 2);
    expect(result).toMatch(/€.*123\.45/);
  });

  it('formatPrice USD', () => {
    const result = formatPrice(100, 'USD', 2);
    expect(result).toMatch(/\$.*100\.00/);
  });

  it('formatPrice GBP', () => {
    const result = formatPrice(80.5, 'GBP', 2);
    expect(result).toMatch(/£.*80\.50/);
  });

  it('formatPrice CHF', () => {
    const result = formatPrice(90, 'CHF', 2);
    expect(result).toMatch(/CHF.*90\.00/);
  });

  it('formatPercent positive', () => {
    expect(formatPercent(1.5)).toBe('+1.50%');
  });

  it('formatPercent negative', () => {
    expect(formatPercent(-2.3)).toBe('-2.30%');
  });
});

describe('Edge Cases', () => {
  const fxRates: FxRates = {
    EURUSD: 1.085,
    GBPUSD: 1.272,
    USDCHF: 0.878,
    timestamp: new Date().toISOString(),
  };

  it('zero price', () => {
    expect(usdPerGramFromOz(0)).toBe(0);
  });

  it('very large price', () => {
    const result = usdPerGramFromOz(100000);
    expect(result).toBeGreaterThan(3000);
  });

  it('negative price should work mathematically', () => {
    const result = usdPerGramFromOz(-100);
    expect(result).toBeLessThan(0);
  });
});
