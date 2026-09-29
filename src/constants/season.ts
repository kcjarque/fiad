/**
 * The season the public site is selling — the RSVP funnel and the supplier
 * application both follow this.
 */
export const CURRENT_SEASON = 'Season 3';

/**
 * Which season the public /suppliers form is currently taking applications
 * for.
 *
 * The same as CURRENT_SEASON today, but kept as its own name because the two
 * can diverge: a supplier intake opens long before a season's guest RSVP does.
 *
 * Supplier applications are tagged with a season label rather than an event
 * id, because a season opens its intake before its venues and dates are
 * settled — there is no event row to point at yet. Attaching a real event
 * later does not disturb the applications collected in the meantime.
 *
 * The column also carries the same value as a DB default (0095), so an insert
 * that forgets to pass it still lands in the right season rather than untagged.
 */
export const CURRENT_INTAKE_SEASON = CURRENT_SEASON;

/** Seasons that have taken applications, newest first — for admin filters. */
export const KNOWN_SEASONS = ['Season 3', 'Season 2', 'Season 1'] as const;

/**
 * Season 3's venues — the single source for both the supplier page and the
 * RSVP funnel, so the two cannot disagree about where the fair is.
 *
 * Each venue is its own event row (0097), the way Season 2's were, so the
 * admin gets a separate registrant list and check-in desk per location.
 *
 *  - `short`  tight spaces: stat strips, chips, export labels
 *  - `full`   running prose on the supplier page
 *  - `hotel` / `area`  the RSVP venue card: the place, then where it is
 */
export const CURRENT_SEASON_VENUES = [
  {
    key: 'madison',
    eventId: 'evt_fiad_s3_madison',
    // All caps is the venue's own styling, not emphasis — keep it verbatim.
    short: 'MADISON 101',
    full: 'MADISON 101',
    hotel: 'MADISON 101 Hotel',
    area: 'Quezon City',
  },
  {
    key: 'podium',
    eventId: 'evt_fiad_s3_podium',
    short: 'SM Podium',
    full: 'SM Podium',
    hotel: 'SM Podium',
    area: 'Ortigas Center, Mandaluyong City',
  },
  // Eugenio Lopez Center (Antipolo, Rizal) is off the public pages for now,
  // at the client's request. To restore it, uncomment this entry and re-create
  // its event row -- 0099 records the exact insert. Every count and sentence on
  // both pages is derived from this list, so nothing else needs editing.
  // {
  //   key: 'eugenio',
  //   eventId: 'evt_fiad_s3_eugenio',
  //   short: 'Eugenio Lopez Center',
  //   full: 'the Eugenio Lopez Center',
  //   hotel: 'Eugenio Lopez Center',
  //   area: 'Antipolo, Rizal',
  // },
] as const;

/** "A, B and C" — an Oxford-comma-free list for running prose. */
export const venueSentence = (): string => {
  const names = CURRENT_SEASON_VENUES.map((v) => v.full);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/** "Two" / "Three" — for a heading or the start of a sentence. */
export const venueCountTitle = (): string => {
  const w = venueCountWord();
  return w.charAt(0).toUpperCase() + w.slice(1);
};

/** "two" / "three" — for copy that reads better spelled out. */
export const venueCountWord = (): string =>
  ['zero', 'one', 'two', 'three', 'four', 'five'][CURRENT_SEASON_VENUES.length] ??
  String(CURRENT_SEASON_VENUES.length);

/**
 * Season number of an event, from its id. Season 2 onward use
 * evt_fiad_s{N}_<venue>; Season 1's single event predates that scheme.
 *
 * Derived from the id rather than listed, so analytics that group by season —
 * the export, its filters — pick up a new season without being edited. The
 * previous code tested for the "evt_fiad_s2_" prefix and filed everything else
 * under Season 1, which would have labelled every Season 3 guest as Season 1.
 */
export const seasonOfEvent = (eventId: string): number => {
  const m = /^evt_fiad_s(\d+)_/.exec(eventId);
  return m ? Number(m[1]) : 1;
};

/**
 * Short venue label per event, for the export's Venue column. Season 2's keep
 * the labels the client already works with ("Brittany", "Mella").
 */
export const VENUE_SHORT: Record<string, string> = {
  evt_fiad_dec25: 'Season 1',
  evt_fiad_s2_brittany: 'Brittany',
  evt_fiad_s2_mella: 'Mella',
  ...Object.fromEntries(CURRENT_SEASON_VENUES.map((v) => [v.eventId, v.short])),
};

/**
 * Every venue the guest app still serves, with the short label its venue
 * toggle and supplier cards use. Season 2's pair stays listed because those
 * guests keep using the app after their fair -- their tickets, entries and
 * supplier contacts -- and their suppliers can still sign in.
 */
export const APP_VENUES: readonly { id: string; label: string }[] = [
  { id: 'evt_fiad_s2_brittany', label: 'Brittany · BGC' },
  { id: 'evt_fiad_s2_mella', label: 'Mella · Las Piñas' },
  ...CURRENT_SEASON_VENUES.map((v) => ({ id: v.eventId, label: v.short })),
];

/**
 * The venues of an event's own season. A guest browses between the venues of
 * the season they registered for -- a Season 2 guest between Brittany and
 * Mella, a Season 3 guest between Season 3's -- never across seasons, where
 * their account has no tickets or entries.
 */
export const venuesOfSeason = (eventId: string) =>
  APP_VENUES.filter((v) => seasonOfEvent(v.id) === seasonOfEvent(eventId));

/** App label for an event's venue, or undefined for one the app doesn't serve. */
export const appVenueLabel = (eventId: string): string | undefined =>
  APP_VENUES.find((v) => v.id === eventId)?.label;
