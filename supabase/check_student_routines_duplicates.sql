-- ============================================================================
-- Progrezzia — Fase 0B: pre-chequeo de duplicados en student_routines
-- SOLO LECTURA. Correr ANTES de fase0b_status_routine_kind.sql.
-- ============================================================================
-- Hoy student_routines no tiene columna "status". El DEFAULT 'active' que la
-- migración va a aplicar hace que TODAS las filas existentes queden 'active'
-- al mismo tiempo -- así que cualquier alumno con más de una fila HOY va a
-- terminar con más de una fila 'active', y el CREATE UNIQUE INDEX de la
-- migración va a fallar para ese alumno. Por eso este chequeo no necesita
-- filtrar por status: ni existe todavía.
-- ============================================================================

-- 1) Alumnos con más de una fila en student_routines (sin importar nada más).
--    Si esto devuelve 0 filas, la migración va a poder crear el índice único
--    sin problemas. Si devuelve algo, hay que resolver esos casos A MANO
--    (decidir cuál debería ser la activa) antes de correr la migración --
--    la migración no va a elegir por vos, ni va a borrar nada.
select
  student_id,
  count(*) as cantidad_de_filas,
  array_agg(id order by assigned_at desc) as ids,
  array_agg(routine_id order by assigned_at desc) as routine_ids,
  array_agg(assigned_at order by assigned_at desc) as fechas_asignacion
from public.student_routines
group by student_id
having count(*) > 1;

-- 2) Contexto general: cuántas filas tiene la tabla en total, y cuántos
--    alumnos distintos aparecen (para dimensionar, no es un chequeo).
select
  count(*) as total_filas,
  count(distinct student_id) as alumnos_distintos
from public.student_routines;
