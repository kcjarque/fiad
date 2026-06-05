import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local.',
  );
}

// Fetch wrapper that aborts after `TIMEOUT_MS` instead of hanging forever
// on flaky venue wifi. The default browser fetch has no timeout, so a
// dropped connection mid-request leaves the UI spinning indefinitely.
// 15s is generous enough for slow connections + the heaviest RPC roundtrip
// (draw_prize runs in well under 1s on the indexed schema).
const TIMEOUT_MS = 15_000;
const timeoutFetch: typeof fetch = (input, init) => {
  const ctl = new AbortController();
  const cancel = setTimeout(
    () => ctl.abort(new Error('Request timed out after 15s — check connection')),
    TIMEOUT_MS,
  );
  // Honour any caller-supplied abort signal as well (e.g. react-query
  // cancellation) — whichever fires first wins.
  if (init?.signal) {
    init.signal.addEventListener('abort', () => ctl.abort(init.signal!.reason));
  }
  return fetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(cancel));
};

export const supabase = createClient(url, anonKey, {
  global: { fetch: timeoutFetch },
});
