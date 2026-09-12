create table if not exists public.madger_bot_team_memberships (
  user_chat_id bigint not null references public.madger_bot_users(chat_id) on delete cascade,
  team text not null check (team in ('raid', 'outreach')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_chat_id, team)
);

create table if not exists public.madger_bot_team_alerts (
  id bigint generated always as identity primary key,
  team text not null check (team in ('raid', 'outreach')),
  target_url text not null check (target_url ~ '^https://'),
  brief text not null check (char_length(brief) between 5 and 500),
  created_by bigint not null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists madger_bot_team_memberships_active_idx
  on public.madger_bot_team_memberships(team, user_chat_id) where active = true;
create index if not exists madger_bot_team_alerts_recent_idx
  on public.madger_bot_team_alerts(team, created_at desc);

alter table public.madger_bot_team_memberships enable row level security;
alter table public.madger_bot_team_alerts enable row level security;
revoke all on public.madger_bot_team_memberships, public.madger_bot_team_alerts from anon, authenticated;
grant select, insert, update, delete on public.madger_bot_team_memberships, public.madger_bot_team_alerts to service_role;
grant usage, select on sequence public.madger_bot_team_alerts_id_seq to service_role;
