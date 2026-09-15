import { useEffect, useRef } from 'react';

/**
 * Keeps a page's data live without a manual reload for pages that fetch with
 * plain axios/useEffect (i.e. not React Query). Re-runs the given loader:
 *   - on a lightweight background interval (default 5s),
 *   - when the user switches back to the tab (focus / visibility),
 *   - when the network reconnects.
 *
 * The loader is kept in a ref so callers can pass an inline closure without
 * causing the effect to re-subscribe on every render. Requests never run for
 * a hidden tab and never overlap, keeping the app responsive even when the
 * same account has several tabs open. Pass `enabled: false` (e.g. while a
 * modal/form is open) to pause refreshing.
 */
export function useAutoRefresh(
  loader: () => void | Promise<void>,
  { intervalMs = 5_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}
) {
  const loaderRef = useRef(loader);
  const inFlightRef = useRef(false);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      // Do not create unnecessary API traffic while this tab is in the
      // background, or start a second request before the first has finished.
      if (document.visibilityState !== 'visible' || inFlightRef.current) return;

      inFlightRef.current = true;
      Promise.resolve(loaderRef.current?.())
        .catch(() => {
          // Individual pages already decide whether a refresh error needs UI.
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

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
