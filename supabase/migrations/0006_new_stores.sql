-- Add suppliers that appear on the physical floor plan but were missing from the DB.

insert into stores (id, event_id, name, category, description, logo_url, image_url, booth_number, qr_token, passcode) values
  ('store_ba01_brittany_mella',  'evt_fiad_dec25', 'Brittany Mella',    'Venue',
   'Premier event venue of Brittany Hotel BGC — offering bridal, debut, and reception packages.',
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=70',
   'BA1', 'store-qr-ba01-mella', '1234'),

  ('store_ba06_love_hues',       'evt_fiad_dec25', 'Love Hues',         'Souvenir-Flower Bar',
   'Visit this booth at the event!',
   'https://images.unsplash.com/photo-1509610973147-232dfea52a97?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1509610973147-232dfea52a97?w=800&auto=format&fit=crop&q=70',
   'BA6', 'store-qr-ba06-lovehues', '1234'),

  ('store_ba15_sharons_delight', 'evt_fiad_dec25', 'Sharon''s Delight', 'Food Station-Carchutterie',
   'Visit this booth at the event!',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=70',
   'BA15', 'store-qr-ba15-sharons', '1234'),

  ('store_ba17_vaella_jewelry',  'evt_fiad_dec25', 'Vaella Jewelry',    'Jeweler',
   'Fine jewelry for your most memorable moments — engagement rings, bridal accessories, and gifts.',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=70',
   'BA17', 'store-qr-ba17-vaella', '1234'),

  ('store_ba21_tyron_an_couture','evt_fiad_dec25', 'Tyron An Couture',  'Gowns-Couture',
   'Couture gown atelier crafting bespoke bridal and debut creations that make a lasting impression.',
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=800&auto=format&fit=crop&q=70',
   'BA21', 'store-qr-ba21-tyron', '1234'),

  ('store_ba31_from_paulyn',     'evt_fiad_dec25', 'From Paulyn',       'Souvenirs',
   'Visit this booth at the event!',
   'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&auto=format&fit=crop&q=70',
   'BA31', 'store-qr-ba31-paulyn', '1234'),

  ('store_ba33_lukas_steak',     'evt_fiad_dec25', 'Luka''s Steak',     'Food Station-Carchutterie',
   'Premium specialty steak station — beautifully plated cuts served fresh at the event.',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=160&auto=format&fit=crop&q=70',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=70',
   'BA33', 'store-qr-ba33-lukas', '1234')

on conflict (id) do nothing;
