import { supabase } from '../lib/supabase';
import type { Admin, Store } from '../types';
import { S2_VENUES } from '../stores/eventStore';

const rowToStore = (r: {
  id: string;
  event_id: string;
  name: string;
  category: string;
  description: string;
  logo_url: string;
  image_url: string | null;
  booth_number: string;
  qr_token: string;
  passcode: string;
  email?: string | null;
  contact?: string | null;
  social_media?: string | null;
}): Store => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  category: r.category,
  description: r.description,
  logoUrl: r.logo_url,
  imageUrl: r.image_url ?? undefined,
  boothNumber: r.booth_number,
  qrToken: r.qr_token,
  passcode: r.passcode,
  email: r.email ?? undefined,
  contact: r.contact ?? undefined,
  socialMedia: r.social_media ?? undefined,
});

// A dropped/slow connection makes our 15s fetch wrapper abort the request;
// Safari surfaces that as the cryptic "AbortError: Fetch is aborted". Login is
// a pure read, so it's safe to retry once, and to show a plain-language message
// if the connection really is down rather than leaking the abort text.
const isTransient = (e: unknown): boolean => {
  const err = e as { name?: string; message?: string };
  const msg = (err?.message ?? '').toLowerCase();
  return err?.name === 'AbortError' || /abort|timed out|timeout|failed to fetch|load failed|network/.test(msg);
};

export const loginAdmin = async (email: string, passcode: string): Promise<Admin | null> => {
  const e = email.toLowerCase().trim();
  const run = async (): Promise<Admin | null> => {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', e)
      .eq('passcode', passcode)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  };
  try {
    return await run();
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, 500));
    try {
      return await run();
    } catch (err2) {
      if (isTransient(err2)) throw new Error('Could not reach the server. Check your connection and try again.');
      throw err2;
    }
  }
};

/**
 * Fold the characters vendors actually confuse when reading a code off a
 * printout or a phone screen.
 *
 * generatePasscode() deliberately skips 0/O/1/I/L, but 23 live codes predate
 * it and were imported with those characters in them — BA 3 is `8QTMO0`,
 * which carries both an O and a zero, and Mella Hotel is `9ZJF7O`, ending in
 * a letter O. An exact match turns every mistype into a flat "invalid".
 *
 * Folding both sides is collision-free across all live Season 2 codes
 * (verified against production: the only duplicate group is six archived
 * Season 1 rows still on the `1234` default, and those are not in the S2
 * login picker). So this can only ever turn a would-be failure into the
 * correct booth — it never maps one supplier's code onto another's.
 */
const foldLookalikes = (code: string): string =>
  code.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');

export const loginStore = async (storeId: string, passcode: string): Promise<Store | null> => {
  const run = async (): Promise<Store | null> => {
    // Fetched by id and compared here rather than with .eq('passcode', …) so
    // the fold can apply. No new exposure: anon already holds SELECT on
    // stores (policy anon_select_stores, 0005), so the column was readable
    // either way — the comparison just moved.
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const stored = String((data as { passcode?: string }).passcode ?? '');
    if (!stored) return null;
    return foldLookalikes(stored) === foldLookalikes(passcode) ? rowToStore(data) : null;
  };
  try {
    return await run();
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, 500));
    try {
      return await run();
    } catch (err2) {
      if (isTransient(err2)) throw new Error('Could not reach the server. Check your connection and try again.');
      throw err2;
    }
  }
};

// Season 2 only: the booth-login picker lists suppliers from the two live
// Season 2 venues (Season 1 is archived and dropped from the list). Scoped to
// the S2 events rather than the browser's selected event so the picker works
// regardless of which venue the device is on. Booth ids/passcodes are unique
// across events, so listing both venues together is safe.
const S2_EVENT_IDS = S2_VENUES.map((v) => v.id);
export const listStoresForLogin = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .in('event_id', S2_EVENT_IDS)
    .order('booth_number');
  if (error) throw error;
  return (data ?? []).map(rowToStore);
};
