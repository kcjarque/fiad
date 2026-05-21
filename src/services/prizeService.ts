import { db, notify } from '../data/mockDb';
import type { Prize } from '../types';
import { uid } from '../utils/id';
import { allActiveEntries } from './raffleService';
import { getGuest } from './guestService';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

export const listPrizes = (): Prize[] => db.prizes;

export const createPrize = (p: Omit<Prize, 'id' | 'eventId'>): Prize => {
  const prize: Prize = { ...p, id: uid('prize'), eventId: ACTIVE_EVENT_ID };
  db.prizes.push(prize);
  notify();
  return prize;
};

export const updatePrize = (id: string, patch: Partial<Prize>): Prize | undefined => {
  const idx = db.prizes.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  db.prizes[idx] = { ...db.prizes[idx], ...patch };
  notify();
  return db.prizes[idx];
};

export const deletePrize = (id: string): void => {
  const idx = db.prizes.findIndex((p) => p.id === id);
  if (idx >= 0) {
    db.prizes.splice(idx, 1);
    notify();
  }
};

export type DrawResult = {
  prizeId: string;
  winnerGuestId: string;
  winnerName: string;
  ticketNumber: string;
};

export const drawWinner = async (prizeId: string): Promise<DrawResult | null> => {
  const prize = db.prizes.find((p) => p.id === prizeId);
  if (!prize) return null;
  // Guard: if already drawn, return the existing winner — never overwrite.
  if (prize.winnerGuestId && prize.winningTicketNumber) {
    const existing = await getGuest(prize.winnerGuestId);
    return {
      prizeId,
      winnerGuestId: prize.winnerGuestId,
      winnerName: existing?.name ?? 'Guest',
      ticketNumber: prize.winningTicketNumber,
    };
  }
  const pool = await allActiveEntries();
  if (pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const guest = await getGuest(pick.guestId);
  prize.drawnAt = new Date().toISOString();
  prize.winnerGuestId = pick.guestId;
  prize.winningTicketNumber = pick.ticketNumber;
  notify();
  return {
    prizeId,
    winnerGuestId: pick.guestId,
    winnerName: guest?.name ?? 'Guest',
    ticketNumber: pick.ticketNumber,
  };
};

export const latestWinFor = (guestId: string): { prize: Prize; at: string } | null => {
  const won = db.prizes
    .filter((p) => p.winnerGuestId === guestId && p.drawnAt)
    .sort((a, b) => (b.drawnAt ?? '').localeCompare(a.drawnAt ?? ''));
  if (!won.length) return null;
  return { prize: won[0], at: won[0].drawnAt! };
};
