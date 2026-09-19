-- Move George II Ortha's win from the Bridal Booklet to a Relationship
-- Planner, and return the Bridal Booklet to the pool.
--
--   was : prize_s2_m1_12  Bridal Booklet        (Mella, Sat 12nn)
--   now : prize_s2_m1_11  Relationship Planner  (Mella, Sat 11am)
--   guest_ecxfch5npmtc  George II Ortha (VJO4IK), ticket FIAD-COMP-5244376
--
-- His ticket carries across unchanged, so he keeps the win and only the prize
-- differs. Recorded here because prizes has no audit table.
--
-- The 11am slot was chosen because it had already passed undrawn: assigning
-- him there consumes no upcoming draw, whereas taking a later Relationship
-- Planner would quietly cancel a slot still to come. Several other
-- Relationship Planners remain undrawn if a different slot is preferred.
--
-- The Bridal Booklet is cleared, so it is redrawable at its slot. As with the
-- other forfeits this RELEASES rather than disqualifies — but note his ticket
-- stays excluded from further Mella hourly draws anyway, since the hourly
-- branch skips tickets already recorded as winners, and he now holds the
-- Relationship Planner.
--
-- Operator-directed correction, not a draw result: draw_prize was not
-- involved. Writing winner columns by hand is what 0063 blocks for anon, so
-- this needs an elevated session by design.
--
-- Idempotent: re-running sets the same values.

update prizes
   set winner_guest_id       = 'guest_ecxfch5npmtc',
       winning_ticket_number = 'FIAD-COMP-5244376',
       drawn_at              = coalesce(drawn_at, now())
 where id = 'prize_s2_m1_11';

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_s2_m1_12';
