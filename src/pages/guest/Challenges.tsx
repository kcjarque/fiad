import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Award, Sparkles, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { isChallengeCompletedSync, listChallenges, completionsForGuest } from '../../services/challengeService';
import { listStores } from '../../services/storeService';
import { stampsForGuest } from '../../services/passportService';
import { Hero } from '../../components/shared/Hero';
import type { Challenge, Store } from '../../types';

const typeLabel: Record<Challenge['type'], string> = {
  booth: 'Booth Quest',
  activity: 'Activity',
  visit_all: 'Boss Quest',
};

type QuestStatus = 'completed' | 'in_progress' | 'not_started';

export function Challenges() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const guestId = session.guestId;
  const { data: challenges = [] } = useQuery({ queryKey: ['challenges'], queryFn: listChallenges });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const { data: stamps = [] } = useQuery({
    queryKey: ['stamps', guestId],
    queryFn: () => stampsForGuest(guestId),
  });
  const { data: completions = [] } = useQuery({
    queryKey: ['completions', guestId],
    queryFn: () => completionsForGuest(guestId),
  });
  const stampedIds = new Set(stamps.map((s) => s.storeId));
  const allStoreIds = useMemo(() => stores.map((s) => s.id), [stores]);

  const statusFor = (c: Challenge): QuestStatus => {
    if (isChallengeCompletedSync(c, stamps, completions, allStoreIds)) return 'completed';
    if (c.type === 'visit_all' && stampedIds.size > 0) return 'in_progress';
    return 'not_started';
  };

  const boss = challenges.find((c) => c.type === 'visit_all');
  const rest = challenges.filter((c) => c.type !== 'visit_all');

  const active = rest.filter((c) => statusFor(c) !== 'completed');
  const done = rest.filter((c) => statusFor(c) === 'completed');

  const totalEntries = challenges.reduce(
    (sum, c) => (statusFor(c) === 'completed' && c.rewardType === 'raffle_entries' ? sum + (c.rewardValue ?? 0) : sum),
    0,
  );

  return (
    <div className="min-h-full pb-28 bg-cream">
      <Hero
        imageUrl="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=70"
        kicker="Quests"
        title="Earn bonus entries"
        subtitle="Try, taste, and explore — each completed quest adds entries toward the grand prize."
        height="md"
        topRight={
          <div className="foil-gold rounded-full px-3 py-1 text-xs font-bold text-plum shadow flex items-center gap-1">
            <Sparkles size={12} /> +{totalEntries} earned
          </div>
        }
      />

      {/* Boss quest */}
      {boss && (
        <div className="px-5 mt-5">
          <BossQuest
            quest={boss}
            status={statusFor(boss)}
            stampedCount={stampedIds.size}
            totalStores={stores.length}
          />
        </div>
      )}

      {/* Active */}
      <Section title="Active" count={active.length} className="mt-6">
        <div className="space-y-4 px-5">
          {active.length === 0 && (
            <div className="rounded-2xl bg-white shadow-card p-5 text-center text-plum/60 text-sm">
              All caught up. Check back for more.
            </div>
          )}
          {active.map((c) => (
            <QuestCard key={c.id} quest={c} status={statusFor(c)} storesById={storesById} />
          ))}
        </div>
      </Section>

      {/* Completed */}
      {done.length > 0 && (
        <Section title="Completed" count={done.length} className="mt-6">
          <div className="space-y-4 px-5">
            {done.map((c) => (
              <QuestCard key={c.id} quest={c} status="completed" storesById={storesById} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
  className = '',
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="font-display text-plum text-lg">{title}</div>
        <div className="text-xs text-plum/50">{count}</div>
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: QuestStatus }) {
  if (status === 'completed')
    return (
      <div className="pill-completed rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
        <CheckCircle2 size={12} /> Completed
      </div>
    );
  if (status === 'in_progress')
    return (
      <div className="pill-in-progress rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
        In Progress
      </div>
    );
  return (
    <div className="pill-not-started rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
      Not Started
    </div>
  );
}

function RewardBadge({ quest }: { quest: Challenge }) {
  if (quest.rewardType === 'stamp_only') {
    return (
      <div className="chip !bg-plum/10 !text-plum/70">
        <Award size={12} /> Stamp only
      </div>
    );
  }
  if (quest.rewardType === 'raffle_entries') {
    return (
      <div className="foil-gold rounded-full px-2.5 py-1 text-[11px] font-bold text-plum flex items-center gap-1">
        <Sparkles size={11} /> +{quest.rewardValue ?? 0} entries
      </div>
    );
  }
  return (
    <div className="chip !bg-coral/15 !text-coral">
      <Trophy size={12} /> Physical prize
    </div>
  );
}

function QuestCard({ quest, status, storesById }: { quest: Challenge; status: QuestStatus; storesById: Map<string, Store> }) {
  const store = quest.storeId ? storesById.get(quest.storeId) : undefined;
  const img = quest.imageUrl ?? store?.imageUrl;
  return (
    <div className="rounded-2xl bg-white shadow-card overflow-hidden">
      {img && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={img}
            alt={quest.name}
            className={`w-full h-full object-cover ${status === 'completed' ? '' : ''}`}
          />
          <div className="absolute top-3 left-3">
            <div className="chip !bg-black/40 !text-white backdrop-blur-sm">{typeLabel[quest.type]}</div>
          </div>
          <div className="absolute top-3 right-3">
            <StatusPill status={status} />
          </div>
          {status === 'completed' && (
            <div className="absolute inset-0 bg-gradient-to-t from-plum/60 via-transparent to-transparent" />
          )}
        </div>
      )}
      <div className="p-4">
        <div className="font-display text-plum text-lg leading-tight">{quest.name}</div>
        {store && (
          <div className="flex items-center gap-1 text-xs text-plum/60 mt-1">
            <MapPin size={12} /> {store.name} · Booth {store.boothNumber}
          </div>
        )}
        <div className="text-sm text-plum/70 mt-2">{quest.description}</div>
        <div className="mt-3 flex items-center justify-between">
          <RewardBadge quest={quest} />
          {status === 'completed' ? (
            <div className="text-emerald-600 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 size={14} /> Done
            </div>
          ) : (
            <div className="text-plum/40 text-xs flex items-center gap-1">
              <Clock size={14} /> Visit to complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BossQuest({
  quest,
  status,
  stampedCount,
  totalStores,
}: {
  quest: Challenge;
  status: QuestStatus;
  stampedCount: number;
  totalStores: number;
}) {
  const progress = totalStores === 0 ? 0 : Math.round((stampedCount / totalStores) * 100);
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-soft">
      {quest.imageUrl && <img src={quest.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-br from-plum/95 via-plum/80 to-plum/95" />
      <div className="relative p-5 text-cream">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-champagne">
            <Trophy size={12} /> Boss Quest
          </div>
          <StatusPill status={status} />
        </div>
        <div className="font-display text-2xl mt-2">{quest.name}</div>
        <div className="text-cream/80 text-sm mt-1">{quest.description}</div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-cream/80 mb-1.5">
            <span>{stampedCount} / {totalStores} booths stamped</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-cream/15 rounded-full overflow-hidden">
            <div className="h-full foil-gold" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4">
          <RewardBadge quest={quest} />
        </div>
      </div>
    </div>
  );
}
