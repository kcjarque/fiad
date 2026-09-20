import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listAllBookings } from '../../services/bookingService';
import { listStoresForLogin } from '../../services/authService';
import { formatDate } from '../../utils/id';

export function AdminBookings() {
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings', 'all'], queryFn: listAllBookings });
  const { data: stores = [] } = useQuery({ queryKey: ['storesForLogin'], queryFn: listStoresForLogin });
  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const [q, setQ] = useState('');

  const filtered = bookings.filter((b) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    const s = storeById.get(b.storeId);
    return `${b.clientName} ${b.clientMobile ?? ''} ${b.clientEmail ?? ''} ${s?.name ?? ''} ${s?.boothNumber ?? ''}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h1 className="font-display text-2xl md:text-3xl">Booking requests</h1>
        <input
          className="input w-full sm:w-72"
          placeholder="Search client or supplier"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="text-sm text-plum/60 mb-4">
        {bookings.length} total{q.trim() ? ` · ${filtered.length} shown` : ''}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-plum/60 text-sm max-w-2xl">
          No booking requests{q.trim() ? ' match your search.' : ' yet — they appear when a client taps “Request a booking” on a supplier’s calling card.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const s = storeById.get(b.storeId);
            return (
              <div key={b.id} className="card">
                <div className="text-[11px] uppercase tracking-wider text-champagne truncate">
                  {s ? `Booth ${s.boothNumber} · ${s.name}` : b.storeId}
                </div>
                <div className="font-display text-lg text-plum mt-1">{b.clientName}</div>
                <div className="text-xs text-plum/50">
                  {formatDate(b.createdAt)}{b.eventDate ? ` · event: ${b.eventDate}` : ''}
                </div>
                {b.message && <p className="text-sm text-plum/70 mt-2 whitespace-pre-line">{b.message}</p>}
                <div className="mt-3 space-y-1.5 text-sm">
                  {b.clientMobile && (
                    <a href={`tel:${b.clientMobile.replace(/\s/g, '')}`} className="flex items-center gap-2 text-plum">
                      <Phone size={14} className="text-coral shrink-0" /> {b.clientMobile}
                    </a>
                  )}
                  {b.clientEmail && (
                    <a href={`mailto:${b.clientEmail}`} className="flex items-center gap-2 text-plum break-all">
                      <Mail size={14} className="text-coral shrink-0" /> {b.clientEmail}
                    </a>
                  )}
                </div>
                <div className="mt-3"><span className="chip">{b.status}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
