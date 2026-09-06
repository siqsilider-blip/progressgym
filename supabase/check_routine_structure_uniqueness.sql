-- ============================================================================
-- Progrezzia — Templates V1: ¿existe UNIQUE real sobre month_number /
-- week_number / day_index?
-- SOLO LECTURA. Informativo -- assign_template_to_student (v2) ya NO
-- depende de la respuesta a esto (usa mapeo determinista de IDs, no
-- correlación por estos valores). Se deja igual porque lo pediste
-- explícitamente y es un dato de integridad útil por otras razones.
-- ============================================================================

select
  c.relname as table_name,
  con.conname,
  con.contype,  -- 'u' = unique, 'p' = primary key
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
where c.relname in ('routine_months', 'routine_weeks', 'routine_days', 'routine_day_exercises')
  and con.contype in ('u', 'p')
order by c.relname, con.conname;

-- Complementario: índices únicos que no sean constraints formales.
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where tablename in ('routine_months', 'routine_weeks', 'routine_days', 'routine_day_exercises')
  and indexdef ilike '%unique%';
