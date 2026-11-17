-- ============================================================================
-- Progrezzia - baja no destructiva de alumnos
-- Marca alumno y asignaciones como inactivos en una unica transaccion.
-- ============================================================================

begin;

alter table public.student_routines
  drop constraint if exists student_routines_status_check;

alter table public.student_routines
  add constraint student_routines_status_check
  check (status in ('active', 'completed', 'inactive'));

create or replace function public.deactivate_student(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_trainer_id uuid := auth.uid();
begin
  if v_trainer_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  perform 1
  from public.students s
  where s.id = p_student_id
    and s.trainer_id = v_trainer_id
  for update;

  if not found then
    return false;
  end if;

  update public.students s
  set active_plan = 'inactive'
  where s.id = p_student_id
    and s.trainer_id = v_trainer_id;

  update public.student_routines sr
  set status = 'inactive'
  where sr.student_id = p_student_id
    and sr.status = 'active';

  return true;
end;
$function$;

revoke all on function public.deactivate_student(uuid) from public, anon;
grant execute on function public.deactivate_student(uuid) to authenticated;

commit;

-- Verificacion segura:
select
  to_regprocedure('public.deactivate_student(uuid)') is not null as function_exists,
  has_function_privilege('anon', 'public.deactivate_student(uuid)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', 'public.deactivate_student(uuid)', 'EXECUTE') as authenticated_can_execute;
