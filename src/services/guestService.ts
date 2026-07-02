import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { uid } from '../utils/id';
import { getSelectedEventId } from '../stores/eventStore';

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
  },
  // Which event this registration belongs to. Defaults to the currently
  // selected event (Season 1 on the live admin/booth browsers); the /rsvp
  // funnel passes the chosen venue's event id explicitly.
  eventId?: string,
): Promise<Guest> => {
  const targetEventId = eventId ?? getSelectedEventId();

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

export const getGuestByQr = async (qrToken: string): Promise<Guest | undefined> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

/**
 * Admin door check-in: look up the guest by their QR token and stamp
 * checked_in_at. Returns null if the QR doesn't match a guest. If they were
 * already checked in, the existing timestamp is preserved and flagged.
 */
export const checkInGuestByQr = async (
  qrToken: string,
): Promise<{ guest: Guest; alreadyCheckedIn: boolean } | null> => {
  const guest = await getGuestByQr(qrToken);
  if (!guest) return null;
  if (guest.checkedInAt) return { guest, alreadyCheckedIn: true };
  const at = new Date().toISOString();
  const { error } = await supabase.from('guests').update({ checked_in_at: at }).eq('id', guest.id);
  if (error) throw error;
  return { guest: { ...guest, checkedInAt: at }, alreadyCheckedIn: false };
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

export const listGuests = async (): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', getSelectedEventId())
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGuest);
};
