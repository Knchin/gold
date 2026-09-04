import type { DataStatus, SupportedCurrency } from '../types/gold';
import { CURRENCY_SYMBOLS } from '../types/gold';

interface StatusBadgeProps {
  status: DataStatus;
  isDemoMode: boolean;
}

export function StatusBadge({ status, isDemoMode }: StatusBadgeProps) {
  if (isDemoMode) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
        <span className="status-dot bg-purple-400" />
        DEMO MODE
      </span>
    );
  }

  const configs: Record<DataStatus, { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }> = {
    live: {
      label: 'LIVE',
      dotClass: 'status-live',
      bgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-300',
      borderClass: 'border-emerald-500/30',
    },
    delayed: {
      label: 'DELAYED',
      dotClass: 'status-delayed',
      bgClass: 'bg-amber-500/20',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-500/30',
    },
    stale: {
      label: 'STALE',
      dotClass: 'status-stale',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-300',
      borderClass: 'border-red-500/30',
    },
    updating: {
      label: 'UPDATING',
      dotClass: 'status-updating',
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-300',
      borderClass: 'border-blue-500/30',
    },
    reconnecting: {
      label: 'RECONNECTING',
      dotClass: 'status-reconnecting',
      bgClass: 'bg-orange-500/20',
      textClass: 'text-orange-300',
      borderClass: 'border-orange-500/30',
    },
    demo: {
      label: 'DEMO MODE',
      dotClass: 'bg-purple-400',
      bgClass: 'bg-purple-500/20',
      textClass: 'text-purple-300',
      borderClass: 'border-purple-500/30',
    },
    offline: {
      label: 'OFFLINE',
      dotClass: 'bg-gray-400',
      bgClass: 'bg-gray-500/20',
      textClass: 'text-gray-300',
      borderClass: 'border-gray-500/30',
    },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgClass} ${config.textClass} text-xs font-semibold border ${config.borderClass}`}>
      <span className={`status-dot ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

interface PriceDisplayProps {
  price: number;
  currency: SupportedCurrency;
  decimals?: number;
  size?: 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export function PriceDisplay({ price, currency, decimals = 2, size = 'xl', className = '' }: PriceDisplayProps) {
  const sizeClasses = {
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl sm:text-4xl',
  };

  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = price.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`price-text ${sizeClasses[size]} ${className}`}>
      {symbol}{formatted}
    </span>
  );
}

interface ChangeIndicatorProps {
  absolute: number | null;
  percent: number | null;
  showLabel?: boolean;
}

export function ChangeIndicator({ absolute, percent, showLabel = true }: ChangeIndicatorProps) {
  if (absolute === null || percent === null) {
    return <span className="text-slate-500 text-sm">--</span>;
  }

  const isPositive = absolute > 0;
  const isNegative = absolute < 0;
  const colorClass = isPositive ? 'change-positive' : isNegative ? 'change-negative' : 'change-neutral';
  const arrow = isPositive ? '▲' : isNegative ? '▼' : '•';

  return (
    <span className={`text-sm font-medium ${colorClass}`}>
      {arrow} {isPositive ? '+' : ''}{absolute.toFixed(2)} ({isPositive ? '+' : ''}{percent.toFixed(2)}%)
      {showLabel && <span className="text-slate-500 ml-1">today</span>}
    </span>
  );
}

interface OfflineBannerProps {
  lastPrice: number | null;
  lastUpdated: string | null;
  currency: SupportedCurrency;
}

export function OfflineBanner({ lastPrice, lastUpdated, currency }: OfflineBannerProps) {
  return (
    <div className="card bg-slate-900 border-amber-500/30 border">
      <div className="flex items-center gap-2 mb-2">
        <span className="status-dot bg-amber-400" />
        <span className="text-amber-300 font-semibold text-sm">OFFLINE</span>
      </div>
      <p className="text-slate-400 text-sm mb-3">Live gold prices are unavailable.</p>
      {lastPrice !== null && (
        <div className="text-slate-300 text-sm">
          Last known price: <PriceDisplay price={lastPrice} currency={currency} />
          <span className="text-slate-500"> / g</span>
        </div>
      )}
      {lastUpdated && (
        <div className="text-slate-500 text-xs mt-1">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
