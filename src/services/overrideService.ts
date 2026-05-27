import { supabase } from '../lib/supabase';
import type { OverrideRequest } from '../types';

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
  const { error } = await supabase.rpc('approve_override', {
    p_override_id: overrideId,
    p_admin_id: adminId,
  });
  if (error) throw error;

  const { data, error: fetchErr } = await supabase
    .from('override_requests')
    .select('*')
    .eq('id', overrideId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  return data ? rowToOverride(data) : undefined;
};

export const denyOverride = async (
  overrideId: string,
  adminId: string,
): Promise<OverrideRequest | undefined> => {
  const { error } = await supabase.rpc('deny_override', {
    p_override_id: overrideId,
    p_admin_id: adminId,
  });
  if (error) throw error;

  const { data, error: fetchErr } = await supabase
    .from('override_requests')
    .select('*')
    .eq('id', overrideId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  return data ? rowToOverride(data) : undefined;
};
