-- Forfeit the drawn Gift Certificate - Free Photo Session so it can be redrawn.
--
-- prize_nt426s5ls86q (Brittany, 10pm slot Sep 18) had been drawn to:
--   Sheila Oraye <sheila031579@gmail.com>, ticket FIAD-COMP-7931011
-- Recorded here because prizes has no audit table, so clearing the row is
-- otherwise untraceable.
--
-- Needs a migration because 0063 narrowed anon's UPDATE on prizes to the
-- admin-editable columns; the winner columns are writable only by draw_prize
-- (SECURITY DEFINER) or an elevated session.
--
-- Releases rather than disqualifies, as with 0066 and 0071: the hourly branch
-- reads its no-double-winner exclusion from prizes.winning_ticket_number, so
-- clearing this returns FIAD-COMP-7931011 to the eligible pool.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_nt426s5ls86q';
