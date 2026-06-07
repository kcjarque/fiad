import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { listTransactions } from '../../services/transactionService';
import { listGuests } from '../../services/guestService';
import { listStores } from '../../services/storeService';
import { totalEntries } from '../../services/raffleService';
import { listOverrides } from '../../services/overrideService';
import { stampActivity } from '../../services/passportService';
import { peso } from '../../utils/id';

function Stat({ label, value, tone = 'plum' }: { label: string; value: React.ReactNode; tone?: 'plum' | 'coral' | 'champagne' }) {
  const bg = tone === 'coral' ? 'bg-coral text-white' : tone === 'champagne' ? 'bg-champagne text-plum' : 'bg-plum text-cream';
  return (
    <div className={`rounded-2xl p-4 md:p-5 shadow-soft ${bg}`}>
      <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-display text-2xl md:text-3xl mt-1 leading-tight">{value}</div>
    </div>
  );
}

export function AdminDashboard() {
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => listTransactions() });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: entries = 0 } = useQuery({ queryKey: ['raffle', 'total'], queryFn: totalEntries });
  const { data: pendingOverrides = [] } = useQuery({
    queryKey: ['overrides', 'pending'],
    queryFn: () => listOverrides({ status: 'pending' }),
  });
  const { data: stamps = { guestIds: new Set<string>(), totalStamps: 0 } } = useQuery({
    queryKey: ['stampActivity'],
    queryFn: stampActivity,
  });

  const approvedTxs = useMemo(() => transactions.filter((t) => t.status === 'approved'), [transactions]);
  const totalRevenue = approvedTxs.reduce((sum, t) => sum + t.amount, 0);

  // "Attended + used the app" = distinct guests who either stamped a booth
  // (requires login + physically scanning a QR) or made a transaction.
  // This is our best proxy — the app has no raw pageview analytics, and
  // many guests registered through the GHL funnel without opening the app.
  const attendedGuestIds = useMemo(() => {
    const ids = new Set(stamps.guestIds);
    for (const t of transactions) ids.add(t.guestId);
    return ids;
  }, [stamps.guestIds, transactions]);
  const attendedCount = attendedGuestIds.size;
  const attendedPct = guests.length ? Math.round((attendedCount / guests.length) * 100) : 0;
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
        <Stat label="Registered Guests" value={guests.length} />
        <Stat label="Attended (used app)" value={attendedCount} tone="coral" />
        <Stat label="Approved Sales" value={peso(totalRevenue)} tone="champagne" />
        <Stat label="Raffle Entries" value={entries} />
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
          <div className="font-display text-xl mb-3">Event Overview</div>
          <div className="text-sm text-plum/70 space-y-1">
            <div>Registered guests: <strong>{guests.length}</strong></div>
            <div>Attended &amp; used the app: <strong>{attendedCount}</strong> <span className="text-plum/50">({attendedPct}% of registered)</span></div>
            <div>Booth scans (passport stamps): <strong>{stamps.totalStamps}</strong></div>
            <div>Pending overrides: <strong>{pendingOverrides.length}</strong></div>
            <div className="pt-1 border-t border-plum/10 mt-1">Active stores: <strong>{stores.length}</strong></div>
            <div>Approved transactions: <strong>{approvedTxs.length}</strong></div>
            <div>Avg basket: <strong>{peso(approvedTxs.length ? totalRevenue / approvedTxs.length : 0)}</strong></div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
