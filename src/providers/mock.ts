import type { GoldMarketProvider } from './types';
import type { GoldQuote, FxRates, HistoricalBar } from '../types/gold';

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function simulatePriceMovement(current: number, volatility: number = 0.002): number {
  const change = current * volatility * (Math.random() * 2 - 1);
  return Math.max(0, current + change);
}

const BASE_GOLD_USD = 3250;
const BASE_EUR_USD = 1.085;
const BASE_GBP_USD = 1.272;
const BASE_USD_CHF = 0.878;

export class MockGoldMarketProvider implements GoldMarketProvider {
  name = 'mock';
  private currentGoldUsd = BASE_GOLD_USD;
  private currentEurUsd = BASE_EUR_USD;
  private currentGbpUsd = BASE_GBP_USD;
  private currentUsdChf = BASE_USD_CHF;
  private previousClose = BASE_GOLD_USD * 0.998;
  private lastHistoryDate = new Date();

  private simulateTick(): void {
    this.currentGoldUsd = simulatePriceMovement(this.currentGoldUsd, 0.001);
    this.currentEurUsd = simulatePriceMovement(this.currentEurUsd, 0.0005);
    this.currentGbpUsd = simulatePriceMovement(this.currentGbpUsd, 0.0005);
    this.currentUsdChf = simulatePriceMovement(this.currentUsdChf, 0.0005);
  }

  async getGoldQuote(): Promise<GoldQuote> {
    this.simulateTick();

    const spread = randomInRange(0.1, 0.5);
    const bid = this.currentGoldUsd - spread / 2;
    const ask = this.currentGoldUsd + spread / 2;

    return {
      pricePerOunce: this.currentGoldUsd,
      currency: 'USD',
      bid,
      ask,
      timestamp: new Date().toISOString(),
      source: 'mock',
      isStale: false,
    };
  }

  async getFxRates(): Promise<FxRates> {
    this.simulateTick();
    return {
      EURUSD: this.currentEurUsd,
      GBPUSD: this.currentGbpUsd,
      USDCHF: this.currentUsdChf,
      timestamp: new Date().toISOString(),
    };
  }

  async getHistoricalGoldData(from: string, to: string): Promise<HistoricalBar[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const bars: HistoricalBar[] = [];
    let price = BASE_GOLD_USD * 0.95;

    const current = new Date(fromDate);
    while (current <= toDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        price = simulatePriceMovement(price, 0.008);
        const high = price * randomInRange(1.001, 1.015);
        const low = price * randomInRange(0.985, 0.999);
        const open = price * randomInRange(0.998, 1.002);

        bars.push({
          date: current.toISOString().split('T')[0],
          open,
          high,
          low,
          close: price,
          volume: Math.floor(randomInRange(50000, 200000)),
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return bars;
  }
}
