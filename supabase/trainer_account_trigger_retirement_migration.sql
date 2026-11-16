-- Progrezzia - retiro del trigger legacy de altas
--
-- Ejecutar unicamente despues de:
--   1. crear provision_trainer_account(uuid, text);
--   2. desplegar el signup que utiliza esa RPC.

begin;

do $block$
begin
  if to_regprocedure(
    'public.provision_trainer_account(uuid,text)'
  ) is null then
    raise exception
      'Falta provision_trainer_account(uuid,text). No se retira el trigger.';
  end if;
end;
$block$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

commit;

select
  to_regprocedure(
    'public.provision_trainer_account(uuid,text)'
  ) is not null as secure_provisioning_exists,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created'
      and not t.tgisinternal
  ) as legacy_trigger_exists,
  to_regprocedure(
    'public.handle_new_user()'
  ) is not null as legacy_function_exists;
