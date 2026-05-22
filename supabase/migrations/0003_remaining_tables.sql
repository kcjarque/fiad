-- Migrate remaining mock-DB tables to Supabase.
-- All tables get RLS disabled (event-day app, locked down after launch).

-- Override requests (raised when a spend exceeds the daily cap)
create table if not exists override_requests (
  id                text primary key,
  transaction_id    text not null references transactions(id) on delete cascade,
  store_id          text not null references stores(id) on delete cascade,
  guest_id          text not null references guests(id) on delete cascade,
  amount            int  not null,
  note              text not null,
  status            text not null default 'pending'
                        check (status in ('pending','approved','denied')),
  requested_at      timestamptz not null default now(),
  responded_at      timestamptz,
  responded_by      text
);

-- Passport stamps — one per (guest, store) pair
create table if not exists passport_stamps (
  id          text primary key,
  guest_id    text not null references guests(id) on delete cascade,
  store_id    text not null references stores(id) on delete cascade,
  event_id    text not null references events(id) on delete cascade,
  stamped_at  timestamptz not null default now(),
  unique (guest_id, store_id)
);

-- Challenges / quests
create table if not exists challenges (
  id           text primary key,
  event_id     text not null references events(id) on delete cascade,
  type         text not null check (type in ('booth','activity','visit_all')),
  name         text not null,
  description  text not null,
  store_id     text references stores(id) on delete set null,
  image_url    text,
  reward_type  text not null check (reward_type in ('raffle_entries','physical_prize','stamp_only')),
  reward_value int
);

-- Challenge completions (activity / manual quests)
create table if not exists challenge_completions (
  id            text primary key,
  challenge_id  text not null references challenges(id) on delete cascade,
  guest_id      text not null references guests(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (challenge_id, guest_id)
);

-- Walkthrough items (promos, schedule, map)
create table if not exists walkthrough_items (
  id          text primary key,
  event_id    text not null references events(id) on delete cascade,
  type        text not null check (type in ('booth_info','promo','schedule_item','map')),
  title       text not null,
  content     text not null,
  image_url   text,
  time        text,
  sort_order  int  not null default 0
);

alter table override_requests    disable row level security;
alter table passport_stamps      disable row level security;
alter table challenges           disable row level security;
alter table challenge_completions disable row level security;
alter table walkthrough_items    disable row level security;

-- ── Seed: challenges ────────────────────────────────────────────────────────
-- Use CTE to look up store IDs by name so we don't need to hard-code them.
with store_map as (
  select name, id from stores where event_id = 'evt_fiad_dec25'
)
insert into challenges (id, event_id, type, name, description, store_id, image_url, reward_type, reward_value)
select p.id, 'evt_fiad_dec25', p.type, p.name, p.description,
  (select sm.id from store_map sm where sm.name = p.store_name limit 1),
  p.image_url, p.reward_type, p.reward_value
from (values
  ('ch_visit_all', 'visit_all', 'Visit All Booths',
   'Collect a stamp from every booth and earn +10 bonus raffle entries and a surprise keepsake.',
   null,
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=70',
   'raffle_entries', 10),

  ('ch_booth_catering', 'booth', 'Visit the Catering Booth',
   'Drop by Mcatering and explore their wedding catering packages.',
   'Mcatering',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=70',
   'stamp_only', null),

  ('ch_booth_photo', 'booth', 'Discover 8pointstudios',
   'Visit 8pointstudios and see their prenup and wedding photo packages.',
   '8pointstudios',
   'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=70',
   'raffle_entries', 2),

  ('ch_booth_ring', 'booth', 'Try On a Ring',
   'Visit Romierre Jewelry and try on one of their 14K gold wedding rings.',
   'Romierre Jewelry',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=70',
   'stamp_only', null),

  ('ch_act_fashion', 'activity', 'Attend the Fashion Show',
   'Watch the bridal fashion show at the main stage — running both days at 3 PM.',
   null,
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=800&auto=format&fit=crop&q=70',
   'raffle_entries', 3)
) as p(id, type, name, description, store_name, image_url, reward_type, reward_value)
on conflict (id) do nothing;

-- ── Seed: walkthrough (schedule + promos) ───────────────────────────────────
insert into walkthrough_items (id, event_id, type, title, content, image_url, time, sort_order)
values
  -- Promos
  ('wt_promo_1', 'evt_fiad_dec25', 'promo',
   'Book at the Booth, Save Big',
   'Exclusive event-day discounts at participating booths. Ask any supplier about their FIAD special package — available June 6–7 only.',
   'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop&q=70',
   null, 0),

  ('wt_promo_2', 'evt_fiad_dec25', 'promo',
   'Bundle & Win',
   'Book 3 or more suppliers during the event and automatically earn +20 bonus raffle entries. Visit the registration desk to claim.',
   'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=70',
   null, 1),

  -- Day 1 schedule (June 6, Saturday)
  ('wt_sch_d1_1', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Registration & Welcome',
   'Check-in, get your event kit, and enjoy welcome drinks. Scan your QR at the entrance.',
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=70',
   '10:00 AM', 10),

  ('wt_sch_d1_2', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Opening Program',
   'Welcome remarks and introduction to the exhibitors. Main stage.',
   'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&auto=format&fit=crop&q=70',
   '11:00 AM', 11),

  ('wt_sch_d1_3', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Suppliers Exhibit Opens',
   'Explore all the booths, collect passport stamps, and discover your dream wedding suppliers.',
   'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&auto=format&fit=crop&q=70',
   '1:00 PM', 12),

  ('wt_sch_d1_4', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Bridal Fashion Show',
   'Live runway presentation by our gown and HMUA suppliers on the main stage.',
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&auto=format&fit=crop&q=70',
   '3:00 PM', 13),

  ('wt_sch_d1_5', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Wedding Planning Talk',
   'Panel discussion with event planners: tips for stress-free wedding planning.',
   'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&auto=format&fit=crop&q=70',
   '5:30 PM', 14),

  ('wt_sch_d1_6', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Raffle Draw',
   'Live raffle on the main stage. Day 1 prize winners announced!',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400&auto=format&fit=crop&q=70',
   '7:30 PM', 15),

  -- Day 2 schedule (June 7, Sunday)
  ('wt_sch_d2_1', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Doors Open',
   'Day 2 starts! Continue exploring booths, collecting stamps, and earning entries.',
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=70',
   '10:00 AM', 20),

  ('wt_sch_d2_2', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Bridal Showcase',
   'Second bridal presentation — new looks, new designers.',
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&auto=format&fit=crop&q=70',
   '11:00 AM', 21),

  ('wt_sch_d2_3', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Cake Tasting Workshop',
   'Guided tasting session featuring wedding cake trends and flavors.',
   'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&auto=format&fit=crop&q=70',
   '2:00 PM', 22),

  ('wt_sch_d2_4', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Venue & Catering Seminar',
   'Everything you need to know about choosing a venue and catering service.',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&auto=format&fit=crop&q=70',
   '4:00 PM', 23),

  ('wt_sch_d2_5', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Grand Raffle Draw',
   'The big moment — Grand Prize and Day 2 prizes drawn live on stage.',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400&auto=format&fit=crop&q=70',
   '7:30 PM', 24)

on conflict (id) do nothing;
