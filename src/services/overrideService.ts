import { db, notify } from '../data/mockDb';
import type { OverrideRequest } from '../types';
import { ticketNumber, uid } from '../utils/id';
import { supabase } from '../lib/supabase';
import { getActiveEvent } from './eventService';

export const listOverrides = (filter?: { storeId?: string; status?: OverrideRequest['status'] }): OverrideRequest[] => {
  let list = [...db.overrides];
  if (filter?.storeId) list = list.filter((o) => o.storeId === filter.storeId);
  if (filter?.status) list = list.filter((o) => o.status === filter.status);
  return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
};

export const approveOverride = async (
  overrideId: string,
  adminId: string,
): Promise<OverrideRequest | undefined> => {
  const ovr = db.overrides.find((o) => o.id === overrideId);
  if (!ovr || ovr.status !== 'pending') return ovr;
  const event = await getActiveEvent();
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', ovr.transactionId)
    .maybeSingle();
  if (tx) {
    const entries = Math.floor(tx.amount / event.raffleRate);
    await supabase
      .from('transactions')
      .update({ status: 'approved', entries_issued: entries, approved_by: adminId })
      .eq('id', tx.id);
    if (entries > 0) {
      const rows = Array.from({ length: entries }, () => ({
        id: uid('re'),
        event_id: event.id,
        guest_id: tx.guest_id,
        transaction_id: tx.id,
        ticket_number: ticketNumber(),
        created_at: new Date().toISOString(),
      }));
      await supabase.from('raffle_entries').insert(rows);
    }
  }
  ovr.status = 'approved';
  ovr.respondedAt = new Date().toISOString();
  ovr.respondedBy = adminId;
  notify();
  return ovr;
};

export const denyOverride = async (
  overrideId: string,
  adminId: string,
): Promise<OverrideRequest | undefined> => {
  const ovr = db.overrides.find((o) => o.id === overrideId);
  if (!ovr || ovr.status !== 'pending') return ovr;
  await supabase
    .from('transactions')
    .update({ status: 'rejected' })
    .eq('id', ovr.transactionId);
  ovr.status = 'denied';
  ovr.respondedAt = new Date().toISOString();
  ovr.respondedBy = adminId;
  notify();
  return ovr;
};
