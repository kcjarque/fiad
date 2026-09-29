-- Open Season 3: three venue events.
--
-- Season 3 runs at three venues on the SAME two days, March 6-7 2027 --
-- confirmed simultaneous with the client, unlike Season 2 which staggered
-- Brittany (Sep 18-19) and Mella (Sep 19-20). Each venue is its own event, as
-- Season 2's were, so the admin gets a separate registrant list and check-in
-- desk per location and the RSVP funnel maps a chosen venue to its event id.
--
-- Status is 'draft', the pre-registration state Season 2 was in before it
-- launched. The RSVP funnel and the register-guest function read events by id
-- and never check status, so draft events take registrations normally; draft
-- only keeps them out of getActiveEvent's live fallback until the fair opens.
--
-- raffle_rate is 1000: one paid entry per P1,000, the rule the client
-- confirmed during Season 2 (after Mella's was found stored as 100).
-- daily_cap_per_guest_per_store is 100000, Brittany's Season 2 value. Mella's
-- was 5000; the two differ by 20x with no recorded reason, so Brittany's is
-- used as the less restrictive and flagged for the client to confirm. Both are
-- editable from the admin Event tab.
--
-- The date column is day one; day two is derived as date + 1, as for Season 2.
--
-- Season 2 is deliberately left 'live'. issue_entries -- the function that
-- records a booth sale and issues its raffle entries -- refuses any store whose
-- event is not live, so ending Season 2 would block any late Season 2 sale a
-- supplier still needs to record. Whether to close that is the client's call.
--
-- The same check is why Season 3 must be set to 'live' before the doors open
-- on March 6: while it is draft, its booths can register guests but cannot
-- record a sale.

-- Idempotent: on conflict the Season 3 rows are left as they are, so a re-run
-- cannot overwrite details edited in the admin afterwards.

insert into events (id, name, date, venue, raffle_rate, daily_cap_per_guest_per_store, status)
values
  ('evt_fiad_s3_madison', 'FIAD Season 3 · MADISON 101 Hotel', '2027-03-06',
   'MADISON 101 Hotel, Quezon City', 1000, 100000, 'draft'),
  ('evt_fiad_s3_podium', 'FIAD Season 3 · SM Podium', '2027-03-06',
   'SM Podium, Ortigas Center, Mandaluyong City', 1000, 100000, 'draft'),
  ('evt_fiad_s3_eugenio', 'FIAD Season 3 · Eugenio Lopez Center', '2027-03-06',
   'Eugenio Lopez Center, Antipolo, Rizal', 1000, 100000, 'draft')
on conflict (id) do nothing;

