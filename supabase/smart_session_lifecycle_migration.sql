-- ============================================================================
-- Progrezzia - cierre inteligente de sesiones abandonadas
--
-- Ejecutar manualmente en Supabase SQL Editor.
-- Idempotente. Una sesión con series se conserva como actividad parcial; una
-- sesión vacía no completa ningún día. La duración termina en la última
-- actividad real y nunca en la hora tardía en la que corre el proceso.
-- ============================================================================

begin;

create or replace function public.close_stale_workout_sessions()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_closed integer := 0;
begin
  with session_activity as (
    select
      ws.id,
      ws.started_at,
      ws.performed_date,
      greatest(ws.started_at, coalesce(max(el.created_at), ws.started_at)) as last_activity_at
    from public.workout_sessions ws
    left join public.exercise_logs el on el.workout_session_id = ws.id
    where ws.status = 'in_progress'
    group by ws.id, ws.started_at, ws.performed_date
  ), stale_sessions as (
    select
      activity.id,
      activity.started_at,
      activity.last_activity_at
    from session_activity activity
    where
      activity.last_activity_at <= now() - interval '6 hours'
      or (
        activity.performed_date is distinct from
          (now() at time zone 'America/Argentina/Buenos_Aires')::date
        and activity.last_activity_at <= now() - interval '30 minutes'
      )
  ), closed as (
    update public.workout_sessions ws
    set
      status = 'completed',
      completed_manually = false,
      completion_status = null,
      finished_at = stale.last_activity_at,
      duration_seconds = least(
        14400,
        greatest(0, extract(epoch from (stale.last_activity_at - stale.started_at))::integer)
      )
    from stale_sessions stale
    where ws.id = stale.id
      and ws.status = 'in_progress'
    returning ws.id
  )
  select count(*)::integer into v_closed from closed;

  return v_closed;
end;
$function$;

revoke all on function public.close_stale_workout_sessions()
  from public, anon, authenticated;
grant execute on function public.close_stale_workout_sessions()
  to service_role;

comment on function public.close_stale_workout_sessions() is
  'Cierra sesiones sin actividad durante 6 h o de un día BA anterior tras 30 min; conserva la última actividad como finished_at.';

-- Reemplaza, si existe pg_cron, cualquier tarea anterior de cierre por una
-- única ejecución cada 15 minutos. Si la extensión no está habilitada, la
-- función queda instalada y la verificación final mostrará que falta el job.
do $schedule$
declare
  old_job record;
begin
  if to_regnamespace('cron') is not null and to_regclass('cron.job') is not null then
    for old_job in
      select jobid
      from cron.job
      where jobname = 'progrezzia-close-stale-workout-sessions'
         or command ilike '%close_abandoned_sessions%'
         or command ilike '%close_stale_workout_sessions%'
    loop
      perform cron.unschedule(old_job.jobid);
    end loop;

    perform cron.schedule(
      'progrezzia-close-stale-workout-sessions',
      '*/15 * * * *',
      'select public.close_stale_workout_sessions();'
    );
  end if;
end;
$schedule$;

commit;

-- Verificación:
-- select public.close_stale_workout_sessions() as sesiones_cerradas;
-- select jobid, jobname, schedule, command
-- from cron.job
-- where jobname = 'progrezzia-close-stale-workout-sessions';
