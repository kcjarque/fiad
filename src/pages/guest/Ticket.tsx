import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Trophy, Info, Sparkles, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { getGuest } from '../../services/guestService';
import { entriesForGuest } from '../../services/raffleService';
import { listPrizes } from '../../services/prizeService';
import { getActiveEvent } from '../../services/eventService';
import { QRDisplay } from '../../components/shared/QRDisplay';
import { Modal } from '../../components/shared/Modal';
import { useDb } from '../../hooks/useDb';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown';

export function Ticket() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const guestId = session.guestId;
  const { data: guest, isLoading: guestLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: () => getGuest(guestId),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['raffle', 'guest', guestId],
    queryFn: () => entriesForGuest(guestId),
  });
  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });
  const prizes = useDb(() => listPrizes());
  const [howOpen, setHowOpen] = useState(false);

  const nextPrize = prizes.find((p) => !p.winnerGuestId);
  const drawTarget = nextPrize && event?.date
    ? (() => {
        const base = new Date(`${event.date}T19:30:00`);
        const remainingBefore = prizes.findIndex((p) => p.id === nextPrize.id);
        return new Date(base.getTime() + remainingBefore * 10 * 60_000).toISOString();
      })()
    : null;
  const cd = useCountdown(drawTarget);

  if (guestLoading) {
    return <div className="p-10 text-center text-plum/60">Loading your ticket…</div>;
  }
  if (!guest) return <Navigate to="/app/register" replace />;

  return (
    <div className="min-h-full pb-28 bg-cream">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-plum via-[#4a3550] to-[#2a1d2a]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #D4AF7A 1px, transparent 1px), radial-gradient(circle at 70% 60%, #D4AF7A 1px, transparent 1px), radial-gradient(circle at 40% 80%, #D4AF7A 1px, transparent 1px)',
            backgroundSize: '120px 120px, 160px 160px, 200px 200px',
          }}
        />
        <div className="relative px-5 pt-7 pb-24 text-cream">
          <div className="text-[10px] uppercase tracking-[0.35em] text-champagne">Your Ticket</div>
          <div className="font-display text-[26px] leading-tight mt-2">{event?.name?.split('—')[0]?.trim() ?? 'Forever in a Day'}</div>
          <div className="text-cream/70 text-sm mt-1">
            {event?.date ? new Date(event.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
            {event?.venue ? ` · ${event.venue}` : ''}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-20 relative z-10">
        <div className="relative bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-plum/50">Admit One</div>
            <div className="font-display text-plum text-xl mt-1">{guest.name}</div>
            <div className="text-xs text-plum/50">{guest.email}</div>

            <div className="mt-5 inline-block p-3 rounded-2xl bg-cream/70">
              <QRDisplay value={guest.qrToken} size={180} />
            </div>
            <div className="mt-3 font-mono text-[11px] text-plum/50 tracking-[0.2em]">
              {guest.qrToken.slice(-10).toUpperCase()}
            </div>
          </div>

          <div className="ticket-perforation"><div className="dash" /></div>

          <div className="px-6 py-5 bg-gradient-to-b from-cream/50 to-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-plum/50">Raffle Entries</div>
                <div className="font-display text-plum text-3xl leading-none mt-1">{entries.length}</div>
              </div>
              <div className="foil-gold animate-shine rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                <Trophy size={16} className="text-plum" />
                <span className="font-semibold text-plum text-sm">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setHowOpen(true)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-plum/60 hover:text-plum py-2"
            >
              <Info size={13} /> How it works
            </button>
          </div>
        </div>
      </div>

      {nextPrize && drawTarget && (
        <div className="px-5 mt-5">
          <div className="rounded-2xl bg-white shadow-card overflow-hidden flex">
            <img
              src={nextPrize.imageUrl}
              alt={nextPrize.name}
              className="w-28 h-28 object-cover shrink-0"
            />
            <div className="flex-1 p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-coral">
                <Timer size={12} /> Next Draw
              </div>
              <div className="font-display text-plum text-lg leading-tight mt-1 line-clamp-1">
                {nextPrize.name}
              </div>
              <div className="mt-2 font-mono text-plum font-semibold">
                {cd.done ? 'Drawing now' : `in ${formatCountdown(cd)}`}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={howOpen} onClose={() => setHowOpen(false)} title="How entries work" size="sm">
        <ul className="space-y-3 text-sm text-plum/80">
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-coral/10 text-coral flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-medium text-plum">Spend at a booth</div>
              <div className="text-plum/60 text-xs">Show this QR to the vendor. ₱{event?.raffleRate ?? 100} spent = 1 raffle entry.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-coral/10 text-coral flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
            <div>
              <div className="font-medium text-plum">Complete quests</div>
              <div className="text-plum/60 text-xs">Bonus entries for activities, workshops, and fashion shows.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-coral/10 text-coral flex items-center justify-center shrink-0">
              <Info size={16} />
            </div>
            <div>
              <div className="font-medium text-plum">Visit every booth</div>
              <div className="text-plum/60 text-xs">Complete the passport for +10 entries and a surprise gift.</div>
            </div>
          </li>
        </ul>
      </Modal>
    </div>
  );
}
