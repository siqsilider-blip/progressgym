-- Progrezzia - cierre de funciones SECURITY DEFINER
--
-- Objetivos:
--   1. Ninguna funcion SECURITY DEFINER queda ejecutable por PUBLIC o anon.
--   2. Las RPC y helpers usados por la app conservan EXECUTE para authenticated.
--   3. Las funciones internas de trigger no quedan invocables desde la API.
--   4. Las dos funciones historicas sin search_path reciben uno fijo.

begin;

alter function public.close_abandoned_sessions()
  set search_path = pg_catalog, public;

alter function public.handle_new_user()
  set search_path = pg_catalog, public;

-- Helpers de RLS y RPC legitimas de la aplicacion.
revoke all on function public.auth_student_id() from public, anon;
grant execute on function public.auth_student_id() to authenticated;

revoke all on function public.auth_student_trainer_id() from public, anon;
grant execute on function public.auth_student_trainer_id() to authenticated;

revoke all on function public.delete_progress_photo_record(uuid) from public, anon;
grant execute on function public.delete_progress_photo_record(uuid) to authenticated;

revoke all on function public.delete_template_routine_day(uuid) from public, anon;
grant execute on function public.delete_template_routine_day(uuid) to authenticated;

revoke all on function public.ensure_coaching_conversation(uuid) from public, anon;
grant execute on function public.ensure_coaching_conversation(uuid) to authenticated;

revoke all on function public.mark_coaching_messages_read(uuid) from public, anon;
grant execute on function public.mark_coaching_messages_read(uuid) to authenticated;

revoke all on function public.mark_weekly_checkin_reviewed(uuid) from public, anon;
grant execute on function public.mark_weekly_checkin_reviewed(uuid) to authenticated;

revoke all on function public.mark_workout_feedback_reviewed(uuid) from public, anon;
grant execute on function public.mark_workout_feedback_reviewed(uuid) to authenticated;

revoke all on function public.move_template_routine_day(uuid, text) from public, anon;
grant execute on function public.move_template_routine_day(uuid, text) to authenticated;

revoke all on function public.register_progress_photo(uuid, text, date, text, boolean)
  from public, anon;
grant execute on function public.register_progress_photo(uuid, text, date, text, boolean)
  to authenticated;

revoke all on function public.save_active_training_weekdays(smallint[])
  from public, anon;
grant execute on function public.save_active_training_weekdays(smallint[])
  to authenticated;

revoke all on function public.save_student_onboarding_v2(
  text[], text, smallint, smallint[], smallint, text, text[], text, text
) from public, anon;
grant execute on function public.save_student_onboarding_v2(
  text[], text, smallint, smallint[], smallint, text, text[], text, text
) to authenticated;

-- Se conserva temporalmente para clientes antiguos; el frontend actual usa v2.
revoke all on function public.save_student_onboarding(
  text[], text, smallint, smallint, text, text[], text, text
) from public, anon;
grant execute on function public.save_student_onboarding(
  text[], text, smallint, smallint, text, text[], text, text
) to authenticated;

revoke all on function public.set_progress_photo_marketing_consent(uuid, boolean)
  from public, anon;
grant execute on function public.set_progress_photo_marketing_consent(uuid, boolean)
  to authenticated;

revoke all on function public.start_workout_session_safe(uuid, uuid, date, boolean)
  from public, anon;
grant execute on function public.start_workout_session_safe(uuid, uuid, date, boolean)
  to authenticated;

revoke all on function public.trainer_owns_routine(uuid) from public, anon;
grant execute on function public.trainer_owns_routine(uuid) to authenticated;

revoke all on function public.upsert_weekly_checkin(
  date, smallint, smallint, smallint, smallint, boolean, text, numeric, numeric, text
) from public, anon;
grant execute on function public.upsert_weekly_checkin(
  date, smallint, smallint, smallint, smallint, boolean, text, numeric, numeric, text
) to authenticated;

-- Funciones internas: solo se ejecutan mediante triggers o tareas privilegiadas.
-- No deben poder invocarse como RPC desde anon ni desde una sesion autenticada.
revoke all on function public.close_abandoned_sessions()
  from public, anon, authenticated;
grant execute on function public.close_abandoned_sessions() to service_role;

revoke all on function public.create_coaching_message_notification()
  from public, anon, authenticated;

revoke all on function public.create_weekly_checkin_notification()
  from public, anon, authenticated;

revoke all on function public.create_workout_feedback_notification()
  from public, anon, authenticated;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;

revoke all on function public.prevent_self_role_studentid_change()
  from public, anon, authenticated;

revoke all on function public.touch_coaching_conversation()
  from public, anon, authenticated;

commit;

-- Resultado esperado: ambos contadores en 0.
select
  count(*) filter (
    where not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as config(setting)
      where setting like 'search_path=%'
    )
  ) as functions_without_fixed_search_path,
  count(*) filter (
    where exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    )
    or has_function_privilege('anon', p.oid, 'EXECUTE')
  ) as security_definer_exposed_to_public_or_anon
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef;
