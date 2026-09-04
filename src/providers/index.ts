import type { GoldMarketProvider } from './types';
import { GoldPriceDevProvider } from './goldprice-dev';
import { MockGoldMarketProvider } from './mock';

let providerInstance: GoldMarketProvider | null = null;

export function getGoldMarketProvider(): GoldMarketProvider {
  if (providerInstance) return providerInstance;

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const apiKey = import.meta.env.VITE_GOLD_API_KEY;

  if (isDemoMode) {
    providerInstance = new MockGoldMarketProvider();
  } else {
    providerInstance = new GoldPriceDevProvider(apiKey || undefined);
  }

  return providerInstance;
}

export function resetProvider(): void {
  providerInstance = null;
}

export type { GoldMarketProvider } from './types';
