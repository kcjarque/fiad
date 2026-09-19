-- Reassign the Gift Voucher - Exclusive Ring Discount winner, as directed by
-- the event team.
--
-- prize_eq2x4gxz060q (Brittany, 10pm slot Sep 19)
--   was : Salvacion Padua (DJ3AHQ), ticket FIAD-COMP-9040846
--   now : Nikki Nerona  (6FKPEE), ticket FIAD-COMP-6716925
--
-- This is an operator-directed correction, NOT a draw result — draw_prize was
-- not involved. Recorded here in full because prizes has no audit table, so
-- the migration history is the only trace of who held this prize and why it
-- changed.
--
-- Nikki verified eligible before the change: registered at Brittany, checked
-- in 2026-09-19 11:21 PH, and FIAD-COMP-6716925 is her own entry on this
-- event.
--
-- drawn_at is preserved where already set: the prize was drawn at its slot and
-- only the recorded winner is being corrected, so overwriting the time would
-- misreport when it was awarded.
--
-- Writing winner columns by hand is exactly what 0063 blocks for anon — it is
-- how a raffle gets rigged — so this needs an elevated session by design.
--
-- Idempotent: re-running sets the same values.

update prizes
   set winner_guest_id       = 'guest_ofht14cywv4o',
       winning_ticket_number = 'FIAD-COMP-6716925',
       drawn_at              = coalesce(drawn_at, now())
 where id = 'prize_eq2x4gxz060q';
