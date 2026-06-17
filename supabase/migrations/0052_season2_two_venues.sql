-- Season 2 runs at TWO venues on overlapping September 2026 dates. Each venue
-- is its own event so the admin gets a clean, separate registrant list per
-- location (switchable in the admin event switcher). The /rsvp funnel maps the
-- chosen location → its event id.
--
--   Brittany Hotel, BGC      — Sep 18 & 19, 2026
--   Mella Hotel, Las Piñas    — Sep 19 & 20, 2026
--
-- Run in the dashboard SQL editor:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new
insert into events (id, name, date, venue, raffle_rate, daily_cap_per_guest_per_store, status)
values
  ('evt_fiad_s2_brittany', 'FIAD Season 2 · Brittany Hotel BGC',     '2026-09-18', 'Brittany Hotel, BGC',   100, 5000, 'draft'),
  ('evt_fiad_s2_mella',    'FIAD Season 2 · Mella Hotel Las Piñas',  '2026-09-19', 'Mella Hotel, Las Piñas', 100, 5000, 'draft')
on conflict (id) do nothing;
