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
  /** Events this person appears in. Plural because someone who registered at
   *  both venues is one person across two rows, which is the whole point of
   *  the directory — so the venue filter has to match on "any of". */
  eventIds: string[];
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
  eventId: string;
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
  eventId: string;
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
  eventId: string;
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

export type SupplierExportRow = {
  eventId: string;
  booth: string;
  name: string;
  category: string;
  venue: string;
  email: string;
  contact: string;
  salesPhp: number;
  transactions: number;
  /** Distinct guests who bought from this booth. */
  buyers: number;
  /** Passport scans at this booth — footfall, whether or not they bought. */
  boothVisits: number;
  visitors: number;
  prizesSponsored: number;
};

export type PrizeExportRow = {
  eventId: string;
  /** "Season 1" / "Season 2", so winners from different seasons can be kept
   *  apart — the venue label alone doesn't say which season it was. */
  season: string;
  prize: string;
  venue: string;
  /** The hotel itself ("Brittany Hotel, BGC"), from events.venue. */
  location: string;
  /** PH calendar day of the draw ("Sep 19, 2026") — the scheduled slot, or
   *  when it was actually drawn if it was never scheduled. Both Season 2
   *  venues run on Sep 19, so this pairs with location to pick out one day. */
  drawDate: string;
  scheduledAt: string;
  drawnAt: string;
  status: string;
  winnerName: string;
  winnerEmail: string;
  winnerMobile: string;
  ticketNumber: string;
  sponsor: string;
  isGrand: boolean;
};

export type AttendanceExportRow = {
  eventId: string;
  day: string;
  time: string;
  name: string;
  email: string;
  mobile: string;
  venue: string;
};

export type EntryExportRow = {
  eventId: string;
  ticketNumber: string;
  guestName: string;
  guestEmail: string;
  venue: string;
  source: string;
  complimentary: boolean;
  createdAt: string;
};

export type SupplierSignupExportRow = {
  /** Season applied for. Sign-ups carry a season label rather than an event
   *  id, because an intake opens before its venues are decided. */
  season: string;
  createdAt: string;
  businessName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  category: string;
  social: string;
  products: string;
  message: string;
};

