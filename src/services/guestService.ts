import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { uid } from '../utils/id';
import { getActiveEvent } from './eventService';

type Row = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  mobile: string;
  qr_token: string;
  registered_at: string;
  access_code?: string | null;
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

export const registerGuest = async (data: {
  name: string;
  email: string;
  mobile: string;
}): Promise<Guest> => {
  // ── Idempotency: same email already registered → return the existing
  // account instead of creating a second row. This is the root cause of the
  // "Alex Gonzales × 3" duplicate-guest bug — a tap-Register-twice on the
  // form (or a confused guest re-submitting) would otherwise create a new
  // row each time.
  const existing = await findGuestByEmail(data.email);
  if (existing) {
    // If the existing row is missing an access code (happens for rows
    // created before this fix landed), backfill it now so the returning
    // guest still gets a usable code.
    if (!existing.accessCode) {
      const code = await generateUniqueAccessCode();
      await supabase.from('guests').update({ access_code: code }).eq('id', existing.id);
      return { ...existing, accessCode: code };
    }
    return existing;
  }

  // ── Truly new guest. Auto-assign a unique 6-char access code so they
  // can sign in on a different device with email + code.
  const event = await getActiveEvent();
  const accessCode = await generateUniqueAccessCode();
  const guest: Guest = {
    id: uid('guest'),
    name: data.name.trim(),
    email: data.email.trim(),
    mobile: data.mobile.trim(),
    qrToken: `guest-qr-${Math.random().toString(36).slice(2, 12)}`,
    registeredAt: new Date().toISOString(),
    eventId: event.id,
    accessCode,
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
  });
  if (error) {
    // ── Race: two concurrent registrations with the same email both passed
    // findGuestByEmail. Once the dashboard SQL below adds a unique index
    // on lower(email), the second insert returns 23505 and we recover by
    // returning whichever row won the race.
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      const winner = await findGuestByEmail(data.email);
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

export const findGuestByEmail = async (email: string): Promise<Guest | undefined> => {
  const e = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('guests')
    .select('*')
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
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGuest);
};
