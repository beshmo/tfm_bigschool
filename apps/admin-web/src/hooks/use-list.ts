import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginatedResultDto } from '@okvns/shared';
import { toDisplayError, type DisplayError } from '../api/error-message';

interface ListState<T> {
  result?: PaginatedResultDto<T>;
  loading: boolean;
  error?: DisplayError;
}

/**
 * Loads one page of an API-backed list. It re-requests whenever `deps` change or
 * `reload` is called, keeps the previous rows visible while refetching, and
 * ignores responses that arrive after a newer request started.
 */
export function useList<T>(
  fetcher: () => Promise<PaginatedResultDto<T>>,
  deps: readonly unknown[],
) {
  const [state, setState] = useState<ListState<T>>({ loading: true });
  const [reloadKey, setReloadKey] = useState(0);
  const latest = useRef(fetcher);
  latest.current = fetcher;

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true }));
    latest.current().then(
      (result) => {
        if (active) setState({ result, loading: false });
      },
      (error: unknown) => {
        if (active)
          setState((current) => ({ ...current, loading: false, error: toDisplayError(error) }));
      },
    );
    return () => {
      active = false;
    };
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { ...state, reload };
}
