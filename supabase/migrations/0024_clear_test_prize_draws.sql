-- Clear out the test prize draws so the live event starts from scratch.
-- Resets winner / ticket / drawn timestamp on any prize that has been picked
-- during testing.
update prizes
   set winner_guest_id      = null,
       winning_ticket_number = null,
       drawn_at              = null
 where winner_guest_id is not null;
