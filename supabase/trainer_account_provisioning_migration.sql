-- Progrezzia - aprovisionamiento explicito de cuentas de entrenador
--
-- Fase 1 de reemplazo del trigger legacy public.handle_new_user().
-- Esta RPC solo puede ser ejecutada por service_role desde el backend.
-- El trigger antiguo se conserva hasta que el nuevo codigo este desplegado.

begin;

create or replace function public.provision_trainer_account(
  p_user_id uuid,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_email text;
  v_full_name text := nullif(btrim(p_full_name), '');
  v_existing_role text;
  v_existing_student_id uuid;
begin
  if p_user_id is null or v_full_name is null then
    raise exception 'Datos de entrenador incompletos.';
  end if;

  -- El email se toma de Auth; nunca se confia en un valor enviado por el cliente.
  select lower(nullif(btrim(u.email::text), ''))
  into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is null then
    raise exception 'No existe el usuario de autenticacion.';
  end if;

  select p.role, p.student_id
  into v_existing_role, v_existing_student_id
  from public.profiles p
  where p.id = p_user_id;

  if found and (
    v_existing_role is distinct from 'trainer'
    or v_existing_student_id is not null
  ) then
    raise exception 'La cuenta ya pertenece a un alumno.';
  end if;

  insert into public.trainers (id, full_name)
  values (p_user_id, v_full_name)
  on conflict (id) do update
  set full_name = excluded.full_name;

  insert into public.profiles as existing_profile (
    id,
    email,
    name,
    role,
    student_id
  ) values (
    p_user_id,
    v_email,
    v_full_name,
    'trainer',
    null
  )
  on conflict (id) do update
  set email = excluded.email,
      name = excluded.name
  where existing_profile.role = 'trainer'
    and existing_profile.student_id is null;

  if not found then
    raise exception 'No se pudo crear el perfil de entrenador.';
  end if;

  return p_user_id;
end;
$function$;

revoke all on function public.provision_trainer_account(uuid, text)
  from public, anon, authenticated;

grant execute on function public.provision_trainer_account(uuid, text)
  to service_role;

commit;

select
  to_regprocedure(
    'public.provision_trainer_account(uuid,text)'
  ) is not null as function_exists,
  has_function_privilege(
    'anon',
    'public.provision_trainer_account(uuid,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.provision_trainer_account(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.provision_trainer_account(uuid,text)',
    'EXECUTE'
  ) as service_role_can_execute;
