-- ============================================================================
-- Progrezzia — FASE 0B: status + routine_kind + una sola activa (FINAL)
-- ============================================================================
-- Requisito previo: correr check_student_routines_duplicates.sql primero.
-- Si esa consulta devuelve filas, NO corras esta migración todavía -- resolvé
-- los duplicados a mano (esta migración no elige ni borra nada por vos).
--
-- Incluye exactamente lo pedido:
--   A) status en student_routines
--   B) CHECK status IN ('active','completed')
--   C) routine_kind en routines
--   D) CHECK routine_kind IN ('program','template')
--   E) unique partial index: una sola 'active' por student_id
--   F) índice de apoyo (student_id, status)
--   G) get_students_risk_metrics -- definición real completa, con el único
--      fix: "and sr.status = 'active'" agregado en la CTE first_month.
--      Auditada y cerrada, sin trabajo pendiente.
--   + función RPC assign_student_routine (necesaria para la sección 3 del
--     diseño: cambio de programa atómico, sin estado intermedio inconsistente)
--
-- NO implementa templates, generación automática, target_rir, ni toca
-- progresión/RPE. NO borra filas, NO borra tablas, NO cambia la jerarquía de
-- rutinas. Todo en una sola transacción: si el unique index falla por
-- duplicados, TODA la migración se revierte (ver DISEÑO_FASE_0B.md, sección 2,
-- para la razón de este diseño).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- A) status en student_routines
-- ----------------------------------------------------------------------------
alter table public.student_routines
  add column if not exists status text not null default 'active';

-- ----------------------------------------------------------------------------
-- B) CHECK de status
-- ----------------------------------------------------------------------------
alter table public.student_routines
  drop constraint if exists student_routines_status_check;
alter table public.student_routines
  add constraint student_routines_status_check
  check (status in ('active', 'completed'));

-- ----------------------------------------------------------------------------
-- C) routine_kind en routines
-- ----------------------------------------------------------------------------
alter table public.routines
  add column if not exists routine_kind text not null default 'program';

-- ----------------------------------------------------------------------------
-- D) CHECK de routine_kind
-- ----------------------------------------------------------------------------
alter table public.routines
  drop constraint if exists routines_routine_kind_check;
alter table public.routines
  add constraint routines_routine_kind_check
  check (routine_kind in ('program', 'template'));

-- ----------------------------------------------------------------------------
-- E) Una sola 'active' por alumno — garantía de base de datos.
--    Si hay duplicados sin resolver, ESTA LÍNEA FALLA y arrastra a toda la
--    transacción con ella (rollback completo, incluyendo A/B/C/D de arriba).
--    Es intencional: preferimos "nada aplicado" a "status aplicado a medias
--    sin la garantía de unicidad todavía".
-- ----------------------------------------------------------------------------
create unique index if not exists student_routines_one_active_per_student
  on public.student_routines (student_id)
  where status = 'active';

-- ----------------------------------------------------------------------------
-- F) Índice de apoyo — (student_id, status) es exactamente el patrón que
--    van a usar casi todas las queries nuevas (.eq('student_id',...)
--    .eq('status','active')). Barato, no es sobrearquitectura.
-- ----------------------------------------------------------------------------
create index if not exists student_routines_student_id_status_idx
  on public.student_routines (student_id, status);

