-- Close the open registration endpoint.
--
-- DO NOT APPLY until the register-guest edge function is deployed AND
-- TURNSTILE_SECRET_KEY is set on it. This revoke is the switch that makes the
-- captcha real; applied early it takes registration down.
--
-- Until now anon could INSERT into guests directly, which is how every bot
-- wave got in (0062: 100 rows, 0065: 1, 0070: 22, 0088: 42). A captcha on the
-- form could not have stopped any of them -- the form is not the only door,
-- and PostgREST accepts the same insert with a curl one-liner.
--
-- Registration now goes through the register-guest function, which runs as the
-- service role and is unaffected by this revoke. So are the ghl-webhook and
-- staff functions, and every admin tool, which all use the service role too.
--
-- SELECT and UPDATE are deliberately untouched: guest sign-in, the QR lookup
-- and check-in all read and write guests with the public key.

revoke insert on guests from anon;
