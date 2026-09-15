-- ============================================================================
-- Progrezzia - STUDENT PHONE
-- Guarda el teléfono operativo del alumno para contacto y seguimiento.
-- Idempotente: puede ejecutarse más de una vez sin duplicar objetos.
-- ============================================================================

BEGIN;

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.students.phone IS
    'Teléfono de contacto del alumno, preferentemente en formato internacional.';

COMMIT;
