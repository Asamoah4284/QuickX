import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

/**
 * Load data from a GET endpoint.
 * Pass `null` as the url to skip the request (for example while signed out).
 * Returns { data, loading, error, reload }.
 */
export function useApi(url, { client = api, params } = {}) {
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: null });
  const paramsKey = JSON.stringify(params || {});
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data } = await client.get(url, { params: JSON.parse(paramsKey) });
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) {
        setState({
          data: null,
          loading: false,
          error: { message: errorMessage(err), status: err.response?.status, code: err.response?.data?.code },
        });
      }
    }
  }, [url, client, paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
