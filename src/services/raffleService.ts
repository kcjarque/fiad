import { supabase } from '../lib/supabase';
import type { RaffleEntry } from '../types';

type Row = {
  id: string;
  event_id: string;
  guest_id: string;
  transaction_id: string | null;
  ticket_number: string;
  created_at: string;
  is_complimentary?: boolean;
};

const rowToEntry = (r: Row): RaffleEntry => ({
  id: r.id,
  eventId: r.event_id,
  guestId: r.guest_id,
  transactionId: r.transaction_id,
  ticketNumber: r.ticket_number,
  createdAt: r.created_at,
  isComplimentary: r.is_complimentary ?? false,
});

export const entriesForGuest = async (guestId: string): Promise<RaffleEntry[]> => {
  const { data, error } = await supabase
    .from('raffle_entries')
    .select('*')
    .eq('guest_id', guestId);
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
};

export const totalEntries = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('raffle_entries')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
};

/**
 * Every raffle entry, paginated. PostgREST caps a single response at 1000
 * rows, so once the pool grows past 1000 a plain select('*') silently drops
 * the rest — page through with .range() until we've fetched everything.
 */
export const allEntries = async (): Promise<RaffleEntry[]> => {
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('raffle_entries')
      .select('id,event_id,guest_id,transaction_id,ticket_number,created_at,is_complimentary')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < PAGE) break; // last page
  }
  return rows.map(rowToEntry);
};

/** Tickets that have already won a prize (so hourly draws can exclude them). */
export const wonTicketNumbers = async (): Promise<Set<string>> => {
  const { data } = await supabase
    .from('prizes')
    .select('winning_ticket_number')
    .not('winning_ticket_number', 'is', null);
  return new Set((data ?? []).map((r) => r.winning_ticket_number as string).filter(Boolean));
};

export const allActiveEntries = async (): Promise<RaffleEntry[]> => {
  const [entries, drawnTickets] = await Promise.all([allEntries(), wonTicketNumbers()]);
  return entries.filter((e) => !drawnTickets.has(e.ticketNumber));
};
