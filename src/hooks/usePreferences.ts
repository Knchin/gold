import { useState, useEffect } from 'react';
import { loadPreferences, savePreferences } from '../stores/preferences';
import type { UserPreferences, SupportedCurrency, KaratValue, ThemeMode } from '../types/gold';

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    applyTheme(prefs.theme);
  }, [prefs.theme]);

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences({ [key]: value });
      return next;
    });
  };

  return { prefs, updatePref };
}

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
