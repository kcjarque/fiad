// Guest access-code login: case-insensitive plaintext compare. Generic 401 on
// failure (same response for unknown email and wrong code) so we don't leak
// which emails exist. Demo-grade — no rate limit, no lockout.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { email?: string; code?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  // Accept both `code` (new) and `password` (back-compat) keys.
  const submitted = (body.code ?? body.password ?? '').trim().toUpperCase();
  if (!email || !submitted) return json({ error: 'missing_credentials' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: guest, error } = await supabase
    .from('guests')
    .select('id, name, email, mobile, qr_token, registered_at, event_id, access_code')
    .ilike('email', email)
    .maybeSingle();
  if (error) return json({ error: 'lookup_failed', detail: error.message }, 500);

  if (!guest || !guest.access_code) return json({ error: 'invalid_credentials' }, 401);
  if (guest.access_code.toUpperCase() !== submitted) {
    return json({ error: 'invalid_credentials' }, 401);
  }

  const { access_code: _omit, ...safe } = guest;
  return json({ ok: true, guest: safe });
});
