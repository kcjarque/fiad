import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail } from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { listBookingsForStore, updateBookingStatus } from '../../services/bookingService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate } from '../../utils/id';
import { toast } from '../../stores/toastStore';
import type { SupplierBookingStatus } from '../../types';

const statusStyle: Record<SupplierBookingStatus, string> = {
  new: 'bg-coral/15 text-coral',
  contacted: 'bg-amber-100 text-amber-700',
  closed: 'bg-plum/10 text-plum/50',
};
// Tap the status chip to advance it: new → contacted → closed → (back to) new.
const nextStatus: Record<SupplierBookingStatus, SupplierBookingStatus> = {
  new: 'contacted',
  contacted: 'closed',
  closed: 'new',
};

export function StoreBookings() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const qc = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'store', storeId],
    queryFn: () => listBookingsForStore(storeId),
  });

  const cycle = async (id: string, status: SupplierBookingStatus) => {
    try {
      await updateBookingStatus(id, nextStatus[status]);
      qc.invalidateQueries({ queryKey: ['bookings', 'store', storeId] });
    } catch (e) {
      toast.error(`Update failed: ${(e as Error).message}`);
    }
  };

  const newCount = bookings.filter((b) => b.status === 'new').length;

  return (
    <PageShell title="Booking requests" subtitle="Clients interested in your rates or packages — reach out to close the sale." back={false}>
      {bookings.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="When a client taps “Request a booking” on your calling card, it shows up here — even after the fair."
        />
      ) : (
        <>
          {newCount > 0 && (
            <div className="text-sm text-plum/60 mb-3">{newCount} new request{newCount === 1 ? '' : 's'}</div>
          )}
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg text-plum">{b.clientName}</div>
                    <div className="text-xs text-plum/50">
                      {formatDate(b.createdAt)}{b.eventDate ? ` · event: ${b.eventDate}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => cycle(b.id, b.status)}
                    className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${statusStyle[b.status]}`}
                  >
                    {b.status}
                  </button>
                </div>
                {b.message && <p className="text-sm text-plum/70 mt-2 whitespace-pre-line">{b.message}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.clientMobile && (
                    <a href={`tel:${b.clientMobile.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-sm text-coral bg-coral/10 rounded-lg px-3 py-1.5">
                      <Phone size={14} /> {b.clientMobile}
                    </a>
                  )}
                  {b.clientEmail && (
                    <a href={`mailto:${b.clientEmail}`} className="inline-flex items-center gap-1.5 text-sm text-plum bg-plum/5 rounded-lg px-3 py-1.5">
                      <Mail size={14} /> {b.clientEmail}
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
