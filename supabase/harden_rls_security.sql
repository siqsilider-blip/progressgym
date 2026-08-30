-- ============================================================================
-- Progrezzia — SECURITY HARDENING de RLS (v4 — FINAL)
-- ============================================================================
-- Cambios respecto a la v1 (a pedido de revisión):
--   1) auth_student_id() ahora exige profiles.role = 'student', no alcanza
--      con id = auth.uid().
--   2) Se ELIMINA la policy trainer_unlink_student_profile. La desvinculación
--      pasa a ser 100% server-side vía supabaseAdmin (ver link-actions.ts),
--      así que el trainer normal no necesita ni debe tener UPDATE sobre
--      profiles de sus alumnos.
--   3) workout_sessions: INSERT/UPDATE de student ahora también validan que
--      trainer_id coincida con students.trainer_id del mismo alumno.
--
-- Cambios respecto a la v2:
--   4) (Reemplazado en v4, ver abajo) INSERT de profiles con
--      student_id IS NULL.
--
-- Cambios respecto a la v3 (esta revisión, FINAL):
--   5) Se elimina por completo cualquier policy de INSERT en profiles para
--      "authenticated". Ya no alcanzaba con exigir student_id IS NULL: esa
--      policy seguía dejando que el cliente eligiera role='trainer' o
--      role='student' arbitrariamente. Ahora ningún usuario autenticado
--      puede insertar en profiles bajo ninguna circunstancia -- la creación
--      es exclusivamente server-side (supabaseAdmin en auth/actions.ts).
--
-- Sigue sin agregar routine_kind, student_routines.status, target_rir ni
-- nada de templates. Sigue sin tocar datos de entrenamiento, sin borrar
-- tablas, sin cambiar estructura de rutinas. Sigue siendo idempotente y en
-- una sola transacción.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helper: student_id del usuario autenticado actual — SOLO si su role es
--    'student'. Si es trainer (o cualquier otra cosa), devuelve NULL.
--    No rompe nada del lado trainer: ninguna policy de trainer usa este
--    helper (todas comparan directamente auth.uid() contra trainer_id).
-- ----------------------------------------------------------------------------
create or replace function public.auth_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select student_id
  from public.profiles
  where id = auth.uid()
    and role = 'student';
$$;

-- ----------------------------------------------------------------------------
-- 1. POLICIES ABIERTAS — eliminar "Allow authenticated users"
-- ----------------------------------------------------------------------------

drop policy if exists "Allow authenticated users" on public.exercise_logs;
drop policy if exists "Allow authenticated users" on public.student_routines;

-- ----------------------------------------------------------------------------
-- 2. STUDENT_ROUTINES — policies explícitas (sin cambios respecto a v1)
-- ----------------------------------------------------------------------------

alter table public.student_routines enable row level security;

drop policy if exists "student_select_student_routines" on public.student_routines;
create policy "student_select_student_routines"
on public.student_routines
for select
to authenticated
using (
  student_id = public.auth_student_id()
);

drop policy if exists "trainer_select_student_routines" on public.student_routines;
create policy "trainer_select_student_routines"
on public.student_routines
for select
to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_routines.student_id
      and s.trainer_id = auth.uid()
  )
);

drop policy if exists "trainer_insert_student_routines" on public.student_routines;
create policy "trainer_insert_student_routines"
on public.student_routines
for insert
to authenticated
with check (
  exists (
    select 1 from public.students s
    where s.id = student_routines.student_id
      and s.trainer_id = auth.uid()
  )
  and exists (
    select 1 from public.routines r
    where r.id = student_routines.routine_id
      and r.trainer_id = auth.uid()
  )
);

drop policy if exists "trainer_update_student_routines" on public.student_routines;
create policy "trainer_update_student_routines"
on public.student_routines
for update
to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_routines.student_id
      and s.trainer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = student_routines.student_id
      and s.trainer_id = auth.uid()
  )
  and exists (
    select 1 from public.routines r
    where r.id = student_routines.routine_id
      and r.trainer_id = auth.uid()
  )
);

drop policy if exists "trainer_delete_student_routines" on public.student_routines;
create policy "trainer_delete_student_routines"
on public.student_routines
for delete
to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_routines.student_id
      and s.trainer_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 3. PROFILES — solo el trigger. SIN policy de trainer sobre profiles ajenos.
