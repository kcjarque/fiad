export type Guest = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  qrToken: string;
  registeredAt: string;
  eventId: string;
  /**
   * Plaintext 6-char access code. Only included in admin-facing queries so admins
   * can read it back to guests who lost their welcome email. Never sent to
   * non-admin clients (the login Edge Function compares server-side).
   */
  accessCode?: string;
};

export type Store = {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  imageUrl?: string;
  boothNumber: string;
  qrToken: string;
  passcode: string;
  eventId: string;
  email?: string;
  contact?: string;
  socialMedia?: string;
};

export type Admin = {
  id: string;
  name: string;
  email: string;
  passcode: string;
};

export type EventStatus = 'draft' | 'live' | 'ended';

export type EventInfo = {
  id: string;
  name: string;
  date: string;
  venue: string;
  raffleRate: number;
  dailyCapPerGuestPerStore: number;
  status: EventStatus;
};

export type TransactionStatus = 'approved' | 'pending_override' | 'rejected';

export type Transaction = {
  id: string;
  eventId: string;
  storeId: string;
  guestId: string;
  amount: number;
  receiptPhotoUrl: string;
  entriesIssued: number;
  status: TransactionStatus;
  overrideNote?: string;
  approvedBy?: string;
  timestamp: string;
};

export type RaffleEntry = {
  id: string;
  eventId: string;
  guestId: string;
  transactionId: string;
  ticketNumber: string;
  createdAt: string;
};

export type Prize = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  imageUrl: string;
  quantity: number;
  drawnAt?: string;
  winnerGuestId?: string;
  winningTicketNumber?: string;
  sponsoredByStoreId?: string;
};

export type ChallengeType = 'booth' | 'activity' | 'visit_all';
export type ChallengeReward = 'raffle_entries' | 'physical_prize' | 'stamp_only';

export type Challenge = {
  id: string;
  eventId: string;
  type: ChallengeType;
  name: string;
  description: string;
  storeId?: string;
  imageUrl?: string;
  rewardType: ChallengeReward;
  rewardValue?: number;
};

export type ChallengeCompletion = {
  id: string;
  challengeId: string;
  guestId: string;
  completedAt: string;
};

export type PassportStamp = {
  id: string;
  guestId: string;
  storeId: string;
  eventId: string;
  stampedAt: string;
};

export type WalkthroughType = 'booth_info' | 'promo' | 'schedule_item' | 'map';

export type WalkthroughItem = {
  id: string;
  eventId: string;
  type: WalkthroughType;
  title: string;
  content: string;
  imageUrl?: string;
  time?: string;
  order: number;
  storeId?: string;
};

export type OverrideStatus = 'pending' | 'approved' | 'denied';

export type OverrideRequest = {
  id: string;
  transactionId: string;
  storeId: string;
  guestId: string;
  amount: number;
  note: string;
  status: OverrideStatus;
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
};

export type Role = 'guest' | 'store' | 'admin' | null;

export type Interest = {
  id: string;
  eventId: string;
  guestId: string;
  storeId: string;
  note?: string;
  createdAt: string;
};

export type FlashDealStatus = 'active' | 'ended' | 'exhausted';

export type FlashDeal = {
  id: string;
  eventId: string;
  storeId: string;
  title: string;
  description: string;
  discountLabel: string; // e.g. "₱5,000 off" or "20% off"
  maxRedemptions: number;
  startsAt: string;
  expiresAt: string;
  status: FlashDealStatus;
  createdAt: string;
};

export type DealClaim = {
  id: string;
  dealId: string;
  guestId: string;
  claimedAt: string;
};
