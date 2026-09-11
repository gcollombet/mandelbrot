/** Retry only transport failures; permission, quota and validation errors need a change by the user. */
export function personalSyncRetryDelay(error: unknown, failures: number): number | null {
  const code = String((error as {code?: unknown})?.code ?? '').replace(/^firestore\//, '');
  const transient = ['unavailable', 'deadline-exceeded', 'aborted', 'internal', 'unknown',
    'storage/retry-limit-exceeded', 'storage/unknown'].includes(code)
    || (error instanceof TypeError && /fetch|network/i.test(error.message));
  return transient ? Math.min(300_000, 15_000 * 2 ** Math.min(Math.max(0, failures - 1), 5)) : null;
}

/** Serializes requests and keeps a single backoff timer. A new edit or reconnect retries immediately. */
export function createPersonalSyncRunner(sync: (uid: string, refresh: boolean) => Promise<void>) {
  let uid: string | null = null;
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let refreshNeeded = true;
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const online = () => { void request(true); };

  function request(refresh = false): Promise<void> {
    refreshNeeded ||= refresh;
    if (!uid) return Promise.resolve();
    if (running) { again = true; return running; }
    clearTimer();
    const owner = uid;
    running = (async () => {
      do {
        again = false;
        try {
          const refresh = refreshNeeded;
          refreshNeeded = false;
          await sync(owner, refresh);
          failures = 0;
        } catch (error) {
          refreshNeeded = true;
          const delay = personalSyncRetryDelay(error, ++failures);
          // A failed pass must not bypass backoff because another request was coalesced.
          again = false;
          if (uid === owner && delay !== null && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
            timer = setTimeout(() => { void request(); }, delay);
          }
          return;
        }
      } while (again && uid === owner);
    })().finally(() => { running = null; });
    return running;
  }

  return {
    request,
    start(owner: string) {
      uid = owner;
      failures = 0;
      if (typeof window !== 'undefined') window.addEventListener('online', online);
      return request(true);
    },
    stop() {
      uid = null;
      again = false;
      clearTimer();
      if (typeof window !== 'undefined') window.removeEventListener('online', online);
      return running ?? Promise.resolve();
    },
  };
}
