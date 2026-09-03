-- ============================================================
-- EXPÉDITION — 05 PRODUCTION HARDENING
-- Run this AFTER migrations 01 → 04 already executed in Supabase.
-- ============================================================

-- Secret submissions: only the author/admin/platform can see them before event end.
create or replace function private.can_view_attempt(_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attempts a
    join public.events e on e.id = a.event_id
    where a.id = _attempt_id
      and (
        private.is_platform_admin()
        or private.is_event_admin(a.event_id)
        or a.user_id = (select auth.uid())
        or (
          private.is_event_member(a.event_id)
          and (not e.secret_submissions or now() >= e.end_at)
        )
      )
  );
$$;

-- Hide challenge announcements before launch and secret attempts before reveal.
create or replace function private.can_view_activity(_event_id uuid, _activity_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_event_admin(_event_id)
    or private.is_platform_admin()
    or (
      private.is_event_member(_event_id)
      and (
        (_activity_type <> 'challenge_added' or private.event_has_started(_event_id))
        and (
          _activity_type <> 'attempt_published'
          or exists (
            select 1 from public.events e
            where e.id = _event_id
              and (not e.secret_submissions or now() >= e.end_at)
          )
        )
      )
    );
$$;

-- Leaderboard respects hidden mode unless admin or event is over.
create or replace function public.event_leaderboard(p_event_id uuid)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  points bigint,
  last_score_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(sum(a.points_awarded), 0)::bigint as points,
    max(a.resolved_at) filter (where a.status = 'approved') as last_score_at
  from public.event_members em
  join public.profiles p on p.id = em.user_id
  join public.events e on e.id = em.event_id
  left join public.attempts a
    on a.event_id = em.event_id
   and a.user_id = em.user_id
   and a.status = 'approved'
  where em.event_id = p_event_id
    and em.status = 'active'
    and private.is_event_member(p_event_id)
    and (
      e.leaderboard_visibility = 'visible'
      or now() >= e.end_at
      or private.is_event_admin(p_event_id)
    )
  group by p.id, p.username, p.avatar_url
  order by points desc, last_score_at asc nulls last, p.username asc;
$$;

-- Create secret attempts as submitted until event end.
create or replace function public.create_attempt(p_challenge_id uuid, p_content text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_challenge public.challenges%rowtype;
  v_event public.events%rowtype;
  v_attempt uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_challenge from public.challenges
  where id = p_challenge_id and platform_removed = false;
  if v_challenge.id is null then raise exception 'CHALLENGE_NOT_FOUND'; end if;

  select * into v_event from public.events where id = v_challenge.event_id;
  if not private.is_event_member(v_event.id) then raise exception 'NOT_EVENT_MEMBER'; end if;
  if now() < v_event.start_at then raise exception 'EVENT_NOT_STARTED'; end if;
  if now() >= v_event.end_at then raise exception 'EVENT_ENDED'; end if;

  if exists (
    select 1 from public.attempts
    where challenge_id = p_challenge_id and user_id = v_user
      and status in ('submitted','voting','approved')
  ) then raise exception 'ATTEMPT_ALREADY_EXISTS'; end if;

  if v_challenge.challenge_type = 'exclusive' and exists (
    select 1 from public.attempts where challenge_id = p_challenge_id and status = 'approved'
  ) then raise exception 'EXCLUSIVE_ALREADY_WON'; end if;

  insert into public.attempts (
    event_id, challenge_id, user_id, content, status, submitted_at,
    vote_started_at, vote_ends_at, points_awarded
  ) values (
    v_event.id, p_challenge_id, v_user, coalesce(p_content,''),
    case when v_event.secret_submissions then 'submitted' else 'voting' end,
    now(),
    case when v_event.secret_submissions then null else now() end,
    case when v_event.secret_submissions
      then v_event.end_at + make_interval(hours => v_event.vote_duration_hours)
      else now() + make_interval(hours => v_event.vote_duration_hours)
    end,
    0
  ) returning id into v_attempt;

  insert into public.activity_feed(event_id,actor_id,type,entity_id,metadata)
  values (v_event.id,v_user,'attempt_published',v_attempt,
    jsonb_build_object('challenge_id',p_challenge_id,'title',v_challenge.title));

  return v_attempt;
end;
$$;

-- Refresh event state. Call when opening an event/attempt; safe and idempotent.
create or replace function public.refresh_event_state(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_event public.events%rowtype;
begin
  if not private.is_event_member(p_event_id) and not private.is_platform_admin() then
    raise exception 'NOT_EVENT_MEMBER';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;

  if now() >= v_event.start_at and now() < v_event.end_at and v_event.status = 'scheduled' then
    update public.events set status='active' where id=p_event_id;
  end if;

  if now() >= v_event.end_at then
    update public.attempts
      set status='voting', vote_started_at=coalesce(vote_started_at,v_event.end_at),
          vote_ends_at=coalesce(vote_ends_at,v_event.end_at + make_interval(hours => v_event.vote_duration_hours))
      where event_id=p_event_id and status='submitted';
    update public.events set status='waiting_for_votes'
      where id=p_event_id and status not in ('completed','cancelled','platform_suspended');
  end if;
end;
$$;

-- Admin editable public info only.
create or replace function public.update_event_info(
  p_event_id uuid,
  p_name text,
  p_description text,
  p_reward_text text,
  p_visibility text,
  p_max_members integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  if not private.is_event_admin(p_event_id) then raise exception 'NOT_EVENT_ADMIN'; end if;
  if length(trim(coalesce(p_name,''))) < 3 then raise exception 'INVALID_NAME'; end if;
  if p_visibility not in ('public','private') then raise exception 'INVALID_VISIBILITY'; end if;
  select count(*) into v_count from public.event_members where event_id=p_event_id and status='active';
  if p_max_members is not null and p_max_members < v_count then raise exception 'MAX_MEMBERS_TOO_LOW'; end if;
  update public.events set
    name=trim(p_name), description=coalesce(p_description,''),
    reward_text=nullif(trim(coalesce(p_reward_text,'')),''),
    visibility=p_visibility, max_members=p_max_members
  where id=p_event_id;
  insert into public.activity_feed(event_id,actor_id,type,metadata)
  values(p_event_id,auth.uid(),'event_settings_updated','{}'::jsonb);
end;
$$;

create or replace function public.regenerate_invite_code(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_code text;
begin
  if not private.is_event_admin(p_event_id) then raise exception 'NOT_EVENT_ADMIN'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  update public.events set invite_code=v_code where id=p_event_id;
  return v_code;
end;
$$;

create or replace function public.ban_event_member(p_event_id uuid, p_user_id uuid, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid;
begin
  if not private.is_event_admin(p_event_id) then raise exception 'NOT_EVENT_ADMIN'; end if;
  select owner_id into v_owner from public.events where id=p_event_id;
  if p_user_id=v_owner then raise exception 'CANNOT_BAN_OWNER'; end if;
  update public.event_members set status='banned' where event_id=p_event_id and user_id=p_user_id;
  insert into public.event_bans(event_id,user_id,banned_by,reason)
  values(p_event_id,p_user_id,auth.uid(),nullif(trim(coalesce(p_reason,'')),''))
  on conflict(event_id,user_id) do update set banned_by=excluded.banned_by, reason=excluded.reason, created_at=now();
  insert into public.activity_feed(event_id,actor_id,type,metadata)
  values(p_event_id,auth.uid(),'member_banned',jsonb_build_object('user_id',p_user_id));
end;
$$;

-- Allow attempt media uploads for both normal voting and secret submitted attempts.
create or replace function private.can_upload_attempt_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.event_id::text=(storage.foldername(p_name))[1]
      and a.id::text=(storage.foldername(p_name))[2]
      and a.user_id=(select auth.uid())
      and (storage.foldername(p_name))[3]=(select auth.uid())::text
      and a.status in ('submitted','voting')
  );
$$;

create or replace function public.register_attempt_media(
  p_attempt_id uuid, p_storage_path text, p_media_type text, p_position integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid; v_attempt public.attempts%rowtype; v_media_id uuid; v_expected_prefix text;
begin
  v_user:=auth.uid(); if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_media_type not in ('image','video') then raise exception 'INVALID_MEDIA_TYPE'; end if;
  select * into v_attempt from public.attempts where id=p_attempt_id;
  if v_attempt.id is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.user_id<>v_user then raise exception 'NOT_ATTEMPT_OWNER'; end if;
  if v_attempt.status not in ('submitted','voting') then raise exception 'ATTEMPT_CLOSED'; end if;
  v_expected_prefix:=v_attempt.event_id::text||'/'||v_attempt.id::text||'/'||v_user::text||'/';
  if p_storage_path not like v_expected_prefix||'%' then raise exception 'INVALID_STORAGE_PATH'; end if;
  insert into public.attempt_media(attempt_id,media_type,storage_path,position)
  values(p_attempt_id,p_media_type,p_storage_path,greatest(p_position,0)) returning id into v_media_id;
  return v_media_id;
end;
$$;

-- Permissions.
revoke execute on function public.refresh_event_state(uuid) from public, anon;
revoke execute on function public.update_event_info(uuid,text,text,text,text,integer) from public, anon;
revoke execute on function public.regenerate_invite_code(uuid) from public, anon;
revoke execute on function public.ban_event_member(uuid,uuid,text) from public, anon;
grant execute on function public.refresh_event_state(uuid) to authenticated;
grant execute on function public.update_event_info(uuid,text,text,text,text,integer) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.ban_event_member(uuid,uuid,text) to authenticated;

select 'EXPEDITION PRODUCTION HARDENING OK' as status;
