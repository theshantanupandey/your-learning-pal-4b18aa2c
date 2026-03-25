
-- Extensions
create extension if not exists "uuid-ossp";

-- Users (extends Supabase auth.users)
create table public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null,
  email          text not null,
  class_number   int not null check (class_number between 6 and 10),
  board          text not null default 'CBSE',
  subjects       text[] not null default '{}',
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
comment on table public.users is 'Student profiles, one per auth user.';

-- Topics (seed data — NCERT content index)
create table public.topics (
  id             uuid primary key default uuid_generate_v4(),
  subject        text not null,
  class_number   int not null check (class_number between 6 and 10),
  chapter_name   text not null,
  chapter_number int not null,
  topic_name     text not null,
  topic_order    int not null,
  ncert_ref      text,
  created_at     timestamptz not null default now(),
  unique (subject, class_number, chapter_number, topic_order)
);
comment on table public.topics is 'NCERT syllabus index. Seed data, read-only for students.';

-- Sessions (one per topic attempt)
create table public.sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  topic_id     uuid not null references public.topics(id) on delete restrict,
  mode         text not null check (mode in ('web', 'voice_web', 'simcall')),
  status       text not null default 'in_progress'
                 check (status in ('in_progress', 'completed', 'revisiting')),
  score_pct    int check (score_pct between 0 and 100),
  attempts     int not null default 1,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);
comment on table public.sessions is 'One row per topic attempt per student.';

-- Messages (conversation transcript per session)
create table public.messages (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  role         text not null check (role in ('tutor', 'student')),
  content      text not null,
  content_type text not null default 'text'
                 check (content_type in ('text', 'audio_transcript', 'explanation')),
  sent_at      timestamptz not null default now()
);
comment on table public.messages is 'Full conversation transcript per session.';

-- Flashcards (generated per topic, reused across students)
create table public.flashcards (
  id         uuid primary key default uuid_generate_v4(),
  topic_id   uuid not null references public.topics(id) on delete cascade,
  front      text not null,
  back       text not null,
  difficulty text not null default 'medium'
               check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);
comment on table public.flashcards is 'AI-generated flashcards per topic.';

-- Quiz attempts
create table public.quiz_attempts (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  questions  jsonb not null default '[]',
  answers    jsonb not null default '[]',
  score_pct  int not null check (score_pct between 0 and 100),
  level      text not null check (level in ('topic', 'chapter')),
  taken_at   timestamptz not null default now()
);
comment on table public.quiz_attempts is 'Quiz results — topic-level and chapter-level.';

-- Chapter progress (aggregated per user per chapter)
create table public.chapter_progress (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.users(id) on delete cascade,
  subject            text not null,
  class_number       int not null check (class_number between 6 and 10),
  chapter_number     int not null,
  topics_total       int not null default 0,
  topics_done        int not null default 0,
  chapter_complete   boolean not null default false,
  chapter_quiz_score int check (chapter_quiz_score between 0 and 100),
  completed_at       timestamptz,
  unique (user_id, subject, class_number, chapter_number)
);
comment on table public.chapter_progress is 'Aggregated progress per user per chapter.';

-- INDEXES
create index on public.sessions (user_id);
create index on public.sessions (topic_id);
create index on public.messages (session_id, sent_at);
create index on public.quiz_attempts (user_id);
create index on public.quiz_attempts (session_id);
create index on public.chapter_progress (user_id);
create index on public.flashcards (topic_id);
create index on public.topics (class_number, subject);

-- ROW LEVEL SECURITY
alter table public.users            enable row level security;
alter table public.topics           enable row level security;
alter table public.sessions         enable row level security;
alter table public.messages         enable row level security;
alter table public.flashcards       enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.chapter_progress enable row level security;

-- users policies
create policy "users: select own" on public.users for select using (auth.uid() = id);
create policy "users: insert own" on public.users for insert with check (auth.uid() = id);
create policy "users: update own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users: no delete" on public.users for delete using (false);

