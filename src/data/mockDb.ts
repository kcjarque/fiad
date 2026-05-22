import type {
  Admin,
  DealClaim,
  EventInfo,
  FlashDeal,
  Guest,
  Interest,
  RaffleEntry,
  Store,
  Transaction,
} from '../types';
import { seed } from './seed';

export type MockDb = {
  events: EventInfo[];
  admins: Admin[];
  stores: Store[];
  guests: Guest[];
  transactions: Transaction[];
  raffleEntries: RaffleEntry[];
  interests: Interest[];
  flashDeals: FlashDeal[];
  dealClaims: DealClaim[];
};

const STORAGE_KEY = 'fiad.mockdb.v5';

const load = (): MockDb => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // ignore
  }
  const fresh = seed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
};

export const db: MockDb = load();

export const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
};

export const resetDb = () => {
  const fresh = seed();
  (Object.keys(fresh) as (keyof MockDb)[]).forEach((k) => {
    // @ts-expect-error dynamic key assignment
    db[k] = fresh[k];
  });
  persist();
};

type Subscriber = () => void;
const subs = new Set<Subscriber>();
export const subscribe = (fn: Subscriber) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
export const notify = () => {
  persist();
  subs.forEach((s) => s());
};
