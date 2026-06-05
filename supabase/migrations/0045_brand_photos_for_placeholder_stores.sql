-- Four stores still had image_url = null + logo_url pointing at a
-- DiceBear shape placeholder. Result: the Passport card showed a flat
-- gray pattern instead of a photo of the brand ("find photos online for
-- this!!!!"). All Unsplash URLs were HEAD-checked 200 before applying.
--
-- Picks were eyeballed against each brand's category:
--   Susana Heights   (Real Estate)          → modern white house with pool
--   Harmonic Vibes   (Music & Entertainment)→ violinists in a string ensemble
--   Tiger Shoes      (Gowns & Custom Shoes) → bespoke floral stiletto heels
--   Conex Media      (Others / media)       → photographer on a mountain

update stores set image_url = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=75' where id = 'store_realty_partner';
update stores set image_url = 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=75' where id = 'store_harmonic_vibes';
update stores set image_url = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1200&auto=format&fit=crop&q=75' where id = 'store_tiger_shoes';
update stores set image_url = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=75' where id = 'store_conex_media';
