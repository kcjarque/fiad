// GHL signup webhook → creates a FIAD guest with a short access code, then
// writes the code + ticket URL back to the GHL contact's custom fields so the
// GHL email template can reference {{contact.fiad_access_code}} and
// {{contact.fiad_ticket_url}}.
//
// Required secrets:
//   GHL_WEBHOOK_SECRET   shared secret in X-FIAD-Secret header
//   GHL_PIT              Private Integration Token (Bearer)
//   GHL_LOCATION_ID      Sub-account / location ID
//   FIAD_APP_ORIGIN      e.g. https://fiad-seven.vercel.app
//
// Optional payload field: contact_id (GHL provides it; required for the
// write-back step — without it, the guest is still created but no GHL update).

import { createClient } from 'jsr:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

type Payload = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  contact_id?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const slugId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

const generateAccessCode = () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';
const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// Module-level cache of fieldKey → fieldId, populated on first GHL call.
const fieldIdCache = new Map<string, string>();

const loadFieldIds = async (pit: string, locationId: string): Promise<void> => {
  if (fieldIdCache.size > 0) return;
  const url = `${GHL_API}/locations/${locationId}/customFields?model=contact`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    },
  });
  if (!r.ok) {
    console.warn('GHL customFields fetch failed', r.status, await r.text().catch(() => ''));
    return;
  }
  const data = await r.json();
  // GHL returns { customFields: [{ id, fieldKey, name, ... }] }. The fieldKey
  // looks like "contact.fiad_access_code"; we key the cache by the bit after
  // the dot.
  const arr: { id: string; fieldKey?: string; name?: string }[] = data?.customFields ?? [];
  for (const f of arr) {
    const key = (f.fieldKey ?? '').split('.').pop();
    if (key) fieldIdCache.set(key, f.id);
  }
};

const updateGhlContact = async (
  pit: string,
  locationId: string,
  contactId: string,
  fields: Record<string, string>,
): Promise<boolean> => {
  await loadFieldIds(pit, locationId);
  const customFields: { id: string; field_value: string }[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const id = fieldIdCache.get(key);
    if (!id) {
      console.warn(`GHL custom field not found by key: ${key}`);
      continue;
    }
    customFields.push({ id, field_value: value });
  }
  if (customFields.length === 0) return false;
  const r = await fetch(`${GHL_API}/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customFields }),
  });
  if (!r.ok) {
    console.warn('GHL contact update failed', r.status, await r.text().catch(() => ''));
    return false;
  }
  return true;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = Deno.env.get('GHL_WEBHOOK_SECRET');
  if (!expected) return json({ error: 'server_misconfigured' }, 500);
  if (req.headers.get('x-fiad-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return json({ error: 'missing_email' }, 400);

  const name =
    body.full_name?.trim() ||
    body.name?.trim() ||
    [body.first_name, body.last_name].filter(Boolean).join(' ').trim() ||
    email;
  const mobile = body.phone?.trim() ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const origin = (req.headers.get('origin') || Deno.env.get('FIAD_APP_ORIGIN') || '')
    .replace(/\/+$/, '');

  const { data: existing, error: existingErr } = await supabase
    .from('guests')
    .select('id, name, email, qr_token, access_code')
    .ilike('email', email)
    .maybeSingle();
  if (existingErr) return json({ error: 'lookup_failed', detail: existingErr.message }, 500);

  let guestRecord: { id: string; name: string; email: string; qr_token: string };
  let accessCode: string;
  let created: boolean;

  if (existing) {
    created = false;
    accessCode = existing.access_code ?? '';
    guestRecord = {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      qr_token: existing.qr_token,
    };
  } else {
    created = true;
    accessCode = generateAccessCode();
    const newGuest = {
      id: slugId('guest'),
      event_id: ACTIVE_EVENT_ID,
      name,
      email,
      mobile,
      qr_token: `guest-qr-${Math.random().toString(36).slice(2, 12)}`,
      access_code: accessCode,
      registered_at: new Date().toISOString(),
    };
    const { error: insErr } = await supabase.from('guests').insert(newGuest);
    if (insErr) return json({ error: 'insert_failed', detail: insErr.message }, 500);
    guestRecord = {
      id: newGuest.id,
      name: newGuest.name,
      email: newGuest.email,
      qr_token: newGuest.qr_token,
    };
  }

  const ticketUrl = origin ? `${origin}/app/qr/${guestRecord.qr_token}` : '';
  const loginUrl = origin ? `${origin}/app/login` : '';

  // Write back to GHL contact custom fields (non-blocking on error).
  const pit = Deno.env.get('GHL_PIT');
  const locationId = Deno.env.get('GHL_LOCATION_ID');
  let ghlWriteback: 'ok' | 'skipped' | 'failed' = 'skipped';
  if (pit && locationId && body.contact_id && accessCode) {
    try {
      const ok = await updateGhlContact(pit, locationId, body.contact_id, {
        fiad_access_code: accessCode,
        fiad_ticket_url: ticketUrl,
      });
      ghlWriteback = ok ? 'ok' : 'failed';
    } catch (e) {
      console.warn('GHL write-back threw', (e as Error).message);
      ghlWriteback = 'failed';
    }
  }

  return json({
    ok: true,
    created,
    access_code: accessCode,
    guest: guestRecord,
    ticket_url: ticketUrl || null,
    login_url: loginUrl || null,
    ghl_writeback: ghlWriteback,
  });
});
