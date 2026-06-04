import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Trophy, Timer, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { entriesForGuest, allActiveEntries } from '../../services/raffleService';
import { latestWinFor, listPrizes } from '../../services/prizeService';
import { listTransactions } from '../../services/transactionService';
import { listStores } from '../../services/storeService';
import { listGuests } from '../../services/guestService';
import { getActiveEvent } from '../../services/eventService';
import { Hero } from '../../components/shared/Hero';
import { Confetti } from '../../components/shared/Confetti';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown';
import { scheduledDrawTime, drawSortKey } from '../../utils/drawSchedule';

export function Raffle() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const guestId = session.guestId;

  const { data: entries = [] } = useQuery({
    queryKey: ['raffle', 'guest', guestId],
    queryFn: () => entriesForGuest(guestId),
  });
  const { data: activePool = [] } = useQuery({
    queryKey: ['raffle', 'active'],
    queryFn: allActiveEntries,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'guest', guestId],
    queryFn: () => listTransactions({ guestId }),
  });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });

  const { data: prizes = [] } = useQuery({ queryKey: ['prizes'], queryFn: listPrizes });
  const { data: latestWin = null } = useQuery({
    queryKey: ['prizes', 'win', guestId],
    queryFn: () => latestWinFor(guestId),
  });

  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const txById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);

  // Sort by scheduled draw time so the UI lists prizes in the order they
  // will be drawn (11am Day 1 → 5pm Day 1, 11am Day 2 → 6pm Day 2, then 9:30pm
  // Day 2 grand finale). Falls back to id order for unrecognised IDs.
  const sortedPrizes = useMemo(() => {
    if (!event?.date) return prizes;
    return [...prizes].sort((a, b) => drawSortKey(a.id, event.date) - drawSortKey(b.id, event.date));
  }, [prizes, event?.date]);

  const wins = sortedPrizes.filter((p) => p.winnerGuestId === guestId);
  const drawn = sortedPrizes.filter((p) => p.winnerGuestId);
  const nextPrize = sortedPrizes.find((p) => !p.winnerGuestId);

  const drawTarget = nextPrize && event?.date
    ? scheduledDrawTime(nextPrize.id, event.date)
    : null;
  const cd = useCountdown(drawTarget);

  const odds = useMemo(() => {
    const active = activePool.filter((e) => e.guestId === guestId).length;
    if (active === 0 || activePool.length === 0) return null;
    return { mine: active, total: activePool.length, ratio: Math.round(activePool.length / active) };
  }, [activePool, guestId]);

  const grouped = useMemo(() => {
    const byTx = new Map<string, { storeId: string; count: number; at: string }>();
    for (const e of entries) {
      const existing = byTx.get(e.transactionId);
      if (existing) existing.count += 1;
      else {
        const tx = txById.get(e.transactionId);
        byTx.set(e.transactionId, {
          storeId: tx?.storeId ?? '',
          count: 1,
          at: e.createdAt,
        });
      }
    }
    return [...byTx.entries()]
      .map(([txId, v]) => ({ txId, ...v }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [entries, txById]);

  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    if (!latestWin) return;
    const last = localStorage.getItem(`fiad.seenwin.${guestId}`);
    if (last !== latestWin.at) {
      setShowWin(true);
      localStorage.setItem(`fiad.seenwin.${guestId}`, latestWin.at);
    }
  }, [latestWin?.at, guestId, latestWin]);

  return (
    <div className="min-h-full pb-28 bg-cream">
      <Hero
        imageUrl={nextPrize?.imageUrl}
        kicker={nextPrize ? 'Grand Prize' : 'All prizes drawn'}
        title={nextPrize ? nextPrize.name : 'The draws are complete'}
        subtitle={nextPrize?.description}
        height="xl"
      />

      <div className="px-5 -mt-10 relative z-10 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-card p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-plum/50">Your Odds</div>
          {odds ? (
            <>
              <div className="font-display text-plum text-3xl mt-1 leading-none">
                1 <span className="text-plum/40 text-xl">in</span> {odds.ratio}
              </div>
              <div className="text-xs text-plum/60 mt-2">
                {odds.mine} of {odds.total} active entries
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-plum/40 text-3xl mt-1 leading-none">—</div>
              <div className="text-xs text-plum/60 mt-2">Earn entries to enter the draw</div>
            </>
          )}
        </div>

        <div className="rounded-2xl foil-gold shadow-card p-4 text-plum">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-plum/80">
            <Timer size={11} /> Next Draw
          </div>
          <div className="font-display text-3xl mt-1 leading-none">
            {drawTarget ? formatCountdown(cd) : '—'}
          </div>
          <div className="text-xs text-plum/70 mt-2 line-clamp-1">
            {nextPrize?.name ?? 'No upcoming draws'}
          </div>
        </div>
      </div>

      {wins.length > 0 && (
        <div className="px-5 mt-5">
          <div className="rounded-2xl bg-gradient-to-br from-coral via-[#c5305f] to-[#8B2348] p-5 text-white shadow-soft">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-cream/80">
              <Trophy size={12} /> You've won
            </div>
            <div className="space-y-2 mt-3">
              {wins.map((w) => (
                <div key={w.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-xl leading-tight">{w.name}</div>
                    <div className="text-cream/70 text-xs">Ticket {w.winningTicketNumber}</div>
                  </div>
                  <Sparkles size={20} className="text-champagne" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-plum text-lg">Your entries</div>
          <div className="chip">{entries.length} total</div>
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card p-6 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-champagne/20 text-champagne flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div className="mt-3 font-display text-plum">No entries yet</div>
            <div className="text-plum/60 text-sm mt-1">Spend at any booth to start collecting.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => {
              const store = g.storeId ? storesById.get(g.storeId) : undefined;
              return (
                <div key={g.txId} className="rounded-2xl bg-white shadow-card flex items-center gap-3 p-3">
                  {store?.imageUrl ? (
                    <img src={store.imageUrl} alt={store.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-champagne/20" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-plum font-medium truncate">
                        +{g.count} {g.count === 1 ? 'entry' : 'entries'}
                      </div>
                      <div className="foil-gold rounded-full px-2 py-0.5 text-[10px] font-semibold text-plum shrink-0">
                        +{g.count}
                      </div>
                    </div>
                    <div className="text-xs text-plum/60 truncate">
                      from {store?.name ?? 'Unknown booth'}
                    </div>
                    <div className="text-[10px] text-plum/40 mt-0.5">
                      {new Date(g.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 mt-8">
        <div className="font-display text-plum text-lg mb-3">Past draws</div>
        {drawn.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card p-5 text-center text-plum/60 text-sm">
            No prizes drawn yet. Stay tuned!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {drawn.map((p) => {
              const winner = p.winnerGuestId ? guestsById.get(p.winnerGuestId) : null;
              return (
                <div key={p.id} className="rounded-2xl bg-white shadow-card overflow-hidden">
                  <div className="relative h-28">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#8B2348]/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-cream">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-champagne">Winner</div>
                      <div className="font-display text-sm leading-tight line-clamp-1">{winner?.name ?? '—'}</div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-plum text-xs font-medium line-clamp-1">{p.name}</div>
                    <div className="text-plum/50 text-[10px] mt-0.5">Ticket {p.winningTicketNumber}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showWin && latestWin && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-coral to-[#8B2348] text-white flex flex-col items-center justify-center px-6 text-center">
          <Confetti />
          <div className="text-sm uppercase tracking-[0.3em]">You won</div>
          <div className="font-display text-5xl mt-3">{latestWin.prize.name}</div>
          <div className="mt-4 text-white/80">Ticket {latestWin.prize.winningTicketNumber}</div>
          <button onClick={() => setShowWin(false)} className="mt-10 btn bg-white text-plum">
            Amazing!
          </button>
        </div>
      )}
    </div>
  );
}
