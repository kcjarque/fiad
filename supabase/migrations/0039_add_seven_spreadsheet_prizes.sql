-- Add the 7 remaining prizes from Sir's final raffle spreadsheet.
-- "Day 1 & 2" entries (Fenrir's Coffee, Pru-Life UK) split into two slots
-- — one drawn each day — so they're modelled as 2 separate rows.
-- "(blank)" entries (FromPaulyn, Kate's) default to Day 1.
--
-- After this migration the schedule fills both days neatly:
--   Day 1 — 10 prizes, 11am hourly through 8pm
--   Day 2 — 11 prizes, 11am hourly through 9pm
--   Grand — 9:30pm Day 2 (14K Gold Wedding Ring)
--
-- IDs are 2-digit so position-based lex sort matches numeric sort up to 99.

insert into prizes (id, event_id, name, description, image_url, quantity, sponsored_by_store_id) values
  ('prize_d1_09', 'evt_fiad_dec25', 'Cake Tasting Box',
   'A curated cake tasting box, sponsored by From Paulyn.',
   '/RAFFLE%20PRIZES/FROM%20PAULYN.jpg', 1, 'store_ba31_from_paulyn'),

  ('prize_d1_10', 'evt_fiad_dec25', 'Fenrir''s Forest Drinks',
   'Two full servings of your choice of Fenrir''s Forest drinks.',
   '/RAFFLE%20PRIZES/FENRIR_S%20FOREST.jpg', 1, 'store_20_fenrir_s_forest'),

  ('prize_d1_11', 'evt_fiad_dec25', 'Revel Bar / Brownies Box',
   'A box of revel bar and brownies, sponsored by Kate''s Confections.',
   '/RAFFLE%20PRIZES/KATE_S%20CONFECTIONS.jpg', 1, 'store_24_kate_s_confections'),

  ('prize_d1_12', 'evt_fiad_dec25', 'Pru Life UK Umbrella',
   'A Pru Life UK umbrella, sponsored by Pru Life UK.',
   '/RAFFLE%20PRIZES/PRU%20LIFE%20UK.avif', 1, 'store_prulife_uk'),

  ('prize_d2_09', 'evt_fiad_dec25', 'Fenrir''s Forest Drinks',
   'Two full servings of your choice of Fenrir''s Forest drinks.',
   '/RAFFLE%20PRIZES/FENRIR_S%20FOREST.jpg', 1, 'store_20_fenrir_s_forest'),

  ('prize_d2_10', 'evt_fiad_dec25', 'Pru Life UK Umbrella',
   'A Pru Life UK umbrella, sponsored by Pru Life UK.',
   '/RAFFLE%20PRIZES/PRU%20LIFE%20UK.avif', 1, 'store_prulife_uk'),

  ('prize_d2_11', 'evt_fiad_dec25', 'Korean Skincare Products',
   'A set of Korean skincare products, sponsored by Riman.',
   '/RAFFLE%20PRIZES/RIMAN.jpg', 1, 'store_13_riman'),

  ('prize_d2_12', 'evt_fiad_dec25', 'Vaella Jewelry GC',
   'A surprise gift certificate from Vaella Jewelry.',
   '/RAFFLE%20PRIZES/VAELLA.png', 1, 'store_ba17_vaella_jewelry'),

  ('prize_d2_13', 'evt_fiad_dec25', 'Romierre Jewelry GC',
   'A surprise gift certificate from Romierre Jewelry.',
   '/RAFFLE%20PRIZES/ROMIERRE%20JEWELRY.png', 1, 'store_35_romierre_jewelry');
