import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings, settingsService } from '../services/settingsService';
import { useAuth } from './AuthContext';

// Per-user accent is keyed by user id so two people sharing a browser (log out
// / log in) never inherit each other's colour.
const accentKey = (id?: number | string | null) => (id ? `accent_user_${id}` : '');
function readUserAccent(id?: number | string | null): string {
  try { return (id && localStorage.getItem(accentKey(id))) || ''; } catch { return ''; }
}
// One-time cleanup of the old browser-global key that leaked across users.
try { localStorage.removeItem('user_accent'); } catch { /* ignore */ }

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

// Apply any previously-saved accent immediately (before the first paint / API
// call). Apply the org default up front; the logged-in user's personal accent
// (if any) is applied once we know who they are.
try { applyAccent(localStorage.getItem('app_accent') || 'emerald'); } catch { /* ignore */ }

interface SettingsContextValue {
  currency: string;
  accent: string;             // org-wide default accent
  userAccent: string;         // this user's personal override ('' = use org default)
  options: AppSettings | null;
  money: (value: number) => string;
  refresh: () => Promise<void>;
  save: (payload: { currency?: string; accent?: string }) => Promise<void>;
  setUserAccent: (accent: string) => void;   // per-user theme, stored locally
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(() => { try { return localStorage.getItem('app_currency') || 'USD'; } catch { return 'USD'; } });
  const [accent, setAccent] = useState(() => { try { return localStorage.getItem('app_accent') || 'emerald'; } catch { return 'emerald'; } });
  const [userAccent, setUserAccentState] = useState<string>(() => readUserAccent(user?.id));
  const [options, setOptions] = useState<AppSettings | null>(null);

  // Whenever the logged-in user (or the org accent) changes, apply THAT user's
  // personal accent, falling back to the org default. Logging out (user = null)
  // resets to the org default, so no colour ever leaks between accounts.
  useEffect(() => {
    const ua = readUserAccent(user?.id);
    setUserAccentState(ua);
    applyAccent(ua || accent);
  }, [user?.id, accent]);

  const apply = useCallback((data: AppSettings) => {
    setOptions(data);
    setCurrency(data.currency);
    setAccent(data.accent);
    // A personal override always wins over the org-wide accent.
    applyAccent(readUserAccent(user?.id) || data.accent);
    try { localStorage.setItem('app_currency', data.currency); localStorage.setItem('app_accent', data.accent); } catch { /* ignore */ }
  }, [user?.id]);

  // Per-user theme colour, stored under this user's own key so it never changes
  // anyone else's dashboard (and never touches the org setting). '' resets.
  const setUserAccent = useCallback((next: string) => {
    try {
      if (!user?.id) return;
      if (!next) { localStorage.removeItem(accentKey(user.id)); setUserAccentState(''); applyAccent(accent); }
      else { localStorage.setItem(accentKey(user.id), next); setUserAccentState(next); applyAccent(next); }
    } catch { /* ignore */ }
  }, [accent, user?.id]);

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

  return <SettingsContext.Provider value={{ currency, accent, userAccent, options, money, refresh, save, setUserAccent }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
