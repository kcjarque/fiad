-- Rename "Brittany Mella" → "Brittany and Mella Hotel".
-- Single booth (BA1), QR token and passcode unchanged.
update stores set name = 'Brittany and Mella Hotel'
  where id = 'store_ba01_brittany_mella';
