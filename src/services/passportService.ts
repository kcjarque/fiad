import { supabase } from '../lib/supabase';
import type { PassportStamp } from '../types';
import { uid } from '../utils/id';
import { getSelectedEventId } from '../stores/eventStore';

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

/**
 * Every (storeId, guestId) stamp pair, paginated. Used by the supplier
 * sales report to count scans per booth + list who scanned.
 */
export const allStamps = async (): Promise<{ storeId: string; guestId: string }[]> => {
  const eventId = getSelectedEventId();
  const PAGE = 1000;
  const out: { storeId: string; guestId: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('passport_stamps')
      .select('store_id,guest_id')
      .eq('event_id', eventId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const r of batch) out.push({ storeId: r.store_id as string, guestId: r.guest_id as string });
    if (batch.length < PAGE) break;
  }
  return out;
};

/**
 * Distinct guests who have stamped at least one booth, plus the total
 * stamp count. Used by the dashboard as the "attended + used the app"
 * signal (a stamp requires being logged in AND physically scanning a
 * booth QR). Paginated so it stays accurate past 1000 stamps.
 */
export const stampActivity = async (): Promise<{ guestIds: Set<string>; totalStamps: number }> => {
  const eventId = getSelectedEventId();
  const PAGE = 1000;
  const guestIds = new Set<string>();
  let total = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('passport_stamps')
      .select('guest_id')
      .eq('event_id', eventId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const r of batch) guestIds.add(r.guest_id as string);
    total += batch.length;
    if (batch.length < PAGE) break;
  }
  return { guestIds, totalStamps: total };
};

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
    event_id: getSelectedEventId(),
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
