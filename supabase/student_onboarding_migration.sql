begin;

create table if not exists public.student_onboarding_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  goals text[] not null,
  experience_level text not null,
  training_days_per_week smallint not null,
  session_minutes smallint not null,
  training_location text not null,
  available_equipment text[] not null default '{}',
  limitations text,
  preferences text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_onboarding_goals_count check (cardinality(goals) between 1 and 3),
  constraint student_onboarding_goals_values check (
    goals <@ array['lose_fat', 'gain_muscle', 'gain_strength', 'move_better', 'feel_better']::text[]
  ),
  constraint student_onboarding_experience check (
    experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  constraint student_onboarding_days check (training_days_per_week between 1 and 7),
  constraint student_onboarding_duration check (session_minutes in (30, 45, 60, 75, 90)),
  constraint student_onboarding_location check (training_location in ('gym', 'home', 'both')),
  constraint student_onboarding_equipment_values check (
    available_equipment <@ array['machines', 'free_weights', 'bands', 'bodyweight', 'cardio']::text[]
  ),
  constraint student_onboarding_limitations_length check (limitations is null or char_length(limitations) <= 1000),
  constraint student_onboarding_preferences_length check (preferences is null or char_length(preferences) <= 1000)
);

create index if not exists student_onboarding_trainer_idx
  on public.student_onboarding_profiles (trainer_id, completed_at desc);

alter table public.student_onboarding_profiles enable row level security;

drop policy if exists student_onboarding_select_trainer on public.student_onboarding_profiles;
create policy student_onboarding_select_trainer
on public.student_onboarding_profiles for select to authenticated
using (trainer_id = auth.uid());

drop policy if exists student_onboarding_select_student on public.student_onboarding_profiles;
create policy student_onboarding_select_student
on public.student_onboarding_profiles for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.student_id = student_onboarding_profiles.student_id
  )
);

create or replace function public.save_student_onboarding(
  p_goals text[],
  p_experience_level text,
  p_training_days_per_week smallint,
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
as $$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid;
  v_trainer_id uuid;
  v_student_name text;
  v_already_completed boolean := false;
begin
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
    select 1 from public.student_onboarding_profiles o
    where o.student_id = v_student_id and o.completed_at is not null
  ) into v_already_completed;

  insert into public.student_onboarding_profiles (
    student_id,
    trainer_id,
    goals,
    experience_level,
    training_days_per_week,
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
    session_minutes = excluded.session_minutes,
    training_location = excluded.training_location,
    available_equipment = excluded.available_equipment,
    limitations = excluded.limitations,
    preferences = excluded.preferences,
    completed_at = excluded.completed_at,
    updated_at = now();

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
      coalesce(nullif(v_student_name, ''), 'Un alumno') || ' completó sus objetivos y disponibilidad.',
      '/dashboard/students/' || v_student_id::text,
      'student',
      v_student_id
    );
  end if;

  return v_student_id;
end;
$$;

revoke all on function public.save_student_onboarding(text[], text, smallint, smallint, text, text[], text, text) from public;
grant execute on function public.save_student_onboarding(text[], text, smallint, smallint, text, text[], text, text) to authenticated;

commit;
