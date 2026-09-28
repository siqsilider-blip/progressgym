-- ============================================================================
-- Progrezzia - nucleo de seguimiento entrenador/alumno
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el codigo.
-- Idempotente. Agrega conversaciones, mensajes, feedback post-entrenamiento
-- y notificaciones internas con RLS estricta.
-- ============================================================================

begin;

create table if not exists public.coaching_conversations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, student_id)
);

create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coaching_conversations(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('trainer', 'student')),
  topic text not null default 'general'
    check (topic in ('general', 'question', 'pain', 'equipment', 'technique', 'alternative')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  routine_day_exercise_id uuid references public.routine_day_exercises(id) on delete set null,
  workout_session_id uuid references public.workout_sessions(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_feedback (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  energy smallint check (energy between 1 and 5),
  difficulty smallint check (difficulty between 1 and 5),
  had_pain boolean not null default false,
  pain_details text check (pain_details is null or char_length(pain_details) <= 1000),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  href text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists coaching_conversations_trainer_activity_idx
  on public.coaching_conversations (trainer_id, last_message_at desc nulls last);
create index if not exists coaching_conversations_student_idx
  on public.coaching_conversations (student_id);
create index if not exists coaching_messages_conversation_created_idx
  on public.coaching_messages (conversation_id, created_at);
create index if not exists coaching_messages_unread_idx
  on public.coaching_messages (conversation_id, created_at)
  where read_at is null;
create index if not exists workout_feedback_trainer_created_idx
  on public.workout_feedback (trainer_id, created_at desc);
create index if not exists workout_feedback_student_created_idx
  on public.workout_feedback (student_id, created_at desc);
create index if not exists internal_notifications_recipient_unread_idx
  on public.internal_notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.coaching_conversations enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.workout_feedback enable row level security;
alter table public.internal_notifications enable row level security;

drop policy if exists coaching_conversations_select_participants on public.coaching_conversations;
create policy coaching_conversations_select_participants
on public.coaching_conversations for select to authenticated
using (
  trainer_id = auth.uid()
  or student_id = public.auth_student_id()
);

drop policy if exists coaching_conversations_insert_participants on public.coaching_conversations;
create policy coaching_conversations_insert_participants
on public.coaching_conversations for insert to authenticated
with check (
  (
    trainer_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = coaching_conversations.student_id
        and s.trainer_id = auth.uid()
    )
  )
  or (
    student_id = public.auth_student_id()
    and exists (
      select 1 from public.students s
      where s.id = coaching_conversations.student_id
        and s.trainer_id = coaching_conversations.trainer_id
    )
  )
);

-- Las conversaciones solo se modifican mediante funciones SECURITY DEFINER.
-- Así un cliente no puede cambiar trainer_id o student_id desde la API.
drop policy if exists coaching_conversations_update_participants on public.coaching_conversations;

drop policy if exists coaching_messages_select_participants on public.coaching_messages;
create policy coaching_messages_select_participants
on public.coaching_messages for select to authenticated
using (
  exists (
    select 1 from public.coaching_conversations c
    where c.id = coaching_messages.conversation_id
      and (c.trainer_id = auth.uid() or c.student_id = public.auth_student_id())
  )
);

drop policy if exists coaching_messages_insert_participants on public.coaching_messages;
create policy coaching_messages_insert_participants
on public.coaching_messages for insert to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1 from public.coaching_conversations c
    where c.id = coaching_messages.conversation_id
      and (
        (sender_role = 'trainer' and c.trainer_id = auth.uid())
        or (sender_role = 'student' and c.student_id = public.auth_student_id())
      )
  )
);

drop policy if exists workout_feedback_select_participants on public.workout_feedback;
create policy workout_feedback_select_participants
on public.workout_feedback for select to authenticated
using (
  trainer_id = auth.uid()
  or student_id = public.auth_student_id()
);

drop policy if exists workout_feedback_insert_participants on public.workout_feedback;
create policy workout_feedback_insert_participants
on public.workout_feedback for insert to authenticated
with check (
  (
    trainer_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = workout_feedback.student_id and s.trainer_id = auth.uid()
    )
  )
  or (
    student_id = public.auth_student_id()
    and exists (
      select 1 from public.students s
      where s.id = workout_feedback.student_id
        and s.trainer_id = workout_feedback.trainer_id
    )
  )
);

drop policy if exists workout_feedback_update_participants on public.workout_feedback;
create policy workout_feedback_update_participants
on public.workout_feedback for update to authenticated
using (
  trainer_id = auth.uid()
  or student_id = public.auth_student_id()
)
with check (
  (
    trainer_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = workout_feedback.student_id and s.trainer_id = auth.uid()
    )
  )
  or (
    student_id = public.auth_student_id()
    and exists (
      select 1 from public.students s
      where s.id = workout_feedback.student_id
        and s.trainer_id = workout_feedback.trainer_id
    )
  )
);

