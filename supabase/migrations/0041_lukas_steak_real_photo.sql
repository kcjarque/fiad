-- Swap Luka's Steak prize photo from the supplier-logo upload
-- (RAFFLE PRIZES/LUKA_S STEAK.jpg) to an actual photo of cooked
-- steaks per Sir's request ("change photo of luka's steak to
-- actual steaks").

update prizes
   set image_url = 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&auto=format&fit=crop&q=75'
 where id = 'prize_d1_03';
