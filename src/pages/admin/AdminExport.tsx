import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import {
  buildExportBundle,
  toCsv,
  downloadCsv,
  type ExportBundle,
} from '../../services/exportService';
import { peso } from '../../utils/id';

/**
 * One place to pull everything out of the system.
 *
 * Cross-event on purpose: the client's brief asks whether a person came to
 * Brittany, Mella or both, which no single-event view can answer.
 */

type ColumnType = 'text' | 'number' | 'date' | 'bool';

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
}: {
  title: string;
  description: string;
  rows: T[];
  columns: Column<T>[];
  filename: string;
  defaultSort?: { key: keyof T & string; dir: 'asc' | 'desc' };
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 'asc' | 'desc' }>(
    defaultSort ?? { key: columns[0].key, dir: 'asc' },
  );
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)),
    );
  }, [rows, columns, query]);

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
    const csv = toCsv(
      columns.map((c) => c.label),
      sorted.map((r) => columns.map((c) => r[c.key] as string | number | boolean)),
    );
    downloadCsv(filename, csv);
  };

  const PREVIEW = 25;
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);

  return (
    <section className="card !p-0 overflow-hidden mb-6">
      <div className="p-4 md:p-5 border-b border-plum/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-plum">{title}</h2>
            <p className="text-sm text-plum/60 mt-0.5 max-w-2xl">{description}</p>
          </div>
          <button
            className="btn-primary !px-4 !py-2 text-sm inline-flex items-center gap-2 shrink-0"
            onClick={download}
            disabled={sorted.length === 0}
          >
            <Download size={15} aria-hidden="true" />
            CSV ({sorted.length.toLocaleString()})
          </button>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
          <input
            className="input !pl-9 !py-2 text-sm"
            placeholder={`Search ${rows.length.toLocaleString()} rows`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-plum/55">
          {rows.length === 0 ? 'Nothing recorded yet.' : 'No rows match that search.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-plum/5 text-left">
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium text-plum/70 whitespace-nowrap">
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
          {sorted.length > PREVIEW && (
            <button
              className="w-full py-2.5 text-sm text-plum/60 hover:text-coral border-t border-plum/10"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? 'Show less'
                : `Show all ${sorted.length.toLocaleString()} rows`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function AdminExport() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<ExportBundle>({
    queryKey: ['exportBundle'],
    queryFn: buildExportBundle,
    // The full pull is several thousand rows across nine tables; don't redo it
    // on every window focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const venueCounts = useMemo(() => {
    const m = { Brittany: 0, Mella: 0, Both: 0, 'Season 1': 0 } as Record<string, number>;
    for (const g of data?.guests ?? []) m[g.venue] = (m[g.venue] ?? 0) + 1;
    return m;
  }, [data]);

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4 md:mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Data export</h1>
          <p className="text-sm text-plum/60 mt-1 max-w-2xl">
            Everything in the system, across both venues and both seasons. Sort or
            search a table and the CSV follows — what you see is what downloads.
          </p>
        </div>
        <button
          className="btn-ghost text-sm border border-plum/15 text-plum inline-flex items-center gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={14} aria-hidden="true" className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card mb-6 border border-red-200 bg-red-50 text-sm text-red-700">
          Couldn't load the data: {(error as Error).message}
        </div>
      )}

      {isLoading || !data ? (
        <div className="card text-center py-14 text-plum/60">Pulling every table…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="rounded-2xl p-4 shadow-soft bg-plum text-cream">
              <div className="text-[10px] uppercase tracking-wider opacity-70">People</div>
              <div className="font-display text-2xl mt-1">{data.guests.length.toLocaleString()}</div>
              <div className="text-[11px] opacity-75 mt-0.5">
                {venueCounts.Brittany} Brittany · {venueCounts.Mella} Mella · {venueCounts.Both} both
              </div>
            </div>
            <div className="rounded-2xl p-4 shadow-soft bg-champagne text-plum">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Sales</div>
              <div className="font-display text-2xl mt-1">{peso(data.salesTotalPhp)}</div>
              <div className="text-[11px] opacity-75 mt-0.5">{data.transactions.length} transactions</div>
            </div>
            <div className="rounded-2xl p-4 shadow-soft bg-coral text-white">
              <div className="text-[10px] uppercase tracking-wider opacity-70">SMS sent</div>
              <div className="font-display text-2xl mt-1">{data.smsTotals.messages.toLocaleString()}</div>
              <div className="text-[11px] opacity-75 mt-0.5">
                {data.smsTotals.segments.toLocaleString()} segments · {peso(data.smsTotals.costPhp)}
              </div>
            </div>
            <div className="rounded-2xl p-4 shadow-soft bg-plum text-cream">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Inquiries</div>
              <div className="font-display text-2xl mt-1">{data.inquiries.length.toLocaleString()}</div>
              <div className="text-[11px] opacity-75 mt-0.5">from the RSVP funnel</div>
            </div>
          </div>

          <DataSet
            title="Guest directory"
            description="One row per person, not per registration — someone who signed up at both venues is collapsed into a single row marked Both. Looking for is what they ticked on the inquiry form; Suppliers engaged is the booths they actually visited or bought from."
            rows={data.guests}
            filename="fiad-guests.csv"
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
            title="Transactions"
            description="Every down payment recorded at a booth, with the guest's contact details attached for follow-up."
            rows={data.transactions}
            filename="fiad-transactions.csv"
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
            title="Supplier performance"
            description="What each booth got for being there: money taken, how many distinct people bought, and footfall from passport scans. Visits and buyers are separate on purpose — a busy booth that sold nothing is a different story from a quiet one that converted."
            rows={data.suppliers}
            filename="fiad-suppliers.csv"
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
            title="Prizes & winners"
            description="Every raffle slot with its winner and their contact details, drawn or not."
            rows={data.prizes}
            filename="fiad-prizes-winners.csv"
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
            title="Attendance log"
            description="Every door scan, from the append-only check-in log — so it survives the daily reset and still shows who was there on which day."
            rows={data.attendance}
            filename="fiad-attendance.csv"
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
            title="Raffle entries"
            description="Ticket-level detail — one row per entry, marked complimentary or paid."
            rows={data.entries}
            filename="fiad-raffle-entries.csv"
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
            title="Supplier sign-ups"
            description="Vendor applications from the public /suppliers page — the pipeline for next season."
            rows={data.supplierSignups}
            filename="fiad-supplier-signups.csv"
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
            title="SMS breakdown"
            description="Grouped by message type, venue and outcome. Segments are what the carrier bills — a long message counts as several — and only sent messages cost anything."
            rows={data.sms}
            filename="fiad-sms-breakdown.csv"
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
            title="Inquiries"
            description="Leads from the public RSVP funnel, including the ones who never completed a registration."
            rows={data.inquiries}
            filename="fiad-inquiries.csv"
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
    </AdminShell>
  );
}
