import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScanLine, Search } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listStores } from '../../services/storeService';
import { listTransactions } from '../../services/transactionService';
import { listGuests } from '../../services/guestService';
import { allStamps } from '../../services/passportService';
import { Modal } from '../../components/shared/Modal';
import { peso } from '../../utils/id';
import { useEventStore } from '../../stores/eventStore';

type SortKey = 'alpha' | 'sales' | 'scans';

type Row = {
  storeId: string;
  name: string;
  booth: string;
  sales: number;
  orders: number;
  aov: number;
  scans: number;
  scannerGuestIds: string[];
};

export function AdminSupplierSales() {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: stores = [] } = useQuery({ queryKey: ['stores', selectedEventId], queryFn: listStores });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions', selectedEventId], queryFn: () => listTransactions() });
  const { data: guests = [] } = useQuery({ queryKey: ['guests', selectedEventId], queryFn: listGuests });
  const { data: stamps = [] } = useQuery({ queryKey: ['allStamps', selectedEventId], queryFn: allStamps });

  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const [sort, setSort] = useState<SortKey>('sales');
  const [query, setQuery] = useState('');
  const [scannersFor, setScannersFor] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const approved = transactions.filter((t) => t.status === 'approved');

    // Aggregate transactions per store.
    const txByStore = new Map<string, { sales: number; orders: number }>();
    for (const t of approved) {
      const agg = txByStore.get(t.storeId) ?? { sales: 0, orders: 0 };
      agg.sales += t.amount;
      agg.orders += 1;
      txByStore.set(t.storeId, agg);
    }

    // Aggregate scans (passport stamps) per store + distinct scanners.
    const scansByStore = new Map<string, Set<string>>();
    for (const s of stamps) {
      const set = scansByStore.get(s.storeId) ?? new Set<string>();
      set.add(s.guestId);
      scansByStore.set(s.storeId, set);
    }
    const scanCountByStore = new Map<string, number>();
    for (const s of stamps) scanCountByStore.set(s.storeId, (scanCountByStore.get(s.storeId) ?? 0) + 1);

    return stores.map((store) => {
      const tx = txByStore.get(store.id) ?? { sales: 0, orders: 0 };
      const scannerSet = scansByStore.get(store.id) ?? new Set<string>();
      return {
        storeId: store.id,
        name: store.name,
        booth: store.boothNumber,
        sales: tx.sales,
        orders: tx.orders,
        aov: tx.orders ? Math.round(tx.sales / tx.orders) : 0,
        scans: scanCountByStore.get(store.id) ?? 0,
        scannerGuestIds: [...scannerSet],
      };
    });
  }, [stores, transactions, stamps]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.booth.toLowerCase().includes(q)) : rows;
    const sorted = [...filtered];
    if (sort === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'sales') sorted.sort((a, b) => b.sales - a.sales);
    else sorted.sort((a, b) => b.scans - a.scans);
    return sorted;
  }, [rows, sort, query]);

  const totals = useMemo(
    () => ({
      sales: rows.reduce((s, r) => s + r.sales, 0),
      orders: rows.reduce((s, r) => s + r.orders, 0),
      scans: rows.reduce((s, r) => s + r.scans, 0),
    }),
    [rows],
  );

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Supplier Sales</h1>
          <p className="text-sm text-plum/60 mt-1">
            {peso(totals.sales)} sales · {totals.orders} orders · {totals.scans} booth scans
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
            <input
              className="input !pl-9 sm:!w-56"
              placeholder="Search supplier"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input sm:!w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="sales">Sort: Sales (high→low)</option>
            <option value="scans">Sort: Scans (high→low)</option>
            <option value="alpha">Sort: A → Z</option>
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredSorted.map((r) => (
          <div key={r.storeId} className="card !p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-plum/50">Booth {r.booth}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-lg text-plum leading-none">{peso(r.sales)}</div>
                <div className="text-[10px] text-plum/50 uppercase tracking-wider">sales</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-semibold text-plum">{r.orders}</div><div className="text-plum/50">orders</div></div>
              <div><div className="font-semibold text-plum">{peso(r.aov)}</div><div className="text-plum/50">AOV</div></div>
              <button onClick={() => setScannersFor(r)} className="text-coral">
                <div className="font-semibold">{r.scans}</div><div className="text-coral/70">scans</div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-plum/60 border-b border-plum/10">
              <th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Booth</th>
              <th className="py-2 pr-4 text-right">Sales</th>
              <th className="py-2 pr-4 text-right">Orders</th>
              <th className="py-2 pr-4 text-right">AOV</th>
              <th className="py-2 pr-4 text-right">Scans</th>
              <th className="py-2 text-right">Customers</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((r) => (
              <tr key={r.storeId} className="border-b border-plum/5 last:border-0">
                <td className="py-2 pr-4 font-medium">{r.name}</td>
                <td className="py-2 pr-4 text-plum/60">{r.booth}</td>
                <td className="py-2 pr-4 text-right font-medium">{peso(r.sales)}</td>
                <td className="py-2 pr-4 text-right">{r.orders}</td>
                <td className="py-2 pr-4 text-right">{peso(r.aov)}</td>
                <td className="py-2 pr-4 text-right text-coral font-medium">{r.scans}</td>
                <td className="py-2 text-right">
                  {r.scannerGuestIds.length > 0 ? (
                    <button onClick={() => setScannersFor(r)} className="text-coral inline-flex items-center gap-1">
                      <ScanLine size={13} /> {r.scannerGuestIds.length}
                    </button>
                  ) : (
                    <span className="text-plum/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scanners modal */}
      <Modal
        open={!!scannersFor}
        onClose={() => setScannersFor(null)}
        title={scannersFor ? `${scannersFor.name} — ${scannersFor.scannerGuestIds.length} scanners` : ''}
        size="sm"
      >
        {scannersFor && (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {scannersFor.scannerGuestIds.length === 0 && (
              <div className="text-plum/50 text-sm text-center py-6">No scans yet for this booth.</div>
            )}
            {scannersFor.scannerGuestIds
              .map((id) => guestsById.get(id))
              .filter((g): g is NonNullable<typeof g> => !!g)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm py-1.5 border-b border-plum/5 last:border-0">
                  <span className="font-medium text-plum">{g.name}</span>
                  <span className="text-plum/50 text-xs">{g.email}</span>
                </div>
              ))}
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
