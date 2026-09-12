create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'madger-self-healing-watchdog-5m') then
    perform cron.unschedule('madger-self-healing-watchdog-5m');
  end if;
end;
$$;

select cron.schedule(
  'madger-self-healing-watchdog-5m',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/watchdog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-madger-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1)
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 30000
    ) as request_id;
  $job$
);
