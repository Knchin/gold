export const TROY_OUNCE_GRAMS = 31.1034768;

export const GOLD_FINENESS: Record<number, number> = {
  24: 0.999,
  22: 0.9167,
  21: 0.875,
  18: 0.75,
  14: 0.5833,
  10: 0.4167,
  9: 0.375,
};

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  CHF: 'Swiss Franc',
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';

export const KARAT_OPTIONS = [24, 22, 21, 18, 14, 10, 9] as const;
export type KaratValue = (typeof KARAT_OPTIONS)[number];

export type DataStatus = 'live' | 'delayed' | 'stale' | 'updating' | 'reconnecting' | 'demo' | 'offline';

export interface GoldQuote {
  pricePerOunce: number;
  currency: string;
  bid: number | null;
  ask: number | null;
  timestamp: string;
  source: string;
  isStale: boolean;
}

export interface FxRates {
  EURUSD: number;
  GBPUSD: number;
  USDCHF: number;
  timestamp: string;
}

export interface PriceByGram {
  usdPerGram: number;
  eurPerGram: number;
  gbpPerGram: number;
  chfPerGram: number;
}

export interface PriceByKarat {
  karat: number;
  fineness: number;
  pricePerGram: Record<SupportedCurrency, number>;
  pricePerOunce: Record<SupportedCurrency, number>;
}

export interface GoldPriceData {
  quote: GoldQuote;
  fxRates: FxRates;
  pricePerGram: PriceByGram;
  pricesByKarat: PriceByKarat[];
  dailyChange: number | null;
  dailyChangePercent: number | null;
  status: DataStatus;
  lastUpdated: string;
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface CalculatorInput {
  weight: number;
  karat: KaratValue;
  currency: SupportedCurrency;
  weightUnit: 'gram' | 'troy_oz' | 'ounce';
}

export interface CalculatorResult {
  goldValue: number;
  pricePerGram: number;
  fineness: number;
  pureGoldContent: number;
  currency: SupportedCurrency;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface UserPreferences {
  currency: SupportedCurrency;
  defaultKarat: KaratValue;
  theme: ThemeMode;
  decimals: 2 | 3 | 4;
  weightUnit: 'gram' | 'troy_oz' | 'ounce';
  refreshIntervalMs: number;
}
