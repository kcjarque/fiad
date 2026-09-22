import { supabase } from '../lib/supabase';

/**
 * Data extraction for the whole system, across every event.
 *
 * Deliberately not event-scoped like the rest of the services: the point of an
 * export is the complete picture, and the headline question the client asks —
 * "did this person come to Brittany, Mella, or both?" — is unanswerable from
 * inside a single event.
 *
 * Everything is paged. PostgREST caps a plain select at 1000 rows, so a naive
 * read would have silently exported the first 1000 guests and looked correct.
 */

/** PostgREST returns at most 1000 rows per request; walk until short-read. */
const pageAll = async <T>(table: string, columns: string): Promise<T[]> => {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
};

export type VenueLabel = 'Brittany' | 'Mella' | 'Both' | 'Season 1';

export type GuestExportRow = {
  name: string;
  email: string;
  mobile: string;
  /** Brittany / Mella / Both — the client's "which hotel" column. */
  venue: VenueLabel;
  preferredDay: string;
  registeredAt: string;
  /** PH days this person was actually scanned in at the door. */
  daysAttended: string;
  checkedIn: boolean;
  /**
   * Supplier categories the person ticked on the RSVP funnel's inquiry form —
   * the client's "looking for what specific supplier". Stored in
   * event_inquiries.event_type, a legacy column the funnel reuses for the
   * checkbox list. Blank for anyone who registered without filling it in.
   */
  lookingFor: string;
  /** Booths they actually visited or bought from on the day — observed
   *  behaviour, as opposed to the stated intent in lookingFor. */
  suppliers: string;
  spentPhp: number;
  entries: number;
};

export type TransactionExportRow = {
  timestamp: string;
  guestName: string;
  guestEmail: string;
  guestMobile: string;
  venue: string;
  booth: string;
  supplier: string;
  category: string;
  amountPhp: number;
  entriesIssued: number;
  status: string;
  approvedBy: string;
  overrideNote: string;
};

export type SmsExportRow = {
  kind: string;
  event: string;
  status: string;
  messages: number;
  segments: number;
  costPhp: number;
  firstSentAt: string;
  lastSentAt: string;
};

export type InquiryExportRow = {
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  partnerName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  message: string;
};

export type ExportBundle = {
  guests: GuestExportRow[];
  transactions: TransactionExportRow[];
  sms: SmsExportRow[];
  inquiries: InquiryExportRow[];
  smsTotals: { messages: number; segments: number; costPhp: number };
  salesTotalPhp: number;
};

// Cost per billable 160-char segment, matching smsService.
const SMS_RATE_PHP = 0.7;

const phDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const venueOf = (eventIds: Set<string>): VenueLabel => {
  const b = eventIds.has('evt_fiad_s2_brittany');
  const m = eventIds.has('evt_fiad_s2_mella');
  if (b && m) return 'Both';
  if (b) return 'Brittany';
  if (m) return 'Mella';
  return 'Season 1';
};

const dayLabel = (d?: string | null) =>
  d === 'day1' ? 'Day 1' : d === 'day2' ? 'Day 2' : '';

type GuestRow = {
  id: string; event_id: string; name: string; email: string; mobile: string;
  registered_at: string; preferred_day: string | null; checked_in_at: string | null;
};
type TxRow = {
  id: string; event_id: string; store_id: string; guest_id: string; amount: number;
  entries_issued: number; status: string; approved_by: string | null;
  override_note: string | null; timestamp: string;
};
type StoreRow = { id: string; name: string; booth_number: string; category: string | null };
type StampRow = { guest_id: string; store_id: string };
type EntryRow = { guest_id: string };
type CheckInRow = { guest_id: string; checked_in_at: string };
type SmsRow = { event_id: string | null; kind: string; status: string; segments: number | null; created_at: string };
type InqRow = {
  created_at: string; name: string; email: string; phone: string;
  partner_name: string | null; event_type: string | null; event_date: string | null;
  event_id: string | null; message: string | null;
};
type EventRow = { id: string; name: string };

