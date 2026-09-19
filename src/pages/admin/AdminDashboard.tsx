import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { listTransactions } from '../../services/transactionService';
import { listGuests } from '../../services/guestService';
import { listStores } from '../../services/storeService';
import { totalEntries } from '../../services/raffleService';
import { listOverrides } from '../../services/overrideService';
import { stampActivity } from '../../services/passportService';
import { getEventById } from '../../services/eventService';
import { listCheckIns, phDay } from '../../services/checkInService';
import { peso } from '../../utils/id';
import { useEventStore } from '../../stores/eventStore';

function Stat({
  label,
  value,
  sub,
  tone = 'plum',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'plum' | 'coral' | 'champagne';
}) {
  const bg = tone === 'coral' ? 'bg-coral text-white' : tone === 'champagne' ? 'bg-champagne text-plum' : 'bg-plum text-cream';
  return (
    <div className={`rounded-2xl p-4 md:p-5 shadow-soft ${bg}`}>
      <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-display text-2xl md:text-3xl mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[11px] md:text-xs opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

export function AdminDashboard() {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: guests = [] } = useQuery({ queryKey: ['guests', selectedEventId], queryFn: listGuests });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions', selectedEventId], queryFn: () => listTransactions() });
  const { data: stores = [] } = useQuery({ queryKey: ['stores', selectedEventId], queryFn: listStores });
  const { data: entries = 0 } = useQuery({ queryKey: ['raffle', 'total', selectedEventId], queryFn: totalEntries });
  const { data: pendingOverrides = [] } = useQuery({
    queryKey: ['overrides', 'pending'],
    queryFn: () => listOverrides({ status: 'pending' }),
  });
  const { data: stamps = { guestIds: new Set<string>(), totalStamps: 0 } } = useQuery({
    queryKey: ['stampActivity', selectedEventId],
    queryFn: stampActivity,
  });
  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns', selectedEventId],
    queryFn: () => listCheckIns(selectedEventId),
    refetchInterval: 30_000,
  });
  // The event's own date is the walk-in boundary. Reading it from the row
  // rather than hardcoding a season keeps this correct for every venue.
  const { data: event } = useQuery({
    queryKey: ['event', selectedEventId],
    queryFn: () => getEventById(selectedEventId),
  });

  const approvedTxs = useMemo(() => transactions.filter((t) => t.status === 'approved'), [transactions]);
  const totalRevenue = approvedTxs.reduce((sum, t) => sum + t.amount, 0);

  // Attendance comes from check_ins (0076), the append-only door log — not
  // from guests.checked_in_at, which only says who is checked in right now
  // and is cleared by the daily reset.
  const attendedGuestIds = useMemo(
    () => new Set(checkIns.map((c) => c.guestId)),
    [checkIns],
  );
  const attendedCount = attendedGuestIds.size;
  const attendedPct = guests.length ? Math.round((attendedCount / guests.length) * 100) : 0;
  // Guests who came through the door today, for a two-day venue where the
  // running total alone doesn't say how the current day is going.
  const todayPh = phDay(new Date().toISOString());
  const attendedToday = useMemo(
    () => new Set(checkIns.filter((c) => phDay(c.checkedInAt) === todayPh).map((c) => c.guestId)).size,
    [checkIns, todayPh],
  );
  // Distinct guests who actually opened the app on-site — stamped a booth or
  // transacted. Was previously labelled "checked in"; it measures engagement,
  // not attendance, so it is now reported as its own line.
  const appUsers = useMemo(() => {
    const ids = new Set(stamps.guestIds);
    for (const t of transactions) ids.add(t.guestId);
    return ids.size;
  }, [stamps.guestIds, transactions]);

  // Walk-ins = guests who registered on an event day. The boundary is the
  // event's own date in PH time, so each venue counts its own day-of sign-ups.
  const eventDate = event?.date;
  const walkIns = useMemo(() => {
    if (!eventDate) return 0;
    return guests.filter((g) => phDay(g.registeredAt) >= eventDate).length;
  }, [guests, eventDate]);
  const preRegistered = guests.length - walkIns;
  const perStore = stores
    .map((s) => ({
      store: s,
      total: approvedTxs.filter((t) => t.storeId === s.id).reduce((sum, t) => sum + t.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-1">Dashboard</h1>
      <p className="text-plum/60 mb-4 md:mb-6 text-sm md:text-base">Live event performance</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Registered Guests" value={guests.length} sub={`${preRegistered} pre · ${walkIns} walk-in`} />
        <Stat
          label="Checked In"
          value={attendedCount}
          sub={`${attendedPct}% show-up rate · ${attendedToday} today`}
          tone="coral"
        />
        <Stat label="Sales (Down Payments)" value={peso(totalRevenue)} tone="champagne" />
        <Stat label="Walk-Ins (day-of)" value={walkIns} />
      </div>

      <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-display text-xl mb-3">Top Stores by Revenue</div>
          <div className="space-y-2">
            {perStore.map((s, i) => (
              <div key={s.store.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-plum/50 mr-2">#{i + 1}</span>
                  {s.store.name}
                </div>
                <div className="font-medium">{peso(s.total)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="font-display text-xl mb-3">Registration &amp; Attendance</div>
          <div className="text-sm text-plum/70 space-y-1">
            <div>Total registered: <strong>{guests.length}</strong></div>
            <div className="pl-3 text-plum/60">Pre-registered: <strong>{preRegistered}</strong></div>
            <div className="pl-3 text-plum/60">Walk-in (registered day-of): <strong>{walkIns}</strong></div>
            <div className="pt-1 border-t border-plum/10 mt-1">
              Checked in at the door: <strong>{attendedCount}</strong>{' '}
              <span className="text-plum/50">— {attendedPct}% show-up rate</span>
            </div>
            <div className="pl-3 text-plum/60">Checked in today: <strong>{attendedToday}</strong></div>
            <div className="pl-3 text-plum/60">Used the app on-site: <strong>{appUsers}</strong></div>
            <div className="pl-3 text-plum/60">Booth scans (passport stamps): <strong>{stamps.totalStamps}</strong></div>
            <div className="pt-1 border-t border-plum/10 mt-1">
              Down payments collected: <strong>{peso(totalRevenue)}</strong>
            </div>
            <div className="pl-3 text-plum/60">Approved transactions: <strong>{approvedTxs.length}</strong></div>
            <div className="pl-3 text-plum/60">Avg payment: <strong>{peso(approvedTxs.length ? totalRevenue / approvedTxs.length : 0)}</strong></div>
            <div className="pt-1 border-t border-plum/10 mt-1">
              Raffle entries: <strong>{entries}</strong> · Active stores: <strong>{stores.length}</strong> · Pending overrides: <strong>{pendingOverrides.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
