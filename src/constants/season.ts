/**
 * Which season the public /suppliers form is currently taking applications
 * for.
 *
 * Supplier applications are tagged with a season label rather than an event
 * id, because a season opens its intake long before its venues and dates are
 * settled — there is no event row to point at yet. Attaching a real event
 * later does not disturb the applications collected in the meantime.
 *
 * Bumping this one line moves the intake to the next season. The column also
 * carries the same value as a DB default (0095), so an insert that forgets to
 * pass it still lands in the right season rather than untagged.
 */
export const CURRENT_INTAKE_SEASON = 'Season 3';

/** Seasons that have taken applications, newest first — for admin filters. */
export const KNOWN_SEASONS = ['Season 3', 'Season 2', 'Season 1'] as const;

/**
 * Venues for the season currently taking applications.
 *
 * Kept here rather than inline in the supplier page because these are Season 3
 * facts, the same as the season label — and they will be needed again when the
 * Season 3 event rows are created and dates are settled.
 *
 * `short` is for tight spaces (stat strips, chips); `full` carries the
 * location for prose where a supplier needs to know where they would be.
 */
export const CURRENT_SEASON_VENUES = [
  // All caps is the venue's own styling, not emphasis — keep it verbatim.
  { short: 'MADISON 101', full: 'MADISON 101' },
  { short: 'SM Podium', full: 'SM Podium' },
  { short: 'Eugenio Lopez Center', full: 'the Eugenio Lopez Center' },
] as const;

/** "A, B and C" — an Oxford-comma-free list for running prose. */
export const venueSentence = (): string => {
  const names = CURRENT_SEASON_VENUES.map((v) => v.full);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};
