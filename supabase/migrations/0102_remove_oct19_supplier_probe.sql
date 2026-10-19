-- Remove the probe application written on Oct 19 while checking why Season 3
-- had no supplier applications three weeks after its intake opened.
--
-- The insert succeeded and landed as Season 3 with its venue, which showed the
-- application path works and the empty intake is real rather than a fault.
-- Having served that purpose, the row must not count as an application.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to a
-- real applicant. Idempotent: rows already gone are simply not matched.

delete from supplier_signups where email like '%@example.invalid';
