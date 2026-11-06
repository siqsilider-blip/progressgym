-- ============================================================================
-- Progrezzia - integridad de finalización de entrenamientos
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el código que
-- acompaña esta migración. Es idempotente.
-- ============================================================================

begin;

alter table public.workout_sessions
  add column if not exists completion_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_sessions_completion_status_check'
      and conrelid = 'public.workout_sessions'::regclass
  ) then
    alter table public.workout_sessions
      add constraint workout_sessions_completion_status_check
      check (completion_status is null or completion_status in ('complete', 'incomplete'));
  end if;
end
$$;

-- Las sesiones históricas cerradas explícitamente por el alumno se conservan
-- como completas. Los cierres automáticos continúan con estado NULL.
update public.workout_sessions
set completion_status = 'complete'
where status = 'completed'
  and completed_manually = true
  and completion_status is null;

create index if not exists workout_sessions_student_week_completion_idx
  on public.workout_sessions (student_id, performed_date, routine_day_id, completion_status)
  where status = 'completed' and completed_manually = true;

comment on column public.workout_sessions.completion_status is
  'complete: se registró todo el plan; incomplete: el alumno confirmó terminar con series pendientes; NULL: activa o cerrada automáticamente.';

-- Protege también las llamadas directas al RPC. La interfaz valida antes para
-- dar mensajes amigables, pero la base sigue siendo la fuente de verdad.
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
$$;

revoke all on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) from public;
grant execute on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date) to authenticated;

-- Toda escritura de series pasa por el RPC validado. Las lecturas continúan
-- protegidas por RLS para alumno y entrenador vinculados.
revoke insert, update, delete on table public.exercise_logs from anon, authenticated;
grant select on table public.exercise_logs to authenticated;

commit;

-- Verificación esperada:
-- select completion_status, count(*)
-- from public.workout_sessions
-- group by completion_status
-- order by completion_status nulls first;
