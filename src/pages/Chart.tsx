import { useHistoricalChart } from '../hooks/useHistoricalChart';
import type { GoldPriceData, SupportedCurrency } from '../types/gold';
import { CURRENCY_SYMBOLS } from '../types/gold';

interface ChartPageProps {
  data: GoldPriceData;
  currency: SupportedCurrency;
  decimals: number;
}

const TIME_RANGES = ['1D', '1W', '1M', '3M', '1Y'] as const;

export function ChartPage({ data, currency, decimals }: ChartPageProps) {
  const { data: chartData, isLoading, error, timeRange, setTimeRange } = useHistoricalChart(currency, data.fxRates);

  const minPrice = chartData.length > 0 ? Math.min(...chartData.map((d) => d.price)) : 0;
  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map((d) => d.price)) : 0;
  const range = maxPrice - minPrice || 1;

  const svgWidth = 400;
  const svgHeight = 200;
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };

  const chartPoints = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * (svgWidth - padding.left - padding.right);
    const y = padding.top + (1 - (d.price - minPrice) / range) * (svgHeight - padding.top - padding.bottom);
    return { x, y, ...d };
  });

  const linePath = chartPoints.length > 0
    ? `M ${chartPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : '';

  const areaPath = chartPoints.length > 0
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x},${svgHeight - padding.bottom} L ${chartPoints[0].x},${svgHeight - padding.bottom} Z`
    : '';

  const firstPrice = chartData[0]?.price ?? 0;
  const lastPrice = chartData[chartData.length - 1]?.price ?? 0;
  const isUp = lastPrice >= firstPrice;
  const strokeColor = isUp ? '#22c55e' : '#ef4444';
  const fillColor = isUp ? 'url(#gradient-up)' : 'url(#gradient-down)';

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">24K Gold Price / Gram</h2>
          <span className="text-xs text-slate-500">{CURRENCY_SYMBOLS[currency]}</span>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 mb-4 bg-slate-800/50 p-1 rounded-xl">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-gold-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="h-48 shimmer rounded-xl" />
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            No chart data available
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48">
              <defs>
                <linearGradient id="gradient-up" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradient-down" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = padding.top + ratio * (svgHeight - padding.top - padding.bottom);
                const price = maxPrice - ratio * range;
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="0.5"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={svgWidth - padding.right}
                      y={y - 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="8"
                    >
                      {CURRENCY_SYMBOLS[currency]}{price.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path d={areaPath} fill={fillColor} />

              {/* Line */}
              <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" />

              {/* Current price dot */}
              {chartPoints.length > 0 && (
                <circle
                  cx={chartPoints[chartPoints.length - 1].x}
                  cy={chartPoints[chartPoints.length - 1].y}
                  r="4"
                  fill={strokeColor}
                  stroke="white"
                  strokeWidth="2"
                />
              )}
            </svg>

            {/* Price range labels */}
            <div className="absolute top-2 right-0 text-xs text-slate-500">
              {CURRENCY_SYMBOLS[currency]}{maxPrice.toFixed(2)}
            </div>
            <div className="absolute bottom-8 right-0 text-xs text-slate-500">
              {CURRENCY_SYMBOLS[currency]}{minPrice.toFixed(2)}
            </div>
          </div>
        )}

        {/* X-axis labels */}
        {chartData.length > 0 && (
          <div className="flex justify-between text-xs text-slate-600 mt-1 px-1">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Current Price Summary */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Open</div>
              <div className="price-text text-sm text-white">
                {CURRENCY_SYMBOLS[currency]}{chartData[0]?.price.toFixed(decimals)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">High</div>
              <div className="price-text text-sm text-emerald-400">
                {CURRENCY_SYMBOLS[currency]}{maxPrice.toFixed(decimals)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Low</div>
              <div className="price-text text-sm text-red-400">
                {CURRENCY_SYMBOLS[currency]}{minPrice.toFixed(decimals)}
              </div>
            </div>
          </div>
        </div>
      )}

      {import.meta.env.VITE_DEMO_MODE === 'true' && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
            DEMO DATA
          </span>
        </div>
      )}
    </div>
  );
}
