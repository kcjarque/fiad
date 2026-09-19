-- Forfeit the drawn Customed Bridal Shoes so it can be redrawn.
--
-- prize_5ytpql63el2x (Brittany, 8pm slot Sep 19) had been drawn to:
--   Michelle Arias (JPEOXU) <mvmarias@yahoo.com>, ticket FIAD-COMP-1964017
-- Recorded here because prizes has no audit table.
--
-- Only this one is cleared. The Mella Customed Bridal Shoes (prize_s2_m2_16,
-- Sunday 4pm) is still undrawn, and the Season-1 pair (prize_d2_02, June) is
-- long settled — neither is touched.
--
-- Releases rather than disqualifies, as with 0066, 0071, 0072 and 0073: the
-- hourly branch reads its no-double-winner exclusion from
-- prizes.winning_ticket_number, so clearing this returns FIAD-COMP-1964017 to
-- the eligible pool.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_5ytpql63el2x';
