// FIAD Email Marketing — broadcast dispatcher (ConexMail raw HTML).
//
// Modes:
//   { mode: 'test', emailId, to, firstName? }
//       Render one email with sample merge data and send a single copy to `to`.
//       Used by the admin "Send test to my inbox" button.
//
//   { mode: 'send_now', emailId }
//       Send ONE specific email to its matching-track recipients right now,
//       regardless of schedule or campaign status. Batches ~50 per call
//       (loop-invoke until remaining=0); idempotent via campaign_sends. Used to
//       fire a single broadcast on demand without activating the whole campaign.
//
//   { mode: 'dispatch' }                              (default; called by pg_cron)
//       Find every campaign_email that is now due — status in (scheduled,sending),
//       scheduled_at <= now(), and its campaign.status = 'active' — and send it to
//       the matching-track recipients that don't yet have a send row. Batches
//       ~50 recipients per email per tick; the unique (email_id, recipient_id)
//       constraint makes this idempotent, so an extra tick never double-sends.
//
// Secrets (shared with `notify`): CONEXMAIL_BASE_URL, CONEXMAIL_API_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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

const BATCH_PER_EMAIL = 50;

// ── Merge fields ──────────────────────────────────────────────────────────────
function renderMergeFields(
  html: string,
  d: { firstName?: string; registerLink: string; fromName: string; fbPage: string; unsubscribeUrl: string },
): string {
  return html
    .replaceAll('{{first_name}}', d.firstName?.trim() || 'there')
    .replaceAll('{{register_link}}', d.registerLink)
    .replaceAll('{{from_name}}', d.fromName)
    .replaceAll('{{fb_page}}', d.fbPage)
    .replaceAll('{{unsubscribe_url}}', d.unsubscribeUrl);
}

const unsubscribeFor = (email: string) =>
  `mailto:hello@fiad.app?subject=${encodeURIComponent(`Unsubscribe ${email}`)}`;

// ── ConexMail raw-HTML send (same path as notify's sendEmail) ─────────────────
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  fromName: string;
}): Promise<{ sent: boolean; error?: string }> {
  const base = Deno.env.get('CONEXMAIL_BASE_URL');
  const key = Deno.env.get('CONEXMAIL_API_KEY');
  if (!base || !key) return { sent: false, error: 'not_configured' };
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/mail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: 'hello@fiad.app', name: opts.fromName },
        subject: opts.subject,
        content: [{ type: 'text/html', value: opts.html }],
        body_html: opts.html,
      }),
    });
    return { sent: res.ok, error: res.ok ? undefined : `status_${res.status}` };
  } catch (e) {
    return { sent: false, error: String(e) };
  }
}

// deno-lint-ignore no-explicit-any
type Campaign = any;
// deno-lint-ignore no-explicit-any
type Email = any;

function mergeDataFor(campaign: Campaign, firstName: string, recipientEmail: string) {
  return {
    firstName,
    registerLink: campaign.register_link ?? 'https://www.fiad.app/rsvp',
    fromName: campaign.from_name ?? 'Team FIAD',
    fbPage: campaign.fb_page ?? '',
    unsubscribeUrl: unsubscribeFor(recipientEmail),
  };
}

