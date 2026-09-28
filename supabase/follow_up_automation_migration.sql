-- ============================================================================
-- Progrezzia - automatización de seguimiento
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el código.
-- Idempotente. No elimina datos ni modifica seguimientos existentes.
-- ============================================================================

begin;

alter table if exists public.student_follow_ups
  drop constraint if exists student_follow_ups_alert_type_check;

alter table if exists public.student_follow_ups
  add constraint student_follow_ups_alert_type_check
  check (
    alert_type in (
      'inactive',
      'no_routine',
      'new_student',
      'unfinished_session',
      'program_ending',
      'weekly_checkin',
      'missing_checkin',
      'progress_photo_due'
    )
  );

commit;
