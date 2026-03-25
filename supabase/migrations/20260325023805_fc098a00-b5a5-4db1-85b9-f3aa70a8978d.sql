
-- Fix search_path on both functions
create or replace function public.touch_user_active()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update public.users set last_active_at = now() where id = new.user_id;
  return new;
end;
$$;

create or replace function public.sync_chapter_progress()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_topic   public.topics%rowtype;
  v_total   int;
  v_done    int;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select * into v_topic from public.topics where id = new.topic_id;
    select count(*) into v_total from public.topics where subject = v_topic.subject and class_number = v_topic.class_number and chapter_number = v_topic.chapter_number;
    select count(distinct t.id) into v_done from public.sessions s join public.topics t on t.id = s.topic_id where s.user_id = new.user_id and s.status = 'completed' and t.subject = v_topic.subject and t.class_number = v_topic.class_number and t.chapter_number = v_topic.chapter_number;
    insert into public.chapter_progress (user_id, subject, class_number, chapter_number, topics_total, topics_done, chapter_complete)
    values (new.user_id, v_topic.subject, v_topic.class_number, v_topic.chapter_number, v_total, v_done, v_done >= v_total)
    on conflict (user_id, subject, class_number, chapter_number)
    do update set topics_total = excluded.topics_total, topics_done = excluded.topics_done, chapter_complete = excluded.chapter_complete, completed_at = case when excluded.chapter_complete then now() else null end;
  end if;
  return new;
end;
$$;
