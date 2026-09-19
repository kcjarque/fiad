-- Correct an over-stated booth transaction for Lloyd Mundin (ZK37BI).
--
-- guest_rx6p11u9c5v0, Mella. A booth recorded P135,550, which at Mella's
-- P100-per-entry rate issued 1,355 paid entries. The organiser reports the
-- amount was keyed wrong and the correct figure is 135 entries.
--
-- Trimmed to 135 paid entries and the transaction restated to match. P13,500
-- is 135 entries at the event's own rate, so the amount and the entry count
-- stay consistent — if the real receipt was a different figure that still
-- floors to 135 (P13,500-P13,599), say so and this can be restated again.
--
-- Verified before running: none of his 1,356 tickets had won any of the 40
-- prizes drawn so far, so no result is disturbed. The complimentary entry
-- issued at registration is left alone — it isn't part of the transaction.
--
-- The 135 kept are the earliest by id, so the choice is deterministic rather
-- than whatever order the planner returns.
--
-- Idempotent: re-running keeps the same 135 and deletes nothing.

with keep as (
  select id
    from raffle_entries
   where guest_id = 'guest_rx6p11u9c5v0'
     and is_complimentary = false
   order by id
   limit 135
)
delete from raffle_entries
 where guest_id = 'guest_rx6p11u9c5v0'
   and is_complimentary = false
   and id not in (select id from keep);

update transactions
   set amount         = 13500,
       entries_issued = 135
 where id = 'tx_93dea33e93cd4124bd8bf990c5c827a0';
