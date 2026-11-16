-- Progrezzia - limpieza segura de trainers creados por el trigger legacy
--
-- Solo elimina public.trainers para cuentas cuyo profile sigue siendo student.
-- No elimina auth.users, profiles, students ni historial del alumno.

begin;

drop table if exists pg_temp.false_trainer_candidates;
drop table if exists pg_temp.trainer_cleanup_result;

create temporary table false_trainer_candidates as
select t.id
from public.trainers t
join public.profiles p on p.id = t.id
where p.role = 'student'
  and p.student_id is not null;

create temporary table trainer_cleanup_result (
  deleted_count bigint not null
);

do $block$
declare
  v_fk record;
  v_reference_count bigint;
begin
  -- Si cualquier tabla todavia referencia a uno de estos trainers, se cancela
  -- toda la transaccion antes de borrar una sola fila.
  for v_fk in
    select
      ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'public.trainers'::regclass
      and cardinality(con.conkey) = 1
  loop
    execute format(
      'select count(*) from %I.%I child '
      || 'join pg_temp.false_trainer_candidates candidate '
      || 'on child.%I = candidate.id',
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.column_name
    )
    into v_reference_count;

    if v_reference_count > 0 then
      raise exception
        'Limpieza cancelada: %.% conserva % referencias.',
        v_fk.schema_name,
        v_fk.table_name,
        v_reference_count;
    end if;
  end loop;
end;
$block$;

with deleted as (
  delete from public.trainers t
  using pg_temp.false_trainer_candidates candidate
  where t.id = candidate.id
  returning t.id
)
insert into pg_temp.trainer_cleanup_result (deleted_count)
select count(*)
from deleted;

commit;

select
  result.deleted_count as deleted_false_trainers,
  (
    select count(*)
    from public.trainers t
    join public.profiles p on p.id = t.id
    where p.role = 'student'
      and p.student_id is not null
  ) as remaining_false_trainers,
  (
    select count(*)
    from auth.users u
    join pg_temp.false_trainer_candidates candidate on candidate.id = u.id
  ) as preserved_auth_users,
  (
    select count(*)
    from public.profiles p
    join pg_temp.false_trainer_candidates candidate on candidate.id = p.id
    where p.role = 'student'
  ) as preserved_student_profiles,
  (
    select count(*)
    from public.students s
    join public.profiles p on p.student_id = s.id
    join pg_temp.false_trainer_candidates candidate on candidate.id = p.id
  ) as preserved_student_records
from pg_temp.trainer_cleanup_result result;
