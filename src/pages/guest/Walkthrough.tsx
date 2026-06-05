import { useMemo, useState } from 'react';
import { Clock, Tag, MapPin, Heart, ChevronRight, Trophy } from 'lucide-react';
import { listChallenges } from '../../services/challengeService';
import { useQuery } from '@tanstack/react-query';
import { listWalkthrough } from '../../services/walkthroughService';
import { listStores } from '../../services/storeService';
import { getActiveEvent } from '../../services/eventService';
import type { WalkthroughItem } from '../../types';
import { Hero } from '../../components/shared/Hero';
import { Modal } from '../../components/shared/Modal';
import { FloorPlan, getCategoryMeta } from '../../components/guest/FloorPlan';
import type { Store } from '../../types';

const eventTabs = [
  { key: 'map', label: 'Map' },
  { key: 'booth_info', label: 'Booth Info' },
  { key: 'promo', label: 'Promos' },
] as const;

type EventTabKey = (typeof eventTabs)[number]['key'];

export function Walkthrough({
  initialTab = 'map',
}: { initialTab?: EventTabKey | 'schedule_item' } = {}) {
  // `/app/schedule` routes here with initialTab='schedule_item' — we render
  // the schedule directly (no tab bar) since Schedule is its own bottom-nav
  // destination now.
  const scheduleOnly = initialTab === 'schedule_item';
  const [tab, setTab] = useState<EventTabKey>(scheduleOnly ? 'map' : initialTab);
  const [boothDetail, setBoothDetail] = useState<Store | null>(null);
  const [mapPreselect, setMapPreselect] = useState<string | null>(null);

  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const { data: promos = [] } = useQuery({ queryKey: ['walkthrough', 'promo'], queryFn: () => listWalkthrough('promo') });
  const { data: schedule = [] } = useQuery({ queryKey: ['walkthrough', 'schedule_item'], queryFn: () => listWalkthrough('schedule_item') });

  return (
    <div className="min-h-full pb-28 bg-cream">
      <Hero
        imageUrl="https://images.unsplash.com/photo-1519741497674-611481863552?w=1400&auto=format&fit=crop&q=75"
        kicker={scheduleOnly ? 'Day-by-Day Schedule' : 'Event Walkthrough'}
        title={event?.name?.split('—')[0]?.trim() ?? 'Forever in a Day'}
        subtitle={
          event
            ? `${new Date(event.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · ${event.venue}`
            : undefined
        }
        height="lg"
      />

      {/* Tab bar — flush full-width, coral underline on active. Hidden in
          schedule-only mode. */}
      {!scheduleOnly && (
        <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-plum/10">
          <div className="grid grid-cols-3" role="tablist">
            {eventTabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`relative py-3.5 text-sm font-medium transition-colors ${
                    active ? 'text-plum' : 'text-plum/55 hover:text-plum/80'
                  }`}
                >
                  {t.label}
                  <span
                    className={`absolute inset-x-6 -bottom-px h-[2px] rounded-full transition-opacity ${
                      active ? 'bg-coral opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 pt-4">
        {scheduleOnly ? (
          <ScheduleTab schedule={schedule} />
        ) : (
          <>
            {tab === 'map' && (
              <FloorPlan
                stores={stores}
                initialSelectedId={mapPreselect}
                onSelect={(s) => !s && setMapPreselect(null)}
              />
            )}

            {tab === 'booth_info' && (
              <BoothsTab stores={stores} onOpen={(s) => setBoothDetail(s)} onLocate={(s) => {
                setMapPreselect(s.id);
                setTab('map');
              }} />
            )}

            {tab === 'promo' && (
              <PromosTab
                promos={promos}
                stores={stores}
                onLocate={(storeId) => { if (storeId) setMapPreselect(storeId); setTab('map'); }}
              />
            )}
          </>
        )}
      </div>

      {/* Booth detail sheet (from booths tab) */}
      <Modal open={!!boothDetail} onClose={() => setBoothDetail(null)} title={boothDetail?.name} size="md">
        {boothDetail && <BoothDetail store={boothDetail} onLocate={() => {
          setMapPreselect(boothDetail.id);
          setBoothDetail(null);
          setTab('map');
        }} />}
      </Modal>
    </div>
  );
}

/* ---------- Booths tab ---------- */
function BoothsTab({
  stores,
  onOpen,
  onLocate,
}: {
  stores: Store[];
  onOpen: (s: Store) => void;
  onLocate: (s: Store) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(stores.map((s) => s.category))], [stores]);
  const filtered = activeCategory ? stores.filter((s) => s.category === activeCategory) : stores;

  return (
    <div>
      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-3">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === null
              ? 'bg-plum text-cream'
              : 'bg-white text-plum/65 border border-plum/15 hover:border-plum/30'
          }`}
        >
          All
        </button>
        {categories.map((c) => {
          const active = c === activeCategory;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(active ? null : c)}
              className={`shrink-0 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-plum text-cream'
                  : 'bg-white text-plum/65 border border-plum/15 hover:border-plum/30'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Booth grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((s) => {
          const meta = getCategoryMeta(s.category);
          return (
            <button
              key={s.id}
              onClick={() => onOpen(s)}
              className="group rounded-2xl bg-white shadow-card overflow-hidden text-left"
            >
              <div className="relative aspect-[4/3]">
                <img src={s.imageUrl ?? s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-white/95 rounded-full px-2 py-0.5 text-[10px] font-mono text-plum">
                  {s.boothNumber}
                </div>
                <div className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                  {meta.label}
                </div>
              </div>
              <div className="p-3">
                <div className="font-display text-plum text-sm leading-tight line-clamp-2">{s.name}</div>
                <div className="text-[11px] text-plum/60 mt-1 line-clamp-2">{s.description}</div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocate(s);
                    }}
                    className="text-[11px] text-coral font-medium inline-flex items-center gap-0.5 hover:underline"
                  >
                    <MapPin size={11} /> Locate
                  </button>
                  <div className="text-plum/40">
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white shadow-card p-5 text-center text-plum/60 text-sm">
          No booths match this filter.
        </div>
      )}
    </div>
  );
}

function BoothDetail({ store, onLocate }: { store: Store; onLocate: () => void }) {
  const meta = getCategoryMeta(store.category);
  const Icon = meta.icon;
  const { data: challenges = [] } = useQuery({ queryKey: ['challenges'], queryFn: listChallenges });
  const quests = challenges.filter((c) => c.storeId === store.id);
  return (
    <div className="space-y-4">
      <div className="relative -mx-6 -mt-5 aspect-[16/10] overflow-hidden">
        <img src={store.imageUrl ?? store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#8B2348]/80 to-transparent" />
        <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between text-cream">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-champagne">{store.category}</div>
            <div className="font-display text-xl leading-tight">Booth {store.boothNumber}</div>
          </div>
          <div className={`h-10 w-10 rounded-full ${meta.color} flex items-center justify-center shadow`}>
            <Icon size={18} />
          </div>
        </div>
      </div>

      <p className="text-sm text-plum/75">{store.description}</p>

      {quests.length > 0 && (
        <div className="space-y-2">
          {quests.map((q) => (
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

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onLocate} className="btn-ghost border border-plum/15">
          <MapPin size={16} className="mr-1.5" /> Find on map
        </button>
        <button disabled className="btn-primary">
          <Heart size={16} className="mr-1.5" /> Save
        </button>
      </div>
    </div>
  );
}

/* ---------- Promos tab ---------- */
function PromosTab({
  promos,
  stores,
  onLocate,
}: {
  promos: WalkthroughItem[];
  stores: Store[];
  onLocate: (storeId: string) => void;
}) {
  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  if (promos.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-card p-6 text-center text-plum/60 text-sm">
        No promos yet. Check back soon.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {promos.map((p) => {
        const store = p.storeId ? storeById.get(p.storeId) : undefined;
        return (
          <div key={p.id} className="rounded-2xl bg-white shadow-card overflow-hidden">
            <div className="relative aspect-[16/9]">
              <img
                src={p.imageUrl ?? 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1000&auto=format&fit=crop&q=70'}
                alt={p.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#8B2348]/70 to-transparent" />
              <div className="absolute top-3 left-3 foil-gold rounded-full px-3 py-1 text-xs font-bold text-plum shadow">
                <Tag size={12} className="inline -mt-0.5 mr-1" /> Promo
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-cream">
                {store && (
                  <div className="text-[11px] font-mono text-champagne mb-1 uppercase tracking-wider">
                    {store.name} · Booth {store.boothNumber}
                  </div>
                )}
                <div className="font-display text-xl leading-tight">{p.title}</div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-plum/75">{p.content}</p>
              {store ? (
                <button
                  onClick={() => onLocate(store.id)}
                  className="mt-3 text-coral text-sm font-medium inline-flex items-center gap-1 hover:underline"
                >
                  Find {store.name} on map <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => onLocate('')}
                  className="mt-3 text-coral text-sm font-medium inline-flex items-center gap-1 hover:underline"
                >
                  Browse all booths <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Schedule tab ---------- */
function ScheduleTab({ schedule }: { schedule: WalkthroughItem[] }) {
  if (schedule.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-card p-6 text-center text-plum/60 text-sm">
        Schedule not posted yet.
      </div>
    );
  }

  return (
    <div className="relative pl-16">
      {/* Timeline spine */}
      <div className="absolute left-12 top-2 bottom-2 w-px bg-plum/15" />

      <div className="space-y-4">
        {schedule.map((s) => (
          <div key={s.id} className="relative">
            {/* Time marker */}
            <div className="absolute -left-16 top-3 w-14 text-right pr-2">
              <div className="font-mono text-[11px] text-plum/60 font-semibold">{s.time ?? '—'}</div>
            </div>

            {/* Dot */}
            <div className="absolute -left-[14px] top-4 h-3 w-3 rounded-full bg-coral ring-4 ring-cream" />

            {/* Card */}
            <div className="rounded-2xl bg-white shadow-card overflow-hidden">
              <div className="flex gap-3 p-3">
                <img
                  src={s.imageUrl ?? 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&auto=format&fit=crop&q=70'}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-plum text-base leading-tight">{s.title}</div>
                  <div className="text-xs text-plum/60 mt-1 line-clamp-2">{s.content}</div>
                  <div className="mt-2">
                    <div className="chip !bg-champagne/20">
                      <Clock size={11} /> {s.time ?? 'TBA'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
