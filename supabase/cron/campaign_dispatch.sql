-- pg_cron scheduler for the Email Marketing broadcast engine.
--
-- Runs every 5 minutes and pings the `campaign-dispatch` edge function, which
-- sends any emails that are now due (campaign 'active' + scheduled_at <= now())
-- to the recipient list. Dispatch is idempotent (unique email_id+recipient_id),
-- so an extra tick never double-sends.
--
-- Run ONCE in the Supabase SQL editor (or via the Management API) for project
-- cjhnsyldnzdedgianzsj, AFTER migration 0058 is applied and the
-- campaign-dispatch function is deployed.
--
-- Replace <ANON_KEY> with VITE_SUPABASE_ANON_KEY (the public browser key — it
-- only needs to pass the function's JWT check; dispatch uses its own injected
-- service role for DB writes).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent (re)install: drop a prior schedule of the same name if present.
select cron.unschedule('fiad-campaign-dispatch')
where exists (select 1 from cron.job where jobname = 'fiad-campaign-dispatch');

select cron.schedule(
  'fiad-campaign-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://cjhnsyldnzdedgianzsj.supabase.co/functions/v1/campaign-dispatch',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body    := jsonb_build_object('mode', 'dispatch')
  );
  $$
);

-- To remove later:  select cron.unschedule('fiad-campaign-dispatch');
-- To inspect runs:  select * from cron.job_run_details order by start_time desc limit 20;
