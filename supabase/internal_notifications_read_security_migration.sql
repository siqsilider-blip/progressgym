-- Progrezzia - marcado seguro de notificaciones internas
--
-- Fase 1: crea la RPC que permite marcar como leídos únicamente avisos propios.
-- No elimina ni reescribe datos históricos y todavía no quita la policy UPDATE
-- para evitar romper la versión web anterior al despliegue.

begin;

create or replace function public.mark_internal_notifications_read(
  p_notification_id uuid default null,
  p_type text default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_caller uuid := auth.uid();
  v_updated integer := 0;
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  update public.internal_notifications
  set read_at = now()
  where recipient_user_id = v_caller
    and read_at is null
    and (p_notification_id is null or id = p_notification_id)
    and (p_type is null or type = p_type);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

revoke all on function public.mark_internal_notifications_read(uuid, text) from public;
revoke all on function public.mark_internal_notifications_read(uuid, text) from anon;
grant execute on function public.mark_internal_notifications_read(uuid, text) to authenticated;

commit;

-- Verificación de la fase 1.
select
  has_function_privilege(
    'anon',
    'public.mark_internal_notifications_read(uuid,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.mark_internal_notifications_read(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute;
