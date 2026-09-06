-- ============================================================================
-- Progrezzia — TEMPLATES V1: RPC de copia profunda + RLS de borrado (v2)
-- ============================================================================
-- Revisión v2 respecto a la primera entrega, a pedido de auditoría final:
--
--   1) La correlación de filas nuevas ya NO se hace por valores de negocio
--      (month_number / week_number / day_index / position). No se confirmó
--      que existan constraints UNIQUE reales sobre esas columnas hoy (ver
--      check_routine_structure_uniqueness.sql) -- así que en vez de asumir
--      unicidad, cada new_id se genera ANTES de insertar y se guarda en un
--      mapa determinista old_id -> new_id. La copia ya no depende en
--      absoluto de esa respuesta, sea cual sea.
--
--   2) Se agrega un chequeo temprano: si el template no tiene NINGÚN
--      ejercicio cargado en ningún día, la función falla ANTES de insertar
--      nada y ANTES de tocar la asignación activa del alumno. Ver sección
--      "Asignación vacía" del diseño.
--
--   3) trainer_delete_own_templates sigue estando acá, y ahora además la
--      migración elimina explícitamente las dos policies permisivas reales
--      que ya permitían borrar cualquier routine (Escenario C, confirmado
--      contra Supabase real -- ver el bloque de RLS más abajo para el
--      detalle exacto).
--
-- Requiere Fase 0B ya aplicada. No implementa generación automática, IA,
-- templates públicos/compartidos, marketplace, versionado, sincronización
-- template<->programa, estadísticas de uso, ni target_rir.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- RLS: el entrenador puede borrar SOLO sus propios templates, nunca un
-- program.
--
-- CONFIRMADO (Escenario C, resultado real de check_all_routines_policies.sql):
-- existían dos policies permisivas sobre routines que ya permitían borrar
-- cualquier rutina del entrenador, programas incluidos, sin ninguna
-- restricción de routine_kind:
--   - "trainer owns routines"        -- ALL,    permissive, PUBLIC
--   - "trainer_delete_own_routines"  -- DELETE, permissive, PUBLIC
-- Se eliminan las dos explícitamente antes de crear la policy nueva. No se
-- tocan las policies separadas existentes de SELECT/INSERT/UPDATE -- ya
-- cubren ese acceso de forma independiente, así que borrar la policy ALL de
-- arriba no le saca a nadie la posibilidad de leer, crear o actualizar sus
-- propias rutinas, solo la de borrarlas sin restricción.
-- ----------------------------------------------------------------------------
drop policy if exists "trainer owns routines" on public.routines;
drop policy if exists "trainer_delete_own_routines" on public.routines;

drop policy if exists "trainer_delete_own_templates" on public.routines;
create policy "trainer_delete_own_templates"
on public.routines
for delete
to authenticated
using (
  trainer_id = auth.uid()
  and routine_kind = 'template'
);

