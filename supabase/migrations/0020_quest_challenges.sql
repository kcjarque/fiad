-- Replace the seed booth challenges with the 14 event quests.
-- Each quest is type=booth (auto-completes when the guest stamps that booth)
-- and rewards 1 raffle entry. Quest text also shows on the booth profile card.

delete from challenges where id in (
  'ch_booth_catering','ch_booth_photo','ch_booth_ring','ch_act_fashion'
);

insert into challenges (id, event_id, type, name, description, store_id, reward_type, reward_value) values
  ('q_photobooths',  'evt_fiad_dec25', 'booth', 'Check Out the Photobooth',
    'Try the different photobooths at 8 Point Studios.',
    'store_38_8pointstudios',             'raffle_entries', 1),
  ('q_try_ring',     'evt_fiad_dec25', 'booth', 'Try On a Ring',
    'Get your ring size measured at Romierre Jewelry or Vaella Jewelry.',
    'store_35_romierre_jewelry',          'raffle_entries', 1),
  ('q_hanbok',       'evt_fiad_dec25', 'booth', 'Wear a Hanbok',
    'Visit Peridot Studios (Timeless Portraits) and pose in a traditional Hanbok.',
    'store_peridot_photoman',             'raffle_entries', 1),
  ('q_food_tasting', 'evt_fiad_dec25', 'booth', 'MCatering Food Tasting',
    'Visit MCatering for the food tasting. Pre-register and confirm your grand tasting schedule.',
    'store_01_mcatering',                 'raffle_entries', 1),
  ('q_gown_fit',     'evt_fiad_dec25', 'booth', 'Find Your Silhouette',
    'Try on a wedding gown with Emil Ocampo and discover which silhouette fits your body type.',
    'store_26_emil_ocampo',               'raffle_entries', 1),
  ('q_film_show',    'evt_fiad_dec25', 'booth', 'Film Showing Room',
    'Watch sample work from Permala and 8 Point Studios at the film showing room.',
    'store_40_permala_photo_video',       'raffle_entries', 1),
  ('q_cake_coffee',  'evt_fiad_dec25', 'booth', 'Cake Tasting at From Paulyn',
    'Visit FROM PAULYN for cake tasting paired with coffee.',
    'store_ba31_from_paulyn',             'raffle_entries', 1),
  ('q_trial_mua',    'evt_fiad_dec25', 'booth', 'Trial Make-Up',
    'Experience a trial make-up with Ellen Drilon or SAB HMUA.',
    'store_30_ellen_drilon_make_up_group','raffle_entries', 1),
  ('q_celeb_host',   'evt_fiad_dec25', 'booth', 'Meet a Celebrity Host',
    'Say hi to our celebrity hosts — RJ Ledesma and DJ Adam.',
    'store_27_rj_ledesma',                'raffle_entries', 1),
  ('q_wed_journal',  'evt_fiad_dec25', 'booth', 'Wedding Journal by AJT',
    'Check out the wedding journal of AJT Events Management & Jenné.',
    'store_33_ajt_events',                'raffle_entries', 1),
  ('q_young_living', 'evt_fiad_dec25', 'booth', 'Young Living Oils @ W@W',
    'Drop by the Weddings at Work (W@W) booth to check out Young Living oil products.',
    'store_48_weddings_at_work_w_w',      'raffle_entries', 1),
  ('q_riman_skin',   'evt_fiad_dec25', 'booth', 'Riman Skincare',
    'Experience Riman skincare in Hall 1 between 10:00 AM and 4:00 PM.',
    'store_13_riman',                     'raffle_entries', 1),
  ('q_clawmachine',  'evt_fiad_dec25', 'booth', 'Heinoah Claw Machine',
    'Try your luck at the Heinoah claw machine.',
    'store_18_heinoah_entertainment',     'raffle_entries', 1),
  ('q_lukas_steak',  'evt_fiad_dec25', 'booth', 'Taste Luka''s Steak',
    'Stop by Luka''s Steak for a bite.',
    'store_ba33_lukas_steak',             'raffle_entries', 1)
on conflict (id) do nothing;
