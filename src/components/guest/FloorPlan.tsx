import { useMemo, useState } from 'react';
import {
  Cake,
  Shirt,
  MapPin,
  Camera,
  UtensilsCrossed,
  ClipboardCheck,
  Mail,
  Flower2,
  Mic2,
  Film,
  Gem as GemIcon,
  Plane,
  Store as StoreIcon,
  DoorOpen,
  Heart,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import type { Store } from '../../types';
import { Modal } from '../shared/Modal';
import { QRDisplay } from '../shared/QRDisplay';

type CatMeta = { label: string; icon: LucideIcon; color: string; ring: string };

const CATEGORY_META: Record<string, CatMeta> = {
  Cake: { label: 'Cake', icon: Cake, color: 'bg-rose-100 text-rose-800', ring: 'ring-rose-400' },
  Gown: { label: 'Gown', icon: Shirt, color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400' },
  Venue: { label: 'Venue', icon: MapPin, color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400' },
  Photography: { label: 'Photo', icon: Camera, color: 'bg-amber-100 text-amber-800', ring: 'ring-amber-400' },
  Catering: { label: 'Catering', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400' },
  Coordination: { label: 'Coord.', icon: ClipboardCheck, color: 'bg-sky-100 text-sky-800', ring: 'ring-sky-400' },
  Invitation: { label: 'Invites', icon: Mail, color: 'bg-indigo-100 text-indigo-800', ring: 'ring-indigo-400' },
  Flowers: { label: 'Florals', icon: Flower2, color: 'bg-pink-100 text-pink-800', ring: 'ring-pink-400' },
  'Host/DJ': { label: 'Host/DJ', icon: Mic2, color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400' },
  Videographer: { label: 'Video', icon: Film, color: 'bg-red-100 text-red-800', ring: 'ring-red-400' },
  Rings: { label: 'Rings', icon: GemIcon, color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400' },
  'Honeymoon Travel': { label: 'Travel', icon: Plane, color: 'bg-cyan-100 text-cyan-800', ring: 'ring-cyan-400' },
};

const FALLBACK: CatMeta = { label: 'Booth', icon: StoreIcon, color: 'bg-plum/10 text-plum', ring: 'ring-plum/40' };

export const getCategoryMeta = (category: string): CatMeta => CATEGORY_META[category] ?? FALLBACK;

type Props = {
  stores: Store[];
  initialSelectedId?: string | null;
  onSelect?: (s: Store | null) => void;
};

export function FloorPlan({ stores, initialSelectedId, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Store | null>(
    initialSelectedId ? stores.find((s) => s.id === initialSelectedId) ?? null : null,
  );

  const handleSelect = (s: Store | null) => {
    setSelected(s);
    onSelect?.(s);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => set.add(s.category));
    return [...set];
  }, [stores]);

  // Group booths by row letter — A top, F bottom, reversed so "Entrance" feels entering from top.
  const rows = useMemo(() => {
    const map = new Map<string, Store[]>();
    [...stores]
      .sort((a, b) => a.boothNumber.localeCompare(b.boothNumber))
      .forEach((s) => {
        const row = s.boothNumber.charAt(0);
        if (!map.has(row)) map.set(row, []);
        map.get(row)!.push(s);
      });
    return [...map.entries()];
  }, [stores]);

  return (
    <div>
      {/* Category filter */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-plum/50 mb-2 px-1">Browse by category</div>
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 flex flex-col items-center gap-1.5 ${
              activeCategory === null ? 'opacity-100' : 'opacity-70'
            }`}
          >
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center bg-plum/5 text-plum ${
                activeCategory === null ? 'ring-2 ring-coral' : ''
              }`}
            >
              <StoreIcon size={18} />
            </div>
            <div className="text-[11px] text-plum font-medium">All</div>
          </button>
          {categories.map((c) => {
            const meta = getCategoryMeta(c);
            const Icon = meta.icon;
            const active = activeCategory === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(active ? null : c)}
                className={`shrink-0 flex flex-col items-center gap-1.5 ${active ? 'opacity-100' : 'opacity-80'}`}
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${meta.color} ${
                    active ? `ring-2 ${meta.ring}` : ''
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="text-[11px] text-plum font-medium whitespace-nowrap">{meta.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor plan — top-down view */}
      <div className="rounded-3xl bg-white shadow-card p-4 border border-plum/5">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="font-display text-plum text-base">Hall 1 · Floor Plan</div>
          <div className="text-[10px] uppercase tracking-wider text-plum/40">{stores.length} booths</div>
        </div>

        <div className="relative rounded-2xl bg-cream/80 border border-plum/5 px-3 pt-8 pb-10">
          {/* Entrance */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="bg-plum text-cream rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 shadow">
              <DoorOpen size={11} /> Entrance
            </div>
          </div>

          {/* Central aisle guide */}
          <div
            aria-hidden
            className="absolute inset-y-10 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-plum/15"
          />

          {/* Rows */}
          <div className="space-y-3">
            {rows.map(([rowLetter, rowStores]) => (
              <div key={rowLetter} className="flex items-stretch gap-2">
                {/* Row label */}
                <div className="w-5 flex items-center justify-center">
                  <div className="text-[10px] text-plum/40 font-mono">{rowLetter}</div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {rowStores.map((s) => {
                    const meta = getCategoryMeta(s.category);
                    const Icon = meta.icon;
                    const dim = activeCategory && s.category !== activeCategory;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelect(s)}
                        className={`group relative rounded-xl bg-white border border-plum/10 p-2 text-left transition-all hover:shadow-soft hover:-translate-y-0.5 ${
                          dim ? 'opacity-25' : ''
                        }`}
                        style={{ minHeight: 76 }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`h-8 w-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-mono text-plum/40 uppercase">{s.boothNumber}</div>
                            <div className="text-[11px] font-semibold text-plum leading-tight line-clamp-2">
                              {s.name}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="w-5" aria-hidden />
              </div>
            ))}
          </div>

          {/* Exit */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-plum/40 uppercase tracking-[0.2em]">
            ← Aisle →
          </div>
        </div>

        <div className="mt-3 px-1 text-[11px] text-plum/50 flex items-center gap-1.5">
          <MapPin size={12} /> Tap any booth for details
        </div>
      </div>

      {/* Booth detail modal */}
      <Modal open={!!selected} onClose={() => handleSelect(null)} title={selected?.name} size="md">
        {selected &&
          (() => {
            const meta = getCategoryMeta(selected.category);
            const Icon = meta.icon;
            return (
              <div className="space-y-4">
                {/* Hero image */}
                {selected.imageUrl && (
                  <div className="relative -mx-6 -mt-5 aspect-[16/10] overflow-hidden">
                    <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-plum/70 to-transparent" />
                    <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                      <div className="text-cream">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-champagne">{selected.category}</div>
                        <div className="font-display text-xl leading-tight">Booth {selected.boothNumber}</div>
                      </div>
                      <div className={`h-10 w-10 rounded-full ${meta.color} flex items-center justify-center shadow`}>
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-plum/75">{selected.description}</p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button disabled className="btn-ghost border border-plum/15 opacity-60 cursor-not-allowed">
                    <Heart size={16} className="mr-1.5" /> Save
                  </button>
                  <button disabled className="btn-primary opacity-60 cursor-not-allowed">
                    <Calendar size={16} className="mr-1.5" /> Book slot
                  </button>
                </div>

                <details className="rounded-xl border border-plum/10 px-3 py-2">
                  <summary className="cursor-pointer text-sm text-plum font-medium select-none">
                    Show booth QR
                  </summary>
                  <div className="mt-3 flex flex-col items-center">
                    <QRDisplay value={selected.qrToken} size={160} />
                    <div className="text-[11px] text-plum/60 mt-2">Present this for stamps.</div>
                  </div>
                </details>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
