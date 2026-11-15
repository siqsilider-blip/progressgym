-- Progrezzia - escritura segura de sesiones de entrenamiento
--
-- Fase 1: agrega RPC para finalizar y guardar notas sin permitir alterar
-- fechas, duración, alumno o estados arbitrarios. No modifica sesiones
-- históricas ni revoca todavía las escrituras directas: el bloqueo se aplica
-- después del despliegue con workout_session_write_lockdown_migration.sql.

begin;

-- Reaplica la versión más reciente del guardado de series con autorización
-- null-safe y usando al entrenador actualmente vinculado al alumno.
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
as $function$
declare
  v_caller uuid := auth.uid();
  v_student_id uuid;
  v_current_trainer_id uuid;
  v_planned_sets integer;
  v_action text;
begin
  if v_caller is null then raise exception 'No autenticado.'; end if;
  if p_set_index is null or p_set_index < 0 then
    raise exception 'Índice de serie inválido.';
  end if;
  if p_reps is null or p_reps <= 0 then
    raise exception 'Ingresá las repeticiones o minutos realizados.';
  end if;
  if p_weight is not null and p_weight < 0 then
    raise exception 'El peso no puede ser negativo.';
  end if;
  if p_rpe is not null and (p_rpe < 1 or p_rpe > 10) then
    raise exception 'El esfuerzo debe estar entre 1 y 10.';
  end if;

  select ws.student_id, s.trainer_id
    into v_student_id, v_current_trainer_id
  from public.workout_sessions ws
  join public.students s on s.id = ws.student_id
  where ws.id = p_session_id
    and ws.status in ('in_progress', 'completed');

  if v_student_id is null or (
    v_caller is distinct from v_current_trainer_id
    and public.auth_student_id() is distinct from v_student_id
  ) then
    raise exception 'Sesión no encontrada o no autorizada.';
  end if;

  select greatest(1, coalesce(rde.sets, 1))
    into v_planned_sets
  from public.routine_day_exercises rde
  join public.workout_sessions ws on ws.routine_day_id = rde.routine_day_id
  where rde.id = p_routine_day_exercise_id
    and ws.id = p_session_id
  limit 1;

  if v_planned_sets is null then
    raise exception 'El ejercicio no pertenece a esta sesión.';
  end if;
  if p_set_index >= v_planned_sets then
    raise exception 'La serie indicada no pertenece al plan.';
  end if;

  if exists (
    select 1
    from public.exercise_logs el
    where el.workout_session_id = p_session_id
      and el.routine_day_exercise_id = p_routine_day_exercise_id
      and el.set_index = p_set_index
  ) then
    v_action := 'updated';
  else
    v_action := 'inserted';
  end if;

  insert into public.exercise_logs (
    student_id,
    routine_day_exercise_id,
    workout_session_id,
    weight,
    reps,
    rpe,
    performed_at,
    set_index
  ) values (
    v_student_id,
    p_routine_day_exercise_id,
    p_session_id,
    p_weight,
    p_reps,
    p_rpe,
    coalesce(p_performed_at, current_date),
    p_set_index
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
$function$;

revoke all on function public.save_workout_set_safe(
  uuid, uuid, integer, numeric, integer, numeric, date
) from public;
revoke all on function public.save_workout_set_safe(
  uuid, uuid, integer, numeric, integer, numeric, date
) from anon;
grant execute on function public.save_workout_set_safe(
  uuid, uuid, integer, numeric, integer, numeric, date
) to authenticated;

create or replace function public.finish_workout_session_safe(
  p_session_id uuid,
  p_allow_incomplete boolean default false
)
returns table(
  student_id uuid,
  duration_seconds integer,
  completed_sets integer,
  planned_sets integer,
  requires_confirmation boolean,
  completion_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_caller uuid := auth.uid();
  v_student_id uuid;
  v_current_trainer_id uuid;
  v_routine_day_id uuid;
  v_started_at timestamptz;
  v_status text;
  v_current_duration integer;
  v_planned_sets integer := 0;
  v_completed_sets integer := 0;
  v_effective_planned_sets integer := 0;
  v_latest_activity_at timestamptz;
  v_finished_at timestamptz;
  v_duration_seconds integer;
  v_completion_status text;
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  select
    ws.student_id,
    s.trainer_id,
    ws.routine_day_id,
    ws.started_at,
    ws.status,
    ws.duration_seconds
  into
    v_student_id,
    v_current_trainer_id,
    v_routine_day_id,
    v_started_at,
    v_status,
    v_current_duration
  from public.workout_sessions ws
  join public.students s on s.id = ws.student_id
  where ws.id = p_session_id
  for update;

  if v_student_id is null or (
    v_caller is distinct from v_current_trainer_id
    and public.auth_student_id() is distinct from v_student_id
  ) then
    raise exception 'Sesión no encontrada o no autorizada.';
  end if;

  if v_status is null or v_status not in ('in_progress', 'completed') then
    raise exception 'Estado de sesión inválido.';
  end if;

  select coalesce(
    sum(greatest(1, coalesce(rde.sets, 1))),
    0
  )::integer
  into v_planned_sets
  from public.routine_day_exercises rde
  where rde.routine_day_id = v_routine_day_id;

  select
    count(*)::integer,
    max(valid_set.latest_activity_at)
  into
    v_completed_sets,
    v_latest_activity_at
  from (
    select
      el.routine_day_exercise_id,
      el.set_index,
      max(el.created_at) as latest_activity_at
    from public.exercise_logs el
    join public.routine_day_exercises rde
      on rde.id = el.routine_day_exercise_id
     and rde.routine_day_id = v_routine_day_id
    where el.workout_session_id = p_session_id
      and el.set_index is not null
      and el.set_index >= 0
      and el.set_index < greatest(1, coalesce(rde.sets, 1))
      and el.reps is not null
      and el.reps > 0
    group by el.routine_day_exercise_id, el.set_index
  ) valid_set;

  v_effective_planned_sets := greatest(v_planned_sets, v_completed_sets);

  if v_completed_sets = 0 then
    raise exception 'No hay series registradas.';
  end if;

  v_completion_status := case
    when v_completed_sets < v_effective_planned_sets then 'incomplete'
    else 'complete'
  end;

  if v_completion_status = 'incomplete'
     and not coalesce(p_allow_incomplete, false) then
    return query
    select
      v_student_id,
      v_current_duration,
      v_completed_sets,
      v_effective_planned_sets,
      true,
      v_completion_status;
    return;
  end if;

  v_duration_seconds := v_current_duration;

  if v_status = 'in_progress' then
    v_latest_activity_at := coalesce(v_latest_activity_at, v_started_at);
    v_finished_at := case
      when now() - v_latest_activity_at <= interval '15 minutes' then now()
      else v_latest_activity_at
    end;
    v_finished_at := greatest(v_started_at, v_finished_at);
    v_duration_seconds := least(
      14400,
      greatest(
        0,
        extract(epoch from (v_finished_at - v_started_at))::integer
      )
    );
  end if;

  update public.workout_sessions ws
  set
    status = 'completed',
    completed_manually = true,
    completion_status = v_completion_status,
    finished_at = case
      when v_status = 'in_progress' then v_finished_at
      else ws.finished_at
    end,
    duration_seconds = case
      when v_status = 'in_progress' then v_duration_seconds
      else ws.duration_seconds
    end
  where ws.id = p_session_id;

  return query
  select
    v_student_id,
    v_duration_seconds,
    v_completed_sets,
    v_effective_planned_sets,
    false,
    v_completion_status;
end;
$function$;

create or replace function public.save_workout_session_note_safe(
  p_session_id uuid,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_caller uuid := auth.uid();
  v_student_id uuid;
  v_current_trainer_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  if char_length(coalesce(v_note, '')) > 2000 then
    raise exception 'La nota no puede superar los 2000 caracteres.';
  end if;

  select ws.student_id, s.trainer_id
  into v_student_id, v_current_trainer_id
  from public.workout_sessions ws
  join public.students s on s.id = ws.student_id
  where ws.id = p_session_id;

  if v_student_id is null or (
    v_caller is distinct from v_current_trainer_id
    and public.auth_student_id() is distinct from v_student_id
  ) then
    raise exception 'Sesión no encontrada o no autorizada.';
  end if;

  update public.workout_sessions ws
  set notes = v_note
  where ws.id = p_session_id;

  return found;
end;
$function$;

revoke all on function public.finish_workout_session_safe(uuid, boolean) from public;
revoke all on function public.finish_workout_session_safe(uuid, boolean) from anon;
grant execute on function public.finish_workout_session_safe(uuid, boolean) to authenticated;

revoke all on function public.save_workout_session_note_safe(uuid, text) from public;
revoke all on function public.save_workout_session_note_safe(uuid, text) from anon;
grant execute on function public.save_workout_session_note_safe(uuid, text) to authenticated;

commit;

select
  has_function_privilege(
    'authenticated',
    'public.finish_workout_session_safe(uuid,boolean)',
    'EXECUTE'
  ) as can_finish_session,
  has_function_privilege(
    'authenticated',
    'public.save_workout_session_note_safe(uuid,text)',
    'EXECUTE'
  ) as can_save_note;
