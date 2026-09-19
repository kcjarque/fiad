-- Second forfeit on the Free Photo Session (prize_nt426s5ls86q).
--
-- 0072 released Sheila Oraye's win on this prize; the redraw landed on
--   Cherrie Florendo <mOley_7a@yahoo.com>, ticket FIAD-COMP-9745479
-- which is being forfeited too. Both are recorded here because prizes has no
-- audit table.
--
-- Worth noting the pattern: this prize has now been drawn twice and forfeited
-- twice, and because these forfeits RELEASE rather than disqualify, every
-- previous winner's ticket is back in the pool and can come up again. If the
-- intent is that a forfeiting guest shouldn't win this prize, that needs
-- handling explicitly — the schema has no concept of a forfeit.
--
-- Idempotent: re-running clears already-clear columns.

update prizes
   set winner_guest_id       = null,
       winning_ticket_number = null,
       drawn_at              = null
 where id = 'prize_nt426s5ls86q';
