import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { uid } from '../utils/id';
import { getSelectedEventId } from '../stores/eventStore';
import { phDay } from './checkInService';

type Row = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  mobile: string;
  qr_token: string;
  registered_at: string;
  access_code?: string | null;
  preferred_day?: string | null;
  checked_in_at?: string | null;
  referred_by?: string | null;
  invited_friend?: string | null;
};

const rowToGuest = (r: Row): Guest => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  email: r.email,
  mobile: r.mobile,
  qrToken: r.qr_token,
  registeredAt: r.registered_at,
  accessCode: r.access_code ?? undefined,
  preferredDay: r.preferred_day ?? undefined,
  checkedInAt: r.checked_in_at ?? undefined,
  referredBy: r.referred_by ?? undefined,
  invitedFriend: r.invited_friend ?? undefined,
});

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const randomAccessCode = (): string =>
  Array.from({ length: 6 }, () =>
    CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join('');

/**
 * Generate a 6-char access code that isn't already in use. 36^6 ≈ 2.2B
 * keyspace — collisions over a few hundred guests are vanishingly rare,
 * but we still check + retry to be safe.
 */
const generateUniqueAccessCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomAccessCode();
    const { data } = await supabase
      .from('guests')
      .select('id')
      .eq('access_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate a unique access code');
};

export const registerGuest = async (
  data: {
    name: string;
    email: string;
    mobile: string;
    /** Day 1 / Day 2 choice from the RSVP funnel. */
    preferredDay?: string;
    /** Optional referral fields captured at the end of the RSVP funnel. */
    referredBy?: string;
    invitedFriend?: string;
    /** Solved Turnstile token, when the captcha is configured. */
    captchaToken?: string;
    /** Honeypot value. Always '' from a human — the field is hidden. */
    website?: string;
  },
  // Which event this registration belongs to. Defaults to the currently
  // selected event (Season 1 on the live admin/booth browsers); the /rsvp
  // funnel passes the chosen venue's event id explicitly.
  eventId?: string,
): Promise<Guest> => {
  const targetEventId = eventId ?? getSelectedEventId();

  // Registration goes through the register-guest edge function, which runs as
  // the service role behind a honeypot, a per-IP rate limit and Turnstile.
  // Writing to `guests` straight from the browser is what let four separate
  // bot waves in, so anon's INSERT is revoked (0090) and this is the only door.
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    'register-guest',
    {
      body: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        eventId: targetEventId,
        preferredDay: data.preferredDay,
        referredBy: data.referredBy,
        invitedFriend: data.invitedFriend,
        captchaToken: data.captchaToken,
        website: data.website,
      },
    },
  );
  if (!fnError) {
    const res = fnData as { ok?: boolean; guest?: Row } | null;
    if (res?.ok && res.guest) return rowToGuest(res.guest);
  } else {
    const status =
      (fnError as { context?: { status?: number } }).context?.status ??
      (fnError as { status?: number }).status;
    // A refusal is a real answer, not a reason to fall back — falling back
    // would hand the bot exactly the open endpoint the gate exists to close.
    if (status === 403) throw new Error('Please complete the verification and try again.');
    if (status === 429) {
      throw new Error('Too many sign-ups from this connection. Please try again shortly.');
    }
    if (status === 400) throw new Error('Please check the name, email and venue and try again.');
    // Anything else (function not deployed yet, cold-start failure, network)
    // falls through to the direct insert below, which still works until 0090
    // is applied. That keeps registration alive during the rollout.
  }

  // ── Idempotency: same email already registered FOR THIS EVENT → return
  // the existing account instead of creating a second row. Scoped per-event
  // so the same person can register for both Season 1 and Season 2.
  const existing = await findGuestByEmail(data.email, targetEventId);
  if (existing) {
    const patch: Record<string, string> = {};
    let merged = existing;
    // Backfill an access code for rows created before that feature landed.
    if (!existing.accessCode) {
      const code = await generateUniqueAccessCode();
      patch.access_code = code;
      merged = { ...merged, accessCode: code };
    }
    // Let a returning RSVP update their preferred day.
    if (data.preferredDay && existing.preferredDay !== data.preferredDay) {
      patch.preferred_day = data.preferredDay;
      merged = { ...merged, preferredDay: data.preferredDay };
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from('guests').update(patch).eq('id', existing.id);
    }
    return merged;
  }

  // ── Truly new guest. Auto-assign a unique 6-char access code so they
  // can sign in on a different device with email + code.
  const accessCode = await generateUniqueAccessCode();
  const guest: Guest = {
    id: uid('guest'),
    name: data.name.trim(),
    email: data.email.trim(),
    mobile: data.mobile.trim(),
    qrToken: `guest-qr-${Math.random().toString(36).slice(2, 12)}`,
    registeredAt: new Date().toISOString(),
    eventId: targetEventId,
    accessCode,
    preferredDay: data.preferredDay,
  };
  const { error } = await supabase.from('guests').insert({
    id: guest.id,
    event_id: guest.eventId,
    name: guest.name,
    email: guest.email,
    mobile: guest.mobile,
    qr_token: guest.qrToken,
    registered_at: guest.registeredAt,
    access_code: accessCode,
    preferred_day: guest.preferredDay ?? null,
    referred_by: data.referredBy?.trim() || null,
    invited_friend: data.invitedFriend?.trim() || null,
  });
  if (error) {
    // ── Race: two concurrent registrations with the same email both passed
    // findGuestByEmail. Once the dashboard SQL below adds a unique index
    // on lower(email), the second insert returns 23505 and we recover by
    // returning whichever row won the race.
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      const winner = await findGuestByEmail(data.email, targetEventId);
      if (winner) return winner;
    }
    throw error;
  }
  return guest;
};

