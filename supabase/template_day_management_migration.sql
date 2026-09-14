-- Gestión atómica de días dentro de templates.
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar la UI.

begin;

create or replace function public.move_template_routine_day(
  p_day_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routine_id uuid;
  v_current public.routine_days%rowtype;
  v_adjacent public.routine_days%rowtype;
  v_temporary_position integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  if p_direction not in ('left', 'right') then
    raise exception 'Dirección inválida.';
  end if;

  select rd.routine_id
    into v_routine_id
  from public.routine_days rd
  where rd.id = p_day_id;

  if v_routine_id is null then
    raise exception 'Día no encontrado.';
  end if;

  -- Bloquear la rutina serializa todos sus movimientos y evita cruces entre clics.
  perform 1
  from public.routines r
  where r.id = v_routine_id
    and r.trainer_id = auth.uid()
    and r.routine_kind = 'template'
  for update;

  if not found then
    raise exception 'Template no encontrado.';
  end if;

  select *
    into v_current
  from public.routine_days rd
  where rd.id = p_day_id
    and rd.routine_id = v_routine_id
  for update;

  if v_current.routine_week_id is null then
    raise exception 'El día no pertenece a una semana válida.';
  end if;

  if p_direction = 'left' then
    select *
      into v_adjacent
    from public.routine_days rd
    where rd.routine_week_id = v_current.routine_week_id
      and rd.day_index < v_current.day_index
    order by rd.day_index desc
    limit 1
    for update;
  else
    select *
      into v_adjacent
    from public.routine_days rd
    where rd.routine_week_id = v_current.routine_week_id
      and rd.day_index > v_current.day_index
    order by rd.day_index asc
    limit 1
    for update;
  end if;

  if not found then
    return false;
  end if;

  select greatest(
      coalesce(max(rd.day_index), 0),
      coalesce(max(rd.day_number), 0)
    ) + 1000
    into v_temporary_position
  from public.routine_days rd
  where rd.routine_id = v_routine_id;

  update public.routine_days
  set day_index = v_temporary_position,
      day_number = v_temporary_position
  where id = v_current.id;

  update public.routine_days
  set day_index = v_current.day_index,
      day_number = v_current.day_index,
      title = case
        when title ~ '^Día [0-9]+' then regexp_replace(title, '^Día [0-9]+', 'Día ' || v_current.day_index)
        else title
      end,
      name = case
        when name ~ '^Día [0-9]+' then regexp_replace(name, '^Día [0-9]+', 'Día ' || v_current.day_index)
        else name
      end
  where id = v_adjacent.id;

  update public.routine_days
  set day_index = v_adjacent.day_index,
      day_number = v_adjacent.day_index,
      title = case
        when v_current.title ~ '^Día [0-9]+' then regexp_replace(v_current.title, '^Día [0-9]+', 'Día ' || v_adjacent.day_index)
        else v_current.title
      end,
      name = case
        when v_current.name ~ '^Día [0-9]+' then regexp_replace(v_current.name, '^Día [0-9]+', 'Día ' || v_adjacent.day_index)
        else v_current.name
      end
  where id = v_current.id;

  return true;
end;
$$;

create or replace function public.delete_template_routine_day(
  p_day_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routine_id uuid;
  v_current public.routine_days%rowtype;
  v_day_count integer;
  v_next_day_id uuid;
  v_remaining_ids uuid[];
  v_day_id uuid;
  v_position integer := 0;
  v_temporary_offset integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  select rd.routine_id
    into v_routine_id
  from public.routine_days rd
  where rd.id = p_day_id;

  if v_routine_id is null then
    raise exception 'Día no encontrado.';
  end if;

  perform 1
  from public.routines r
  where r.id = v_routine_id
    and r.trainer_id = auth.uid()
    and r.routine_kind = 'template'
  for update;

  if not found then
    raise exception 'Template no encontrado.';
  end if;

  select *
    into v_current
  from public.routine_days rd
  where rd.id = p_day_id
    and rd.routine_id = v_routine_id
  for update;

  if v_current.routine_week_id is null then
    raise exception 'El día no pertenece a una semana válida.';
  end if;

  perform 1
  from public.routine_days rd
  where rd.routine_week_id = v_current.routine_week_id
  for update;

  select count(*)
    into v_day_count
  from public.routine_days rd
  where rd.routine_week_id = v_current.routine_week_id;

  if v_day_count <= 1 then
    raise exception 'La semana debe conservar al menos un día.';
  end if;

  select rd.id
    into v_next_day_id
  from public.routine_days rd
  where rd.routine_week_id = v_current.routine_week_id
    and rd.id <> v_current.id
  order by
    case when rd.day_index > v_current.day_index then 0 else 1 end,
    abs(rd.day_index - v_current.day_index)
  limit 1;

  select array_agg(rd.id order by rd.day_index)
    into v_remaining_ids
  from public.routine_days rd
  where rd.routine_week_id = v_current.routine_week_id
    and rd.id <> v_current.id;

  delete from public.routine_day_exercises
  where routine_day_id = v_current.id;

  delete from public.routine_days
  where id = v_current.id;

  select greatest(
      coalesce(max(rd.day_index), 0),
      coalesce(max(rd.day_number), 0)
    ) + 1000
    into v_temporary_offset
  from public.routine_days rd
  where rd.routine_id = v_routine_id;

  update public.routine_days
  set day_index = day_index + v_temporary_offset,
      day_number = coalesce(day_number, day_index) + v_temporary_offset
  where routine_week_id = v_current.routine_week_id;

  foreach v_day_id in array v_remaining_ids loop
    v_position := v_position + 1;

    update public.routine_days
    set day_index = v_position,
        day_number = v_position,
        title = case
          when title ~ '^Día [0-9]+' then regexp_replace(title, '^Día [0-9]+', 'Día ' || v_position)
          else title
        end,
        name = case
          when name ~ '^Día [0-9]+' then regexp_replace(name, '^Día [0-9]+', 'Día ' || v_position)
          else name
        end
    where id = v_day_id;
  end loop;

  return v_next_day_id;
end;
$$;

revoke all on function public.move_template_routine_day(uuid, text) from public;
grant execute on function public.move_template_routine_day(uuid, text) to authenticated;

revoke all on function public.delete_template_routine_day(uuid) from public;
grant execute on function public.delete_template_routine_day(uuid) to authenticated;

commit;
