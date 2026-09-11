-- MADGER Command Bot: private operational data behind service-role-only access.
create table if not exists public.madger_bot_users (
  chat_id bigint primary key,
  username text,
  display_name text,
  source_ref text,
  points integer not null default 0 check (points >= 0),
  status text not null default 'active' check (status in ('active', 'restricted', 'banned')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.madger_bot_referrals (
  code text primary key check (code ~ '^[a-z0-9_-]{4,32}$'),
  owner_chat_id bigint not null references public.madger_bot_users(chat_id) on delete cascade,
  label text,
  joins integer not null default 0 check (joins >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.madger_bot_missions (
  code text primary key check (code ~ '^[a-z0-9_-]{3,32}$'),
  title text not null check (char_length(title) between 3 and 120),
  instructions text not null check (char_length(instructions) between 10 and 1200),
  points integer not null check (points between 1 and 10000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.madger_bot_submissions (
  id bigint generated always as identity primary key,
  mission_code text not null references public.madger_bot_missions(code) on delete restrict,
  user_chat_id bigint not null references public.madger_bot_users(chat_id) on delete cascade,
  evidence_url text not null check (evidence_url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_chat_id bigint,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (mission_code, user_chat_id, evidence_url)
);

create table if not exists public.madger_bot_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  chat_id bigint,
  referral_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.madger_bot_processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

create table if not exists public.madger_bot_market_snapshots (
  id bigint generated always as identity primary key,
  price_usd numeric,
  liquidity_usd numeric,
  volume_m5_usd numeric,
  buys_m5 integer,
  sells_m5 integer,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.madger_bot_alerts (
  id bigint generated always as identity primary key,
  alert_type text not null,
  transaction_signature text unique,
  buyer_wallet text,
  token_amount numeric,
  usd_value numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.madger_bot_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists madger_bot_referrals_owner_idx on public.madger_bot_referrals(owner_chat_id);
create index if not exists madger_bot_submissions_user_idx on public.madger_bot_submissions(user_chat_id, created_at desc);
create index if not exists madger_bot_submissions_pending_idx on public.madger_bot_submissions(created_at) where status = 'pending';
create index if not exists madger_bot_events_type_created_idx on public.madger_bot_events(event_type, created_at desc);
create index if not exists madger_bot_events_chat_idx on public.madger_bot_events(chat_id, created_at desc) where chat_id is not null;
create index if not exists madger_bot_market_created_idx on public.madger_bot_market_snapshots(created_at desc);
create index if not exists madger_bot_alerts_created_idx on public.madger_bot_alerts(created_at desc);

alter table public.madger_bot_users enable row level security;
alter table public.madger_bot_referrals enable row level security;
alter table public.madger_bot_missions enable row level security;
alter table public.madger_bot_submissions enable row level security;
alter table public.madger_bot_events enable row level security;
alter table public.madger_bot_processed_updates enable row level security;
alter table public.madger_bot_market_snapshots enable row level security;
alter table public.madger_bot_alerts enable row level security;
alter table public.madger_bot_settings enable row level security;

revoke all on public.madger_bot_users, public.madger_bot_referrals, public.madger_bot_missions,
  public.madger_bot_submissions, public.madger_bot_events, public.madger_bot_processed_updates,
  public.madger_bot_market_snapshots, public.madger_bot_alerts, public.madger_bot_settings
  from anon, authenticated;

grant select, insert, update, delete on public.madger_bot_users, public.madger_bot_referrals,
  public.madger_bot_missions, public.madger_bot_submissions, public.madger_bot_events,
  public.madger_bot_processed_updates, public.madger_bot_market_snapshots, public.madger_bot_alerts,
  public.madger_bot_settings to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.madger_bot_settings(key, value) values
  ('official_mint', '"BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv"'::jsonb),
  ('official_pool', '"FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h"'::jsonb),
  ('monitor_secret', to_jsonb(gen_random_uuid()::text || gen_random_uuid()::text))
on conflict (key) do nothing;

insert into public.madger_bot_missions(code, title, instructions, points) values
  ('original-creative', 'Create original MADGER media', 'Publish an original MADGER meme, image, or short video. Submit the public HTTPS link. Recycled or misleading work is rejected.', 100),
  ('help-a-newcomer', 'Help a newcomer safely', 'Answer a genuine beginner question using the complete official mint and no private-message wallet support. Submit the public HTTPS evidence link.', 75),
  ('research-note', 'Deliver a useful research note', 'Create a concise, sourced research note that can improve MADGER operations, safety, content, or community decisions. Submit the public HTTPS link.', 125)
on conflict (code) do nothing;

create or replace function public.madger_bot_review_submission(
  p_submission_id bigint,
  p_status text,
  p_reviewer_chat_id bigint,
  p_note text default null
) returns table(user_chat_id bigint, awarded_points integer, final_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.madger_bot_submissions%rowtype;
  v_points integer := 0;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid review status';
  end if;

  select * into v_submission
  from public.madger_bot_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submission.status <> 'pending' then raise exception 'submission already reviewed'; end if;

  if p_status = 'approved' then
    select points into v_points from public.madger_bot_missions where code = v_submission.mission_code;
    update public.madger_bot_users set points = points + v_points where chat_id = v_submission.user_chat_id;
  end if;

  update public.madger_bot_submissions
  set status = p_status, reviewer_chat_id = p_reviewer_chat_id, review_note = p_note, reviewed_at = now()
  where id = p_submission_id;

  return query select v_submission.user_chat_id, v_points, p_status;
end;
$$;

revoke all on function public.madger_bot_review_submission(bigint, text, bigint, text) from public, anon, authenticated;
grant execute on function public.madger_bot_review_submission(bigint, text, bigint, text) to service_role;

create or replace function public.madger_bot_increment_referral(p_code text)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.madger_bot_referrals
  set joins = joins + 1
  where code = p_code
  returning joins;
$$;

revoke all on function public.madger_bot_increment_referral(text) from public, anon, authenticated;
grant execute on function public.madger_bot_increment_referral(text) to service_role;
