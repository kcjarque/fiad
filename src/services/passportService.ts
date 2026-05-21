import { db, notify } from '../data/mockDb';
import type { PassportStamp } from '../types';
import { uid } from '../utils/id';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

export const stampsForGuest = (guestId: string): PassportStamp[] =>
  db.passportStamps.filter((s) => s.guestId === guestId);

export const hasStamp = (guestId: string, storeId: string): boolean =>
  db.passportStamps.some((s) => s.guestId === guestId && s.storeId === storeId);

export const stampPassport = (guestId: string, storeId: string): PassportStamp | { alreadyStamped: true } => {
  if (hasStamp(guestId, storeId)) return { alreadyStamped: true };
  const stamp: PassportStamp = {
    id: uid('stamp'),
    guestId,
    storeId,
    eventId: ACTIVE_EVENT_ID,
    stampedAt: new Date().toISOString(),
  };
  db.passportStamps.push(stamp);
  notify();
  return stamp;
};
