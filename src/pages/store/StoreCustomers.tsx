import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, Download, Search, BookHeart } from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { listTransactions } from '../../services/transactionService';
import { stampsForStore } from '../../services/passportService';
import { listGuests } from '../../services/guestService';
import { getStore } from '../../services/storeService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { peso, formatDate } from '../../utils/id';

type Row = {
  id: string; name: string; email?: string; mobile?: string;
  spent: number; entries: number; visited: boolean; lastAt: string;
};

export function StoreCustomers() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;

  const { data: store } = useQuery({ queryKey: ['store', storeId], queryFn: () => getStore(storeId) });
  const { data: txs = [] } = useQuery({ queryKey: ['transactions', 'store', storeId], queryFn: () => listTransactions({ storeId }) });
  const { data: stamps = [] } = useQuery({ queryKey: ['stamps', 'store', storeId], queryFn: () => stampsForStore(storeId) });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const gById = new Map(guests.map((g) => [g.id, g]));
    const m = new Map<string, Row>();
    const ensure = (gid: string): Row | null => {
      const g = gById.get(gid);
      if (!g) return null;
      if (!m.has(gid)) m.set(gid, { id: gid, name: g.name, email: g.email, mobile: g.mobile, spent: 0, entries: 0, visited: false, lastAt: '' });
      return m.get(gid)!;
    };
    for (const t of txs) {
      const r = ensure(t.guestId); if (!r) continue;
      if (t.status === 'approved') { r.spent += t.amount; r.entries += t.entriesIssued; }
      if (t.timestamp > r.lastAt) r.lastAt = t.timestamp;
    }
    for (const s of stamps) {
      const r = ensure(s.guestId); if (!r) continue;
      r.visited = true;
      if (s.stampedAt > r.lastAt) r.lastAt = s.stampedAt;
    }
    return [...m.values()].sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
  }, [txs, stamps, guests]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.name, r.email, r.mobile].some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [rows, q]);

  const totalSpent = rows.reduce((n, r) => n + r.spent, 0);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Name', 'Email', 'Mobile', 'Spent (PHP)', 'Entries', 'Visited booth', 'Last activity'];
    const lines = rows.map((r) => [r.name, r.email ?? '', r.mobile ?? '', r.spent, r.entries, r.visited ? 'Yes' : 'No', r.lastAt].map(esc).join(','));
    const csv = [head.map(esc).join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${(store?.name ?? 'booth').replace(/[^a-z0-9]+/gi, '-')}-customers.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell title="My Customers" subtitle={`${rows.length} engaged · ${peso(totalSpent)} total sales`}>
      {rows.length === 0 ? (
        <EmptyState title="No customers yet" description="Guests who buy from or visit your booth will appear here — with their contact details for follow-up." />
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
              <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, mobile" />
            </div>
            <button onClick={exportCsv} className="btn-ghost border border-plum/15 text-plum inline-flex items-center gap-2 shrink-0">
              <Download size={16} /> CSV
            </button>
          </div>

          {filtered.map((r) => (
            <Card key={r.id} className="!p-4 mb-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-plum truncate">{r.name}</div>
                  <div className="mt-1 flex flex-col gap-0.5 text-xs">
                    {r.email && <a href={`mailto:${r.email}`} className="text-plum/70 inline-flex items-center gap-1.5 truncate"><Mail size={12} className="text-coral shrink-0" />{r.email}</a>}
                    {r.mobile && <a href={`tel:${r.mobile.replace(/\s/g, '')}`} className="text-plum/70 inline-flex items-center gap-1.5"><Phone size={12} className="text-coral shrink-0" />{r.mobile}</a>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-plum">{peso(r.spent)}</div>
                  <div className="text-[11px] text-coral">{r.entries} {r.entries === 1 ? 'entry' : 'entries'}</div>
                  {r.visited && <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-plum/50"><BookHeart size={11} /> visited</div>}
                </div>
              </div>
              {r.lastAt && <div className="mt-2 text-[11px] text-plum/40">Last: {formatDate(r.lastAt)}</div>}
            </Card>
          ))}
        </>
      )}
    </PageShell>
  );
}
