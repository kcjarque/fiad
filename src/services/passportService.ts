import { supabase } from '../lib/supabase';
import type { PassportStamp } from '../types';
import { uid } from '../utils/id';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

type Row = {
  id: string;
  guest_id: string;
  store_id: string;
  event_id: string;
  stamped_at: string;
};

const rowToStamp = (r: Row): PassportStamp => ({
  id: r.id,
  guestId: r.guest_id,
  storeId: r.store_id,
  eventId: r.event_id,
  stampedAt: r.stamped_at,
});

export const stampsForGuest = async (guestId: string): Promise<PassportStamp[]> => {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('*')
    .eq('guest_id', guestId);
  if (error) throw error;
  return (data ?? []).map(rowToStamp);
};

export const hasStamp = async (guestId: string, storeId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from('passport_stamps')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', guestId)
    .eq('store_id', storeId);
  if (error) throw error;
  return (count ?? 0) > 0;
};

export const stampPassport = async (
  guestId: string,
  storeId: string,
): Promise<PassportStamp | { alreadyStamped: true }> => {
  const stamp = {
    id: uid('stamp'),
    guest_id: guestId,
    store_id: storeId,
    event_id: ACTIVE_EVENT_ID,
    stamped_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('passport_stamps')
    .insert(stamp)
    .select('*')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') return { alreadyStamped: true };
    throw error;
  }
  return data ? rowToStamp(data) : { alreadyStamped: true };
};
