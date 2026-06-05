/**
 * Hourly raffle-draw schedule for Forever in a Day.
 *
 * Slots are position-based, not ID-based:
 *   Day 1 — first d1 prize at 11am, then hourly
 *   Day 2 — first d2 prize at 11am, then hourly
 *   Grand — 9:30pm Day 2 (always last)
 *
 * Position-based means deleting a prize naturally compacts the schedule —
 * if d1_02 (Coffee GC) is removed, d1_03 (Frozen Steak) moves into the 11am
 * slot instead of leaving an empty 11am with the first draw silently shifted
 * to 12pm.
 *
 * Caller passes the current full prize list and the event date; this returns
 * a Map of prizeId → ISO draw-time string. Times are interpreted in the
 * browser's local timezone (PH guests see PH times).
 */
export function buildSchedule(prizeIds: string[], eventDate: string): Map<string, string> {
  const map = new Map<string, string>();
  const day1Base = new Date(`${eventDate}T11:00:00`);
  if (isNaN(day1Base.getTime())) return map;

  // Day-1 prizes — sorted by ID so the order is stable across re-renders.
  const d1 = prizeIds.filter((id) => /^prize_d1_/.test(id)).sort();
  d1.forEach((id, idx) => {
    const t = new Date(day1Base);
    t.setHours(11 + idx, 0, 0, 0);
    map.set(id, t.toISOString());
  });

  // Day-2 prizes — same shape, one calendar day later.
  const d2 = prizeIds.filter((id) => /^prize_d2_/.test(id)).sort();
  d2.forEach((id, idx) => {
    const t = new Date(day1Base);
    t.setDate(t.getDate() + 1);
    t.setHours(11 + idx, 0, 0, 0);
    map.set(id, t.toISOString());
  });

  // Grand prize — 9:30pm Day 2.
  if (prizeIds.includes('prize_grand')) {
    const t = new Date(day1Base);
    t.setDate(t.getDate() + 1);
    t.setHours(21, 30, 0, 0);
    map.set('prize_grand', t.toISOString());
  }

  return map;
}

/** Read one prize's scheduled time from the Map. */
export function getDrawTime(schedule: Map<string, string>, prizeId: string): string | null {
  return schedule.get(prizeId) ?? null;
}

/**
 * Sort key for prizes so the UI lists them in draw-time order. Prizes the
 * schedule doesn't recognize sort last.
 */
export function getDrawSortKey(schedule: Map<string, string>, prizeId: string): number {
  const iso = schedule.get(prizeId);
  return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER;
}
