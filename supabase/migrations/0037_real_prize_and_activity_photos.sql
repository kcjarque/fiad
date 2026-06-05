-- Wire the supplier-provided photos that Sir uploaded to:
--   public/RAFFLE PRIZES/      → 12 of 15 prize rows
--   public/GUEST EXPERIENCE/   → 7 of 10 activity rows
-- Plus move Harmonic Vibes booth_number BI5 → H1-BI5 so it surfaces in the
-- Hall 1 listing per "yung here sa Hall 1, pa-add po si: Harmonic Vibes".
--
-- Files left unmapped (no matching upload yet, please share):
--   Prizes : Journal Package (d2_04), Hotel Buffet GC (d2_05),
--            Valentine Bouquet (d2_07)
--   Activities: Couple's Bracelet (Craftman's Sheep), Cake Tasting
--              (From Paulyn), Food Tasting (MCatering)
-- Plus a SAB-HMUA / Ellen-Drilon activity row doesn't exist yet — Ellen
-- Drilon photo is uploaded and ready when the row is added.

-- ─── Raffle prize hero images ─────────────────────────────────────────────
update prizes set image_url = '/RAFFLE%20PRIZES/LUKA_S%20STEAK.jpg'                  where id = 'prize_d1_03';
update prizes set image_url = '/RAFFLE%20PRIZES/PERFECT%20CELLARS.jpg'               where id = 'prize_d1_04';
update prizes set image_url = '/RAFFLE%20PRIZES/SHARON_S%20DELIGHT.png'              where id = 'prize_d1_05';
update prizes set image_url = '/RAFFLE%20PRIZES/HEINOAH%20ENTERTAINMENT.jpg'         where id = 'prize_d1_06';
update prizes set image_url = '/RAFFLE%20PRIZES/CRAFTMAN_S%20SHEEP.jpg'              where id = 'prize_d1_07';
update prizes set image_url = '/RAFFLE%20PRIZES/ABCD%20TOTEFUL.png'                  where id = 'prize_d1_08';
update prizes set image_url = '/RAFFLE%20PRIZES/BLOOM%20IN%20PINK%20FLOWER%20BAR.jpg' where id = 'prize_d2_01';
update prizes set image_url = '/RAFFLE%20PRIZES/BELLE%20FETE%20CUSTOM%20SHOES.jpg'   where id = 'prize_d2_02';
update prizes set image_url = '/RAFFLE%20PRIZES/88%20POWERHOUSE%20EVENTS.jpg'        where id = 'prize_d2_03';
update prizes set image_url = '/RAFFLE%20PRIZES/AJT%20EVENTS%20MANAGEMENT.png'       where id = 'prize_d2_06';
update prizes set image_url = '/RAFFLE%20PRIZES/PRINT%208.png'                       where id = 'prize_d2_08';
update prizes set image_url = '/RAFFLE%20PRIZES/ROMIERRE%20JEWELRY.png'              where id = 'prize_grand';

-- ─── Guest-experience activity images ────────────────────────────────────
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/Timeless%20Portraits%20Peridot%20Studios.png' where id = 'wt_act_hanbok';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/RIMAN%20SKINCARE.jpg'         where id = 'wt_act_riman';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/HEINOAH%20ENTERTAINMENT.jpg'  where id = 'wt_act_claw';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/8%20POINT%20STUDIOS.jpg'      where id = 'wt_act_photobooth';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/EMIL%20OCAMPO.jpg'            where id = 'wt_act_gown';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/PERMALA.jpg'                  where id = 'wt_act_film';
update walkthrough_items set image_url = '/GUEST%20EXPERIENCE/ROMIERRE%20JEWELRY.jpg'       where id = 'wt_act_ringsize';

-- ─── Hall 1 list — surface Harmonic Vibes ────────────────────────────────
update stores set booth_number = 'H1-BI5' where id = 'store_harmonic_vibes';
