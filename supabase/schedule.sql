-- =====================================================================
-- Run the newsroom every 5 minutes (free, uses Supabase's built-in scheduler).
-- BEFORE RUNNING: replace YOUR-CRON-SECRET with the CRON_SECRET value from Vercel,
-- and check the site address.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('velkrypt-newsroom') where exists (select 1 from cron.job where jobname = 'velkrypt-newsroom');

select cron.schedule(
  'velkrypt-newsroom',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://velkrypt.online/api/cron/agent',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET'),
    timeout_milliseconds := 60000
  );
  $$
);

-- Check it is running:   select * from cron.job_run_details order by start_time desc limit 5;
-- Pause it:              select cron.unschedule('velkrypt-newsroom');
