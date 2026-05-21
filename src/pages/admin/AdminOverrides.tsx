import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { useDb } from '../../hooks/useDb';
import { approveOverride, denyOverride, listOverrides } from '../../services/overrideService';
import { listGuests } from '../../services/guestService';
import { listStores } from '../../services/storeService';
import { listTransactions } from '../../services/transactionService';
import { useAuth } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { formatDate, peso } from '../../utils/id';
import { EmptyState } from '../../components/shared/EmptyState';

export function AdminOverrides() {
  const queryClient = useQueryClient();
  const session = useAuth((s) => s.session);
  const adminId = session.role === 'admin' ? session.adminId : 'unknown';
  const pending = useDb(() => listOverrides({ status: 'pending' }));
  const recent = useDb(() => listOverrides().filter((o) => o.status !== 'pending').slice(0, 10));

  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => listTransactions() });

  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const txById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);

  const approve = async (id: string) => {
    try {
      await approveOverride(id, adminId);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      toast.success('Override approved. Entries issued.');
    } catch (err) {
      toast.error(`Approval failed: ${(err as Error).message}`);
    }
  };
  const deny = async (id: string) => {
    try {
      await denyOverride(id, adminId);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.info('Override denied.');
    } catch (err) {
      toast.error(`Denial failed: ${(err as Error).message}`);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-4 md:mb-6">Override Requests</h1>
      {pending.length === 0 ? (
        <EmptyState title="All caught up!" description="No pending override requests." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pending.map((o) => {
            const tx = txById.get(o.transactionId);
            const guest = guestsById.get(o.guestId);
            const store = storesById.get(o.storeId);
            return (
              <div key={o.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-lg">{guest?.name}</div>
                    <div className="text-xs text-plum/60">at {store?.name} · {formatDate(o.requestedAt)}</div>
                  </div>
                  <div className="chip">{peso(o.amount)}</div>
                </div>
                <div className="mt-3 text-sm text-plum/80">{o.note}</div>
                {tx?.receiptPhotoUrl && (
                  <img src={tx.receiptPhotoUrl} alt="receipt" className="mt-3 rounded-xl max-h-48 object-cover" />
                )}
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary flex-1" onClick={() => approve(o.id)}>Approve</button>
                  <button className="btn bg-red-600 text-white flex-1" onClick={() => deny(o.id)}>Deny</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-10">
          <div className="font-display text-xl mb-3">Recent decisions</div>
          <div className="card">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-plum/5 last:border-0 text-sm">
                <div>{guestsById.get(o.guestId)?.name} — {peso(o.amount)}</div>
                <div className={o.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}>{o.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