-- ----------------------------------------------------------------------------
-- La vinculación (linkStudentToUser) y la desvinculación (unlinkStudentFromUser,
-- corregida en esta revisión) son 100% server-side vía supabaseAdmin, que
-- bypassea RLS por diseño de Supabase. Por eso el trainer normal NO necesita
-- ninguna policy de UPDATE sobre profiles de sus alumnos — y no se la damos.
--
-- El trigger se mantiene: sigue siendo la defensa contra que alguien se
-- modifique role/student_id a sí mismo desde su propia sesión (vía la policy
-- de "actualizar mi propio profile" que ya existía y no tocamos).

create or replace function public.prevent_self_role_studentid_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id then
    if new.role is distinct from old.role then
      raise exception 'No podés modificar tu propio role.';
    end if;
    if new.student_id is distinct from old.student_id then
      raise exception 'No podés modificar tu propio student_id.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_studentid_change on public.profiles;
create trigger trg_prevent_self_role_studentid_change
before update on public.profiles
for each row
execute function public.prevent_self_role_studentid_change();

-- Nota: si existía de la v1, se elimina explícitamente. Ya no se crea.
drop policy if exists "trainer_unlink_student_profile" on public.profiles;

-- ----------------------------------------------------------------------------
-- 3b. PROFILES — bloquear student_id arbitrario en INSERT
-- ----------------------------------------------------------------------------
-- El trigger de arriba protege UPDATE, pero no INSERT. Sin esto, un usuario
-- autenticado podria insertar su propia fila de profiles (id = auth.uid(),
-- que es legitimo y necesario para el signup) pero fijando un student_id
-- ajeno arbitrario en el mismo INSERT. Ningun flujo legitimo de signup
-- (trainer o student) setea student_id al crear el profile -- se deja NULL
-- siempre, y solo se completa despues, server-side, via linkStudentToUser.
-- Por eso alcanza con exigir student_id IS NULL en el INSERT de un usuario
-- autenticado comun.
--
-- Elegimos POLICY, no trigger, porque aca el limite relevante es
-- "authenticated vs. service_role", y ese limite ya lo resuelve RLS de
-- forma nativa: una policy "to authenticated" no aplica a service_role, asi
-- que linkStudentToUser caso A (INSERT con student_id ya seteado, via
-- supabaseAdmin) no se ve afectado. No hace falta logica condicional extra
-- como en el trigger de UPDATE -- ahi el limite era "fila propia vs. fila
-- ajena", algo que RLS por rol no distingue solo.

-- v4: se descarta el enfoque de "policy con student_id IS NULL" porque
-- no resuelve role -- una policy no puede distinguir "esto lo decidió el
-- servidor por una buena razón" de "esto lo mandó el cliente directo"
-- cuando ambos generan el mismo INSERT con el mismo auth.uid(). La única
-- garantía real es que NINGÚN usuario autenticado pueda insertar en
-- profiles directamente. La creación pasa a ser exclusivamente server-side
-- (supabaseAdmin, en signup()/signupStudent() de auth/actions.ts, ya
-- actualizados) -- mismo patrón que linkStudentToUser.

drop policy if exists "Users can insert their profile" on public.profiles;
drop policy if exists "self_insert_own_profile" on public.profiles;
-- No se crea ninguna policy de INSERT para "authenticated": queda
-- deliberadamente sin ninguna, así que RLS deniega por defecto.

-- ----------------------------------------------------------------------------
-- 4. ROUTINES — sin cambios respecto a v1
-- ----------------------------------------------------------------------------

alter table public.routines enable row level security;

drop policy if exists "student_select_routines" on public.routines;
create policy "student_select_routines"
on public.routines
for select
to authenticated
using (
  exists (
    select 1 from public.student_routines sr
    where sr.routine_id = routines.id
      and sr.student_id = public.auth_student_id()
  )
);

-- ----------------------------------------------------------------------------
-- 5. JERARQUÍA COMPLETA — sin cambios respecto a v1
-- ----------------------------------------------------------------------------

