create table if not exists public.madger_bot_holder_snapshots (
  id bigint generated always as identity primary key,
  holder_count integer not null check (holder_count >= 0),
  token_account_count integer not null check (token_account_count >= 0),
  total_supply numeric not null check (total_supply >= 0),
  largest_percentage numeric not null check (largest_percentage between 0 and 100),
  top_10_percentage numeric not null check (top_10_percentage between 0 and 100),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists madger_bot_holder_snapshots_created_idx
  on public.madger_bot_holder_snapshots(created_at desc);

alter table public.madger_bot_holder_snapshots enable row level security;
revoke all on table public.madger_bot_holder_snapshots from anon, authenticated;
revoke all on sequence public.madger_bot_holder_snapshots_id_seq from anon, authenticated;

select cron.schedule(
  'madger-holder-monitor-15m',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/monitor-holders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-madger-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1)
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 30000
    ) as request_id;
  $job$
);

select cron.schedule(
  'madger-bot-retention-daily',
  '17 4 * * *',
  $job$
    delete from public.madger_bot_processed_updates where processed_at < now() - interval '7 days';
    delete from public.madger_bot_market_snapshots where created_at < now() - interval '30 days';
    delete from public.madger_bot_holder_snapshots where created_at < now() - interval '180 days';
    delete from public.madger_bot_events where created_at < now() - interval '180 days';
  $job$
);
