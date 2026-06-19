// FIAD notification edge function — email (ConexMail) + SMS (OneWaySMS).
//
// Two event types:
//   rsvp_confirmation  → send guest their confirmation email + SMS with access code
//   inquiry_lead       → alert admin of a new planning inquiry
//
// All sends are best-effort: a missing credential or provider error returns
// { ok: true, skipped: '...' } so the funnel is never blocked.
//
// Secrets (Supabase dashboard → Edge Functions → notify):
//   CONEXMAIL_BASE_URL        https://conexmail.vercel.app (or custom domain)
//   CONEXMAIL_API_KEY         cm_live_…  (Conex Media workspace key)
//   ONEWAYSMS_BASE_URL        optional — defaults to gateway80.onewaysms.ph/api2.aspx
//   ONEWAYSMS_USERNAME        OneWaySMS account API username
//   ONEWAYSMS_PASSWORD        OneWaySMS account API password
//   ONEWAYSMS_SENDER          default: FIAD
//   FIAD_ADMIN_EMAIL          default: admin@fiad.app
//   FIAD_ADMIN_MOBILE         e.g. 09171234567 (optional — skip SMS if absent)

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const base = Deno.env.get('CONEXMAIL_BASE_URL');
  const key = Deno.env.get('CONEXMAIL_API_KEY');
  if (!base || !key) return { sent: false, error: 'not_configured' };

  try {
    const from = 'hello@fiad.app';
    const fromName = opts.fromName ?? 'Forever in a Day';
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/mail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: from, name: fromName },
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

