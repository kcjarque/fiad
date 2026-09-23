import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, ArrowUpDown, RefreshCw, Database, Users, Wallet, MessageSquare, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import {
  buildExportBundle,
  toCsv,
  downloadCsv,
  type ExportBundle,
} from '../../services/exportService';
import { peso } from '../../utils/id';
import { SUPPLIERS } from '../../constants/suppliers';
import './AdminExport.css';

/**
 * One place to pull everything out of the system.
 *
 * Cross-event on purpose: the client's brief asks whether a person came to
 * Brittany, Mella or both, which no single-event view can answer.
 */

type ColumnType = 'text' | 'number' | 'date' | 'bool';

const EXPORT_TABS = [
  { id: 'guests', label: 'Guest directory' },
  { id: 'inquiries', label: 'Inquiries' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'suppliers', label: 'Supplier performance' },
  { id: 'attendance', label: 'Attendance log' },
  { id: 'entries', label: 'Raffle entries' },
  { id: 'prizes', label: 'Prizes & winners' },
  { id: 'supplierSignups', label: 'Supplier sign-ups' },
  { id: 'sms', label: 'SMS breakdown' },
] as const;
type ExportTab = typeof EXPORT_TABS[number]['id'];

type Column<T> = {
  key: keyof T & string;
  label: string;
  type?: ColumnType;
  /** Rendered value; defaults to the raw field. */
  render?: (row: T) => React.ReactNode;
};

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

const fmtDay = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

