import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { getActiveEvent, updateEvent } from '../../services/eventService';
import { toast } from '../../stores/toastStore';
import { resetDb } from '../../data/mockDb';
import { useAuth } from '../../stores/authStore';
import type { EventInfo } from '../../types';

export function AdminEvent() {
  const queryClient = useQueryClient();
  const { data: active } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [dirty, setDirty] = useState(false);
  const logout = useAuth((s) => s.logout);

  // Re-sync local state when the query data changes, but only if the user
  // hasn't started editing — otherwise we'd clobber their unsaved input.
  useEffect(() => {
    if (active && !dirty) setEvent(active);
  }, [active, dirty]);

  const patch = (p: Partial<EventInfo>) => {
    setDirty(true);
    setEvent((prev) => (prev ? { ...prev, ...p } : prev));
  };

  const save = async () => {
    if (!event) return;
    if (event.raffleRate <= 0) return toast.error('Raffle rate must be greater than 0.');
    if (event.dailyCapPerGuestPerStore < 0) return toast.error('Daily cap cannot be negative.');
    if (!event.name.trim()) return toast.error('Event name is required.');
    if (!event.venue.trim()) return toast.error('Venue is required.');
    try {
      await updateEvent(event);
      await queryClient.invalidateQueries({ queryKey: ['activeEvent'] });
      setDirty(false);
      toast.success('Event settings saved.');
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    }
  };

  const reset = () => {
    if (!confirm('Reset the local mock-only data? Supabase data is not affected.')) return;
    resetDb();
    logout();
    location.href = '/';
  };

  if (!event) {
    return (
      <AdminShell>
        <div className="p-6 text-plum/60">Loading event…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-4 md:mb-6">Event Settings</h1>
      <div className="card max-w-2xl space-y-4">
        <div>
          <label className="label">Event name</label>
          <input className="input" value={event.name} onChange={(e) => patch({name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={event.date} onChange={(e) => patch({date: e.target.value })} />
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input" value={event.venue} onChange={(e) => patch({venue: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Raffle rate (₱ per entry)</label>
            <input type="number" min={1} className="input" value={event.raffleRate} onChange={(e) => patch({raffleRate: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Daily cap / guest / store (₱)</label>
            <input type="number" min={0} className="input" value={event.dailyCapPerGuestPerStore} onChange={(e) => patch({dailyCapPerGuestPerStore: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={event.status} onChange={(e) => patch({status: e.target.value as typeof event.status })}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>
        </div>
        <button className="btn-primary" onClick={save}>Save</button>
      </div>

      <div className="mt-10 max-w-2xl border-t border-plum/10 pt-6">
        <div className="font-display text-xl text-plum">Cached content</div>
        <p className="text-sm text-plum/60 mt-1">Challenges, walkthrough, and prizes are cached on this device. Clearing the cache will sign you out and reload the latest version. Guest, store, and transaction data is not affected.</p>
        <button className="btn bg-plum/10 text-plum mt-3" onClick={reset}>Clear cached content</button>
      </div>
    </AdminShell>
  );
}
