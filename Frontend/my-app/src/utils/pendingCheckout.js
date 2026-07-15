const STORAGE_KEY = 'pendingCheckout';

/** Persist checkout intent across register → verify → payment. */
export function savePendingCheckout(payload) {
  if (!payload?.item) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        item: payload.item,
        returnPath: payload.returnPath || null,
        returnTabState: payload.returnTabState ?? null,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingCheckout() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.item) return null;
    // Drop after 24h
    if (data.savedAt && Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearPendingCheckout();
      return null;
    }
    return {
      item: data.item,
      returnPath: data.returnPath || null,
      returnTabState: data.returnTabState ?? null,
    };
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
