alter table public.madger_bot_alerts
  add column if not exists trade_side text,
  add column if not exists actor_wallet text,
  add column if not exists payment_amount numeric,
  add column if not exists payment_asset text,
  add column if not exists post_token_balance numeric;

update public.madger_bot_alerts
set trade_side = 'buy', actor_wallet = buyer_wallet
where alert_type = 'verified_buy' and trade_side is null;

alter table public.madger_bot_alerts
  drop constraint if exists madger_bot_alerts_trade_side_check;
alter table public.madger_bot_alerts
  add constraint madger_bot_alerts_trade_side_check
  check (trade_side is null or trade_side in ('buy', 'sell'));

create index if not exists madger_bot_alerts_side_created_idx
  on public.madger_bot_alerts(trade_side, created_at desc)
  where trade_side is not null;

create table if not exists public.madger_bot_alert_subscriptions (
  id bigint generated always as identity primary key,
  chat_id bigint not null references public.madger_bot_users(chat_id) on delete cascade,
  metric text not null check (metric in ('price', 'liquidity', 'volume24h', 'holders', 'whale')),
  direction text not null check (direction in ('above', 'below')),
  threshold numeric not null check (threshold > 0),
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chat_id, metric, direction, threshold)
);

create index if not exists madger_bot_alert_subscriptions_active_idx
  on public.madger_bot_alert_subscriptions(metric, active)
  where active;

alter table public.madger_bot_alert_subscriptions enable row level security;
revoke all on public.madger_bot_alert_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.madger_bot_alert_subscriptions to service_role;
grant usage, select on sequence public.madger_bot_alert_subscriptions_id_seq to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'madger-daily-admin-briefing') then
    perform cron.unschedule('madger-daily-admin-briefing');
  end if;
end;
$$;

select cron.schedule(
  'madger-daily-admin-briefing',
  '0 13 * * *',
  $job$
    select net.http_post(
      url := 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/daily-briefing',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-madger-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'madger_bot_monitor_secret' limit 1)
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 30000
    ) as request_id;
  $job$
);
