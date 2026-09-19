import { supabase } from '../lib/supabase';
import { getSelectedEventId } from '../stores/eventStore';

export type CheckInRow = {
  id: string;
  guestId: string;
  eventId: string;
  checkedInAt: string;
};

export type AttendanceDay = {
  /** YYYY-MM-DD in Philippine time — the day the venue actually ran. */
  day: string;
  guests: number;
};

type Row = { id: string; guest_id: string; event_id: string; checked_in_at: string };

const rowToCheckIn = (r: Row): CheckInRow => ({
  id: r.id,
  guestId: r.guest_id,
  eventId: r.event_id,
  checkedInAt: r.checked_in_at,
});

/**
 * The append-only check-in log (0076). Separate from guests.checked_in_at,
 * which only answers "is this guest checked in right now" and gets cleared on
 * the daily reset — this survives it, so attendance history stays auditable.
 */
export const listCheckIns = async (eventId?: string): Promise<CheckInRow[]> => {
  const id = eventId ?? getSelectedEventId();
  const { data, error } = await supabase
    .from('check_ins')
    .select('id,guest_id,event_id,checked_in_at')
    .eq('event_id', id)
    .order('checked_in_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToCheckIn);
};

/**
 * Philippine calendar day for a timestamp. The venues run on PH time, so a
 * naive UTC date would roll the day over at 8am local — mid-morning, partway
 * through a fair.
 */
export const phDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

/** Unique guests per day, most recent first. */
export const attendanceByDay = (rows: CheckInRow[]): AttendanceDay[] => {
  const byDay = new Map<string, Set<string>>();
  for (const r of rows) {
    const d = phDay(r.checkedInAt);
    if (!byDay.has(d)) byDay.set(d, new Set());
    byDay.get(d)!.add(r.guestId);
  }
  return [...byDay.entries()]
    .map(([day, guests]) => ({ day, guests: guests.size }))
    .sort((a, b) => b.day.localeCompare(a.day));
};

/** Guests who appear on more than one day — returning attendees. */
export const returningGuestCount = (rows: CheckInRow[]): number => {
  const days = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!days.has(r.guestId)) days.set(r.guestId, new Set());
    days.get(r.guestId)!.add(phDay(r.checkedInAt));
  }
  return [...days.values()].filter((d) => d.size > 1).length;
};
