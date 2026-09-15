-- ============================================================================
-- Progrezzia - STUDENT FOLLOW-UPS
-- Historial de acciones operativas realizadas desde las prioridades del panel.
-- Idempotente: puede ejecutarse más de una vez sin duplicar objetos.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_follow_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    alert_type text NOT NULL CHECK (
        alert_type IN ('inactive', 'no_routine', 'new_student', 'unfinished_session', 'program_ending')
    ),
    action text NOT NULL CHECK (action IN ('whatsapp_opened', 'snoozed')),
    snoozed_until timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_follow_ups_active
    ON public.student_follow_ups (trainer_id, student_id, snoozed_until DESC);

ALTER TABLE public.student_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainer_select_own_student_follow_ups ON public.student_follow_ups;
CREATE POLICY trainer_select_own_student_follow_ups
    ON public.student_follow_ups
    FOR SELECT
    TO authenticated
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS trainer_insert_own_student_follow_ups ON public.student_follow_ups;
CREATE POLICY trainer_insert_own_student_follow_ups
    ON public.student_follow_ups
    FOR INSERT
    TO authenticated
    WITH CHECK (
        trainer_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.students s
            WHERE s.id = student_follow_ups.student_id
              AND s.trainer_id = auth.uid()
        )
    );

COMMIT;
