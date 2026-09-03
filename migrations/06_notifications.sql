-- ============================================================
-- EXPÉDITION — 06 NOTIFICATIONS
-- ============================================================

create or replace function private.activity_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_text text;
  v_link text;
begin
  select * into v_event from public.events where id=new.event_id;

  case new.type
    when 'challenge_added' then
      -- Before the start date the challenge list is secret. Do not leak it by notification.
      if now() >= v_event.start_at then
        v_text := 'Nouveau défi ajouté : ' || coalesce(new.metadata->>'title','Défi');
        v_link := '/event/' || new.event_id::text || '/challenges';
        insert into public.notifications(user_id,type,text,link)
        select em.user_id,'challenge_added',v_text,v_link
        from public.event_members em
        where em.event_id=new.event_id and em.status='active' and em.user_id<>new.actor_id;
      end if;

    when 'attempt_published' then
      if not v_event.secret_submissions or now() >= v_event.end_at then
        v_text := 'Nouvelle tentative : ' || coalesce(new.metadata->>'title','Défi');
        v_link := '/attempt/' || new.entity_id::text;
        insert into public.notifications(user_id,type,text,link)
        select em.user_id,'attempt_published',v_text,v_link
        from public.event_members em
        where em.event_id=new.event_id and em.status='active' and em.user_id<>new.actor_id;
      end if;

    when 'attempt_approved' then
      insert into public.notifications(user_id,type,text,link)
      values(new.actor_id,'approved','Défi validé : '||coalesce(new.metadata->>'title','Défi')||' (+'||coalesce(new.metadata->>'points','0')||' pts)', '/attempt/'||new.entity_id::text);

    when 'attempt_rejected' then
      insert into public.notifications(user_id,type,text,link)
      values(new.actor_id,'rejected','Tentative refusée : '||coalesce(new.metadata->>'title','Défi')||'. Tu peux réessayer.', '/attempt/'||new.entity_id::text);

    when 'member_joined' then
      insert into public.notifications(user_id,type,text,link)
      select em.user_id,'member_joined','Un nouvel explorateur a rejoint ton expédition.','/event/'||new.event_id::text||'/members'
      from public.event_members em
      where em.event_id=new.event_id and em.status='active' and em.role='admin' and em.user_id<>new.actor_id;

    else null;
  end case;
  return new;
end;
$$;

drop trigger if exists trg_activity_notifications on public.activity_feed;
create trigger trg_activity_notifications
after insert on public.activity_feed
for each row execute function private.activity_notifications();

create or replace function private.comment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_author uuid;
begin
  select user_id into v_author from public.attempts where id=new.attempt_id;
  if v_author is not null and v_author<>new.user_id then
    insert into public.notifications(user_id,type,text,link)
    values(v_author,'comment','Quelqu’un a commenté ta tentative.','/attempt/'||new.attempt_id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comment_notification on public.comments;
create trigger trg_comment_notification
after insert on public.comments
for each row execute function private.comment_notification();

select 'EXPEDITION NOTIFICATIONS OK' as status;
