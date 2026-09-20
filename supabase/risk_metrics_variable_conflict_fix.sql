-- Corrige la resolución de nombres de la RPC de riesgo sin modificar datos.
--
-- Supabase no permite cambiar plpgsql.variable_conflict mediante ALTER
-- FUNCTION. En su lugar, esta migración recompila la definición existente y
-- agrega la directiva local soportada por PL/pgSQL. Es idempotente: si la
-- directiva ya existe, no realiza ningún cambio.

BEGIN;

DO $migration$
DECLARE
    function_body text;
BEGIN
    SELECT p.prosrc
    INTO function_body
    FROM pg_proc p
    WHERE p.oid = 'public.get_students_risk_metrics(uuid[])'::regprocedure;

    IF function_body IS NULL THEN
        RAISE EXCEPTION 'No existe public.get_students_risk_metrics(uuid[])';
    END IF;

    IF position('#variable_conflict use_column' IN function_body) = 0 THEN
        function_body := E'#variable_conflict use_column\n' || function_body;
    END IF;

    function_body := replace(
        function_body,
        'coalesce(la.total_sessions, 0) as total_sessions',
        'coalesce(la.total_sessions, 0)::integer as total_sessions'
    );

    function_body := replace(
        function_body,
        'coalesce(pc.progress_count, 0) as progress_count',
        'coalesce(pc.progress_count, 0)::integer as progress_count'
    );

    EXECUTE format(
        $definition$
        CREATE OR REPLACE FUNCTION public.get_students_risk_metrics(p_student_ids uuid[])
        RETURNS TABLE(
            student_id uuid,
            last_workout_at date,
            total_sessions integer,
            adherence_rate numeric,
            stagnant_days integer,
            progress_count integer
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path TO 'public'
        AS %L
        $definition$,
        function_body
    );
END;
$migration$;

COMMIT;

-- Verificación sugerida:
-- SELECT *
-- FROM public.get_students_risk_metrics(
--   ARRAY(SELECT id FROM public.students LIMIT 1)
-- );
