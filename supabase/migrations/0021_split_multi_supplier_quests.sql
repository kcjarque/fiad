-- Split the multi-supplier quests so each booth has its own independent
-- 1-entry quest. Visiting Vaella now awards its own raffle entry instead of
-- piggy-backing on the Romierre quest, etc.

-- Tighten the existing quests to their primary supplier only
update challenges set name = 'Try On a Ring at Romierre',
  description = 'Get your ring size measured at Romierre Jewelry.'
  where id = 'q_try_ring';

update challenges set name = 'Permala Film Showing',
  description = 'Watch sample work from Permala Photo & Video at the film showing room.'
  where id = 'q_film_show';

update challenges set name = 'Trial Make-Up with Ellen',
  description = 'Experience a trial make-up with Ellen Drilon.'
  where id = 'q_trial_mua';

update challenges set name = 'Meet RJ Ledesma',
  description = 'Say hi to our celebrity host RJ Ledesma.'
  where id = 'q_celeb_host';

-- Add the matching quests for the secondary suppliers
insert into challenges (id, event_id, type, name, description, store_id, reward_type, reward_value) values
  ('q_try_ring_vaella',  'evt_fiad_dec25', 'booth', 'Try On a Ring at Vaella',
    'Get your ring size measured at Vaella Jewelry.',
    'store_ba17_vaella_jewelry',       'raffle_entries', 1),
  ('q_film_show_8point', 'evt_fiad_dec25', 'booth', '8 Point Studios Film Showing',
    'Watch sample work from 8 Point Studios at the film showing room.',
    'store_38_8pointstudios',          'raffle_entries', 1),
  ('q_trial_mua_sab',    'evt_fiad_dec25', 'booth', 'Trial Make-Up with SAB',
    'Experience a trial make-up with SAB HMUA.',
    'store_15_sab_hmua',               'raffle_entries', 1),
  ('q_celeb_host_dj',    'evt_fiad_dec25', 'booth', 'Meet DJ Adam',
    'Say hi to our celebrity host DJ Adam.',
    'store_07_dj_adam_wish_107_5',     'raffle_entries', 1)
on conflict (id) do nothing;
