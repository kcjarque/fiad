-- Event ops batch (page 1/2/3 cleanup pass):
--   • Remove 88 Powerhouse Multimedia (BA21B) — already covered by other 88PH
--   • Rename Real Estate → Susana Heights; F5 → "Hall 1 F5"
--   • Pru Life UK: F2 → "Hall 1 F2"
--   • Conex Media: CM1 → "Concierge"
--   • Weddings at Work (W@W): H1-48 → BA11
--   • Split Manila Yacht Cruises ↔ Legworks into two separate booths

delete from stores where id = 'store_88ph_multimedia';

update stores set name = 'Susana Heights', booth_number = 'Hall 1 F5'
  where id = 'store_realty_partner';

update stores set booth_number = 'Hall 1 F2'
  where id = 'store_prulife_uk';

update stores set booth_number = 'Concierge'
  where id = 'store_conex_media';

update stores set booth_number = 'BA11'
  where id = 'store_48_weddings_at_work_w_w';

-- Legworks shares contact info with Manila Yacht Cruises but is its own
-- account / category. Passcode is set inline below (rotate before live if needed).
insert into stores (id, event_id, name, category, description, logo_url,
                    booth_number, qr_token, passcode, email, contact, social_media)
select 'store_legworks_events', 'evt_fiad_dec25',
       'Legworks Events Management & Consultancy',
       'Event Stylists & Florists',
       'Event styling and full-service event management for weddings and debuts.',
       'https://graph.facebook.com/legworksevents/picture?width=720&height=720',
       'BA24B', 'store-qr-legworks-events', '3TYQXM',
       email, contact, 'https://www.facebook.com/legworksevents'
  from stores where id = 'store_42_manila_yacht_cruises'
on conflict (id) do nothing;
