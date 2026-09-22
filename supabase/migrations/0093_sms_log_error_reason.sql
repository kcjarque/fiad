-- Record WHY an SMS failed.
--
-- sms_log stored only status, so when blast_0918 failed 731 of 731 on Sep 18
-- there was nothing to diagnose it with: the gateway's response was computed
-- in sendSms and then thrown away. The failure window (01:00-01:42, with
-- blast_dayof_all sending 910 fine at 04:44 the same morning) had to be
-- reconstructed from timestamps alone.
--
-- Nullable and unbackfilled -- the reason for those 731 is genuinely lost,
-- and inventing one would be worse than leaving it empty.

alter table sms_log add column if not exists error text;
