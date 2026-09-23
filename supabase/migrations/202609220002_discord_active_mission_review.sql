create or replace function public.madger_discord_review_submission(
  p_submission_id bigint,
  p_status text,
  p_reviewer_user_id text,
  p_note text default null
) returns public.madger_discord_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.madger_discord_submissions%rowtype;
  v_points integer;
begin
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  select * into v_submission from public.madger_discord_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_submission.status <> 'pending' then raise exception 'submission already reviewed'; end if;
  if p_status = 'approved' then
    select points into v_points
      from public.madger_bot_missions
      where code = v_submission.mission_code and active = true;
    if not found then raise exception 'mission is inactive'; end if;
    insert into public.madger_discord_members(guild_id, user_id, contribution_points)
      values (v_submission.guild_id, v_submission.user_id, v_points)
      on conflict (guild_id, user_id) do update
      set contribution_points = public.madger_discord_members.contribution_points + excluded.contribution_points,
          updated_at = now();
  end if;
  update public.madger_discord_submissions
    set status = p_status, reviewer_user_id = p_reviewer_user_id,
        review_note = nullif(left(coalesce(p_note, ''), 300), ''), reviewed_at = now()
    where id = p_submission_id returning * into v_submission;
  return v_submission;
end;
$$;

revoke all on function public.madger_discord_review_submission(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.madger_discord_review_submission(bigint, text, text, text) to service_role;
