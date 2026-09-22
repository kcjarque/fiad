-- Record the IP a registration came from, so the register-guest edge function
-- can rate-limit per source without keeping any state of its own.
--
-- Nullable and unbackfilled: every existing row predates the function and has
-- no IP to attribute. Only the function writes it (service role), so the
-- column is never set from a browser and cannot be spoofed by the client.
--
-- Not granted to anon in either direction. anon keeps its existing column
-- privileges on guests and simply has no access to this one, so the signup
-- source is not readable with the public key.

alter table guests add column if not exists signup_ip text;

create index if not exists guests_signup_ip_recent_idx
  on guests (signup_ip, registered_at desc)
  where signup_ip is not null;
