-- Progrezzia - bloqueo de UPDATE directo sobre avisos internos
--
-- Fase 2. Ejecutar únicamente después de desplegar y probar el código que usa
-- mark_internal_notifications_read(uuid, text).

begin;

drop policy if exists internal_notifications_update_own
on public.internal_notifications;

revoke update on table public.internal_notifications from public;
revoke update on table public.internal_notifications from anon;
revoke update on table public.internal_notifications from authenticated;
grant select on table public.internal_notifications to authenticated;
grant update on table public.internal_notifications to service_role;

commit;

select
  has_table_privilege('authenticated', 'public.internal_notifications', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.internal_notifications', 'UPDATE') as can_update;

-- No debe quedar ninguna policy UPDATE para usuarios autenticados.
select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'internal_notifications'
order by policyname;