export const getGuest = async (id: string): Promise<Guest | undefined> => {
  const { data, error } = await supabase.from('guests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

/** Admin: correct a wrongly-entered guest name. */
export const updateGuestName = async (id: string, name: string): Promise<void> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name cannot be empty');
  const { error } = await supabase.from('guests').update({ name: trimmed }).eq('id', id);
  if (error) throw error;
};

/**
 * Admin: delete a guest (e.g. an accidental duplicate). Cascades to that
 * guest's raffle entries, transactions, and passport stamps via the FK
 * on-delete-cascade rules.
 *
 * Uses .select() so we can detect the case where RLS silently blocks the
 * delete (returns 0 rows) and surface a real error instead of a no-op.
 */
export const deleteGuest = async (id: string): Promise<void> => {
  const { data, error } = await supabase.from('guests').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      'Delete was blocked by the database (missing delete permission). Ask the developer to add the anon_delete_guests policy.',
    );
  }
};

/**
 * Scanners hand back whatever the QR encodes, and not every guest QR carries a
 * bare token. The transactional email encodes the raw token, but the GHL
 * webhook hands out a ticket URL (`<origin>/app/qr/<token>`), so a guest who
 * arrived that way presents a full URL at the door and the exact-match lookup
 * misses — they show up "not recognized" while sitting in the guest list.
 * Cameras also pick up stray whitespace or a trailing newline.
 *
 * Normalise to the token: trim, drop any query/hash, and take the last path
 * segment. A bare token passes through untouched.
 */
