-- Correct Mella's raffle rate, and restore the amount 0079 wrongly reduced.
--
-- Mella was configured at P100 per entry while Brittany and Season 1 both use
-- P1000. The organiser confirms P1000 is the real rate, so Mella's row was
-- simply entered with a zero missing — and issue_entries reads the rate from
-- the event, so every Mella purchase was issuing ten times the entries it
-- should.
--
-- That is what produced Lloyd Mundin's 1,355 entries. P135,550 was the correct
-- receipt all along:
--     P135,550 / P1,000 = 135 entries   <- what the booth screen showed
--     P135,550 / P100   = 1,355 entries <- what the misconfigured rate issued
--
-- 0079 assumed the P100 rate was right and "corrected" the amount down to
-- P13,500 to match 135 entries. The entry count was right; the amount was not.
-- Restored here to the true receipt figure. His 135 entry rows are already
-- correct and are left untouched — 135,550 / 1,000 still floors to 135.
--
-- Only one Mella transaction exists, so nothing else needs restating. The five
-- Brittany transactions were always at P1000 and are unaffected.
--
-- NOTE: daily_cap_per_guest_per_store is left alone. Mella's P5,000 against
-- Brittany's P100,000 looks like the same missing zero, and at a P1000 rate it
-- caps a guest at 5 entries per booth per day — but changing a cap mid-event
-- changes which purchases need an override, so that is the organiser's call.
--
-- Idempotent: re-running sets the same values.

update events
   set raffle_rate = 1000
 where id = 'evt_fiad_s2_mella';

update transactions
   set amount = 135550
 where id = 'tx_93dea33e93cd4124bd8bf990c5c827a0';
