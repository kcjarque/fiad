import { useMemo, useState } from 'react';
import {
  Cake, Shirt, MapPin, Camera, UtensilsCrossed, ClipboardCheck,
  Flower2, Mic2, Gem as GemIcon, Store as StoreIcon,
  DoorOpen, Heart, Calendar, Music, Gift,
  ExternalLink, Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Store } from '../../types';
import { Modal } from '../shared/Modal';
import { QRDisplay } from '../shared/QRDisplay';
import { listChallenges } from '../../services/challengeService';

type CatMeta = { label: string; icon: LucideIcon; color: string; ring: string; fill: string };

// The 12 consolidated event categories. Each store row's `category` column
// is one of these exact strings — keep them in sync with the DB.
const CATEGORY_META: Record<string, CatMeta> = {
  'Event Hosts':                  { label: 'Hosts',     icon: Mic2,            color: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-400', fill: '#f5d0fe' },
  'Musicians, Sounds & Lights':   { label: 'Music/AV',  icon: Music,           color: 'bg-violet-100 text-violet-800',   ring: 'ring-violet-400',  fill: '#ddd6fe' },
  'Gowns & Custom Shoes':         { label: 'Gowns',     icon: Shirt,           color: 'bg-purple-100 text-purple-800',   ring: 'ring-purple-400',  fill: '#e9d5ff' },
  'Event Stylists & Florists':    { label: 'Florists',  icon: Flower2,         color: 'bg-pink-100 text-pink-800',       ring: 'ring-pink-400',    fill: '#fbcfe8' },
  'Jewelers':                     { label: 'Jewelers',  icon: GemIcon,         color: 'bg-yellow-100 text-yellow-900',   ring: 'ring-yellow-400',  fill: '#fef08a' },
  'Photo & Video':                { label: 'Photo/Vid', icon: Camera,          color: 'bg-amber-100 text-amber-800',     ring: 'ring-amber-400',   fill: '#fde68a' },
  'Hotels & Venues':              { label: 'Venues',    icon: MapPin,          color: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-400', fill: '#a7f3d0' },
  'Catering & Cakes':             { label: 'Catering',  icon: Cake,            color: 'bg-orange-100 text-orange-800',   ring: 'ring-orange-400',  fill: '#fed7aa' },
  'Souvenirs':                    { label: 'Souvenirs', icon: Gift,            color: 'bg-teal-100 text-teal-800',       ring: 'ring-teal-400',    fill: '#99f6e4' },
  'Events Management':            { label: 'Planners',  icon: ClipboardCheck,  color: 'bg-sky-100 text-sky-800',         ring: 'ring-sky-400',     fill: '#bae6fd' },
  'Food Carts':                   { label: 'Food',      icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-800',       ring: 'ring-rose-400',    fill: '#fecdd3' },
  'Grazing Tables':               { label: 'Grazing',   icon: Cake,            color: 'bg-amber-100 text-amber-800',     ring: 'ring-amber-400',   fill: '#fef3c7' },
  'Others':                       { label: 'Others',    icon: StoreIcon,       color: 'bg-slate-100 text-slate-700',     ring: 'ring-slate-400',   fill: '#e2e8f0' },
};

const FALLBACK: CatMeta = { label: 'Booth', icon: StoreIcon, color: 'bg-plum/10 text-plum', ring: 'ring-plum/40', fill: '#e5e7eb' };

export const getCategoryMeta = (category: string): CatMeta => CATEGORY_META[category] ?? FALLBACK;

// ─── SVG floor plan: Bazaar Area (Bamboo Hall) ───────────────────────────────
// viewBox 960 × 580.  All positions traced from the architectural floor plan.

type BoothRect = { booth: string; x: number; y: number; w: number; h: number };

const BAZAAR_BOOTHS: BoothRect[] = [
  // ═══════ UPPER SECTION (y=0 to y=360): Bamboo Hall + perimeter booths ═══════

  // Left wall — BA37/BA38/BA39/BA40 stacked top to bottom
  { booth: 'BA37',    x:   0, y:  80, w:  80, h:  70 }, // Heinoah
  { booth: 'BA38',    x:   0, y: 150, w:  80, h:  70 }, // Jazper Tiongson
  { booth: 'BA39',    x:   0, y: 220, w:  80, h:  70 }, // Perfect Cellar
  { booth: 'BA40',    x:   0, y: 290, w:  80, h:  70 }, // SAB HMUA

  // Top wall — wider corner left, three groups of 3 with notch gaps between
  { booth: 'BA35-36', x:  80, y:   0, w: 128, h:  80 }, // Arlene's Catering
  { booth: 'BA34',    x: 208, y:   0, w:  58, h:  80 }, // Fenrir's Forest
  // gap x=266-322 (56 wide) — BA33 (Luka's) notch hangs below
  { booth: 'BA32',    x: 322, y:   0, w:  58, h:  70 }, // Kate's Confections
  { booth: 'BA31',    x: 380, y:   0, w:  58, h:  70 }, // From Paulyn
  { booth: 'BA30',    x: 438, y:   0, w:  58, h:  70 }, // Emil Ocampo
  // gap x=496-552 (56 wide) — BA29 (Tiger Shoes) notch
  { booth: 'BA28',    x: 552, y:   0, w:  52, h:  70 }, // Stageability
  { booth: 'BA27',    x: 604, y:   0, w:  52, h:  70 }, // Shutterloop
  { booth: 'BA26',    x: 656, y:   0, w:  52, h:  70 }, // AJT Events
  // gap x=708-756 (48 wide) — BA25 (Romierre) notch
  { booth: 'BA24',    x: 756, y:   0, w:  46, h:  70 }, // Manila Yacht / Legworks
  { booth: 'BA23',    x: 802, y:   0, w:  46, h:  70 }, // Graciabelle's
  { booth: 'BA22',    x: 848, y:   0, w:  46, h:  70 }, // 8 Point Studios
  { booth: 'BA21',    x: 894, y:   0, w:  66, h: 175 }, // Belle Fête (tall corner)

  // Notch booths — sit IN the gaps, hanging just below the top wall
  { booth: 'BA33',    x: 270, y:  82, w:  48, h:  78 }, // Luka's Steak
  { booth: 'BA29',    x: 500, y:  72, w:  48, h:  78 }, // Tiger Shoes
  { booth: 'BA25',    x: 710, y:  72, w:  44, h:  78 }, // Romierre Jewelry (fits in 708-756 gap)

  // Right wall (upper half) — BA18-20 below BA21
  { booth: 'BA18-20', x: 894, y: 175, w:  66, h: 185 }, // Permala Photo & Video

  // ═══════ LOWER SECTION (y=360 to y=720): Service zone + bottom booths ═══════

  // Right wall (lower half) — BA17/BA16/BA15 stacked
  { booth: 'BA17',    x: 894, y: 365, w:  66, h:  78 }, // Vaella Jewelry
  { booth: 'BA16',    x: 894, y: 443, w:  66, h:  78 }, // 7th Trumpet
  { booth: 'BA15',    x: 894, y: 521, w:  66, h:  78 }, // Sharon's Delights

  // Booths along the top of the lower section (just below the dividing wall)
  { booth: 'BA1',     x: 220, y: 370, w:  74, h:  72 }, // Brittany Hotel BGC
  { booth: 'BA2-3',   x: 294, y: 370, w: 110, h:  72 }, // Jhossa Events Mgt
  { booth: 'BA8',     x: 686, y: 370, w:  98, h:  72 }, // Bloom in Pink

  // Stacked BA9/BA10 in the middle-right of the lower section
  { booth: 'BA9',     x: 784, y: 370, w:  66, h:  72 }, // ABCD Toteful
  { booth: 'BA10',    x: 784, y: 442, w:  66, h:  72 }, // Invitations by Ten

  // Bottom row booths — BA4-BA7 at the very bottom edge
  { booth: 'BA4',     x: 410, y: 660, w:  62, h:  60 }, // RJ Ledesma
  { booth: 'BA5',     x: 472, y: 660, w:  62, h:  60 }, // Craftman's Sheep
  { booth: 'BA6',     x: 534, y: 660, w:  62, h:  60 }, // Love Hues
  { booth: 'BA7',     x: 596, y: 660, w:  62, h:  60 }, // Ellen Drilon

  // Bottom-right corner — large BA11 cell (W@W)
  { booth: 'BA11',    x: 784, y: 514, w: 106, h: 190 }, // Weddings at Work
];

// Interior service / circulation zones — non-overlapping layout
// inside the LOWER section. Positions chosen so each label has room
// to render without bleeding into a neighbouring zone.
const SERVICE_AREAS = [
  { label: 'Elevator',                       x:   0, y: 440, w:  80, h: 260 },
  { label: 'Concierge /\nRegistration',      x:  80, y: 370, w: 140, h: 330 },
  { label: 'MCatering\nService Area',        x: 220, y: 445, w: 200, h: 130 },
  { label: 'MCatering\nService Area',        x: 475, y: 445, w: 210, h: 130 },
  { label: 'Gown\nFitting Room',             x: 220, y: 580, w: 170, h:  75 },
  { label: 'Cake Tasting\nw/ Coffee & Tea',  x: 395, y: 580, w:  80, h:  75 },
  { label: 'Photo & Video\nFilm Showing Rm', x: 478, y: 580, w: 210, h:  75 },
];

// Wrap store names to fit inside a booth rect. Greedy line packing, then
// truncate each line with an ellipsis if it still exceeds the cell width.
// If we run out of lines but there's still text left, the last visible line
// also gets an ellipsis so nothing reads as "complete" when it isn't.
function wrapName(name: string, maxW: number, maxLines = 2): string[] {
  const charsPerLine = Math.max(5, Math.floor(maxW / 5.2));
  const words = name.split(' ');
  const out: string[] = [];
  let current = '';
  let dropped = false;

  const truncate = (s: string) =>
    s.length <= charsPerLine ? s : s.slice(0, Math.max(1, charsPerLine - 1)) + '…';

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= charsPerLine) {
      current = candidate;
      continue;
    }
    if (current) {
      out.push(current);
      if (out.length >= maxLines) { dropped = true; break; }
    }
    current = w;
  }
  if (current) {
    if (out.length < maxLines) out.push(current);
    else dropped = true;
  }

  const lines = out.slice(0, maxLines).map(truncate);
  if (dropped && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.endsWith('…')
      ? last
      : (last.length >= charsPerLine ? last.slice(0, Math.max(1, charsPerLine - 1)) + '…' : last + '…');
  }
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
    <div className="overflow-hidden rounded-2xl border border-plum/10 bg-white shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-plum/50 px-3 pt-3 pb-1">
        Bazaar Area · Bamboo Hall
      </div>
      <svg
        viewBox="0 0 960 720"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        fontFamily="system-ui, sans-serif"
      >
        {/* Room background */}
        <rect x={0} y={0} width={960} height={720} fill="#faf8f5" stroke="#c9b99a" strokeWidth={2} />

        {/* Upper open hall (Bamboo) */}
        <rect x={80} y={80} width={810} height={280} fill="#f2ece4" />

        {/* Lower service zone background */}
        <rect x={0} y={360} width={960} height={360} fill="#ece5d8" stroke="#c9b99a" strokeWidth={1} />

        {/* Internal dividing wall between upper hall and lower service zone */}
        <line x1={80} y1={360} x2={890} y2={360} stroke="#a89272" strokeWidth={3} />

        {/* Service / circulation zones */}
        {SERVICE_AREAS.map((sa, i) => (
          <g key={i}>
            <rect x={sa.x} y={sa.y} width={sa.w} height={sa.h}
              fill="#e8e0d5" stroke="#c9b99a" strokeWidth={1} strokeDasharray="4 3" />
            {sa.label.split('\n').map((line, li) => (
              <text key={li} x={sa.x + sa.w / 2} y={sa.y + sa.h / 2 + (li - 0.5) * 14}
                textAnchor="middle" fontSize={11} fill="#7a6450" fontStyle="italic" fontWeight="500">
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* Center hall label — sits inside the upper open hall */}
        <text x={485} y={220} textAnchor="middle" fontSize={18} fill="#b0956e"
          fontWeight="700" letterSpacing={1.4}>
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
              opacity={dimmed ? 0.12 : 1}
            >
              <rect
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                fill={store ? meta.fill : '#e5e7eb'}
                stroke={isSelected ? '#7c3aed' : (activeCategory && store && store.category === activeCategory ? '#E63F75' : '#fff')}
                strokeWidth={isSelected ? 2.5 : (activeCategory && store && store.category === activeCategory ? 2.5 : 1.5)}
                rx={2}
              />
              {/* Booth number */}
              <text
                x={cx} y={rect.y + 14}
                textAnchor="middle" fontSize={10.5} fill="#333" fontWeight="700"
              >
                {rect.booth}
              </text>
              {/* Store name lines */}
              {nameLines.map((line, li) => (
                <text
                  key={li}
                  x={cx}
                  y={rect.y + 28 + li * 11}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#222"
                >
                  {line}
                </text>
              ))}
              {/* No store: faint placeholder */}
              {!store && (
                <text x={cx} y={rect.y + rect.h / 2 + 4}
                  textAnchor="middle" fontSize={10} fill="#aaa" fontStyle="italic">
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

  // Quests linked to a booth — shown on that booth's profile card.
  // Stored as a list per booth: 8 Point Studios has two distinct quests, etc.
  const { data: challenges = [] } = useQuery({ queryKey: ['challenges'], queryFn: listChallenges });
  const questsByStore = useMemo(() => {
    const m = new Map<string, typeof challenges>();
    for (const c of challenges) {
      if (!c.storeId) continue;
      const list = m.get(c.storeId) ?? [];
      list.push(c);
      m.set(c.storeId, list);
    }
    return m;
  }, [challenges]);
  const selectedQuests = selected ? questsByStore.get(selected.id) ?? [] : [];

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
      {/* Category filter strip — pill style, matches the Booths tab */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-plum/50 mb-2 px-1">Filter by category</div>
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${
              activeCategory === null ? 'bg-plum text-cream' : 'bg-white text-plum/70 border border-plum/10'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c === activeCategory ? null : c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                c === activeCategory ? 'bg-plum text-cream' : 'bg-white text-plum/70 border border-plum/10'
              }`}
            >
              {c}
            </button>
          ))}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#8B2348]/70 to-transparent" />
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

              {/* Logo + name header */}
              <div className="flex items-center gap-3">
                {selected.logoUrl && (
                  <img
                    src={selected.logoUrl}
                    alt={`${selected.name} logo`}
                    className="h-14 w-14 rounded-2xl object-cover bg-white shadow-card shrink-0"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const fallback = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(selected.name)}`;
                      if (img.src !== fallback) img.src = fallback;
                    }}
                  />
                )}
                <div className="min-w-0">
                  <div className="font-display text-lg text-plum leading-tight">{selected.name}</div>
                  <div className="text-xs text-plum/50">{selected.category} · Booth {selected.boothNumber}</div>
                </div>
              </div>

              <p className="text-sm text-plum/75">{selected.description || 'Visit this booth at the event!'}</p>

              {/* Linked quests — each booth may have one or more */}
              {selectedQuests.length > 0 && (
                <div className="space-y-2">
                  {selectedQuests.map((q) => (
                    <div key={q.id} className="rounded-2xl bg-coral/8 border border-coral/30 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-coral font-semibold mb-1">
                        <Trophy size={12} /> Quest · +{q.rewardValue ?? 1} raffle entry
                      </div>
                      <div className="font-display text-base text-plum leading-tight">{q.name}</div>
                      <div className="text-xs text-plum/65 mt-1">{q.description}</div>
                    </div>
                  ))}
                </div>
              )}
              {(selected.email || selected.contact || selected.socialMedia) && (
                <div className="text-xs text-plum/60 space-y-1.5">
                  {selected.email && <div>✉ {selected.email}</div>}
                  {selected.contact && <div>📞 {selected.contact}</div>}
                  {selected.socialMedia && (
                    <a
                      href={selected.socialMedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-coral font-medium hover:underline"
                    >
                      <ExternalLink size={13} /> Visit on Facebook
                    </a>
                  )}
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
