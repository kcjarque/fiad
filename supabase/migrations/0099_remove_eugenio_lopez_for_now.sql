-- Take the Eugenio Lopez Center off Season 3 for now, at the client's request.
--
-- Its event row (0097) is removed so it disappears from the public raffle
-- schedule, which lists every upcoming live or draft event as a venue tab, and
-- from the admin event switcher. The RSVP funnel and supplier page read their
-- venues from CURRENT_SEASON_VENUES, where the entry is commented out rather
-- than deleted, so the details survive for when it returns.
--
-- Safe to delete: verified that nothing references it -- zero guests, prizes,
-- stores, transactions, check-ins and raffle entries.
--
-- To restore, uncomment the entry in src/constants/season.ts and run:
--
--   insert into events (id, name, date, venue, raffle_rate,
--                       daily_cap_per_guest_per_store, status)
--   values ('evt_fiad_s3_eugenio', 'FIAD Season 3 · Eugenio Lopez Center',
--           '2027-03-06', 'Eugenio Lopez Center, Antipolo, Rizal',
--           1000, 100000, 'draft')
--   on conflict (id) do nothing;
--
-- The guard below makes this refuse rather than cascade if anything has been
-- attached to the venue since that check.

do $$
begin
  if exists (select 1 from guests   where event_id = 'evt_fiad_s3_eugenio')
  or exists (select 1 from prizes   where event_id = 'evt_fiad_s3_eugenio')
  or exists (select 1 from stores   where event_id = 'evt_fiad_s3_eugenio')
  then
    raise exception 'evt_fiad_s3_eugenio has data attached; not removing it';
  end if;
  delete from events where id = 'evt_fiad_s3_eugenio';
end $$;
