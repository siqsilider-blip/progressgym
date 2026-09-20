-- Corrige la resolución de nombres de la RPC de riesgo.
--
-- La función devuelve una columna llamada student_id y también usa columnas
-- student_id dentro de sus CTE. PL/pgSQL, por defecto, rechaza esa referencia
-- como ambigua. Esta configuración hace que las columnas de las consultas
-- tengan prioridad y se aplica solamente a esta función.

BEGIN;

ALTER FUNCTION public.get_students_risk_metrics(uuid[])
    SET plpgsql.variable_conflict TO 'use_column';

COMMIT;

-- Verificación sugerida:
-- SELECT *
-- FROM public.get_students_risk_metrics(
--   ARRAY(SELECT id FROM public.students LIMIT 1)
-- );
