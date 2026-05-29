-- Fix prize sponsor attributions to match SUPPLIERS INFORMATION-2.xlsx.
-- These links were null at seed time because the sponsor booths were added
-- later (migration 0012); 100 Placecards was also credited to the wrong vendor.

update prizes set sponsored_by_store_id = 'store_ba33_lukas_steak'     where id = 'prize_d1_03'; -- Frozen Steak -> Luka's Steak
update prizes set sponsored_by_store_id = 'store_ba15_sharons_delight' where id = 'prize_d1_05'; -- Frozen Siomai -> Sharon's Delight
update prizes set sponsored_by_store_id = 'store_belle_fete_shoes'     where id = 'prize_d2_02'; -- Bridal Shoes -> Belle Fete Custom Shoes
update prizes set sponsored_by_store_id = 'store_88ph_multimedia'      where id = 'prize_d2_03'; -- FREENUP -> 88 Powerhouse Multimedia
update prizes set sponsored_by_store_id = 'store_ba01_brittany_mella'  where id = 'prize_d2_05'; -- Hotel Buffet GC -> Brittany/Mella Hotel
update prizes set sponsored_by_store_id = 'store_print8_invitations'   where id = 'prize_d2_08'; -- 100 Placecards -> Print 8 Invitations (was Invitations by Ten)
