-- ============================================================================
-- PROGREZZIA — RESUMEN ÚNICO DE AUDITORÍA DE PRODUCCIÓN (SOLO LECTURA)
--
-- Devuelve un único resultado para que sea fácil copiarlo desde Supabase.
-- No crea, modifica ni elimina datos u objetos.
-- Ejecutar con "No limit".
-- ============================================================================

with
expected_tables(name) as (
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
),
missing_tables as (
  select
    count(*)::bigint as issue_count,
    string_agg(name, ', ' order by name) as details
  from expected_tables
  where to_regclass('public.' || name) is null
),
tables_without_rls as (
  select
    count(*)::bigint as issue_count,
    string_agg(tablename, ', ' order by tablename) as details
  from pg_tables
  where schemaname = 'public'
    and rowsecurity = false
),
api_schema_create as (
  select
    count(*) filter (
      where has_schema_privilege(rolname, 'public', 'CREATE')
    )::bigint as issue_count,
    string_agg(
      rolname,
      ', ' order by rolname
    ) filter (
      where has_schema_privilege(rolname, 'public', 'CREATE')
    ) as details
  from pg_roles
  where rolname in ('anon', 'authenticated')
),
expected_functions(signature) as (
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
),
missing_functions as (
  select
    count(*)::bigint as issue_count,
    string_agg(signature, E'\n' order by signature) as details
  from expected_functions
  where to_regprocedure(signature) is null
),
risk_function as (
  select lower(coalesce(pg_get_functiondef(
    to_regprocedure('public.get_students_risk_metrics(uuid[])')
  ), '')) as definition
),
save_set_function as (
  select lower(coalesce(pg_get_functiondef(
    to_regprocedure(
      'public.save_workout_set_safe(uuid,uuid,integer,numeric,integer,numeric,date)'
    )
  ), '')) as definition
),
security_definer_without_path as (
  select
    count(*)::bigint as issue_count,
    string_agg(p.oid::regprocedure::text, E'\n' order by p.oid::regprocedure::text) as details
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as config(setting)
      where setting like 'search_path=%'
    )
),
security_definer_exposed as (
  select
    count(*)::bigint as issue_count,
    string_agg(p.oid::regprocedure::text, E'\n' order by p.oid::regprocedure::text) as details
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
      or has_function_privilege('anon', p.oid, 'EXECUTE')
    )
),
photo_bucket as (
  select
    count(*)::bigint as bucket_count,
    bool_or(public) as is_public,
    max(file_size_limit) as file_size_limit,
    max(array_to_string(allowed_mime_types, ', ')) as allowed_mime_types
  from storage.buckets
  where id = 'progress-photos'
),
integrity as (
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
    )::bigint as multiple_active_routines,
    (
      select count(*)
      from (
        select student_id
        from public.workout_sessions
        where status = 'in_progress'
        group by student_id
        having count(*) > 1
      ) duplicates
    )::bigint as multiple_open_sessions,
    (
      select count(*)
      from public.workout_sessions
      where status = 'completed'
        and completed_manually = true
        and (
          completion_status is null
          or completion_status not in ('complete', 'incomplete')
        )
    )::bigint as explicit_completions_without_outcome,
    (
      select count(*)
      from public.workout_sessions
      where completion_status in ('complete', 'incomplete')
        and completed_manually is distinct from true
    )::bigint as outcomes_without_explicit_completion,
    (
      select count(*)
      from public.student_routines
      where status = 'active'
        and program_started_on is null
    )::bigint as active_programs_without_start_date,
    (
      select count(*)
      from public.profiles p
      left join public.students s on s.id = p.student_id
      where p.role = 'student'
        and (p.student_id is null or s.id is null)
    )::bigint as invalid_student_profiles
),
invalid_indexes as (
  select
    count(*)::bigint as issue_count,
    string_agg(c.relname, ', ' order by c.relname) as details
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (not i.indisvalid or not i.indisready)
),
workout_session_write_policies as (
  select
    count(*)::bigint as issue_count,
    string_agg(p.polname || ' [' || p.polcmd || ']', ', ' order by p.polname) as details
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'workout_sessions'
    and p.polcmd <> 'r'
),
notification_write_policies as (
  select
    count(*)::bigint as issue_count,
    string_agg(p.polname || ' [' || p.polcmd || ']', ', ' order by p.polname) as details
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'internal_notifications'
    and p.polcmd <> 'r'
),
checks as (
  select 10 as sort_order, 'Entorno'::text as area,
    'Base auditada'::text as check_name, 'INFO'::text as status,
    current_database()::text as value,
    'Ejecutado como ' || current_user || ' el ' || now()::text as detail

  union all
  select 20, 'Seguridad', 'Roles API con CREATE en public',
    case when a.issue_count = 0 then 'OK' else 'BLOQUEANTE' end,
    a.issue_count::text,
    coalesce(a.details, 'anon y authenticated no pueden crear objetos')
  from api_schema_create a

  union all
  select 30, 'Esquema', 'Tablas críticas presentes',
    case when m.issue_count = 0 then 'OK' else 'BLOQUEANTE' end,
    m.issue_count::text,
    coalesce(m.details, 'No falta ninguna tabla crítica')
  from missing_tables m

  union all
  select 40, 'RLS', 'Tablas públicas sin RLS',
    case when r.issue_count = 0 then 'OK' else 'BLOQUEANTE' end,
    r.issue_count::text,
    coalesce(r.details, 'Todas las tablas públicas tienen RLS')
  from tables_without_rls r

  union all
  select 50, 'RPC', 'Funciones críticas faltantes',
    case when f.issue_count = 0 then 'OK' else 'BLOQUEANTE' end,
    f.issue_count::text,
    coalesce(f.details, 'Todas las RPC críticas existen')
  from missing_functions f

  union all
  select 60, 'RPC', 'Firma obsoleta de inicio de sesión',
    case when to_regprocedure(
      'public.start_workout_session_safe(uuid,uuid,date)'
    ) is null then 'OK' else 'REVISAR' end,
    case when to_regprocedure(
      'public.start_workout_session_safe(uuid,uuid,date)'
    ) is null then '0' else '1' end,
    'La sobrecarga antigua de 3 argumentos no debe coexistir con la actual'

  union all
  select 70, 'RPC', 'Métricas de riesgo rechazan usuario ausente',
    case when position('if auth.uid() is null' in r.definition) > 0
      then 'OK' else 'BLOQUEANTE' end,
    case when position('if auth.uid() is null' in r.definition) > 0
      then 'true' else 'false' end,
    'get_students_risk_metrics debe exigir un usuario autenticado'
  from risk_function r

  union all
  select 80, 'RPC', 'Métricas de riesgo validan entrenador de forma null-safe',
    case when position(
      's.trainer_id is distinct from auth.uid()' in r.definition
    ) > 0 then 'OK' else 'BLOQUEANTE' end,
    case when position(
      's.trainer_id is distinct from auth.uid()' in r.definition
    ) > 0 then 'true' else 'false' end,
    'La autorización no debe aceptar trainer_id NULL'
  from risk_function r

  union all
  select 90, 'RPC', 'Guardado de series usa entrenador actual',
    case when position('join public.students' in s.definition) > 0
      then 'OK' else 'BLOQUEANTE' end,
    case when position('join public.students' in s.definition) > 0
      then 'true' else 'false' end,
    'save_workout_set_safe no debe confiar solo en datos históricos de la sesión'
  from save_set_function s

  union all
  select 100, 'RPC', 'Guardado de series autoriza de forma null-safe',
    case when position('is distinct from' in s.definition) > 0
      then 'OK' else 'BLOQUEANTE' end,
    case when position('is distinct from' in s.definition) > 0
      then 'true' else 'false' end,
    'La autorización no debe aceptar relaciones NULL'
  from save_set_function s

  union all
  select 110, 'Funciones', 'SECURITY DEFINER sin search_path fijo',
    case when s.issue_count = 0 then 'OK' else 'REVISAR' end,
    s.issue_count::text,
    coalesce(s.details, 'Todas fijan search_path')
  from security_definer_without_path s

  union all
  select 120, 'Funciones', 'SECURITY DEFINER ejecutables por PUBLIC o anon',
    case when s.issue_count = 0 then 'OK' else 'REVISAR' end,
    s.issue_count::text,
    coalesce(s.details, 'Ninguna está expuesta a PUBLIC o anon')
  from security_definer_exposed s

  union all
  select 130, 'Storage', 'Bucket privado progress-photos',
    case
      when p.bucket_count = 1 and coalesce(p.is_public, false) = false then 'OK'
      else 'BLOQUEANTE'
    end,
    p.bucket_count::text,
    case
      when p.bucket_count = 0 then 'El bucket no existe'
      when p.is_public then 'El bucket existe pero es público'
      else 'Privado; límite ' || coalesce(p.file_size_limit::text, 'sin definir') ||
        '; MIME: ' || coalesce(p.allowed_mime_types, 'sin definir')
    end
  from photo_bucket p

  union all
  select 140, 'Integridad', 'Alumnos con múltiples rutinas activas',
    case when i.multiple_active_routines = 0 then 'OK' else 'BLOQUEANTE' end,
    i.multiple_active_routines::text,
    'Debe ser 0'
  from integrity i

  union all
  select 150, 'Integridad', 'Alumnos con múltiples sesiones abiertas',
    case when i.multiple_open_sessions = 0 then 'OK' else 'BLOQUEANTE' end,
    i.multiple_open_sessions::text,
    'Debe ser 0'
  from integrity i

  union all
  select 160, 'Integridad', 'Finalizaciones explícitas sin resultado válido',
    case when i.explicit_completions_without_outcome = 0 then 'OK' else 'BLOQUEANTE' end,
    i.explicit_completions_without_outcome::text,
    'Debe ser 0'
  from integrity i

  union all
  select 170, 'Integridad', 'Resultados sin finalización explícita',
    case when i.outcomes_without_explicit_completion = 0 then 'OK' else 'BLOQUEANTE' end,
    i.outcomes_without_explicit_completion::text,
    'Debe ser 0'
  from integrity i

  union all
  select 180, 'Calendario', 'Programas activos sin fecha de inicio',
    case when i.active_programs_without_start_date = 0 then 'OK' else 'REVISAR' end,
    i.active_programs_without_start_date::text,
    'Debe ser 0 para ubicar correctamente las semanas en el calendario'
  from integrity i

  union all
  select 190, 'Perfiles', 'Perfiles de alumno sin alumno válido',
    case when i.invalid_student_profiles = 0 then 'OK' else 'BLOQUEANTE' end,
    i.invalid_student_profiles::text,
    'Debe ser 0'
  from integrity i

  union all
  select 200, 'Índices', 'Índices inválidos o no listos',
    case when x.issue_count = 0 then 'OK' else 'BLOQUEANTE' end,
    x.issue_count::text,
    coalesce(x.details, 'Todos los índices públicos están válidos y listos')
  from invalid_indexes x

  union all
  select 210, 'Lockdown', 'Escritura directa de workout_sessions',
    case
      when to_regclass('public.workout_sessions') is null then 'BLOQUEANTE'
      when has_table_privilege(
        'authenticated', 'public.workout_sessions', 'INSERT, UPDATE, DELETE'
      ) then 'PENDIENTE_DESPLIEGUE'
      else 'OK'
    end,
    case
      when to_regclass('public.workout_sessions') is null then 'tabla ausente'
      when has_table_privilege(
        'authenticated', 'public.workout_sessions', 'INSERT, UPDATE, DELETE'
      ) then 'habilitada'
      else 'revocada'
    end,
    'Solo debe revocarse después de desplegar y probar las RPC seguras'

  union all
  select 220, 'Lockdown', 'UPDATE directo de internal_notifications',
    case
      when to_regclass('public.internal_notifications') is null then 'BLOQUEANTE'
      when has_table_privilege(
        'authenticated', 'public.internal_notifications', 'UPDATE'
      ) then 'PENDIENTE_DESPLIEGUE'
      else 'OK'
    end,
    case
      when to_regclass('public.internal_notifications') is null then 'tabla ausente'
      when has_table_privilege(
        'authenticated', 'public.internal_notifications', 'UPDATE'
      ) then 'habilitada'
      else 'revocada'
    end,
    'Solo debe revocarse después de desplegar y probar la RPC segura'

  union all
  select 230, 'Lockdown', 'Policies de escritura de workout_sessions',
    case when p.issue_count = 0 then 'OK' else 'PENDIENTE_DESPLIEGUE' end,
    p.issue_count::text,
    coalesce(p.details, 'No quedan policies de escritura directa')
  from workout_session_write_policies p

  union all
  select 240, 'Lockdown', 'Policies de escritura de internal_notifications',
    case when p.issue_count = 0 then 'OK' else 'PENDIENTE_DESPLIEGUE' end,
    p.issue_count::text,
    coalesce(p.details, 'No quedan policies de escritura directa')
  from notification_write_policies p
)
select
  area,
  check_name,
  status,
  value,
  detail
from checks
order by sort_order;
