import { useMemo, useState } from 'react';
import {
  Cake, Shirt, MapPin, Camera, UtensilsCrossed, ClipboardCheck, Mail,
  Flower2, Mic2, Film, Gem as GemIcon, Plane, Store as StoreIcon,
  DoorOpen, Heart, Calendar, Music, Gift, Wine, Coffee, Zap, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Store } from '../../types';
import { Modal } from '../shared/Modal';
import { QRDisplay } from '../shared/QRDisplay';

type CatMeta = { label: string; icon: LucideIcon; color: string; ring: string; fill: string };

const CATEGORY_META: Record<string, CatMeta> = {
  Cake:                           { label: 'Cake',        icon: Cake,            color: 'bg-rose-100 text-rose-800',     ring: 'ring-rose-400',     fill: '#fecdd3' },
  Gown:                           { label: 'Gown',        icon: Shirt,           color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400',   fill: '#e9d5ff' },
  Venue:                          { label: 'Venue',       icon: MapPin,          color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400', fill: '#a7f3d0' },
  Photography:                    { label: 'Photo',       icon: Camera,          color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400',    fill: '#fde68a' },
  Catering:                       { label: 'Catering',    icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400',   fill: '#fed7aa' },
  Coordination:                   { label: 'Coord.',      icon: ClipboardCheck,  color: 'bg-sky-100 text-sky-800',       ring: 'ring-sky-400',      fill: '#bae6fd' },
  Invitation:                     { label: 'Invites',     icon: Mail,            color: 'bg-indigo-100 text-indigo-800', ring: 'ring-indigo-400',   fill: '#c7d2fe' },
  Flowers:                        { label: 'Florals',     icon: Flower2,         color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400',     fill: '#fbcfe8' },
  'Host/DJ':                      { label: 'Host/DJ',     icon: Mic2,            color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400', fill: '#f5d0fe' },
  Videographer:                   { label: 'Video',       icon: Film,            color: 'bg-red-100 text-red-800',       ring: 'ring-red-400',      fill: '#fecaca' },
  Rings:                          { label: 'Rings',       icon: GemIcon,         color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400',   fill: '#fef08a' },
  'Honeymoon Travel':             { label: 'Travel',      icon: Plane,           color: 'bg-cyan-100 text-cyan-800',     ring: 'ring-cyan-400',     fill: '#a5f3fc' },
  Caterer:                        { label: 'Catering',    icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400',   fill: '#fed7aa' },
  'Event Planner':                { label: 'Planner',     icon: ClipboardCheck,  color: 'bg-sky-100 text-sky-800',       ring: 'ring-sky-400',      fill: '#bae6fd' },
  'Event Planner-Destination Weddings': { label: 'Planner', icon: ClipboardCheck, color: 'bg-sky-100 text-sky-800',     ring: 'ring-sky-400',      fill: '#bae6fd' },
  Host:                           { label: 'Host',        icon: Mic2,            color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400', fill: '#f5d0fe' },
  'Wedding Band':                 { label: 'Band',        icon: Music,           color: 'bg-violet-100 text-violet-800', ring: 'ring-violet-400',   fill: '#ddd6fe' },
  Souvenir:                       { label: 'Souvenir',    icon: Gift,            color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400',     fill: '#99f6e4' },
  Souvenirs:                      { label: 'Souvenir',    icon: Gift,            color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400',     fill: '#99f6e4' },
  'Souvenir-Onsite Engraving':    { label: 'Souvenir',    icon: Gift,            color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400',     fill: '#99f6e4' },
  'Souvenir-Mirror PhotoBooth':   { label: 'Photo Booth', icon: Camera,          color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400',    fill: '#fde68a' },
  'Souvenir-Flower Bar':          { label: 'Flower Bar',  icon: Flower2,         color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400',     fill: '#fbcfe8' },
  'Souvenirs-Craft Station':      { label: 'Craft',       icon: Gift,            color: 'bg-teal-100 text-teal-800',     ring: 'ring-teal-400',     fill: '#99f6e4' },
  Skincare:                       { label: 'Skincare',    icon: Sparkles,        color: 'bg-rose-100 text-rose-800',     ring: 'ring-rose-400',     fill: '#fecdd3' },
  HMUA:                           { label: 'HMUA',        icon: Sparkles,        color: 'bg-pink-100 text-pink-800',     ring: 'ring-pink-400',     fill: '#fbcfe8' },
  'Wines & Spirits':              { label: 'Wines',       icon: Wine,            color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400',   fill: '#e9d5ff' },
  'Food Station-Coffee Bar':      { label: 'Coffee Bar',  icon: Coffee,          color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400',    fill: '#fde68a' },
  'Food Station-Carchutterie':    { label: 'Food',        icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400',   fill: '#fed7aa' },
  'Gowns-Couture':                { label: 'Gowns',       icon: Shirt,           color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400',   fill: '#e9d5ff' },
  'Lights & Sounds':              { label: 'A/V',         icon: Zap,             color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400',   fill: '#fef08a' },
  'Photo & Video':                { label: 'Photo/Video', icon: Camera,          color: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-400',    fill: '#fde68a' },
  'Printed Invitations':          { label: 'Invites',     icon: Mail,            color: 'bg-indigo-100 text-indigo-800', ring: 'ring-indigo-400',   fill: '#c7d2fe' },
  'Media Partner':                { label: 'Media',       icon: Film,            color: 'bg-red-100 text-red-800',       ring: 'ring-red-400',      fill: '#fecaca' },
  Jeweler:                        { label: 'Jeweler',     icon: GemIcon,         color: 'bg-yellow-100 text-yellow-900', ring: 'ring-yellow-400',   fill: '#fef08a' },
  'Venue-Yacht Rentals':          { label: 'Venue',       icon: MapPin,          color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400', fill: '#a7f3d0' },
};

const FALLBACK: CatMeta = { label: 'Booth', icon: StoreIcon, color: 'bg-plum/10 text-plum', ring: 'ring-plum/40', fill: '#e5e7eb' };

export const getCategoryMeta = (category: string): CatMeta => CATEGORY_META[category] ?? FALLBACK;

// ─── SVG floor plan: Bazaar Area (Bamboo Hall) ───────────────────────────────
// viewBox 960 × 580.  All positions traced from the architectural floor plan.

type BoothRect = { booth: string; x: number; y: number; w: number; h: number };

const BAZAAR_BOOTHS: BoothRect[] = [
  // ── Top wall, left to right ──────────────────────────────────────────────
  { booth: 'BA35-36', x:   0, y:   0, w: 132, h: 78 },
  { booth: 'BA34',    x: 132, y:   0, w:  65, h: 78 },
  // gap x=197-263 (BA33 sits in notch below)
  { booth: 'BA32',    x: 263, y:   0, w:  65, h: 70 },
  { booth: 'BA31',    x: 328, y:   0, w:  65, h: 70 },
  { booth: 'BA30',    x: 393, y:   0, w:  65, h: 70 },
  // gap x=458-480
  { booth: 'BA28',    x: 480, y:   0, w:  58, h: 70 },
  { booth: 'BA27',    x: 538, y:   0, w:  58, h: 70 },
  { booth: 'BA26',    x: 596, y:   0, w:  57, h: 70 },
  // gap x=653-678 (BA25 sits in notch below)
  { booth: 'BA24',    x: 678, y:   0, w:  55, h: 70 },
  { booth: 'BA23',    x: 733, y:   0, w:  55, h: 70 },
  { booth: 'BA22',    x: 788, y:   0, w:  55, h: 70 },
  { booth: 'BA21',    x: 843, y:   0, w: 117, h: 165 }, // tall corner, top-right

  // ── Notch booths (in the wall gaps) ─────────────────────────────────────
  { booth: 'BA33',    x: 197, y:  78, w:  75, h: 80 },
  { booth: 'BA25',    x: 653, y:  70, w:  78, h: 88 },

  // ── Left wall, top to bottom ─────────────────────────────────────────────
  { booth: 'BA37',    x:   0, y:  78, w:  78, h: 86 },
  { booth: 'BA38',    x:   0, y: 164, w:  78, h: 86 },
  { booth: 'BA39',    x:   0, y: 250, w:  78, h: 86 },
  { booth: 'BA40',    x:   0, y: 336, w:  78, h: 110 }, // BA40 ends at y=446

  // ── Right wall, top to bottom (below BA21 which ends at y=165) ──────────
  { booth: 'BA18-20', x: 878, y: 165, w:  82, h: 172 }, // 3 booths combined
  { booth: 'BA17',    x: 878, y: 337, w:  82, h:  63 },
  { booth: 'BA16',    x: 878, y: 400, w:  82, h:  63 },
  { booth: 'BA15',    x: 878, y: 463, w:  82, h:  63 },

  // ── Bottom area, left to right ───────────────────────────────────────────
  { booth: 'BA1',     x:  78, y: 455, w:  76, h:  93 },
  { booth: 'BA2-3',   x: 154, y: 455, w: 116, h:  93 },
  { booth: 'BA4',     x: 295, y: 490, w:  68, h:  80 },
  { booth: 'BA5',     x: 363, y: 490, w:  68, h:  80 },
  { booth: 'BA6',     x: 431, y: 490, w:  68, h:  80 },
  { booth: 'BA7',     x: 499, y: 490, w:  68, h:  80 },
  { booth: 'BA8',     x: 567, y: 453, w: 113, h: 115 }, // large
  { booth: 'BA9',     x: 680, y: 453, w:  70, h:  63 },
  { booth: 'BA10',    x: 680, y: 516, w:  70, h:  62 },
  { booth: 'BA11-14', x: 750, y: 453, w: 128, h: 127 }, // large, ends at x=878, y=580
];

// Interior service / circulation areas (not booths, just labeled zones)
const SERVICE_AREAS = [
  { label: 'MCatering\nService', x: 197, y: 163, w: 210, h: 155 },
  { label: 'MCatering\nService', x: 492, y: 163, w: 210, h: 155 },
  { label: 'Gown\nFitting Room',  x: 197, y: 323, w: 155, h: 128 },
  { label: 'Photo & Video\nFilm Room', x: 412, y: 323, w: 165, h: 128 },
  { label: 'Cake\nTasting',       x: 310, y: 435, w: 105, h:  68 },
];

// Wrap long store names to fit inside a booth rect
function wrapName(name: string, maxW: number): string[] {
  const charsPerLine = Math.max(6, Math.floor(maxW / 6.5));
  const words = name.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= charsPerLine) { current = candidate; }
    else { if (current) lines.push(current); current = w; }
    if (lines.length >= 2) break;
  }
  if (current && lines.length < 3) lines.push(current);
  return lines;
}

function BazaarMap({
  stores,
  selected,
  activeCategory,
  onSelect,
}: {
  stores: Store[];
  selected: Store | null;
  activeCategory: string | null;
  onSelect: (s: Store | null) => void;
}) {
  const byBooth = useMemo(() => new Map(stores.map((s) => [s.boothNumber, s])), [stores]);

  return (
    <div className="overflow-auto rounded-2xl border border-plum/10 bg-white shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-plum/50 px-3 pt-3 pb-1">
        Bazaar Area · Bamboo Hall
      </div>
      <svg
        viewBox="0 0 960 580"
        style={{ minWidth: 640, width: '100%', display: 'block' }}
        fontFamily="system-ui, sans-serif"
      >
        {/* Room background */}
        <rect x={0} y={0} width={960} height={580} fill="#faf8f5" stroke="#c9b99a" strokeWidth={2} />

        {/* Interior open space */}
        <rect x={78} y={158} width={800} height={292} fill="#f2ece4" />

        {/* Service / circulation zones */}
        {SERVICE_AREAS.map((sa, i) => (
          <g key={i}>
            <rect x={sa.x} y={sa.y} width={sa.w} height={sa.h}
              fill="#e8e0d5" stroke="#c9b99a" strokeWidth={1} strokeDasharray="4 3" />
            {sa.label.split('\n').map((line, li) => (
              <text key={li} x={sa.x + sa.w / 2} y={sa.y + sa.h / 2 + (li - 0.5) * 13}
                textAnchor="middle" fontSize={9} fill="#8a7560" fontStyle="italic">
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* Center hall label */}
        <text x={478} y={260} textAnchor="middle" fontSize={13} fill="#b0956e"
          fontWeight="600" letterSpacing={1}>
          Bamboo Hall · 369 sqm
        </text>

        {/* Booth rectangles */}
        {BAZAAR_BOOTHS.map((rect) => {
          const store = byBooth.get(rect.booth);
          const meta = store ? getCategoryMeta(store.category) : FALLBACK;
          const isSelected = selected?.boothNumber === rect.booth;
          const dimmed = activeCategory !== null && store ? store.category !== activeCategory : false;
          const cx = rect.x + rect.w / 2;
          const nameLines = store ? wrapName(store.name, rect.w - 6) : [];

          return (
            <g
              key={rect.booth}
              onClick={() => store ? onSelect(isSelected ? null : store) : undefined}
              style={{ cursor: store ? 'pointer' : 'default' }}
              opacity={dimmed ? 0.2 : 1}
            >
              <rect
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                fill={store ? meta.fill : '#e5e7eb'}
                stroke={isSelected ? '#7c3aed' : '#fff'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                rx={2}
              />
              {/* Booth number */}
              <text
                x={cx} y={rect.y + 12}
                textAnchor="middle" fontSize={8.5} fill="#555" fontWeight="700"
              >
                {rect.booth}
              </text>
              {/* Store name lines */}
              {nameLines.map((line, li) => (
                <text
                  key={li}
                  x={cx}
                  y={rect.y + 23 + li * 10}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="#222"
                >
                  {line}
                </text>
              ))}
              {/* No store: faint placeholder */}
              {!store && (
                <text x={cx} y={rect.y + rect.h / 2 + 4}
                  textAnchor="middle" fontSize={8} fill="#aaa" fontStyle="italic">
                  TBC
                </text>
              )}
            </g>
          );
        })}

        {/* Selected booth highlight ring */}
        {selected && (() => {
          const r = BAZAAR_BOOTHS.find((b) => b.booth === selected.boothNumber);
          if (!r) return null;
          return (
            <rect x={r.x - 1} y={r.y - 1} width={r.w + 2} height={r.h + 2}
              fill="none" stroke="#7c3aed" strokeWidth={3} rx={3} />
          );
        })()}
      </svg>
      <div className="px-3 pb-2 text-[10px] text-plum/40 flex items-center gap-1 mt-1">
        <MapPin size={10} /> Tap a booth to see details
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  stores: Store[];
  initialSelectedId?: string | null;
  onSelect?: (s: Store | null) => void;
};

const boothSortKey = (b: string) => {
  const m = b.replace(/^[A-Z\-]+/i, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 999;
};

export function FloorPlan({ stores, initialSelectedId, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Store | null>(
    initialSelectedId ? stores.find((s) => s.id === initialSelectedId) ?? null : null,
  );

  const handleSelect = (s: Store | null) => { setSelected(s); onSelect?.(s); };

  const categories = useMemo(() => [...new Set(stores.map((s) => s.category))].sort(), [stores]);

  const hall1 = useMemo(() =>
    stores
      .filter((s) => s.boothNumber.startsWith('H1'))
      .filter((s) => !activeCategory || s.category === activeCategory)
      .sort((a, b) => boothSortKey(a.boothNumber) - boothSortKey(b.boothNumber)),
  [stores, activeCategory]);

  const bazaar = useMemo(() =>
    stores.filter((s) => s.boothNumber.startsWith('BA')),
  [stores]);

  return (
    <div className="space-y-5">
      {/* Category filter strip */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-plum/50 mb-2 px-1">Filter by category</div>
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
              <button key={c} onClick={() => setActiveCategory(active ? null : c)}
                className={`shrink-0 flex flex-col items-center gap-1.5 ${active ? 'opacity-100' : 'opacity-70'}`}>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${meta.color} ${active ? `ring-2 ${meta.ring}` : ''}`}>
                  <Icon size={18} />
                </div>
                <div className="text-[11px] text-plum font-medium whitespace-nowrap">{meta.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bazaar Area SVG map */}
      {(!activeCategory || bazaar.some((s) => s.category === activeCategory)) && (
        <BazaarMap
          stores={bazaar}
          selected={selected}
          activeCategory={activeCategory}
          onSelect={handleSelect}
        />
      )}

      {/* Hall 1 list */}
      {hall1.length > 0 && (
        <div className="rounded-3xl bg-white shadow-card border border-plum/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-plum/5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-plum/10 flex items-center justify-center">
                <DoorOpen size={13} className="text-plum" />
              </div>
              <div className="font-display text-plum text-base">Hall 1</div>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-plum/40">{hall1.length} booths</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {hall1.map((s) => {
              const meta = getCategoryMeta(s.category);
              const Icon = meta.icon;
              const isActive = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => handleSelect(isActive ? null : s)}
                  className={`rounded-xl bg-white border p-2.5 text-left transition-all active:scale-95 ${isActive ? 'border-violet-400 ring-2 ring-violet-200' : 'border-plum/10 hover:shadow-soft hover:-translate-y-0.5'}`}
                  style={{ minHeight: 76 }}>
                  <div className="flex items-start gap-2">
                    <div className={`h-8 w-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-plum/40 uppercase leading-tight">{s.boothNumber}</div>
                      <div className="text-[11px] font-semibold text-plum leading-tight line-clamp-2 mt-0.5">{s.name}</div>
                      <div className={`mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                <summary className="cursor-pointer text-sm text-plum font-medium select-none">Show booth QR</summary>
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
