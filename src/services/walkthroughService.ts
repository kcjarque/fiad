import { db, notify } from '../data/mockDb';
import type { WalkthroughItem, WalkthroughType } from '../types';
import { uid } from '../utils/id';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

export const listWalkthrough = (type?: WalkthroughType): WalkthroughItem[] => {
  let list = [...db.walkthrough];
  if (type) list = list.filter((w) => w.type === type);
  return list.sort((a, b) => a.order - b.order);
};

export const createWalkthrough = (w: Omit<WalkthroughItem, 'id' | 'eventId'>): WalkthroughItem => {
  const item: WalkthroughItem = { ...w, id: uid('wt'), eventId: ACTIVE_EVENT_ID };
  db.walkthrough.push(item);
  notify();
  return item;
};

export const updateWalkthrough = (id: string, patch: Partial<WalkthroughItem>): WalkthroughItem | undefined => {
  const idx = db.walkthrough.findIndex((w) => w.id === id);
  if (idx === -1) return undefined;
  db.walkthrough[idx] = { ...db.walkthrough[idx], ...patch };
  notify();
  return db.walkthrough[idx];
};

export const deleteWalkthrough = (id: string): void => {
  const idx = db.walkthrough.findIndex((w) => w.id === id);
  if (idx >= 0) {
    db.walkthrough.splice(idx, 1);
    notify();
  }
};
