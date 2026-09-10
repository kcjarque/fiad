// FIAD one-off SMS blast — sends a single reminder to all Season 2 guests via
// OneWaySMS. Idempotent: every send is logged to sms_log with a fixed `kind`,
// and already-logged numbers are skipped, so the pg_cron that fires this can
// tick repeatedly (draining in batches) without ever double-texting.
//
// Modes (POST body):
//   { mode: 'blast' }   send the next batch (only this actually texts people)
//   anything else        dry run — returns audience/pending counts, sends nothing
//
// Secrets (shared with `notify`): ONEWAYSMS_USERNAME/PASSWORD/SENDER, optional
// ONEWAYSMS_BASE_URL. Deploy WITHOUT jwt: supabase functions deploy sms-blast --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const BLAST_KIND = 'reminder_d1';
const S2_EVENTS = ['evt_fiad_s2_brittany', 'evt_fiad_s2_mella'];
const BATCH = 80;
const MESSAGE =
  'One week to Forever in a Day S2! The wedding & debut fair - Brittany BGC Sep 18-19, Mella Las Pinas Sep 19-20. Save the check-in QR from your email. See you!';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', ...CORS } });

function normalizePhMobile(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('63') && digits.length >= 12) return digits;
  if (digits.startsWith('09') && digits.length === 11) return `63${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 10) return `63${digits}`;
  return null;
}
const smsSegments = (m: string) => (m.length <= 160 ? 1 : Math.ceil(m.length / 153));

async function sendSms(to: string): Promise<{ sent: boolean; error?: string }> {
  const base = Deno.env.get('ONEWAYSMS_BASE_URL') ?? 'http://gateway80.onewaysms.ph/api2.aspx';
  const user = Deno.env.get('ONEWAYSMS_USERNAME');
  const pass = Deno.env.get('ONEWAYSMS_PASSWORD');
  const sender = Deno.env.get('ONEWAYSMS_SENDER') ?? 'FIAD';
  if (!user || !pass) return { sent: false, error: 'not_configured' };
  try {
    const url = new URL(base);
    url.searchParams.set('apiusername', user);
    url.searchParams.set('apipassword', pass);
    url.searchParams.set('senderid', sender);
    url.searchParams.set('mobileno', to);
    url.searchParams.set('languagetype', '1');
    url.searchParams.set('message', MESSAGE);
    const res = await fetch(url.toString());
    const text = (await res.text()).trim();
    const num = parseInt(text, 10);
    const ok = !Number.isNaN(num) && num > 0;
    return { sent: ok, error: ok ? undefined : `gw_${text}` };
  } catch (e) {
    return { sent: false, error: String(e) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // Build the deduped audience: one normalized mobile per S2 guest.
  const { data: guests } = await db
    .from('guests')
    .select('event_id, mobile')
    .in('event_id', S2_EVENTS);
  const audience = new Map<string, string>(); // mobile -> event_id
  for (const g of guests ?? []) {
    const m = normalizePhMobile(g.mobile ?? '');
    if (m && !audience.has(m)) audience.set(m, g.event_id);
  }

  // Numbers already texted for THIS blast (any status) — never re-send.
  const { data: logged } = await db.from('sms_log').select('to_phone').eq('kind', BLAST_KIND);
  const done = new Set<string>((logged ?? []).map((r: { to_phone: string }) => r.to_phone));
  const pending = [...audience.keys()].filter((m) => !done.has(m));

  if (body.mode !== 'blast') {
    return json({
      ok: true, mode: 'dry_run', audience: audience.size, alreadySent: done.size,
      pending: pending.length, sample: pending.slice(0, 3).map((m) => m.slice(0, 4) + '****' + m.slice(-2)),
      message: MESSAGE, segments: smsSegments(MESSAGE),
    });
  }

  const batch = pending.slice(0, BATCH);
  let sent = 0, failed = 0;
  for (const mobile of batch) {
    const r = await sendSms(mobile);
    await db.from('sms_log').insert({
      id: `smsl_${crypto.randomUUID()}`, event_id: audience.get(mobile) ?? null,
      kind: BLAST_KIND, to_phone: mobile, segments: smsSegments(MESSAGE), status: r.sent ? 'sent' : 'failed',
    });
    r.sent ? sent++ : failed++;
  }
  return json({ ok: true, mode: 'blast', sentThisTick: sent, failedThisTick: failed, remaining: pending.length - batch.length });
});
