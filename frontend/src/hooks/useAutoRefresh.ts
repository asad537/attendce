import { useEffect, useRef } from 'react';

/**
 * Keeps a page's data live without a manual reload for pages that fetch with
 * plain axios/useEffect (i.e. not React Query). Re-runs the given loader:
 *   - on a background interval (default 20s),
 *   - when the user switches back to the tab (focus / visibility),
 *   - when the network reconnects.
 *
 * The loader is kept in a ref so callers can pass an inline closure without
 * causing the effect to re-subscribe on every render. Pass `enabled: false`
 * (e.g. while a modal/form is open) to pause refreshing.
 */
export function useAutoRefresh(
  loader: () => void,
  { intervalMs = 20_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}
) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) return;

    const run = () => loaderRef.current?.();

    const id = window.setInterval(run, intervalMs);
    const onFocus = () => run();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
}
