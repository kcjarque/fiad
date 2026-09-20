/**
 * Soft-hide lists for the event.
 *
 * Suppliers and their prizes/quests listed here are filtered out at the
 * service layer (guest-facing surfaces only — admin pages still see them).
 * Data stays in the database; just remove the entry from the array below
 * to bring them back, no SQL needed.
 */

/** Stores hidden from guest-facing screens (Passport, Map, Booths, Floor Plan). */
export const HIDDEN_STORE_IDS: ReadonlySet<string> = new Set([
  // Heinoah Entertainment (BA37) — no-show on Jun 6
  'store_18_heinoah_entertainment',
  // Sharon's Delight (BA15) — no-show on Jun 6
  'store_ba15_sharons_delight',
  // Demo Supplier (Booth DEMO) — supplier-login demo/testing only; keep out
  // of guest-facing screens but still selectable in the store-login picker.
  'store_demo2026',
]);

/** Prizes hidden from the raffle (also drops their slot from the schedule). */
export const HIDDEN_PRIZE_IDS: ReadonlySet<string> = new Set([
  // Heinoah-sponsored
  'prize_d1_06', // Personalized Totebag
  // Sharon's-sponsored
  'prize_d1_05', // Frozen Siomai
]);

/**
 * Prizes given out DIRECTLY (not through the draw). Shown as "N/A" in the admin
 * prize list and kept out of the draw so they can't be accidentally drawn — but
 * still visible for the record (unlike HIDDEN_PRIZE_IDS, which removes them).
 */
export const NA_PRIZE_IDS: ReadonlySet<string> = new Set([
  // Relationship Planner (Mella) — the Sep 19 5PM & 7PM slots were handed to
  // exhibit finishers as an additional prize, not drawn.
  'prize_s2_m1_17',
  'prize_s2_m1_19',
]);

/** Quests are hidden indirectly by being linked to a hidden store_id. */
