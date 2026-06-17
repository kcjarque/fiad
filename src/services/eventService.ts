import { supabase } from '../lib/supabase';
import type { EventInfo } from '../types';
import { getSelectedEventId } from '../stores/eventStore';

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

/** Fetch a single event by id (used by the public RSVP funnel for Season 2). */
export const getEventById = async (id: string): Promise<EventInfo | undefined> => {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToEvent(data) : undefined;
};

/** Every event, newest first — used by the admin event switcher. */
export const listEvents = async (): Promise<EventInfo[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToEvent);
};

/**
 * The "current" event = whichever event this browser has selected
 * (multi-tenant). Defaults to Season 1, so live/guest behavior is unchanged.
 * Falls back to the LIVE event if the selected id isn't found (e.g. stale
 * localStorage pointing at a deleted event) — never to a future/draft event,
 * so guest-facing pages can't accidentally render a draft Season 2.
 */
export const getActiveEvent = async (): Promise<EventInfo> => {
  const selectedId = getSelectedEventId();
  const { data: selected, error: selErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', selectedId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (selected) return rowToEvent(selected);

  // Fallback 1: the live event.
  const { data: live, error: liveErr } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'live')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (liveErr) throw liveErr;
  if (live) return rowToEvent(live);

  // Fallback 2 (no live event exists): newest event by date.
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