export const buildExportBundle = async (): Promise<ExportBundle> => {
  const [guests, txs, stores, stamps, entries, checkIns, sms, inquiries, events] =
    await Promise.all([
      pageAll<GuestRow>('guests', 'id,event_id,name,email,mobile,registered_at,preferred_day,checked_in_at'),
      pageAll<TxRow>('transactions', 'id,event_id,store_id,guest_id,amount,entries_issued,status,approved_by,override_note,timestamp'),
      pageAll<StoreRow>('stores', 'id,name,booth_number,category'),
      pageAll<StampRow>('passport_stamps', 'guest_id,store_id'),
      pageAll<EntryRow>('raffle_entries', 'guest_id'),
      pageAll<CheckInRow>('check_ins', 'guest_id,checked_in_at'),
      pageAll<SmsRow>('sms_log', 'event_id,kind,status,segments,created_at'),
      pageAll<InqRow>('event_inquiries', 'created_at,name,email,phone,partner_name,event_type,event_date,event_id,message'),
      pageAll<EventRow>('events', 'id,name'),
    ]);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  // A person is one human, not one row: the same guest registering at both
  // venues is two guest rows sharing an email. Collapsing on the lowercased
  // email is what makes the "Both" answer possible at all.
  type Agg = {
    name: string; email: string; mobile: string;
    eventIds: Set<string>; guestIds: Set<string>;
    registeredAt: string; preferredDay: string;
    days: Set<string>; checkedIn: boolean;
    suppliers: Set<string>; spent: number; entries: number;
    lookingFor: string;
  };
  const byPerson = new Map<string, Agg>();
  const keyFor = (g: GuestRow) => (g.email || '').trim().toLowerCase() || `id:${g.id}`;
  const personOfGuestId = new Map<string, string>();

  for (const g of guests) {
    const k = keyFor(g);
    personOfGuestId.set(g.id, k);
    const cur = byPerson.get(k);
    if (!cur) {
      byPerson.set(k, {
        name: g.name, email: g.email, mobile: g.mobile,
        eventIds: new Set([g.event_id]), guestIds: new Set([g.id]),
        registeredAt: g.registered_at, preferredDay: dayLabel(g.preferred_day),
        days: new Set(), checkedIn: !!g.checked_in_at,
        suppliers: new Set(), spent: 0, entries: 0,
        lookingFor: '',
      });
    } else {
      cur.eventIds.add(g.event_id);
      cur.guestIds.add(g.id);
      // Keep the earliest registration, and fill any detail the first row lacked.
      if (g.registered_at < cur.registeredAt) cur.registeredAt = g.registered_at;
      if (!cur.mobile && g.mobile) cur.mobile = g.mobile;
      if (!cur.preferredDay) cur.preferredDay = dayLabel(g.preferred_day);
      if (g.checked_in_at) cur.checkedIn = true;
    }
  }

  const add = (guestId: string, fn: (a: Agg) => void) => {
    const k = personOfGuestId.get(guestId);
    if (!k) return;
    const a = byPerson.get(k);
    if (a) fn(a);
  };

  // What they said they were looking for, matched to the person by email —
  // the inquiry form and the registration form are separate submissions, and
  // the address is the only thing linking them.
  for (const i of inquiries) {
    const a = byPerson.get((i.email || '').trim().toLowerCase());
    if (!a || !i.event_type) continue;
    // Keep the longest answer if someone inquired more than once: a later,
    // shorter submission shouldn't drop categories they named earlier.
    if (i.event_type.length > a.lookingFor.length) a.lookingFor = i.event_type;
  }

  for (const c of checkIns) add(c.guest_id, (a) => a.days.add(phDay(c.checked_in_at)));
  for (const s of stamps) {
    const st = storeById.get(s.store_id);
    if (st) add(s.guest_id, (a) => a.suppliers.add(st.name));
  }
  for (const e of entries) add(e.guest_id, (a) => { a.entries += 1; });
  for (const t of txs) {
    if (t.status !== 'approved') continue;
    const st = storeById.get(t.store_id);
    add(t.guest_id, (a) => {
      a.spent += t.amount;
      if (st) a.suppliers.add(st.name);
    });
  }

  const guestRows: GuestExportRow[] = [...byPerson.values()]
    .map((a) => ({
      name: a.name,
      email: a.email,
      mobile: a.mobile,
      venue: venueOf(a.eventIds),
      preferredDay: a.preferredDay,
      registeredAt: a.registeredAt,
      daysAttended: [...a.days].sort().join(' / '),
      checkedIn: a.checkedIn || a.days.size > 0,
      lookingFor: a.lookingFor,
      suppliers: [...a.suppliers].sort().join(' / '),
      spentPhp: a.spent,
      entries: a.entries,
    }))
    .sort((x, y) => x.name.localeCompare(y.name));

  const txRows: TransactionExportRow[] = txs
    .map((t) => {
      const st = storeById.get(t.store_id);
      const pk = personOfGuestId.get(t.guest_id);
      const p = pk ? byPerson.get(pk) : undefined;
      return {
        timestamp: t.timestamp,
        guestName: p?.name ?? 'Removed guest',
        guestEmail: p?.email ?? '',
        guestMobile: p?.mobile ?? '',
        venue: eventName.get(t.event_id) ?? t.event_id,
        booth: st?.booth_number ?? '',
        supplier: st?.name ?? t.store_id,
        category: st?.category ?? '',
        amountPhp: t.amount,
        entriesIssued: t.entries_issued,
        status: t.status,
        approvedBy: t.approved_by ?? '',
        overrideNote: t.override_note ?? '',
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // SMS is grouped rather than dumped: 7k rows of individual sends is a log,
  // not a breakdown, and the per-recipient numbers add nothing the guest
  // export doesn't already carry.
  const smsAgg = new Map<string, SmsExportRow>();
  for (const r of sms) {
    const k = [r.kind, r.event_id ?? '', r.status].join('|');
    const seg = r.segments ?? 1;
    const cur = smsAgg.get(k);
    if (!cur) {
      smsAgg.set(k, {
        kind: r.kind,
        event: r.event_id ? (eventName.get(r.event_id) ?? r.event_id) : 'All events',
        status: r.status,
        messages: 1,
        segments: seg,
        costPhp: seg * SMS_RATE_PHP,
        firstSentAt: r.created_at,
        lastSentAt: r.created_at,
      });
    } else {
      cur.messages += 1;
      cur.segments += seg;
      cur.costPhp = cur.segments * SMS_RATE_PHP;
      if (r.created_at < cur.firstSentAt) cur.firstSentAt = r.created_at;
      if (r.created_at > cur.lastSentAt) cur.lastSentAt = r.created_at;
    }
  }
  const smsRows = [...smsAgg.values()].sort((a, b) => b.segments - a.segments);
  // Only sent messages are billable — a failed send costs nothing.
  const sent = smsRows.filter((r) => r.status === 'sent');
  const smsTotals = {
    messages: sent.reduce((n, r) => n + r.messages, 0),
    segments: sent.reduce((n, r) => n + r.segments, 0),
    costPhp: sent.reduce((n, r) => n + r.costPhp, 0),
  };

  const inqRows: InquiryExportRow[] = inquiries
    .map((i) => ({
      createdAt: i.created_at,
      name: i.name,
      email: i.email,
      phone: i.phone,
      partnerName: i.partner_name ?? '',
      eventType: i.event_type ?? '',
      eventDate: i.event_date ?? '',
      venue: i.event_id ? (eventName.get(i.event_id) ?? i.event_id) : '',
      message: i.message ?? '',
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    guests: guestRows,
    transactions: txRows,
    sms: smsRows,
    inquiries: inqRows,
    smsTotals,
    salesTotalPhp: txs
      .filter((t) => t.status === 'approved')
      .reduce((n, t) => n + t.amount, 0),
  };
};

/** RFC-4180 CSV. Every field quoted, so commas and newlines survive Excel. */
export const toCsv = (headers: string[], rows: (string | number | boolean)[][]): string => {
  const esc = (v: string | number | boolean) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
};

export const downloadCsv = (filename: string, csv: string): void => {
  // The BOM makes Excel read it as UTF-8, so "Las Piñas" doesn't mojibake.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
