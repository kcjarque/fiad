-- Per organizer screenshot of the final raffle list:
--   "Wala na po yang Valentine Bouquet"        → delete prize_d2_07
--   "Hotel Buffet GC - wala na rin po yan"     → delete prize_d2_05
--   "Journal package - logo na lang po wala
--    po akong nakitang photo po nila eh"       → use the supplier's logo
--                                                (/Suppliers Carousel FIAD/35.png
--                                                for Invitations by Ten) as
--                                                the prize photo instead of a
--                                                real product photo.
--
-- The position-based draw scheduler will naturally compact the remaining
-- Day-2 prizes upward (Our Wedding Journal moves to 3pm, 100 Placecards to
-- 4pm), so there are no empty hour slots.
--
-- 15 - 2 = 13 prizes remaining. Sir is reviewing 7 more prizes from the
-- spreadsheet (FromPaulyn, Fenrir's Coffee, Kate's, Pru-Life UK, Vaella,
-- Romierre, Riman Korean Skincare) to decide whether to add — a follow-up
-- migration will land those once confirmed.

delete from prizes where id = 'prize_d2_05';
delete from prizes where id = 'prize_d2_07';

update prizes
   set image_url = '/Suppliers%20Carousel%20FIAD/35.png'
 where id = 'prize_d2_04';