drop policy if exists "student_select_routine_months" on public.routine_months;
create policy "student_select_routine_months"
on public.routine_months
for select
to authenticated
using (
  exists (
    select 1 from public.student_routines sr
    where sr.routine_id = routine_months.routine_id
      and sr.student_id = public.auth_student_id()
  )
);

drop policy if exists "student_select_routine_weeks" on public.routine_weeks;
create policy "student_select_routine_weeks"
on public.routine_weeks
for select
to authenticated
using (
  exists (
    select 1 from public.student_routines sr
    where sr.routine_id = routine_weeks.routine_id
      and sr.student_id = public.auth_student_id()
  )
);

drop policy if exists "student_select_routine_days" on public.routine_days;
create policy "student_select_routine_days"
on public.routine_days
for select
to authenticated
using (
  exists (
    select 1 from public.student_routines sr
    where sr.routine_id = routine_days.routine_id
      and sr.student_id = public.auth_student_id()
  )
);

drop policy if exists "student_select_routine_day_exercises" on public.routine_day_exercises;
create policy "student_select_routine_day_exercises"
on public.routine_day_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_days rd
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rd.id = routine_day_exercises.routine_day_id
      and sr.student_id = public.auth_student_id()
  )
);

-- ----------------------------------------------------------------------------
-- 6. EXERCISE_LOGS — sin cambios respecto a v1
-- ----------------------------------------------------------------------------

drop policy if exists "student_select_own_logs" on public.exercise_logs;
create policy "student_select_own_logs"
on public.exercise_logs
for select
to authenticated
using (
  student_id = public.auth_student_id()
);

drop policy if exists "student_insert_own_logs" on public.exercise_logs;
create policy "student_insert_own_logs"
on public.exercise_logs
for insert
to authenticated
with check (
  student_id = public.auth_student_id()
  and exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rde.id = exercise_logs.routine_day_exercise_id
      and sr.student_id = public.auth_student_id()
  )
);

drop policy if exists "student_update_own_logs" on public.exercise_logs;
create policy "student_update_own_logs"
on public.exercise_logs
for update
to authenticated
using (
  student_id = public.auth_student_id()
)
with check (
  student_id = public.auth_student_id()
  and exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rde.id = exercise_logs.routine_day_exercise_id
      and sr.student_id = public.auth_student_id()
  )
);

-- ----------------------------------------------------------------------------
-- 7. WORKOUT_SESSIONS — CORREGIDA: ahora también valida trainer_id.
-- ----------------------------------------------------------------------------
-- Hoy trainer_id siempre lo resuelve el server (page.tsx trae
-- students.trainer_id y se lo pasa a startWorkoutSession — el cliente nunca
-- lo controla), pero la policy no debe depender de que el código de la app
-- se porte bien: la agregamos igual como garantía de base de datos.
-- Un student NO puede insertar/actualizar una sesión con student_id propio
-- pero trainer_id que no sea el de SU entrenador real.

drop policy if exists "student_insert_own_sessions" on public.workout_sessions;
create policy "student_insert_own_sessions"
on public.workout_sessions
for insert
to authenticated
with check (
  student_id = public.auth_student_id()
  and exists (
    select 1
    from public.routine_days rd
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rd.id = workout_sessions.routine_day_id
      and sr.student_id = public.auth_student_id()
  )
  and exists (
    select 1
    from public.students s
    where s.id = workout_sessions.student_id
      and s.trainer_id = workout_sessions.trainer_id
  )
);

drop policy if exists "student_update_own_sessions" on public.workout_sessions;
create policy "student_update_own_sessions"
on public.workout_sessions
for update
to authenticated
using (
  student_id = public.auth_student_id()
)
with check (
  student_id = public.auth_student_id()
  and exists (
    select 1
    from public.routine_days rd
    join public.student_routines sr on sr.routine_id = rd.routine_id
    where rd.id = workout_sessions.routine_day_id
      and sr.student_id = public.auth_student_id()
  )
  and exists (
    select 1
    from public.students s
    where s.id = workout_sessions.student_id
      and s.trainer_id = workout_sessions.trainer_id
  )
);

-- select del alumno y CRUD del trainer: no se tocan.

commit;

-- ============================================================================
-- FIN — correr verify_rls_after_migration.sql después de esto.
-- ============================================================================
