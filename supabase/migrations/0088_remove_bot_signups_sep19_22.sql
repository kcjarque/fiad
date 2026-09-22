-- Remove the Sep 19-22 wave of bot signups from the Brittany event.
--
-- 42 rows, all Brittany, matching the same random-string name signature that
-- has characterised this wave since Sep 12: two all-letter tokens of 10+
-- characters with capitals scattered through them, on Gmail dot-trick
-- addresses. 0062 cleared 100, 0065 one, 0070 twenty-two; these arrived after.
-- Two landed today, so the wave is still running.
--
-- Every row verified inert before deletion: none checked in, none in the
-- check_ins log, none with a transaction, none with a passport stamp, none
-- holding a prize. Each has exactly one raffle entry and it is the
-- complimentary ticket auto-issued by the 0047 trigger (is_complimentary,
-- transaction_id null) -- not a bought entry. A real attendee at a fair that
-- has now finished would have left at least one other trace.
--
-- Deliberately NOT matched on a name pattern at delete time: several genuine
-- guests have Gmail addresses with two or more dots, and a pattern evaluated
-- against future data could catch a real person. Ids are listed explicitly so
-- this removes exactly the rows that were reviewed and nothing else.
--
-- Deleting a guest cascades to raffle_entries (42 complimentary tickets).
--
-- Idempotent: rows already gone are simply not matched.
--
-- NOTE: cleanup, not a fix. The signup forms still have no captcha, so the
-- wave resumes until one is in place.

delete from guests where id in (
  'guest_01ea2t4qtgll',
  'guest_136fjmt3zg3f',
  'guest_186ofbghkpfq',
  'guest_1981op2n7mb8',
  'guest_1mzt8fmjh2hz',
  'guest_4i0kwkdkiexm',
  'guest_5dg48dacjtif',
  'guest_5hg9pjnderz9',
  'guest_6m9w2o6jj9u3',
  'guest_6vhtsf8ik4iy',
  'guest_707az56g71x6',
  'guest_70wegj3fhu34',
  'guest_7mi3i6dmyt87',
  'guest_7zmq9ff1ng1p',
  'guest_a5u80u004fal',
  'guest_ab98i0igypn5',
  'guest_adssavsvukyb',
  'guest_b7fkd2ee8ch7',
  'guest_bq534pjabgo3',
  'guest_dln7zyjvob6q',
  'guest_e8s5806jmy6j',
  'guest_g4cf8jev3n56',
  'guest_gl57wl71tyn4',
  'guest_i42nu3w892cu',
  'guest_jdqryvjf9k2q',
  'guest_l60wt8y4ut6p',
  'guest_msif9eqrgett',
  'guest_r17owk4l1kd9',
  'guest_scww6gsyrtpk',
  'guest_soycrb1bkdsk',
  'guest_srz7ngud7ror',
  'guest_swe11oenpdns',
  'guest_tf3a7l469sni',
  'guest_u3nlzv8gli48',
  'guest_ulqs7stpsh8h',
  'guest_vrjqwhe5f347',
  'guest_wvfvrdu9gsaq',
  'guest_x0p406yash5k',
  'guest_xdfsk4f2p92w',
  'guest_xgvbjvbbz4xj',
  'guest_z039ept9f693',
  'guest_zifdb8s5orty'
);
