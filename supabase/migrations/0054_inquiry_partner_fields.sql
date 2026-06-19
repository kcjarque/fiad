-- Add partner name and event date to inquiries (Season 2 expanded form).
alter table event_inquiries
  add column if not exists partner_name text,
  add column if not exists event_date text;
