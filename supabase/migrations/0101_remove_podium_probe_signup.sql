-- Remove the probe application written while verifying the SM Podium
-- Sales Invoice / BIR 2303 requirement.
--
-- Submitted through /suppliers to confirm three things: the venue choice is
-- saved, ticking SM Podium makes the BIR 2303 upload required (a submission
-- without it was refused), and the file is stored apart from the DTI one. It
-- did all three, so the row has served its purpose and must not count as a
-- Season 3 application. Its two uploaded files were removed from storage.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to
-- a real applicant, so this cannot touch a genuine submission.
--
-- Idempotent: rows already gone are simply not matched.

delete from supplier_signups where email like '%@example.invalid';
