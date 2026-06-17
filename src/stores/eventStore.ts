import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Multi-tenant: which event the app is currently scoped to.
 *
 * Defaults to Season 1 (evt_fiad_dec25) so existing/live behavior is
 * unchanged — every event-scoped service query filters by this id, and
 * all current data is Season 1, so nothing changes until an admin
 * switches events. Persisted per-browser in localStorage.
 */
export const SEASON_1_EVENT_ID = 'evt_fiad_dec25';

type EventState = {
  selectedEventId: string;
  setSelectedEvent: (id: string) => void;
};

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      selectedEventId: SEASON_1_EVENT_ID,
      setSelectedEvent: (id) => set({ selectedEventId: id }),
    }),
    { name: 'fiad.event' },
  ),
);

/**
 * Read the selected event id outside of React (services call this).
 * Zustand exposes the latest state via getState().
 */
export const getSelectedEventId = (): string => useEventStore.getState().selectedEventId;
