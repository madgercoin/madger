select cron.schedule(
  'madger-buy-watcher-1m',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/watch-buys',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-madger-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1)
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 20000
    ) as request_id;
  $job$
);
