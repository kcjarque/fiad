import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { listTransactions, getTransaction } from '../../services/transactionService';
import { listStores } from '../../services/storeService';
import { listGuests } from '../../services/guestService';
import { Modal } from '../../components/shared/Modal';
import { formatDate, peso } from '../../utils/id';
import type { Transaction, TransactionStatus } from '../../types';

const statusClass: Record<TransactionStatus, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending_override: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

export function AdminTransactions() {
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: allTx = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => listTransactions() });

  // The list query omits the heavy receipt blob; fetch it only for the
  // transaction the admin actually opens.
  const { data: selectedDetail } = useQuery({
    queryKey: ['transaction', selected?.id],
    queryFn: () => getTransaction(selected!.id),
    enabled: !!selected,
  });

  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const txs = useMemo(
    () =>
      allTx.filter(
        (t) => (!storeFilter || t.storeId === storeFilter) && (!statusFilter || t.status === statusFilter),
      ),
    [allTx, storeFilter, statusFilter],
  );

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-4 md:mb-6">Transactions</h1>
      <div className="card">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <select className="input sm:!w-auto" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="input sm:!w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | '')}>
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending_override">Pending override</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="sm:ml-auto text-sm text-plum/60 sm:self-center">{txs.length} transactions</div>
        </div>

        <div className="md:hidden space-y-2">
          {txs.map((t) => {
            const g = guestsById.get(t.guestId);
            const s = storesById.get(t.storeId);
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full text-left bg-cream/50 rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{g?.name ?? '—'}</div>
                    <div className="text-xs text-plum/60 truncate">{s?.name ?? '—'}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${statusClass[t.status]}`}>
                    {t.status === 'pending_override' ? 'Pending' : t.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div>{peso(t.amount)}</div>
                  <div className="text-coral font-medium">{t.entriesIssued} entries</div>
                </div>
                <div className="text-[11px] text-plum/50 mt-1">{formatDate(t.timestamp)}</div>
              </button>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-plum/60 border-b border-plum/10">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Guest</th>
                <th className="py-2 pr-4">Store</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Entries</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const g = guestsById.get(t.guestId);
                const s = storesById.get(t.storeId);
                return (
                  <tr key={t.id} className="border-b border-plum/5 last:border-0">
                    <td className="py-2 pr-4 text-plum/70">{formatDate(t.timestamp)}</td>
                    <td className="py-2 pr-4 font-medium">{g?.name ?? '—'}</td>
                    <td className="py-2 pr-4">{s?.name ?? '—'}</td>
                    <td className="py-2 pr-4">{peso(t.amount)}</td>
                    <td className="py-2 pr-4 text-coral font-medium">{t.entriesIssued}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass[t.status]}`}>
                        {t.status === 'pending_override' ? 'Pending' : t.status}
                      </span>
                    </td>
                    <td className="py-2">
                      <button className="text-coral text-sm" onClick={() => setSelected(t)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Transaction details">
        {selected && (
          <div className="space-y-3 text-sm">
            <div><span className="text-plum/60">Guest:</span> {guestsById.get(selected.guestId)?.name}</div>
            <div><span className="text-plum/60">Store:</span> {storesById.get(selected.storeId)?.name}</div>
            <div><span className="text-plum/60">Amount:</span> {peso(selected.amount)}</div>
            <div><span className="text-plum/60">Entries:</span> {selected.entriesIssued}</div>
            <div><span className="text-plum/60">Status:</span> {selected.status}</div>
            <div><span className="text-plum/60">When:</span> {formatDate(selected.timestamp)}</div>
            {selected.overrideNote && <div><span className="text-plum/60">Note:</span> {selected.overrideNote}</div>}
            <div className="pt-3">
              <div className="text-plum/60 mb-1">Receipt</div>
              {selectedDetail?.receiptPhotoUrl ? (
                <img src={selectedDetail.receiptPhotoUrl} alt="receipt" className="rounded-xl max-h-80 mx-auto" />
              ) : (
                <div className="text-plum/40 text-sm text-center py-8">Loading receipt…</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
