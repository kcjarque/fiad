import { supabase } from '../lib/supabase';
import type { EventInfo } from '../types';

const rowToEvent = (r: {
  id: string;
  name: string;
  date: string;
  venue: string;
  raffle_rate: number;
  daily_cap_per_guest_per_store: number;
  status: 'draft' | 'live' | 'ended';
}): EventInfo => ({
  id: r.id,
  name: r.name,
  date: r.date,
  venue: r.venue,
  raffleRate: r.raffle_rate,
  dailyCapPerGuestPerStore: r.daily_cap_per_guest_per_store,
  status: r.status,
});

export const getActiveEvent = async (): Promise<EventInfo> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return rowToEvent(data);
};

export const updateEvent = async (patch: Partial<EventInfo>): Promise<EventInfo> => {
  const event = await getActiveEvent();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.venue !== undefined) dbPatch.venue = patch.venue;
  if (patch.raffleRate !== undefined) dbPatch.raffle_rate = patch.raffleRate;
  if (patch.dailyCapPerGuestPerStore !== undefined)
    dbPatch.daily_cap_per_guest_per_store = patch.dailyCapPerGuestPerStore;
  if (patch.status !== undefined) dbPatch.status = patch.status;

  const { data, error } = await supabase
    .from('events')
    .update(dbPatch)
    .eq('id', event.id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToEvent(data);
};