export type ExportBundle = {
  /** Every event, so the venue filter is built from the data rather than a
   *  hardcoded list that would go stale the moment a Season 3 row appears. */
  events: { id: string; name: string }[];
  guests: GuestExportRow[];
  transactions: TransactionExportRow[];
  sms: SmsExportRow[];
  inquiries: InquiryExportRow[];
  suppliers: SupplierExportRow[];
  prizes: PrizeExportRow[];
  attendance: AttendanceExportRow[];
  entries: EntryExportRow[];
  supplierSignups: SupplierSignupExportRow[];
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
  d === 'day1' ? 'Day 1' : d === 'day2' ? 'Day 2' : d === 'both' ? 'Both days' : '';

type GuestRow = {
  id: string; event_id: string; name: string; email: string; mobile: string;
  registered_at: string; preferred_day: string | null; checked_in_at: string | null;
};
type TxRow = {
  id: string; event_id: string; store_id: string; guest_id: string; amount: number;
  entries_issued: number; status: string; approved_by: string | null;
  override_note: string | null; timestamp: string;
};
// NOTE: `passcode` is deliberately absent. It is the booth's login and must
// never leave the system in an export.
type StoreRow = {
  id: string; event_id: string; name: string; booth_number: string;
  category: string | null; email: string | null; contact: string | null;
};
type StampRow = { guest_id: string; store_id: string };
type EntryRow = {
  guest_id: string; event_id: string; ticket_number: string; source: string | null;
  is_complimentary: boolean | null; created_at: string; transaction_id: string | null;
};
type PrizeRow = {
  id: string; event_id: string; name: string; scheduled_at: string | null;
  drawn_at: string | null; winner_guest_id: string | null;
  winning_ticket_number: string | null; sponsored_by_store_id: string | null;
  is_grand: boolean | null;
};
type SignupRow = {
  season: string | null;
  created_at: string; business_name: string; contact_person: string | null;
  email: string | null; mobile: string | null; category: string | null;
  social: string | null; products: string | null; message: string | null;
};
type CheckInRow = { guest_id: string; checked_in_at: string };
type SmsRow = { event_id: string | null; kind: string; status: string; segments: number | null; created_at: string };
type InqRow = {
  created_at: string; name: string; email: string; phone: string;
  partner_name: string | null; event_type: string | null; event_date: string | null;
  event_id: string | null; message: string | null;
};
type EventRow = { id: string; name: string; venue: string | null };

export const buildExportBundle = async (): Promise<ExportBundle> => {
  const [guests, txs, stores, stamps, entries, checkIns, sms, inquiries, events, prizes, signups] =
    await Promise.all([
      pageAll<GuestRow>('guests', 'id,event_id,name,email,mobile,registered_at,preferred_day,checked_in_at'),
      pageAll<TxRow>('transactions', 'id,event_id,store_id,guest_id,amount,entries_issued,status,approved_by,override_note,timestamp'),
      pageAll<StoreRow>('stores', 'id,event_id,name,booth_number,category,email,contact'),
      pageAll<StampRow>('passport_stamps', 'guest_id,store_id'),
      pageAll<EntryRow>('raffle_entries', 'guest_id,event_id,ticket_number,source,is_complimentary,created_at,transaction_id'),
      pageAll<CheckInRow>('check_ins', 'guest_id,checked_in_at'),
      pageAll<SmsRow>('sms_log', 'event_id,kind,status,segments,created_at'),
      pageAll<InqRow>('event_inquiries', 'created_at,name,email,phone,partner_name,event_type,event_date,event_id,message'),
      pageAll<EventRow>('events', 'id,name,venue'),
      pageAll<PrizeRow>('prizes', 'id,event_id,name,scheduled_at,drawn_at,winner_guest_id,winning_ticket_number,sponsored_by_store_id,is_grand'),
      pageAll<SignupRow>('supplier_signups', 'season,created_at,business_name,contact_person,email,mobile,category,social,products,message'),
    ]);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  // A person is one human, not one row: the same guest registering at both
  // venues is two guest rows sharing an email. Collapsing on the lowercased
  // email is what makes the "Both" answer possible at all.
  type Agg = {
    name: string; email: string; mobile: string;
    eventIds: Set<string>; guestIds: Set<string>;
    registeredAt: string; preferredDays: Set<string>;
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
        registeredAt: g.registered_at, preferredDays: new Set([dayLabel(g.preferred_day)].filter(Boolean)),
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
      const bookedDay = dayLabel(g.preferred_day);
      if (bookedDay) cur.preferredDays.add(bookedDay);
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
      eventIds: [...a.eventIds],
      name: a.name,
      email: a.email,
      mobile: a.mobile,
      venue: venueOf(a.eventIds),
      preferredDay: a.preferredDays.has('Both days') || a.preferredDays.size > 1
        ? 'Both days'
        : [...a.preferredDays][0] ?? '',
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
        eventId: t.event_id,
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
        eventId: r.event_id ?? '',
        kind: r.kind,
        event: r.event_id ? (eventName.get(r.event_id) ?? r.event_id) : 'All events',
        status: r.status,
        messages: 1,
        segments: seg,
        // Only a delivered message is billable. Charging for a failed send
        // overstated the Sep 18 outage as a 763-peso spend that never happened.
        costPhp: r.status === 'sent' ? seg * SMS_RATE_PHP : 0,
        firstSentAt: r.created_at,
        lastSentAt: r.created_at,
      });
    } else {
      cur.messages += 1;
      cur.segments += seg;
      cur.costPhp = r.status === 'sent' ? cur.segments * SMS_RATE_PHP : 0;
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
      eventId: i.event_id ?? '',
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

  // ── Supplier performance ────────────────────────────────────────────────
  // What a vendor actually got for their booth: money taken, distinct buyers,
  // and footfall. Booth visits and buyers are counted separately on purpose —
  // a booth with heavy traffic and no sales is a different story from a quiet
  // one that converted, and a single total hides both.
  const supplierAgg = new Map<string, {
    sales: number; txCount: number; buyers: Set<string>;
    visits: number; visitors: Set<string>; prizes: number;
  }>();
  const supplierOf = (id: string) => {
    let a = supplierAgg.get(id);
    if (!a) {
      a = { sales: 0, txCount: 0, buyers: new Set(), visits: 0, visitors: new Set(), prizes: 0 };
      supplierAgg.set(id, a);
    }
    return a;
  };
  for (const t of txs) {
    if (t.status !== 'approved') continue;
    const a = supplierOf(t.store_id);
    a.sales += t.amount;
    a.txCount += 1;
    a.buyers.add(personOfGuestId.get(t.guest_id) ?? t.guest_id);
  }
  for (const st of stamps) {
    const a = supplierOf(st.store_id);
    a.visits += 1;
    a.visitors.add(personOfGuestId.get(st.guest_id) ?? st.guest_id);
  }
  for (const pz of prizes) {
    if (pz.sponsored_by_store_id) supplierOf(pz.sponsored_by_store_id).prizes += 1;
  }
  const supplierRows: SupplierExportRow[] = stores
    .map((st) => {
      const a = supplierAgg.get(st.id);
      return {
        eventId: st.event_id,
        booth: st.booth_number ?? '',
        name: st.name,
        category: st.category ?? '',
        venue: eventName.get(st.event_id) ?? st.event_id,
        email: st.email ?? '',
        contact: st.contact ?? '',
        salesPhp: a?.sales ?? 0,
        transactions: a?.txCount ?? 0,
        buyers: a?.buyers.size ?? 0,
        boothVisits: a?.visits ?? 0,
        visitors: a?.visitors.size ?? 0,
        prizesSponsored: a?.prizes ?? 0,
      };
    })
    .sort((a, b) => b.salesPhp - a.salesPhp || b.boothVisits - a.boothVisits);

  // ── Prizes and winners ──────────────────────────────────────────────────
  const eventVenue = new Map(events.map((e) => [e.id, e.venue ?? '']));
  const drawDay = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
        })
      : '';
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const prizeRows: PrizeExportRow[] = prizes
    .map((pz) => {
      const w = pz.winner_guest_id ? guestById.get(pz.winner_guest_id) : undefined;
      return {
        eventId: pz.event_id,
        season: pz.event_id.startsWith('evt_fiad_s2_') ? 'Season 2' : 'Season 1',
        prize: pz.name,
        venue: eventName.get(pz.event_id) ?? pz.event_id,
        location: eventVenue.get(pz.event_id) || (eventName.get(pz.event_id) ?? pz.event_id),
        drawDate: drawDay(pz.scheduled_at || pz.drawn_at),
        scheduledAt: pz.scheduled_at ?? '',
        drawnAt: pz.drawn_at ?? '',
        status: pz.winner_guest_id ? 'Drawn' : 'Not drawn',
        winnerName: w?.name ?? '',
        winnerEmail: w?.email ?? '',
        winnerMobile: w?.mobile ?? '',
        ticketNumber: pz.winning_ticket_number ?? '',
        sponsor: pz.sponsored_by_store_id
          ? (storeById.get(pz.sponsored_by_store_id)?.name ?? '')
          : '',
        isGrand: !!pz.is_grand,
      };
    })
    // Newest season first, then by schedule within it.
    .sort((a, b) =>
      b.season.localeCompare(a.season) ||
      a.location.localeCompare(b.location) ||
      (a.scheduledAt || '').localeCompare(b.scheduledAt || ''));

  // ── Attendance ──────────────────────────────────────────────────────────
  // From check_ins, the append-only door log, so it survives the daily reset
  // that clears guests.checked_in_at.
  const attendanceRows: AttendanceExportRow[] = checkIns
    .map((c) => {
      const g = guestById.get(c.guest_id);
      return {
        eventId: g?.event_id ?? '',
        day: phDay(c.checked_in_at),
        time: c.checked_in_at,
        name: g?.name ?? 'Removed guest',
        email: g?.email ?? '',
        mobile: g?.mobile ?? '',
        venue: g ? (eventName.get(g.event_id) ?? g.event_id) : '',
      };
    })
    .sort((a, b) => b.time.localeCompare(a.time));

  // ── Raffle entries ──────────────────────────────────────────────────────
  const entryRows: EntryExportRow[] = entries
    .map((e) => {
      const g = guestById.get(e.guest_id);
      return {
        eventId: e.event_id,
        ticketNumber: e.ticket_number,
        guestName: g?.name ?? 'Removed guest',
        guestEmail: g?.email ?? '',
        venue: eventName.get(e.event_id) ?? e.event_id,
        source: e.is_complimentary ? 'Complimentary' : 'Paid',
        complimentary: !!e.is_complimentary,
        createdAt: e.created_at,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const signupRows: SupplierSignupExportRow[] = signups
    .map((v) => ({
      season: v.season ?? '',
      createdAt: v.created_at,
      businessName: v.business_name,
      contactPerson: v.contact_person ?? '',
      email: v.email ?? '',
      mobile: v.mobile ?? '',
      category: v.category ?? '',
      social: v.social ?? '',
      products: v.products ?? '',
      message: v.message ?? '',
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    events: events.map((e) => ({ id: e.id, name: e.name })),
    guests: guestRows,
    transactions: txRows,
    suppliers: supplierRows,
    prizes: prizeRows,
    attendance: attendanceRows,
    entries: entryRows,
    supplierSignups: signupRows,
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
