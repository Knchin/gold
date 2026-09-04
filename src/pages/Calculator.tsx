import { useCalculator } from '../hooks/useCalculator';
import type { GoldPriceData, SupportedCurrency, KaratValue } from '../types/gold';
import { KARAT_OPTIONS, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '../types/gold';
import { TROY_OUNCE_GRAMS, GOLD_FINENESS } from '../types/gold';

interface CalculatorPageProps {
  data: GoldPriceData;
  decimals: number;
}

export function CalculatorPage({ data, decimals }: CalculatorPageProps) {
  const pricePerGramMap = {
    EUR: data.pricePerGram.eurPerGram,
    USD: data.pricePerGram.usdPerGram,
    GBP: data.pricePerGram.gbpPerGram,
    CHF: data.pricePerGram.chfPerGram,
  };

  const { input, result, setWeight, setKarat, setCurrency, setWeightUnit } = useCalculator(pricePerGramMap);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Gold Calculator</h2>

        {/* Weight Input */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1.5">Weight</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={input.weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="input-field flex-1 text-lg"
            />
            <select
              value={input.weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'gram' | 'troy_oz' | 'ounce')}
              className="select-field w-28"
            >
              <option value="gram">Grams</option>
              <option value="troy_oz">Troy Oz</option>
              <option value="ounce">Oz</option>
            </select>
          </div>
        </div>

        {/* Karat Selector */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1.5">Karat</label>
          <div className="grid grid-cols-4 gap-1.5">
            {KARAT_OPTIONS.map((k) => (
              <button
                key={k}
                onClick={() => setKarat(k as KaratValue)}
                className={`py-2 px-1 rounded-xl text-sm font-medium transition-all ${
                  input.karat === k
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {k}K
              </button>
            ))}
          </div>
        </div>

        {/* Currency Selector */}
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-1.5">Currency</label>
          <div className="grid grid-cols-4 gap-1.5">
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`py-2 px-1 rounded-xl text-sm font-medium transition-all ${
                  input.currency === c
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <div className="text-center mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estimated Gold Value</div>
              <div className="text-gradient-gold price-text text-3xl sm:text-4xl">
                {CURRENCY_SYMBOLS[result.currency]}{result.goldValue.toLocaleString(undefined, {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Price/gram</div>
                <div className="text-white font-medium">
                  {CURRENCY_SYMBOLS[result.currency]}{result.pricePerGram.toLocaleString(undefined, {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  })}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Purity</div>
                <div className="text-white font-medium">
                  {input.karat}K ({(result.fineness * 100).toFixed(1)}%)
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Weight</div>
                <div className="text-white font-medium">
                  {input.weight} {input.weightUnit === 'gram' ? 'g' : input.weightUnit === 'troy_oz' ? 'troy oz' : 'oz'}
                  {input.weightUnit !== 'gram' && (
                    <span className="text-slate-500 text-xs ml-1">
                      ({(input.weightUnit === 'troy_oz' ? input.weight * TROY_OUNCE_GRAMS : input.weight * 28.349523125).toFixed(2)}g)
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Pure Gold</div>
                <div className="text-white font-medium">
                  {result.pureGoldContent.toFixed(3)}g
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-600 px-1 leading-relaxed">
        This is an estimate of the theoretical metal value. Actual buying and selling prices at dealers will vary based on labor, manufacturing, margins, taxes, and market conditions.
      </div>
    </div>
  );
}
