-- Schedule tab: replace the single fallback "wedding banquet" photo
-- (every row was using it because image_url was null) with on-theme
-- Unsplash images per item. All URLs were verified HTTP 200 before
-- this migration was committed.

update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_1'; -- ribbon cutting
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_2'; -- gates / entrance
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_3'; -- activities (skincare)
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_4'; -- wine pairing
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_5'; -- fashion show
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d1_6'; -- band performance
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_1'; -- doors open
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_2'; -- activities
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_3'; -- book signing
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_4'; -- wine & spirits
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_5'; -- awards
update walkthrough_items set image_url = 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=75' where id = 'wt_sch_d2_6'; -- wedding rings
