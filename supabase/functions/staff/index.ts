import { createClient } from 'jsr:@supabase/supabase-js@2';

// Gated supplier portal. Two modes:
//   login    { username, password }  -> verifies against staff_accounts, issues a session token
//   contacts { token }               -> returns ONLY name/email/mobile/venue for the account's
//                                        scoped events, read with the service role.
// staff_accounts is NOT anon-readable — all access flows through this function,
// so a supplier only ever receives their own scoped contacts.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const VENUE: Record<string, string> = {
  evt_fiad_s2_brittany: 'Brittany Hotel · BGC',
  evt_fiad_s2_mella: 'Mella Hotel · Las Piñas',
  evt_fiad_dec25: 'Season 1 · Taguig',
};

const isTest = (name: string, email: string) => {
  const e = (email || '').toLowerCase();
  const n = (name || '').toLowerCase();
  return (
    e.endsWith('.test') ||
    e.includes('@example.com') ||
    e.includes('fiad.test') ||
    n.startsWith('test ') ||
    n.includes('test user')
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const mode = body.mode;

  if (mode === 'login') {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!username || !password) return json({ ok: false, error: 'Missing username or password.' }, 400);
    const { data: acc } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('username', username)
      .eq('active', true)
      .maybeSingle();
    if (!acc) return json({ ok: false, error: 'Invalid username or password.' }, 401);
    const hash = await sha256Hex(`${acc.salt}:${password}`);
    if (hash !== acc.password_hash) return json({ ok: false, error: 'Invalid username or password.' }, 401);
    const token = crypto.randomUUID();
    await supabase.from('staff_accounts').update({ session_token: token }).eq('id', acc.id);
    return json({ ok: true, token, businessName: acc.business_name });
  }

  if (mode === 'contacts') {
    const token = String(body.token || '');
    if (!token) return json({ ok: false, error: 'Not signed in.' }, 401);
    const { data: acc } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('session_token', token)
      .eq('active', true)
      .maybeSingle();
    if (!acc) return json({ ok: false, error: 'Session expired — please sign in again.' }, 401);
    const { data: guests, error } = await supabase
      .from('guests')
      .select('name, email, mobile, event_id')
      .in('event_id', acc.event_ids)
      .order('name', { ascending: true });
    if (error) return json({ ok: false, error: error.message }, 500);

    // Survey responses — the post-registration "need help organizing your
    // event?" form (event_inquiries). Matched to a registrant by email; the
    // most recent response wins.
    const { data: inquiries } = await supabase
      .from('event_inquiries')
      .select('email, event_type, partner_name, event_date, message, created_at')
      .in('event_id', acc.event_ids)
      .order('created_at', { ascending: true });
    const survey = new Map<
      string,
      { lookingFor: string; partnerName: string; eventDate: string; note: string }
    >();
    for (const q of inquiries || []) {
      const key = String(q.email || '').toLowerCase().trim();
      if (!key) continue;
      survey.set(key, {
        lookingFor: q.event_type || '',
        partnerName: q.partner_name || '',
        eventDate: q.event_date || '',
        note: q.message || '',
      });
    }

    const contacts = (guests || [])
      .filter((g: { name: string; email: string }) => !isTest(g.name, g.email))
      .map((g: { name: string; email: string; mobile: string; event_id: string }) => {
        const s = survey.get(String(g.email || '').toLowerCase().trim());
        return {
          name: g.name || '',
          email: g.email || '',
          mobile: g.mobile || '',
          venue: VENUE[g.event_id] || g.event_id,
          lookingFor: s?.lookingFor || '',
          partnerName: s?.partnerName || '',
          eventDate: s?.eventDate || '',
          note: s?.note || '',
        };
      });
    const withSurvey = contacts.filter(
      (c) => c.lookingFor || c.partnerName || c.eventDate || c.note,
    ).length;
    return json({ ok: true, businessName: acc.business_name, count: contacts.length, withSurvey, contacts });
  }

  return json({ ok: false, error: 'Unknown request.' }, 400);
});
