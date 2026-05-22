import { supabase } from '../lib/supabase';
import type { Prize } from '../types';
import { uid } from '../utils/id';
import { getGuest } from './guestService';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

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
  const { data, error } = await supabase.from('prizes').select('*').order('id');
  if (error) throw error;
  return (data ?? []).map(rowToPrize);
};

export const createPrize = async (p: Omit<Prize, 'id' | 'eventId'>): Promise<Prize> => {
  const row: Row = {
    id: uid('prize'),
    event_id: ACTIVE_EVENT_ID,
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
  const { data: prizeRow, error: fetchErr } = await supabase
    .from('prizes')
    .select('*')
    .eq('id', prizeId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!prizeRow) return null;

  const prize = rowToPrize(prizeRow);

  // Guard: already drawn — never overwrite.
  if (prize.winnerGuestId && prize.winningTicketNumber) {
    const existing = await getGuest(prize.winnerGuestId);
    return {
      prizeId,
      winnerGuestId: prize.winnerGuestId,
      winnerName: existing?.name ?? 'Guest',
      ticketNumber: prize.winningTicketNumber,
    };
  }

  // Exclude tickets that were already won by other prizes.
  const { data: wonRows } = await supabase
    .from('prizes')
    .select('winning_ticket_number')
    .not('winning_ticket_number', 'is', null);
  const drawnTickets = new Set(
    (wonRows ?? []).map((r) => r.winning_ticket_number as string).filter(Boolean),
  );

  const { data: entries, error: entriesErr } = await supabase
    .from('raffle_entries')
    .select('*');
  if (entriesErr) throw entriesErr;

  const pool = (entries ?? []).filter((e) => !drawnTickets.has(e.ticket_number));
  if (pool.length === 0) return null;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const guest = await getGuest(pick.guest_id);
  const now = new Date().toISOString();

  await updatePrize(prizeId, {
    drawnAt: now,
    winnerGuestId: pick.guest_id,
    winningTicketNumber: pick.ticket_number,
  });

  return {
    prizeId,
    winnerGuestId: pick.guest_id,
    winnerName: guest?.name ?? 'Guest',
    ticketNumber: pick.ticket_number,
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
