create table if not exists public.madger_bot_announcements (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  message_id bigint not null,
  body text not null check (char_length(body) between 5 and 1000),
  target_url text check (target_url is null or target_url ~ '^https://'),
  button_label text check (button_label is null or char_length(button_label) between 1 and 40),
  pinned boolean not null default false,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  unique (chat_id, message_id)
);

create table if not exists public.madger_bot_message_cleanup (
  chat_id bigint not null,
  message_id bigint not null,
  reason text not null,
  delete_after timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (chat_id, message_id)
);

create index if not exists madger_bot_message_cleanup_due_idx
  on public.madger_bot_message_cleanup(delete_after)
  where deleted_at is null;

alter table public.madger_bot_announcements enable row level security;
alter table public.madger_bot_message_cleanup enable row level security;
revoke all on public.madger_bot_announcements, public.madger_bot_message_cleanup from anon, authenticated;
grant select, insert, update, delete on public.madger_bot_announcements, public.madger_bot_message_cleanup to service_role;
grant usage, select on sequence public.madger_bot_announcements_id_seq to service_role;
