-- Email/SMS sequence engine.
--
-- An admin defines SEQUENCES (e.g. "Registration welcome") made of ordered
-- STEPS. Each step is a templated email and/or SMS, sent some offset after an
-- anchor (enrollment time, or the event's start). When a guest registers they
-- are ENROLLED into every active sequence whose trigger matches; that creates
-- one SEND row per step at its scheduled time. A scheduler (migration 0057)
-- delivers due sends; offset-0 steps go out immediately at enrollment.
--
-- DDL requires elevated SQL (anon can't run DDL). Applied via the Management
-- API / dashboard SQL editor for project cjhnsyldnzdedgianzsj.

-- ── Sequences ────────────────────────────────────────────────────────────────
create table if not exists email_sequences (
  id           text primary key,
  -- null = applies to every event; else scoped to one event.
  event_id     text references events(id) on delete cascade,
  name         text not null,
  trigger_type text not null default 'registration'
               check (trigger_type in ('registration','manual')),
  status       text not null default 'draft'
               check (status in ('draft','active','paused')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Steps ────────────────────────────────────────────────────────────────────
create table if not exists sequence_steps (
  id             text primary key,
  sequence_id    text not null references email_sequences(id) on delete cascade,
  step_order     int  not null default 0,
  channel        text not null default 'email' check (channel in ('email','sms','both')),
  -- When to send: offset_minutes after the anchor. 'enrollment' + 0 = immediate.
  -- 'event_start' + negative offset = before the event (e.g. -1440 = 1 day prior).
  anchor         text not null default 'enrollment' check (anchor in ('enrollment','event_start')),
  offset_minutes int  not null default 0,
  subject        text,   -- email subject (supports {{variables}})
  body_html      text,   -- email body (HTML, supports {{variables}})
  sms_body       text,   -- SMS body (supports {{variables}})
  created_at     timestamptz not null default now()
);
create index if not exists sequence_steps_seq_idx on sequence_steps (sequence_id, step_order);

-- ── Enrollments (a guest entering a sequence) ────────────────────────────────
create table if not exists sequence_enrollments (
  id          text primary key,
  sequence_id text not null references email_sequences(id) on delete cascade,
  guest_id    text not null references guests(id) on delete cascade,
  event_id    text references events(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  unique (sequence_id, guest_id)
);

-- ── Sends (the per-step delivery queue + log) ────────────────────────────────
create table if not exists sequence_sends (
  id            text primary key,
  enrollment_id text not null references sequence_enrollments(id) on delete cascade,
  step_id       text not null references sequence_steps(id) on delete cascade,
  channel       text not null check (channel in ('email','sms')),
  scheduled_for timestamptz not null,
  status        text not null default 'scheduled'
                check (status in ('scheduled','sent','failed','skipped')),
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  -- one delivery per (enrollment, step, channel) — makes the scheduler idempotent.
  unique (enrollment_id, step_id, channel)
);
create index if not exists sequence_sends_due_idx on sequence_sends (status, scheduled_for);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- FIAD's admin console operates with the anon key (admin auth enforced app-side),
-- so anon manages sequence definitions. Enrollment + send rows are written by the
-- enroll/scheduler edge functions via the service role (which bypasses RLS); anon
-- only needs to read them for the admin log.
alter table email_sequences     enable row level security;
alter table sequence_steps       enable row level security;
alter table sequence_enrollments enable row level security;
alter table sequence_sends       enable row level security;

drop policy if exists "anon_all_email_sequences" on email_sequences;
create policy "anon_all_email_sequences" on email_sequences for all to anon using (true) with check (true);

drop policy if exists "anon_all_sequence_steps" on sequence_steps;
create policy "anon_all_sequence_steps" on sequence_steps for all to anon using (true) with check (true);

drop policy if exists "anon_select_sequence_enrollments" on sequence_enrollments;
create policy "anon_select_sequence_enrollments" on sequence_enrollments for select to anon using (true);

drop policy if exists "anon_select_sequence_sends" on sequence_sends;
create policy "anon_select_sequence_sends" on sequence_sends for select to anon using (true);
