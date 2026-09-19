-- Second forfeit on the Customed Bridal Shoes (prize_5ytpql63el2x, Brittany).
--
-- 0081 released Michelle Arias's win; the redraw at 13:28 PH landed on
--   Marinella Ibasco (3Y2JWV) <ibascomarinella@gmail.com>
--   ticket FIAD-COMP-6590867
-- which is being forfeited too. Both winners are recorded across the two
-- migrations because prizes has no audit table.
--
-- Releasing again, per the standing decision on forfeits — so both previous
-- winners stay in the pool and either can come up once more. This prize has
-- now been drawn and forfeited twice; at 34 eligible tickets a repeat is
-- roughly a 1-in-17 chance per spin across the two of them.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_5ytpql63el2x';
