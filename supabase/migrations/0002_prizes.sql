-- Prizes table: replaces the mock-DB prizes array.
-- sponsored_by_store_id links a prize to the supplier who donated it.

create table if not exists prizes (
  id                     text primary key,
  event_id               text not null references events(id) on delete cascade,
  name                   text not null,
  description            text not null,
  image_url              text not null,
  quantity               int  not null default 1,
  drawn_at               timestamptz,
  winner_guest_id        text references guests(id) on delete set null,
  winning_ticket_number  text,
  sponsored_by_store_id  text references stores(id) on delete set null
);

alter table prizes disable row level security;

-- Seed: 17 FIAD raffle prizes (Day 1 × 8, Day 2 × 8, Grand Prize × 1).
-- Uses a CTE so sponsor look-ups are done by store name, not hard-coded IDs.
with store_map as (
  select name, id from stores where event_id = 'evt_fiad_dec25'
)
insert into prizes
  (id, event_id, name, description, image_url, quantity, sponsored_by_store_id)
select
  p.id,
  'evt_fiad_dec25',
  p.name,
  p.description,
  p.image_url,
  p.quantity,
  (select sm.id from store_map sm where sm.name = p.store_name limit 1)
from (values
  -- ── Day 1 ──────────────────────────────────────────────────────────────────
  ('prize_d1_01',
   'Seat Arrangement Stationery Set',
   'Elegant seat-arrangement stationery set, sponsored by Timeless Portraits Peridot Studios.',
   'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&auto=format&fit=crop&q=70',
   1,
   'Timeless Portraits Peridot Studios'),

  ('prize_d1_02',
   'Coffee GC ₱1,000',
   '₱1,000 Fenrir''s Forest Coffee Bar gift certificate.',
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=70',
   1,
   'Fenrir''s Forest'),

  ('prize_d1_03',
   'Frozen Steak Package',
   'Premium frozen steak package.',
   'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&auto=format&fit=crop&q=70',
   1,
   null),

  ('prize_d1_04',
   '1 Bottle of Wine',
   'Fine wine bottle courtesy of Perfect Cellar.',
   'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=70',
   1,
   'Perfect Cellar'),

  ('prize_d1_05',
   'Frozen Siomai',
   'Classic homemade frozen siomai.',
   'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=70',
   1,
   null),

  ('prize_d1_06',
   'Personalized Totebag',
   'Custom-engraved personalized tote bag, sponsored by Heinoah Entertainment.',
   'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=70',
   1,
   'Heinoah Entertainment'),

  ('prize_d1_07',
   'Wooden Souvenir',
   'Hand-crafted wooden souvenir by Craftman''s Sheep.',
   'https://images.unsplash.com/photo-1609687960038-41d5b1ed89a4?w=800&auto=format&fit=crop&q=70',
   1,
   'Craftman''s Sheep'),

  ('prize_d1_08',
   '2 Norigae',
   'Two traditional Korean silk ornament charms by ABCD Toteful Creations.',
   'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&auto=format&fit=crop&q=70',
   2,
   'ABCD Toteful Creations'),

  -- ── Day 2 ──────────────────────────────────────────────────────────────────
  ('prize_d2_01',
   '100ml Perfume',
   'Signature 100ml perfume, sponsored by Bloom in Pink.',
   'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=70',
   1,
   'Bloom in Pink'),

  ('prize_d2_02',
   'Bridal Shoes ₱3,500',
   '₱3,500 bridal shoes voucher.',
   'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=70',
   1,
   null),

  ('prize_d2_03',
   'FREENUP Session — 3 Hours',
   'Complimentary 3-hour prenuptial photo session.',
   'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=70',
   1,
   null),

  ('prize_d2_04',
   'Journal Package',
   'Curated journal package, sponsored by Invitations by Ten.',
   'https://images.unsplash.com/photo-1531346680769-a1d79b57de5f?w=800&auto=format&fit=crop&q=70',
   1,
   'Invitations by Ten'),

  ('prize_d2_05',
   'Hotel Buffet GC for 2',
   'Buffet gift certificate for two guests.',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=70',
   1,
   null),

  ('prize_d2_06',
   'Our Wedding Journal',
   'Keepsake wedding planning journal, sponsored by AJT Events.',
   'https://images.unsplash.com/photo-1531346680769-a1d79b57de5f?w=800&auto=format&fit=crop&q=70',
   1,
   'AJT Events'),

  ('prize_d2_07',
   'Valentine Bouquet',
   'Romantic flower bouquet by Graciabelle''s Flowershop.',
   'https://images.unsplash.com/photo-1509610973147-232dfea52a97?w=800&auto=format&fit=crop&q=70',
   1,
   'Graciabelle''s Flowershop'),

  ('prize_d2_08',
   '100 Placecards',
   '100 custom printed place cards, sponsored by Invitations by Ten.',
   'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&auto=format&fit=crop&q=70',
   100,
   'Invitations by Ten'),

  -- ── Grand Prize ─────────────────────────────────────────────────────────────
  ('prize_grand',
   '14K Gold Wedding Ring',
   'A stunning 14K gold wedding ring, generously sponsored by Romierre Jewelry.',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=70',
   1,
   'Romierre Jewelry')
) as p(id, name, description, image_url, quantity, store_name)
on conflict (id) do nothing;
