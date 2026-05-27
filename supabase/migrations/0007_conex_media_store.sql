-- Add Conex Media as a supplier/store account
insert into stores (id, event_id, name, category, description, logo_url, booth_number, qr_token, passcode, email)
values (
  'store_conex_media',
  'evt_fiad_dec25',
  'Conex Media',
  'Media',
  'Official media partner — photography and videography coverage for your special day.',
  'https://api.dicebear.com/7.x/shapes/svg?seed=ConexMedia',
  'CM1',
  'store-qr-conex-media',
  'RVFXFH',
  'kyle@conexmedia.ph'
)
on conflict (id) do nothing;
