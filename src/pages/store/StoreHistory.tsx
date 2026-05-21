import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { listTransactions } from '../../services/transactionService';
import { listGuests } from '../../services/guestService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate, peso } from '../../utils/id';

const statusStyle = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending_override: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

export function StoreHistory() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', 'store', storeId],
    queryFn: () => listTransactions({ storeId }),
  });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const todayTotal = txs
    .filter((t) => t.status === 'approved' && t.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <PageShell title="Today's Transactions" subtitle={`${peso(todayTotal)} total approved today`}>
      {txs.length === 0 ? (
        <EmptyState title="No transactions yet" description="Scan a guest QR to get started." />
      ) : (
        txs.map((t) => {
          const g = guestsById.get(t.guestId);
          return (
            <Card key={t.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{g?.name ?? 'Unknown guest'}</div>
                  <div className="text-xs text-plum/50">{formatDate(t.timestamp)}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${statusStyle[t.status]}`}>
                  {t.status === 'pending_override' ? 'Pending' : t.status}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-plum">{peso(t.amount)}</div>
                <div className="text-coral font-medium">
                  {t.entriesIssued} {t.entriesIssued === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </PageShell>
  );
}
