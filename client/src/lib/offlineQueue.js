// ── Offline queue & session cache ─────────────────────────────────────────────
// Sets that failed to POST are queued here and replayed when back online.
// Completed sessions are cached here for offline Log viewing.

const SET_QUEUE_KEY    = 'motus_offline_set_queue';
const SESSION_CACHE_KEY = 'motus_session_cache';

// ── Set queue ─────────────────────────────────────────────────────────────────

export function enqueueSet(setData) {
  try {
    const queue = getQueue();
    queue.push({ ...setData, queuedAt: Date.now() });
    localStorage.setItem(SET_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function getQueue() {
  try {
    const raw = localStorage.getItem(SET_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearQueue() {
  localStorage.removeItem(SET_QUEUE_KEY);
}

// Flush queue — call when app comes back online.
// Returns count of successfully synced sets.
export async function flushQueue(apiPost) {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed = [];

  for (const item of queue) {
    try {
      const { queuedAt, ...setData } = item;
      await apiPost('/api/log/set', setData);
      synced++;
    } catch {
      failed.push(item);
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(SET_QUEUE_KEY, JSON.stringify(failed));
  } else {
    clearQueue();
  }

  return synced;
}

// ── Session cache ──────────────────────────────────────────────────────────────

export function cacheSession(session) {
  try {
    const existing = getCachedSessions();
    const updated = [{ ...session, cachedAt: Date.now() }, ...existing].slice(0, 30);
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(updated));
  } catch {}
}

export function getCachedSessions() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
