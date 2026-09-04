import {
  TROY_OUNCE_GRAMS,
  GOLD_FINENESS,
  type SupportedCurrency,
  type PriceByGram,
  type PriceByKarat,
  type GoldQuote,
  type FxRates,
  type CalculatorInput,
  type CalculatorResult,
  type HistoricalBar,
} from '../types/gold';

export function usdPerGramFromOz(pricePerOz: number): number {
  return pricePerOz / TROY_OUNCE_GRAMS;
}

const CURRENCY_TO_PPG_KEY: Record<SupportedCurrency, keyof PriceByGram> = {
  EUR: 'eurPerGram',
  USD: 'usdPerGram',
  GBP: 'gbpPerGram',
  CHF: 'chfPerGram',
};

export function getPriceByCurrency(pricePerGram: PriceByGram, currency: SupportedCurrency): number {
  return pricePerGram[CURRENCY_TO_PPG_KEY[currency]];
}

export function pricePerGramToMap(pricePerGram: PriceByGram): Record<SupportedCurrency, number> {
  return {
    EUR: pricePerGram.eurPerGram,
    USD: pricePerGram.usdPerGram,
    GBP: pricePerGram.gbpPerGram,
    CHF: pricePerGram.chfPerGram,
  };
}

export function convertUsdPriceToCurrency(
  usdPerGram: number,
  targetCurrency: SupportedCurrency,
  fxRates: FxRates
): number {
  switch (targetCurrency) {
    case 'USD':
      return usdPerGram;
    case 'EUR':
      return usdPerGram / fxRates.EURUSD;
    case 'GBP':
      return usdPerGram / fxRates.GBPUSD;
    case 'CHF':
      return usdPerGram * fxRates.USDCHF;
  }
}

export function convertUsdPriceToOz(
  usdPerGram: number,
  targetCurrency: SupportedCurrency,
  fxRates: FxRates
): number {
  return convertUsdPriceToCurrency(usdPerGram, targetCurrency, fxRates) * TROY_OUNCE_GRAMS;
}

export function calculatePricePerGram(
  quote: GoldQuote,
  fxRates: FxRates
): PriceByGram {
  const usdPerGram = usdPerGramFromOz(quote.pricePerOunce);

  return {
    usdPerGram,
    eurPerGram: convertUsdPriceToCurrency(usdPerGram, 'EUR', fxRates),
    gbpPerGram: convertUsdPriceToCurrency(usdPerGram, 'GBP', fxRates),
    chfPerGram: convertUsdPriceToCurrency(usdPerGram, 'CHF', fxRates),
  };
}

export function calculatePriceByKarat(
  pricePerGram: PriceByGram
): PriceByKarat[] {
  return Object.entries(GOLD_FINENESS).map(([karat, fineness]) => ({
    karat: parseInt(karat),
    fineness,
    pricePerGram: {
      EUR: pricePerGram.eurPerGram * fineness,
      USD: pricePerGram.usdPerGram * fineness,
      GBP: pricePerGram.gbpPerGram * fineness,
      CHF: pricePerGram.chfPerGram * fineness,
    },
    pricePerOunce: {
      EUR: pricePerGram.eurPerGram * fineness * TROY_OUNCE_GRAMS,
      USD: pricePerGram.usdPerGram * fineness * TROY_OUNCE_GRAMS,
      GBP: pricePerGram.gbpPerGram * fineness * TROY_OUNCE_GRAMS,
      CHF: pricePerGram.chfPerGram * fineness * TROY_OUNCE_GRAMS,
    },
  }));
}

export function calculateGoldValue(input: CalculatorInput, pricePerGramMap: Record<SupportedCurrency, number>): CalculatorResult {
  let weightInGrams = input.weight;

  if (input.weightUnit === 'troy_oz') {
    weightInGrams = input.weight * TROY_OUNCE_GRAMS;
  } else if (input.weightUnit === 'ounce') {
    weightInGrams = input.weight * 28.349523125;
  }

  const fineness = GOLD_FINENESS[input.karat];
  const pricePerGram = pricePerGramMap[input.currency];
  const pureGoldContent = weightInGrams * fineness;
  const goldValue = weightInGrams * pricePerGram * fineness;

  return {
    goldValue,
    pricePerGram,
    fineness,
    pureGoldContent,
    currency: input.currency,
  };
}

export function calculateMidPrice(bid: number | null, ask: number | null, last: number): number {
  if (bid !== null && ask !== null) {
    return (bid + ask) / 2;
  }
  return last;
}

export function calculateChange(currentPrice: number, previousClose: number | null): { absolute: number; percent: number } | null {
  if (previousClose === null || previousClose === 0) return null;
  const absolute = currentPrice - previousClose;
  const percent = (absolute / previousClose) * 100;
  return { absolute, percent };
}

export function interpolateHistoricalPrices(
  bars: HistoricalBar[],
  targetCurrency: SupportedCurrency,
  fxRates: FxRates
): { date: string; price: number }[] {
  return bars.map((bar) => ({
    date: bar.date,
    price: convertUsdPriceToCurrency(
      usdPerGramFromOz(bar.close),
      targetCurrency,
      fxRates
    ),
  }));
}

export function formatPrice(value: number, currency: SupportedCurrency, decimals: number = 2): string {
  const symbols: Record<SupportedCurrency, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF ',
  };

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbols[currency]}${formatted}`;
}

export function formatPricePerGram(value: number, currency: SupportedCurrency, decimals: number = 2): string {
  return `${formatPrice(value, currency, decimals)} / g`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function isQuoteFresh(isoString: string, thresholdMs: number): boolean {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return now - then < thresholdMs;
}
