-- Correct a mistyped guest email: marbie.gloirioso@ -> marbie.glorioso@.
--
-- The address was keyed with the "i" and "r" transposed in the surname at
-- registration. It matters beyond cosmetics: guest sign-in matches on the
-- stored address (findGuestByEmail / the guest-login edge function both do a
-- case-insensitive exact match), so while the typo stands she cannot sign in
-- with her real address, and any Email Marketing send goes to an inbox that
-- does not exist.
--
-- Matched on the exact typo'd string rather than a guest id so the statement
-- is self-describing, and lower() so a differently-cased copy is still caught.
-- guests.email carries no unique constraint (only the non-unique
-- guests_email_lower_idx), so this cannot collide with an existing row.
--
-- Idempotent: once corrected the where clause matches nothing, so re-running
-- is a no-op. It can never touch another guest — the predicate is the one
-- misspelt address.

update guests
   set email = 'marbie.glorioso@gmail.com'
 where lower(email) = 'marbie.gloirioso@gmail.com';
