-- Last surface still showing the buffet shot for Luka's Steak: the
-- Passport card (and anywhere else that reads stores.image_url).
-- Re-locked to the same actual-steaks Unsplash photo we already use
-- on the prize (prize_d1_03) and quest (q_lukas_steak).

update stores
   set image_url = 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&auto=format&fit=crop&q=75'
 where id = 'store_ba33_lukas_steak';
