-- Remove the probe rows written while verifying the register-guest function.
--
-- Eight registrations sent against the deployed function to confirm the
-- per-IP rate limit actually trips (it refused the 9th) and that signup_ip is
-- recorded. They are mine, not a guest's, and must not reach the export or
-- any guest count.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to
-- a real address, so this cannot touch a genuine registration.
--
-- Idempotent: rows already gone are simply not matched.

delete from guests where email like '%@example.invalid';
