-- Remove the probe registration written while verifying the Season 3 RSVP.
--
-- One submission through /rsvp choosing SM Podium, Day 2, to confirm a
-- registration lands on the Season 3 event the guest picked rather than on a
-- Season 2 one. It landed on evt_fiad_s3_podium with preferred_day day2, so it
-- has served its purpose and must not count toward Season 3's registrants.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to
-- a real guest, so this cannot touch a genuine registration. The row's
-- complimentary raffle ticket cascades with it.
--
-- Idempotent: rows already gone are simply not matched.

delete from guests where email like '%@example.invalid';
