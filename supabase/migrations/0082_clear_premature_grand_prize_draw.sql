-- Clear the premature 14K Gold Wedding Ring draw.
--
-- prize_12ix2wychvbk is the Season 2 grand prize, scheduled for Sunday
-- Sep 20 8pm at Mella. It was drawn at 2026-09-18 19:36 PH — Friday evening,
-- two days early, and within the hour the grand-prize flag and cross-venue
-- pool were first configured. Almost certainly a spin while setting it up
-- rather than the real draw.
--
-- The result being cleared:
--   Jamer Yapchulay (WDGSXU) <jameryapchulay27@gmail.com>, Brittany
--   ticket FIAD-2593995 (a PAID entry)
--
-- The draw itself behaved correctly — a paid ticket from a pooled venue is
-- exactly what the grand branch should pick. Only the timing was wrong, so
-- this is cleared rather than corrected, and the prize is drawn properly on
-- Sunday night.
--
-- Releases rather than disqualifies: the grand branch has no past-winner
-- exclusion by design (0048/0049), so FIAD-2593995 is eligible again and
-- Jamer can legitimately win it at the real draw.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_12ix2wychvbk';