drop policy if exists internal_notifications_select_own on public.internal_notifications;
create policy internal_notifications_select_own
on public.internal_notifications for select to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists internal_notifications_update_own on public.internal_notifications;
create policy internal_notifications_update_own
on public.internal_notifications for update to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

create or replace function public.ensure_coaching_conversation(p_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_trainer_id uuid;
  v_conversation_id uuid;
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  select s.trainer_id into v_trainer_id
  from public.students s
  where s.id = p_student_id;

  if v_trainer_id is null or not (
    v_caller = v_trainer_id or public.auth_student_id() = p_student_id
  ) then
    raise exception 'No autorizado para abrir esta conversación.';
  end if;

  insert into public.coaching_conversations (trainer_id, student_id)
  values (v_trainer_id, p_student_id)
  on conflict (trainer_id, student_id)
  do update set updated_at = now(), status = 'active'
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.ensure_coaching_conversation(uuid) from public;
grant execute on function public.ensure_coaching_conversation(uuid) to authenticated;

create or replace function public.mark_coaching_messages_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_updated integer := 0;
begin
  if v_caller is null or not exists (
    select 1 from public.coaching_conversations c
    where c.id = p_conversation_id
      and (c.trainer_id = v_caller or c.student_id = public.auth_student_id())
  ) then
    raise exception 'No autorizado para leer esta conversación.';
  end if;

  update public.coaching_messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_user_id is distinct from v_caller
    and read_at is null;

  get diagnostics v_updated = row_count;

  update public.internal_notifications
  set read_at = now()
  where recipient_user_id = v_caller
    and entity_type = 'conversation'
    and entity_id = p_conversation_id
    and read_at is null;

  return v_updated;
end;
$$;

revoke all on function public.mark_coaching_messages_read(uuid) from public;
grant execute on function public.mark_coaching_messages_read(uuid) to authenticated;

create or replace function public.touch_coaching_conversation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.coaching_conversations
  set last_message_at = new.created_at, updated_at = now(), status = 'active'
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_coaching_conversation on public.coaching_messages;
create trigger trg_touch_coaching_conversation
after insert on public.coaching_messages
for each row execute function public.touch_coaching_conversation();

create or replace function public.create_coaching_message_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_recipient uuid;
  v_student_id uuid;
  v_title text;
begin
  select
    c.student_id,
    case
      when new.sender_role = 'student' then c.trainer_id
      else (
        select p.id
        from public.profiles p
        where p.student_id = c.student_id and p.role = 'student'
        limit 1
      )
    end
  into v_student_id, v_recipient
  from public.coaching_conversations c
  where c.id = new.conversation_id;

  if v_recipient is null then
    return new;
  end if;

  v_title := case
    when new.topic = 'pain' then 'Molestia informada'
    when new.topic = 'equipment' then 'Problema con el equipo'
    when new.topic = 'technique' then 'Consulta de técnica'
    when new.topic = 'alternative' then 'Solicitud de alternativa'
    when new.sender_role = 'student' then 'Nueva consulta de alumno'
    else 'Respuesta de tu entrenador'
  end;

  insert into public.internal_notifications (
    recipient_user_id,
    actor_user_id,
    type,
    title,
    body,
    href,
    entity_type,
    entity_id
  ) values (
    v_recipient,
    new.sender_user_id,
    'coaching_message',
    v_title,
    left(new.body, 180),
    case
      when new.sender_role = 'student' then '/dashboard/messages?student=' || v_student_id::text
      else '/app/messages'
    end,
    'conversation',
    new.conversation_id
  );

  return new;
end;
$$;

drop trigger if exists trg_create_coaching_message_notification on public.coaching_messages;
create trigger trg_create_coaching_message_notification
after insert on public.coaching_messages
for each row execute function public.create_coaching_message_notification();

create or replace function public.touch_workout_feedback()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_workout_feedback on public.workout_feedback;
create trigger trg_touch_workout_feedback
before update on public.workout_feedback
for each row execute function public.touch_workout_feedback();

create or replace function public.create_workout_feedback_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_name text;
begin
  select btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
  into v_student_name
  from public.students s
  where s.id = new.student_id;

  insert into public.internal_notifications (
    recipient_user_id,
    type,
    title,
    body,
    href,
    entity_type,
    entity_id
  ) values (
    new.trainer_id,
    'workout_feedback',
    case when new.had_pain then 'Molestia después del entrenamiento' else 'Nuevo control de entrenamiento' end,
    case
      when new.had_pain then coalesce(nullif(btrim(new.pain_details), ''), v_student_name || ' indicó una molestia.')
      else v_student_name || ' completó su evaluación del entrenamiento.'
    end,
    '/dashboard/students/' || new.student_id::text,
    'workout_feedback',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_create_workout_feedback_notification on public.workout_feedback;
create trigger trg_create_workout_feedback_notification
after insert on public.workout_feedback
for each row execute function public.create_workout_feedback_notification();

commit;
