-- Move Belle Fête Custom Shoes to the BA21 slot per event ops.
-- QR token / passcode unchanged; the existing booth QR continues to work,
-- it just sits at a different physical booth now.
update stores set booth_number = 'BA21'
  where id = 'store_belle_fete_shoes';