/** Normalize a PH mobile to OneWaySMS format (63XXXXXXXXXX, no '+'). */
function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('63') && digits.length >= 12) return digits;
  if (digits.startsWith('09') && digits.length === 11) return `63${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 10) return `63${digits}`;
  return null;
}

async function sendSms(opts: {
  to: string;
  message: string;
}): Promise<{ sent: boolean; error?: string }> {
  // Gateway is fixed for OneWaySMS PH; only the account creds vary. Override
  // with ONEWAYSMS_BASE_URL only if provisioned on a different gateway.
  const base = Deno.env.get('ONEWAYSMS_BASE_URL') ?? 'http://gateway80.onewaysms.ph/api2.aspx';
  const user = Deno.env.get('ONEWAYSMS_USERNAME');
  const pass = Deno.env.get('ONEWAYSMS_PASSWORD');
  const sender = Deno.env.get('ONEWAYSMS_SENDER') ?? 'FIAD';
  if (!user || !pass) return { sent: false, error: 'not_configured' };

  const mobile = normalizePhMobile(opts.to);
  if (!mobile) return { sent: false, error: 'invalid_mobile' };

  try {
    const url = new URL(base);
    url.searchParams.set('apiusername', user);
    url.searchParams.set('apipassword', pass);
    url.searchParams.set('senderid', sender);
    url.searchParams.set('mobileno', mobile);
    url.searchParams.set('languagetype', '1');
    url.searchParams.set('message', opts.message);
    const res = await fetch(url.toString());
    // OneWaySMS replies HTTP 200 with a signed integer body: a positive
    // transaction id means accepted, a negative number is an error code.
    const text = (await res.text()).trim();
    const num = parseInt(text, 10);
    const ok = !Number.isNaN(num) && num > 0;
    return { sent: ok, error: ok ? undefined : `gateway_${text.slice(0, 40)}` };
  } catch (e) {
    return { sent: false, error: String(e) };
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

function rsvpEmailHtml(guest: {
  name: string;
  accessCode: string;
  venue: string;
  date: string;
}): string {
  const firstName = guest.name.trim().split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're on the list — FIAD Season 2</title>
</head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(60,30,50,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#3c1e32;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#e8d5c0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Forever in a Day</p>
            <h1 style="margin:8px 0 0;color:#f9f5f0;font-size:26px;font-weight:normal;letter-spacing:.5px;">You're on the list, ${firstName}! 🎉</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#3c1e32;font-size:15px;line-height:1.6;">
              Your spot at <strong>Forever in a Day Season 2</strong> is confirmed. We can't wait to see you there.
            </p>
            <!-- Event details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#f9f5f0;border-radius:10px;padding:16px 20px;">
                  <p style="margin:0 0 6px;color:#8a6a7a;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Venue</p>
                  <p style="margin:0;color:#3c1e32;font-size:15px;font-weight:bold;">${guest.venue}</p>
                </td>
              </tr>
              <tr><td style="height:10px;"></td></tr>
              <tr>
                <td style="background:#f9f5f0;border-radius:10px;padding:16px 20px;">
                  <p style="margin:0 0 6px;color:#8a6a7a;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Your Date</p>
                  <p style="margin:0;color:#3c1e32;font-size:15px;font-weight:bold;">${guest.date}</p>
                </td>
              </tr>
            </table>
            <!-- Access code -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#e06b52;border-radius:12px;padding:20px 24px;text-align:center;">
                  <p style="margin:0 0 4px;color:rgba(255,255,255,.8);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Your Access Code</p>
                  <p style="margin:0;color:#ffffff;font-size:32px;letter-spacing:8px;font-family:'Courier New',monospace;font-weight:bold;">${guest.accessCode}</p>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:12px;font-family:Arial,sans-serif;">Keep this — you'll need it to check in on the day</p>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#3c1e32;font-size:15px;line-height:1.6;">
              See you at the bazaar! If you have questions, reply to this email or visit
              <a href="https://fiad.app" style="color:#e06b52;">fiad.app</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f5f0;padding:20px 40px;text-align:center;border-top:1px solid #ede8e3;">
            <p style="margin:0;color:#8a6a7a;font-size:12px;font-family:Arial,sans-serif;">
              © Forever in a Day · <a href="https://fiad.app" style="color:#8a6a7a;">fiad.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function inquiryEmailHtml(inq: {
  name: string;
  email: string;
  phone: string;
  eventType?: string;
  message?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New FIAD Inquiry</title></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#3c1e32;padding:24px 32px;">
            <p style="margin:0;color:#e8d5c0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">FIAD Admin</p>
            <h2 style="margin:6px 0 0;color:#f9f5f0;font-size:20px;font-weight:normal;">New event planning inquiry</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe6;"><strong style="color:#8a6a7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Name</strong><br/><span style="color:#3c1e32;font-size:15px;">${inq.name}</span></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe6;"><strong style="color:#8a6a7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Mobile</strong><br/><span style="color:#3c1e32;font-size:15px;">${inq.phone}</span></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe6;"><strong style="color:#8a6a7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Email</strong><br/><span style="color:#3c1e32;font-size:15px;">${inq.email}</span></td></tr>
              ${inq.eventType ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe6;"><strong style="color:#8a6a7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Event type</strong><br/><span style="color:#3c1e32;font-size:15px;">${inq.eventType}</span></td></tr>` : ''}
              ${inq.message ? `<tr><td style="padding:8px 0;"><strong style="color:#8a6a7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Message</strong><br/><span style="color:#3c1e32;font-size:15px;">${inq.message}</span></td></tr>` : ''}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f5f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#8a6a7a;font-size:12px;">FIAD · <a href="https://fiad.app" style="color:#8a6a7a;">fiad.app</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const results: Record<string, unknown> = {};

  // ── RSVP confirmation ──────────────────────────────────────────────────────
  if (body.type === 'rsvp_confirmation') {
    const { name, email, mobile, accessCode, venue, date } = body.guest ?? {};
    if (!email || !accessCode) return json({ error: 'missing_fields' }, 400);

    const firstName = (name ?? '').trim().split(' ')[0] || 'there';
    const shortVenue = (venue ?? 'the venue').split(',')[0]; // "Brittany Hotel"

    // Email to guest
    results.email = await sendEmail({
      to: email,
      subject: `You're on the list — FIAD Season 2 🎉`,
      html: rsvpEmailHtml({ name, accessCode, venue, date }),
    });

    // SMS to guest — keep under 160 chars
    if (mobile) {
      const smsText = `FIAD S2: You're in, ${firstName}! Access code: ${accessCode}. Venue: ${shortVenue}, ${date}. Keep this for event check-in. See you there!`;
      results.sms = await sendSms({ to: mobile, message: smsText });
    }
  }

  // ── Inquiry lead (admin alert) ─────────────────────────────────────────────
  else if (body.type === 'inquiry_lead') {
    const { name, email, phone, eventType, message } = body.inquiry ?? {};
    if (!name || !phone) return json({ error: 'missing_fields' }, 400);

    const adminEmail = Deno.env.get('FIAD_ADMIN_EMAIL') ?? 'admin@fiad.app';
    const adminMobile = Deno.env.get('FIAD_ADMIN_MOBILE');

    // Email to admin
    results.email = await sendEmail({
      to: adminEmail,
      subject: `New FIAD inquiry — ${name}`,
      html: inquiryEmailHtml({ name, email: email ?? '', phone, eventType, message }),
      fromName: 'FIAD Inquiries',
    });

    // SMS to admin (optional)
    if (adminMobile) {
      const parts = [`FIAD Inquiry: ${name}`, phone, eventType].filter(Boolean).join(' | ');
      results.sms = await sendSms({ to: adminMobile, message: parts });
    }
  }

  else {
    return json({ error: 'unknown_type' }, 400);
  }

  return json({ ok: true, results });
});