-- ----------------------------------------------------------------------------
-- RPC: copia profunda completa de un template a un alumno, y lo asigna como
-- programa activo. SECURITY INVOKER: hereda toda la autorización ya
-- existente vía RLS, no duplica ningún chequeo de ownership.
--
-- Atomicidad: una sola función plpgsql, ejecuta dentro de la transacción
-- implícita de la llamada -- si cualquier paso falla, Postgres revierte
-- TODO lo insertado hasta ese punto.
--
-- Determinismo del mapeo (v2): cada new_id se genera con gen_random_uuid()
-- ANTES de insertar y se guarda en una tabla temporal old_id -> new_id. Los
-- INSERT posteriores usan ese mapa directamente -- nunca correlacionan
-- filas por month_number/week_number/day_index/position. Esto es correcto
-- exista o no una constraint UNIQUE real sobre esas columnas.
-- ----------------------------------------------------------------------------
create or replace function public.assign_template_to_student(
  p_template_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_template_trainer_id uuid;
  v_template_name text;
  v_template_days_per_week integer;
  v_new_routine_id uuid;
begin
  -- 1) Confirmar que el origen es un template real (no un program).
  select trainer_id, name, days_per_week
    into v_template_trainer_id, v_template_name, v_template_days_per_week
  from public.routines
  where id = p_template_id
    and routine_kind = 'template';

  if not found then
    raise exception 'La rutina de origen no existe o no es un template.';
  end if;

  -- 2) Asignación vacía: si el template no tiene ningún ejercicio cargado
  --    en ningún día, no seguir. Esto corre ANTES de insertar nada y ANTES
  --    de tocar la asignación activa del alumno -- un template vacío no
  --    puede reemplazar el programa activo de nadie.
  if not exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    where rd.routine_id = p_template_id
  ) then
    raise exception 'Este template no tiene ejercicios cargados. Agregá al menos uno antes de asignarlo.';
  end if;

  -- 3) Crear la routine copia. Se genera el id acá mismo para poder
  --    referenciarlo en los pasos siguientes sin depender de RETURNING.
  v_new_routine_id := gen_random_uuid();

  insert into public.routines (id, trainer_id, student_id, name, days_per_week, routine_kind)
  values (v_new_routine_id, v_template_trainer_id, p_student_id, v_template_name, v_template_days_per_week, 'program');

  -- 4) Mapa de meses: new_id generado antes de insertar.
  create temporary table _tv1_months (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_months (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_months
  where routine_id = p_template_id;

  insert into public.routine_months (id, routine_id, month_number, name)
  select m.new_id, v_new_routine_id, rm.month_number, rm.name
  from public.routine_months rm
  join _tv1_months m on m.old_id = rm.id;

  -- 5) Mapa de semanas: new_id generado antes de insertar. left join contra
  --    el mapa de meses -- si una semana no tiene mes (routine_month_id
  --    null, el caso más común para un template recién creado, ver
  --    hallazgo en el diseño), simplemente no matchea y new_month_id queda
  --    null, que es exactamente lo correcto.
  create temporary table _tv1_weeks (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_weeks (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_weeks
  where routine_id = p_template_id;

  insert into public.routine_weeks (id, routine_id, routine_month_id, week_number, name)
  select w.new_id, v_new_routine_id, m.new_id, rw.week_number, rw.name
  from public.routine_weeks rw
  join _tv1_weeks w on w.old_id = rw.id
  left join _tv1_months m on m.old_id = rw.routine_month_id;

  -- 6) Mapa de días: mismo criterio. left join contra el mapa de semanas --
  --    cubre tanto días bajo una semana como días "planos" (routine_week_id
  --    null) sin necesitar dos ramas separadas.
  create temporary table _tv1_days (old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _tv1_days (old_id, new_id)
  select id, gen_random_uuid()
  from public.routine_days
  where routine_id = p_template_id;

  insert into public.routine_days (id, routine_id, routine_week_id, day_index, day_number, title, name)
  select d.new_id, v_new_routine_id, w.new_id, rd.day_index, rd.day_number, rd.title, rd.name
  from public.routine_days rd
  join _tv1_days d on d.old_id = rd.id
  left join _tv1_weeks w on w.old_id = rd.routine_week_id;

  -- 7) Ejercicios de cada día -- no necesitan mapa propio, se insertan
  --    directo bajo el día nuevo correspondiente vía _tv1_days.
  insert into public.routine_day_exercises (routine_day_id, exercise_id, sets, reps, rest_seconds, position)
  select d.new_id, rde.exercise_id, rde.sets, rde.reps, rde.rest_seconds, rde.position
  from public.routine_day_exercises rde
  join _tv1_days d on d.old_id = rde.routine_day_id;

  -- 8) Asignar como programa activo -- reutiliza assign_student_routine tal
  --    cual, sin tocarla.
  perform public.assign_student_routine(p_student_id, v_new_routine_id);

  return v_new_routine_id;
end;
$$;

commit;

-- ============================================================================
-- FIN. check_all_routines_policies.sql ya se corrió contra Supabase real y
-- confirmó el Escenario C -- el fix ya está incluido arriba. Correrla de
-- nuevo DESPUÉS de aplicar esta migración sigue siendo una buena idea, para
-- confirmar que trainer_delete_own_templates quedó como la única policy de
-- DELETE sobre routines. El chequeo de UNIQUE
-- (check_routine_structure_uniqueness.sql) es informativo -- esta función
-- ya no depende de su resultado.
-- ============================================================================
