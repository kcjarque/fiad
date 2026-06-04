-- Two things in one migration:
--
-- (1) Add the missing RLS policies for INSERT and DELETE on prizes. Migration
--     0005_enable_rls.sql only granted SELECT + UPDATE to the anon role, which
--     means the admin app's "Add Prize" and "Delete prize" buttons (in
--     src/pages/admin/AdminPrizes.tsx) have been silently no-ops in production
--     — the requests succeed (HTTP 200) but RLS filters out every row before
--     the operation lands. Migration 0010_admin_update_policies.sql added the
--     same policies for stores / challenges / walkthrough_items but missed
--     prizes.
--
-- (2) Remove the "Seat Arrangement Stationery Set" prize (prize_d1_01) from
--     Peridot Studios per organizer message ("Paremove na lang daw po yung
--     raffle prize kay Peridot Studios na Seat Arrangement kasi mahal daw po
--     yun"). Clear the test-draw winner record first so the DELETE doesn't
--     trip a FK constraint on the winner.

-- (1) Missing prize policies
create policy "anon_insert_prizes" on prizes
  for insert to anon with check (true);

create policy "anon_delete_prizes" on prizes
  for delete to anon using (true);

-- (2) Clear the test-draw winner record, then remove the prize.
update prizes
   set winner_guest_id = null,
       drawn_at = null,
       winning_ticket_number = null
 where id = 'prize_d1_01';

delete from prizes where id = 'prize_d1_01';
