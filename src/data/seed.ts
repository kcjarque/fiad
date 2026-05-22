import type { MockDb } from './mockDb';
// Note: prizes are now stored in Supabase (see supabase/migrations/0002_prizes.sql)

export const seed = (): MockDb => {
  const eventId = 'evt_fiad_dec25';

  const event = {
    id: eventId,
    name: 'Forever in a Day — Taguig | June 6-7, 2026',
    date: '2026-06-06',
    venue: 'Brittany Hotel BGC',
    raffleRate: 100,
    dailyCapPerGuestPerStore: 5000,
    status: 'live' as const,
  };

  const admins = [
    { id: 'adm_1', name: 'Isabella Cruz', email: 'bella@fiad.ph', passcode: '1234' },
    { id: 'adm_2', name: 'Marco Santos', email: 'marco@fiad.ph', passcode: '1234' },
    { id: 'adm_3', name: 'Nina Reyes', email: 'nina@fiad.ph', passcode: '1234' },
  ];

  // Unsplash photo IDs curated per category. Swap to client imagery before launch.
  const img = (id: string, w = 800) =>
    `https://images.unsplash.com/${id}?w=${w}&auto=format&fit=crop&q=70`;

  const storeDefs = [
    { name: 'Sweet Serenity Cakes', category: 'Cake', description: 'Three-tier naked cakes, ube truffle specialty.', booth: 'A1', img: 'photo-1522673607200-164d1b6ce486' },
    { name: 'Maison Blanche Gowns', category: 'Gown', description: 'Couture bridal & debut gowns, rush-fit available.', booth: 'A2', img: 'photo-1594552072238-b8a33785b261' },
    { name: 'Chateau Rosé Venue', category: 'Venue', description: 'Garden venue in Tagaytay, 200-pax capacity.', booth: 'B1', img: 'photo-1519741497674-611481863552' },
    { name: 'Golden Hour Studios', category: 'Photography', description: 'Cinematic wedding & prenup photography.', booth: 'B2', img: 'photo-1519225421980-715cb0215aed' },
    { name: 'Feast & Flourish Catering', category: 'Catering', description: 'Plated 4-course menus, allergy-friendly options.', booth: 'C1', img: 'photo-1555244162-803834f70033' },
    { name: 'Forever Planned Co.', category: 'Coordination', description: 'On-the-day and full coordination packages.', booth: 'C2', img: 'photo-1511795409834-ef04bbd61622' },
    { name: 'Papier & Ink Invitations', category: 'Invitation', description: 'Letterpress and digital save-the-dates.', booth: 'D1', img: 'photo-1607344645866-009c320b63e0' },
    { name: 'Bloom & Branch Florals', category: 'Flowers', description: 'Seasonal blooms, installations, bouquets.', booth: 'D2', img: 'photo-1509610973147-232dfea52a97' },
    { name: 'Harmony Host & DJ', category: 'Host/DJ', description: 'Bilingual hosts, full event audio production.', booth: 'E1', img: 'photo-1516834611397-8d633eaec5d0' },
    { name: 'Reel Romance Films', category: 'Videographer', description: 'Same-day edits, documentary-style films.', booth: 'E2', img: 'photo-1492691527719-9d1e07e534b4' },
    { name: 'Aurum Rings', category: 'Rings', description: 'Custom engagement rings, certified diamonds.', booth: 'F1', img: 'photo-1606800052052-a08af7148866' },
    { name: 'Sunlit Honeymoons', category: 'Honeymoon Travel', description: 'Curated honeymoon packages to Palawan & Bali.', booth: 'F2', img: 'photo-1510414842594-a61c69b5ae57' },
  ];

  const stores = storeDefs.map((s, i) => ({
    id: `store_${i + 1}`,
    name: s.name,
    category: s.category,
    description: s.description,
    logoUrl: img(s.img, 160),
    imageUrl: img(s.img, 800),
    boothNumber: s.booth,
    qrToken: `store-qr-${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
    passcode: '1234',
    eventId,
  }));

  // Mock slice tables (guests/transactions/raffleEntries/overrides) are no
  // longer read by services — they all live in Supabase now. Kept empty for
  // type compatibility only.
  const guests: MockDb['guests'] = [];
  const transactions: MockDb['transactions'] = [];
  const raffleEntries: MockDb['raffleEntries'] = [];
  const overrides: MockDb['overrides'] = [];

  const challenges = [
    {
      id: 'ch_visit_all',
      eventId,
      type: 'visit_all' as const,
      name: 'Visit All Booths',
      description: 'Collect a stamp from every booth to earn +10 raffle entries.',
      rewardType: 'raffle_entries' as const,
      rewardValue: 10,
      imageUrl: img('photo-1519741497674-611481863552', 900),
    },
    {
      id: 'ch_booth_1',
      eventId,
      type: 'booth' as const,
      name: 'Taste the Ube Truffle',
      description: 'Try the signature ube truffle at Sweet Serenity Cakes.',
      storeId: 'store_1',
      rewardType: 'stamp_only' as const,
      imageUrl: img('photo-1522673607200-164d1b6ce486', 800),
    },
    {
      id: 'ch_booth_2',
      eventId,
      type: 'booth' as const,
      name: 'Try On a Gown',
      description: 'Experience the rush-fit studio at Maison Blanche.',
      storeId: 'store_2',
      rewardType: 'stamp_only' as const,
      imageUrl: img('photo-1594552072238-b8a33785b261', 800),
    },
    {
      id: 'ch_booth_3',
      eventId,
      type: 'booth' as const,
      name: 'Build a Bouquet',
      description: 'Join the mini bouquet workshop at Bloom & Branch.',
      storeId: 'store_8',
      rewardType: 'raffle_entries' as const,
      rewardValue: 2,
      imageUrl: img('photo-1509610973147-232dfea52a97', 800),
    },
    {
      id: 'ch_act_1',
      eventId,
      type: 'activity' as const,
      name: 'Fashion Show — 3 PM',
      description: 'Attend the Maison Blanche fashion show at the main stage.',
      rewardType: 'raffle_entries' as const,
      rewardValue: 3,
      imageUrl: img('photo-1519225421980-715cb0215aed', 800),
    },
    {
      id: 'ch_act_2',
      eventId,
      type: 'activity' as const,
      name: 'Cake Tasting Session — 5 PM',
      description: 'Join the group cake tasting at the Forever Hall.',
      rewardType: 'stamp_only' as const,
      imageUrl: img('photo-1555244162-803834f70033', 800),
    },
  ];

  // Passport stamps are created at the event via the guest /app/scan flow.
  // No pre-seeded stamps — guests live in Supabase and we don't have their IDs at mock-seed time.
  const passportStamps: MockDb['passportStamps'] = [];

  const walkthrough: MockDb['walkthrough'] = [
    ...stores.map((s, i) => ({
      id: `wt_booth_${i + 1}`,
      eventId,
      type: 'booth_info' as const,
      title: s.name,
      content: s.description,
      imageUrl: s.logoUrl,
      order: i,
    })),
    {
      id: 'wt_promo_1',
      eventId,
      type: 'promo' as const,
      title: 'Book Today, Save 15%',
      content: 'Any package booked during the event gets 15% off. Ask at any booth!',
      order: 0,
    },
    {
      id: 'wt_promo_2',
      eventId,
      type: 'promo' as const,
      title: 'Bundle & Win',
      content: 'Book 3 suppliers today and auto-enter the Grand Prize draw with +20 entries.',
      order: 1,
    },
    { id: 'wt_sch_1', eventId, type: 'schedule_item' as const, title: 'Doors Open', content: 'Registration and welcome drinks', time: '10:00 AM', order: 0 },
    { id: 'wt_sch_2', eventId, type: 'schedule_item' as const, title: 'Bridal Fashion Show', content: 'Maison Blanche showcase on the main stage', time: '3:00 PM', order: 1 },
    { id: 'wt_sch_3', eventId, type: 'schedule_item' as const, title: 'Cake Tasting', content: 'Group tasting at Forever Hall', time: '5:00 PM', order: 2 },
    { id: 'wt_sch_4', eventId, type: 'schedule_item' as const, title: 'Grand Raffle Draw', content: 'Live raffle on the main stage', time: '7:30 PM', order: 3 },
    { id: 'wt_map', eventId, type: 'map' as const, title: 'Event Floor Plan', content: 'Main Hall — booths grouped by category (Cake, Gown, Venue, etc.)', imageUrl: 'https://picsum.photos/seed/fiad-map/900/600', order: 0 },
  ];

  return {
    events: [event],
    admins,
    stores,
    guests,
    transactions,
    raffleEntries,
    challenges,
    challengeCompletions: [],
    passportStamps,
    walkthrough,
    overrides,
    interests: [],
    flashDeals: [],
    dealClaims: [],
  };
};
