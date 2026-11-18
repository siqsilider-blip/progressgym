-- ============================================================================
-- Progrezzia - una sola eleccion de entrenamiento por dia
--
-- La alumna puede elegir cualquier entrenamiento pendiente de la semana.
-- Desde la primera serie guardada, esa eleccion queda fijada por ese dia.
-- Un entrenamiento con actividad no puede repetirse dentro de la misma semana
-- programatica. El entrenador conserva libertad para registrar/corregir datos.
--
-- Ejecutar manualmente en Supabase SQL Editor. Es idempotente.
-- ============================================================================

begin;

create or replace function public.start_workout_session_safe(
  p_student_id uuid,
  p_routine_day_id uuid,
  p_performed_date date default current_date,
  p_allow_completed boolean default false
)
returns table(session_id uuid, resumed boolean, just_completed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_caller uuid := auth.uid();
  v_auth_student_id uuid := public.auth_student_id();
  v_is_student boolean;
  v_trainer_id uuid;
  v_routine_id uuid;
  v_routine_week_id uuid;
  v_program_started_on date;
  v_effective_date date;
  v_week_start date;
  v_week_end date;
  v_elapsed_weeks integer;
  v_requested_week_ordinal integer;
  v_total_weeks integer;
  v_expected_week_ordinal integer;
  v_session_id uuid;
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  v_is_student := v_auth_student_id is not distinct from p_student_id;
  v_effective_date := case
    when v_is_student then (now() at time zone 'America/Argentina/Buenos_Aires')::date
    else coalesce(p_performed_date, (now() at time zone 'America/Argentina/Buenos_Aires')::date)
  end;

  select
    s.trainer_id,
    sr.routine_id,
    sr.program_started_on,
    rd.routine_week_id
  into
    v_trainer_id,
    v_routine_id,
    v_program_started_on,
    v_routine_week_id
  from public.students s
  join public.student_routines sr
    on sr.student_id = s.id
   and (sr.status = 'active' or sr.status is null)
  join public.routine_days rd
    on rd.routine_id = sr.routine_id
   and rd.id = p_routine_day_id
  where s.id = p_student_id
  order by (sr.status = 'active') desc, sr.assigned_at desc nulls last
  limit 1;

  if v_trainer_id is null or not (
    v_caller = v_trainer_id or v_is_student
  ) then
    raise exception 'No autorizado para iniciar este entrenamiento.';
  end if;

  if v_routine_id is null or v_routine_week_id is null then
    raise exception 'El dia no pertenece al programa activo del alumno.';
  end if;

  -- Un solo flujo de inicio/guardado por alumno, incluso con dos dispositivos.
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  if v_is_student then
    if v_program_started_on is null or v_effective_date < v_program_started_on then
      raise exception 'WORKOUT_WEEK_NOT_CURRENT';
    end if;

    v_elapsed_weeks := floor((v_effective_date - v_program_started_on)::numeric / 7)::integer;
    v_week_start := v_program_started_on + (v_elapsed_weeks * 7);
    v_week_end := v_week_start + 6;

    select ordered.week_ordinal, ordered.total_weeks
    into v_requested_week_ordinal, v_total_weeks
    from (
      select
        rw.id,
        (row_number() over (
          order by coalesce(rm.month_number, 0), rw.week_number, rw.id
        ))::integer as week_ordinal,
        (count(*) over ())::integer as total_weeks
      from public.routine_weeks rw
      left join public.routine_months rm on rm.id = rw.routine_month_id
      where rw.routine_id = v_routine_id
        and (
          not exists (
            select 1
            from public.routine_months existing_month
            where existing_month.routine_id = v_routine_id
          )
          or rw.routine_month_id is not null
        )
    ) ordered
    where ordered.id = v_routine_week_id;

    if v_requested_week_ordinal is null or v_total_weeks is null or v_total_weeks < 1 then
      raise exception 'WORKOUT_WEEK_NOT_CURRENT';
    end if;

    v_expected_week_ordinal := mod(v_elapsed_weeks, v_total_weeks) + 1;
    if v_requested_week_ordinal <> v_expected_week_ordinal then
      raise exception 'WORKOUT_WEEK_NOT_CURRENT';
    end if;
  end if;

  -- La misma eleccion activa de hoy siempre se reanuda.
  select ws.id
  into v_session_id
  from public.workout_sessions ws
  where ws.student_id = p_student_id
    and ws.routine_day_id = p_routine_day_id
    and ws.performed_date = v_effective_date
    and ws.status = 'in_progress'
  order by ws.started_at desc
  limit 1;

  if v_session_id is not null then
    return query select v_session_id, true, false;
    return;
  end if;

  -- Revisar/editar recupera solo una finalizacion explicita de esa fecha.
  if p_allow_completed then
    select ws.id
    into v_session_id
    from public.workout_sessions ws
    where ws.student_id = p_student_id
      and ws.routine_day_id = p_routine_day_id
      and ws.performed_date = v_effective_date
      and ws.status = 'completed'
      and ws.completed_manually = true
    order by ws.finished_at desc nulls last, ws.started_at desc
    limit 1;

    if v_session_id is not null then
      return query select v_session_id, false, true;
      return;
    end if;
  end if;

  if v_is_student then
    -- Una rutina distinta con actividad real hoy obliga a esperar hasta manana.
    if exists (
      select 1
      from public.workout_sessions ws
      where ws.student_id = p_student_id
        and ws.performed_date = v_effective_date
        and ws.routine_day_id is distinct from p_routine_day_id
        and (
          ws.completed_manually = true
          or exists (
            select 1
            from public.exercise_logs el
            where el.workout_session_id = ws.id
          )
        )
    ) then
      raise exception 'WORKOUT_NEXT_DAY_REQUIRED';
    end if;

    -- La misma rutina no se repite si ya tuvo actividad en esta semana.
    if exists (
      select 1
      from public.workout_sessions ws
      where ws.student_id = p_student_id
        and ws.routine_day_id = p_routine_day_id
        and ws.performed_date between v_week_start and v_week_end
        and (
          ws.completed_manually = true
          or exists (
            select 1
            from public.exercise_logs el
            where el.workout_session_id = ws.id
          )
        )
    ) then
      raise exception 'WORKOUT_DAY_ALREADY_USED_THIS_WEEK';
    end if;
  end if;

  -- Cierra sesiones abandonadas. Una seleccion vacia de hoy puede cambiarse;
  -- una seleccion con series ya fue bloqueada arriba.
  update public.workout_sessions ws
  set
    status = 'completed',
    completed_manually = false,
    completion_status = null,
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
      or ws.performed_date is distinct from v_effective_date
    );

  insert into public.workout_sessions (
    student_id, trainer_id, routine_day_id, status, performed_date, started_at
  ) values (
    p_student_id, v_trainer_id, p_routine_day_id, 'in_progress',
    v_effective_date, now()
  )
  returning id into v_session_id;

  return query select v_session_id, false, false;
