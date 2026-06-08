import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { drawWinner, listPrizes } from '../../services/prizeService';
import { allEntries, wonTicketNumbers } from '../../services/raffleService';
import { listGuests } from '../../services/guestService';
import { listStores } from '../../services/storeService';
import { Confetti } from '../../components/shared/Confetti';
import { Trophy, MonitorPlay } from 'lucide-react';
import { openChannel, postMessage, type StageMsg, type Prize as ChannelPrize } from '../../utils/drawChannel';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ROWS / 2);

export function AdminDraw() {
  const queryClient = useQueryClient();
  const { data: prizes = [] } = useQuery({ queryKey: ['prizes'], queryFn: listPrizes });
  // Full pool (incl. tickets that already won) + the won-ticket set, so we
  // can apply the won-exclusion only for hourly prizes — the grand prize has
  // no past-winner limitation.
  const { data: allPool = [] } = useQuery({ queryKey: ['raffle', 'all'], queryFn: allEntries });
  const { data: wonTickets = new Set<string>() } = useQuery({ queryKey: ['raffle', 'won'], queryFn: wonTicketNumbers });
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: listGuests });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const undrawn = prizes.filter((p) => !p.winnerGuestId);

  const [prizeId, setPrizeId] = useState<string>('');
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [winner, setWinner] = useState<{ name: string; ticketNumber: string; prizeName: string } | null>(null);
  const [reel, setReel] = useState<string[]>([]);
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const resetTimer = useRef<number | null>(null);

  // Cross-window channel to the LCD/projector stage view.
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [stageOpen, setStageOpen] = useState(false);

  // Default to first undrawn prize once prizes load
  const effectivePrizeId = prizeId || undrawn[0]?.id || '';
  const prize = prizes.find((p) => p.id === effectivePrizeId);

  // Resolve "Store Name · Booth X" for a prize's sponsor so the announcement
  // can tell the winner where to claim. Falls back to the registration desk.
  const claimLocationFor = (sponsoredByStoreId?: string): string => {
    const s = sponsoredByStoreId ? storesById.get(sponsoredByStoreId) : undefined;
    if (!s) return 'the Registration desk';
    return s.boothNumber ? `${s.name} · Booth ${s.boothNumber}` : s.name;
  };
  const toChannelPrize = (p: typeof prize): ChannelPrize | null =>
    p
      ? {
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          claimLocation: claimLocationFor(p.sponsoredByStoreId),
        }
      : null;

  // Latest set_prize payload, kept in a ref so the ping handler (which has
  // an empty-deps closure) can re-broadcast current state when the stage
  // view connects/reconnects.
  const latestSetPrizeRef = useRef<StageMsg | null>(null);

  // ── Stage channel: open on mount, broadcast prize / drawn list updates ──
  useEffect(() => {
    const ch = openChannel();
    channelRef.current = ch;
    const handler = (e: MessageEvent<StageMsg>) => {
      // Stage view announces itself with `ping` — flip the indicator AND
      // re-send the current prize so a stage opened after selection syncs.
      if (e.data?.type === 'ping') {
        setStageOpen(true);
        postMessage(ch, { type: 'pong' });
        if (latestSetPrizeRef.current) postMessage(ch, latestSetPrizeRef.current);
      }
    };
    ch.addEventListener('message', handler);
    return () => {
      ch.removeEventListener('message', handler);
      ch.close();
    };
  }, []);

  // Whenever the selected prize OR the drawn-list changes, sync the stage.
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const channelPrize: ChannelPrize | null = toChannelPrize(prize);
    const drawnList = prizes
      .filter((p) => p.winnerGuestId)
      .map((p) => ({ name: p.name, winner: guestsById.get(p.winnerGuestId!)?.name ?? '—' }));
    const msg: StageMsg = {
      type: 'set_prize',
      prize: channelPrize,
      undrawnCount: undrawn.length,
      drawnList,
    };
    latestSetPrizeRef.current = msg;
    postMessage(ch, msg);
  }, [prize, prizes, undrawn.length, guestsById]);

  const openStage = () => {
    const w = 1600;
    const h = 900;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + 60;
    window.open(
      '/admin/draw/stage',
      'fiad-draw-stage',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    );
  };

  // Eligibility rules (must mirror the draw_prize RPC):
  //   • Grand prize  → PAID entries only (no complimentary), but NO
  //                    past-winner exclusion — a ticket that already won an
  //                    hourly prize can still win the grand.
  //   • Hourly prize → whole pool, but exclude tickets that already won
  //                    (no double winners on the hourly draws).
  const isGrand = effectivePrizeId === 'prize_grand';
  const eligibleEntries = useMemo(
    () =>
      isGrand
        ? allPool.filter((e) => !e.isComplimentary)
        : allPool.filter((e) => !wonTickets.has(e.ticketNumber)),
    [allPool, wonTickets, isGrand],
  );

  const idleNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of eligibleEntries) {
      const g = guestsById.get(e.guestId);
      if (g) names.add(g.name);
    }
    const arr = [...names];
    if (arr.length === 0) return ['No entries yet'];
    const padded: string[] = [];
    while (padded.length < VISIBLE_ROWS + 2) padded.push(...arr);
    return padded;
  }, [eligibleEntries, guestsById]);

  const spin = async () => {
    if (!prize) return;
    // Re-entry guard — admin double-tap during the drawWinner roundtrip
    // would otherwise race two parallel draws on the same prize.
    if (phase !== 'idle') return;
    if (eligibleEntries.length === 0) {
      alert(
        isGrand
          ? 'No PAID entries available — the grand prize draws from earned entries only.'
          : 'No raffle entries available to draw.',
      );
      return;
    }

    setPhase('spinning'); // disable the button immediately
    const result = await drawWinner(prize.id);
    if (!result) {
      setPhase('idle');
      return;
    }

    // Reel spins through the eligible pool only (so a grand-prize draw never
    // flashes complimentary-only guests who can't actually win it).
    const allNames = eligibleEntries
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

    const SPIN_DURATION_MS = 4200;

    // Broadcast to the projector window so it spins in sync.
    if (channelRef.current && prize) {
      postMessage(channelRef.current, {
        type: 'spin_start',
        prize: toChannelPrize(prize)!,
        reel: pool,
        landingIndex,
        durationMs: SPIN_DURATION_MS,
      });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetY = -(landingIndex - CENTER_INDEX) * ROW_HEIGHT;
        const jitter = Math.random() * 6 - 3;
        setTransition(`transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)`);
        setTranslateY(targetY + jitter);
      });
    });

    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setWinner({ name: result.winnerName, ticketNumber: result.ticketNumber, prizeName: prize.name });
      setPhase('revealed');
      // Reveal on the projector with a tiny extra beat so the reel comes
      // to a stop visually before the splash takes over.
      if (channelRef.current && prize) {
        postMessage(channelRef.current, {
          type: 'reveal',
          winner: { name: result.winnerName, ticketNumber: result.ticketNumber },
          prize: toChannelPrize(prize)!,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    }, SPIN_DURATION_MS + 300);
  };

  const reset = () => {
    setPhase('idle');
    setWinner(null);
    setReel([]);
    setTranslateY(0);
    setTransition('none');
    if (channelRef.current) postMessage(channelRef.current, { type: 'reset' });
    // prizes already refreshed via invalidation in spin(); pick next undrawn
    const nextUndrawn = prizes.find((p) => !p.winnerGuestId);
    if (nextUndrawn) setPrizeId(nextUndrawn.id);
  };

  const displayReel = reel.length > 0 ? reel : idleNames;

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Live Raffle Draw</h1>
          <p className="text-plum/60 mt-1 text-sm md:text-base">
            {eligibleEntries.length} {isGrand ? 'PAID entries eligible (grand prize)' : 'active entries in the pool'}
          </p>
        </div>
        <button
          onClick={openStage}
          className="inline-flex items-center gap-2 rounded-full bg-plum text-cream px-4 py-2 text-sm font-medium hover:bg-[#5a2147] transition-colors shrink-0"
          title="Open the projector window — drag it to the second monitor / LCD"
        >
          <MonitorPlay size={16} />
          <span className="hidden sm:inline">Open Stage View</span>
          <span className="sm:hidden">Stage</span>
          <span
            className={`ml-1 h-2 w-2 rounded-full ${stageOpen ? 'bg-emerald-400' : 'bg-coral'}`}
            title={stageOpen ? 'Stage connected' : 'Stage not connected'}
          />
        </button>
      </div>

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
          <div className="mt-4 text-cream/90 text-lg">
            Claim at <span className="font-semibold">{claimLocationFor(prize?.sponsoredByStoreId)}</span>
          </div>
          <button className="btn bg-white text-plum mt-10 px-8" onClick={reset}>
            Next draw
          </button>
        </div>
      )}
    </AdminShell>
  );
}
