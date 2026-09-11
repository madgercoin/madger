create table if not exists public.madger_bot_moderation_state (
  chat_id bigint not null,
  user_id bigint not null,
  warning_count integer not null default 0 check (warning_count >= 0),
  pending_verification boolean not null default false,
  verification_deadline timestamptz,
  welcome_message_id bigint,
  flood_count integer not null default 0 check (flood_count >= 0),
  flood_window_started_at timestamptz,
  duplicate_hash text,
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  duplicate_window_started_at timestamptz,
  restricted_until timestamptz,
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create index if not exists madger_bot_moderation_pending_idx
  on public.madger_bot_moderation_state(verification_deadline)
  where pending_verification = true;

alter table public.madger_bot_moderation_state enable row level security;
revoke all on public.madger_bot_moderation_state from anon, authenticated;
grant select, insert, update, delete on public.madger_bot_moderation_state to service_role;

insert into public.madger_bot_settings(key, value) values
  ('community_guard', jsonb_build_object(
    'join_gate_enabled', true,
    'verification_minutes', 10,
    'flood_messages', 7,
    'flood_seconds', 15,
    'duplicate_messages', 3,
    'duplicate_seconds', 60,
    'mute_minutes', 10
  ))
on conflict (key) do nothing;