// ── Core: send one email to its (as-yet-unsent) recipients, one batch ─────────
async function processEmail(email: Email, campaign: Campaign, nowIso: string) {
  // Recipients for this email's track.
  const { data: recipients } = await db
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', email.campaign_id)
    .eq('track', email.track);
  const all = recipients ?? [];

  // Who already has a send row (sent or failed) — skip them.
  const { data: sends } = await db.from('campaign_sends').select('recipient_id').eq('email_id', email.id);
  const done = new Set<string>((sends ?? []).map((s: { recipient_id: string }) => s.recipient_id));
  const pending = all.filter((r: { id: string }) => !done.has(r.id));

  if (all.length === 0) {
    await db.from('campaign_emails').update({ status: 'sent', updated_at: nowIso }).eq('id', email.id);
    return { emailId: email.id, subject: email.subject, recipients: 0, sentThisTick: 0, remaining: 0, status: 'sent' };
  }

  const batch = pending.slice(0, BATCH_PER_EMAIL);
  let sentThisTick = 0;
  for (const r of batch) {
    const html = renderMergeFields(email.body_html, mergeDataFor(campaign, r.first_name || '', r.email));
    const res = await sendEmail({ to: r.email, subject: email.subject, html, fromName: campaign.from_name ?? 'Team FIAD' });
    await db.from('campaign_sends').insert({
      id: `csnd_${crypto.randomUUID()}`,
      email_id: email.id,
      recipient_id: r.id,
      status: res.sent ? 'sent' : 'failed',
      error: res.error ?? null,
    });
    if (res.sent) sentThisTick++;
  }

  const { count: sentTotal } = await db
    .from('campaign_sends')
    .select('*', { count: 'exact', head: true })
    .eq('email_id', email.id)
    .eq('status', 'sent');
  const remaining = pending.length - batch.length;
  const status = remaining > 0 ? 'sending' : 'sent';
  await db
    .from('campaign_emails')
    .update({ status, sent_count: sentTotal ?? 0, updated_at: nowIso })
    .eq('id', email.id);

  return { emailId: email.id, subject: email.subject, recipients: all.length, sentThisTick, remaining, status };
}

// ── Test mode ─────────────────────────────────────────────────────────────────
async function handleTest(body: { emailId?: string; to?: string; firstName?: string }) {
  if (!body.emailId || !body.to) return json({ error: 'missing_fields' }, 400);
  const { data: email } = await db.from('campaign_emails').select('*').eq('id', body.emailId).maybeSingle();
  if (!email) return json({ error: 'email_not_found' }, 404);
  const { data: campaign } = await db.from('email_campaigns').select('*').eq('id', email.campaign_id).maybeSingle();
  if (!campaign) return json({ error: 'campaign_not_found' }, 404);

  const html = renderMergeFields(email.body_html, mergeDataFor(campaign, body.firstName || 'Maria', body.to));
  const result = await sendEmail({
    to: body.to,
    subject: `[TEST] ${email.subject}`,
    html,
    fromName: campaign.from_name ?? 'Team FIAD',
  });
  return json({ ok: true, mode: 'test', result });
}

// ── Send-now mode (one email, on demand, ignores schedule + campaign status) ──
async function handleSendNow(body: { emailId?: string }) {
  if (!body.emailId) return json({ error: 'missing_fields' }, 400);
  const nowIso = new Date().toISOString();
  const { data: email } = await db.from('campaign_emails').select('*').eq('id', body.emailId).maybeSingle();
  if (!email) return json({ error: 'email_not_found' }, 404);
  const { data: campaign } = await db.from('email_campaigns').select('*').eq('id', email.campaign_id).maybeSingle();
  if (!campaign) return json({ error: 'campaign_not_found' }, 404);
  const result = await processEmail(email, campaign, nowIso);
  return json({ ok: true, mode: 'send_now', ...result });
}

// ── Dispatch mode ─────────────────────────────────────────────────────────────
async function handleDispatch() {
  const nowIso = new Date().toISOString();

  const { data: campaigns } = await db.from('email_campaigns').select('*').eq('status', 'active');
  const activeById = new Map<string, Campaign>((campaigns ?? []).map((c: Campaign) => [c.id, c]));
  if (activeById.size === 0) return json({ ok: true, mode: 'dispatch', due: 0, note: 'no_active_campaigns' });

  const { data: dueEmails } = await db
    .from('campaign_emails')
    .select('*')
    .in('status', ['scheduled', 'sending'])
    .lte('scheduled_at', nowIso);

  const emails = (dueEmails ?? []).filter((e: Email) => activeById.has(e.campaign_id));
  const summary: Array<Record<string, unknown>> = [];
  for (const email of emails) {
    summary.push(await processEmail(email, activeById.get(email.campaign_id)!, nowIso));
  }
  return json({ ok: true, mode: 'dispatch', due: emails.length, summary });
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body = dispatch */
  }

  try {
    if (body.mode === 'test') return await handleTest(body);
    if (body.mode === 'send_now') return await handleSendNow(body);
    return await handleDispatch();
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
