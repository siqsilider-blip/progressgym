-- ============================================================================
-- Progrezzia — integridad de acceso de alumnos
-- Garantiza que una ficha de alumno no pueda quedar vinculada a dos cuentas.
-- Idempotente. Ejecutar manualmente en Supabase SQL Editor.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE student_id IS NOT NULL
    GROUP BY student_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay alumnos vinculados a más de una cuenta. Revisarlos antes de crear el índice único.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_student_id_not_null
  ON public.profiles (student_id)
  WHERE student_id IS NOT NULL;

COMMIT;
