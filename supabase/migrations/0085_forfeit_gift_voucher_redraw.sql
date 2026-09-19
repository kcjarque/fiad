-- Forfeit the drawn Gift Voucher so it can be redrawn.
--
-- prize_wjy9lg95krbr (Brittany, 5pm slot Sep 19) had been drawn to:
--   Juliana Rodriguez (HD721Y), ticket FIAD-COMP-5217928
-- Recorded here because prizes has no audit table.
--
-- The other two vouchers are untouched: prize_lt7z5n0yk3jc (Sep 18, Marie
-- Stephanie De Leon) and prize_eq2x4gxz060q, the Exclusive Ring Discount
-- reassigned to Nikki Nerona in 0074.
--
-- Releases rather than disqualifies, per the standing decision.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_wjy9lg95krbr';
