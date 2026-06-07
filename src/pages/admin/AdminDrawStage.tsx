import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { Confetti } from '../../components/shared/Confetti';
import { Trophy, MapPin } from 'lucide-react';
import { openChannel, postMessage, type StageMsg, type Prize } from '../../utils/drawChannel';
import { listPrizes } from '../../services/prizeService';
import { listGuests } from '../../services/guestService';
import { allActiveEntries } from '../../services/raffleService';

/**
 * Projector / LCD presentation view for the live raffle draw.
 *
 * Opens in a separate window (the admin opens it from the AdminDraw page),
 * subscribes to the draw channel, and re-renders dramatic full-screen
 * animations as the admin drives the draw from the main window.
 *
 * Auth-protected — checks that the same browser session is logged in as
 * an admin (the auth store is shared via localStorage across windows in
 * the same origin).
 */

const ROW_HEIGHT = 120;          // Big for projector — names visible from across the venue.
const VISIBLE_ROWS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ROWS / 2);

type Phase = 'idle' | 'spinning' | 'revealed';

export function AdminDrawStage() {
  const session = useAuth((s) => s.session);
  // Stage view only makes sense when logged in as admin. We don't strictly
  // need to gate it (no data writes happen here), but lock it down anyway
  // so it can't be projected by an unauthenticated browser window.
  if (session.role !== 'admin') return <Navigate to="/admin/login" replace />;

  const [phase, setPhase] = useState<Phase>('idle');
  // The prize shown during a live spin/reveal comes from the channel; the
  // idle "Up Next" prize is derived from data (see displayPrize below).
  const [channelPrize, setChannelPrize] = useState<Prize | null>(null);
  const [reel, setReel] = useState<string[]>([]);
  const [winner, setWinner] = useState<{ name: string; ticketNumber: string } | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ── Load real data so the stage works even standalone (the projector no
  //    longer depends on the admin window broadcasting to show the count +
  //    next prize). Polls so it stays live as prizes get drawn. ──────────
  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes'],
    queryFn: listPrizes,
    refetchInterval: 4000,
  });
  const { data: guests = [] } = useQuery({
    queryKey: ['guests'],
    queryFn: listGuests,
    refetchInterval: 10000,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['raffle', 'active'],
    queryFn: allActiveEntries,
    refetchInterval: 8000,
  });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const undrawn = useMemo(() => prizes.filter((p) => !p.winnerGuestId), [prizes]);
  const undrawnCount = undrawn.length;
  const drawnList = useMemo(
    () =>
      prizes
        .filter((p) => p.winnerGuestId)
        .map((p) => ({ name: p.name, winner: guestsById.get(p.winnerGuestId!)?.name ?? '—' })),
    [prizes, guestsById],
  );
  // Next undrawn prize in id order (d1 → d2 → grand) for the idle display.
  const dataNextPrize: Prize | null = useMemo(() => {
    const next = [...undrawn].sort((a, b) => a.id.localeCompare(b.id))[0];
    return next ? { id: next.id, name: next.name, description: next.description, imageUrl: next.imageUrl } : null;
  }, [undrawn]);

  useEffect(() => {
    const ch = openChannel();
    channelRef.current = ch;

    const handler = (e: MessageEvent<StageMsg>) => {
      const msg = e.data;
      if (!msg) return;
      switch (msg.type) {
        case 'set_prize':
          // Mirror the admin's currently-selected prize. Counts/drawn list
          // come from our own data query, so we ignore those fields here.
          setChannelPrize(msg.prize);
          if (phase === 'revealed') {
            // Admin clicked next; clear the overlay.
            setPhase('idle');
            setWinner(null);
            setReel([]);
            setTranslateY(0);
            setTransition('none');
          }
          break;
        case 'spin_start': {
          setChannelPrize(msg.prize);
          setReel(msg.reel);
          setTransition('none');
          setTranslateY(0);
          setPhase('spinning');
          setWinner(null);
          // Two RAF flushes to make sure the initial transform commits
          // before the long transition starts.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const targetY = -(msg.landingIndex - CENTER_INDEX) * ROW_HEIGHT;
              const jitter = Math.random() * 6 - 3;
              setTransition(`transform ${msg.durationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)`);
              setTranslateY(targetY + jitter);
            });
          });
          break;
        }
        case 'reveal':
          setChannelPrize(msg.prize);
          setWinner(msg.winner);
          setPhase('revealed');
          break;
        case 'reset':
          setPhase('idle');
          setWinner(null);
          setReel([]);
          setTranslateY(0);
          setTransition('none');
          break;
        case 'pong':
          // (ignored) — only AdminDraw needs to handle this
          break;
        case 'ping':
          // (ignored)
          break;
      }
    };
    ch.addEventListener('message', handler);

    // Announce we're alive so AdminDraw can resend its current state.
    postMessage(ch, { type: 'ping' });

    return () => {
      ch.removeEventListener('message', handler);
      ch.close();
    };
  // We intentionally do not depend on `phase` — handler reads via closure
  // but the values it needs are always passed inside the message body.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The prize shown in "Up Next": the admin's live selection if the channel
  // sent one, otherwise the next undrawn prize from our own data.
  const prize: Prize | null = channelPrize ?? dataNextPrize;

  // Grand prize draws from PAID entries only (mirrors the draw_prize RPC and
  // the admin page). So when the grand prize is up, the idle reel + the
  // eligible count reflect only earned entries.
  const isGrand = prize?.id === 'prize_grand';
  const eligibleEntries = useMemo(
    () => (isGrand ? entries.filter((e) => !e.isComplimentary) : entries),
    [entries, isGrand],
  );
  const eligibleCount = eligibleEntries.length;

  // Idle decorative reel — scroll real participant names from the eligible
  // entry pool so the projector always looks alive. Falls back to a
  // placeholder only when there are genuinely no entries.
  const idleReel = useMemo(() => {
    const names = Array.from(
      new Set(eligibleEntries.map((e) => guestsById.get(e.guestId)?.name).filter((n): n is string => !!n)),
    );
    if (names.length === 0) return Array(VISIBLE_ROWS + 2).fill('Waiting for entries…');
    const out: string[] = [];
    while (out.length < VISIBLE_ROWS + 2) out.push(...names);
    return out;
  }, [eligibleEntries, guestsById]);

  const displayReel = reel.length > 0 ? reel : idleReel;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#3E2A3E] via-[#5a2147] to-[#8B2348] text-cream overflow-hidden flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="px-12 pt-10 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[12px] uppercase tracking-[0.5em] text-champagne">
            Forever in a Day
          </div>
          <h1 className="font-display text-4xl text-cream mt-1">Live Raffle Draw</h1>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cream/60">
            {undrawnCount} prize{undrawnCount === 1 ? '' : 's'} to go
          </div>
          <div className="font-display text-3xl text-champagne mt-1">
            {drawnList.length} drawn
          </div>
        </div>
      </header>

      {/* ── Main stage ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-12 pb-8 min-h-0">
        <div className="w-full max-w-7xl grid grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* Reel */}
          <div className="relative">
            <div
              className="relative rounded-3xl overflow-hidden border-[6px] border-champagne bg-gradient-to-b from-coral to-[#8B2348] shadow-2xl"
              style={{ height: VISIBLE_ROWS * ROW_HEIGHT }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#3E2A3E]/95 via-[#3E2A3E]/60 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#3E2A3E]/95 via-[#3E2A3E]/60 to-transparent z-10" />
              <div
                className="absolute inset-x-4 border-y-[3px] border-champagne bg-coral/15 z-10 rounded-lg"
                style={{ top: CENTER_INDEX * ROW_HEIGHT, height: ROW_HEIGHT }}
              />
              <div
                style={{ transform: `translateY(${translateY}px)`, transition, willChange: 'transform' }}
              >
                {displayReel.map((name, i) => (
                  <div
                    key={`${i}-${name}`}
                    className="flex items-center justify-center text-cream font-display text-5xl px-6 text-center truncate"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center text-cream/60 text-lg uppercase tracking-[0.3em]">
              {phase === 'spinning'
                ? 'Drawing…'
                : phase === 'revealed'
                  ? 'Winner locked in'
                  : 'Ready'}
            </div>
          </div>

          {/* Prize panel */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.4em] text-champagne mb-4 flex items-center justify-between">
              <span>Up Next</span>
              <span className="text-cream/70">
                {eligibleCount.toLocaleString()} {isGrand ? 'paid tickets' : 'tickets'} in pool
              </span>
            </div>
            {prize ? (
              <>
                {isGrand && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-champagne text-plum px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                    <Trophy size={16} /> Grand Prize · Paid Tickets Only
                  </div>
                )}
                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-champagne/40 aspect-[4/3] bg-plum/20">
                  {prize.imageUrl ? (
                    <img src={prize.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cream/40">
                      <Trophy size={64} />
                    </div>
                  )}
                </div>
                <div className="font-display text-4xl text-cream mt-6 leading-tight">
                  {prize.name}
                </div>
                {prize.description && (
                  <div className="text-cream/70 text-lg mt-3 leading-relaxed">
                    {prize.description}
                  </div>
                )}
              </>
            ) : (
              <div className="text-cream/40 text-center py-16 italic">
                {prizes.length === 0 ? 'Loading prizes…' : 'All prizes have been drawn 🎉'}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-12 pb-8 text-center text-[11px] uppercase tracking-[0.4em] text-cream/40 shrink-0">
        Brittany Hotel BGC · June 6–7, 2026
      </footer>

      {/* ── Full-screen winner reveal ────────────────────────────────────── */}
      {phase === 'revealed' && winner && prize && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#8B2348] via-coral to-rose text-white flex flex-col items-center justify-center px-12 text-center">
          <Confetti count={140} />
          <div className="text-base uppercase tracking-[0.5em] text-cream/80 mb-6">
            We have a winner
          </div>
          <div className="font-display text-7xl md:text-9xl leading-none">
            {winner.name}
          </div>
          <div className="mt-8 text-2xl text-cream/90 font-mono tracking-widest">
            Ticket {winner.ticketNumber}
          </div>
          <div className="mt-12 inline-flex items-center gap-3 bg-white text-plum px-8 py-4 rounded-full text-2xl font-medium shadow-2xl">
            <Trophy size={28} /> {prize.name}
          </div>
          {prize.claimLocation && (
            <div className="mt-8 flex items-center gap-2 text-2xl text-cream">
              <MapPin size={26} className="text-champagne" />
              <span>Claim at <span className="font-semibold">{prize.claimLocation}</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
