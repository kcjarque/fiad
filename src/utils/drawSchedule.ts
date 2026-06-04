/**
 * Hourly raffle-draw schedule for Forever in a Day.
 *
 * Slots:
 *   Day 1 (June 6) — 11am hourly through 5pm (7 prizes: d1_02..d1_08)
 *   Day 2 (June 7) — 11am hourly through 6pm (8 prizes: d2_01..d2_08)
 *   Grand prize    — 9:30pm Day 2 (14K Gold Wedding Ring)
 *
 * All times are interpreted in the browser's local timezone, matching the
 * convention used elsewhere in the app. PH guests will see PH times.
 *
 * Returns null if the prize ID doesn't fit the known pattern — callers should
 * treat that as "schedule unknown" rather than crashing.
 */
export function scheduledDrawTime(prizeId: string, eventDate: string): string | null {
  // eventDate is the YYYY-MM-DD for Day 1.
  const day1 = new Date(`${eventDate}T11:00:00`);
  if (isNaN(day1.getTime())) return null;

  if (prizeId === 'prize_grand') {
    const grand = new Date(day1);
    grand.setDate(grand.getDate() + 1); // Day 2 (June 7)
    grand.setHours(21, 30, 0, 0);       // 9:30pm
    return grand.toISOString();
  }

  // Match prize_d{1|2}_{NN}
  const m = prizeId.match(/^prize_d([12])_(\d+)$/);
  if (!m) return null;
  const dayNum = Number(m[1]);
  const slotNum = Number(m[2]);

  // Day 1 prizes are numbered _02..._08 (because _01 was the removed Peridot
  // prize) — slot index = slotNum - 2.
  // Day 2 prizes are numbered _01..._08 — slot index = slotNum - 1.
  const slotIdx = dayNum === 1 ? slotNum - 2 : slotNum - 1;
  if (slotIdx < 0) return null;

  const t = new Date(day1);
  t.setDate(t.getDate() + (dayNum - 1));
  t.setHours(11 + slotIdx, 0, 0, 0);
  return t.toISOString();
}

/**
 * Sort key for prizes so they appear in draw-time order across the UI.
 * Prizes the schedule doesn't recognize sort last.
 */
export function drawSortKey(prizeId: string, eventDate: string): number {
  const iso = scheduledDrawTime(prizeId, eventDate);
  return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER;
}
