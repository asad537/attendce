import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings, settingsService } from '../services/settingsService';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Re-theme the whole app by aliasing every `emerald-*` colour to the chosen
// Tailwind colour scale (Tailwind v4 exposes each shade as a CSS variable).
export function applyAccent(accent: string) {
  const root = document.documentElement;
  
  if (!accent || accent === 'emerald') {
    SHADES.forEach(shade => root.style.removeProperty(`--color-emerald-${shade}`));
    return;
  }

  // If it's a custom color (starts with #, rgb, hsl)
  if (accent.startsWith('#') || accent.startsWith('rgb') || accent.startsWith('hsl')) {
    const percentages: Record<number, string> = {
      50: 'white 90%', 100: 'white 80%', 200: 'white 60%', 300: 'white 40%', 400: 'white 20%',
      500: '', 
      600: 'black 20%', 700: 'black 40%', 800: 'black 60%', 900: 'black 80%', 950: 'black 90%'
    };
    
    SHADES.forEach(shade => {
      if (shade === 500) {
        root.style.setProperty(`--color-emerald-500`, accent);
      } else {
        root.style.setProperty(`--color-emerald-${shade}`, `color-mix(in srgb, ${accent}, ${percentages[shade]})`);
      }
    });
  } else {
    // Standard Tailwind accent
    SHADES.forEach(shade => {
      root.style.setProperty(`--color-emerald-${shade}`, `var(--color-${accent}-${shade})`);
    });
  }
}

export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
  }
}

// Apply any previously-saved accent immediately (before the first paint / API call).
try { applyAccent(localStorage.getItem('app_accent') || 'emerald'); } catch { /* ignore */ }

interface SettingsContextValue {
  currency: string;
  accent: string;
  options: AppSettings | null;
  money: (value: number) => string;
  refresh: () => Promise<void>;
  save: (payload: { currency?: string; accent?: string }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(() => { try { return localStorage.getItem('app_currency') || 'USD'; } catch { return 'USD'; } });
  const [accent, setAccent] = useState(() => { try { return localStorage.getItem('app_accent') || 'emerald'; } catch { return 'emerald'; } });
  const [options, setOptions] = useState<AppSettings | null>(null);

  const apply = useCallback((data: AppSettings) => {
    setOptions(data);
    setCurrency(data.currency);
    setAccent(data.accent);
    applyAccent(data.accent);
    try { localStorage.setItem('app_currency', data.currency); localStorage.setItem('app_accent', data.accent); } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    try { apply(await settingsService.get()); } catch { /* keep local values */ }
  }, [apply]);

  const save = useCallback(async (payload: { currency?: string; accent?: string }) => {
    apply(await settingsService.update(payload));
  }, [apply]);

  useEffect(() => {
    if (localStorage.getItem('auth_token')) refresh();
  }, [refresh]);

  const money = useCallback((value: number) => formatMoney(value, currency), [currency]);

  return <SettingsContext.Provider value={{ currency, accent, options, money, refresh, save }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
