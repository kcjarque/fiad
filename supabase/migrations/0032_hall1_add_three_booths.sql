-- Add Pru Life UK, Metrobank Credit Cards, and Susana Heights to the Hall 1
-- listing per organizer request ("Pa-add na lang din po sa Hall 1").
--
-- They already existed in the stores table but their booth_number values
-- ('Hall 1 F2', 'F4', 'Hall 1 F5') didn't match the H1-* prefix that the
-- Hall 1 group filters on, so they were invisible in the guest UI.
-- Keep their F-numbers for physical-signage continuity, just prefix with H1-
-- so they sort and group correctly.

update stores set booth_number = 'H1-F2' where id = 'store_prulife_uk';
update stores set booth_number = 'H1-F4' where id = 'store_metrobank_cards';
update stores set booth_number = 'H1-F5' where id = 'store_realty_partner';
