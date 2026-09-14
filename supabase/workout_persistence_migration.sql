-- ============================================================================
-- Progrezzia - guardado confiable de entrenamientos
--
-- Ejecutar manualmente en Supabase SQL Editor.
-- No elimina ni corrige datos existentes: si detecta duplicados, aborta toda
-- la transaccion para que puedan revisarse antes de crear los indices unicos.
-- ============================================================================

begin;

do $$
begin
  if exists (
    select 1
    from public.exercise_logs
    where workout_session_id is not null and set_index is not null
    group by workout_session_id, routine_day_exercise_id, set_index
    having count(*) > 1
  ) then
    raise exception 'Hay series duplicadas. Revisarlas antes de aplicar workout_persistence_migration.sql.';
  end if;

  if exists (
    select 1
    from public.workout_sessions
    where status = 'in_progress'
    group by student_id, routine_day_id
    having count(*) > 1
  ) then
    raise exception 'Hay sesiones activas duplicadas. Revisarlas antes de aplicar workout_persistence_migration.sql.';
  end if;
end $$;

create unique index if not exists exercise_logs_one_set_per_session
  on public.exercise_logs (workout_session_id, routine_day_exercise_id, set_index)
  where workout_session_id is not null and set_index is not null;

create unique index if not exists workout_sessions_one_active_per_day
  on public.workout_sessions (student_id, routine_day_id)
  where status = 'in_progress';

create or replace function public.start_workout_session_safe(
  p_student_id uuid,
  p_routine_day_id uuid,
  p_performed_date date default current_date
)
returns table(session_id uuid, resumed boolean, just_completed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_trainer_id uuid;
  v_session_id uuid;
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
    raise exception 'No autorizado para iniciar este entrenamiento.';
  end if;

  if not exists (
    select 1
    from public.routine_days rd
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rd.id = p_routine_day_id
      and sr.student_id = p_student_id
      and (sr.status = 'active' or sr.status is null)
  ) then
    raise exception 'El dia no pertenece al programa activo del alumno.';
  end if;

  -- Serializa intentos simultaneos para el mismo alumno y dia.
  perform pg_advisory_xact_lock(
    hashtextextended(p_student_id::text || ':' || p_routine_day_id::text, 0)
  );

  select ws.id into v_session_id
  from public.workout_sessions ws
  where ws.student_id = p_student_id
    and ws.routine_day_id = p_routine_day_id
    and ws.status = 'in_progress'
  order by ws.started_at desc
  limit 1;

  if v_session_id is not null then
    return query select v_session_id, true, false;
    return;
  end if;

  select ws.id into v_session_id
  from public.workout_sessions ws
  where ws.student_id = p_student_id
    and ws.routine_day_id = p_routine_day_id
    and ws.status = 'completed'
    and ws.finished_at >= now() - interval '10 minutes'
  order by ws.finished_at desc
  limit 1;

  if v_session_id is not null then
    return query select v_session_id, false, true;
    return;
  end if;

  insert into public.workout_sessions (
    student_id, trainer_id, routine_day_id, status, performed_date, started_at
  ) values (
    p_student_id, v_trainer_id, p_routine_day_id, 'in_progress',
    coalesce(p_performed_date, current_date), now()
  )
  returning id into v_session_id;

  return query select v_session_id, false, false;
end;
$$;

create or replace function public.save_workout_set_safe(
  p_session_id uuid,
  p_routine_day_exercise_id uuid,
  p_set_index integer,
  p_weight numeric,
  p_reps integer,
  p_rpe numeric,
  p_performed_at date
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_student_id uuid;
  v_trainer_id uuid;
  v_action text;
begin
  if v_caller is null then raise exception 'No autenticado.'; end if;
  if p_set_index < 0 then raise exception 'Indice de serie invalido.'; end if;
  if p_weight is null and p_reps is null then
    raise exception 'Completa al menos peso o reps.';
  end if;

  select ws.student_id, ws.trainer_id
    into v_student_id, v_trainer_id
  from public.workout_sessions ws
  where ws.id = p_session_id and ws.status = 'in_progress';

  if v_student_id is null or not (
    v_caller = v_trainer_id or public.auth_student_id() = v_student_id
  ) then
    raise exception 'Sesion no encontrada o no autorizada.';
  end if;

  if not exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    join public.workout_sessions ws on ws.routine_day_id = rd.id
    where rde.id = p_routine_day_exercise_id and ws.id = p_session_id
  ) then
    raise exception 'El ejercicio no pertenece a esta sesion.';
  end if;

  if exists (
    select 1 from public.exercise_logs el
    where el.workout_session_id = p_session_id
      and el.routine_day_exercise_id = p_routine_day_exercise_id
      and el.set_index = p_set_index
  ) then
    v_action := 'updated';
  else
    v_action := 'inserted';
  end if;

  insert into public.exercise_logs (
    student_id, routine_day_exercise_id, workout_session_id,
    weight, reps, rpe, performed_at, set_index
  ) values (
    v_student_id, p_routine_day_exercise_id, p_session_id,
    p_weight, p_reps, p_rpe, coalesce(p_performed_at, current_date), p_set_index
  )
  on conflict (workout_session_id, routine_day_exercise_id, set_index)
    where workout_session_id is not null and set_index is not null
  do update set
    weight = excluded.weight,
    reps = excluded.reps,
    rpe = excluded.rpe,
    performed_at = excluded.performed_at;

  return v_action;
end;
$$;

revoke all on function public.start_workout_session_safe(uuid, uuid, date) from public;
revoke all on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) from public;
grant execute on function public.start_workout_session_safe(uuid, uuid, date) to authenticated;
grant execute on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) to authenticated;

commit;
