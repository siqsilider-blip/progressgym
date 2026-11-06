begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_feedback'
      and column_name = 'reviewed_at'
  ) then
    alter table public.workout_feedback
      add column reviewed_at timestamptz;

    -- Los controles anteriores a esta funcionalidad ya fueron atendidos por el
    -- flujo histórico. Solo los nuevos deben aparecer como pendientes.
    update public.workout_feedback
    set reviewed_at = coalesce(updated_at, created_at, now());
  end if;
end;
$$;

create index if not exists workout_feedback_trainer_pending_idx
  on public.workout_feedback (trainer_id, created_at desc)
  where reviewed_at is null;

create or replace function public.touch_workout_feedback()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if row(
    new.energy,
    new.difficulty,
    new.had_pain,
    new.pain_details,
    new.comment
  ) is distinct from row(
    old.energy,
    old.difficulty,
    old.had_pain,
    old.pain_details,
    old.comment
  ) then
    new.reviewed_at := null;
  elsif auth.uid() is distinct from old.trainer_id then
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;

create or replace function public.create_workout_feedback_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_name text;
  v_title text;
  v_body text;
begin
  -- En una actualización solo avisamos cuando cambió el contenido real.
  if tg_op = 'UPDATE' and not (
    row(new.energy, new.difficulty, new.had_pain, new.pain_details, new.comment)
    is distinct from
    row(old.energy, old.difficulty, old.had_pain, old.pain_details, old.comment)
  ) then
    return new;
  end if;

  select btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
  into v_student_name
  from public.students s
  where s.id = new.student_id;

  v_student_name := coalesce(nullif(v_student_name, ''), 'Un alumno');
  v_title := case
    when new.had_pain then 'Molestia después del entrenamiento'
    else 'Nuevo control de entrenamiento'
  end;
  v_body := case
    when new.had_pain then coalesce(
      nullif(btrim(new.pain_details), ''),
      v_student_name || ' indicó una molestia.'
    )
    else v_student_name || ' completó su evaluación del entrenamiento.'
  end;

  -- Si ya hay una alerta sin leer de esta evaluación, la actualizamos en vez
  -- de llenar la bandeja con duplicados. Si fue leída, se crea una alerta nueva.
  update public.internal_notifications
  set
    title = v_title,
    body = v_body,
    href = '/dashboard/messages?student=' || new.student_id::text,
    created_at = now()
  where recipient_user_id = new.trainer_id
    and type = 'workout_feedback'
    and entity_type = 'workout_feedback'
    and entity_id = new.id
    and read_at is null;

  if not found then
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
      v_title,
      v_body,
      '/dashboard/messages?student=' || new.student_id::text,
      'workout_feedback',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_workout_feedback_notification on public.workout_feedback;
create trigger trg_create_workout_feedback_notification
after insert or update of energy, difficulty, had_pain, pain_details, comment on public.workout_feedback
for each row execute function public.create_workout_feedback_notification();

create or replace function public.mark_workout_feedback_reviewed(p_feedback_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_updated_id uuid;
begin
  if v_caller is null then
    return false;
  end if;

  update public.workout_feedback
  set reviewed_at = now()
  where id = p_feedback_id
    and trainer_id = v_caller
  returning id into v_updated_id;

  if v_updated_id is null then
    return false;
  end if;

  update public.internal_notifications
  set read_at = coalesce(read_at, now())
  where recipient_user_id = v_caller
    and type = 'workout_feedback'
    and entity_type = 'workout_feedback'
    and entity_id = p_feedback_id;

  return true;
end;
$$;

revoke all on function public.mark_workout_feedback_reviewed(uuid) from public;
grant execute on function public.mark_workout_feedback_reviewed(uuid) to authenticated;

alter table if exists public.student_follow_ups
  drop constraint if exists student_follow_ups_alert_type_check;

alter table if exists public.student_follow_ups
  add constraint student_follow_ups_alert_type_check
  check (
    alert_type in (
      'inactive',
      'no_routine',
      'new_student',
      'unfinished_session',
      'program_ending',
      'weekly_checkin',
      'missing_checkin',
      'progress_photo_due',
      'workout_pain'
    )
  );

commit;
