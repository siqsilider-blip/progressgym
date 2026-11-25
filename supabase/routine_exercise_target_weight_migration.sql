-- Peso sugerido por el entrenador para cada ejercicio de una rutina.
-- Es una referencia del plan y nunca reemplaza el peso real de exercise_logs.

begin;

alter table public.routine_day_exercises
  add column if not exists target_weight_kg numeric(7,2);

alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_weight_kg_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_weight_kg_check
  check (
    target_weight_kg is null
    or (target_weight_kg > 0 and target_weight_kg <= 1000)
  );

-- Al asignar un template, conservar también el peso sugerido.
create or replace function public.assign_template_to_student(
  p_template_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_template_trainer_id uuid;
  v_template_name text;
  v_template_days_per_week integer;
  v_new_routine_id uuid;
begin
  select trainer_id, name, days_per_week
    into v_template_trainer_id, v_template_name, v_template_days_per_week
  from public.routines
  where id = p_template_id
    and routine_kind = 'template';

  if not found then
    raise exception 'La rutina de origen no existe o no es un template.';
  end if;

  if not exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    where rd.routine_id = p_template_id
  ) then
    raise exception 'Este template no tiene ejercicios cargados. Agregá al menos uno antes de asignarlo.';
  end if;

  v_new_routine_id := gen_random_uuid();

  insert into public.routines (id, trainer_id, student_id, name, days_per_week, routine_kind)
  values (v_new_routine_id, v_template_trainer_id, p_student_id, v_template_name, v_template_days_per_week, 'program');

  create temporary table _tv1_months (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_months (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_months
  where routine_id = p_template_id;

  insert into public.routine_months (id, routine_id, month_number, name)
  select m.new_id, v_new_routine_id, rm.month_number, rm.name
  from public.routine_months rm
  join _tv1_months m on m.old_id = rm.id;

  create temporary table _tv1_weeks (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_weeks (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_weeks
  where routine_id = p_template_id;

  insert into public.routine_weeks (id, routine_id, routine_month_id, week_number, name)
  select w.new_id, v_new_routine_id, m.new_id, rw.week_number, rw.name
  from public.routine_weeks rw
  join _tv1_weeks w on w.old_id = rw.id
  left join _tv1_months m on m.old_id = rw.routine_month_id;

  create temporary table _tv1_days (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_days (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_days
  where routine_id = p_template_id;

  insert into public.routine_days (id, routine_id, routine_week_id, day_index, day_number, title, name)
  select d.new_id, v_new_routine_id, w.new_id, rd.day_index, rd.day_number, rd.title, rd.name
  from public.routine_days rd
  join _tv1_days d on d.old_id = rd.id
  left join _tv1_weeks w on w.old_id = rd.routine_week_id;

  insert into public.routine_day_exercises (
    routine_day_id,
    exercise_id,
    sets,
    reps,
    target_weight_kg,
    rest_seconds,
    position,
    block
  )
  select
    d.new_id,
    rde.exercise_id,
    rde.sets,
    rde.reps,
    rde.target_weight_kg,
    rde.rest_seconds,
    rde.position,
    rde.block
  from public.routine_day_exercises rde
  join _tv1_days d on d.old_id = rde.routine_day_id;

  perform public.assign_student_routine(p_student_id, v_new_routine_id);

  return v_new_routine_id;
end;
$$;

commit;

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_day_exercises'
      and column_name = 'target_weight_kg'
  ) as target_weight_column_exists,
  pg_get_functiondef('public.assign_template_to_student(uuid,uuid)'::regprocedure)
    ilike '%target_weight_kg%' as template_assignment_copies_weight;