end;
$function$;

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
  v_auth_student_id uuid := public.auth_student_id();
  v_is_student boolean;
  v_student_id uuid;
  v_trainer_id uuid;
  v_routine_day_id uuid;
  v_session_date date;
  v_session_status text;
  v_routine_id uuid;
  v_routine_week_id uuid;
  v_program_started_on date;
  v_week_start date;
  v_week_end date;
  v_elapsed_weeks integer;
  v_requested_week_ordinal integer;
  v_total_weeks integer;
  v_expected_week_ordinal integer;
  v_planned_sets integer;
  v_session_has_activity boolean := false;
  v_action text;
begin
  if v_caller is null then raise exception 'No autenticado.'; end if;
  if p_set_index is null or p_set_index < 0 then
    raise exception 'Indice de serie invalido.';
  end if;
  if p_reps is null or p_reps <= 0 then
    raise exception 'Ingresa las repeticiones o minutos realizados.';
  end if;
  if p_weight is not null and p_weight < 0 then
    raise exception 'El peso no puede ser negativo.';
  end if;
  if p_rpe is not null and (p_rpe < 1 or p_rpe > 10) then
    raise exception 'El esfuerzo debe estar entre 1 y 10.';
  end if;

  select
    ws.student_id,
    s.trainer_id,
    ws.routine_day_id,
    ws.performed_date,
    ws.status
  into
    v_student_id,
    v_trainer_id,
    v_routine_day_id,
    v_session_date,
    v_session_status
  from public.workout_sessions ws
  join public.students s on s.id = ws.student_id
  where ws.id = p_session_id
    and ws.status in ('in_progress', 'completed');

  v_is_student := v_auth_student_id is not distinct from v_student_id;

  if v_student_id is null or (
    v_caller is distinct from v_trainer_id
    and not v_is_student
  ) then
    raise exception 'Sesion no encontrada o no autorizada.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_student_id::text, 0));

  select greatest(1, coalesce(rde.sets, 1))
  into v_planned_sets
  from public.routine_day_exercises rde
  where rde.id = p_routine_day_exercise_id
    and rde.routine_day_id = v_routine_day_id
  limit 1;

  if v_planned_sets is null then
    raise exception 'El ejercicio no pertenece a esta sesion.';
  end if;
  if p_set_index >= v_planned_sets then
    raise exception 'La serie indicada no pertenece al plan.';
  end if;

  if v_is_student and v_session_status in ('in_progress', 'completed') then
    select exists (
      select 1
      from public.exercise_logs current_log
      where current_log.workout_session_id = p_session_id
    ) into v_session_has_activity;

    if not v_session_has_activity
       and v_session_date is distinct from (now() at time zone 'America/Argentina/Buenos_Aires')::date
    then
      raise exception 'WORKOUT_SESSION_EXPIRED';
    end if;

    -- Una sesion ya iniciada puede seguir editandose. Para una sesion vacia,
    -- la primera serie que se guarde es la que gana la eleccion del dia.
    if not v_session_has_activity and exists (
      select 1
      from public.workout_sessions other_ws
      where other_ws.student_id = v_student_id
        and other_ws.id <> p_session_id
        and other_ws.performed_date = v_session_date
        and other_ws.routine_day_id is distinct from v_routine_day_id
        and (
          other_ws.completed_manually = true
          or exists (
            select 1
            from public.exercise_logs other_log
            where other_log.workout_session_id = other_ws.id
          )
        )
    ) then
      raise exception 'WORKOUT_NEXT_DAY_REQUIRED';
    end if;

    if not v_session_has_activity then
      select
        sr.routine_id,
        sr.program_started_on,
        rd.routine_week_id
      into
        v_routine_id,
        v_program_started_on,
        v_routine_week_id
      from public.student_routines sr
      join public.routine_days rd
        on rd.routine_id = sr.routine_id
       and rd.id = v_routine_day_id
      where sr.student_id = v_student_id
        and (sr.status = 'active' or sr.status is null)
      order by (sr.status = 'active') desc, sr.assigned_at desc nulls last
      limit 1;

      if v_routine_id is null
         or v_routine_week_id is null
         or v_program_started_on is null
         or v_session_date < v_program_started_on
      then
        raise exception 'WORKOUT_WEEK_NOT_CURRENT';
      end if;

      v_elapsed_weeks := floor((v_session_date - v_program_started_on)::numeric / 7)::integer;
      v_week_start := v_program_started_on + (v_elapsed_weeks * 7);
      v_week_end := v_week_start + 6;

      select ordered.week_ordinal, ordered.total_weeks
      into v_requested_week_ordinal, v_total_weeks
      from (
        select
          rw.id,
          (row_number() over (
            order by coalesce(rm.month_number, 0), rw.week_number, rw.id
          ))::integer as week_ordinal,
          (count(*) over ())::integer as total_weeks
        from public.routine_weeks rw
        left join public.routine_months rm on rm.id = rw.routine_month_id
        where rw.routine_id = v_routine_id
          and (
            not exists (
              select 1
              from public.routine_months existing_month
              where existing_month.routine_id = v_routine_id
            )
            or rw.routine_month_id is not null
          )
      ) ordered
      where ordered.id = v_routine_week_id;

      if v_requested_week_ordinal is null or v_total_weeks is null or v_total_weeks < 1 then
        raise exception 'WORKOUT_WEEK_NOT_CURRENT';
      end if;

      v_expected_week_ordinal := mod(v_elapsed_weeks, v_total_weeks) + 1;
      if v_requested_week_ordinal <> v_expected_week_ordinal then
        raise exception 'WORKOUT_WEEK_NOT_CURRENT';
      end if;

      if exists (
        select 1
        from public.workout_sessions other_ws
        where other_ws.student_id = v_student_id
          and other_ws.id <> p_session_id
          and other_ws.routine_day_id = v_routine_day_id
          and other_ws.performed_date between v_week_start and v_week_end
          and (
            other_ws.completed_manually = true
            or exists (
              select 1
              from public.exercise_logs other_log
              where other_log.workout_session_id = other_ws.id
            )
          )
      ) then
        raise exception 'WORKOUT_DAY_ALREADY_USED_THIS_WEEK';
      end if;
    end if;
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
    student_id, routine_day_exercise_id, workout_session_id,
    weight, reps, rpe, performed_at, set_index
  ) values (
    v_student_id, p_routine_day_exercise_id, p_session_id,
    p_weight, p_reps, p_rpe,
    case when v_is_student then v_session_date else coalesce(p_performed_at, v_session_date) end,
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

revoke all on function public.start_workout_session_safe(uuid, uuid, date, boolean)
  from public, anon;
grant execute on function public.start_workout_session_safe(uuid, uuid, date, boolean)
  to authenticated;

revoke all on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date)
  from public, anon;
grant execute on function public.save_workout_set_safe(uuid, uuid, integer, numeric, integer, numeric, date)
  to authenticated;

commit;

-- Verificacion esperada: true, true, false, false.
select
  position('WORKOUT_NEXT_DAY_REQUIRED' in pg_get_functiondef(
    'public.start_workout_session_safe(uuid,uuid,date,boolean)'::regprocedure
  )) > 0 as daily_guard_installed,
  position('WORKOUT_DAY_ALREADY_USED_THIS_WEEK' in pg_get_functiondef(
    'public.start_workout_session_safe(uuid,uuid,date,boolean)'::regprocedure
  )) > 0 as weekly_guard_installed,
  has_function_privilege('anon', 'public.start_workout_session_safe(uuid,uuid,date,boolean)', 'EXECUTE') as anon_can_start,
  has_function_privilege('anon', 'public.save_workout_set_safe(uuid,uuid,integer,numeric,integer,numeric,date)', 'EXECUTE') as anon_can_save;
