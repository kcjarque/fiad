-- Email Marketing — calendar broadcast engine.
--
-- Unlike the (unused) drip-model `email_sequences` (0056), this is a BROADCAST
-- model: an admin defines a CAMPAIGN of dated EMAILS, imports a RECIPIENT list,
-- and a pg_cron scheduler blasts the whole list at each email's scheduled time
-- via the `campaign-dispatch` edge function (ConexMail raw HTML). One SEND row
-- per (email, recipient) makes delivery idempotent across cron ticks.
--
-- DDL needs elevated SQL (anon can't run DDL). Apply via the Management API /
-- dashboard SQL editor for project cjhnsyldnzdedgianzsj.

-- ── Campaigns ────────────────────────────────────────────────────────────────
create table if not exists email_campaigns (
  id            text primary key,
  name          text not null,
  status        text not null default 'draft'
                check (status in ('draft','active','paused')),
  -- Campaign-wide merge defaults, filled into every email's {{tokens}}.
  from_name     text not null default 'Team FIAD',
  register_link text not null default 'https://www.fiad.app/rsvp',
  fb_page       text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Emails (the dated broadcasts) ────────────────────────────────────────────
create table if not exists campaign_emails (
  id           text primary key,
  campaign_id  text not null references email_campaigns(id) on delete cascade,
  track        text not null default 'visitor' check (track in ('visitor','supplier')),
  seq_no       int  not null default 0,          -- ordering within a track
  label        text,                              -- e.g. "Email 1 — Big Reveal"
  subject      text not null,
  preview      text,                              -- inbox preheader
  body_html    text not null,                     -- full HTML, supports {{tokens}}
  scheduled_at timestamptz not null,              -- when to blast (Asia/Manila)
  status       text not null default 'scheduled'
               check (status in ('scheduled','sending','sent','paused')),
  sent_count   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists campaign_emails_campaign_idx on campaign_emails (campaign_id, track, seq_no);
create index if not exists campaign_emails_due_idx on campaign_emails (status, scheduled_at);

-- ── Recipients (the list — imported later) ───────────────────────────────────
create table if not exists campaign_recipients (
  id          text primary key,
  campaign_id text not null references email_campaigns(id) on delete cascade,
  track       text not null default 'visitor' check (track in ('visitor','supplier')),
  email       text not null,
  first_name  text,
  created_at  timestamptz not null default now()
);
-- One recipient per (campaign, track, email). Emails are lowercased in the app
-- before insert, so a plain unique index gives case-insensitive dedup while
-- still being targetable by upsert's ON CONFLICT (a functional index is not).
create unique index if not exists campaign_recipients_unique
  on campaign_recipients (campaign_id, track, email);

-- ── Sends (per-recipient delivery log; makes dispatch idempotent) ────────────
create table if not exists campaign_sends (
  id           text primary key,
  email_id     text not null references campaign_emails(id) on delete cascade,
  recipient_id text not null references campaign_recipients(id) on delete cascade,
  status       text not null check (status in ('sent','failed','skipped')),
  error        text,
  sent_at      timestamptz not null default now(),
  unique (email_id, recipient_id)
);
create index if not exists campaign_sends_email_idx on campaign_sends (email_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- FIAD's admin console runs on the anon key (admin auth enforced app-side), so
-- anon manages campaign/email/recipient rows. Send rows are written by the
-- dispatch edge function via the service role (bypasses RLS); anon reads them
-- for the admin send log.
alter table email_campaigns     enable row level security;
alter table campaign_emails      enable row level security;
alter table campaign_recipients  enable row level security;
alter table campaign_sends       enable row level security;

drop policy if exists "anon_all_email_campaigns" on email_campaigns;
create policy "anon_all_email_campaigns" on email_campaigns for all to anon using (true) with check (true);

drop policy if exists "anon_all_campaign_emails" on campaign_emails;
create policy "anon_all_campaign_emails" on campaign_emails for all to anon using (true) with check (true);

drop policy if exists "anon_all_campaign_recipients" on campaign_recipients;
create policy "anon_all_campaign_recipients" on campaign_recipients for all to anon using (true) with check (true);

drop policy if exists "anon_select_campaign_sends" on campaign_sends;
create policy "anon_select_campaign_sends" on campaign_sends for select to anon using (true);
