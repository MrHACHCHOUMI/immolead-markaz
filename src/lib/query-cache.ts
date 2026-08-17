type Entry = { data: unknown; at: number };

const store = new Map<string, Entry>();
const TTL_MS = 60_000;
const EVENT = "crm:data";

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T) {
  store.set(key, { data, at: Date.now() });
}

export function invalidateCrm(prefix?: string) {
  if (!prefix) {
    store.clear();
  } else {
    for (const key of store.keys()) {
      if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function subscribeCrmData(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export async function cachedQuery<T>(
  key: string,
  loader: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const limit = ttl ?? TTL_MS;
  const existing = store.get(key);
  if (existing && Date.now() - existing.at <= limit) {
    return existing.data as T;
  }
  const data = await loader();
  setCached(key, data);
  return data;
}
