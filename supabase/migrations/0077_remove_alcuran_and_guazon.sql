-- Remove two registrants at the organiser's request (Sep 19, Mella floor).
--
-- Done as a migration because 0063 revoked `delete on guests from anon`, so
-- the admin Guests screen now fails with "permission denied for table guests".
-- That revoke is deliberate and stays — restoring the button needs the
-- SECURITY DEFINER + real-auth work 0063 names as the next step, which is not
-- something to land mid-event.
--
-- Verified against production before writing this (Sep 19, 2026):
--
--   guest_xnwla8zj44qj  Vincent Jerico Alcuran  vincentjericoalcuran@gmail.com
--     event evt_fiad_s2_mella · registered 2026-09-19 02:11 · checked in 02:12
--     1 raffle entry (the complimentary ticket from the 0047 trigger)
--     0 transactions · 0 passport stamps · 0 challenge completions
--
--   CA Guazon (tinanne.guazon@gmail.com) holds one row per event. The
--   organiser asked for all three, having been shown what each one carries:
--
--   guest_g8jkilyaxcwf  event evt_fiad_dec25 (Season 1, archived)
--     registered 2026-05-27 · never checked in
--     1 raffle entry · 0 transactions · 0 stamps · 0 completions
--
--   guest_hg77wqudj4jq  event evt_fiad_s2_mella
--     registered 2026-06-20 · CHECKED IN 2026-09-09 06:35
--     1 raffle entry · 1 PASSPORT STAMP · 0 transactions · 0 completions
--     ^ a real attendance record: this check-in and stamp go with it.
--
--   guest_3otoz21ieay6  event evt_fiad_s2_brittany
--     registered 2026-09-17 · never checked in
--     1 raffle entry · 0 transactions · 0 stamps · 0 completions
--
-- Deleting a guest cascades to their raffle entries, transactions and
-- passport stamps (0001 foreign keys are `on delete cascade`), so the four
-- complimentary entries and the one stamp above go with these rows. Verified
-- that none of the four is set as a prize's winner_guest_id, so no draw result
-- is disturbed; that column is `on delete set null` rather than cascade, so
-- even a missed winner would orphan the prize rather than delete it.
--
-- Idempotent: rows already gone are simply not matched.
--
-- Run in the dashboard SQL editor:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new

delete from guests where id in (
  'guest_xnwla8zj44qj',  -- Vincent Jerico Alcuran · Mella
  'guest_g8jkilyaxcwf',  -- CA Guazon · Season 1
  'guest_hg77wqudj4jq',  -- CA Guazon · Mella (checked in, 1 stamp)
  'guest_3otoz21ieay6'   -- CA Guazon · Brittany
);
