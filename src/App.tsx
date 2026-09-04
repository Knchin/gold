import { useState, useEffect } from 'react';
import { useGoldPrice } from './hooks/useGoldPrice';
import { usePreferences } from './hooks/usePreferences';
import { getPriceByCurrency } from './calculations/gold';
import { BottomNav, type Page } from './components/BottomNav';
import { OfflineBanner } from './components/Display';
import { Dashboard } from './pages/Dashboard';
import { CalculatorPage } from './pages/Calculator';
import { ChartPage } from './pages/Chart';
import { SettingsPage } from './pages/Settings';

function App() {
  const [activePage, setActivePage] = useState<Page>('home');
  const { data, status, error, isDemoMode, refresh } = useGoldPrice();
  const { prefs } = usePreferences();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline mode
  if (!isOnline && !data) {
    return (
      <div className="min-h-screen bg-slate-950 pb-20">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <OfflineBanner
            lastPrice={null}
            lastUpdated={null}
            currency={prefs.currency}
          />
        </div>
        <BottomNav active={activePage} onChange={setActivePage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Offline indicator when stale data exists */}
        {!isOnline && data && (
          <div className="mb-4">
            <OfflineBanner
              lastPrice={getPriceByCurrency(data.pricePerGram, prefs.currency)}
              lastUpdated={data.lastUpdated}
              currency={prefs.currency}
            />
          </div>
        )}

        {/* Main content */}
        {activePage === 'home' && data && (
          <Dashboard
            data={data}
            status={status}
            isDemoMode={isDemoMode}
            onRefresh={refresh}
            currency={prefs.currency}
            defaultKarat={prefs.defaultKarat}
            decimals={prefs.decimals}
          />
        )}

        {activePage === 'home' && !data && (
          <div className="space-y-4">
            {status === 'updating' ? (
              <div className="card">
                <div className="h-8 shimmer rounded-lg mb-3" />
                <div className="h-16 shimmer rounded-lg mb-3" />
                <div className="h-4 shimmer rounded-lg w-2/3" />
              </div>
            ) : (
              <div className="card text-center py-10">
                <p className="text-slate-400 text-sm mb-2">Loading gold prices...</p>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>
            )}
          </div>
        )}

        {activePage === 'calculator' && data && (
          <CalculatorPage data={data} decimals={prefs.decimals} />
        )}

        {activePage === 'chart' && data && (
          <ChartPage data={data} currency={prefs.currency} decimals={prefs.decimals} />
        )}

        {activePage === 'settings' && <SettingsPage />}
      </div>

      <BottomNav active={activePage} onChange={setActivePage} />
    </div>
  );
}

export default App;