-- ----------------------------------------------------------------------------
-- RPC: asignar una rutina de forma atómica.
--   - Cierra (status='completed') cualquier fila 'active' existente del
--     alumno.
--   - Abre una fila nueva 'active' para la rutina indicada.
--   - SECURITY INVOKER (default): corre con los permisos de quien llama, así
--     que las policies trainer_insert_student_routines /
--     trainer_update_student_routines de la v4 siguen aplicando sin que haga
--     falta duplicar ninguna validación de autorización acá adentro.
--   - Al ser un solo bloque plpgsql, Postgres lo ejecuta como parte de la
--     transacción del llamador: si el INSERT falla, el UPDATE anterior se
--     revierte solo. No puede quedar un alumno sin ninguna fila activa por
--     una falla a mitad de camino.
-- ----------------------------------------------------------------------------
create or replace function public.assign_student_routine(
  p_student_id uuid,
  p_routine_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.student_routines
  set status = 'completed'
  where student_id = p_student_id
    and status = 'active';

  insert into public.student_routines (student_id, routine_id, status, assigned_at)
  values (p_student_id, p_routine_id, 'active', now());
end;
$$;

-- ----------------------------------------------------------------------------
-- G) get_students_risk_metrics — definición real completa, con el ÚNICO
--    cambio funcional: "and sr.status = 'active'" agregado dentro de la CTE
--    first_month. Ninguna otra línea, fórmula, parámetro, SECURITY DEFINER
--    ni search_path fue modificado respecto a la definición real que se
--    auditó (confirmada contra pg_get_functiondef en Supabase).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_students_risk_metrics(p_student_ids uuid[])
RETURNS TABLE(
  student_id uuid,
  last_workout_at date,
  total_sessions integer,
  adherence_rate numeric,
  stagnant_days integer,
  progress_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin

  -- Seguridad: solo se pueden pedir métricas de alumnos del entrenador autenticado
  if exists (
    select 1
    from unnest(p_student_ids) as sid(id)
    left join public.students s on s.id = sid.id
    where s.id is null
       or s.trainer_id <> auth.uid()
  ) then
    raise exception 'No autorizado para ver estos alumnos';
  end if;

  return query
  with target_students as (
    select unnest(p_student_ids) as student_id
  ),

  logs_agg as (
    select
      el.student_id,
      max(coalesce(el.performed_at, el.created_at::date)) as last_workout_at,
      count(distinct coalesce(el.performed_at, el.created_at::date)) as total_sessions
    from public.exercise_logs el
    where el.student_id = any(p_student_ids)
    group by el.student_id
  ),

  completed_28d as (
    select
      el.student_id,
      count(distinct el.performed_at) as completed_sessions
    from public.exercise_logs el
    where el.student_id = any(p_student_ids)
      and el.performed_at >= (current_date - interval '28 days')
    group by el.student_id
  ),

  first_month as (
    select distinct on (sr.student_id)
      sr.student_id,
      rm.id as routine_month_id
    from public.student_routines sr
    join public.routine_months rm
      on rm.routine_id = sr.routine_id
    where sr.student_id = any(p_student_ids)
      and sr.status = 'active'
    order by sr.student_id, rm.month_number asc
  ),

  first_week as (
    select distinct on (fm.student_id)
      fm.student_id,
      rw.id as routine_week_id
    from first_month fm
    join public.routine_weeks rw
      on rw.routine_month_id = fm.routine_month_id
    order by fm.student_id, rw.week_number asc
  ),

  planned as (
    select
      fw.student_id,
      count(rd.id) as days_count
    from first_week fw
    left join public.routine_days rd
      on rd.routine_week_id = fw.routine_week_id
    group by fw.student_id
  ),

  adherence_calc as (
    select
      ts.student_id,
      coalesce(c.completed_sessions, 0) as completed_sessions,
      case
        when p.days_count is not null and p.days_count > 0
          then p.days_count * 4
        else 12
      end as planned_sessions
    from target_students ts
    left join completed_28d c
      on c.student_id = ts.student_id
    left join planned p
      on p.student_id = ts.student_id
  ),

  logs_with_exercise as (
    select
      el.student_id,
      rde.exercise_id,
      el.weight,
      el.created_at,
      el.performed_at
    from public.exercise_logs el
    join public.routine_day_exercises rde
      on rde.id = el.routine_day_exercise_id
    where el.student_id = any(p_student_ids)
      and el.weight is not null
      and rde.exercise_id is not null
  ),

  first_weight as (
    select distinct on (student_id, exercise_id)
      student_id,
      exercise_id,
      weight as first_weight
    from logs_with_exercise
    order by student_id, exercise_id, created_at asc
  ),

  best_weight as (
    select
      student_id,
      exercise_id,
      max(weight) as best_weight
    from logs_with_exercise
    group by student_id, exercise_id
  ),

  progress_calc as (
    select
      fw.student_id,
      least(
        count(*) filter (where bw.best_weight > fw.first_weight),
        5
      ) as progress_count
    from first_weight fw
    join best_weight bw
      on bw.student_id = fw.student_id
     and bw.exercise_id = fw.exercise_id
    group by fw.student_id
  ),

  exercise_sessions as (
    select
      student_id,
      exercise_id,
      performed_at,
      max(weight) as best_weight
    from logs_with_exercise
    where performed_at is not null
    group by student_id, exercise_id, performed_at
  ),

  exercise_sessions_ranked as (
    select
      *,
      row_number() over (
        partition by student_id, exercise_id
        order by performed_at asc
      ) as rn,
      count(*) over (
        partition by student_id, exercise_id
      ) as total_rows,
      max(best_weight) over (
        partition by student_id, exercise_id
        order by performed_at asc
        rows between unbounded preceding and 1 preceding
      ) as running_prev_max
    from exercise_sessions
  ),

  exercise_sessions_flagged as (
    select
      *,
      case
        when rn = 1 then true
        when best_weight > running_prev_max then true
        else false
      end as is_pr
    from exercise_sessions_ranked
  ),

  exercise_last_pr as (
    select
      student_id,
      exercise_id,
      max(rn) as last_pr_rn
    from exercise_sessions_flagged
    where is_pr
    group by student_id, exercise_id
  ),

  exercise_stagnation as (
    select
      f.student_id,
      f.exercise_id,
      max(f.total_rows) as total_rows,
      (max(f.total_rows) - max(lp.last_pr_rn)) as sessions_without_improvement,
      max(f.performed_at) filter (
        where f.rn = f.total_rows
      ) as last_performed_at,
      max(f.best_weight) filter (
        where f.rn = f.total_rows
      ) as last_weight,
      max(f.best_weight) filter (
        where f.rn > greatest(f.total_rows - 4, 0)
      ) as best_in_last4,
      max(f.best_weight) filter (
        where f.rn <= greatest(f.total_rows - 4, 1)
          and f.total_rows > 4
      ) as best_before_window,
      max(f.best_weight) filter (
        where f.rn = 1
      ) as first_session_weight
    from exercise_sessions_flagged f
    join exercise_last_pr lp
      on lp.student_id = f.student_id
     and lp.exercise_id = f.exercise_id
    group by f.student_id, f.exercise_id
    having max(f.total_rows) >= 4
  ),

  exercise_stagnation_flagged as (
    select
      *,
      (
        best_in_last4 >
        coalesce(best_before_window, first_session_weight)
      ) as improved_in_window
    from exercise_stagnation
  ),

  stagnation_calc as (
    select distinct on (student_id)
      student_id,
      case
        when last_performed_at is not null
          then (current_date - last_performed_at)
        else null
      end as stagnant_days
    from exercise_stagnation_flagged
    where not improved_in_window
       or sessions_without_improvement >= 4
    order by
      student_id,
      sessions_without_improvement desc,
      last_weight desc
  )

  select
    ts.student_id,
    la.last_workout_at,
    coalesce(la.total_sessions, 0) as total_sessions,
    case
      when ac.planned_sessions > 0
        then round(
          (ac.completed_sessions::numeric / ac.planned_sessions) * 100,
          0
        )
      else 0
    end as adherence_rate,
    sc.stagnant_days,
    coalesce(pc.progress_count, 0) as progress_count
  from target_students ts
  left join logs_agg la
    on la.student_id = ts.student_id
  left join adherence_calc ac
    on ac.student_id = ts.student_id
  left join progress_calc pc
    on pc.student_id = ts.student_id
  left join stagnation_calc sc
    on sc.student_id = ts.student_id;

end;
$function$;

commit;

-- ============================================================================
-- FIN. No se tocó RLS en esta migración (ver sección 6 del diseño: no hizo
-- falta). Si el diseño encontró que sí hace falta algo, no está incluido acá
-- -- sería una migración aparte.
--
-- get_students_risk_metrics (sección G) ya quedó con el fix aplicado --
-- ver DISEÑO_FASE_0B.md para el detalle de la auditoría.
-- ============================================================================
