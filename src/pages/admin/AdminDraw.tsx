import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { drawWinner, listPrizes } from '../../services/prizeService';
import { allActiveEntries } from '../../services/raffleService';
import { listGuests } from '../../services/guestService';
import { Confetti } from '../../components/shared/Confetti';
import { Trophy } from 'lucide-react';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ROWS / 2);

export function AdminDraw() {
  const queryClient = useQueryClient();
  const { data: prizes = [] } = useQuery({ queryKey: ['prizes'], queryFn: listPrizes });
  const { data: entries = [] } = useQuery({ queryKey: ['raffle', 'active'], queryFn: allActiveEntries });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const undrawn = prizes.filter((p) => !p.winnerGuestId);

  const [prizeId, setPrizeId] = useState<string>('');
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [winner, setWinner] = useState<{ name: string; ticketNumber: string; prizeName: string } | null>(null);
  const [reel, setReel] = useState<string[]>([]);
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const resetTimer = useRef<number | null>(null);

  // Default to first undrawn prize once prizes load
  const effectivePrizeId = prizeId || undrawn[0]?.id || '';
  const prize = prizes.find((p) => p.id === effectivePrizeId);

  const idleNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      const g = guestsById.get(e.guestId);
      if (g) names.add(g.name);
    }
    const arr = [...names];
    if (arr.length === 0) return ['No entries yet'];
    const padded: string[] = [];
    while (padded.length < VISIBLE_ROWS + 2) padded.push(...arr);
    return padded;
  }, [entries, guestsById]);

  const spin = async () => {
    if (!prize) return;
    // Re-entry guard — admin double-tap during the drawWinner roundtrip
    // would otherwise race two parallel draws on the same prize.
    if (phase !== 'idle') return;
    if (entries.length === 0) {
      alert('No raffle entries available to draw.');
      return;
    }

    setPhase('spinning'); // disable the button immediately
    const result = await drawWinner(prize.id);
    if (!result) {
      setPhase('idle');
      return;
    }

    const allNames = entries
      .map((e) => guestsById.get(e.guestId)?.name)
      .filter((n): n is string => Boolean(n));
    if (allNames.length === 0) return;

    const SPIN_ITEMS = 60;
    const pool: string[] = [];
    for (let i = 0; i < SPIN_ITEMS; i++) {
      pool.push(allNames[Math.floor(Math.random() * allNames.length)]);
    }
    const landingIndex = SPIN_ITEMS - 1;
    pool.push(result.winnerName);
    for (let i = 0; i < 6; i++) {
      pool.push(allNames[Math.floor(Math.random() * allNames.length)]);
    }

    setReel(pool);
    setTransition('none');
    setTranslateY(0);
    setPhase('spinning');
    setWinner(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetY = -(landingIndex - CENTER_INDEX) * ROW_HEIGHT;
        const jitter = Math.random() * 6 - 3;
        setTransition('transform 4.2s cubic-bezier(0.15, 0.85, 0.25, 1)');
        setTranslateY(targetY + jitter);
      });
    });

    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setWinner({ name: result.winnerName, ticketNumber: result.ticketNumber, prizeName: prize.name });
      setPhase('revealed');
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    }, 4500);
  };

  const reset = () => {
    setPhase('idle');
    setWinner(null);
    setReel([]);
    setTranslateY(0);
    setTransition('none');
    // prizes already refreshed via invalidation in spin(); pick next undrawn
    const nextUndrawn = prizes.find((p) => !p.winnerGuestId);
    if (nextUndrawn) setPrizeId(nextUndrawn.id);
  };

  const displayReel = reel.length > 0 ? reel : idleNames;

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Live Raffle Draw</h1>
      <p className="text-plum/60 mb-4 md:mb-6 text-sm md:text-base">{entries.length} active entries in the pool</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
        <div className="card flex flex-col items-center">
          <div className="w-full max-w-[360px]">
            <div
              className="relative mx-auto rounded-2xl overflow-hidden border-4 border-champagne bg-gradient-to-b from-coral to-[#8B2348] shadow-soft"
              style={{ height: VISIBLE_ROWS * ROW_HEIGHT }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#8B2348]/90 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#8B2348]/90 to-transparent z-10" />

              <div
                className="absolute inset-x-2 border-y-2 border-coral/80 bg-coral/10 z-10 rounded-md"
                style={{ top: CENTER_INDEX * ROW_HEIGHT, height: ROW_HEIGHT }}
              />

              <div style={{ transform: `translateY(${translateY}px)`, transition, willChange: 'transform' }}>
                {displayReel.map((name, i) => (
                  <div
                    key={`${i}-${name}`}
                    className="flex items-center justify-center text-cream font-display text-xl sm:text-2xl px-4 text-center truncate"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 text-center text-plum/60 text-xs">
              {phase === 'spinning' ? 'Drawing…' : phase === 'revealed' ? 'Winner locked in' : 'Ready to draw'}
            </div>
          </div>

          <button
            className="btn-primary mt-6 px-10"
            onClick={spin}
            disabled={phase === 'spinning' || !prize}
          >
            {phase === 'spinning' ? 'Drawing…' : 'Draw Winner'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="font-display text-xl mb-3">Select Prize</div>
            <select
              className="input"
              value={effectivePrizeId}
              onChange={(e) => setPrizeId(e.target.value)}
            >
              {prizes.map((p) => (
                <option key={p.id} value={p.id} disabled={!!p.winnerGuestId}>
                  {p.name} {p.winnerGuestId ? '· drawn' : ''}
                </option>
              ))}
            </select>
            {prize && (
              <div className="mt-3">
                <img src={prize.imageUrl} alt={prize.name} className="rounded-xl w-full h-40 object-cover" />
                <div className="text-sm text-plum/70 mt-2">{prize.description}</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="font-display text-xl mb-3">Already Drawn</div>
            <div className="space-y-2 text-sm">
              {prizes.filter((p) => p.winnerGuestId).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>{p.name}</div>
                  <div className="text-plum/60">{guestsById.get(p.winnerGuestId!)?.name}</div>
                </div>
              ))}
              {prizes.every((p) => !p.winnerGuestId) && (
                <div className="text-plum/50 text-sm">No prizes drawn yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {phase === 'revealed' && winner && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#8B2348] via-coral to-rose text-white flex flex-col items-center justify-center px-6 text-center">
          <Confetti count={80} />
          <div className="text-sm uppercase tracking-[0.4em] text-cream/80">Winner</div>
          <div className="font-display text-5xl sm:text-6xl md:text-8xl mt-4 leading-tight">{winner.name}</div>
          <div className="mt-4 text-xl text-cream/90">Ticket {winner.ticketNumber}</div>
          <div className="mt-10 chip bg-white text-plum text-base px-5 py-2 inline-flex items-center gap-2">
            <Trophy size={16} /> {winner.prizeName}
          </div>
          <button className="btn bg-white text-plum mt-10 px-8" onClick={reset}>
            Next draw
          </button>
        </div>
      )}
    </AdminShell>
  );
}
