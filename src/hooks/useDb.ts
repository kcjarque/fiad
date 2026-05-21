import { useEffect, useState } from 'react';
import { subscribe } from '../data/mockDb';

/**
 * Re-renders on every mock db change. Use `selector` to derive fresh values.
 */
export function useDb<T>(selector: () => T): T {
  const [value, setValue] = useState<T>(() => selector());
  useEffect(() => {
    const unsub = subscribe(() => setValue(selector()));
    return () => {
      unsub();
    };
    // selector intentionally left out — we want to snapshot on each notify
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
