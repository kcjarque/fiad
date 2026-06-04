-- Pre-event cleanup pass.
--
-- Adds the missing DELETE policies that migration 0005 never granted to the
-- anon role (same blind spot as migration 0033 for prizes — admin / cleanup
-- DELETE requests have been silently no-op'ing in production until now).
--
-- Then clears all transactional test data accumulated during pre-event sanity
-- checks (52 raffle_entries from 1 test scan, 2 transactions, 8 passport_stamps
-- from 3 test sessions, plus any stale prize winner records). The 351 real
-- guest pre-registrations from the GHL funnel are preserved.
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new

-- (1) Missing DELETE policies for the cleanup
create policy "anon_delete_raffle_entries" on raffle_entries
  for delete to anon using (true);

create policy "anon_delete_transactions" on transactions
  for delete to anon using (true);

create policy "anon_delete_passport_stamps" on passport_stamps
  for delete to anon using (true);

create policy "anon_delete_challenge_completions" on challenge_completions
  for delete to anon using (true);

create policy "anon_delete_override_requests" on override_requests
  for delete to anon using (true);

-- (2) Clear pre-event test data
delete from raffle_entries where true;
delete from transactions where true;
delete from passport_stamps where true;
delete from challenge_completions where true;
delete from override_requests where true;

-- (3) Reset any leftover prize winners (already drawn during test runs)
update prizes
   set winner_guest_id = null,
       drawn_at = null,
       winning_ticket_number = null
 where winner_guest_id is not null;
