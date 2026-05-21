import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { listGuests } from '../../services/guestService';
import { allActiveEntries } from '../../services/raffleService';
import { formatDate } from '../../utils/id';

export function AdminGuests() {
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: entries = [] } = useQuery({ queryKey: ['raffle', 'active'], queryFn: allActiveEntries });

  const entriesByGuest = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.guestId, (m.get(e.guestId) ?? 0) + 1);
    return m;
  }, [entries]);

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-4 md:mb-6">Guests</h1>

      <div className="md:hidden space-y-3">
        {guests.map((g) => (
          <div key={g.id} className="card !p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{g.name}</div>
                <div className="text-xs text-plum/60 truncate">{g.email}</div>
                <div className="text-xs text-plum/60">{g.mobile}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-coral font-display text-xl leading-none">{entriesByGuest.get(g.id) ?? 0}</div>
                <div className="text-[10px] text-plum/50 uppercase tracking-wider">entries</div>
              </div>
            </div>
            <div className="text-xs text-plum/50 mt-2">Registered {formatDate(g.registeredAt)}</div>
          </div>
        ))}
      </div>

      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-plum/60 border-b border-plum/10">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Mobile</th>
              <th className="py-2 pr-4">Entries</th>
              <th className="py-2">Registered</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id} className="border-b border-plum/5 last:border-0">
                <td className="py-2 pr-4 font-medium">{g.name}</td>
                <td className="py-2 pr-4 text-plum/70">{g.email}</td>
                <td className="py-2 pr-4 text-plum/70">{g.mobile}</td>
                <td className="py-2 pr-4 text-coral font-medium">{entriesByGuest.get(g.id) ?? 0}</td>
                <td className="py-2 text-plum/60">{formatDate(g.registeredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
