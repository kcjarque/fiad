import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { listEvents } from '../../services/eventService';
import { useEventStore } from '../../stores/eventStore';

/**
 * Admin event switcher (multi-tenant). Picking an event sets the per-browser
 * selectedEventId, then invalidates every query so all the scoped lists
 * (guests, stores, transactions, raffle pool, …) refetch for the new event.
 */
export function EventSwitcher() {
  const qc = useQueryClient();
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const setSelectedEvent = useEventStore((s) => s.setSelectedEvent);
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: listEvents });

  return (
    <div className="mb-4">
      <div className="text-cream/50 text-[11px] uppercase tracking-wider mb-1">Event</div>
      <div className="relative">
        <select
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEvent(e.target.value);
            // Drop all cached event-scoped data so it refetches for the
            // newly selected event.
            qc.invalidateQueries();
          }}
          className="w-full appearance-none bg-cream/10 text-cream text-sm rounded-lg pl-3 pr-9 py-2 border border-cream/15 focus:outline-none focus:border-coral cursor-pointer"
        >
          {events.length === 0 && <option value={selectedEventId}>Loading…</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id} className="text-plum">
              {ev.name}
              {ev.status === 'live' ? ' · LIVE' : ev.status === 'draft' ? ' · draft' : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cream/50"
        />
      </div>
    </div>
  );
}
