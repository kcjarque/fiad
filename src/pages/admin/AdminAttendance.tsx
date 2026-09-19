import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CalendarDays } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listGuests } from '../../services/guestService';
import {
  listCheckIns,
  attendanceByDay,
  returningGuestCount,
  phDay,
} from '../../services/checkInService';
import { useEventStore } from '../../stores/eventStore';

/**
 * Full check-in history for the selected venue.
 *
 * Reads check_ins (0076), the append-only log, rather than
 * guests.checked_in_at — that scalar only says who is checked in right now and
 * is cleared by the daily reset, so it can't answer "who was here on Day 1".
 */

const fmtDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });

export function AdminAttendance() {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkIns', selectedEventId],
    queryFn: () => listCheckIns(selectedEventId),
    refetchInterval: 30_000,
  });
  const { data: guests = [] } = useQuery({
    queryKey: ['guests', selectedEventId],
    queryFn: listGuests,
  });

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const days = useMemo(() => attendanceByDay(checkIns), [checkIns]);
  const returning = useMemo(() => returningGuestCount(checkIns), [checkIns]);
  const todayPh = phDay(new Date().toISOString());

  // How many distinct days each guest appears on, so a returner can be marked
  // inline rather than making someone cross-reference the day sections.
  const daysPerGuest = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of checkIns) {
      if (!m.has(c.guestId)) m.set(c.guestId, new Set());
      m.get(c.guestId)!.add(phDay(c.checkedInAt));
    }
    return m;
  }, [checkIns]);

  const [query, setQuery] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return checkIns.filter((c) => {
      if (dayFilter !== 'all' && phDay(c.checkedInAt) !== dayFilter) return false;
      if (!q) return true;
      const g = guestById.get(c.guestId);
      if (!g) return false;
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        (g.accessCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [checkIns, guestById, query, dayFilter]);

  // Group the filtered rows under their day for scanning by eye.
  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const c of rows) {
      const d = phDay(c.checkedInAt);
      m.set(d, [...(m.get(d) ?? []), c]);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Attendance log</h1>
          <p className="text-sm text-plum/60 mt-1 max-w-lg">
            Every check-in recorded at this venue. Kept separately from a guest's
            current status, so it survives the daily reset.
          </p>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap text-xs">
            <button
              onClick={() => setDayFilter('all')}
              className={`px-3 py-1 rounded-full border transition ${
                dayFilter === 'all'
                  ? 'bg-plum text-cream border-plum'
                  : 'border-plum/15 text-plum/70 hover:border-plum/30'
              }`}
            >
              All {checkIns.length}
            </button>
            {days.map((d) => (
              <button
                key={d.day}
                onClick={() => setDayFilter(d.day)}
                className={`px-3 py-1 rounded-full border transition ${
                  dayFilter === d.day
                    ? 'bg-plum text-cream border-plum'
                    : 'border-plum/15 text-plum/70 hover:border-plum/30'
                }`}
              >
                {new Date(`${d.day}T12:00:00`).toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                {d.guests}
                {d.day === todayPh ? ' · Today' : ''}
              </button>
            ))}
          </div>
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

      {returning > 0 && (
        <div className="card mb-4 !py-3 text-sm text-plum/70">
          <strong className="text-plum">{returning}</strong> guest
          {returning === 1 ? '' : 's'} attended more than one day.
        </div>
      )}

      {isLoading ? (
        <div className="card max-w-2xl text-center py-10 text-plum/60">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="card max-w-2xl text-center py-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/20 text-champagne mb-3">
            <CalendarDays size={22} aria-hidden="true" />
          </div>
          <div className="font-display text-xl text-plum">
            {checkIns.length === 0 ? 'No check-ins yet' : 'No matches'}
          </div>
          <p className="text-sm text-plum/60 mt-1">
            {checkIns.length === 0
              ? 'Check-ins appear here as guests are scanned in at the door.'
              : 'Try a different search term or day.'}
          </p>
        </div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="mb-6">
            <h2 className="font-display text-lg text-plum flex items-center gap-2">
              {fmtDay(day)}
              {day === todayPh && <span className="chip bg-coral text-white">Today</span>}
              <span className="text-sm text-plum/50 font-sans">
                {items.length} check-in{items.length === 1 ? '' : 's'}
              </span>
            </h2>
            <div className="card !p-0 overflow-hidden mt-2">
              <ul className="divide-y divide-plum/8">
                {items.map((c) => {
                  const g = guestById.get(c.guestId);
                  const isReturner = (daysPerGuest.get(c.guestId)?.size ?? 0) > 1;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-plum flex items-center gap-2">
                          <span className="truncate">{g?.name ?? 'Removed guest'}</span>
                          {isReturner && (
                            <span className="chip bg-champagne/40 text-plum shrink-0">
                              Returning
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-plum/55 truncate">
                          {g ? g.email : 'this guest has since been deleted'}
                          {g?.accessCode ? ` · ${g.accessCode}` : ''}
                        </div>
                      </div>
                      <time
                        dateTime={c.checkedInAt}
                        className="text-xs text-plum/60 tabular-nums shrink-0"
                      >
                        {fmtTime(c.checkedInAt)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))
      )}
    </AdminShell>
  );
}
