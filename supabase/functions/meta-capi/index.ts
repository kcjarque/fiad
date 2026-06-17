// Meta Conversions API — server-side "Lead" event for the RSVP ads funnel.
//
// The browser Pixel and this server event share the same `event_id`, so Meta
// deduplicates them (counts one Lead, but survives ad-blockers/iOS). PII is
// SHA-256 hashed here, never sent in the clear. Client IP + User-Agent are
// read from request headers to lift Event Match Quality.
//
// Secrets (set in the dashboard → Edge Functions → meta-capi):
//   META_PIXEL_ID            your Meta Pixel / dataset id
//   META_CAPI_ACCESS_TOKEN   system-user Conversions API token
// With either missing this returns a no-op success, so the funnel never breaks.

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

const sha256 = async (v: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const norm = (v?: string) => (v ?? '').trim().toLowerCase();

// Meta wants phone as country-code + number digits only (no +, no leading 0).
// Normalize PH formats: '0917…'→'63917…', '+63 917…'→'63917…', bare '9XXXXXXXXX'→'639…'.
const normPhone = (v?: string) => {
  let d = (v ?? '').replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '63' + d.slice(1);
  else if (d.startsWith('63')) { /* already has country code */ }
  else if (d.length === 10 && d.startsWith('9')) d = '63' + d;
  return d;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const PIXEL_ID = Deno.env.get('META_PIXEL_ID');
  const TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN');
  if (!PIXEL_ID || !TOKEN) return json({ ok: true, skipped: 'not_configured' });

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const ua = req.headers.get('user-agent') ?? undefined;
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;

  const user_data: Record<string, unknown> = {};
  if (body.email) user_data.em = [await sha256(norm(body.email))];
  if (body.phone) user_data.ph = [await sha256(normPhone(body.phone))];
  if (body.first_name) user_data.fn = [await sha256(norm(body.first_name))];
  if (body.last_name) user_data.ln = [await sha256(norm(body.last_name))];
  if (body.fbp) user_data.fbp = body.fbp;
  if (body.fbc) user_data.fbc = body.fbc;
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id,
        action_source: 'website',
        event_source_url: body.event_source_url,
        user_data,
        custom_data: body.custom ?? {},
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(
    TOKEN,
  )}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    return json({ ok: res.ok, meta: out }, res.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }
});
