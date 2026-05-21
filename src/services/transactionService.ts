import { supabase } from '../lib/supabase';
import { db, notify } from '../data/mockDb';
import type { OverrideRequest, Transaction } from '../types';
import { ticketNumber, todayKey, uid } from '../utils/id';
import { getActiveEvent } from './eventService';

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

const rowToTx = (r: Row): Transaction => ({
  id: r.id,
  eventId: r.event_id,
  storeId: r.store_id,
  guestId: r.guest_id,
  amount: r.amount,
  receiptPhotoUrl: r.receipt_photo_url,
  entriesIssued: r.entries_issued,
  status: r.status,
  overrideNote: r.override_note ?? undefined,
  approvedBy: r.approved_by ?? undefined,
  timestamp: r.timestamp,
});

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
  storeId: string;
  guestId: string;
  amount: number;
  receiptPhotoUrl: string;
  overrideNote?: string;
}): Promise<IssueResult> => {
  const event = await getActiveEvent();
  const alreadySpent = await getTodaySpent(params.guestId, params.storeId);
  const willExceed = alreadySpent + params.amount > event.dailyCapPerGuestPerStore;
  const now = new Date().toISOString();

  if (willExceed) {
    const txId = uid('tx');
    const transaction: Transaction = {
      id: txId,
      eventId: event.id,
      storeId: params.storeId,
      guestId: params.guestId,
      amount: params.amount,
      receiptPhotoUrl: params.receiptPhotoUrl,
      entriesIssued: 0,
      status: 'pending_override',
      overrideNote: params.overrideNote ?? 'Exceeds daily cap',
      timestamp: now,
    };
    const { error: txErr } = await supabase.from('transactions').insert({
      id: txId,
      event_id: event.id,
      store_id: params.storeId,
      guest_id: params.guestId,
      amount: params.amount,
      receipt_photo_url: params.receiptPhotoUrl,
      entries_issued: 0,
      status: 'pending_override',
      override_note: transaction.overrideNote,
      timestamp: now,
    });
    if (txErr) throw txErr;
    // Override requests live in the mock layer until that table migrates.
    const override: OverrideRequest = {
      id: uid('ovr'),
      transactionId: txId,
      storeId: params.storeId,
      guestId: params.guestId,
      amount: params.amount,
      note: transaction.overrideNote ?? 'Exceeds daily cap',
      status: 'pending',
      requestedAt: now,
    };
    db.overrides.push(override);
    notify();
    return { kind: 'override', transaction, override };
  }

  const entries = Math.floor(params.amount / event.raffleRate);
  const txId = uid('tx');
  const transaction: Transaction = {
    id: txId,
    eventId: event.id,
    storeId: params.storeId,
    guestId: params.guestId,
    amount: params.amount,
    receiptPhotoUrl: params.receiptPhotoUrl,
    entriesIssued: entries,
    status: 'approved',
    timestamp: now,
  };
  const { error: txErr } = await supabase.from('transactions').insert({
    id: txId,
    event_id: event.id,
    store_id: params.storeId,
    guest_id: params.guestId,
    amount: params.amount,
    receipt_photo_url: params.receiptPhotoUrl,
    entries_issued: entries,
    status: 'approved',
    timestamp: now,
  });
  if (txErr) throw txErr;

  if (entries > 0) {
    const entryRows = Array.from({ length: entries }, () => ({
      id: uid('re'),
      event_id: event.id,
      guest_id: params.guestId,
      transaction_id: txId,
      ticket_number: ticketNumber(),
      created_at: now,
    }));
    const { error: reErr } = await supabase.from('raffle_entries').insert(entryRows);
    if (reErr) throw reErr;
  }
  return { kind: 'approved', transaction, entries };
};

export const listTransactions = async (filter?: {
  storeId?: string;
  guestId?: string;
}): Promise<Transaction[]> => {
  let q = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
  if (filter?.storeId) q = q.eq('store_id', filter.storeId);
  if (filter?.guestId) q = q.eq('guest_id', filter.guestId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToTx);
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
