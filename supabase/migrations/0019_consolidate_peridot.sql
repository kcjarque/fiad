-- Consolidate all Peridot sub-brands into a single "Peridot Studios" account.
-- Keeps the entry that's already named "Peridot Studios" (BI3) with its
-- existing QR token + passcode. Reassigns the references on the prize and
-- activity that pointed at the now-removed sibling entries.

update prizes
  set sponsored_by_store_id = 'store_peridot_photoman'
  where id = 'prize_d1_01';

update walkthrough_items
  set store_id = 'store_peridot_photoman'
  where id = 'wt_act_hanbok';

delete from stores where id = 'store_09_timeless_portraits_peridot_stu'; -- Timeless Portraits Peridot Studios (BA11-14)
delete from stores where id = 'store_peridot_video_guestbook';           -- Peridot Video Guestbook (BI3-B)
