-- Rename BA1 to "Brittany Hotel BGC" (keep all existing contact/QR/passcode info)
-- and add a separate "Mella Hotel" account with blank info for the team to fill in.
update stores set name = 'Brittany Hotel BGC'
  where id = 'store_ba01_brittany_mella';

insert into stores (id, event_id, name, category, description, logo_url,
                    booth_number, qr_token, passcode)
values (
  'store_mella_hotel', 'evt_fiad_dec25', 'Mella Hotel', 'Hotels & Venues',
  'Venue partner.', 'https://api.dicebear.com/7.x/shapes/svg?seed=MellaHotel',
  'BA1B', 'store-qr-mella-hotel', '7CBCSR'
)
on conflict (id) do nothing;
