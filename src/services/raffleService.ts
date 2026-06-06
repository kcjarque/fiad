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

export const allActiveEntries = async (): Promise<RaffleEntry[]> => {
  const { data: wonRows } = await supabase
    .from('prizes')
    .select('winning_ticket_number')
    .not('winning_ticket_number', 'is', null);
  const drawnTickets = new Set(
    (wonRows ?? []).map((r) => r.winning_ticket_number as string).filter(Boolean),
  );
  const { data, error } = await supabase.from('raffle_entries').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToEntry).filter((e) => !drawnTickets.has(e.ticketNumber));
};
