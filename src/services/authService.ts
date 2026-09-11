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

export const loginStore = async (storeId: string, passcode: string): Promise<Store | null> => {
  const run = async (): Promise<Store | null> => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('passcode', passcode)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToStore(data) : null;
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
