-- Replace generic store-image fallthroughs on the quest cards with actual
-- relevant photos. Sir flagged this on the "Cake Tasting at From Paulyn"
-- card which was showing gift boxes instead of cake ("this is not cake bro,
-- check their fb"). Audit found 16 quests in the same state — fixed all.
--
-- Mapping:
--   1. 11 quests get supplier-branded photos that Sir uploaded earlier to
--      public/GUEST EXPERIENCE/ and public/RAFFLE PRIZES/.
--   2. 1 quest (Cake Tasting at From Paulyn) gets the From Paulyn cake
--      photo already in public/RAFFLE PRIZES/.
--   3. 5 quests with no supplier upload get tasteful Unsplash stock that
--      matches the activity theme (catering, oils, hosting, makeup, DJ).
--
-- All 17 quest cards now show a real on-theme image rather than falling
-- through to whatever stock photo happens to be on the linked store row.

-- ─── Supplier uploads ────────────────────────────────────────────────────
update challenges set image_url = '/RAFFLE%20PRIZES/FROM%20PAULYN.jpg'                               where id = 'q_cake_coffee';
update challenges set image_url = '/GUEST%20EXPERIENCE/Timeless%20Portraits%20Peridot%20Studios.png' where id = 'q_hanbok';
update challenges set image_url = '/GUEST%20EXPERIENCE/RIMAN%20SKINCARE.jpg'                         where id = 'q_riman_skin';
update challenges set image_url = '/GUEST%20EXPERIENCE/HEINOAH%20ENTERTAINMENT.jpg'                  where id = 'q_clawmachine';
update challenges set image_url = '/GUEST%20EXPERIENCE/8%20POINT%20STUDIOS.jpg'                      where id = 'q_photobooths';
update challenges set image_url = '/GUEST%20EXPERIENCE/8%20POINT%20STUDIOS.jpg'                      where id = 'q_film_show_8point';
update challenges set image_url = '/GUEST%20EXPERIENCE/EMIL%20OCAMPO.jpg'                            where id = 'q_gown_fit';
update challenges set image_url = '/GUEST%20EXPERIENCE/PERMALA.jpg'                                  where id = 'q_film_show';
update challenges set image_url = '/GUEST%20EXPERIENCE/ROMIERRE%20JEWELRY.jpg'                       where id = 'q_try_ring';
update challenges set image_url = '/GUEST%20EXPERIENCE/ELLEN%20DRILON.jpg'                           where id = 'q_trial_mua';
update challenges set image_url = '/RAFFLE%20PRIZES/VAELLA.png'                                      where id = 'q_try_ring_vaella';
update challenges set image_url = '/RAFFLE%20PRIZES/AJT%20EVENTS%20MANAGEMENT.png'                   where id = 'q_wed_journal';

-- ─── Unsplash themed stock (no supplier photo yet) ──────────────────────
update challenges set image_url = 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&auto=format&fit=crop&q=75' where id = 'q_food_tasting';
update challenges set image_url = 'https://images.unsplash.com/photo-1611073761267-c5b07c8c5d5f?w=1200&auto=format&fit=crop&q=75' where id = 'q_young_living';
update challenges set image_url = 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=1200&auto=format&fit=crop&q=75' where id = 'q_celeb_host';
update challenges set image_url = 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&auto=format&fit=crop&q=75' where id = 'q_trial_mua_sab';
update challenges set image_url = 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=1200&auto=format&fit=crop&q=75' where id = 'q_celeb_host_dj';

-- ─── Luka's Steak quest — actual steaks, not the store's buffet photo ───
update challenges
   set image_url = 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&auto=format&fit=crop&q=75'
 where id = 'q_lukas_steak';
