create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  v_secret text;
begin
  select value #>> '{}' into v_secret
  from public.madger_bot_settings
  where key = 'monitor_secret';

  if v_secret is null then
    v_secret := gen_random_uuid()::text || gen_random_uuid()::text;
  end if;

  if not exists (select 1 from vault.decrypted_secrets where name = 'madger_bot_monitor_secret') then
    perform vault.create_secret(v_secret, 'madger_bot_monitor_secret', 'Authenticates MADGER market-monitor and verified-buy ingestion calls');
  else
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1;
  end if;

  insert into public.madger_bot_settings(key, value)
  values ('monitor_secret_sha256', to_jsonb(encode(digest(v_secret, 'sha256'), 'hex')))
  on conflict (key) do update set value = excluded.value, updated_at = now();

  delete from public.madger_bot_settings where key = 'monitor_secret';
end;
$$;

select cron.schedule(
  'madger-market-monitor-5m',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-madger-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1)
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 20000
    ) as request_id;
  $job$
);

select cron.schedule(
  'madger-bot-retention-daily',
  '17 4 * * *',
  $job$
    delete from public.madger_bot_processed_updates where processed_at < now() - interval '7 days';
    delete from public.madger_bot_market_snapshots where created_at < now() - interval '30 days';
    delete from public.madger_bot_events where created_at < now() - interval '180 days';
  $job$
);
