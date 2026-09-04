import { useState, useCallback } from 'react';
import { calculateGoldValue } from '../calculations/gold';
import { loadPreferences, savePreferences } from '../stores/preferences';
import type { CalculatorInput, CalculatorResult, SupportedCurrency, KaratValue } from '../types/gold';

interface UseCalculatorReturn {
  input: CalculatorInput;
  result: CalculatorResult | null;
  setWeight: (w: number) => void;
  setKarat: (k: KaratValue) => void;
  setCurrency: (c: SupportedCurrency) => void;
  setWeightUnit: (u: CalculatorInput['weightUnit']) => void;
}

export function useCalculator(pricePerGramMap: Record<SupportedCurrency, number> | null): UseCalculatorReturn {
  const prefs = loadPreferences();
  const [input, setInput] = useState<CalculatorInput>({
    weight: 10,
    karat: prefs.defaultKarat,
    currency: prefs.currency,
    weightUnit: prefs.weightUnit,
  });

  const result = pricePerGramMap ? calculateGoldValue(input, pricePerGramMap) : null;

  const setWeight = useCallback((w: number) => {
    setInput((prev) => ({ ...prev, weight: Math.max(0, w) }));
  }, []);

  const setKarat = useCallback((k: KaratValue) => {
    setInput((prev) => ({ ...prev, karat: k }));
    savePreferences({ defaultKarat: k });
  }, []);

  const setCurrency = useCallback((c: SupportedCurrency) => {
    setInput((prev) => ({ ...prev, currency: c }));
    savePreferences({ currency: c });
  }, []);

  const setWeightUnit = useCallback((u: CalculatorInput['weightUnit']) => {
    setInput((prev) => ({ ...prev, weightUnit: u }));
    savePreferences({ weightUnit: u });
  }, []);

  return { input, result, setWeight, setKarat, setCurrency, setWeightUnit };
}
