import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, Gift, Crown, CalendarDays } from 'lucide-react';
import { listEvents } from '../services/eventService';
import { listPrizesForEvents } from '../services/prizeService';
import { listStoresForEvents } from '../services/storeService';
import type { Prize, EventInfo } from '../types';

/**
 * Public raffle schedule — what is drawn, when, and where.
 *
 * Deliberately public (no guest login): people decide whether to come based
 * on this, and it needs to survive being pasted into a group chat. It also
 * avoids the event-scoping problem, since a visitor has never picked a venue.
 *
 * Driven entirely by the prizes table (scheduled_at), so it is the same data
 * the draw uses — no second copy of the schedule to drift out of sync.
 */

const PH_TZ = 'en-PH';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(PH_TZ, { hour: 'numeric', minute: '2-digit' });
const fmtDayLong = (iso: string) =>
  new Date(iso).toLocaleString(PH_TZ, { weekday: 'long', month: 'long', day: 'numeric' });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD, local

type Row = { prize: Prize; sponsor?: string };
type Day = { key: string; label: string; rows: Row[] };

export function RaffleSchedule() {
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: listEvents,
  });

  // Only venues that are running or about to — an ended season isn't a
  // schedule anyone needs. Soonest first, so the default tab is the venue
  // opening next rather than whichever the API happened to return first.
  const venues = useMemo(
    () =>
      events
        .filter((e) => e.status === 'live' || e.status === 'draft')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );
  const venueIds = useMemo(() => venues.map((v) => v.id), [venues]);

  const { data: prizes = [], isLoading: loadingPrizes } = useQuery({
    queryKey: ['prizes', 'public-schedule', venueIds.join(',')],
    queryFn: () => listPrizesForEvents(venueIds),
    enabled: venueIds.length > 0,
  });
  const { data: stores = [] } = useQuery({
    queryKey: ['stores', 'public-schedule', venueIds.join(',')],
    queryFn: () => listStoresForEvents(venueIds),
    enabled: venueIds.length > 0,
  });
  const storeName = useMemo(() => new Map(stores.map((s) => [s.id, s.name])), [stores]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active: EventInfo | undefined = venues.find((v) => v.id === activeId) ?? venues[0];

  // Group this venue's scheduled prizes into days, each ordered by time.
  const days: Day[] = useMemo(() => {
    if (!active) return [];
    const mine = prizes
      .filter((p) => p.eventId === active.id && p.scheduledAt)
      .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    const byDay = new Map<string, Row[]>();
    for (const p of mine) {
      const k = dayKey(p.scheduledAt!);
      const row: Row = {
        prize: p,
        sponsor: p.sponsoredByStoreId ? storeName.get(p.sponsoredByStoreId) : undefined,
      };
      byDay.set(k, [...(byDay.get(k) ?? []), row]);
    }
    return [...byDay.entries()].map(([key, rows]) => ({
      key,
      label: fmtDayLong(rows[0].prize.scheduledAt!),
      rows,
    }));
  }, [prizes, active, storeName]);

  // The next draw still to come, so someone glancing at this on the floor can
  // see what's coming rather than reading every row.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const nextUp = useMemo(() => {
    const upcoming = days
      .flatMap((d) => d.rows)
      .filter((r) => new Date(r.prize.scheduledAt!).getTime() > now);
    return upcoming[0]?.prize.id ?? null;
  }, [days, now]);

  const loading = loadingEvents || loadingPrizes;

  return (
    <div className="min-h-dvh bg-cream">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-plum text-cream px-5 pt-10 pb-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-champagne">
            Forever in a Day · Season 2
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-2">Raffle Draw Schedule</h1>
          <p className="text-sm text-cream/70 mt-2 max-w-md leading-relaxed">
            Every prize, the hour it's drawn, and the venue it's drawn at. Be checked in at
            the door and present to claim.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-20">
        {/* ── Venue switcher ───────────────────────────────────────────── */}
        {venues.length > 1 && (
          <div
            role="tablist"
            aria-label="Choose a venue"
            className="sticky top-0 z-10 -mx-5 px-5 py-3 bg-cream/95 backdrop-blur flex gap-2 overflow-x-auto"
          >
            {venues.map((v) => {
              const on = v.id === active?.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={on}
                  aria-controls={`panel-${v.id}`}
                  id={`tab-${v.id}`}
                  onClick={() => setActiveId(v.id)}
                  className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                    on
                      ? 'bg-plum text-cream'
                      : 'bg-white text-plum/70 border border-plum/15 hover:border-plum/35'
                  }`}
                >
                  {v.venue.split(',')[0]}
                </button>
              );
            })}
          </div>
        )}

        {active && (
          <section
            id={`panel-${active.id}`}
            role={venues.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={venues.length > 1 ? `tab-${active.id}` : undefined}
            className="mt-5"
          >
            {/* ── Venue card ─────────────────────────────────────────── */}
            <div className="card">
              <h2 className="font-serif text-xl text-plum">{active.venue}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-plum/60">
                <CalendarDays size={14} aria-hidden="true" />
                {days.length > 0
                  ? days.map((d) => d.label).join(' · ')
                  : fmtDayLong(`${active.date}T11:00:00`)}
              </p>
            </div>

            {/* ── Schedule ───────────────────────────────────────────── */}
            {loading && (
              <div className="mt-4 space-y-2" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading schedule…</span>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl bg-white/70 animate-pulse motion-reduce:animate-none"
                  />
                ))}
              </div>
            )}

            {!loading && days.length === 0 && (
              <div className="card mt-4 text-center py-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/20 text-champagne mb-3">
                  <Clock size={22} aria-hidden="true" />
                </div>
                <p className="font-serif text-lg text-plum">Schedule coming soon</p>
                <p className="text-sm text-plum/60 mt-1 max-w-xs mx-auto">
                  Draw times for this venue haven't been published yet. Check back shortly.
                </p>
              </div>
            )}

            {!loading &&
              days.map((day) => (
                <div key={day.key} className="mt-6">
                  <h3 className="font-serif text-lg text-plum">{day.label}</h3>
                  <ol className="mt-3 space-y-2">
                    {day.rows.map(({ prize, sponsor }) => {
                      const isNext = prize.id === nextUp;
                      const drawn = !!prize.winnerGuestId;
                      return (
                        <li
                          key={prize.id}
                          className={`card !p-0 overflow-hidden ${
                            prize.isGrand ? 'ring-2 ring-champagne' : ''
                          } ${isNext ? 'ring-2 ring-coral' : ''}`}
                        >
                          <div className="flex items-stretch">
                            {/* Time rail — tabular figures keep the column steady */}
                            <div
                              className={`w-20 shrink-0 flex flex-col items-center justify-center px-2 py-4 ${
                                prize.isGrand ? 'bg-champagne/20' : 'bg-plum/[0.04]'
                              }`}
                            >
                              <time
                                dateTime={prize.scheduledAt}
                                className="font-serif text-base text-plum tabular-nums leading-tight text-center"
                              >
                                {fmtTime(prize.scheduledAt!)}
                              </time>
                            </div>

                            <div className="min-w-0 flex-1 px-4 py-3">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                {prize.isGrand && (
                                  <span className="chip bg-champagne/25 text-plum inline-flex items-center gap-1">
                                    <Crown size={11} aria-hidden="true" /> Grand Prize
                                  </span>
                                )}
                                {isNext && !drawn && (
                                  <span className="chip bg-coral text-white">Next draw</span>
                                )}
                                {drawn && <span className="chip bg-plum/10 text-plum/70">Drawn</span>}
                              </div>
                              <p className="font-medium text-plum mt-1 leading-snug">
                                {prize.name}
                              </p>
                              {sponsor && (
                                <p className="text-xs text-plum/55 mt-0.5 flex items-center gap-1">
                                  <Gift size={11} aria-hidden="true" />
                                  <span className="truncate">{sponsor}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}

            {/* ── Footnote ───────────────────────────────────────────── */}
            <p className="text-xs text-plum/50 mt-8 leading-relaxed">
              <MapPin size={11} className="inline -mt-0.5 mr-1" aria-hidden="true" />
              All times are Philippine Standard Time at {active.venue}. Schedule is
              indicative and may shift on the day.
            </p>
            <Link
              to="/rsvp"
              className="btn-primary mt-5 w-full inline-flex items-center justify-center"
            >
              Reserve your free spot
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
