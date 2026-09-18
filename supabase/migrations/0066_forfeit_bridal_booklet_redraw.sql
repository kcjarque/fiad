-- Forfeit the drawn Bridal Booklet so it can be redrawn.
--
-- prize_8inn46a80rvc (Brittany, 2pm slot) had been drawn to:
--   Irish Sayo <irishmhaesayo9@gmail.com>, ticket FIAD-COMP-4301097
-- Recorded here because clearing the row is otherwise untraceable — there is
-- no audit table on prizes.
--
-- Done as a migration because 0063 narrowed anon's UPDATE on prizes to the
-- admin-editable columns; winner_guest_id, winning_ticket_number and drawn_at
-- can only be written by draw_prize (SECURITY DEFINER) or by an elevated
-- session like this one. That restriction is deliberate — writing a winner by
-- hand from a browser is how a raffle gets rigged.
--
-- NOTE: the hourly branch of draw_prize excludes tickets that already won in
-- the same event, and it reads that exclusion from prizes.winning_ticket_number.
-- Clearing this row therefore returns FIAD-COMP-4301097 to the eligible pool,
-- so the same ticket can be drawn again. If the forfeit is meant to disqualify
-- rather than merely release, that needs handling separately.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_8inn46a80rvc';
