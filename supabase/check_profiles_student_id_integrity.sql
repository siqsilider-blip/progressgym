-- ============================================================================
-- Progrezzia — profiles.student_id: constraints e integridad actual
-- SOLO LECTURA. No crea, no modifica, no borra nada.
-- ============================================================================

-- 1) ¿Existe alguna constraint (UNIQUE, PK, CHECK, FK) sobre profiles que
--    involucre student_id?
select
  conname,
  contype,        -- 'u' = unique, 'p' = primary key, 'f' = foreign key, 'c' = check
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and pg_get_constraintdef(oid) ilike '%student_id%';

-- 2) ¿Existe algún índice (único o no) sobre student_id, con otro nombre
--    que no sea una constraint formal?
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'profiles'
  and indexdef ilike '%student_id%';

-- 3) ¿Hay HOY, en los datos reales, más de un profile apuntando al mismo
--    student_id? (si esto devuelve filas, hay que resolverlas a mano antes
--    de pensar en agregar un índice único — no se agrega nada todavía)
select
  student_id,
  count(*) as cantidad_de_profiles,
  array_agg(id) as profile_ids,
  array_agg(role) as roles
from public.profiles
where student_id is not null
group by student_id
having count(*) > 1;

-- 4) Cuántos profiles en total tienen student_id no nulo (contexto general,
--    no es un chequeo de integridad, solo dimensiona el problema).
select count(*) as total_profiles_vinculados
from public.profiles
where student_id is not null;
