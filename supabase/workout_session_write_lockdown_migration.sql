-- Progrezzia - bloqueo final de escrituras directas en workout_sessions
--
-- Fase 2. Ejecutar ÚNICAMENTE después de:
--   1) workout_session_write_security_migration.sql;
--   2) desplegar el código que usa las RPC nuevas;
--   3) probar cierre completo, incompleto, edición histórica, nota y feedback.

begin;

revoke insert, update, delete on table public.workout_sessions from public;
revoke insert, update, delete on table public.workout_sessions from anon;
revoke insert, update, delete on table public.workout_sessions from authenticated;
grant select on table public.workout_sessions to authenticated;
grant insert, update, delete on table public.workout_sessions to service_role;

drop policy if exists student_insert_own_sessions on public.workout_sessions;
drop policy if exists student_update_own_sessions on public.workout_sessions;
drop policy if exists "Trainers can create sessions for own students" on public.workout_sessions;
drop policy if exists "Trainers can update own student sessions" on public.workout_sessions;
drop policy if exists "Trainers can delete own student sessions" on public.workout_sessions;

commit;

-- authenticated debe conservar SELECT, pero no escrituras directas.
select
  has_table_privilege('authenticated', 'public.workout_sessions', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.workout_sessions', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.workout_sessions', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.workout_sessions', 'DELETE') as can_delete,
  (
    select count(*)
    from pg_policy p
    where p.polrelid = 'public.workout_sessions'::regclass
      and p.polcmd <> 'r'
  ) as remaining_write_policies;
