-- Remove the probe application submitted while verifying the Season 3 intake.
--
-- One end-to-end submission through the public /suppliers form, to confirm a
-- new application is tagged Season 3 rather than inheriting Season 2 or
-- landing untagged. It was, so the row has served its purpose and must not
-- reach the Season 3 pipeline or any count.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to
-- a real applicant, so this cannot touch a genuine submission.
--
-- Idempotent: rows already gone are simply not matched.

delete from supplier_signups where email like '%@example.invalid';
