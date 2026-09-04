import { useEffect, useState } from 'react';
import type { GoldPriceData, SupportedCurrency, KaratValue, DataStatus } from '../types/gold';
import { KARAT_OPTIONS, CURRENCY_SYMBOLS } from '../types/gold';
import { formatTimestamp } from '../calculations/gold';
import { StatusBadge, PriceDisplay, ChangeIndicator } from '../components/Display';
import { Refresh } from '../components/Icons';

interface DashboardProps {
  data: GoldPriceData;
  status: DataStatus;
  isDemoMode: boolean;
  onRefresh: () => void;
  currency: SupportedCurrency;
  defaultKarat: KaratValue;
  decimals: number;
}

export function Dashboard({ data, status, isDemoMode, onRefresh, currency, defaultKarat, decimals }: DashboardProps) {
  const [showAllKarat, setShowAllKarat] = useState(false);

  const mainKaratData = data.pricesByKarat.find((k) => k.karat === defaultKarat);
  const mainPrice = mainKaratData?.pricePerGram[currency] ?? 0;

  const displayKarats = showAllKarat
    ? KARAT_OPTIONS
    : KARAT_OPTIONS.filter((k) => [24, 22, 18, 14].includes(k));

  return (
    <div className="space-y-4">
      {/* Hero Price Card */}
      <div className="card relative overflow-hidden">
        {/* Subtle gold gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-600/5 pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Gold Price</h1>
              <StatusBadge status={status} isDemoMode={isDemoMode} />
            </div>
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
              aria-label="Refresh"
            >
              <Refresh size={18} />
            </button>
          </div>

          {/* Main Price */}
          <div className="mb-2">
            <div className="text-xs font-medium text-gold-400 mb-1">{defaultKarat}K GOLD</div>
            <div className="text-gradient-gold">
              <PriceDisplay price={mainPrice} currency={currency} decimals={decimals} size="3xl" />
              <span className="text-slate-500 text-sm font-normal ml-2">/ g</span>
            </div>
          </div>

          {/* Change */}
          <div className="mb-3">
            <ChangeIndicator
              absolute={data.dailyChange}
              percent={data.dailyChangePercent}
            />
          </div>

          {/* Spot Price Info */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>XAU/USD: ${data.quote.pricePerOunce.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>·</span>
            <span>Updated: {formatTimestamp(data.lastUpdated)}</span>
          </div>
        </div>
      </div>

      {/* Purity Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Purity Prices</h2>
          <button
            onClick={() => setShowAllKarat(!showAllKarat)}
            className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
          >
            {showAllKarat ? 'Show Less' : 'Show All'}
          </button>
        </div>

        <div className="space-y-1">
          {displayKarats.map((karat) => {
            const karatData = data.pricesByKarat.find((k) => k.karat === karat);
            if (!karatData) return null;
            const price = karatData.pricePerGram[currency];
            const isMain = karat === defaultKarat;

            return (
              <div
                key={karat}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                  isMain
                    ? 'bg-gold-500/10 border border-gold-500/20'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isMain ? 'text-gold-400' : 'text-slate-300'}`}>
                    {karat}K
                  </span>
                  <span className="text-xs text-slate-600">
                    {(karatData.fineness * 100).toFixed(1)}%
                  </span>
                </div>
                <span className={`price-text text-sm ${isMain ? 'text-gold-300' : 'text-slate-200'}`}>
                  {CURRENCY_SYMBOLS[currency]}{price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                  <span className="text-slate-600 text-xs ml-1">/ g</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-600 px-1 leading-relaxed">
        Prices are theoretical metal values based on live spot prices. Actual jewelry prices include labor, manufacturing, dealer margins, taxes, and spreads.
      </div>
    </div>
  );
}
