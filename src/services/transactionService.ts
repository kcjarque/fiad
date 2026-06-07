import { supabase } from '../lib/supabase';
import type { OverrideRequest, Transaction } from '../types';
import { todayKey } from '../utils/id';

type Row = {
  id: string;
  event_id: string;
  store_id: string;
  guest_id: string;
  amount: number;
  receipt_photo_url: string;
  entries_issued: number;
  status: 'approved' | 'pending_override' | 'rejected';
  override_note: string | null;
  approved_by: string | null;
  timestamp: string;
};

const rowToTx = (r: Partial<Row> & Omit<Row, 'receipt_photo_url'>): Transaction => ({
  id: r.id,
  eventId: r.event_id,
  storeId: r.store_id,
  guestId: r.guest_id,
  amount: r.amount,
  // Empty for list queries — receipts are 2-3 MB base64 blobs, so we never
  // pull them in bulk (a `select *` over a handful of rows blows past the
  // Postgres statement timeout). The detail modal fetches the receipt for a
  // single row on demand via getTransaction().
  receiptPhotoUrl: r.receipt_photo_url ?? '',
  entriesIssued: r.entries_issued,
  status: r.status,
  overrideNote: r.override_note ?? undefined,
  approvedBy: r.approved_by ?? undefined,
  timestamp: r.timestamp,
});

// Every column EXCEPT the heavy receipt_photo_url blob.
const TX_LIST_COLUMNS =
  'id,event_id,store_id,guest_id,amount,entries_issued,status,override_note,approved_by,timestamp';

export const getTodaySpent = async (guestId: string, storeId: string): Promise<number> => {
  const start = `${todayKey()}T00:00:00.000Z`;
  const end = `${todayKey()}T23:59:59.999Z`;
  const { data, error } = await supabase
    .from('transactions')
    .select('amount,status,timestamp')
    .eq('guest_id', guestId)
    .eq('store_id', storeId)
    .gte('timestamp', start)
    .lte('timestamp', end)
    .in('status', ['approved', 'pending_override']);
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + (t.amount as number), 0);
};

export type IssueResult =
  | { kind: 'approved'; transaction: Transaction; entries: number }
  | { kind: 'override'; transaction: Transaction; override: OverrideRequest };

export const issueEntries = async (params: {
  idempotencyKey: string;
  storeId: string;
  guestId: string;
  amount: number;
  receiptPhotoUrl: string;
  overrideNote?: string;
}): Promise<IssueResult> => {
  const { data, error } = await supabase.rpc('issue_entries', {
    p_idempotency_key: params.idempotencyKey,
    p_store_id: params.storeId,
    p_guest_id: params.guestId,
    p_amount: params.amount,
    p_receipt_url: params.receiptPhotoUrl,
    p_override_note: params.overrideNote ?? null,
  });
  if (error) throw error;

  const result = data as {
    kind: string;
    transaction_id: string;
    entries_added?: number;
    override_id?: string;
  };

  const { data: txRow, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', result.transaction_id)
    .maybeSingle();
  if (txErr) throw txErr;
  if (!txRow) throw new Error('transaction not found after issue_entries');
  const transaction = rowToTx(txRow as Row);

  const isOverride =
    result.kind === 'override' ||
    (result.kind === 'duplicate' && transaction.status === 'pending_override');

  if (isOverride) {
    const { data: ovrRow, error: ovrErr } = await supabase
      .from('override_requests')
      .select('*')
      .eq('transaction_id', result.transaction_id)
      .maybeSingle();
    if (ovrErr) throw ovrErr;
    const override: OverrideRequest = ovrRow
      ? {
          id: ovrRow.id,
          transactionId: ovrRow.transaction_id,
          storeId: ovrRow.store_id,
          guestId: ovrRow.guest_id,
          amount: ovrRow.amount,
          note: ovrRow.note,
          status: ovrRow.status,
          requestedAt: ovrRow.requested_at,
          respondedAt: ovrRow.responded_at ?? undefined,
          respondedBy: ovrRow.responded_by ?? undefined,
        }
      : {
          id: '',
          transactionId: result.transaction_id,
          storeId: params.storeId,
          guestId: params.guestId,
          amount: params.amount,
          note: params.overrideNote ?? 'Exceeds daily cap',
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };
    return { kind: 'override', transaction, override };
  }

  return {
    kind: 'approved',
    transaction,
    entries: result.entries_added ?? transaction.entriesIssued,
  };
};

export const listTransactions = async (filter?: {
  storeId?: string;
  guestId?: string;
}): Promise<Transaction[]> => {
  // Select explicit columns minus the receipt blob — see TX_LIST_COLUMNS.
  let q = supabase.from('transactions').select(TX_LIST_COLUMNS).order('timestamp', { ascending: false });
  if (filter?.storeId) q = q.eq('store_id', filter.storeId);
  if (filter?.guestId) q = q.eq('guest_id', filter.guestId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowToTx(r as Omit<Row, 'receipt_photo_url'>));
};

export const getTransaction = async (id: string): Promise<Transaction | undefined> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTx(data) : undefined;
};
