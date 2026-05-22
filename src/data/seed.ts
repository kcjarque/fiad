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

  // Mock slice tables (guests/transactions/raffleEntries) are no
  // longer read by services — they all live in Supabase now. Kept empty for
  // type compatibility only.
  const guests: MockDb['guests'] = [];
  const transactions: MockDb['transactions'] = [];
  const raffleEntries: MockDb['raffleEntries'] = [];

  return {
    events: [event],
    admins,
    stores,
    guests,
    transactions,
    raffleEntries,
    interests: [],
    flashDeals: [],
    dealClaims: [],
  };
};
