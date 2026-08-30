-- ============================================================================
-- Progrezzia — Verificación post-migración de RLS (SOLO LECTURA) — v2
-- ============================================================================

-- 1) Confirmar schema real de cualquier relación llamada "routines".
select
  n.nspname       as schema_name,
  c.relname       as table_name,
  c.relrowsecurity as rls_enabled,
  c.relkind       as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relname = 'routines';

-- 2) Listado completo de policies en las tablas tocadas.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  p.polname as policy_name,
  p.polcmd as command,
  p.polroles::regrole[] as roles,
  pg_get_expr(p.polqual, p.polrelid) as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'students', 'routines', 'routine_months', 'routine_weeks',
    'routine_days', 'routine_day_exercises', 'student_routines',
    'exercise_logs', 'workout_sessions'
  )
order by c.relname, p.polname;

-- 3) Confirmar que trainer_unlink_student_profile YA NO EXISTE (debe devolver 0 filas).
select polname
from pg_policy
where polrelid = 'public.profiles'::regclass
  and polname = 'trainer_unlink_student_profile';

-- 4) Confirmar que el trigger de profiles sigue activo.
select tgname, tgenabled, tgrelid::regclass
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and not tgisinternal;

-- 5) Confirmar el texto exacto de auth_student_id() — debe incluir
--    "and role = 'student'" en el cuerpo.
select prosrc
from pg_proc
where proname = 'auth_student_id';

-- 6) Confirmar que ninguna otra policy en profiles le da a "authenticated"
--    en general permiso de UPDATE sobre filas que no sean la propia
--    (debería listar como mucho la policy original de auto-actualización,
--    ninguna otra de tipo UPDATE).
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.profiles'::regclass
  and polcmd = 'w';  -- 'w' = UPDATE

-- 7) v4: confirmar que NO existe NINGUNA policy de INSERT en profiles
--    para el rol "authenticated". Debe devolver 0 filas. Si devuelve
--    alguna, hay una vía de creación directa que no debería existir.
select polname, polroles::regrole[] as roles
from pg_policy
where polrelid = 'public.profiles'::regclass
  and polcmd = 'a'  -- 'a' = INSERT
  and 'authenticated'::regrole = any(polroles);

-- 8) Complementario: listar TODAS las policies de INSERT en profiles,
--    sin filtrar por rol, para ver el panorama completo (debería quedar
--    vacío o, como mucho, mostrar algo scopeado a service_role).
select polname, polroles::regrole[] as roles,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
from pg_policy
where polrelid = 'public.profiles'::regclass
  and polcmd = 'a';
