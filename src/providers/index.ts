import type { GoldMarketProvider } from './types';
import { GoldPriceDevProvider } from './goldprice-dev';
import { MockGoldMarketProvider } from './mock';
import { CommodityPriceApiProvider } from './commoditypriceapi';
import { CachedCommodityPriceApiProvider } from './commoditypriceapi-cached';
import { supabase } from '../utils/supabase';

let providerInstance: GoldMarketProvider | null = null;

export function getGoldMarketProvider(): GoldMarketProvider {
  if (providerInstance) return providerInstance;

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const providerChoice = import.meta.env.VITE_MARKET_PROVIDER;
  const apiKey = import.meta.env.VITE_GOLD_API_KEY;

  if (isDemoMode || providerChoice === 'mock') {
    providerInstance = new MockGoldMarketProvider();
  } else if (providerChoice === 'commodityprice' || (!providerChoice && supabase)) {
    // Use cached provider if Supabase is configured, otherwise direct
    providerInstance = supabase
      ? new CachedCommodityPriceApiProvider(apiKey || undefined)
      : new CommodityPriceApiProvider(apiKey || undefined);
  } else if (providerChoice === 'goldprice') {
    providerInstance = new GoldPriceDevProvider(apiKey || undefined);
  } else {
    providerInstance = new CommodityPriceApiProvider(apiKey || undefined);
  }

  return providerInstance;
}

export function resetProvider(): void {
  providerInstance = null;
}

export type { GoldMarketProvider } from './types';
