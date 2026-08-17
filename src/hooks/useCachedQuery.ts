"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cachedQuery,
  getCached,
  subscribeCrmData,
} from "@/lib/query-cache";

export function useCachedQuery<T>(key: string, loader: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => getCached<T>(key));
  const [loading, setLoading] = useState(data === undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (force = false) => {
      try {
        if (!force && getCached<T>(key) !== undefined) {
          setData(getCached<T>(key));
          setLoading(false);
        } else {
          if (getCached<T>(key) === undefined) setLoading(true);
        }
        const next = await cachedQuery(key, loader, force ? 0 : undefined);
        setData(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    },
    [key, loader]
  );

  useEffect(() => {
    void reload(false);
    return subscribeCrmData(() => {
      void reload(true);
    });
  }, [reload]);

  return { data, loading: loading && data === undefined, error, reload };
}
