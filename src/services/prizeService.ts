import { supabase } from '../lib/supabase';
import type { Prize } from '../types';
import { uid } from '../utils/id';
import { HIDDEN_PRIZE_IDS } from '../constants/hidden';
import { getSelectedEventId } from '../stores/eventStore';

type Row = {
  id: string;
  event_id: string;
  name: string;
  description: string;
  image_url: string;
  quantity: number;
  drawn_at: string | null;
  winner_guest_id: string | null;
  winning_ticket_number: string | null;
  sponsored_by_store_id: string | null;
};

const rowToPrize = (r: Row): Prize => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  description: r.description,
  imageUrl: r.image_url,
  quantity: r.quantity,
  drawnAt: r.drawn_at ?? undefined,
  winnerGuestId: r.winner_guest_id ?? undefined,
  winningTicketNumber: r.winning_ticket_number ?? undefined,
  sponsoredByStoreId: r.sponsored_by_store_id ?? undefined,
});

export const listPrizes = async (): Promise<Prize[]> => {
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .eq('event_id', getSelectedEventId())
    .order('id');
  if (error) throw error;
  // Drop hidden prizes per src/constants/hidden.ts. The position-based
  // raffle schedule naturally compacts the remaining slots so there are
  // no empty hours.
  return (data ?? [])
    .filter((r) => !HIDDEN_PRIZE_IDS.has(r.id))
    .map(rowToPrize);
};

export const createPrize = async (p: Omit<Prize, 'id' | 'eventId'>): Promise<Prize> => {
  const row: Row = {
    id: uid('prize'),
    event_id: getSelectedEventId(),
    name: p.name,
    description: p.description,
    image_url: p.imageUrl,
    quantity: p.quantity,
    drawn_at: p.drawnAt ?? null,
    winner_guest_id: p.winnerGuestId ?? null,
    winning_ticket_number: p.winningTicketNumber ?? null,
    sponsored_by_store_id: p.sponsoredByStoreId ?? null,
  };
  const { error } = await supabase.from('prizes').insert(row);
  if (error) throw error;
  return rowToPrize(row);
};

export const updatePrize = async (id: string, patch: Partial<Prize>): Promise<Prize | undefined> => {
  const dbPatch: Partial<Row> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  if (patch.quantity !== undefined) dbPatch.quantity = patch.quantity;
  if (patch.drawnAt !== undefined) dbPatch.drawn_at = patch.drawnAt ?? null;
  if (patch.winnerGuestId !== undefined) dbPatch.winner_guest_id = patch.winnerGuestId ?? null;
  if (patch.winningTicketNumber !== undefined) dbPatch.winning_ticket_number = patch.winningTicketNumber ?? null;
  if (patch.sponsoredByStoreId !== undefined) dbPatch.sponsored_by_store_id = patch.sponsoredByStoreId ?? null;
  const { data, error } = await supabase
    .from('prizes')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPrize(data) : undefined;
};

export const deletePrize = async (id: string): Promise<void> => {
  const { error } = await supabase.from('prizes').delete().eq('id', id);
  if (error) throw error;
};

export type DrawResult = {
  prizeId: string;
  winnerGuestId: string;
  winnerName: string;
  ticketNumber: string;
};

export const drawWinner = async (prizeId: string): Promise<DrawResult | null> => {
  // Atomic single-call draw via the draw_prize RPC (migration 0040).
  // The RPC takes a FOR UPDATE row lock on the prize, picks a random
  // eligible ticket inside Postgres (no full raffle_entries scan over
  // the wire), and either returns the new winner or — if the prize was
  // already drawn — returns the existing winner.
  const { data, error } = await supabase.rpc('draw_prize', { p_prize_id: prizeId });
  if (error) throw error;
  if (!data) return null;
  const result = data as {
    prize_id: string;
    winner_guest_id: string;
    winner_name: string;
    ticket_number: string;
  };
  return {
    prizeId: result.prize_id,
    winnerGuestId: result.winner_guest_id,
    winnerName: result.winner_name,
    ticketNumber: result.ticket_number,
  };
};

export const latestWinFor = async (
  guestId: string,
): Promise<{ prize: Prize; at: string } | null> => {
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .eq('winner_guest_id', guestId)
    .not('drawn_at', 'is', null)
    .order('drawn_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const prize = rowToPrize(data);
  return { prize, at: prize.drawnAt! };
};
