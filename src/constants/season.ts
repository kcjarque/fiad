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
