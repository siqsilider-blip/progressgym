-- ============================================================================
-- Progrezzia — Templates V1: TODAS las policies de las 5 tablas
-- SOLO LECTURA. Reemplaza a check_trainer_policies_templates.sql (esa
-- versión filtraba por polname ilike '%trainer%', lo cual escondería
-- exactamente la policy peligrosa que este chequeo necesita encontrar: una
-- policy DELETE o ALL permisiva con OTRO nombre).
-- ============================================================================

select
  c.relname as table_name,
  p.polname as policy_name,
  p.polpermissive as is_permissive,  -- true = PERMISSIVE (se combinan con OR), false = RESTRICTIVE (se combinan con AND)
  p.polcmd as command,               -- 'r'=select, 'a'=insert, 'w'=update, 'd'=delete, '*'=ALL
  p.polroles::regrole[] as roles,
  pg_get_expr(p.polqual, p.polrelid) as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname in (
  'routines', 'routine_months', 'routine_weeks',
  'routine_days', 'routine_day_exercises'
)
order by
  c.relname,
  case
    when p.polcmd = 'd' then 0
    when p.polcmd = '*' then 0
    else 1
  end,  -- DELETE y ALL primero, son las que importan acá
  p.polname;

-- ============================================================================
-- Qué mirar, específicamente en la tabla "routines":
--
-- - ¿Hay alguna fila con command = 'd' (DELETE) o command = '*' (ALL),
--   is_permissive = true, roles incluyendo "authenticated" o PUBLIC ({-}), CUYO
--   using_expression NO mencione routine_kind?
--   (Nota: las dos policies peligrosas reales tenían roles {-}, es decir, PUBLIC)
--   -> Si SÍ existe: esa policy ya permite borrar programas hoy, con o sin
--      trainer_delete_own_templates. Ver Escenario C en el diseño.
--   -> Si NO existe ninguna con esas características: trainer_delete_own_
--      templates alcanza. Ver Escenario A.
--
-- - ¿Hay alguna policy DELETE/ALL con is_permissive = false (RESTRICTIVE)?
--   Sería inusual en este proyecto (no se vio ninguna hasta ahora en
--   Security Hardening ni Fase 0B), pero si aparece, las RESTRICTIVE se
--   combinan con AND, no con OR -- cambia el análisis. Ver Escenario B.
-- ============================================================================
