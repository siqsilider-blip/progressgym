-- ============================================================================
-- Progrezzia - Personalizacion de demostraciones por entrenador
-- Permite agregar video e indicaciones a ejercicios globales sin duplicarlos.
-- Idempotente. Ejecutar manualmente en Supabase SQL Editor antes de usar la UI.
-- ============================================================================

begin;

create table if not exists public.trainer_exercise_overrides (
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  video_url text,
  instructions text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (trainer_id, exercise_id)
);

alter table public.trainer_exercise_overrides enable row level security;

create or replace function public.auth_student_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.trainer_id
  from public.profiles p
  join public.students s on s.id = p.student_id
  where p.id = auth.uid()
    and p.role = 'student'
  limit 1;
$$;

revoke all on function public.auth_student_trainer_id() from public;
grant execute on function public.auth_student_trainer_id() to authenticated;

drop policy if exists "trainer_select_own_exercise_overrides" on public.trainer_exercise_overrides;
create policy "trainer_select_own_exercise_overrides"
on public.trainer_exercise_overrides
for select
to authenticated
using (trainer_id = auth.uid());

drop policy if exists "trainer_insert_own_exercise_overrides" on public.trainer_exercise_overrides;
create policy "trainer_insert_own_exercise_overrides"
on public.trainer_exercise_overrides
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.exercises e
    where e.id = exercise_id
      and e.trainer_id is null
  )
);

drop policy if exists "trainer_update_own_exercise_overrides" on public.trainer_exercise_overrides;
create policy "trainer_update_own_exercise_overrides"
on public.trainer_exercise_overrides
for update
to authenticated
using (trainer_id = auth.uid())
with check (
  trainer_id = auth.uid()
  and exists (
    select 1
    from public.exercises e
    where e.id = exercise_id
      and e.trainer_id is null
  )
);

drop policy if exists "trainer_delete_own_exercise_overrides" on public.trainer_exercise_overrides;
create policy "trainer_delete_own_exercise_overrides"
on public.trainer_exercise_overrides
for delete
to authenticated
using (trainer_id = auth.uid());

drop policy if exists "student_select_trainer_exercise_overrides" on public.trainer_exercise_overrides;
create policy "student_select_trainer_exercise_overrides"
on public.trainer_exercise_overrides
for select
to authenticated
using (trainer_id = public.auth_student_trainer_id());

grant select, insert, update, delete on public.trainer_exercise_overrides to authenticated;

commit;

-- Verificacion opcional:
-- select
--   to_regclass('public.trainer_exercise_overrides') is not null as tabla_existe,
--   public.auth_student_trainer_id() as trainer_del_alumno_actual;
