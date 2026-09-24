-- Remove leftover test fixtures from guests and event_inquiries.
--
-- These are NOT the bot wave -- that is gone, and 0091 closed the endpoint it
-- came through. A sweep for bots found none remaining and turned these up
-- instead: developer test rows that have sat in the data since May and now
-- show up in every export and guest count.
--
-- Four of the five guests are on reserved domains that can never belong to a
-- real person: example.com (RFC 2606) and the invented fiad.test. The fifth,
-- "test test" <test@gmail.com>, is on a real domain and so is a judgement
-- call rather than a certainty -- but the address is a well-known throwaway
-- nobody owns, and the row is as inert as the rest.
--
-- All five verified inert: no check-in, no entry in the check_ins log, no
-- passport stamp, no transaction, no prize. Each holds only the complimentary
-- ticket the 0047 trigger issues automatically, which cascades on delete.
--
-- Ids listed explicitly rather than matching on "test", which would catch a
-- genuine surname or an address like "protesters@".
--
-- Idempotent: rows already gone are simply not matched.

delete from guests where id in (
  'guest_2cg9fkvk1slx',  -- audit.nocid@example.com
  'guest_gaypi6e9ghgw',  -- Juana Test
  'guest_he2f2c49498s',  -- Test User One (fiad.test)
  'guest_y9rkem7c1qgh',  -- Audit User
  'guest_yf9ki4gc901h'   -- test test <test@gmail.com>
);

delete from event_inquiries where id in (
  'inq_12isgulrk90n',  -- ZZ Test Season2
  'inq_8mndbcv5psvt'   -- ZZ Funnel Test
);
