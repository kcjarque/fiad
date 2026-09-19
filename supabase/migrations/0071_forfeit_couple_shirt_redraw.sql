-- Forfeit the drawn Couple Shirt so it can be redrawn.
--
-- prize_pd2cy1zgfure (Brittany, 12nn slot Sep 19) had been drawn to:
--   Juneth Estrella <junethestrella05@gmail.com>, ticket FIAD-COMP-9508017
-- Recorded here because prizes has no audit table, so clearing the row is
-- otherwise untraceable.
--
-- Needs a migration because 0063 narrowed anon's UPDATE on prizes to the
-- admin-editable columns; winner_guest_id, winning_ticket_number and drawn_at
-- are writable only by draw_prize (SECURITY DEFINER) or an elevated session.
--
-- As with 0066, this RELEASES rather than disqualifies: the hourly branch
-- reads its no-double-winner exclusion from prizes.winning_ticket_number, so
-- clearing this row returns FIAD-COMP-9508017 to the eligible pool and the
-- same ticket can come up again.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_pd2cy1zgfure';
