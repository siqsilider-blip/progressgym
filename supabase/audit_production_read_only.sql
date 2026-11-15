-- ============================================================================
-- PROGREZZIA — AUDITORÍA DE PRODUCCIÓN DE SOLO LECTURA
--
-- No crea, modifica ni elimina datos u objetos. Devuelve únicamente metadatos
-- y conteos agregados. Ejecutar completo en Supabase SQL Editor con "No limit".
-- Guardar/exportar cada resultado antes de aplicar cualquier migración.
-- ============================================================================

-- 1. Entorno auditado.
select
  current_database() as database_name,
  current_user as executed_as,
  current_setting('server_version') as postgres_version,
  now() as audited_at;

-- 1.b. Capacidad de los roles API para crear objetos en public.
select
  r.rolname,
  has_schema_privilege(r.rolname, 'public', 'USAGE') as can_use_schema,
  has_schema_privilege(r.rolname, 'public', 'CREATE') as can_create_in_schema
from pg_roles r
where r.rolname in ('anon', 'authenticated')
order by r.rolname;

-- 1.c. Presencia de las tablas runtime críticas.
with expected(name) as (
  values
    ('profiles'),
    ('contacts'),
    ('trainer_profiles'),
    ('student_notes'),
    ('routines'),
    ('routine_months'),
    ('routine_weeks'),
    ('routine_days'),
    ('routine_day_exercises'),
    ('student_routines'),
    ('exercise_logs'),
    ('workout_sessions')
)
select
  name as table_name,
  to_regclass('public.' || name) is not null as exists_in_database
from expected
order by name;

