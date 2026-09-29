-- ============================================================================
-- Progrezzia — criterios de recomendación para templates
-- Clasifica cada template sin asignar rutinas automáticamente.
-- ============================================================================

begin;

alter table public.routines
  add column if not exists target_goals text[] not null default '{}',
  add column if not exists target_experience_levels text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}',
  add column if not exists required_equipment text[] not null default '{}',
  add column if not exists target_session_minutes integer;

alter table public.routines drop constraint if exists routines_target_goals_valid;
alter table public.routines add constraint routines_target_goals_valid check (
  target_goals <@ array['lose_fat', 'gain_muscle', 'gain_strength', 'move_better', 'feel_better']::text[]
);

alter table public.routines drop constraint if exists routines_target_experience_valid;
alter table public.routines add constraint routines_target_experience_valid check (
  target_experience_levels <@ array['beginner', 'intermediate', 'advanced']::text[]
);

alter table public.routines drop constraint if exists routines_target_locations_valid;
alter table public.routines add constraint routines_target_locations_valid check (
  target_locations <@ array['gym', 'home', 'both']::text[]
);

alter table public.routines drop constraint if exists routines_required_equipment_valid;
alter table public.routines add constraint routines_required_equipment_valid check (
  required_equipment <@ array['machines', 'free_weights', 'bands', 'bodyweight', 'cardio']::text[]
);

alter table public.routines drop constraint if exists routines_target_session_minutes_valid;
alter table public.routines add constraint routines_target_session_minutes_valid check (
  target_session_minutes is null or target_session_minutes between 15 and 180
);

create index if not exists routines_target_goals_idx
  on public.routines using gin (target_goals)
  where routine_kind = 'template';

create index if not exists routines_target_experience_idx
  on public.routines using gin (target_experience_levels)
  where routine_kind = 'template';

create or replace function public.create_template_v2(
  p_name text,
  p_days_per_week integer,
  p_target_goals text[] default '{}',
  p_target_experience_levels text[] default '{}',
  p_target_locations text[] default '{}',
  p_required_equipment text[] default '{}',
  p_target_session_minutes integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_routine_id uuid;
  v_week_id uuid;
  v_trainer_id uuid;
  i integer;
begin
  v_trainer_id := auth.uid();

  if v_trainer_id is null then
    raise exception 'No autenticado.';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Falta el nombre del template.';
  end if;

  if p_days_per_week is null or p_days_per_week < 1 or p_days_per_week > 6 then
    raise exception 'La cantidad de días debe estar entre 1 y 6.';
  end if;

  v_routine_id := gen_random_uuid();
  insert into public.routines (
    id,
    name,
    trainer_id,
    student_id,
    days_per_week,
    routine_kind,
    target_goals,
    target_experience_levels,
    target_locations,
    required_equipment,
    target_session_minutes
  ) values (
    v_routine_id,
    trim(p_name),
    v_trainer_id,
    null,
    p_days_per_week,
    'template',
    coalesce(p_target_goals, '{}'),
    coalesce(p_target_experience_levels, '{}'),
    coalesce(p_target_locations, '{}'),
    coalesce(p_required_equipment, '{}'),
    p_target_session_minutes
  );

  v_week_id := gen_random_uuid();
  insert into public.routine_weeks (id, routine_id, week_number, routine_month_id)
  values (v_week_id, v_routine_id, 1, null);

  for i in 1..p_days_per_week loop
    insert into public.routine_days (routine_id, routine_week_id, day_index, title)
    values (v_routine_id, v_week_id, i, 'Día ' || i);
  end loop;

  return v_routine_id;
end;
$$;

revoke all on function public.create_template_v2(text, integer, text[], text[], text[], text[], integer) from public;
grant execute on function public.create_template_v2(text, integer, text[], text[], text[], text[], integer) to authenticated;

commit;
