-- FIAD slice schema: events, admins, stores, guests, transactions, raffle_entries.
-- RLS is intentionally OFF for the demo. Lock down before any real launch.

create table if not exists events (
  id text primary key,
  name text not null,
  date text not null,
  venue text not null,
  raffle_rate int not null,
  daily_cap_per_guest_per_store int not null,
  status text not null check (status in ('draft','live','ended'))
);

create table if not exists admins (
  id text primary key,
  name text not null,
  email text not null unique,
  passcode text not null
);

create table if not exists stores (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null,
  logo_url text not null,
  image_url text,
  booth_number text not null,
  qr_token text not null unique,
  passcode text not null
);

create table if not exists guests (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  email text not null,
  mobile text not null,
  qr_token text not null unique,
  access_code text,
  registered_at timestamptz not null default now()
);

create index if not exists guests_email_lower_idx on guests (lower(email));

create table if not exists transactions (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  store_id text not null references stores(id) on delete cascade,
  guest_id text not null references guests(id) on delete cascade,
  amount int not null,
  receipt_photo_url text not null,
  entries_issued int not null,
  status text not null check (status in ('approved','pending_override','rejected')),
  override_note text,
  approved_by text,
  timestamp timestamptz not null default now()
);

create index if not exists transactions_guest_store_ts_idx on transactions (guest_id, store_id, timestamp);

create table if not exists raffle_entries (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  guest_id text not null references guests(id) on delete cascade,
  transaction_id text not null references transactions(id) on delete cascade,
  ticket_number text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists raffle_entries_guest_idx on raffle_entries (guest_id);

-- Demo: RLS off for the slice tables. Lock down before any real launch.
alter table events         disable row level security;
alter table admins         disable row level security;
alter table stores         disable row level security;
alter table guests         disable row level security;
alter table transactions   disable row level security;
alter table raffle_entries disable row level security;

-- Seed: the active event, admins, and the 12 supplier booths.
-- Guests and transactions are intentionally NOT seeded — they get created through the app.

-- The event id slug is legacy ('evt_fiad_dec25'); kept stable to avoid cascading
-- foreign-key changes across stores, guests, transactions, raffle_entries.
insert into events (id, name, date, venue, raffle_rate, daily_cap_per_guest_per_store, status) values
  ('evt_fiad_dec25', 'Forever in a Day — Taguig | June 6-7, 2026', '2026-06-06', 'Brittany Hotel BGC', 100, 5000, 'live')
on conflict (id) do nothing;

insert into admins (id, name, email, passcode) values
  ('adm_1', 'Isabella Cruz', 'bella@fiad.ph', '1234'),
  ('adm_2', 'Marco Santos',  'marco@fiad.ph', '1234'),
  ('adm_3', 'Nina Reyes',    'nina@fiad.ph',  '1234')
on conflict (id) do nothing;

insert into stores (id, event_id, name, category, description, logo_url, image_url, booth_number, qr_token, passcode) values
  ('store_1',  'evt_fiad_dec25', 'Sweet Serenity Cakes',     'Cake',             'Three-tier naked cakes, ube truffle specialty.',         'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=70', 'A1', 'store-qr-1-seed01', '1234'),
  ('store_2',  'evt_fiad_dec25', 'Maison Blanche Gowns',     'Gown',             'Couture bridal & debut gowns, rush-fit available.',      'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=800&auto=format&fit=crop&q=70', 'A2', 'store-qr-2-seed02', '1234'),
  ('store_3',  'evt_fiad_dec25', 'Chateau Rosé Venue',       'Venue',            'Garden venue in Tagaytay, 200-pax capacity.',            'https://images.unsplash.com/photo-1519741497674-611481863552?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=70', 'B1', 'store-qr-3-seed03', '1234'),
  ('store_4',  'evt_fiad_dec25', 'Golden Hour Studios',      'Photography',      'Cinematic wedding & prenup photography.',                'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=70', 'B2', 'store-qr-4-seed04', '1234'),
  ('store_5',  'evt_fiad_dec25', 'Feast & Flourish Catering','Catering',         'Plated 4-course menus, allergy-friendly options.',       'https://images.unsplash.com/photo-1555244162-803834f70033?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=70', 'C1', 'store-qr-5-seed05', '1234'),
  ('store_6',  'evt_fiad_dec25', 'Forever Planned Co.',      'Coordination',     'On-the-day and full coordination packages.',             'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=70', 'C2', 'store-qr-6-seed06', '1234'),
  ('store_7',  'evt_fiad_dec25', 'Papier & Ink Invitations', 'Invitation',       'Letterpress and digital save-the-dates.',                'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&auto=format&fit=crop&q=70', 'D1', 'store-qr-7-seed07', '1234'),
  ('store_8',  'evt_fiad_dec25', 'Bloom & Branch Florals',   'Flowers',          'Seasonal blooms, installations, bouquets.',              'https://images.unsplash.com/photo-1509610973147-232dfea52a97?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1509610973147-232dfea52a97?w=800&auto=format&fit=crop&q=70', 'D2', 'store-qr-8-seed08', '1234'),
  ('store_9',  'evt_fiad_dec25', 'Harmony Host & DJ',        'Host/DJ',          'Bilingual hosts, full event audio production.',          'https://images.unsplash.com/photo-1516834611397-8d633eaec5d0?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1516834611397-8d633eaec5d0?w=800&auto=format&fit=crop&q=70', 'E1', 'store-qr-9-seed09', '1234'),
  ('store_10', 'evt_fiad_dec25', 'Reel Romance Films',       'Videographer',     'Same-day edits, documentary-style films.',               'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=70', 'E2', 'store-qr-10-seed10', '1234'),
  ('store_11', 'evt_fiad_dec25', 'Aurum Rings',              'Rings',            'Custom engagement rings, certified diamonds.',           'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=70', 'F1', 'store-qr-11-seed11', '1234'),
  ('store_12', 'evt_fiad_dec25', 'Sunlit Honeymoons',        'Honeymoon Travel', 'Curated honeymoon packages to Palawan & Bali.',          'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=160&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&auto=format&fit=crop&q=70', 'F2', 'store-qr-12-seed12', '1234')
on conflict (id) do nothing;
