-- Restore Gianna Zafra's passport, lost to the 0063 regression.
--
-- Between 0063 and 0067 today, anon INSERT on passport_stamps was revoked, so
-- every booth scan at Brittany failed from the guest's side. No stamp was
-- written all day: the newest row before this was Sep 15. Nothing is
-- recoverable from the database — the inserts were rejected, never stored — so
-- this re-creates them from what the floor team reported.
--
-- Gianna Zafra (guest_yn86mhxys7ei, access code TLLXYF) completed the whole
-- passport during that window. Stamped for every guest-visible Brittany booth;
-- store_demo2026 is excluded, being the supplier-login test record rather than
-- a real booth.
--
-- Targeted by guest id rather than access code, and the stamp id is derived
-- from guest + store together: an earlier draft keyed the id on store alone,
-- which collided the moment more than one guest was involved.
--
-- Safe to re-run: unique (guest_id, store_id) means a repeat inserts nothing.
--
-- Brittany has no challenges configured, so the passport carries no raffle
-- entries or rewards — this restores her collected record only and confers no
-- advantage in any draw.

insert into passport_stamps (id, guest_id, store_id, event_id, stamped_at)
select
  'stamp_rst_' || substr(md5('guest_yn86mhxys7ei' || s.id), 1, 16),
  'guest_yn86mhxys7ei',
  s.id,
  'evt_fiad_s2_brittany',
  now()
from stores s
where s.event_id = 'evt_fiad_s2_brittany'
  and s.id <> 'store_demo2026'
on conflict (guest_id, store_id) do nothing;
