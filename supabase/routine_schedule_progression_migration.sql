-- ============================================================================
-- Progrezzia - avance automatico de semanas del programa
--
-- Agrega una fecha de inicio explicita a cada asignacion. Las asignaciones
-- activas existentes comienzan hoy para evitar que un historial antiguo las
-- adelante de golpe. Las asignaciones nuevas usan automaticamente la fecha de
-- Buenos Aires.
-- ============================================================================

begin;

alter table public.student_routines
  add column if not exists program_started_on date;

update public.student_routines
set program_started_on = (now() at time zone 'America/Argentina/Buenos_Aires')::date
where status = 'active'
  and program_started_on is null;

update public.student_routines
set program_started_on = coalesce(
  (assigned_at at time zone 'America/Argentina/Buenos_Aires')::date,
  (now() at time zone 'America/Argentina/Buenos_Aires')::date
)
where program_started_on is null;

alter table public.student_routines
  alter column program_started_on
  set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);

alter table public.student_routines
  alter column program_started_on set not null;

comment on column public.student_routines.program_started_on is
  'Fecha desde la que se calcula automaticamente la semana activa del programa.';

commit;
