import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, ScanLine, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { QRScanner } from '../../components/shared/QRScanner';
import {
  checkInGuestByQr,
  checkInGuestById,
  searchGuestsForCheckIn,
  listGuests,
} from '../../services/guestService';
import { toast } from '../../stores/toastStore';
import {
  listCheckIns,
  attendanceByDay,
  returningGuestCount,
  phDay,
} from '../../services/checkInService';
import { useEventStore } from '../../stores/eventStore';
import type { Guest } from '../../types';

type Result = { guest: Guest; alreadyCheckedIn: boolean } | 'notfound';

const dayLabel = (d?: string) => (d === 'day1' ? 'Day 1' : d === 'day2' ? 'Day 2' : d ?? '');
const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function AdminCheckin() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const onQr = async (token: string) => {
    if (busy) return;
    setBusy(true);
    setScanning(false);
    try {
      const r = await checkInGuestByQr(token);
      if (!r) {
        setResult('notfound');
      } else {
        setResult(r);
        if (!r.alreadyCheckedIn) toast.success(`${r.guest.name} checked in`);
      }
    } catch (err) {
      toast.error(`Check-in failed: ${(err as Error).message}`);
      setScanning(true);
    } finally {
      setBusy(false);
    }
  };

  const scanNext = () => {
    setResult(null);
    setScanning(true);
  };

  // ── Manual fallback ──────────────────────────────────────────────────────
  // A dead phone or an unreadable QR must not leave a real guest ineligible,
  // since the draw now requires checked_in_at (migration 0060).
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Guest[]>([]);
  // Which query the current matches belong to, so a slower earlier response
  // can't paint stale names over a newer search.
  const [matchesFor, setMatchesFor] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    // Debounce so a name typed at the door isn't one query per keystroke.
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchGuestsForCheckIn(q);
        if (cancelled) return;
        setMatches(rows);
        setMatchesFor(q);
      } catch (err) {
        if (!cancelled) toast.error(`Search failed: ${(err as Error).message}`);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const searching = query.trim().length >= 2 && matchesFor !== query.trim();

  // ── Attendance log ───────────────────────────────────────────────────────
  // guests.checked_in_at only says whether someone is checked in *now*, and it
  // gets cleared by the daily reset. check_ins (0076) is the append-only
  // record, so this survives that and shows who attended on which day.
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns', selectedEventId],
    queryFn: () => listCheckIns(selectedEventId),
    refetchInterval: 30_000,
  });
  const { data: guests = [] } = useQuery({
    queryKey: ['guests', selectedEventId],
    queryFn: listGuests,
  });
  const guestName = useMemo(
    () => new Map(guests.map((g) => [g.id, g.name])),
    [guests],
  );
  const days = useMemo(() => attendanceByDay(checkIns), [checkIns]);
  const returning = useMemo(() => returningGuestCount(checkIns), [checkIns]);
  const todayPh = phDay(new Date().toISOString());
  const recent = checkIns.slice(0, 8);

  const manualCheckIn = async (g: Guest) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await checkInGuestById(g.id);
      if (!r) {
        toast.error('Guest not found');
      } else {
        setResult(r);
        setQuery('');
        setMatches([]);
        setMatchesFor('');
        if (!r.alreadyCheckedIn) toast.success(`${r.guest.name} checked in`);
      }
    } catch (err) {
      toast.error(`Check-in failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Check-in</h1>
      <p className="text-sm text-plum/60 mb-5 max-w-md">
        Scan the QR in a guest's confirmation email or ticket to check them in at the door.
      </p>

      {!scanning && !result && (
        <div className="card max-w-md text-center py-9">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-coral/15 text-coral mb-4">
            <ScanLine size={28} aria-hidden="true" />
          </div>
          <div className="font-display text-xl text-plum">Ready to check guests in</div>
          <button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={() => setScanning(true)}>
            <Camera size={16} /> Open scanner
          </button>
        </div>
      )}

      {scanning && (
        <div className="card max-w-md">
          <QRScanner onResult={onQr} />
          <button
            className="btn-ghost w-full mt-3 border border-plum/15 text-plum"
            onClick={() => setScanning(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {result && result !== 'notfound' && (
        <div className="card max-w-md text-center py-8">
          <div
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${
              result.alreadyCheckedIn ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <CheckCircle2 size={36} aria-hidden="true" />
          </div>
          <div className="font-display text-2xl text-plum">{result.guest.name}</div>
          <div className="text-sm text-plum/60 mt-0.5">
            {result.guest.email}
            {dayLabel(result.guest.preferredDay) ? ` · ${dayLabel(result.guest.preferredDay)}` : ''}
          </div>
          <div
            className={`mt-3 text-sm font-semibold ${
              result.alreadyCheckedIn ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {result.alreadyCheckedIn
              ? `Already checked in${result.guest.checkedInAt ? ` · ${fmtTime(result.guest.checkedInAt)}` : ''}`
              : 'Checked in ✓'}
          </div>
          <button className="btn-primary mt-5" onClick={scanNext}>
            Scan next guest
          </button>
        </div>
      )}

      {result === 'notfound' && (
        <div className="card max-w-md text-center py-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <AlertCircle size={36} aria-hidden="true" />
          </div>
          <div className="font-display text-xl text-plum">QR not recognized</div>
          <p className="text-sm text-plum/60 mt-1">
            That code doesn't match a registered guest. Try again, or look them up under Guests.
          </p>
          <button className="btn-primary mt-5" onClick={scanNext}>
            Scan again
          </button>
        </div>
      )}

      {/* Manual fallback — always reachable while not actively scanning, so a
          guest whose QR won't scan can still be checked in (and so stay
          eligible for the raffle). */}
      {!scanning && (
        <div className="card max-w-md mt-4">
          <label className="label" htmlFor="checkin-search">
            Can't scan? Find the guest
          </label>
          <div className="relative">
            <Search
              size={15}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40"
            />
            <input
              id="checkin-search"
              className="input !pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, or access code"
              autoComplete="off"
            />
          </div>

          {query.trim().length >= 2 && (
            <div className="mt-3">
              {searching && <div className="text-sm text-plum/50">Searching…</div>}
              {!searching && matches.length === 0 && (
                <div className="text-sm text-plum/60">
                  No guest matches that. Check the spelling, or confirm they registered
                  for this venue.
                </div>
              )}
              {!searching &&
                matches.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 py-2 border-b border-plum/10 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-plum truncate">{g.name}</div>
                      <div className="text-xs text-plum/55 truncate">
                        {g.email}
                        {dayLabel(g.preferredDay) ? ` · ${dayLabel(g.preferredDay)}` : ''}
                      </div>
                    </div>
                    {g.checkedInAt ? (
                      <span className="chip bg-amber-100 text-amber-800 shrink-0">
                        In · {fmtTime(g.checkedInAt)}
                      </span>
                    ) : (
                      <button
                        className="btn-primary !px-3 !py-1.5 text-sm shrink-0"
                        onClick={() => manualCheckIn(g)}
                        disabled={busy}
                      >
                        Check in
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Attendance log ──────────────────────────────────────────────── */}
      <div className="card max-w-md mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg text-plum">Attendance</h2>
          <span className="text-xs text-plum/50">{checkIns.length} check-ins logged</span>
        </div>

        {days.length === 0 ? (
          <p className="text-sm text-plum/60 mt-2">
            No check-ins recorded for this venue yet.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-1.5">
              {days.map((d) => (
                <li key={d.day} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-plum/80">
                    {new Date(`${d.day}T12:00:00`).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {d.day === todayPh && (
                      <span className="chip bg-coral text-white ml-2">Today</span>
                    )}
                  </span>
                  <span className="font-display text-plum tabular-nums">{d.guests}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-plum/55 mt-3 pt-3 border-t border-plum/10">
              {returning > 0
                ? `${returning} guest${returning === 1 ? '' : 's'} attended more than one day.`
                : 'No returning guests recorded yet — a returner only appears here once they scan again on a later day.'}
            </p>
          </>
        )}

        {recent.length > 0 && (
          <div className="mt-4 pt-3 border-t border-plum/10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-plum/40 mb-2">
              Most recent
            </div>
            <ul className="space-y-1">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-plum/80 truncate">
                    {guestName.get(c.guestId) ?? 'Removed guest'}
                  </span>
                  <span className="text-plum/50 text-xs tabular-nums shrink-0">
                    {new Date(c.checkedInAt).toLocaleString('en-PH', {
                      timeZone: 'Asia/Manila',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
