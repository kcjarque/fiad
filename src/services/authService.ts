import { supabase } from '../lib/supabase';
import type { Admin, Store } from '../types';

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

export const loginAdmin = async (email: string, passcode: string): Promise<Admin | null> => {
  const e = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', e)
    .eq('passcode', passcode)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
};

export const loginStore = async (storeId: string, passcode: string): Promise<Store | null> => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .eq('passcode', passcode)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStore(data) : null;
};

// NOT event-scoped: the booth-login picker must work regardless of which event
// the browser happens to have selected (a shared device left on Season 2 would
// otherwise show an empty dropdown and lock suppliers out). Booth ids/passcodes
// are unique across events, so listing all is safe.
export const listStoresForLogin = async (): Promise<Store[]> => {
  const { data, error } = await supabase.from('stores').select('*').order('booth_number');
  if (error) throw error;
  return (data ?? []).map(rowToStore);
};
