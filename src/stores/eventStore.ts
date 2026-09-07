import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Season 1 (archived June 2026). Kept for admin history via the event switcher. */
export const SEASON_1_EVENT_ID = 'evt_fiad_dec25';

/**
 * The customer app now runs on Season 2, which spans two venue events. New /
 * signed-out browsers default to Brittany; a guest's OWN venue is set on login
 * (guestService/login flows call setSelectedEvent), and the home-page venue
 * toggle switches between the two.
 */
export const DEFAULT_EVENT_ID = 'evt_fiad_s2_brittany';

/** The two Season 2 venues — used by the customer home-page venue toggle. */
export const S2_VENUES = [
  { id: 'evt_fiad_s2_brittany', label: 'Brittany · BGC' },
  { id: 'evt_fiad_s2_mella', label: 'Mella · Las Piñas' },
] as const;

type EventState = {
  selectedEventId: string;
  setSelectedEvent: (id: string) => void;
};

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      selectedEventId: DEFAULT_EVENT_ID,
      setSelectedEvent: (id) => set({ selectedEventId: id }),
    }),
    // Key bumped from 'fiad.event' → '.v2' so browsers that had Season 1
    // persisted move to the Season 2 default on next load.
    { name: 'fiad.event.v2' },
  ),
);

/**
 * Read the selected event id outside of React (services call this).
 * Zustand exposes the latest state via getState().
 */
export const getSelectedEventId = (): string => useEventStore.getState().selectedEventId;
