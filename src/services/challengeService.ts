import { db, notify } from '../data/mockDb';
import type { Challenge, ChallengeCompletion } from '../types';
import { uid } from '../utils/id';

export const listChallenges = (): Challenge[] => db.challenges;

export const createChallenge = (c: Omit<Challenge, 'id'>): Challenge => {
  const ch: Challenge = { ...c, id: uid('ch') };
  db.challenges.push(ch);
  notify();
  return ch;
};

export const updateChallenge = (id: string, patch: Partial<Challenge>): Challenge | undefined => {
  const idx = db.challenges.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.challenges[idx] = { ...db.challenges[idx], ...patch };
  notify();
  return db.challenges[idx];
};

export const deleteChallenge = (id: string): void => {
  const idx = db.challenges.findIndex((c) => c.id === id);
  if (idx >= 0) {
    db.challenges.splice(idx, 1);
    notify();
  }
};

export const completionsForGuest = (guestId: string): ChallengeCompletion[] =>
  db.challengeCompletions.filter((c) => c.guestId === guestId);

export const isChallengeComplete = (
  guestId: string,
  challenge: Challenge,
  allStoreIds: string[] = [],
): boolean => {
  if (challenge.type === 'booth' && challenge.storeId) {
    return db.passportStamps.some((s) => s.guestId === guestId && s.storeId === challenge.storeId);
  }
  if (challenge.type === 'visit_all') {
    const stamped = new Set(
      db.passportStamps.filter((s) => s.guestId === guestId).map((s) => s.storeId),
    );
    return allStoreIds.length > 0 && allStoreIds.every((id) => stamped.has(id));
  }
  return db.challengeCompletions.some(
    (c) => c.challengeId === challenge.id && c.guestId === guestId,
  );
};

export const completeChallenge = (guestId: string, challengeId: string): ChallengeCompletion => {
  const existing = db.challengeCompletions.find(
    (c) => c.guestId === guestId && c.challengeId === challengeId,
  );
  if (existing) return existing;
  const c: ChallengeCompletion = {
    id: uid('cc'),
    guestId,
    challengeId,
    completedAt: new Date().toISOString(),
  };
  db.challengeCompletions.push(c);
  notify();
  return c;
};
