import { supabase } from '../lib/supabase';
import type { RaffleEntry } from '../types';
import { db } from '../data/mockDb';

type Row = {
  id: string;
  event_id: string;
  guest_id: string;
  transaction_id: string;
  ticket_number: string;
  created_at: string;
};

const rowToEntry = (r: Row): RaffleEntry => ({
  id: r.id,
  eventId: r.event_id,
  guestId: r.guest_id,
  transactionId: r.transaction_id,
  ticketNumber: r.ticket_number,
  createdAt: r.created_at,
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

export const allActiveEntries = async (): Promise<RaffleEntry[]> => {
  // Prizes still live in the mock layer; cross-filter against mock.prizes.
  const drawnTickets = new Set(
    db.prizes
      .filter((p) => p.winningTicketNumber)
      .map((p) => p.winningTicketNumber as string),
  );
  const { data, error } = await supabase.from('raffle_entries').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToEntry).filter((e) => !drawnTickets.has(e.ticketNumber));
};