/** A sortable, searchable, downloadable table over one dataset. */
function DataSet<T extends Record<string, unknown>>({
  title,
  description,
  rows,
  columns,
  filename,
  defaultSort,
  filters,
  tabId,
  activeTab,
}: {
  tabId: ExportTab;
  activeTab: ExportTab;
  title: string;
  description: string;
  rows: T[];
  columns: Column<T>[];
  filename: string;
  defaultSort?: { key: keyof T & string; dir: 'asc' | 'desc' };
  filters?: {
    label: string;
    allLabel: string;
    options: readonly string[];
    matches: (row: T, value: string) => boolean;
  }[];
}) {
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 'asc' | 'desc' }>(
    defaultSort ?? { key: columns[0].key, dir: 'asc' },
  );
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      (!filters || filters.every((filter) => !filterValues[filter.label] || filter.matches(r, filterValues[filter.label]))) &&
      (!q || columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))),
    );
  }, [rows, columns, query, filters, filterValues]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    const t = col?.type ?? 'text';
    const mul = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (t === 'number') return (Number(x) - Number(y)) * mul;
      if (t === 'bool') return (Number(!!x) - Number(!!y)) * mul;
      // Dates are ISO strings, so lexical order is chronological.
      return String(x ?? '').localeCompare(String(y ?? '')) * mul;
    });
  }, [filtered, columns, sort]);

  const toggleSort = (key: keyof T & string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // Download follows the current sort and filter — what you see is what you get.
  const download = () => {
    // Booleans go out as Yes/No rather than true/false, so a cell reads the
    // same in the spreadsheet as it does on screen. Timestamps stay ISO on
    // purpose: Excel sorts and filters those correctly, where the formatted
    // "Sep 20, 2026, 7:03 PM" is just text.
    const cell = (c: Column<T>, r: T) =>
      c.type === 'bool' ? (r[c.key] ? 'Yes' : 'No') : (r[c.key] as string | number);
    const csv = toCsv(
      columns.map((c) => c.label),
      sorted.map((r) => columns.map((c) => cell(c, r))),
    );
    downloadCsv(filename, csv);
  };

  const PREVIEW = 25;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PREVIEW));
  const currentPage = Math.min(page, totalPages);
  const shown = sorted.slice((currentPage - 1) * PREVIEW, currentPage * PREVIEW);

  return (
    <section
      id={`export-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`export-tab-${tabId}`}
      hidden={activeTab !== tabId}
      tabIndex={0}
      className="export-panel"
    >
      <div className="export-panel-header">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-plum">{title}</h2>
            <p className="text-sm text-plum/60 mt-1 max-w-2xl leading-relaxed">{description}</p>
          </div>
          <button
            className="btn-primary !rounded-xl !px-4 !py-2.5 text-sm inline-flex items-center gap-2 shrink-0"
            onClick={download}
            disabled={sorted.length === 0}
          >
            <Download size={15} aria-hidden="true" />
            Export CSV <span className="opacity-75">({sorted.length.toLocaleString()})</span>
          </button>
        </div>
        <div className="export-toolbar">
        <div className="relative w-full sm:flex-1 sm:min-w-48 sm:max-w-sm">
          <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
          <input
            className="input !pl-9 !py-2 text-sm"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            aria-label={`Search ${title}`}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        {filters?.map((filter) => (
          <label key={filter.label} className="flex items-center gap-2 text-xs font-medium text-plum/60 w-full sm:w-auto sm:max-w-sm">
            <span className="shrink-0">{filter.label}</span>
            <select
              className="input !py-2 text-sm"
              value={filterValues[filter.label] ?? ''}
              onChange={(e) => { setFilterValues((values) => ({ ...values, [filter.label]: e.target.value })); setPage(1); }}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
        {(query || Object.values(filterValues).some(Boolean)) && (
          <button className="text-xs font-medium text-coral hover:underline" onClick={() => { setQuery(''); setFilterValues({}); setPage(1); }}>
            Clear filters
          </button>
        )}
        </div>
          <p className="mt-3 text-xs text-plum/50" aria-live="polite">
            Showing {sorted.length.toLocaleString()} of {rows.length.toLocaleString()} rows
          </p>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-plum/55">
          {rows.length === 0 ? 'Nothing recorded yet.' : 'No rows match the selected filters or search.'}
        </div>
      ) : (
        <>
          <div className="export-table-scroll">
            <table className="export-table">
              <thead>
                <tr className="bg-plum/5 text-left">
                  {columns.map((c) => (
                    <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 font-medium text-plum/70 whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1 hover:text-coral"
                        onClick={() => toggleSort(c.key)}
                      >
                        {c.label}
                        <ArrowUpDown
                          size={12}
                          aria-hidden="true"
                          className={sort.key === c.key ? 'text-coral' : 'text-plum/25'}
                        />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-plum/8">
                {shown.map((r, i) => (
                  <tr key={i} className="hover:bg-cream/60">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 align-top text-plum/80">
                        {c.render ? c.render(r) : String(r[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="export-pagination">
            <span>{((currentPage - 1) * PREVIEW + 1).toLocaleString()}–{Math.min(currentPage * PREVIEW, sorted.length).toLocaleString()} of {sorted.length.toLocaleString()} results</span>
            <div className="flex items-center gap-3">
              <button className="export-page-button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>
              <span>Page {currentPage} of {totalPages}</span>
              <button className="export-page-button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Season/venue segmentation.
 *
 * Matches on event id rather than the venue label, because the label is a
 * display string ("FIAD Season 2 · Mella Hotel Las Piñas") and matching on it
 * would break the moment a venue is renamed.
 */
type VenueFilter = { id: string; label: string; eventIds: string[] };

/** Does this row belong to the selected venue? A row carries either one event
 *  id, or several when it represents a person who attended more than one. */
const inFilter = (
  row: { eventId?: string; eventIds?: string[] },
  f: VenueFilter,
): boolean => {
  if (f.eventIds.length === 0) return true; // "All"
  const ids = row.eventIds ?? (row.eventId ? [row.eventId] : []);
  // A row with no event at all (an inquiry submitted before venues existed)
  // only shows under All, rather than being silently attributed to a venue.
  if (ids.length === 0) return false;
  return ids.some((id) => f.eventIds.includes(id));
};

export function AdminExport() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<ExportBundle>({
    queryKey: ['exportBundle'],
    queryFn: buildExportBundle,
    // The full pull is several thousand rows across nine tables; don't redo it
    // on every window focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const [venueId, setVenueId] = useState('all');
  const [activeTab, setActiveTab] = useState<ExportTab>('guests');

  // Built from the events table, so a Season 3 venue appears here on its own
  // rather than needing this list edited.
  const filters: VenueFilter[] = useMemo(() => {
    const evs = data?.events ?? [];
    const s2 = evs.filter((e) => e.id.startsWith('evt_fiad_s2_'));
    const s1 = evs.filter((e) => !e.id.startsWith('evt_fiad_s2_'));
    const short = (name: string) =>
      name.includes('·') ? name.split('·').pop()!.trim() : name.split('|')[0].trim();
    return [
      { id: 'all', label: 'All data', eventIds: [] },
      ...(s2.length
        ? [{ id: 's2', label: 'Season 2 — both venues', eventIds: s2.map((e) => e.id) }]
        : []),
      ...s2.map((e) => ({ id: e.id, label: short(e.name), eventIds: [e.id] })),
      ...s1.map((e) => ({ id: e.id, label: `Season 1 — ${short(e.name)}`, eventIds: [e.id] })),
    ];
  }, [data?.events]);

  const active = filters.find((f) => f.id === venueId) ?? filters[0];

  // Every dataset narrowed to the selected venue, so the tables, the totals
  // and the CSV all agree.
  const view = useMemo(() => {
    if (!data) return null;
    const f = active;
    return {
      guests: data.guests.filter((r) => inFilter(r, f)),
      transactions: data.transactions.filter((r) => inFilter(r, f)),
      suppliers: data.suppliers.filter((r) => inFilter(r, f)),
      prizes: data.prizes.filter((r) => inFilter(r, f)),
      attendance: data.attendance.filter((r) => inFilter(r, f)),
      entries: data.entries.filter((r) => inFilter(r, f)),
      sms: data.sms.filter((r) => inFilter(r, f)),
      inquiries: data.inquiries.filter((r) => inFilter(r, f)),
      // Vendor applications come from the public /suppliers page and are not
      // tied to a venue, so they are never narrowed — hiding them under a
      // venue filter would imply an association that does not exist.
      supplierSignups: data.supplierSignups,
    };
  }, [data, active]);

  // Suffix so a Brittany CSV isn't indistinguishable from a Mella one on disk.
  const slug =
    active.id === 'all'
      ? ''
      : `-${active.label
          // Fold diacritics first, so "Las Piñas" becomes "las-pinas" rather
          // than losing the n entirely and reading "las-pi-as".
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`;

  const venueCounts = useMemo(() => {
    const m = { Brittany: 0, Mella: 0, Both: 0, 'Season 1': 0 } as Record<string, number>;
    for (const g of view?.guests ?? []) m[g.venue] = (m[g.venue] ?? 0) + 1;
    return m;
  }, [view]);

  const salesTotal = useMemo(
    () => (view?.transactions ?? []).filter((t) => t.status === 'approved').reduce((n, t) => n + t.amountPhp, 0),
    [view],
  );
  const smsTotals = useMemo(() => {
    const sent = (view?.sms ?? []).filter((r) => r.status === 'sent');
    return {
      messages: sent.reduce((n, r) => n + r.messages, 0),
      segments: sent.reduce((n, r) => n + r.segments, 0),
      costPhp: sent.reduce((n, r) => n + r.costPhp, 0),
    };
  }, [view]);

  return (
    <AdminShell>
      <div className="data-export">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4 md:mb-6">
        <div>
          <div className="export-eyebrow"><Database size={13} aria-hidden="true" /> REPORTING & INSIGHTS</div>
          <h1 className="text-3xl font-semibold tracking-tight text-plum mt-2">Data export</h1>
          <p className="text-sm text-plum/60 mt-1 max-w-2xl">
            Choose a tab to browse and export data across venues and seasons.
            CSV downloads follow the selected table’s filters, search, and sort.
          </p>
        </div>
        <button
          className="btn-ghost !rounded-xl !bg-white !px-4 !py-2.5 text-sm border border-plum/10 text-plum inline-flex items-center gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={14} aria-hidden="true" className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {data && filters.length > 1 && (
        <div className="export-scope">
          <label htmlFor="export-venue" className="text-sm font-medium text-plum">Venue & season</label>
          <select id="export-venue" className="input !py-2 text-sm w-full sm:!w-auto sm:max-w-md" value={active.id} onChange={(event) => setVenueId(event.target.value)}>
            {filters.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
          </select>
          <span className="text-xs text-plum/50 sm:ml-auto">Applies across all tabs</span>
        </div>
      )}

      {error && (
        <div className="card mb-6 border border-red-200 bg-red-50 text-sm text-red-700">
          Couldn't load the data: {(error as Error).message}
        </div>
      )}

      {isLoading || !data || !view ? (
        <div className="card text-center py-14 text-plum/60">Pulling every table…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="export-stat export-stat--people">
              <div className="export-stat-label">People <Users size={17} aria-hidden="true" /></div>
              <div className="text-2xl font-semibold tracking-tight mt-3 tabular-nums">{view.guests.length.toLocaleString()}</div>
              <div className="text-xs text-plum/50 mt-1.5">
                {venueCounts.Brittany} Brittany · {venueCounts.Mella} Mella · {venueCounts.Both} both
              </div>
            </div>
            <div className="export-stat export-stat--sales">
              <div className="export-stat-label">Sales <Wallet size={17} aria-hidden="true" /></div>
              <div className="text-2xl font-semibold tracking-tight mt-3 tabular-nums">{peso(salesTotal)}</div>
              <div className="text-xs text-plum/50 mt-1.5">{view.transactions.length} transactions</div>
            </div>
            <div className="export-stat export-stat--sms">
              <div className="export-stat-label">SMS sent <MessageSquare size={17} aria-hidden="true" /></div>
              <div className="text-2xl font-semibold tracking-tight mt-3 tabular-nums">{smsTotals.messages.toLocaleString()}</div>
              <div className="text-xs text-plum/50 mt-1.5">
                {smsTotals.segments.toLocaleString()} segments · {peso(smsTotals.costPhp)}
              </div>
            </div>
            <div className="export-stat export-stat--inquiries">
              <div className="export-stat-label">Inquiries <Inbox size={17} aria-hidden="true" /></div>
              <div className="text-2xl font-semibold tracking-tight mt-3 tabular-nums">{view.inquiries.length.toLocaleString()}</div>
              <div className="text-xs text-plum/50 mt-1.5">from the RSVP funnel</div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Export datasets"
            className="export-tabs"
          >
            {EXPORT_TABS.map((tab, index) => (
              <button
                key={tab.id}
                id={`export-tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`export-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  let nextIndex: number;
                  if (event.key === 'ArrowRight') nextIndex = (index + 1) % EXPORT_TABS.length;
                  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + EXPORT_TABS.length) % EXPORT_TABS.length;
                  else if (event.key === 'Home') nextIndex = 0;
                  else if (event.key === 'End') nextIndex = EXPORT_TABS.length - 1;
                  else return;
                  event.preventDefault();
                  const next = EXPORT_TABS[nextIndex].id;
                  setActiveTab(next);
                  document.getElementById(`export-tab-${next}`)?.focus();
                }}
                className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-[-2px] ${
                  activeTab === tab.id
                    ? 'border-plum/10 bg-white text-plum font-semibold shadow-sm'
                    : 'border-transparent text-plum/65 hover:bg-white/60 hover:text-plum'
                }`}
              >
                {tab.label}
                <span className="rounded-full bg-plum/5 px-2 py-0.5 text-xs text-plum/60">
                  {view[tab.id].length.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          <DataSet
            tabId="guests"
            activeTab={activeTab}
            title="Guest directory"
            description="Unique guests across venues. Looking for shows requested services; Suppliers engaged shows booths visited or purchased from."
            rows={view.guests}
            filters={[{
              label: 'Booked day',
              allLabel: 'All booked days',
              options: ['Day 1', 'Day 2', 'Both days', 'Not specified'],
              matches: (row, value) => value === 'Not specified'
                ? !row.preferredDay
                : row.preferredDay === value ||
                  (value !== 'Both days' && row.preferredDay === 'Both days'),
            }, {
              label: 'Venue',
              allLabel: 'All venues',
              options: ['Brittany', 'Mella', 'Both venues', 'Season 1'],
              matches: (row, value) => value === 'Both venues'
                ? row.venue === 'Both'
                : row.venue === value ||
                  ((value === 'Brittany' || value === 'Mella') && row.venue === 'Both'),
            }]}
            filename={`fiad-guests${slug}.csv`}
            defaultSort={{ key: 'name', dir: 'asc' }}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'venue', label: 'Venue' },
              { key: 'preferredDay', label: 'Booked day' },
              { key: 'checkedIn', label: 'Attended', type: 'bool', render: (r) => (r.checkedIn ? 'Yes' : 'No') },
              { key: 'daysAttended', label: 'Days on site' },
              { key: 'lookingFor', label: 'Looking for (suppliers)' },
              { key: 'suppliers', label: 'Suppliers engaged' },
              { key: 'spentPhp', label: 'Spent', type: 'number', render: (r) => peso(r.spentPhp) },
              { key: 'entries', label: 'Entries', type: 'number' },
              { key: 'registeredAt', label: 'Registered', type: 'date', render: (r) => fmtDay(r.registeredAt) },
            ]}
          />

          <DataSet
            tabId="transactions"
            activeTab={activeTab}
            title="Transactions"
            description="Every down payment recorded at a booth, with the guest's contact details attached for follow-up."
            rows={view.transactions}
            filename={`fiad-transactions${slug}.csv`}
            defaultSort={{ key: 'timestamp', dir: 'desc' }}
            columns={[
              { key: 'timestamp', label: 'When', type: 'date', render: (r) => fmtDate(r.timestamp) },
              { key: 'guestName', label: 'Guest' },
              { key: 'guestEmail', label: 'Email' },
              { key: 'guestMobile', label: 'Mobile' },
              { key: 'venue', label: 'Venue' },
              { key: 'booth', label: 'Booth' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'category', label: 'Category' },
              { key: 'amountPhp', label: 'Amount', type: 'number', render: (r) => peso(r.amountPhp) },
              { key: 'entriesIssued', label: 'Entries', type: 'number' },
              { key: 'status', label: 'Status' },
            ]}
          />

          <DataSet
            tabId="suppliers"
            activeTab={activeTab}
            title="Supplier performance"
            description="Sales, unique buyers, and booth visits for each supplier."
            rows={view.suppliers}
            filename={`fiad-suppliers${slug}.csv`}
            defaultSort={{ key: 'salesPhp', dir: 'desc' }}
            columns={[
              { key: 'booth', label: 'Booth' },
              { key: 'name', label: 'Supplier' },
              { key: 'category', label: 'Category' },
              { key: 'venue', label: 'Venue' },
              { key: 'salesPhp', label: 'Sales', type: 'number', render: (r) => peso(r.salesPhp) },
              { key: 'transactions', label: 'Txns', type: 'number' },
              { key: 'buyers', label: 'Buyers', type: 'number' },
              { key: 'boothVisits', label: 'Booth scans', type: 'number' },
              { key: 'visitors', label: 'Visitors', type: 'number' },
              { key: 'prizesSponsored', label: 'Prizes given', type: 'number' },
              { key: 'email', label: 'Email' },
              { key: 'contact', label: 'Contact' },
            ]}
          />

          <DataSet
            tabId="prizes"
            activeTab={activeTab}
            title="Prizes & winners"
            description="Every raffle slot with its winner and their contact details, drawn or not."
            rows={view.prizes}
            filename={`fiad-prizes-winners${slug}.csv`}
            defaultSort={{ key: 'scheduledAt', dir: 'asc' }}
            columns={[
              { key: 'scheduledAt', label: 'Scheduled', type: 'date', render: (r) => fmtDate(r.scheduledAt) },
              { key: 'prize', label: 'Prize' },
              { key: 'venue', label: 'Venue' },
              { key: 'status', label: 'Status' },
              { key: 'winnerName', label: 'Winner' },
              { key: 'winnerEmail', label: 'Email' },
              { key: 'winnerMobile', label: 'Mobile' },
              { key: 'ticketNumber', label: 'Ticket' },
              { key: 'sponsor', label: 'Sponsor' },
              { key: 'isGrand', label: 'Grand', type: 'bool', render: (r) => (r.isGrand ? 'Yes' : '') },
            ]}
          />

          <DataSet
            tabId="attendance"
            activeTab={activeTab}
            title="Attendance log"
            description="Every door scan, from the append-only check-in log — so it survives the daily reset and still shows who was there on which day."
            rows={view.attendance}
            filename={`fiad-attendance${slug}.csv`}
            defaultSort={{ key: 'time', dir: 'desc' }}
            columns={[
              { key: 'day', label: 'Day' },
              { key: 'time', label: 'Time', type: 'date', render: (r) => fmtDate(r.time) },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'venue', label: 'Venue' },
            ]}
          />

          <DataSet
            tabId="entries"
            activeTab={activeTab}
            title="Raffle entries"
            description="Ticket-level detail — one row per entry, marked complimentary or paid."
            rows={view.entries}
            filename={`fiad-raffle-entries${slug}.csv`}
            defaultSort={{ key: 'createdAt', dir: 'desc' }}
            columns={[
              { key: 'ticketNumber', label: 'Ticket' },
              { key: 'guestName', label: 'Guest' },
              { key: 'guestEmail', label: 'Email' },
              { key: 'venue', label: 'Venue' },
              { key: 'source', label: 'Type' },
              { key: 'createdAt', label: 'Issued', type: 'date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />

          <DataSet
            tabId="supplierSignups"
            activeTab={activeTab}
            title="Supplier sign-ups"
            description="Vendor applications from the public /suppliers page — the pipeline for next season."
            rows={view.supplierSignups}
            filename={`fiad-supplier-signups${slug}.csv`}
            defaultSort={{ key: 'createdAt', dir: 'desc' }}
            columns={[
              { key: 'createdAt', label: 'When', type: 'date', render: (r) => fmtDate(r.createdAt) },
              { key: 'businessName', label: 'Business' },
              { key: 'contactPerson', label: 'Contact person' },
              { key: 'email', label: 'Email' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'category', label: 'Category' },
              { key: 'social', label: 'Social' },
              { key: 'products', label: 'Products' },
              { key: 'message', label: 'Message' },
            ]}
          />

          <DataSet
            tabId="sms"
            activeTab={activeTab}
            title="SMS breakdown"
            description="Grouped by message type, venue and outcome. Segments are what the carrier bills — a long message counts as several — and only sent messages cost anything."
            rows={view.sms}
            filename={`fiad-sms-breakdown${slug}.csv`}
            defaultSort={{ key: 'segments', dir: 'desc' }}
            columns={[
              { key: 'kind', label: 'Message type' },
              { key: 'event', label: 'Venue' },
              { key: 'status', label: 'Status' },
              { key: 'messages', label: 'Messages', type: 'number' },
              { key: 'segments', label: 'Segments', type: 'number' },
              { key: 'costPhp', label: 'Cost', type: 'number', render: (r) => peso(r.costPhp) },
              { key: 'firstSentAt', label: 'First', type: 'date', render: (r) => fmtDay(r.firstSentAt) },
              { key: 'lastSentAt', label: 'Last', type: 'date', render: (r) => fmtDay(r.lastSentAt) },
            ]}
          />

          <DataSet
            tabId="inquiries"
            activeTab={activeTab}
            title="Inquiries"
            description="Leads from the public RSVP funnel, including the ones who never completed a registration."
            rows={view.inquiries}
            filters={[{
              label: 'Supplier category',
              allLabel: 'All supplier categories',
              options: SUPPLIERS,
              matches: (row, value) => row.eventType.split(',').some((category) =>
                category.trim().toLowerCase() === value.toLowerCase() ||
                (value === 'Others' && category.trim().toLowerCase().startsWith('others:')),
              ),
            }]}
            filename={`fiad-inquiries${slug}.csv`}
            defaultSort={{ key: 'createdAt', dir: 'desc' }}
            columns={[
              { key: 'createdAt', label: 'When', type: 'date', render: (r) => fmtDate(r.createdAt) },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'partnerName', label: 'Partner' },
              { key: 'eventType', label: 'Looking for (suppliers)' },
              { key: 'eventDate', label: 'Target date' },
              { key: 'venue', label: 'Venue' },
              { key: 'message', label: 'Message' },
            ]}
          />
        </>
      )}
      </div>
    </AdminShell>
  );
}
