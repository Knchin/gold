import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';

export interface GoldMarketProvider {
  name: string;
  getGoldQuote(currency: string): Promise<GoldQuote>;
  getFxRates(): Promise<FxRates>;
  getHistoricalGoldData?(from: string, to: string): Promise<HistoricalBar[]>;
}
