-- ============================================================================
-- Progrezzia - ciclo de vida confiable de sesiones
--
-- Ejecutar manualmente en Supabase SQL Editor.
-- Idempotente. Cierra sesiones abandonadas sin inflar su duración, permite una
-- sola sesión activa por alumno y habilita corregir series ya finalizadas.
-- ============================================================================

begin;

-- Conserva solamente la sesión más reciente de hoy por alumno. Las demás se
-- cierran en la última serie registrada (o en el inicio si estaban vacías).
with active_sessions as (
  select
    ws.id,
    ws.started_at,
    ws.performed_date,
    max(el.created_at) as last_activity_at,
    row_number() over (
      partition by ws.student_id
      order by
        (ws.performed_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date) desc,
        ws.started_at desc
    ) as student_rank
  from public.workout_sessions ws
  left join public.exercise_logs el on el.workout_session_id = ws.id
  where ws.status = 'in_progress'
  group by ws.id, ws.student_id, ws.started_at, ws.performed_date
), sessions_to_close as (
  select
    id,
    started_at,
    greatest(started_at, coalesce(last_activity_at, started_at)) as effective_finished_at
  from active_sessions
  where performed_date is distinct from (now() at time zone 'America/Argentina/Buenos_Aires')::date
     or student_rank > 1
)
update public.workout_sessions ws
set
  status = 'completed',
  finished_at = close_row.effective_finished_at,
  duration_seconds = least(
    14400,
    greatest(0, extract(epoch from (close_row.effective_finished_at - close_row.started_at))::integer)
  )
from sessions_to_close close_row
where ws.id = close_row.id;

drop index if exists public.workout_sessions_one_active_per_day;

create unique index if not exists workout_sessions_one_active_per_student
  on public.workout_sessions (student_id)
  where status = 'in_progress';

drop function if exists public.start_workout_session_safe(uuid, uuid, date);
drop function if exists public.start_workout_session_safe(uuid, uuid, date, boolean);

create function public.start_workout_session_safe(
  p_student_id uuid,
  p_routine_day_id uuid,
  p_performed_date date default current_date,
  p_allow_completed boolean default false
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
    raise exception 'El día no pertenece al programa activo del alumno.';
  end if;

  -- Un solo inicio simultáneo por alumno, incluso si toca dos días rápido.
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  -- Cambiar de día o volver al día siguiente cierra cualquier sesión anterior.
  update public.workout_sessions ws
  set
    status = 'completed',
    finished_at = greatest(
      ws.started_at,
      coalesce(
        (select max(el.created_at) from public.exercise_logs el where el.workout_session_id = ws.id),
        ws.started_at
      )
    ),
    duration_seconds = least(
      14400,
      greatest(
        0,
        extract(epoch from (
          greatest(
            ws.started_at,
            coalesce(
              (select max(el.created_at) from public.exercise_logs el where el.workout_session_id = ws.id),
              ws.started_at
            )
          ) - ws.started_at
        ))::integer
      )
    )
  where ws.student_id = p_student_id
    and ws.status = 'in_progress'
    and (
      ws.routine_day_id is distinct from p_routine_day_id
      or ws.performed_date is distinct from coalesce(p_performed_date, current_date)
    );

  select ws.id into v_session_id
  from public.workout_sessions ws
  where ws.student_id = p_student_id
    and ws.routine_day_id = p_routine_day_id
    and ws.performed_date = coalesce(p_performed_date, current_date)
    and ws.status = 'in_progress'
  order by ws.started_at desc
  limit 1;

  if v_session_id is not null then
    return query select v_session_id, true, false;
    return;
  end if;

  -- Solo se recupera una sesión terminada cuando el alumno eligió ese día de
  -- manera explícita para revisarlo o corregirlo.
  if p_allow_completed then
    select ws.id into v_session_id
    from public.workout_sessions ws
    where ws.student_id = p_student_id
      and ws.routine_day_id = p_routine_day_id
      and ws.status = 'completed'
    order by ws.performed_date desc, ws.finished_at desc nulls last, ws.started_at desc
    limit 1;

    if v_session_id is not null then
      return query select v_session_id, false, true;
      return;
    end if;
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
  if p_set_index < 0 then raise exception 'Índice de serie inválido.'; end if;
  if p_weight is null and p_reps is null then
    raise exception 'Completá al menos peso o reps.';
  end if;

  select ws.student_id, ws.trainer_id
    into v_student_id, v_trainer_id
  from public.workout_sessions ws
  where ws.id = p_session_id
    and ws.status in ('in_progress', 'completed');

  if v_student_id is null or not (
    v_caller = v_trainer_id or public.auth_student_id() = v_student_id
  ) then
    raise exception 'Sesión no encontrada o no autorizada.';
  end if;

  if not exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    join public.workout_sessions ws on ws.routine_day_id = rd.id
    where rde.id = p_routine_day_exercise_id and ws.id = p_session_id
  ) then
    raise exception 'El ejercicio no pertenece a esta sesión.';
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

revoke all on function public.start_workout_session_safe(uuid, uuid, date, boolean) from public;
revoke all on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) from public;
grant execute on function public.start_workout_session_safe(uuid, uuid, date, boolean) to authenticated;
grant execute on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) to authenticated;

commit;
