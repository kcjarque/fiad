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
  Music,
  Gift,
  Wine,
  Coffee,
  Zap,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Store } from '../../types';
import { Modal } from '../shared/Modal';
import { QRDisplay } from '../shared/QRDisplay';

type CatMeta = { label: string; icon: LucideIcon; color: string; ring: string };

const CATEGORY_META: Record<string, CatMeta> = {
  // ── Legacy demo categories (kept for backward compat) ────────────────
  Cake:               { label: 'Cake',       icon: Cake,             color: 'bg-rose-100 text-rose-800',     ring: 'ring-rose-400' },
  Gown:               { label: 'Gown',       icon: Shirt,            color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400' },
  Venue:              { label: 'Venue',      icon: MapPin,           color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400' },
  Photography:        { label: 'Photo',      icon: Camera,           color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400' },
  Catering:           { label: 'Catering',   icon: UtensilsCrossed,  color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400' },
  Coordination:       { label: 'Coord.',     icon: ClipboardCheck,   color: 'bg-sky-100 text-sky-800',       ring: 'ring-sky-400' },
  Invitation:         { label: 'Invites',    icon: Mail,             color: 'bg-indigo-100 text-indigo-800', ring: 'ring-indigo-400' },
  Flowers:            { label: 'Florals',    icon: Flower2,          color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400' },
  'Host/DJ':          { label: 'Host/DJ',    icon: Mic2,             color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400' },
  Videographer:       { label: 'Video',      icon: Film,             color: 'bg-red-100 text-red-800',       ring: 'ring-red-400' },
  Rings:              { label: 'Rings',      icon: GemIcon,          color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400' },
  'Honeymoon Travel': { label: 'Travel',     icon: Plane,            color: 'bg-cyan-100 text-cyan-800',     ring: 'ring-cyan-400' },

  // ── Real FIAD supplier categories ────────────────────────────────────
  Caterer:            { label: 'Catering',   icon: UtensilsCrossed,  color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400' },
  'Event Planner':    { label: 'Planner',    icon: ClipboardCheck,   color: 'bg-sky-100 text-sky-800',       ring: 'ring-sky-400' },
  'Event Planner-Destination Weddings':
                      { label: 'Planner',    icon: ClipboardCheck,   color: 'bg-sky-100 text-sky-800',       ring: 'ring-sky-400' },
  Host:               { label: 'Host',       icon: Mic2,             color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400' },
  'Wedding Band':     { label: 'Band',       icon: Music,            color: 'bg-violet-100 text-violet-800', ring: 'ring-violet-400' },
  Souvenir:           { label: 'Souvenir',   icon: Gift,             color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400' },
  Souvenirs:          { label: 'Souvenir',   icon: Gift,             color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400' },
  'Souvenir-Onsite Engraving':
                      { label: 'Souvenir',   icon: Gift,             color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400' },
  'Souvenir-Mirror PhotoBooth':
                      { label: 'Photo Booth',icon: Camera,           color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400' },
  'Souvenir-Flower Bar':
                      { label: 'Flower Bar', icon: Flower2,          color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400' },
  'Souvenirs-Craft Station':
                      { label: 'Craft',      icon: Gift,             color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400' },
  Skincare:           { label: 'Skincare',   icon: Sparkles,         color: 'bg-rose-100 text-rose-800',     ring: 'ring-rose-400' },
  HMUA:               { label: 'HMUA',       icon: Sparkles,         color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400' },
  'Wines & Spirits':  { label: 'Wines',      icon: Wine,             color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400' },
  'Food Station-Coffee Bar':
                      { label: 'Coffee Bar', icon: Coffee,           color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400' },
  'Food Station-Carchutterie':
                      { label: 'Food',       icon: UtensilsCrossed,  color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400' },
  'Gowns-Couture':    { label: 'Gowns',      icon: Shirt,            color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400' },
  'Lights & Sounds':  { label: 'A/V',        icon: Zap,              color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400' },
  'Photo & Video':    { label: 'Photo/Video',icon: Camera,           color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400' },
  'Printed Invitations':
                      { label: 'Invites',    icon: Mail,             color: 'bg-indigo-100 text-indigo-800', ring: 'ring-indigo-400' },
  'Media Partner':    { label: 'Media',      icon: Film,             color: 'bg-red-100 text-red-800',       ring: 'ring-red-400' },
  Jeweler:            { label: 'Jeweler',    icon: GemIcon,          color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400' },
  'Venue-Yacht Rentals':
                      { label: 'Venue',      icon: MapPin,           color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400' },
};

const FALLBACK: CatMeta = { label: 'Booth', icon: StoreIcon, color: 'bg-plum/10 text-plum', ring: 'ring-plum/40' };

export const getCategoryMeta = (category: string): CatMeta => CATEGORY_META[category] ?? FALLBACK;

/** Parse booth number to a sortable integer (uses the leading digits). */
const boothSortKey = (booth: string): number => {
  const digits = booth.replace(/^[A-Z\-]+/i, '').match(/\d+/);
  return digits ? parseInt(digits[0], 10) : 999;
};

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
    return [...set].sort();
  }, [stores]);

  // Split into Hall 1 (H1-*) and Bazaar Area (BA*), sort each by booth number.
  const zones = useMemo(() => {
    const hall1: Store[] = [];
    const bazaar: Store[] = [];
    const other: Store[] = [];

    stores.forEach((s) => {
      if (s.boothNumber.startsWith('H1-') || s.boothNumber.startsWith('H1 '))
        hall1.push(s);
      else if (s.boothNumber.startsWith('BA'))
        bazaar.push(s);
      else
        other.push(s);
    });

    const sort = (arr: Store[]) =>
      arr.sort((a, b) => boothSortKey(a.boothNumber) - boothSortKey(b.boothNumber));

    return [
      { id: 'h1',     label: 'Hall 1',       stores: sort(hall1) },
      { id: 'bazaar', label: 'Bazaar Area',   stores: sort(bazaar) },
      ...(other.length ? [{ id: 'other', label: 'Other', stores: sort(other) }] : []),
    ].filter((z) => z.stores.length > 0);
  }, [stores]);

  const visibleZones = useMemo(() =>
    zones.map((z) => ({
      ...z,
      stores: activeCategory ? z.stores.filter((s) => s.category === activeCategory) : z.stores,
    })).filter((z) => z.stores.length > 0),
  [zones, activeCategory]);

  return (
    <div>
      {/* Category filter strip */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-plum/50 mb-2 px-1">Browse by category</div>
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 flex flex-col items-center gap-1.5 ${activeCategory === null ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className={`h-12 w-12 rounded-full flex items-center justify-center bg-plum/5 text-plum ${activeCategory === null ? 'ring-2 ring-coral' : ''}`}>
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
                className={`shrink-0 flex flex-col items-center gap-1.5 ${active ? 'opacity-100' : 'opacity-70'}`}
              >
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${meta.color} ${active ? `ring-2 ${meta.ring}` : ''}`}>
                  <Icon size={18} />
                </div>
                <div className="text-[11px] text-plum font-medium whitespace-nowrap">{meta.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone sections */}
      <div className="space-y-4">
        {visibleZones.map((zone) => (
          <div key={zone.id} className="rounded-3xl bg-white shadow-card border border-plum/5 overflow-hidden">
            {/* Zone header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-plum/5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-plum/10 flex items-center justify-center">
                  <DoorOpen size={13} className="text-plum" />
                </div>
                <div className="font-display text-plum text-base">{zone.label}</div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-plum/40">{zone.stores.length} booths</div>
            </div>

            {/* Booth grid */}
            <div className="p-3 grid grid-cols-2 gap-2">
              {zone.stores.map((s) => {
                const meta = getCategoryMeta(s.category);
                const Icon = meta.icon;
                const dim = activeCategory !== null && s.category !== activeCategory;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`group relative rounded-xl bg-white border border-plum/10 p-2.5 text-left transition-all hover:shadow-soft hover:-translate-y-0.5 active:scale-95 ${dim ? 'opacity-25' : ''}`}
                    style={{ minHeight: 76 }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`h-8 w-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-plum/40 uppercase leading-tight">{s.boothNumber}</div>
                        <div className="text-[11px] font-semibold text-plum leading-tight line-clamp-2 mt-0.5">
                          {s.name}
                        </div>
                        <div className={`mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>
                          {meta.label}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {visibleZones.length === 0 && (
          <div className="rounded-2xl bg-white shadow-card p-6 text-center text-plum/60 text-sm">
            No booths match this category.
          </div>
        )}
      </div>

      <div className="mt-3 px-1 text-[11px] text-plum/50 flex items-center gap-1.5">
        <MapPin size={12} /> Tap any booth for details
      </div>

      {/* Booth detail modal */}
      <Modal open={!!selected} onClose={() => handleSelect(null)} title={selected?.name} size="md">
        {selected && (() => {
          const meta = getCategoryMeta(selected.category);
          const Icon = meta.icon;
          return (
            <div className="space-y-4">
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

              <p className="text-sm text-plum/75">{selected.description || 'Visit this booth at the event!'}</p>

              {(selected.email || selected.contact) && (
                <div className="text-xs text-plum/60 space-y-1">
                  {selected.email && <div>✉ {selected.email}</div>}
                  {selected.contact && <div>📞 {selected.contact}</div>}
                </div>
              )}

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
