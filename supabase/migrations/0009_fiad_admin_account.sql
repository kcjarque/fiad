-- Add the production admin account
insert into admins (id, name, email, passcode)
values (
  'adm_fiad',
  'FIAD Admin',
  'admin@fiad.ph',
  'FiadAdmin@123'
)
on conflict (id) do update
  set name     = excluded.name,
      email    = excluded.email,
      passcode = excluded.passcode;