-- 2. RLS de todas las tablas públicas y cantidad de policies.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  count(p.polname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- 3. Alerta directa: tablas públicas sin RLS.
select
  schemaname,
  tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- 4. Grants de tablas expuestas a anon/authenticated.
select
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- 5. Funciones SECURITY DEFINER y su superficie de ejecución.
select
  p.oid::regprocedure::text as function_signature,
  r.rolname as owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(search_path no fijado)') as function_config,
  exists (
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.prosecdef
order by function_signature;

-- 5.b. Todas las funciones públicas, incluidas las SECURITY INVOKER.
select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(sin configuración fija)') as function_config,
  exists (
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
order by function_signature;

-- 5.c. Vistas públicas y opciones de seguridad.
select
  n.nspname as schema_name,
  c.relname as view_name,
  case c.relkind when 'v' then 'view' when 'm' then 'materialized_view' end as view_type,
  r.rolname as owner,
  coalesce(array_to_string(c.reloptions, ', '), '(sin security_invoker explícito)') as view_options
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_roles r on r.oid = c.relowner
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
order by c.relname;

-- 6. Inventario de RPC críticas esperadas por el código actual.
with expected(signature) as (
  values
    ('public.auth_student_id()'),
    ('public.auth_student_trainer_id()'),
    ('public.trainer_owns_routine(uuid)'),
    ('public.start_workout_session_safe(uuid,uuid,date,boolean)'),
    ('public.save_workout_set_safe(uuid,uuid,integer,numeric,integer,numeric,date)'),
    ('public.finish_workout_session_safe(uuid,boolean)'),
    ('public.save_workout_session_note_safe(uuid,text)'),
    ('public.create_template_v2(text,integer,text[],text[],text[],text[],integer)'),
    ('public.assign_template_to_student(uuid,uuid)'),
    ('public.assign_student_routine(uuid,uuid)'),
    ('public.save_student_onboarding_v2(text[],text,smallint,smallint[],smallint,text,text[],text,text)'),
    ('public.save_active_training_weekdays(smallint[])'),
    ('public.ensure_coaching_conversation(uuid)'),
    ('public.mark_coaching_messages_read(uuid)'),
    ('public.mark_internal_notifications_read(uuid,text)'),
    ('public.upsert_weekly_checkin(date,smallint,smallint,smallint,smallint,boolean,text,numeric,numeric,text)'),
    ('public.register_progress_photo(uuid,text,date,text,boolean)'),
    ('public.delete_progress_photo_record(uuid)'),
    ('public.set_progress_photo_marketing_consent(uuid,boolean)'),
    ('public.get_students_risk_metrics(uuid[])'),
    ('public.request_own_account_deletion()')
)
select
  signature,
  to_regprocedure(signature) is not null as exists_in_database
from expected
order by signature;

-- 6.b. La firma antigua de 3 argumentos no debe coexistir con la canónica.
select
  to_regprocedure(
    'public.start_workout_session_safe(uuid,uuid,date)'
  ) is not null as obsolete_three_argument_overload_exists;

-- 6.c. Defensas internas de la RPC de riesgo desplegada.
select
  position(
    'if auth.uid() is null'
    in lower(pg_get_functiondef(
      'public.get_students_risk_metrics(uuid[])'::regprocedure
    ))
  ) > 0 as rejects_missing_authenticated_user,
  position(
    's.trainer_id is distinct from auth.uid()'
    in lower(pg_get_functiondef(
      'public.get_students_risk_metrics(uuid[])'::regprocedure
    ))
  ) > 0 as uses_null_safe_trainer_ownership_check;

-- 6.d. La escritura de series debe validar al entrenador actual de forma
-- null-safe, no confiar solamente en trainer_id histórico de la sesión.
select
  position(
    'join public.students' in lower(pg_get_functiondef(
      'public.save_workout_set_safe(uuid,uuid,integer,numeric,integer,numeric,date)'::regprocedure
    ))
  ) > 0 as uses_current_student_trainer,
  position(
    'is distinct from' in lower(pg_get_functiondef(
      'public.save_workout_set_safe(uuid,uuid,integer,numeric,integer,numeric,date)'::regprocedure
    ))
  ) > 0 as uses_null_safe_authorization;

-- 7. Policies completas para comparar con los SQL versionados.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 8. Bucket privado y restricciones de fotos.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'progress-photos';

-- 9. Índices de las tablas calientes.
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'exercise_logs',
    'workout_sessions',
    'student_routines',
    'routine_days',
    'routine_day_exercises',
    'coaching_messages',
    'internal_notifications',
    'student_progress_photos',
    'student_weekly_checkins'
  )
order by tablename, indexname;

-- 10. Integridad crítica. Todos estos conteos deberían ser cero.
select
  (
    select count(*)
    from (
      select student_id
      from public.student_routines
      where status = 'active'
      group by student_id
      having count(*) > 1
    ) duplicates
  ) as students_with_multiple_active_routines,
  (
    select count(*)
    from (
      select student_id
      from public.workout_sessions
      where status = 'in_progress'
      group by student_id
      having count(*) > 1
    ) duplicates
  ) as students_with_multiple_open_sessions,
  (
    select count(*)
    from public.workout_sessions
    where status = 'completed'
      and completed_manually = true
      and (
        completion_status is null
        or completion_status not in ('complete', 'incomplete')
      )
  ) as explicit_completions_without_valid_outcome,
  (
    select count(*)
    from public.workout_sessions
    where completion_status in ('complete', 'incomplete')
      and completed_manually is distinct from true
  ) as outcomes_without_explicit_completion,
  (
    select count(*)
    from public.student_routines
    where status = 'active'
      and program_started_on is null
  ) as active_programs_without_start_date,
  (
    select count(*)
    from public.profiles p
    left join public.students s on s.id = p.student_id
    where p.role = 'student'
      and (p.student_id is null or s.id is null)
  ) as student_profiles_without_valid_student;

-- 11. Volumen aproximado para detectar consultas que ya requieren paginación.
select
  relname as table_name,
  n_live_tup as estimated_rows,
  n_dead_tup as estimated_dead_rows,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc, relname;

-- 12. Índices inválidos o todavía no listos.
select
  n.nspname as schema_name,
  c.relname as index_name,
  t.relname as table_name,
  i.indisvalid as is_valid,
  i.indisready as is_ready
from pg_index i
join pg_class c on c.oid = i.indexrelid
join pg_class t on t.oid = i.indrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (not i.indisvalid or not i.indisready)
order by t.relname, c.relname;
