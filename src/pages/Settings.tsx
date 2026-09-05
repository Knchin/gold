import { usePreferences } from '../hooks/usePreferences';
import { SUPPORTED_CURRENCIES, KARAT_OPTIONS, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '../types/gold';
import type { SupportedCurrency, KaratValue, ThemeMode } from '../types/gold';
import { Info } from '../components/Icons';
import { getGoldMarketProvider } from '../providers';
import { isMarketOpen, msUntilNextOpen } from '../utils/marketHours';
import { CachedCommodityPriceApiProvider } from '../providers/commoditypriceapi-cached';
import { useState, useEffect } from 'react';

const SOURCE_LABELS: Record<string, string> = {
  commodityprice: 'commoditypriceapi.com',
  'goldprice.dev': 'goldprice.dev',
  mock: 'Mock (demo)',
  'commodityprice-cached': 'commoditypriceapi.com (cached)',
};

export function SettingsPage() {
  const { prefs, updatePref } = usePreferences();
  const provider = getGoldMarketProvider();
  const sourceName = SOURCE_LABELS[provider.name] ?? provider.name;
  const marketOpen = isMarketOpen();
  const nextOpenMs = marketOpen ? 0 : msUntilNextOpen();

  const refreshOptions = [
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
  ];

  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return 'Opening now';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m until open`;
    return `${minutes}m until open`;
  };

  // Quota meter for cached provider
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; remaining: number; trialEndsAt: string | null } | null>(null);
  useEffect(() => {
    if (provider instanceof CachedCommodityPriceApiProvider) {
      provider.getQuotaInfo().then(setQuotaInfo).catch(() => {});
    }
  }, [provider]);

  const quotaPercent = quotaInfo ? (quotaInfo.used / 2000) * 100 : 0;
  const quotaColor = quotaPercent > 90 ? 'bg-red-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

        {/* Currency */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Default Currency</label>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => updatePref('currency', c)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  prefs.currency === c
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{CURRENCY_SYMBOLS[c]}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Default Karat */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Default Karat</label>
          <div className="grid grid-cols-4 gap-1.5">
            {KARAT_OPTIONS.map((k) => (
              <button
                key={k}
                onClick={() => updatePref('defaultKarat', k as KaratValue)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  prefs.defaultKarat === k
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {k}K
              </button>
            ))}
          </div>
        </div>

        {/* Decimal Precision */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Decimal Precision</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => updatePref('decimals', d as 2 | 3 | 4)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  prefs.decimals === d
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {d} decimals
              </button>
            ))}
          </div>
        </div>

        {/* Weight Unit */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Weight Unit</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'gram', label: 'Grams' },
              { value: 'troy_oz', label: 'Troy Oz' },
              { value: 'ounce', label: 'Oz' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updatePref('weightUnit', value as 'gram' | 'troy_oz' | 'ounce')}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  prefs.weightUnit === value
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Market Hours */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Market Hours</label>
          <div className="space-y-3">
            <button
              onClick={() => updatePref('respectMarketHours', !prefs.respectMarketHours)}
              className={`w-full py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                prefs.respectMarketHours
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>Respect NYSE Hours (9:30–16:00 ET)</span>
              <span>{prefs.respectMarketHours ? 'ON' : 'OFF'}</span>
            </button>
            {prefs.respectMarketHours && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  {marketOpen
                    ? 'Market is OPEN'
                    : `Market CLOSED — ${formatCountdown(nextOpenMs)}`}
                </p>
                <label className="block text-sm text-slate-400 mb-1">Market Hours Interval</label>
                <div className="grid grid-cols-2 gap-2">
                  {refreshOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => updatePref('marketHoursIntervalMs', value)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        prefs.marketHoursIntervalMs === value
                          ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-2">Refresh Interval (Off Hours)</label>
          <div className="grid grid-cols-2 gap-2">
            {refreshOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updatePref('refreshIntervalMs', value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  prefs.refreshIntervalMs === value
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">About</h3>
        <div className="space-y-2 text-xs text-slate-500">
          <p>Gram Karat v1.0.0</p>
          <p>Data source: {sourceName}</p>
          <p>© 2026</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card bg-slate-900/50 border-amber-500/20">
        <div className="flex gap-3">
          <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <p className="font-medium text-amber-300 mb-1">Disclaimer</p>
            <p>
              Prices are based on live gold spot prices and represent the theoretical metal value. Actual jewelry buying and selling prices may differ significantly due to labor, manufacturing, retailer margins, taxes, VAT, commissions, spreads, and refining costs.
            </p>
          </div>
        </div>
      </div>

      {/* Quota Meter */}
      {quotaInfo && (
        <div className="card bg-slate-900/50 border-amber-500/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">API Quota (Trial)</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Used</span>
              <span className="text-white font-medium">{quotaInfo.used} / 2,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Remaining</span>
              <span className="text-white font-medium">{quotaInfo.remaining}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${quotaColor} transition-all duration-300`}
                style={{ width: `${Math.min(quotaPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Resets when trial ends (Sep 12, 2026)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
