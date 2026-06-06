import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../stores/authStore';
import { Confetti } from '../../components/shared/Confetti';
import { Trophy } from 'lucide-react';
import { openChannel, postMessage, type StageMsg, type Prize } from '../../utils/drawChannel';

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
  const [prize, setPrize] = useState<Prize | null>(null);
  const [drawnList, setDrawnList] = useState<{ name: string; winner: string }[]>([]);
  const [undrawnCount, setUndrawnCount] = useState(0);
  const [reel, setReel] = useState<string[]>([]);
  const [winner, setWinner] = useState<{ name: string; ticketNumber: string } | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const ch = openChannel();
    channelRef.current = ch;

    const handler = (e: MessageEvent<StageMsg>) => {
      const msg = e.data;
      if (!msg) return;
      switch (msg.type) {
        case 'set_prize':
          setPrize(msg.prize);
          setUndrawnCount(msg.undrawnCount);
          setDrawnList(msg.drawnList);
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
          setPrize(msg.prize);
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
          setPrize(msg.prize);
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

  // Idle decorative reel — random names from drawn list (or a placeholder).
  const idleReel = drawnList.length > 0
    ? Array.from({ length: VISIBLE_ROWS + 2 }, (_, i) => drawnList[i % drawnList.length].winner)
    : Array(VISIBLE_ROWS + 2).fill('Waiting for next draw…');

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
            <div className="text-[11px] uppercase tracking-[0.4em] text-champagne mb-4">
              Up Next
            </div>
            {prize ? (
              <>
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
                Waiting for the admin to select a prize…
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
        </div>
      )}
    </div>
  );
}
