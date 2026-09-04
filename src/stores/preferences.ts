import type { UserPreferences, SupportedCurrency, KaratValue, ThemeMode } from '../types/gold';

const STORAGE_KEY = 'gold-price-preferences';

const DEFAULT_PREFS: UserPreferences = {
  currency: 'EUR',
  defaultKarat: 24,
  theme: 'dark',
  decimals: 2,
  weightUnit: 'gram',
  refreshIntervalMs: 60000,
};

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  const current = loadPreferences();
  const merged = { ...current, ...prefs };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}
