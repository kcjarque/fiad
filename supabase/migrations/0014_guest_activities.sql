-- Guest Interactive Activities (from SUPPLIERS INFORMATION-2.xlsx).
-- Shown on the event page's "Activities" tab; each links to its booth profile.
-- Reuses walkthrough_items: type='activity', `time` column holds the cost
-- label (FREE / Paid / ₱100 each), store_id links to the hosting booth.

-- 1) Allow the new 'activity' type
alter table walkthrough_items drop constraint if exists walkthrough_items_type_check;
alter table walkthrough_items add constraint walkthrough_items_type_check
  check (type in ('booth_info','promo','schedule_item','map','activity'));

-- 2) Seed activities. store_id mappings marked (guess) need owner confirmation.
insert into walkthrough_items (id, event_id, type, title, content, image_url, time, sort_order, store_id) values
  ('wt_act_hanbok',  'evt_fiad_dec25', 'activity', 'Timeless Hanbok Peridot Pic',
   'Pose in a traditional Korean hanbok and take home a souvenir photo.', null, 'FREE', 0,
   'store_09_timeless_portraits_peridot_stu'),                                    -- confident
  ('wt_act_bracelet','evt_fiad_dec25', 'activity', "Couple's Bracelet",
   'Make a matching couple''s bracelet to take home.', null, 'PHP 100 each', 1,
   'store_28_craftman_s_sheep'),                                                  -- guess
  ('wt_act_riman',   'evt_fiad_dec25', 'activity', 'Riman Korean Skincare',
   'Try a complimentary Korean skincare experience.', null, 'FREE', 2,
   'store_13_riman'),                                                             -- confident
  ('wt_act_claw',    'evt_fiad_dec25', 'activity', 'Claw Machine',
   'Try your luck at the claw machine for fun prizes.', null, 'Paid', 3,
   'store_18_heinoah_entertainment'),                                            -- guess
  ('wt_act_photobooth','evt_fiad_dec25','activity', 'High-Angle Photobooth',
   'Strike a pose at the high-angle photobooth.', null, 'FREE', 4,
   'store_38_8pointstudios'),                                                    -- guess
  ('wt_act_cake',    'evt_fiad_dec25', 'activity', 'Cake Tasting',
   'Sample wedding cake flavors on the spot.', null, 'FREE', 5,
   'store_ba31_from_paulyn'),                                                     -- guess
  ('wt_act_food',    'evt_fiad_dec25', 'activity', 'Food Tasting',
   'Taste signature catering dishes.', null, 'FREE', 6,
   'store_01_mcatering'),                                                         -- guess
  ('wt_act_gown',    'evt_fiad_dec25', 'activity', 'Gown Fitting',
   'Try on bridal gowns and see what suits you.', null, 'FREE', 7,
   'store_26_emil_ocampo'),                                                       -- guess
  ('wt_act_film',    'evt_fiad_dec25', 'activity', 'Film Showing',
   'Watch sample wedding films and highlight reels.', null, 'FREE', 8,
   'store_40_permala_photo_video'),                                              -- guess
  ('wt_act_ringsize','evt_fiad_dec25', 'activity', 'Know Your Ring Size',
   'Get your ring size measured by a jeweler.', null, 'FREE', 9,
   'store_35_romierre_jewelry')                                                  -- guess
on conflict (id) do nothing;
