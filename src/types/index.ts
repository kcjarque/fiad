export type Guest = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  qrToken: string;
  registeredAt: string;
  eventId: string;
  /** Which day the guest plans to attend ('day1' | 'day2'). Set by the RSVP funnel. */
  preferredDay?: string;
  /**
   * Plaintext 6-char access code. Only included in admin-facing queries so admins
   * can read it back to guests who lost their welcome email. Never sent to
   * non-admin clients (the login Edge Function compares server-side).
   */
  accessCode?: string;
  /** Set when an admin scans the guest in at the door. */
  checkedInAt?: string;
  /** Which supplier referred this registrant (optional, RSVP funnel). */
  referredBy?: string;
  /** A friend the registrant wants to invite (optional, RSVP funnel). */
  invitedFriend?: string;
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

/** A vendor application from the public /suppliers sign-up landing page. */
export type SupplierSignup = {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  category?: string;
  social?: string;
  products?: string;
  message?: string;
  /** Public URLs of uploaded DTI (or SEC) registration documents. */
  documentUrls?: string[];
  createdAt: string;
};

/** A lead captured from the "Need help organizing your event?" form. */
export type EventInquiry = {
  id: string;
  eventId?: string;
  name: string;
  email: string;
  phone: string;
  partnerName?: string;
  eventDate?: string;
  eventType?: string;
  message?: string;
  createdAt: string;
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
  /** Null for complimentary entries (every guest gets one on signup). */
  transactionId: string | null;
  ticketNumber: string;
  createdAt: string;
  /** True when the entry was issued automatically on signup rather than
   *  earned through a transaction. Complimentary entries are NOT eligible
   *  for the grand prize. */
  isComplimentary: boolean;
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

export type WalkthroughType = 'booth_info' | 'promo' | 'schedule_item' | 'map' | 'activity';

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
