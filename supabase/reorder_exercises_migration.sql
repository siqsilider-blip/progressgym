-- Reordenamiento atómico de ejercicios dentro de un bloque.
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar la UI.

begin;

create or replace function public.move_routine_day_exercise(
  p_exercise_row_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current public.routine_day_exercises%rowtype;
  v_adjacent public.routine_day_exercises%rowtype;
  v_temporary_position integer := -2147483648;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'Dirección inválida.';
  end if;

  select * into v_current
  from public.routine_day_exercises
  where id = p_exercise_row_id
  for update;

  if not found then
    raise exception 'Ejercicio no encontrado.';
  end if;

  if v_current.position is null then
    raise exception 'El ejercicio no tiene una posición válida.';
  end if;

  if p_direction = 'up' then
    select * into v_adjacent
    from public.routine_day_exercises
    where routine_day_id = v_current.routine_day_id
      and block = v_current.block
      and position < v_current.position
    order by position desc
    limit 1
    for update;
  else
    select * into v_adjacent
    from public.routine_day_exercises
    where routine_day_id = v_current.routine_day_id
      and block = v_current.block
      and position > v_current.position
    order by position asc
    limit 1
    for update;
  end if;

  if not found then
    return false;
  end if;

  update public.routine_day_exercises
  set position = v_temporary_position
  where id = v_current.id;

  update public.routine_day_exercises
  set position = v_current.position
  where id = v_adjacent.id;

  update public.routine_day_exercises
  set position = v_adjacent.position
  where id = v_current.id;

  return true;
end;
$$;

revoke all on function public.move_routine_day_exercise(uuid, text) from public;
grant execute on function public.move_routine_day_exercise(uuid, text) to authenticated;

commit;
