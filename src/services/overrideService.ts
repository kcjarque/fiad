import { supabase } from '../lib/supabase';
import type { OverrideRequest } from '../types';
import { ticketNumber, uid } from '../utils/id';
import { getActiveEvent } from './eventService';

type Row = {
  id: string;
  transaction_id: string;
  store_id: string;
  guest_id: string;
  amount: number;
  note: string;
  status: OverrideRequest['status'];
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
};

const rowToOverride = (r: Row): OverrideRequest => ({
  id: r.id,
  transactionId: r.transaction_id,
  storeId: r.store_id,
  guestId: r.guest_id,
  amount: r.amount,
  note: r.note,
  status: r.status,
  requestedAt: r.requested_at,
  respondedAt: r.responded_at ?? undefined,
  respondedBy: r.responded_by ?? undefined,
});

export const listOverrides = async (filter?: {
  storeId?: string;
  status?: OverrideRequest['status'];
}): Promise<OverrideRequest[]> => {
  let q = supabase
    .from('override_requests')
    .select('*')
    .order('requested_at', { ascending: false });
  if (filter?.storeId) q = q.eq('store_id', filter.storeId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOverride);
};

export const approveOverride = async (
  overrideId: string,
  adminId: string,
): Promise<OverrideRequest | undefined> => {
  const { data: ovrRow, error: fetchErr } = await supabase
    .from('override_requests')
    .select('*')
    .eq('id', overrideId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!ovrRow || ovrRow.status !== 'pending') return ovrRow ? rowToOverride(ovrRow) : undefined;

  const event = await getActiveEvent();
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', ovrRow.transaction_id)
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

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from('override_requests')
    .update({ status: 'approved', responded_at: now, responded_by: adminId })
    .eq('id', overrideId)
    .select('*')
    .maybeSingle();
  if (updateErr) throw updateErr;
  return updated ? rowToOverride(updated) : undefined;
};

export const denyOverride = async (
  overrideId: string,
  adminId: string,
): Promise<OverrideRequest | undefined> => {
  const { data: ovrRow, error: fetchErr } = await supabase
    .from('override_requests')
    .select('*')
    .eq('id', overrideId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!ovrRow || ovrRow.status !== 'pending') return ovrRow ? rowToOverride(ovrRow) : undefined;

  await supabase.from('transactions').update({ status: 'rejected' }).eq('id', ovrRow.transaction_id);

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from('override_requests')
    .update({ status: 'denied', responded_at: now, responded_by: adminId })
    .eq('id', overrideId)
    .select('*')
    .maybeSingle();
  if (updateErr) throw updateErr;
  return updated ? rowToOverride(updated) : undefined;
};
