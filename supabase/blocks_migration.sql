-- ============================================================================
-- Progrezzia — BLOCKS MIGRATION
-- Agrega la columna `block` a routine_day_exercises y actualiza la RPC.
-- Idempotente: usa DO $$ BEGIN ... END $$.
-- NO ejecutar automáticamente — correr manualmente en Supabase SQL Editor.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- 1) Crear columna si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'routine_day_exercises'
      AND column_name = 'block'
  ) THEN
    ALTER TABLE public.routine_day_exercises ADD COLUMN block text;
  END IF;

  -- 2) Asegurar valores por defecto, llenar nulos y normalizar inválidos
  ALTER TABLE public.routine_day_exercises ALTER COLUMN block SET DEFAULT 'main';
  UPDATE public.routine_day_exercises SET block = 'main' WHERE block IS NULL;
  UPDATE public.routine_day_exercises SET block = 'main' WHERE block NOT IN ('activation', 'main', 'closing');

  -- 3) Hacerla NOT NULL
  ALTER TABLE public.routine_day_exercises ALTER COLUMN block SET NOT NULL;

  -- 4) Recrear la constraint CHECK para asegurar validación estricta
  ALTER TABLE public.routine_day_exercises DROP CONSTRAINT IF EXISTS chk_routine_day_exercises_block;
  ALTER TABLE public.routine_day_exercises ADD CONSTRAINT chk_routine_day_exercises_block CHECK (block IN ('activation', 'main', 'closing'));
END $$;

-- Actualizamos la RPC `assign_template_to_student` para que copie la nueva columna `block`
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
  insert into public.routine_day_exercises (routine_day_id, exercise_id, sets, reps, rest_seconds, position, block)
  select d.new_id, rde.exercise_id, rde.sets, rde.reps, rde.rest_seconds, rde.position, rde.block
  from public.routine_day_exercises rde
  join _tv1_days d on d.old_id = rde.routine_day_id;

  -- 8) Asignar como programa activo -- reutiliza assign_student_routine tal
  --    cual, sin tocarla.
  perform public.assign_student_routine(p_student_id, v_new_routine_id);

  return v_new_routine_id;
end;
$$;

COMMIT;
