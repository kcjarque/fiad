import { supabase } from '../lib/supabase';
import type { Challenge, ChallengeCompletion, PassportStamp } from '../types';
import { uid } from '../utils/id';
import { HIDDEN_STORE_IDS } from '../constants/hidden';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

type ChallengeRow = {
  id: string;
  event_id: string;
  type: Challenge['type'];
  name: string;
  description: string;
  store_id: string | null;
  image_url: string | null;
  reward_type: Challenge['rewardType'];
  reward_value: number | null;
};

type CompletionRow = {
  id: string;
  challenge_id: string;
  guest_id: string;
  completed_at: string;
};

const rowToChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  eventId: r.event_id,
  type: r.type,
  name: r.name,
  description: r.description,
  storeId: r.store_id ?? undefined,
  imageUrl: r.image_url ?? undefined,
  rewardType: r.reward_type,
  rewardValue: r.reward_value ?? undefined,
});

const rowToCompletion = (r: CompletionRow): ChallengeCompletion => ({
  id: r.id,
  challengeId: r.challenge_id,
  guestId: r.guest_id,
  completedAt: r.completed_at,
});

export const listChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase.from('challenges').select('*').order('id');
  if (error) throw error;
  // Hide quests linked to a no-show supplier so guests don't see a quest
  // they can't physically complete.
  return (data ?? [])
    .filter((r) => !r.store_id || !HIDDEN_STORE_IDS.has(r.store_id))
    .map(rowToChallenge);
};

export const createChallenge = async (c: Omit<Challenge, 'id'>): Promise<Challenge> => {
  const row: ChallengeRow = {
    id: uid('ch'),
    event_id: c.eventId || ACTIVE_EVENT_ID,
    type: c.type,
    name: c.name,
    description: c.description,
    store_id: c.storeId ?? null,
    image_url: c.imageUrl ?? null,
    reward_type: c.rewardType,
    reward_value: c.rewardValue ?? null,
  };
  const { error } = await supabase.from('challenges').insert(row);
  if (error) throw error;
  return rowToChallenge(row);
};

export const updateChallenge = async (
  id: string,
  patch: Partial<Challenge>,
): Promise<Challenge | undefined> => {
  const dbPatch: Partial<ChallengeRow> = {};
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.storeId !== undefined) dbPatch.store_id = patch.storeId ?? null;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl ?? null;
  if (patch.rewardType !== undefined) dbPatch.reward_type = patch.rewardType;
  if (patch.rewardValue !== undefined) dbPatch.reward_value = patch.rewardValue ?? null;
  const { data, error } = await supabase
    .from('challenges')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? rowToChallenge(data) : undefined;
};

export const deleteChallenge = async (id: string): Promise<void> => {
  const { error } = await supabase.from('challenges').delete().eq('id', id);
  if (error) throw error;
};

export const completionsForGuest = async (guestId: string): Promise<ChallengeCompletion[]> => {
  const { data, error } = await supabase
    .from('challenge_completions')
    .select('*')
    .eq('guest_id', guestId);
  if (error) throw error;
  return (data ?? []).map(rowToCompletion);
};

export const completeChallenge = async (
  guestId: string,
  challengeId: string,
): Promise<ChallengeCompletion> => {
  const { error } = await supabase.rpc('complete_challenge', {
    p_guest_id:     guestId,
    p_challenge_id: challengeId,
  });
  if (error) throw error;

  const { data, error: fetchErr } = await supabase
    .from('challenge_completions')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('guest_id', guestId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('completion not found after complete_challenge');
  return rowToCompletion(data);
};

/**
 * Pure synchronous helper — call after pre-fetching stamps and completions.
 * Used by Challenges.tsx to avoid N+1 async calls per challenge.
 */
export const isChallengeCompletedSync = (
  challenge: Challenge,
  stamps: PassportStamp[],
  completions: ChallengeCompletion[],
  allStoreIds: string[],
): boolean => {
  if (challenge.type === 'booth' && challenge.storeId) {
    return stamps.some((s) => s.storeId === challenge.storeId);
  }
  if (challenge.type === 'visit_all') {
    const stamped = new Set(stamps.map((s) => s.storeId));
    return allStoreIds.length > 0 && allStoreIds.every((id) => stamped.has(id));
  }
  return completions.some((c) => c.challengeId === challenge.id);
};
