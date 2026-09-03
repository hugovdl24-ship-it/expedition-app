-- ============================================================
-- EXPÉDITION — 07 FINAL GAME HARDENING + PLATFORM MODERATION
-- ============================================================

-- Race-safe resolution + challenge row lock.
create or replace function private.evaluate_attempt(p_attempt_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.attempts%rowtype;
  v_event public.events%rowtype;
  v_challenge public.challenges%rowtype;
  v_eligible integer; v_reject integer; v_approve integer; v_total integer;
  v_required integer; v_remaining integer; v_result text := null;
begin
  select * into v_attempt from public.attempts where id=p_attempt_id for update;
  if v_attempt.id is null then return null; end if;
  if v_attempt.status<>'voting' then return v_attempt.status; end if;

  select * into v_event from public.events where id=v_attempt.event_id;
  select * into v_challenge from public.challenges where id=v_attempt.challenge_id for update;

  select count(*) into v_eligible from public.event_members
    where event_id=v_attempt.event_id and status='active' and user_id<>v_attempt.user_id;
  select count(*) filter(where value='reject'), count(*) filter(where value='approve'), count(*)
    into v_reject,v_approve,v_total
    from public.votes where attempt_id=p_attempt_id
      and user_id in (select user_id from public.event_members where event_id=v_attempt.event_id and status='active' and user_id<>v_attempt.user_id);

  v_required:=ceil(v_eligible*v_event.reject_threshold)::integer;
  v_remaining:=v_eligible-v_total;
  if v_required=0 then v_result:='approved';
  elsif v_reject>=v_required then v_result:='rejected';
  elsif v_reject+v_remaining<v_required then v_result:='approved';
  elsif now()>=v_attempt.vote_ends_at then v_result:='approved';
  else return 'voting'; end if;

  if v_result='approved' and v_challenge.challenge_type='exclusive'
     and exists(select 1 from public.attempts where challenge_id=v_challenge.id and id<>v_attempt.id and status='approved')
  then v_result:='invalidated'; end if;

  update public.attempts set status=v_result,resolved_at=now(),points_awarded=case when v_result='approved' then v_challenge.points else 0 end where id=p_attempt_id;

  if v_result='approved' then
    insert into public.activity_feed(event_id,actor_id,type,entity_id,metadata)
      values(v_attempt.event_id,v_attempt.user_id,'attempt_approved',v_attempt.id,jsonb_build_object('title',v_challenge.title,'points',v_challenge.points));
    if v_challenge.challenge_type='exclusive' then
      update public.attempts set status='invalidated',resolved_at=now(),points_awarded=0
        where challenge_id=v_challenge.id and id<>v_attempt.id and status in('submitted','voting');
    end if;
  elsif v_result='rejected' then
    insert into public.activity_feed(event_id,actor_id,type,entity_id,metadata)
      values(v_attempt.event_id,v_attempt.user_id,'attempt_rejected',v_attempt.id,jsonb_build_object('title',v_challenge.title));
  end if;
  return v_result;
end;
$$;

-- Refresh launches, secret reveal, expired attempts and completion.
create or replace function public.refresh_event_state(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_event public.events%rowtype; r record;
begin
  if not private.is_event_member(p_event_id) and not private.is_platform_admin() then raise exception 'NOT_EVENT_MEMBER'; end if;
  select * into v_event from public.events where id=p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status in ('cancelled','platform_suspended') then return; end if;

  if now()>=v_event.start_at and now()<v_event.end_at and v_event.status='scheduled' then
    update public.events set status='active' where id=p_event_id;
  end if;

  if now()>=v_event.end_at then
    update public.attempts set status='voting',vote_started_at=coalesce(vote_started_at,v_event.end_at),
      vote_ends_at=coalesce(vote_ends_at,v_event.end_at+make_interval(hours=>v_event.vote_duration_hours))
      where event_id=p_event_id and status='submitted';
    update public.events set status='waiting_for_votes' where id=p_event_id and status not in('completed','cancelled','platform_suspended');
  end if;

  for r in select id from public.attempts where event_id=p_event_id and status='voting' and vote_ends_at<=now()
  loop perform private.evaluate_attempt(r.id); end loop;

  if now()>=v_event.end_at and not exists(select 1 from public.attempts where event_id=p_event_id and status in('submitted','voting')) then
    update public.events set status='completed' where id=p_event_id and status not in('cancelled','platform_suspended');
  end if;
end;
$$;

-- Platform-admin tools.
create or replace function public.platform_resolve_report(p_report_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_platform_admin() then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  update public.reports set status='resolved' where id=p_report_id;
  insert into public.moderation_actions(admin_id,action,entity_type,entity_id,reason)
    select auth.uid(),'resolve_report',entity_type,entity_id,'Resolved from admin dashboard' from public.reports where id=p_report_id;
end;$$;

create or replace function public.platform_toggle_event_suspension(p_event_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_status text; v_new text;
begin
  if not private.is_platform_admin() then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  select status into v_status from public.events where id=p_event_id;
  if v_status is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_status='platform_suspended' then
    select case when now()>=end_at then 'completed' when now()>=start_at then 'active' else 'scheduled' end into v_new from public.events where id=p_event_id;
  else v_new:='platform_suspended'; end if;
  update public.events set status=v_new where id=p_event_id;
  insert into public.moderation_actions(admin_id,action,entity_type,entity_id,reason)
    values(auth.uid(),v_new,'event',p_event_id,'Platform moderation');
  return v_new;
end;$$;

revoke execute on function public.platform_resolve_report(uuid) from public,anon;
revoke execute on function public.platform_toggle_event_suspension(uuid) from public,anon;
grant execute on function public.platform_resolve_report(uuid) to authenticated;
grant execute on function public.platform_toggle_event_suspension(uuid) to authenticated;

-- Join-event concurrency hardening: lock the event row while checking capacity.
create or replace function public.join_event(p_event_id uuid default null, p_invite_code text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid; v_event public.events%rowtype; v_count integer;
begin
  v_user:=auth.uid(); if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_event_id is not null then
    select * into v_event from public.events where id=p_event_id for update;
  elsif p_invite_code is not null then
    select * into v_event from public.events where upper(invite_code)=upper(trim(p_invite_code)) for update;
  else raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status in('completed','cancelled','platform_suspended') or now()>=v_event.end_at then raise exception 'EVENT_NOT_JOINABLE'; end if;
  if exists(select 1 from public.event_bans where event_id=v_event.id and user_id=v_user) then raise exception 'BANNED'; end if;
  if exists(select 1 from public.event_members where event_id=v_event.id and user_id=v_user and status='active') then return v_event.id; end if;
  if v_event.visibility='private' and (p_invite_code is null or upper(trim(p_invite_code))<>upper(v_event.invite_code)) then raise exception 'INVITE_REQUIRED'; end if;
  if v_event.max_members is not null then
    select count(*) into v_count from public.event_members where event_id=v_event.id and status='active';
    if v_count>=v_event.max_members then raise exception 'EVENT_FULL'; end if;
  end if;
  insert into public.event_members(event_id,user_id,role,status)
    values(v_event.id,v_user,'member','active')
    on conflict(event_id,user_id) do update set status='active',role='member',joined_at=now();
  insert into public.activity_feed(event_id,actor_id,type,metadata) values(v_event.id,v_user,'member_joined','{}'::jsonb);
  return v_event.id;
end;
$$;

select 'EXPEDITION FINAL HARDENING OK' as status;
