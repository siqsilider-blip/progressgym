-- Corrige la resolución de nombres de la RPC de riesgo sin modificar datos.
--
-- Supabase no permite cambiar plpgsql.variable_conflict mediante ALTER
-- FUNCTION. En su lugar, esta migración recompila la definición existente y
-- agrega la directiva local soportada por PL/pgSQL. Es idempotente: si la
-- directiva ya existe, no realiza ningún cambio.

BEGIN;

DO $migration$
DECLARE
    function_definition text;
    patched_definition text;
BEGIN
    SELECT pg_get_functiondef(
        'public.get_students_risk_metrics(uuid[])'::regprocedure
    )
    INTO function_definition;

    IF position('#variable_conflict use_column' IN function_definition) > 0 THEN
        RETURN;
    END IF;

    patched_definition := replace(
        function_definition,
        E'AS $function$\n',
        E'AS $function$\n#variable_conflict use_column\n'
    );

    IF patched_definition = function_definition THEN
        RAISE EXCEPTION 'No se pudo localizar el inicio de get_students_risk_metrics';
    END IF;

    EXECUTE patched_definition;
END;
$migration$;

COMMIT;

-- Verificación sugerida:
-- SELECT *
-- FROM public.get_students_risk_metrics(
--   ARRAY(SELECT id FROM public.students LIMIT 1)
-- );
