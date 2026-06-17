import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, ArrowRight, Check } from 'lucide-react';
import { listEvents } from '../../services/eventService';
import { useEventStore } from '../../stores/eventStore';
import { formatDate } from '../../utils/id';
import type { EventInfo } from '../../types';

const statusBadge: Record<EventInfo['status'], { label: string; cls: string }> = {
  live: { label: 'LIVE', cls: 'bg-coral text-white' },
  draft: { label: 'Draft', cls: 'bg-champagne text-plum' },
  ended: { label: 'Ended', cls: 'bg-cream/15 text-cream/70' },
};

/**
 * Event picker shown right after admin login (multi-tenant). Choosing an
 * event sets the per-browser selectedEventId, refetches all scoped data,
 * and continues to the dashboard.
 */
export function AdminSelectEvent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const setSelectedEvent = useEventStore((s) => s.setSelectedEvent);
  const { data: events = [], isLoading } = useQuery({ queryKey: ['events'], queryFn: listEvents });

  const choose = (id: string) => {
    setSelectedEvent(id);
    qc.invalidateQueries();
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-plum text-cream flex flex-col p-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="bg-cream rounded-2xl p-4 inline-block mb-4">
              <img src="/logo.png" alt="Forever in a Day" className="h-12 w-auto" />
            </div>
            <h1 className="font-display text-3xl">Choose an event</h1>
            <p className="text-cream/60 text-sm mt-1">
              Pick the event you’re managing. You can switch anytime from the sidebar.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center text-cream/50 py-8">Loading events…</div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const badge = statusBadge[ev.status];
                const isCurrent = ev.id === selectedEventId;
                return (
                  <button
                    key={ev.id}
                    onClick={() => choose(ev.id)}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-cream/10 hover:border-coral/50 rounded-2xl p-5 transition group flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-xl text-cream truncate">{ev.name}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-coral">
                            <Check size={11} /> Current
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-cream/60">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={13} /> {formatDate(ev.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} /> {ev.venue}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      size={20}
                      className="text-cream/30 group-hover:text-coral shrink-0 transition"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
