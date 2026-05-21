import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Search } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listGuests } from '../../services/guestService';
import { allActiveEntries } from '../../services/raffleService';
import { formatDate } from '../../utils/id';
import { toast } from '../../stores/toastStore';

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied`);
  } catch {
    toast.error('Could not copy — long-press to copy manually');
  }
};

export function AdminGuests() {
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: entries = [] } = useQuery({ queryKey: ['raffle', 'active'], queryFn: allActiveEntries });
  const [query, setQuery] = useState('');

  const entriesByGuest = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.guestId, (m.get(e.guestId) ?? 0) + 1);
    return m;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.mobile.toLowerCase().includes(q) ||
        (g.accessCode ?? '').toLowerCase().includes(q),
    );
  }, [guests, query]);

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Guests</h1>
          <p className="text-sm text-plum/60 mt-1">{guests.length} registered</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
          <input
            type="text"
            className="input !pl-9"
            placeholder="Search name, email, or code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center max-w-2xl">
          <div className="font-display text-xl text-plum">
            {guests.length === 0 ? 'No guests yet' : 'No matches'}
          </div>
          <p className="text-sm text-plum/60 mt-1">
            {guests.length === 0
              ? 'Guests appear here as they register via GHL or the /app/register page.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map((g) => (
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
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="text-xs text-plum/50">Registered {formatDate(g.registeredAt)}</div>
                  {g.accessCode && (
                    <button
                      onClick={() => copyCode(g.accessCode!)}
                      className="font-mono text-[11px] tracking-widest bg-plum/5 hover:bg-plum/10 text-plum px-2 py-1 rounded inline-flex items-center gap-1.5 transition"
                    >
                      {g.accessCode}
                      <Copy size={11} className="text-plum/50" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-plum/60 border-b border-plum/10">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Mobile</th>
                  <th className="py-2 pr-4">Access code</th>
                  <th className="py-2 pr-4">Entries</th>
                  <th className="py-2">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-plum/5 last:border-0">
                    <td className="py-2 pr-4 font-medium">{g.name}</td>
                    <td className="py-2 pr-4 text-plum/70">{g.email}</td>
                    <td className="py-2 pr-4 text-plum/70">{g.mobile}</td>
                    <td className="py-2 pr-4">
                      {g.accessCode ? (
                        <button
                          onClick={() => copyCode(g.accessCode!)}
                          className="font-mono tracking-widest bg-plum/5 hover:bg-plum/10 text-plum px-2 py-1 rounded inline-flex items-center gap-1.5 transition"
                          title="Click to copy"
                        >
                          {g.accessCode}
                          <Copy size={12} className="text-plum/50" />
                        </button>
                      ) : (
                        <span className="text-plum/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-coral font-medium">{entriesByGuest.get(g.id) ?? 0}</td>
                    <td className="py-2 text-plum/60">{formatDate(g.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
