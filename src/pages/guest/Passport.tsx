import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Lock, Gift, Calendar, MapPin, ScanLine } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { listStores } from '../../services/storeService';
import { stampsForGuest } from '../../services/passportService';
import { Modal } from '../../components/shared/Modal';
import { Hero } from '../../components/shared/Hero';
import type { Store, PassportStamp } from '../../types';

export function Passport() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const guestId = session.guestId;
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: stamps = [] } = useQuery({
    queryKey: ['stamps', guestId],
    queryFn: () => stampsForGuest(guestId),
  });
  const stampMap = new Map(stamps.map((s) => [s.storeId, s]));
  const stampedCount = stampMap.size;
  const total = stores.length;
  const completed = stampedCount === total && total > 0;
  const progress = total === 0 ? 0 : Math.round((stampedCount / total) * 100);

  const [selected, setSelected] = useState<{ store: Store; stamp: PassportStamp } | null>(null);

  return (
    <div className="min-h-full pb-28 bg-cream">
      {/* Hero — progress band */}
      <Hero
        imageUrl="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=70"
        kicker="Passport"
        title={`${stampedCount} / ${total} booths visited`}
        subtitle="Collect stamps from every booth to unlock bonus entries and a surprise keepsake."
        height="lg"
      >
        <div className="mt-1">
          <div className="h-2 bg-cream/20 rounded-full overflow-hidden">
            <div className="h-full foil-gold" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-cream/80">
            <span>{progress}% complete</span>
            <Link to="/app/scan" className="inline-flex items-center gap-1 text-champagne font-medium">
              <ScanLine size={12} /> Scan to stamp
            </Link>
          </div>
        </div>
      </Hero>

      {/* Stamp grid */}
      <div className="px-5 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {stores.map((s) => {
            const stamp = stampMap.get(s.id);
            const stamped = !!stamp;
            return (
              <button
                key={s.id}
                onClick={() => stamped && stamp && setSelected({ store: s, stamp })}
                disabled={!stamped}
                className="group relative rounded-2xl bg-white shadow-card overflow-hidden text-left aspect-[4/5] flex flex-col"
              >
                {/* Image */}
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={s.imageUrl ?? s.logoUrl}
                    alt={s.name}
                    className={`w-full h-full object-cover ${stamped ? '' : 'img-locked'}`}
                  />
                  {!stamped && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-plum/20">
                      <div className="h-10 w-10 rounded-full bg-white/85 text-plum flex items-center justify-center">
                        <Lock size={18} />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-medium drop-shadow">
                        Visit to unlock
                      </div>
                    </div>
                  )}
                  {stamped && (
                    <>
                      {/* Foil stamp overlay */}
                      <div className="absolute top-2 right-2 foil-gold rounded-full px-2.5 py-1 text-[10px] font-bold text-plum shadow animate-stamp">
                        STAMPED
                      </div>
                      {/* Bottom gradient */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#8B2348]/80 to-transparent" />
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 bg-white">
                  <div className="text-[11px] font-medium text-plum line-clamp-1">{s.name}</div>
                  <div className="text-[10px] text-plum/50 flex items-center gap-1">
                    <MapPin size={10} /> Booth {s.boothNumber}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Completion reward card */}
      <div className="px-5 mt-6">
        <div className={`rounded-2xl shadow-card overflow-hidden ${completed ? 'bg-gradient-to-br from-coral to-[#8B2348] text-white' : 'bg-white'}`}>
          <div className="p-5 flex gap-4 items-center">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${completed ? 'foil-gold text-plum' : 'bg-champagne/15 text-champagne'}`}>
              <Gift size={26} />
            </div>
            <div className="flex-1">
              <div className={`text-[10px] uppercase tracking-[0.25em] ${completed ? 'text-cream/80' : 'text-plum/50'}`}>
                Full Passport Reward
              </div>
              <div className={`font-display text-lg mt-0.5 ${completed ? 'text-white' : 'text-plum'}`}>
                {completed ? 'Claim your keepsake gift' : 'Complete all 12 booths'}
              </div>
              <div className={`text-xs mt-1 ${completed ? 'text-cream/80' : 'text-plum/60'}`}>
                {completed
                  ? 'Bonus entries have been issued. Visit the info desk for your surprise gift.'
                  : '+10 raffle entries + a surprise keepsake gift.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keepsake modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} size="sm" title={selected?.store.name}>
        {selected && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
              <img
                src={selected.store.imageUrl ?? selected.store.logoUrl}
                alt={selected.store.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#8B2348]/70 to-transparent" />
              <div className="absolute top-3 right-3 foil-gold rounded-full px-3 py-1 text-xs font-bold text-plum shadow">
                STAMPED
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-cream">
                <div className="text-[10px] uppercase tracking-[0.2em] text-champagne">
                  {selected.store.category}
                </div>
                <div className="font-display text-lg leading-tight">Booth {selected.store.boothNumber}</div>
              </div>
            </div>

            <div className="text-sm text-plum/70">{selected.store.description}</div>

            <div className="flex items-center gap-2 text-xs text-plum/60">
              <Calendar size={14} />
              Stamped on{' '}
              {new Date(selected.stamp.stampedAt).toLocaleString('en-PH', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>

            <button className="btn-primary w-full opacity-60 cursor-not-allowed" disabled>
              Book a consultation (soon)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
