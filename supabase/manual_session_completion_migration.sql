-- ============================================================================
-- Progrezzia - distinguir sesiones terminadas de cierres automáticos
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar este cambio.
-- Idempotente. Repara los cierres automáticos creados por la migración anterior.
-- ============================================================================

begin;

alter table public.workout_sessions
  add column if not exists completed_manually boolean;

-- Una finalización manual histórica tiene series y su finished_at fue grabado
-- por la acción de finalizar. Los cierres automáticos usan exactamente el
-- inicio o la fecha de la última serie, por lo que pueden reconocerse sin
-- eliminar información.
update public.workout_sessions ws
set completed_manually = case
  when ws.status = 'completed'
    and ws.finished_at is not null
    and exists (
      select 1
      from public.exercise_logs el
      where el.workout_session_id = ws.id
    )
    and ws.finished_at is distinct from ws.started_at
    and ws.finished_at is distinct from (
      select max(el.created_at)
      from public.exercise_logs el
      where el.workout_session_id = ws.id
    )
  then true
  else false
end
where ws.completed_manually is null;

alter table public.workout_sessions
  alter column completed_manually set default false;

alter table public.workout_sessions
  alter column completed_manually set not null;

create index if not exists workout_sessions_manual_completion_lookup
  on public.workout_sessions (student_id, performed_date, routine_day_id)
  where status = 'completed' and completed_manually = true;

comment on column public.workout_sessions.completed_manually is
  'True únicamente cuando el alumno o entrenador finalizó la sesión de manera explícita.';

commit;
