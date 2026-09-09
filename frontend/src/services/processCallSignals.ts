// The API consumes a whole batch at once. A failure for one peer must not
// discard the remaining participants' offers/answers in that batch.
export async function processCallSignals<T>(
  signals: T[],
  handle: (signal: T) => Promise<void>,
  isActive: () => boolean,
  onError: (error: unknown) => void,
): Promise<void> {
  for (const signal of signals) {
    if (!isActive()) return;
    try { await handle(signal); } catch (error) { onError(error); }
  }
}
