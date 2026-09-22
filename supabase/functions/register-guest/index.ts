// Guest registration behind a bot gate.
//
// Registration used to be a direct anon INSERT into `guests` from the browser.
// That is why a captcha on the form alone would have been decoration: the bot
// waves cleared by 0062/0065/0070/0088 can POST straight at PostgREST and skip
// the form entirely. The fix is to take the write away from anon and put it
// here, where a request can actually be judged before it becomes a row.
//
// Three gates, cheapest first:
//   1. Honeypot  — a field no human ever fills, because it isn't visible.
//   2. Rate limit — per IP, counted against rows already in the table.
//   3. Turnstile — Cloudflare's captcha, verified server-side.
//
// Turnstile is optional at deploy time: with no TURNSTILE_SECRET_KEY set the
// function still runs and the first two gates still apply, so this can ship
// before the keys exist without taking registration down. Once the secret is
// set the token becomes mandatory and unverified requests are refused.

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

/** Registrations allowed from one IP per window. Generous: a coordinator
 *  signing up a wedding party from one phone is a real thing. */
const RATE_LIMIT = 8;
const RATE_WINDOW_MIN = 10;

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const randomCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * 36)]).join('');
const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;

const verifyTurnstile = async (token: string, ip: string): Promise<boolean> => {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return true; // Not configured yet — gates 1 and 2 still apply.
  if (!token) return false;
  try {
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form },
    );
    const out = await res.json();
    return out.success === true;
  } catch {
    // Cloudflare unreachable. Fail closed: an outage that lets the bot wave
    // back in is worse than a few minutes of refused registrations, and the
    // client retries.
    return false;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: {
    name?: string;
    email?: string;
    mobile?: string;
    eventId?: string;
    preferredDay?: string;
    referredBy?: string;
    invitedFriend?: string;
    captchaToken?: string;
    /** Honeypot: hidden in the form, so a filled value means a script. */
    website?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Gate 1 — honeypot. Answer 200 with a plausible shape so the bot has no
  // signal that it was caught and nothing to tune against.
  if (body.website) return json({ ok: true, id: uid('guest') });

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const mobile = (body.mobile ?? '').trim();
  const eventId = (body.eventId ?? '').trim();
  if (!name || !email || !eventId) return json({ error: 'missing_fields' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'invalid_email' }, 400);

  const ip =
    req.headers.get('cf-connecting-ip') ??
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Gate 2 — rate limit. Counted against signup_ip on rows already written,
  // so it needs no extra state and survives a cold start.
  if (ip) {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('signup_ip', ip)
      .gte('registered_at', since);
    if ((count ?? 0) >= RATE_LIMIT) return json({ error: 'rate_limited' }, 429);
  }

  // Gate 3 — captcha.
  if (!(await verifyTurnstile(body.captchaToken ?? '', ip))) {
    return json({ error: 'captcha_failed' }, 403);
  }

  // Idempotent per event, matching the behaviour registerGuest had in the
  // browser: the same address registering twice for one venue returns the
  // existing account rather than creating a duplicate.
  const escaped = email.toLowerCase().replace(/[\\%_]/g, (c) => '\\' + c);
  const { data: existingRows } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .ilike('email', escaped)
    .limit(1);
  const existing = existingRows?.[0];
  if (existing) {
    const patch: Record<string, string> = {};
    if (!existing.access_code) patch.access_code = randomCode();
    if (body.preferredDay && existing.preferred_day !== body.preferredDay) {
      patch.preferred_day = body.preferredDay;
    }
    if (Object.keys(patch).length) {
      await supabase.from('guests').update(patch).eq('id', existing.id);
    }
    return json({ ok: true, guest: { ...existing, ...patch } });
  }

  const row = {
    id: uid('guest'),
    event_id: eventId,
    name,
    email,
    mobile,
    qr_token: `guest-qr-${Math.random().toString(36).slice(2, 12)}`,
    registered_at: new Date().toISOString(),
    access_code: randomCode(),
    preferred_day: body.preferredDay ?? null,
    referred_by: body.referredBy?.trim() || null,
    invited_friend: body.invitedFriend?.trim() || null,
    signup_ip: ip || null,
  };

  const { data: inserted, error } = await supabase
    .from('guests')
    .insert(row)
    .select('*')
    .single();
  if (error) {
    // Race on the same email: whichever insert lost returns the winner.
    const { data: won } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .ilike('email', escaped)
      .limit(1);
    if (won?.[0]) return json({ ok: true, guest: won[0] });
    return json({ error: 'insert_failed', detail: error.message }, 500);
  }

  return json({ ok: true, guest: inserted });
});