-- topics policies
create policy "topics: authenticated read" on public.topics for select using (auth.role() = 'authenticated');
create policy "topics: service role insert" on public.topics for insert with check (auth.role() = 'service_role');
create policy "topics: service role update" on public.topics for update using (auth.role() = 'service_role');
create policy "topics: service role delete" on public.topics for delete using (auth.role() = 'service_role');

-- sessions policies
create policy "sessions: select own" on public.sessions for select using (auth.uid() = user_id);
create policy "sessions: insert own" on public.sessions for insert with check (auth.uid() = user_id);
create policy "sessions: update own" on public.sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions: no delete" on public.sessions for delete using (false);

-- messages policies
create policy "messages: select own sessions" on public.messages for select using (exists (select 1 from public.sessions s where s.id = messages.session_id and s.user_id = auth.uid()));
create policy "messages: insert own sessions" on public.messages for insert with check (exists (select 1 from public.sessions s where s.id = messages.session_id and s.user_id = auth.uid()));
create policy "messages: no update" on public.messages for update using (false);
create policy "messages: no delete" on public.messages for delete using (false);

-- flashcards policies
create policy "flashcards: authenticated read" on public.flashcards for select using (auth.role() = 'authenticated');
create policy "flashcards: service role insert" on public.flashcards for insert with check (auth.role() = 'service_role');
create policy "flashcards: service role update" on public.flashcards for update using (auth.role() = 'service_role');
create policy "flashcards: service role delete" on public.flashcards for delete using (auth.role() = 'service_role');

-- quiz_attempts policies
create policy "quiz_attempts: select own" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "quiz_attempts: insert own" on public.quiz_attempts for insert with check (auth.uid() = user_id);
create policy "quiz_attempts: no update" on public.quiz_attempts for update using (false);
create policy "quiz_attempts: no delete" on public.quiz_attempts for delete using (false);

-- chapter_progress policies
create policy "chapter_progress: select own" on public.chapter_progress for select using (auth.uid() = user_id);
create policy "chapter_progress: insert own" on public.chapter_progress for insert with check (auth.uid() = user_id);
create policy "chapter_progress: update own" on public.chapter_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chapter_progress: no delete" on public.chapter_progress for delete using (false);

-- AUTO-UPDATE last_active_at ON SESSION INSERT
create or replace function public.touch_user_active()
returns trigger language plpgsql security definer as $$
begin
  update public.users set last_active_at = now() where id = new.user_id;
  return new;
end;
$$;

create trigger trg_touch_user_active
after insert on public.sessions
for each row execute procedure public.touch_user_active();

-- AUTO-UPDATE chapter_progress ON SESSION COMPLETE
create or replace function public.sync_chapter_progress()
returns trigger language plpgsql security definer as $$
declare
  v_topic   public.topics%rowtype;
  v_total   int;
  v_done    int;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select * into v_topic from public.topics where id = new.topic_id;

    select count(*) into v_total
    from public.topics
    where subject = v_topic.subject
      and class_number = v_topic.class_number
      and chapter_number = v_topic.chapter_number;

    select count(distinct t.id) into v_done
    from public.sessions s
    join public.topics t on t.id = s.topic_id
    where s.user_id = new.user_id
      and s.status = 'completed'
      and t.subject = v_topic.subject
      and t.class_number = v_topic.class_number
      and t.chapter_number = v_topic.chapter_number;

    insert into public.chapter_progress (
      user_id, subject, class_number, chapter_number,
      topics_total, topics_done, chapter_complete
    ) values (
      new.user_id, v_topic.subject, v_topic.class_number, v_topic.chapter_number,
      v_total, v_done, v_done >= v_total
    )
    on conflict (user_id, subject, class_number, chapter_number)
    do update set
      topics_total = excluded.topics_total,
      topics_done = excluded.topics_done,
      chapter_complete = excluded.chapter_complete,
      completed_at = case when excluded.chapter_complete then now() else null end;
  end if;
  return new;
end;
$$;

create trigger trg_sync_chapter_progress
after update on public.sessions
for each row execute procedure public.sync_chapter_progress();
