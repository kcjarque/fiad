-- Remove the Sep 18 wave of bot signups from the Brittany event.
--
-- 22 rows, all Brittany, all registered Sep 18, all matching the random-string
-- name signature that has characterised this wave since Sep 12. /rsvp and
-- /app/register still have no captcha or rate limit and anon can insert into
-- guests, so these keep arriving; 0062 cleared 100 and 0065 cleared one.
--
-- Every row verified inert before deletion: none checked in, none with a
-- transaction, none with a passport stamp. A real attendee at a running event
-- would have left at least one of those traces.
--
-- Ids listed explicitly rather than re-deriving a name pattern at delete time,
-- so this removes exactly the rows that were checked. Deleting a guest
-- cascades to their complimentary raffle entry.
--
-- Idempotent: rows already gone are simply not matched.

delete from guests where id in (
  'guest_3uw509jow8k8',
  'guest_5lckrgazuxnp',
  'guest_5vnxrzgy99z0',
  'guest_83aafm0ofjta',
  'guest_a7quqovg4xpl',
  'guest_arqdpmu2w3es',
  'guest_b53kr9njyely',
  'guest_blhkmbjj2666',
  'guest_etrir7ejo761',
  'guest_fjkodzeblhu8',
  'guest_g05bjtibuk2l',
  'guest_ih8y6tmzo4mt',
  'guest_jq4cxyzp0n2c',
  'guest_llaxshmk3ald',
  'guest_n6o4z6aaq5lz',
  'guest_on5a9q69d9np',
  'guest_qjnj0e1qnu1x',
  'guest_tq5ubml2peht',
  'guest_wit8zrwutj9n',
  'guest_wjpknsf6aogc',
  'guest_xpribabfytuc',
  'guest_xxhpjnpms4wc'
);
