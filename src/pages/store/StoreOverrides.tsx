import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { useDb } from '../../hooks/useDb';
import { listOverrides } from '../../services/overrideService';
import { listGuests } from '../../services/guestService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate, peso } from '../../utils/id';

const badge = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  denied: 'bg-red-100 text-red-800',
};

export function StoreOverrides() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const overrides = useDb(() => listOverrides({ storeId }));
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  return (
    <PageShell title="Override Requests">
      {overrides.length === 0 ? (
        <EmptyState title="No override requests" description="Requests you submit will appear here with their status." />
      ) : (
        overrides.map((o) => {
          const g = guestsById.get(o.guestId);
          return (
            <Card key={o.id}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{g?.name ?? 'Unknown'}</div>
                  <div className="text-xs text-plum/50">{formatDate(o.requestedAt)}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${badge[o.status]}`}>{o.status}</div>
              </div>
              <div className="mt-2 text-plum">Amount: {peso(o.amount)}</div>
              <div className="mt-1 text-sm text-plum/70">{o.note}</div>
            </Card>
          );
        })
      )}
    </PageShell>
  );
}
