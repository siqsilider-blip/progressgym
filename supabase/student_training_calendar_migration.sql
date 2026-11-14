-- ============================================================================
-- Progrezzia - calendario real de entrenamientos
--
-- 1 = lunes ... 7 = domingo (ISO-8601).
-- El array de student_routines está ordenado por routine_days.day_index:
-- la primera posición corresponde al Día 1, la segunda al Día 2, etc.
--
-- Las asignaciones existentes quedan en NULL intencionalmente. La app debe
-- pedir confirmación; nunca asumir lunes/miércoles/viernes.
-- ============================================================================

begin;

create or replace function public.is_valid_training_weekdays(p_weekdays smallint[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select cardinality(p_weekdays) between 1 and 7
    and not exists (
      select 1
      from unnest(p_weekdays) as selected_days(weekday_value)
      where weekday_value < 1 or weekday_value > 7
    )
    and cardinality(p_weekdays) = (
      select count(distinct weekday_value)
      from unnest(p_weekdays) as selected_days(weekday_value)
    );
$function$;

alter table public.student_onboarding_profiles
  add column if not exists preferred_training_weekdays smallint[];

alter table public.student_onboarding_profiles
  drop constraint if exists student_onboarding_preferred_weekdays_check;

alter table public.student_onboarding_profiles
  add constraint student_onboarding_preferred_weekdays_check
  check (
    preferred_training_weekdays is null
    or public.is_valid_training_weekdays(preferred_training_weekdays)
  );

comment on column public.student_onboarding_profiles.preferred_training_weekdays is
  'Días habituales preferidos por el alumno. ISO: lunes=1, domingo=7.';

alter table public.student_routines
  add column if not exists training_weekdays smallint[];

alter table public.student_routines
  drop constraint if exists student_routines_training_weekdays_check;

alter table public.student_routines
  add constraint student_routines_training_weekdays_check
  check (
    training_weekdays is null
    or public.is_valid_training_weekdays(training_weekdays)
  );

comment on column public.student_routines.training_weekdays is
  'Snapshot de días ISO de esta asignación, ordenados por routine_days.day_index.';

-- Usa los días que realmente tienen ejercicios. days_per_week queda como
-- fallback para programas que todavía se están armando y no tienen ejercicios.
create or replace function public.get_routine_training_days_count(p_routine_id uuid)
returns integer
language sql
stable
set search_path = pg_catalog, public
as $function$
  select coalesce(
    (
      select max(week_days)::integer
      from (
        select count(distinct rd.day_index) as week_days
        from public.routine_days rd
        where rd.routine_id = p_routine_id
          and exists (
            select 1
            from public.routine_day_exercises rde
            where rde.routine_day_id = rd.id
          )
        group by rd.routine_week_id
      ) counted_weeks
    ),
    (
      select nullif(r.days_per_week, 0)::integer
      from public.routines r
      where r.id = p_routine_id
    ),
    0
  );
$function$;

-- Nueva versión para no romper clientes antiguos que todavía llaman al RPC
-- original. Solo la versión v2 exige y persiste días concretos.
create or replace function public.save_student_onboarding_v2(
  p_goals text[],
  p_experience_level text,
  p_training_days_per_week smallint,
  p_preferred_training_weekdays smallint[],
  p_session_minutes smallint,
  p_training_location text,
  p_available_equipment text[],
  p_limitations text,
  p_preferences text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid;
  v_trainer_id uuid;
  v_student_name text;
  v_already_completed boolean := false;
  v_assignment_id uuid;
  v_assignment_routine_id uuid;
  v_program_started_on date;
  v_expected_days integer;
  v_ordered_weekdays smallint[];
begin
  if p_preferred_training_weekdays is null
    or not public.is_valid_training_weekdays(p_preferred_training_weekdays)
    or cardinality(p_preferred_training_weekdays) <> p_training_days_per_week
  then
    raise exception 'Elegí exactamente % días de entrenamiento diferentes.', p_training_days_per_week;
  end if;

  select p.student_id, s.trainer_id,
    btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
  into v_student_id, v_trainer_id, v_student_name
  from public.profiles p
  join public.students s on s.id = p.student_id
  where p.id = v_user_id
    and p.role = 'student';

  if v_student_id is null or v_trainer_id is null then
    raise exception 'No se encontró el alumno vinculado';
  end if;

  select exists (
    select 1
    from public.student_onboarding_profiles o
    where o.student_id = v_student_id
      and o.completed_at is not null
  ) into v_already_completed;

  insert into public.student_onboarding_profiles (
    student_id,
    trainer_id,
    goals,
    experience_level,
    training_days_per_week,
    preferred_training_weekdays,
    session_minutes,
    training_location,
    available_equipment,
    limitations,
    preferences,
    completed_at
  ) values (
    v_student_id,
    v_trainer_id,
    p_goals,
    p_experience_level,
    p_training_days_per_week,
    p_preferred_training_weekdays,
    p_session_minutes,
    p_training_location,
    coalesce(p_available_equipment, '{}'::text[]),
    nullif(btrim(p_limitations), ''),
    nullif(btrim(p_preferences), ''),
    now()
  )
  on conflict (student_id) do update set
    trainer_id = excluded.trainer_id,
    goals = excluded.goals,
    experience_level = excluded.experience_level,
    training_days_per_week = excluded.training_days_per_week,
    preferred_training_weekdays = excluded.preferred_training_weekdays,
    session_minutes = excluded.session_minutes,
    training_location = excluded.training_location,
    available_equipment = excluded.available_equipment,
    limitations = excluded.limitations,
    preferences = excluded.preferences,
    completed_at = excluded.completed_at,
    updated_at = now();

  -- Si ya hay un programa activo compatible, la elección queda disponible en
  -- el calendario inmediatamente. Si la rutina tiene otra cantidad de días,
  -- no adivinamos: la pantalla de Rutina pedirá una configuración específica.
  select sr.id, sr.routine_id, sr.program_started_on
  into v_assignment_id, v_assignment_routine_id, v_program_started_on
  from public.student_routines sr
  where sr.student_id = v_student_id
    and sr.status = 'active'
  limit 1;

  if v_assignment_id is not null then
    v_expected_days := public.get_routine_training_days_count(v_assignment_routine_id);

    if v_expected_days = cardinality(p_preferred_training_weekdays) then
      select array_agg(
        weekday_value
        order by (
          weekday_value::integer
          - extract(isodow from v_program_started_on)::integer
          + 7
        ) % 7
      )
      into v_ordered_weekdays
      from unnest(p_preferred_training_weekdays) as selected_days(weekday_value);

      update public.student_routines
      set training_weekdays = v_ordered_weekdays
      where id = v_assignment_id;
    end if;
  end if;

  if not v_already_completed then
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
      v_trainer_id,
      v_user_id,
      'student_onboarding',
      'Ficha inicial completada',
      coalesce(nullif(v_student_name, ''), 'Un alumno')
        || ' completó sus objetivos y disponibilidad.',
      '/dashboard/students/' || v_student_id::text,
      'student',
      v_student_id
    );
  end if;

  return v_student_id;
end;
$function$;

revoke all on function public.save_student_onboarding_v2(
  text[], text, smallint, smallint[], smallint, text, text[], text, text
) from public;

grant execute on function public.save_student_onboarding_v2(
  text[], text, smallint, smallint[], smallint, text, text[], text, text
) to authenticated;

-- Mantiene la firma existente. Las asignaciones nuevas toman los días de la
-- ficha solo cuando la cantidad coincide con la rutina elegida.
create or replace function public.assign_student_routine(
  p_student_id uuid,
  p_routine_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_program_started_on date :=
    (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_preferred_weekdays smallint[];
  v_training_weekdays smallint[];
  v_expected_days integer;
begin
  select o.preferred_training_weekdays
  into v_preferred_weekdays
  from public.student_onboarding_profiles o
  where o.student_id = p_student_id;

  v_expected_days := public.get_routine_training_days_count(p_routine_id);

  if v_preferred_weekdays is not null
    and public.is_valid_training_weekdays(v_preferred_weekdays)
    and cardinality(v_preferred_weekdays) = v_expected_days
  then
    select array_agg(
      weekday_value
      order by (
        weekday_value::integer
        - extract(isodow from v_program_started_on)::integer
        + 7
      ) % 7
    )
    into v_training_weekdays
    from unnest(v_preferred_weekdays) as selected_days(weekday_value);
  end if;

  update public.student_routines
  set status = 'completed'
  where student_id = p_student_id
    and status = 'active';

  insert into public.student_routines (
    student_id,
    routine_id,
    status,
    assigned_at,
    program_started_on,
    training_weekdays
  ) values (
    p_student_id,
    p_routine_id,
    'active',
    now(),
    v_program_started_on,
    v_training_weekdays
  );
end;
$function$;

-- El alumno no recibe UPDATE directo sobre student_routines. Este RPC solo
-- permite modificar los días del programa activo y valida la cantidad.
create or replace function public.save_active_training_weekdays(
  p_weekdays smallint[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid;
  v_assignment_id uuid;
  v_routine_id uuid;
  v_program_started_on date;
  v_expected_days integer;
  v_ordered_weekdays smallint[];
  v_preferred_weekdays smallint[];
begin
  select p.student_id
  into v_student_id
  from public.profiles p
  where p.id = v_user_id
    and p.role = 'student';

  if v_student_id is null then
    raise exception 'No se encontró el alumno vinculado';
  end if;

  select sr.id, sr.routine_id, sr.program_started_on
  into v_assignment_id, v_routine_id, v_program_started_on
  from public.student_routines sr
  where sr.student_id = v_student_id
    and sr.status = 'active'
  limit 1;

  if v_assignment_id is null then
    raise exception 'No hay un programa activo';
  end if;

  v_expected_days := public.get_routine_training_days_count(v_routine_id);

  if p_weekdays is null
    or not public.is_valid_training_weekdays(p_weekdays)
    or cardinality(p_weekdays) <> v_expected_days
  then
    raise exception 'Elegí exactamente % días de entrenamiento diferentes.', v_expected_days;
  end if;

  select array_agg(
    weekday_value
    order by (
      weekday_value::integer
      - extract(isodow from v_program_started_on)::integer
      + 7
    ) % 7
  )
  into v_ordered_weekdays
  from unnest(p_weekdays) as selected_days(weekday_value);

  select array_agg(weekday_value order by weekday_value)
  into v_preferred_weekdays
  from unnest(p_weekdays) as selected_days(weekday_value);

  update public.student_routines
  set training_weekdays = v_ordered_weekdays
  where id = v_assignment_id;

  update public.student_onboarding_profiles
  set preferred_training_weekdays = v_preferred_weekdays,
      training_days_per_week = v_expected_days::smallint,
      updated_at = now()
  where student_id = v_student_id;
end;
$function$;

revoke all on function public.save_active_training_weekdays(smallint[]) from public;
grant execute on function public.save_active_training_weekdays(smallint[]) to authenticated;

commit;
