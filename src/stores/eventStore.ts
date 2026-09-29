import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURRENT_SEASON_VENUES } from '../constants/season';

/** Season 1 (archived June 2026). Kept for admin history via the event switcher. */
export const SEASON_1_EVENT_ID = 'evt_fiad_dec25';

/**
 * Where a browser starts: the current season's first venue. A guest's OWN
 * venue replaces this on login (the login flows call setSelectedEvent), and
 * the ticket page's venue toggle switches between their season's venues.
 */
export const DEFAULT_EVENT_ID: string = CURRENT_SEASON_VENUES[0].eventId;

type EventState = {
  selectedEventId: string;
  setSelectedEvent: (id: string) => void;
};

/**
 * Is anyone signed in on this browser? Read straight from the auth store's
 * persisted copy, because the migration below runs while stores hydrate.
 */
const hasSession = (): boolean => {
  try {
    const raw = localStorage.getItem('fiad.auth');
    const role = raw ? JSON.parse(raw)?.state?.session?.role : undefined;
    return !!role && role !== 'none';
  } catch {
    return false;
  }
};

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      selectedEventId: DEFAULT_EVENT_ID,
      setSelectedEvent: (id) => set({ selectedEventId: id }),
    }),
    {
      name: 'fiad.event.v2',
      // v3 moves to Season 3. Only browsers with NOBODY signed in are moved:
      // a device that opened the site during Season 2 still has Brittany
      // stored, so a walk-in registering from it would have landed in a
      // season that is over. A signed-in guest, booth or admin keeps their
      // event -- a Season 2 guest moved into Season 3 would find an app with
      // none of their tickets.
      //
      // (Season 1 -> 2 was done by renaming the key, which reset everyone,
      // signed in or not. A versioned migration can tell them apart.)
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as EventState;
        if (version < 3 && !hasSession()) {
          return { ...state, selectedEventId: DEFAULT_EVENT_ID };
        }
        return state;
      },
    },
  ),
);

/**
 * Read the selected event id outside of React (services call this).
 * Zustand exposes the latest state via getState().
 */
export const getSelectedEventId = (): string => useEventStore.getState().selectedEventId;