const normalizeQrToken = (raw: string): string => {
  let v = raw.trim();
  if (!v) return v;
  v = v.split(/[?#]/)[0];
  if (v.includes('/')) {
    const parts = v.split('/').filter(Boolean);
    v = parts[parts.length - 1] ?? v;
  }
  return v.trim();
};

export const getGuestByQr = async (qrToken: string): Promise<Guest | undefined> => {
  const token = normalizeQrToken(qrToken);
  if (!token) return undefined;

  let { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle();
  if (error) throw error;
  if (data) return rowToGuest(data);

  /**
   * Fall back to the access code. The manual "Enter code" field at the door
   * feeds into this lookup, and the only code a guest can actually read out is
   * the 6-character access code from their email — the qr_token is never shown
   * anywhere in full (the ticket prints just the last 10 characters, upper
   * cased, so it can never match). Staff were typing the access code and
   * getting "QR not recognized".
   *
   * Unambiguous by construction: access codes are 6 chars of [A-Z0-9] and
   * unique (verified across all 993 issued), while qr_tokens are 19 chars of
   * [a-z0-9-]. The two can never collide, and the shape guard below means a
   * real token is never re-tried as a code.
   */
  const code = token.toUpperCase();

  // 6-char access code (printed in the confirmation email).
  if (/^[A-Z0-9]{6}$/.test(code)) {
    ({ data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('access_code', code)
      .maybeSingle());
    if (error) throw error;
    if (data) return rowToGuest(data);
  }

  // 10-char ticket code. The in-app/printed ticket shows the qr_token's LAST 10
  // chars, upper-cased (e.g. "ZTK20EKK5W" for guest-qr-ztk20ekk5w) — that's the
  // code a guest actually reads off their ticket at the booth, so match it
  // against the token's suffix. 10 random chars make a collision effectively
  // impossible, so maybeSingle is safe.
  if (/^[A-Z0-9]{10}$/.test(code)) {
    ({ data, error } = await supabase
      .from('guests')
      .select('*')
      .ilike('qr_token', `%${code.toLowerCase()}`)
      .maybeSingle());
    if (error) throw error;
    if (data) return rowToGuest(data);
  }

  return undefined;
};

/**
 * Admin door check-in: look up the guest by their QR token and stamp
 * checked_in_at. Returns null if the QR doesn't match a guest. If they were
 * already checked in, the existing timestamp is preserved and flagged.
 */
/**
 * Has this guest already been checked in TODAY (Philippine time)?
 *
 * A two-day venue means a Day 1 guest who goes home and comes back is a fresh
 * arrival, not a duplicate scan — they re-check-in, they do not re-register.
 * Comparing on the PH calendar day rather than "is checked_in_at set at all"
 * is what makes the second day work: the old test saw yesterday's timestamp,
 * refused the scan, and so never fired the log_check_in trigger (0076), which
 * left the returner missing from Day 2 attendance entirely.
 *
 * Within a single day it still does its original job of rejecting a double
 * scan at the door.
 */
export type CheckInResult = {
  guest: Guest;
  /** Already scanned in earlier TODAY — a duplicate scan, not a new arrival. */
  alreadyCheckedIn: boolean;
  /** Last attended on an earlier day: a Day 1 guest coming back for Day 2. */
  returning: boolean;
};

export const checkedInToday = (checkedInAt?: string): boolean =>
  !!checkedInAt && phDay(checkedInAt) === phDay(new Date().toISOString());

export const checkInGuestByQr = async (
  qrToken: string,
): Promise<CheckInResult | null> => {
  const guest = await getGuestByQr(qrToken);
  if (!guest) return null;
  if (checkedInToday(guest.checkedInAt)) return { guest, alreadyCheckedIn: true, returning: false };
  // Any earlier check-in was on a previous day, so this is a returning guest
  // arriving again — worth telling the door, which otherwise cannot tell a
  // returner from a first-timer.
  const returning = !!guest.checkedInAt;
  const at = new Date().toISOString();
  const { error } = await supabase.from('guests').update({ checked_in_at: at }).eq('id', guest.id);
  if (error) throw error;
  return { guest: { ...guest, checkedInAt: at }, alreadyCheckedIn: false, returning };
};

/**
 * Manual check-in fallback for the door: a dead phone, a cracked screen or a
 * QR that won't scan in bad lighting must not leave a real guest ineligible
 * for the raffle, since draw_prize requires checked_in_at (0060).
 * Searches the selected event by name, email or access code.
 */
export const searchGuestsForCheckIn = async (query: string): Promise<Guest[]> => {
  const q = query.trim();
  if (q.length < 2) return [];
  // Escape LIKE metacharacters so a query containing % or _ can't wildcard.
  const esc = q.replace(/[\\%_]/g, (c) => '\\' + c);
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', getSelectedEventId())
    .or(`name.ilike.%${esc}%,email.ilike.%${esc}%,access_code.ilike.${esc}`)
    .order('name')
    .limit(25);
  if (error) throw error;
  return (data ?? []).map(rowToGuest);
};

/** Check a guest in by id — the manual counterpart to checkInGuestByQr. */
export const checkInGuestById = async (
  guestId: string,
): Promise<CheckInResult | null> => {
  const { data, error } = await supabase.from('guests').select('*').eq('id', guestId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const guest = rowToGuest(data);
  if (checkedInToday(guest.checkedInAt)) return { guest, alreadyCheckedIn: true, returning: false };
  const returning = !!guest.checkedInAt;
  const at = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('guests')
    .update({ checked_in_at: at })
    .eq('id', guestId);
  if (upErr) throw upErr;
  return { guest: { ...guest, checkedInAt: at }, alreadyCheckedIn: false, returning };
};

export const findGuestByEmail = async (
  email: string,
  eventId: string = getSelectedEventId(),
): Promise<Guest | undefined> => {
  // Escape LIKE metacharacters so an address containing % or _ can't match a
  // different guest's email as a wildcard.
  const e = email.trim().toLowerCase().replace(/[\\%_]/g, (c) => '\\' + c);
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .ilike('email', e)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

export const loginGuestWithAccessCode = async (
  email: string,
  code: string,
): Promise<Guest> => {
  const { data, error } = await supabase.functions.invoke('guest-login', {
    body: { email: email.trim().toLowerCase(), code: code.trim().toUpperCase() },
  });
  if (error) {
    // supabase-js v2: FunctionsHttpError wraps status in error.context.status
    const status =
      (error as { context?: { status?: number } }).context?.status ??
      (error as { status?: number }).status;
    if (status === 401 || status === 400) throw new Error('Invalid email or access code.');
    throw new Error('Sign-in failed. Please try again.');
  }
  if (!data?.ok || !data.guest) throw new Error('Invalid email or access code.');
  return rowToGuest(data.guest);
};

export const listGuests = async (): Promise<Guest[]> =>
  listGuestsForEvents([getSelectedEventId()]);

/**
 * Guests across several events. The cross-venue grand draw passes its pool so
 * winner names and the stage idle reel resolve for every venue in it.
 * Kept separate from listGuests() so bare `queryFn: listGuests` references
 * keep working — react-query would otherwise pass its context object here.
 */
export const listGuestsForEvents = async (eventIds: string[]): Promise<Guest[]> => {
  const ids = eventIds.length ? eventIds : [getSelectedEventId()];
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .in('event_id', ids)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGuest);
};
